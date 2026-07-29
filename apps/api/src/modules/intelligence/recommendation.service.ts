import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  SATURATION_OVER_PCT,
  type DemandAggregate,
  type OpenQuotaPrefill,
  type PlantingRecommendation,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DemandService } from "./demand.service";

const HARI = 86_400_000;

/** "17-23 Agustus 2026" — rentang minggu panen dalam kalimat rekomendasi. */
function rentangMinggu(startIso: string, endIso: string): string {
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const a = new Date(`${startIso}T00:00:00Z`);
  const b = new Date(`${endIso}T00:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const kiri = sameMonth ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${bulan[a.getUTCMonth()]}`;
  return `${kiri}-${b.getUTCDate()} ${bulan[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const kg = (n: number) => `${n.toLocaleString("id-ID")} kg`;

/**
 * Rekomendasi Tanam (TN-27, FR-8.2/8.3/8.4).
 *
 * Kalimatnya sengaja dirakit di server, bukan di FE: angka dan kata harus berubah
 * bersamaan. Kalimat "belum ada Tenant yang membuka kuota" tidak boleh muncul kalau
 * `tenantsPlanting > 0`, dan itu paling aman dijaga di satu tempat.
 */
@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demand: DemandService,
  ) {}

  /** Kartu rekomendasi untuk seluruh zona yang dilayani Tenant. */
  async forTenant(tenantId: string, now = new Date()): Promise<PlantingRecommendation[]> {
    const zones = await this.prisma.tenantZone.findMany({
      where: { tenantId },
      select: { zoneId: true },
    });
    const rows = await this.demand.aggregate(zones.map((z) => z.zoneId), now);

    const [commodities, kapasitas] = await Promise.all([
      this.prisma.commodity.findMany({
        select: { id: true, growingDaysMin: true, avgYieldKgPerHa: true },
      }),
      this.kapasitasTanamTersisaHa(tenantId),
    ]);
    const byCommodity = new Map(commodities.map((c) => [c.id, c]));

    const multiplier = Number(
      (await this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { quotaMultiplier: true },
      })).quotaMultiplier,
    );

    const out: PlantingRecommendation[] = [];
    for (const row of rows) {
      const c = byCommodity.get(row.commodityId);
      if (!c) continue;

      // Umur tanam menentukan apakah rekomendasi ini masih BISA dikerjakan. Menyarankan
      // cabai (90 hari) untuk panen 8 minggu lagi (56 hari) adalah saran yang mustahil
      // dijalankan — lebih baik tidak ditampilkan sama sekali daripada membuat Tenant
      // menanam sesuatu yang pasti telat.
      const panen = new Date(`${row.harvestWeekStart}T00:00:00Z`).getTime();
      const sisaHari = Math.floor((panen - now.getTime()) / HARI);
      const daysUntilPlantingDeadline = sisaHari - c.growingDaysMin;
      if (daysUntilPlantingDeadline < 0) continue;

      // Sudah cukup/kelebihan pasokan → bukan rekomendasi. Barisnya tetap tersedia
      // lewat endpoint agregat mentah supaya Tenant bisa melihat kondisi JENUH sendiri.
      if (row.gapKg <= 0 || row.saturation === "JENUH") continue;

      const kapasitasKg = Math.floor(kapasitas * Number(c.avgYieldKgPerHa) * multiplier);
      const suggestedKgForYou = Math.max(Math.min(row.gapKg, kapasitasKg), 0);
      if (suggestedKgForYou <= 0) continue;

      out.push({
        ...row,
        sentence: this.kalimat(row, suggestedKgForYou),
        suggestedKgForYou,
        suggestedBox: 0, // diisi saat prefill; isi box baru diketahui setelah Tenant memilih produk
        daysUntilPlantingDeadline,
        growingDaysMin: c.growingDaysMin,
      });
    }
    return out;
  }

  /**
   * FR-8.2 — kalimat operasional. Menyebut kekurangan SE-ZONA lebih dulu, baru batas
   * yang masuk akal untuk Tenant ini; keduanya harus terbaca berbeda supaya Tenant
   * tidak mengira seluruh kekurangan zona adalah jatahnya sendiri.
   */
  private kalimat(r: DemandAggregate, sayaKg: number): string {
    const bagian: string[] = [
      `Zona ${r.zoneName} membutuhkan tambahan ${kg(r.gapKg)} ${r.commodityName} ` +
        `pada minggu panen ${rentangMinggu(r.harvestWeekStart, r.harvestWeekEnd)}.`,
    ];

    if (r.tenantsPlanting === 0) {
      bagian.push("Belum ada Tenant yang membuka kuota.");
    } else {
      const terserap = r.openQuotaKg > 0 ? Math.round((r.bookedKg / r.openQuotaKg) * 100) : 0;
      bagian.push(
        `Sudah ada ${kg(r.openQuotaKg)} dari ${r.tenantsPlanting} Tenant lain ` +
          `(${terserap}% sudah dipesan), masih kurang ${kg(r.gapKg)}.`,
      );
      // Kuota yang sudah dibuka tapi tidak laku adalah bantahan langsung terhadap
      // proyeksi permintaan. Tenant berhak tahu sebelum ikut menanam.
      if (terserap < 25) {
        bagian.push(
          "Perhatian: kuota yang sudah dibuka Tenant lain masih sepi peminat — proyeksi permintaan di atas mungkin terlalu tinggi.",
        );
      }
    }

    if (r.estPricePerKg) bagian.push(`Estimasi harga terkunci ${rupiah(r.estPricePerKg)}/kg.`);

    // Angka permintaan adalah proyeksi. Tenant mengeluarkan biaya bibit dan pupuk atas
    // dasar kalimat ini, jadi dasar keyakinannya ikut dinyatakan — bukan disembunyikan.
    if (r.confidence === "RENDAH" || r.confidence === "TANPA_DATA") {
      bagian.push(
        r.weeksObserved === 0
          ? "Perhatian: belum ada riwayat pesanan untuk komoditas ini di zona Anda — angka di atas berasal dari permintaan yang gagal dilayani, bukan penjualan nyata."
          : `Perhatian: proyeksi ini hanya bersandar pada ${r.weeksObserved} minggu riwayat pesanan.`,
      );
    }

    bagian.push(`Kapasitas lahan Anda menampung hingga ${kg(sayaKg)} dari kekurangan itu.`);
    return bagian.join(" ");
  }

  /**
   * FR-8.3 — satu ketukan ke form Buka Kuota.
   *
   * Kejenuhan DIHITUNG ULANG di sini. Antara Tenant melihat kartu dan menekan tombol,
   * Tenant lain bisa sudah membuka kuota untuk kekurangan yang sama — dan kalau semua
   * bergerak berdasarkan angka yang sudah basi, hasilnya justru panen raya yang mau
   * dicegah FR-8.4.
   */
  async prefill(
    tenantId: string,
    zoneId: string,
    commodityId: string,
    harvestWeekStart: string,
    now = new Date(),
  ): Promise<OpenQuotaPrefill> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(harvestWeekStart)) {
      throw new BadRequestException({
        code: "INVALID_WEEK",
        message: "Format minggu panen harus YYYY-MM-DD.",
      });
    }

    const commodity = await this.prisma.commodity.findUnique({
      where: { id: commodityId },
      select: { id: true, name: true, avgYieldKgPerHa: true, growingDaysMin: true },
    });
    if (!commodity) throw new NotFoundException("Komoditas tidak ditemukan");

    const rows = await this.demand.aggregate([zoneId], now);
    const row = rows.find(
      (r) => r.commodityId === commodityId && r.harvestWeekStart === harvestWeekStart,
    );
    if (!row) {
      throw new NotFoundException({
        code: "RECOMMENDATION_STALE",
        message: "Rekomendasi ini sudah tidak berlaku. Muat ulang halaman rekomendasi.",
      });
    }

    // Isi box memakai kebiasaan zona ini supaya prefill tidak melawan cara Tenant lain
    // mengemas komoditas yang sama.
    const lazim = await this.prisma.$queryRaw<Array<{ kg_per_box: number; price: number | null }>>`
      SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY p.qty_kg_per_box))::float8 AS kg_per_box,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY b.locked_price))::float8   AS price
      FROM products p
      JOIN batches b        ON b.product_id = p.id
      JOIN tenant_zones tz  ON tz.tenant_id = p.tenant_id
      WHERE p.commodity_id = ${commodityId}::uuid AND tz.zone_id = ${zoneId}::uuid
    `;
    const kgPerBox = Number(lazim[0]?.kg_per_box) || 10;

    const multiplier = Number(
      (await this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { quotaMultiplier: true },
      })).quotaMultiplier,
    );
    const kapasitasKg = Math.floor(
      (await this.kapasitasTanamTersisaHa(tenantId)) * Number(commodity.avgYieldKgPerHa) * multiplier,
    );

    const targetKg = Math.max(Math.min(row.gapKg, kapasitasKg), 0);
    const suggestedQuotaBox = Math.floor(targetKg / kgPerBox);

    const hargaPerKg = row.estPricePerKg ?? (Number(lazim[0]?.price) || 0) / kgPerBox;
    const suggestedLockedPrice = Math.round(hargaPerKg * kgPerBox);

    const tengahMinggu = new Date(`${harvestWeekStart}T00:00:00Z`);
    tengahMinggu.setUTCDate(tengahMinggu.getUTCDate() + 3);

    const warning =
      row.saturation === "JENUH"
        ? `Kejenuhan berubah sejak halaman dimuat: pasokan zona kini ${row.coveragePct}% dari perkiraan permintaan (batas ${SATURATION_OVER_PCT}%). Menanam sekarang berisiko panen raya.`
        : suggestedQuotaBox <= 0
          ? "Kekurangan zona sudah tertutup Tenant lain, atau kapasitas lahan Anda sudah terpakai habis."
          : undefined;

    return {
      commodityId: commodity.id,
      commodityName: commodity.name,
      suggestedQtyKgPerBox: Math.round(kgPerBox * 100) / 100,
      suggestedQuotaBox,
      suggestedLockedPrice,
      suggestedHarvestDate: tengahMinggu.toISOString().slice(0, 10),
      saturation: row.saturation,
      coveragePct: row.coveragePct,
      ...(warning ? { warning } : {}),
    };
  }

  /**
   * Luas lahan yang belum dipakai batch berjalan. Lahan yang sedang menanam TIDAK
   * bisa dipakai lagi (satu lahan satu batch aktif), jadi menghitung seluruh luas
   * lahan akan menyarankan kuota yang tidak mungkin dibuka.
   */
  private async kapasitasTanamTersisaHa(tenantId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ ha: number }>>`
      SELECT COALESCE(SUM(lp.area_ha), 0)::float8 AS ha
      FROM land_plots lp
      WHERE lp.tenant_id = ${tenantId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM batches b
          WHERE b.land_plot_id = lp.id
            AND b.production_status IN ('PLANNING', 'GROWING')
        )
    `;
    return Number(rows[0]?.ha ?? 0);
  }
}
