import { Injectable, Logger } from "@nestjs/common";
import {
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
  type AllocationLine,
  type AllocationPreview,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * Ambang penalti — parameter SERVER, tidak pernah dikirim ke FE (FR-7.12c).
 *
 * Sengaja dibaca dari env, bukan diekspor lewat `@agro-os/shared`: apa pun yang ada di
 * kontrak bersama ikut ter-bundel ke peramban Tenant, dan ambang yang diketahui pihak
 * yang melaporkan angkanya sendiri berubah menjadi target, bukan pagar.
 *
 * ⚠️ Nilai ini masih ambang MUTLAK peninggalan v2.2. v2.3 menggantinya dengan deviasi
 * terhadap benchmark lintas-Tenant (FR-7.12b) — dikerjakan di P2. Sampai benchmark ada,
 * angka ini tetap dipakai tetapi tidak lagi bocor ke antarmuka.
 */
const AMBANG_SHORTFALL_PCT = Number(process.env["SHORTFALL_PENALTY_THRESHOLD_PCT"] ?? 15);

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

  constructor(private readonly prisma: PrismaService) {}

  /** Hitung alokasi TANPA menyimpan — dipakai pratinjau di layar Tandai Panen (TN-19a). */
  async preview(batchId: string, fulfilledBox: number): Promise<AllocationPreview> {
    const rows = await this.loadOrderedItems(batchId);

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
    const baris = await this.loadOrderedItems(batchId);
    const plan = await this.preview(batchId, fulfilledBox);

    for (const line of [...plan.fullyFulfilled, ...plan.partial, ...plan.unfulfilled]) {
      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: { qtyBoxFulfilled: line.allocatedBox },
      });
    }

    // Senioritas yang IKUT MENENTUKAN urutan batch ini dianggap terpakai — termasuk
    // milik pembeli yang akhirnya tetap kekurangan. Prioritasnya sudah diberikan;
    // yang gagal adalah panennya, bukan mekanismenya.
    const dipakai = baris.filter((r) => r.senioritas).map((r) => r.buyer_id);
    const kurangIds = new Set(
      [...plan.partial, ...plan.unfulfilled]
        .map((l) => baris.find((r) => r.order_item_id === l.orderItemId)?.buyer_id)
        .filter((x): x is string => Boolean(x)),
    );
    await this.putarSenioritas(tx, batchId, [...new Set(dipakai)], [...kurangIds]);

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
   * Penalti kuota (FR-7.12).
   *
   * Dasar ambangnya: kuota sudah dibatasi 70% kapasitas lahan, jadi Tenant punya bantalan
   * 30%. Kalau dengan bantalan itu ia masih gagal mengirim melebihi ambang, realisasi
   * panennya meleset jauh dari estimasi — itu bukan cuaca lagi.
   *
   * Shortfall yang TIDAK terverifikasi satelit dihukum langsung tanpa ambang — itulah
   * yang memberi mitigasi side-selling gigi finansial, bukan sekadar penalti reputasi.
   *
   * ⚠️ v2.3 mengganti ambang MUTLAK ini dengan deviasi terhadap benchmark lintas-Tenant
   * sezona (FR-7.12b), supaya musim buruk yang menimpa semua orang tidak menghukum
   * siapa pun. Nilainya tetap tidak boleh sampai ke antarmuka Tenant (FR-7.12c).
   */
  async applyShortfallPenalty(tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ sold: bigint; fulfilled: bigint; verified: boolean }>
    >`
      SELECT b.quota_box_sold::bigint AS sold,
             COALESCE(b.quota_box_fulfilled, 0)::bigint AS fulfilled,
             (b.verification_status = 'TERVERIFIKASI') AS verified
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE p.tenant_id = ${tenantId}::uuid
        AND b.production_status IN ('HARVESTED', 'FAILED')
        AND b.quota_box_sold > 0
      ORDER BY b.claimed_harvest_date DESC
      LIMIT ${SHORTFALL_PENALTY_ROLLING_CYCLES}
    `;
    if (!rows.length) return { ratio: null, penalized: false };

    const sold = rows.reduce((s, r) => s + Number(r.sold), 0);
    const fulfilled = rows.reduce((s, r) => s + Number(r.fulfilled), 0);
    const ratio = sold === 0 ? 0 : ((sold - fulfilled) / sold) * 100;

    // Cukup SATU siklus tak terverifikasi untuk menggugurkan perlindungan ambang.
    const anyUnverified = rows.some((r) => !r.verified && Number(r.fulfilled) < Number(r.sold));
    const penalized = anyUnverified || ratio > AMBANG_SHORTFALL_PCT;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        shortfallRatioCached: Math.round(ratio * 100) / 100,
        quotaMultiplier: penalized ? QUOTA_MULTIPLIER_PENALTY : QUOTA_MULTIPLIER_NORMAL,
      },
    });

    if (penalized) {
      this.log.warn(
        `Tenant ${tenantId.slice(0, 8)}: shortfall ${ratio.toFixed(1)}%` +
          `${anyUnverified ? " (ada siklus TIDAK terverifikasi)" : ""} → kuota turun ke ${QUOTA_MULTIPLIER_PENALTY}`,
      );
    }
    return { ratio: Math.round(ratio * 100) / 100, penalized, unverified: anyUnverified };
  }

  /**
   * Item batch ini, diurutkan SENIORITAS dulu baru waktu bayar (FR-7.13 → FR-7.9).
   *
   * Senioritas melekat pada pasangan (pembeli, Tenant) — jadi yang dicari adalah
   * senioritas aktif milik pembeli terhadap Tenant PEMILIK batch ini, bukan Tenant mana
   * pun. Sesama penyandang senioritas tetap FIFO `paid_at`, supaya di dalam kelompok
   * prioritas pun urutannya tetap punya dasar yang tidak bisa di-gaming.
   */
  private loadOrderedItems(batchId: string) {
    return this.prisma.$queryRaw<
      Array<{
        order_item_id: string;
        buyer_id: string;
        buyer_name: string;
        paid_at: Date | null;
        qty_box: number;
        senioritas: boolean;
      }>
    >`
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
    dipakai: string[],
    kurang: string[],
  ): Promise<void> {
    const tenant = await tx.batch.findUniqueOrThrow({
      where: { id: batchId },
      select: { product: { select: { tenantId: true } } },
    });
    const tenantId = tenant.product.tenantId;

    if (dipakai.length) {
      await tx.shortfallSeniority.updateMany({
        where: { tenantId, buyerId: { in: dipakai }, consumedAt: null },
        data: { consumedAt: new Date(), consumedBatchId: batchId },
      });
    }

    for (const buyerId of kurang) {
      // createMany + skipDuplicates: pembeli yang senioritasnya BELUM terpakai
      // (mis. batch ini bukan batch berikutnya bagi dia) tidak boleh dobel.
      await tx.shortfallSeniority.createMany({
        data: [{ buyerId, tenantId, grantedBatchId: batchId }],
        skipDuplicates: true,
      });
    }
  }
}
