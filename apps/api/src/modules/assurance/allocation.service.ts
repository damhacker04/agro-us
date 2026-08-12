import { Injectable, Logger } from "@nestjs/common";
import {
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
  type AllocationLine,
  type AllocationPreview,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { MIN_SIKLUS_MENYIMPANG } from "./thresholds";
import { YieldAssessmentService } from "./yield-assessment.service";
import { NotificationService } from "../notification/notification.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/** Satu baris antrean alokasi, sudah terurut senioritas lalu waktu bayar. */
type BarisAntrean = {
  order_item_id: string;
  buyer_id: string;
  buyer_name: string;
  paid_at: Date | null;
  qty_box: number;
  senioritas: boolean;
};

/**
 * Alokasi hasil panen ke pesanan (FR-7.8/7.9, §5.7.2).
 *
 * KEBIJAKAN: FIFO, pesanan dipenuhi UTUH secara berurutan sampai stok habis —
 * bukan pro-rata.
 *
 * Alasannya bukan sekadar "adil": seluruh tesis produk ini adalah mengunci permintaan
 * sebelum tanam. Kalau komitmen lebih awal tidak memberi keuntungan apa pun saat pasokan
 * kurang, insentif untuk memesan lebih dulu ikut hilang. Pro-rata juga membuat SEMUA
 * pembeli kekurangan sedikit-sedikit — dan bagi restoran, 70% pesanan sering sama tidak
 * bergunanya dengan 0% karena menunya tetap tidak bisa jalan.
 *
 * URUTANNYA memakai `payments.paid_at`, BUKAN `orders.created_at`: kalau memakai waktu
 * order dibuat, siapa pun bisa memesan lebih dulu lalu membayar belakangan dan tetap
 * menang antrean.
 */
@Injectable()
export class AllocationService {
  private readonly log = new Logger(AllocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kewajaran: YieldAssessmentService,
    private readonly notif: NotificationService,
  ) {}

  /** Hitung alokasi TANPA menyimpan — dipakai pratinjau di layar Tandai Panen (TN-19a). */
  async preview(batchId: string, fulfilledBox: number): Promise<AllocationPreview> {
    return this.susunAlokasi(batchId, fulfilledBox, await this.loadOrderedItems(batchId));
  }

  /**
   * Pembagian murni — tanpa I/O, atas baris yang SUDAH terurut.
   *
   * Dipisahkan supaya `apply()` bisa memakai baris hasil bacaan TERKUNCI-nya sendiri.
   * Sebelumnya `apply()` memanggil `preview()`, yang membaca ulang di luar transaksi:
   * baris yang dikunci dan baris yang dipakai menghitung bisa berbeda, sehingga locknya
   * tidak menjamin apa pun.
   */
  private susunAlokasi(
    batchId: string,
    fulfilledBox: number,
    rows: BarisAntrean[],
  ): AllocationPreview {
    const fullyFulfilled: AllocationLine[] = [];
    const partial: AllocationLine[] = [];
    const unfulfilled: AllocationLine[] = [];

    let remaining = fulfilledBox;
    for (const r of rows) {
      const line: AllocationLine = {
        orderItemId: r.order_item_id,
        buyerName: r.buyer_name,
        paidAt: r.paid_at?.toISOString() ?? "",
        qtyBox: r.qty_box,
        allocatedBox: 0,
        shortfallBox: r.qty_box,
        senioritas: r.senioritas,
      };

      if (remaining >= r.qty_box) {
        line.allocatedBox = r.qty_box;
        line.shortfallBox = 0;
        remaining -= r.qty_box;
        fullyFulfilled.push(line);
      } else if (remaining > 0) {
        // Pesanan di perbatasan — kebagian sebagian. Pembeli yang memutuskan
        // apakah menerimanya atau menolak seluruhnya (FR-7.10).
        line.allocatedBox = remaining;
        line.shortfallBox = r.qty_box - remaining;
        remaining = 0;
        partial.push(line);
      } else {
        unfulfilled.push(line);
      }
    }

    const sold = rows.reduce((s, r) => s + r.qty_box, 0);
    return { batchId, quotaBoxSold: sold, fulfilledBox, fullyFulfilled, partial, unfulfilled };
  }

  /**
   * Terapkan alokasi saat Tenant menandai panen. Transaksional supaya dua panen
   * yang dideklarasikan bersamaan tidak saling menimpa hasil alokasinya.
   */
  async apply(tx: Tx, batchId: string, fulfilledBox: number): Promise<AllocationPreview> {
    // Bacaan dan tulisan berada dalam SATU transaksi dengan baris terkunci.
    const baris = await this.loadOrderedItemsForUpdate(tx, batchId);
    const plan = this.susunAlokasi(batchId, fulfilledBox, baris);

    for (const line of [...plan.fullyFulfilled, ...plan.partial, ...plan.unfulfilled]) {
      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: {
          qtyBoxFulfilled: line.allocatedBox,
          // Dibekukan di sisi pesanan (ERD v2.3 poin 4) supaya alasan urutan alokasi
          // bisa diaudit tanpa join, bahkan setelah haknya gugur dari tabel senioritas.
          seniorityApplied: line.senioritas,
        },
      });
    }

    // Senioritas yang IKUT MENENTUKAN urutan batch ini dianggap terpakai — termasuk
    // milik pembeli yang akhirnya tetap kekurangan. Prioritasnya sudah diberikan;
    // yang gagal adalah panennya, bukan mekanismenya.
    const dipakai = baris
      .filter((r) => r.senioritas)
      .map((r) => ({ buyerId: r.buyer_id, orderItemId: r.order_item_id }));
    const kekurangan = [...plan.partial, ...plan.unfulfilled].flatMap((l) => {
      const r = baris.find((x) => x.order_item_id === l.orderItemId);
      return r ? [{ buyerId: r.buyer_id, orderItemId: r.order_item_id }] : [];
    });
    await this.putarSenioritas(tx, batchId, dipakai, kekurangan);

    const kurang = plan.partial.length + plan.unfulfilled.length;
    if (kurang > 0) {
      this.log.warn(
        `Batch ${batchId.slice(0, 8)}: ${plan.fullyFulfilled.length} pesanan penuh, ` +
          `${kurang} perlu Harvest Assurance`,
      );
    }
    return plan;
  }

  /**
   * Penalti kuota berbasis benchmark — FR-7.12, node `PEN` pada activity diagram.
   *
   * v2.2 memakai ambang MUTLAK 15% shortfall. Itu dibuang total di v2.3, dan bukan karena
   * angkanya kurang pas: ambang tetap tidak dapat membedakan Tenant yang menyembunyikan
   * hasil dari seluruh zona yang gagal karena musim buruk. Ia menghukum keduanya sama rata.
   *
   * Percabangannya sekarang bertumpu pada KETERSEDIAAN DASAR PENILAIAN, bukan besaran:
   *
   *   PN0  tidak ada dasar (awan, atau zona masih sepi pembanding) -> TIDAK ada penalti
   *   PNA  hanya pita individual (< 5 batch pembanding)            -> penalti bila TIDAK_WAJAR
   *   PNB  pita + benchmark zona                                   -> penalti bila menyimpang
   *                                                                  DAN berulang
   *
   * Cabang PN0 itulah yang membuat mekanisme ini bisa diterima sisi pasok. Versi lama
   * menghukum siklus yang tidak terverifikasi satelit — artinya menghukum Tenant karena
   * langitnya mendung. Aturan itu dihapus di sini; ketidakterverifikasian tetap
   * berkonsekuensi, tetapi pada cap 10% Harvest Assurance (FR-7.11), bukan pada kuota.
   */
  async applyShortfallPenalty(tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        batch_id: string;
        sold: bigint;
        fulfilled: bigint;
        verdict: string | null;
        basis: string | null;
      }>
    >`
      SELECT b.id::text               AS batch_id,
             b.quota_box_sold::bigint AS sold,
             COALESCE(b.quota_box_fulfilled, 0)::bigint AS fulfilled,
             -- Putusan Operator MENANG atas verdict otomatis: mesin menandai,
             -- manusia memutuskan.
             COALESCE(nilai.final_verdict, nilai.verdict)::text AS verdict,
             nilai.basis::text        AS basis
      FROM batches b
      JOIN products p ON p.id = b.product_id
      -- Kapan panen BENAR-BENAR dicatat, diambil dari stempel SERVER node PANEN.
      LEFT JOIN LATERAL (
        SELECT tn.server_ts
        FROM timeline_nodes tn
        WHERE tn.batch_id = b.id AND tn.activity_type IN ('PANEN', 'GAGAL_PANEN')
        ORDER BY tn.server_ts DESC
        LIMIT 1
      ) panen ON TRUE
      LEFT JOIN LATERAL (
        SELECT y.verdict, y.final_verdict, y.basis
        FROM yield_assessments y
        WHERE y.batch_id = b.id
        ORDER BY y.assessed_at DESC
        LIMIT 1
      ) nilai ON TRUE
      WHERE p.tenant_id = ${tenantId}::uuid
        AND b.production_status IN ('HARVESTED', 'FAILED')
        AND b.quota_box_sold > 0
      -- Diurutkan waktu PENCATATAN, bukan claimed_harvest_date.
      --
      -- Tanggal panen yang diklaim adalah RENCANA yang ditentukan Tenant sendiri, jadi
      -- memakainya sebagai urutan siklus bisa dipermainkan: cukup beri batch lain tanggal
      -- klaim yang lebih akhir, dan siklus yang shortfall terdorong keluar jendela rolling
      -- tanpa pernah ikut dihitung. server_ts dicatat server dan tidak bisa dimundurkan.
      --
      -- NULLS LAST, bukan COALESCE ke tanggal klaim: keduanya besaran yang berbeda —
      -- satu waktu kejadian nyata, satu lagi rencana. Menggabungkannya dalam satu urutan
      -- membuat batch yang statusnya disetel tanpa catatan panen, dengan tanggal klaim
      -- di masa depan, mengalahkan panen yang betul-betul baru dicatat.
      ORDER BY panen.server_ts DESC NULLS LAST, b.claimed_harvest_date DESC
      LIMIT ${SHORTFALL_PENALTY_ROLLING_CYCLES}
    `;
    if (!rows.length) return { penalized: false, cabang: "PN0" as const, posisiPct: null };

    const { posisiPct, menyimpang } = await this.kewajaran.posisiZona(rows.map((r) => r.batch_id));

    // PNB dipakai HANYA bila benchmark benar-benar menjadi dasar salah satu penilaian.
    // Kalau seluruh siklus hanya berdasar pita, zona ini masih cold start (FR-7.12e) dan
    // deviasi lintas-Tenant tidak punya arti apa pun.
    const adaBenchmark = rows.some((r) => r.basis === "PITA_PLUS_BENCHMARK");
    const adaTidakWajar = rows.some((r) => r.verdict === "TIDAK_WAJAR");
    const adaDasar = rows.some((r) => r.verdict !== null && r.verdict !== "TIDAK_DAPAT_DINILAI");

    let cabang: "PN0" | "PNA" | "PNB";
    let penalized: boolean;
    if (!adaDasar) {
      cabang = "PN0";
      penalized = false;
    } else if (!adaBenchmark) {
      cabang = "PNA";
      penalized = adaTidakWajar;
    } else {
      cabang = "PNB";
      // "Signifikan DAN berulang". Satu siklus buruk adalah pertanian; dua siklus
      // menyimpang sendirian di tengah zona yang baik-baik saja adalah pola — dan yang
      // dihukum FR-7.12 memang pola, bukan kejadian tunggal (Risiko 1b).
      penalized = menyimpang >= MIN_SIKLUS_MENYIMPANG || adaTidakWajar;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        quotaMultiplier: penalized ? QUOTA_MULTIPLIER_PENALTY : QUOTA_MULTIPLIER_NORMAL,
        cleanCyclesStreak: penalized ? 0 : { increment: 1 },
        // NULL bila pembandingnya belum cukup — dinyatakan apa adanya di TN-34, bukan
        // diisi 0 yang akan terbaca sebagai "tepat rata-rata".
        yieldPositionCached: posisiPct,
      },
    });

    if (penalized) {
      this.log.warn(
        `Tenant ${tenantId.slice(0, 8)}: cabang ${cabang}` +
          `${adaTidakWajar ? ", ada siklus TIDAK_WAJAR" : ""}` +
          `${menyimpang ? `, ${menyimpang} siklus menyimpang dari zona` : ""}` +
          ` -> kuota turun ke ${QUOTA_MULTIPLIER_PENALTY}`,
      );
      void this.beritahuPenalti(tenantId, cabang, posisiPct);
    }
    return { penalized, cabang, posisiPct };
  }

  /**
   * ER-21 — beri tahu Tenant, dengan PENJELASAN, bukan sekadar vonis (FR-7.12d).
   *
   * ⚠️ Tidak boleh memuat angka ambang dalam bentuk apa pun (FR-7.12c). Notifikasi adalah
   * permukaan yang bocor: sekali ambangnya tertulis di sana, ia mengendap di ponsel Tenant
   * dan bisa dibandingkan antar siklus sampai batasnya tersimpulkan.
   *
   * Yang boleh disebut: apa yang terjadi, atas dasar apa, dan bagaimana memulihkannya.
   */
  private async beritahuPenalti(
    tenantId: string,
    cabang: "PN0" | "PNA" | "PNB",
    posisiPct: number | null,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userId: true },
    });
    if (!tenant) return;

    const dasar =
      cabang === "PNB"
        ? posisiPct !== null
          ? `Realisasi panen Anda berada ${Math.abs(posisiPct).toFixed(0)}% di bawah rata-rata Tenant lain pada komoditas dan musim yang sama.`
          : "Realisasi panen Anda menyimpang dari rata-rata Tenant lain pada komoditas dan musim yang sama."
        : "Hasil panen yang dilaporkan berada di luar perkiraan dari kondisi lahan Anda sendiri.";

    await this.notif.kirim(
      tenant.userId,
      "KUOTA_DITURUNKAN",
      "Kuota PO diturunkan",
      `${dasar} Karena itu pengali kuota Anda turun ke ${QUOTA_MULTIPLIER_PENALTY}x untuk sementara. ` +
        `Pengali kembali ke ${QUOTA_MULTIPLIER_NORMAL}x setelah ${SHORTFALL_PENALTY_ROLLING_CYCLES} siklus ` +
        "panen Anda kembali sejalan dengan kondisi lahan. Bila Anda menilai ini keliru, ajukan tinjauan lewat dukungan.",
    );
  }

  /**
   * Item batch ini, diurutkan SENIORITAS dulu baru waktu bayar (FR-7.13 → FR-7.9).
   *
   * Senioritas melekat pada pasangan (pembeli, Tenant) — jadi yang dicari adalah
   * senioritas aktif milik pembeli terhadap Tenant PEMILIK batch ini, bukan Tenant mana
   * pun. Sesama penyandang senioritas tetap FIFO `paid_at`, supaya di dalam kelompok
   * prioritas pun urutannya tetap punya dasar yang tidak bisa di-gaming.
   */
  private loadOrderedItems(batchId: string, tx?: Tx) {
    // `db` sengaja parameterisasi: saat dipanggil dari apply() bacaannya HARUS terjadi di
    // dalam transaksi yang sama dengan tulisannya, kalau tidak locknya tidak berarti apa-apa.
    const db = tx ?? this.prisma;
    return db.$queryRaw<BarisAntrean[]>`
      SELECT oi.id::text     AS order_item_id,
             bu.id::text     AS buyer_id,
             bu.company_name AS buyer_name,
             pay.paid_at,
             oi.qty_box,
             (sen.id IS NOT NULL) AS senioritas
      FROM order_items oi
      JOIN orders o  ON o.id = oi.order_id
      JOIN buyers bu ON bu.id = o.buyer_id
      -- Pembayaran LUNAS milik order ini. Order yang belum lunas tidak ikut
      -- antrean alokasi sama sekali.
      JOIN payments pay ON pay.order_id = o.id AND pay.status = 'PAID'
      JOIN batches  b   ON b.id = oi.batch_id
      JOIN products pr  ON pr.id = b.product_id
      LEFT JOIN shortfall_seniority sen
             ON sen.buyer_id = bu.id
            AND sen.tenant_id = pr.tenant_id
            AND sen.consumed_at IS NULL
      WHERE oi.batch_id = ${batchId}::uuid
      ORDER BY senioritas DESC, pay.paid_at ASC, oi.id ASC
    `;
  }

  /**
   * Versi terkunci — dipakai HANYA di dalam transaksi alokasi (ERD aturan integritas #5,
   * sequence v2.3 poin 3).
   *
   * Tanpa lock, dua panen yang dideklarasikan bersamaan pada order yang beririsan sama-sama
   * membaca `qty_box_fulfilled` yang masih kosong, lalu sama-sama mengalokasikan penuh —
   * total teralokasi melampaui hasil panen sungguhan. Itu kerugian uang, bukan bug tampilan.
   *
   * Dipisah dari `loadOrderedItems` karena `FOR UPDATE` tidak sah di luar transaksi, dan
   * pratinjau (yang tidak menulis apa pun) tidak boleh ikut mengunci antrean pembeli lain.
   */
  private async loadOrderedItemsForUpdate(tx: Tx, batchId: string) {
    // Kunci dulu baris order_item-nya, baru baca lengkap. Dipisah dua langkah karena
    // FOR UPDATE tidak bisa dipakai bersama agregat/LEFT JOIN tertentu di Postgres.
    await tx.$executeRaw`
      SELECT oi.id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN payments pay ON pay.order_id = o.id AND pay.status = 'PAID'
      WHERE oi.batch_id = ${batchId}::uuid
      ORDER BY oi.id
      FOR UPDATE OF oi
    `;
    return this.loadOrderedItems(batchId, tx);
  }

  /**
   * Pakai senioritas yang ikut menentukan urutan batch ini, lalu terbitkan senioritas
   * baru bagi yang kali ini kekurangan (FR-7.13).
   *
   * Urutannya penting: PAKAI dulu, baru TERBITKAN. Pembeli yang sudah menyandang
   * senioritas lalu tetap kekurangan berhak mendapatkannya lagi — kalau penerbitan
   * dijalankan lebih dulu, indeks unik "satu senioritas aktif per Tenant" akan menolak
   * baris barunya dan pembeli itu justru kehilangan prioritas untuk siklus berikutnya.
   */
  private async putarSenioritas(
    tx: Tx,
    batchId: string,
    dipakai: Array<{ buyerId: string; orderItemId: string }>,
    kurang: Array<{ buyerId: string; orderItemId: string }>,
  ): Promise<void> {
    const tenant = await tx.batch.findUniqueOrThrow({
      where: { id: batchId },
      select: { product: { select: { tenantId: true } } },
    });
    const tenantId = tenant.product.tenantId;

    // Dicatat per ITEM, bukan per batch (ERD v2.3): yang perlu bisa ditelusuri adalah
    // pesanan mana yang menikmati prioritas, dan shortfall mana yang melahirkannya.
    for (const d of dipakai) {
      await tx.shortfallSeniority.updateMany({
        where: { tenantId, buyerId: d.buyerId, consumedAt: null },
        data: { consumedAt: new Date(), consumedByOrderItemId: d.orderItemId },
      });
    }

    for (const k of kurang) {
      // skipDuplicates menghormati indeks unik parsial "satu hak aktif per pasangan":
      // pembeli yang haknya belum terpakai tidak boleh menumpuk hak kedua.
      await tx.shortfallSeniority.createMany({
        data: [{ buyerId: k.buyerId, tenantId, sourceOrderItemId: k.orderItemId }],
        skipDuplicates: true,
      });
    }
  }
}
