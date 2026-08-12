import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  MIN_BENCHMARK_SAMPLE,
  type AssessmentBasis,
  type Season,
  type YieldAssessmentResult,
  type PlausibilityReviewItem,
  type YieldAssessmentHistoryItem,
  type YieldPlausibility,
  type ZonePeer,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BATAS_TIDAK_WAJAR,
  DEVIASI_ZONA_SIGMA,
  LEBAR_PITA,
  SLA_TINJAUAN_JAM,
} from "./thresholds";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

type BarisBatch = {
  quota_box_sold: number;
  qty_kg_per_box: string;
  avg_yield_kg_per_ha: string;
  effective_area_ha: string | null;
  peak_ndvi: string | null;
  commodity_id: string;
  claimed_harvest_date: Date;
  zone_id: string | null;
};

type Kurva = {
  ndviFloor?: number;
  ndviPeak?: number;
  vigorAtFloor?: number;
  vigorAtPeak?: number;
  vigorMax?: number;
};

/**
 * Pita Kewajaran Hasil Panen — FR-4.10, FR-7.12a/b/e, §6.2 poin 6.
 *
 * Menjawab satu pertanyaan: apakah jumlah box yang DILAPORKAN SENDIRI oleh Tenant masuk
 * akal, mengingat seberapa hijau lahannya terlihat dari orbit?
 *
 * Yang membuat mekanisme ini adil justru bagian yang mudah dilewatkan: faktor vigor
 * diturunkan dari puncak NDVI batch ITU SENDIRI. Kalau tanamannya memang gagal tumbuh,
 * pita ikut turun dan panen kecil menjadi wajar. Yang ditandai bukan "panen sedikit",
 * melainkan "panen sedikit padahal lahannya terlihat subur sampai hari panen".
 */
@Injectable()
export class YieldAssessmentService {
  private readonly log = new Logger(YieldAssessmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nilai satu laporan panen dan SIMPAN hasilnya sebagai baris riwayat.
   *
   * Setiap percobaan disimpan, bukan hanya yang akhirnya dikonfirmasi. Pratinjau memang
   * membuka celah penyelidikan ambang — Tenant bisa mencoba beberapa angka sampai
   * `WAJAR`. Celah itu TIDAK ditutup dengan menyembunyikan pratinjau, karena justru
   * pratinjau itulah yang membuat peringatan datang sebelum konsekuensi (aturan desain
   * v2.3 butir 3). Yang dilakukan: penyelidikan dicatat dan terlihat oleh Operator.
   */
  async nilai(batchId: string, reportedBox: number): Promise<YieldAssessmentResult> {
    const b = await this.muatBatch(batchId);
    const hasil = b ? await this.hitung(b, reportedBox) : this.tanpaDasar("Batch tidak ditemukan");

    const perluTinjau = hasil.verdict === "PERLU_DITINJAU";
    const baris = await this.prisma.yieldAssessment.create({
      data: {
        batchId,
        reportedBox,
        expectedYieldMin: hasil.expectedMinBox,
        expectedYieldMax: hasil.expectedMaxBox,
        peakNdviUsed: hasil.peakNdvi,
        zoneBenchmarkRatio: hasil.zoneBenchmarkRatio,
        basis: hasil.basis,
        verdict: hasil.verdict,
        slaDueAt: perluTinjau ? new Date(Date.now() + SLA_TINJAUAN_JAM * 3600_000) : null,
      },
      select: { id: true },
    });

    // Salinan verdict terkini di batch — hanya untuk pembacaan cepat (ERD v2.3).
    // Sumber kebenarannya tetap tabel riwayat di atas.
    await this.prisma.batch.update({
      where: { id: batchId },
      data: { plausibilityCached: hasil.verdict },
    });

    return { ...hasil, assessmentId: baris.id };
  }

  /** Berapa kali batch ini sudah dinilai sebelum dikonfirmasi — tampil di antrean Operator. */
  async jumlahPercobaan(batchId: string): Promise<number> {
    return this.prisma.yieldAssessment.count({ where: { batchId } });
  }

  /**
   * Verdict yang MENGIKAT untuk batch, dipakai saat menentukan cap 10% gugur (FR-7.11).
   *
   * `finalVerdict` hasil tinjauan Operator selalu menang atas verdict otomatis: mesin
   * boleh menandai, manusia yang memutuskan.
   */
  async verdictBerlaku(batchId: string, tx?: Tx): Promise<YieldPlausibility | null> {
    const db = tx ?? this.prisma;
    const baris = await db.yieldAssessment.findFirst({
      where: { batchId },
      orderBy: { assessedAt: "desc" },
      select: { verdict: true, finalVerdict: true },
    });
    return baris ? ((baris.finalVerdict ?? baris.verdict) as YieldPlausibility) : null;
  }

  /**
   * Segarkan benchmark zona setelah satu batch menutup siklusnya (FR-7.12b).
   *
   * Dipicu KEJADIAN, bukan jadwal — isinya fakta historis batch yang sudah selesai, jadi
   * ia hanya bisa basi kalau ada batch baru yang selesai. Inilah bedanya dengan
   * DEMAND_AGGREGATES yang dibuang pada migrasi 20260729000000: yang itu proyeksi ke
   * depan yang membusuk sendiri tanpa ada yang berubah.
   *
   * CONCURRENTLY supaya penyegaran tidak mengunci view dan menghentikan penilaian batch
   * lain yang kebetulan berjalan bersamaan. Kegagalannya sengaja ditelan: benchmark yang
   * tertinggal satu siklus jauh lebih ringan akibatnya daripada pencatatan panen yang
   * gagal karena penyegaran statistik.
   */
  async refreshBenchmark(): Promise<boolean> {
    try {
      await this.prisma.$executeRawUnsafe(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY "zone_yield_benchmark"',
      );
      return true;
    } catch (e) {
      this.log.warn(`Gagal menyegarkan zone_yield_benchmark: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Posisi realisasi Tenant terhadap rata-rata zona, dalam persen (FR-7.12f, TN-34).
   *
   * Positif = di atas rata-rata zona. `null` bila belum ada pembanding yang cukup — dan
   * itu HARUS dilaporkan apa adanya, bukan diisi 0 yang akan terbaca "tepat rata-rata".
   *
   * Yang dikembalikan posisi RELATIF, bukan rasio mentah. Rasio mentah, dibandingkan
   * berulang kali lintas siklus, membuat ambangnya tersimpulkan meski tidak pernah
   * tertulis di mana pun (FR-7.12c).
   */
  async posisiZona(batchIds: string[]): Promise<{ posisiPct: number | null; menyimpang: number }> {
    if (!batchIds.length) return { posisiPct: null, menyimpang: 0 };

    // DISTINCT ON batch: satu batch bisa terhubung ke banyak order item dalam zona yang
    // sama, dan tanpa ini satu batch akan ikut menghitung berkali-kali ke rata-rata.
    const rows = await this.prisma.$queryRaw<
      Array<{ rasio: string; avg: string; stddev: string | null; n: number }>
    >`
      SELECT DISTINCT ON (b.id)
             (b.quota_box_fulfilled::numeric / b.quota_box_sold)::text AS rasio,
             zb.avg_fulfillment_ratio::text                            AS avg,
             zb.stddev_fulfillment_ratio::text                         AS stddev,
             zb.batch_sample_count                                     AS n
      FROM batches b
      JOIN products p     ON p.id = b.product_id
      JOIN order_items oi ON oi.batch_id = b.id
      JOIN shipments s    ON s.id = oi.shipment_id
      JOIN zone_yield_benchmark zb
             ON zb.zone_id      = s.zone_id
            AND zb.commodity_id = p.commodity_id
            AND zb.harvest_week = date_trunc('week', b.claimed_harvest_date)::date
      WHERE b.id = ANY(${batchIds}::uuid[])
        AND b.quota_box_sold > 0
        AND b.quota_box_fulfilled IS NOT NULL
        AND zb.batch_sample_count >= ${MIN_BENCHMARK_SAMPLE}
      ORDER BY b.id
    `;
    if (!rows.length) return { posisiPct: null, menyimpang: 0 };

    let jumlahPosisi = 0;
    let menyimpang = 0;
    for (const r of rows) {
      const rasio = Number(r.rasio);
      const n = Number(r.n);
      const avgSemua = Number(r.avg);
      const sd = Number(r.stddev ?? 0);

      // Rata-rata TANPA batch Tenant sendiri.
      //
      // Benchmark disegarkan tepat setelah panen ini dicatat, jadi batch yang sedang
      // dinilai ikut masuk ke rata-rata zona. Pada zona kecil (n = 5) ia menyumbang
      // seperlima, menarik rata-rata ke arah dirinya sendiri dan menutupi penyimpangannya.
      // Membandingkan seseorang dengan kelompok yang memuat dirinya bukan perbandingan.
      const avg = n > 1 ? (avgSemua * n - rasio) / (n - 1) : avgSemua;

      jumlahPosisi += avg === 0 ? 0 : ((rasio - avg) / avg) * 100;

      // Simpangan baku tetap memakai nilai gabungan — mengeluarkan satu titik darinya
      // menuntut jumlah kuadrat yang tidak disimpan matview. Efeknya membuat sebaran
      // tampak sedikit lebih lebar, sehingga penyimpangan lebih SULIT terpicu. Arah galat
      // itu disengaja: lebih baik melewatkan satu pelanggar daripada menghukum yang benar.
      //
      // Hanya penyimpangan KE BAWAH yang dihitung. Panen di atas rata-rata zona tidak
      // perlu ditandai — Tenant tetap harus benar-benar mengirimkannya.
      if (sd > 0 && (avg - rasio) / sd >= DEVIASI_ZONA_SIGMA) menyimpang += 1;
    }
    return { posisiPct: Math.round((jumlahPosisi / rows.length) * 100) / 100, menyimpang };
  }

  /** Pagar kepemilikan — riwayat pita memuat dasar perhitungan lahan milik Tenant. */
  async pastikanMilikTenant(tenantId: string, batchId: string) {
    const ada = await this.prisma.batch.findFirst({
      where: { id: batchId, product: { tenantId } },
      select: { id: true },
    });
    if (!ada) throw new NotFoundException("Batch tidak ditemukan");
  }

  /**
   * TN-35 — riwayat penilaian satu batch, termasuk percobaan yang TIDAK dikonfirmasi.
   *
   * Yang ditampilkan adalah rentang pita hasil hitungan dari lahan Tenant itu sendiri,
   * bukan garis kelulusan. Bedanya penting (FR-7.12c): pita bergerak mengikuti seberapa
   * hijau lahannya, jadi mengetahuinya tidak memberi tahu apa pun tentang ambang penalti.
   */
  async riwayat(batchId: string): Promise<YieldAssessmentHistoryItem[]> {
    const rows = await this.prisma.yieldAssessment.findMany({
      where: { batchId },
      orderBy: { assessedAt: "desc" },
    });
    return rows.map((r) => ({
      assessmentId: r.id,
      assessedAt: r.assessedAt.toISOString(),
      reportedBox: r.reportedBox,
      expectedMinBox: r.expectedYieldMin === null ? null : Number(r.expectedYieldMin),
      expectedMaxBox: r.expectedYieldMax === null ? null : Number(r.expectedYieldMax),
      peakNdvi: r.peakNdviUsed === null ? null : Number(r.peakNdviUsed),
      basis: r.basis as AssessmentBasis,
      verdict: r.verdict as YieldPlausibility,
      finalVerdict: (r.finalVerdict as YieldPlausibility | null) ?? null,
      confirmed: r.confirmedAt !== null,
    }));
  }

  /**
   * OP-13 — antrean tinjauan kewajaran (FR-7.12a, FR-5.6).
   *
   * Empat hal dikirim bersama karena masing-masing sendirian menyesatkan: kurva NDVI,
   * rentang pita, angka yang dilaporkan, dan realisasi Tenant lain sezona. Kurva yang
   * bagus tanpa pembanding zona tidak memberi tahu apakah musimnya memang buruk untuk
   * semua orang — dan itulah pertanyaan yang menentukan putusannya.
   */
  async antreanTinjauan(): Promise<PlausibilityReviewItem[]> {
    const rows = await this.prisma.yieldAssessment.findMany({
      where: { verdict: "PERLU_DITINJAU", finalVerdict: null },
      // Paling mepet tenggat di atas; yang tanpa tenggat menyusul.
      orderBy: [{ slaDueAt: "asc" }, { assessedAt: "asc" }],
      include: {
        batch: {
          select: {
            id: true,
            quotaBoxSold: true,
            landPlotId: true,
            claimedHarvestDate: true,
            product: {
              select: {
                name: true,
                commodityId: true,
                commodity: { select: { name: true } },
                tenant: { select: { id: true, companyName: true } },
              },
            },
          },
        },
      },
    });

    return Promise.all(
      rows.map(async (r) => {
        const [obs, peers, percobaan] = await Promise.all([
          this.prisma.satelliteObservation.findMany({
            where: { landPlotId: r.batch.landPlotId },
            orderBy: { sceneDate: "asc" },
            select: { sceneDate: true, ndviMean: true, ndmiMean: true, cloudPct: true, usable: true },
          }),
          this.tetanggaZona(
            r.batch.id,
            r.batch.product.commodityId,
            r.batch.product.tenant.id,
            r.batch.claimedHarvestDate,
          ),
          this.prisma.yieldAssessment.count({ where: { batchId: r.batch.id } }),
        ]);

        return {
          assessmentId: r.id,
          batchId: r.batch.id,
          productName: r.batch.product.name,
          tenantName: r.batch.product.tenant.companyName,
          commodityName: r.batch.product.commodity.name,
          assessedAt: r.assessedAt.toISOString(),
          slaDueAt: r.slaDueAt?.toISOString() ?? null,
          reportedBox: r.reportedBox,
          quotaBoxSold: r.batch.quotaBoxSold,
          expectedMinBox: r.expectedYieldMin === null ? null : Number(r.expectedYieldMin),
          expectedMaxBox: r.expectedYieldMax === null ? null : Number(r.expectedYieldMax),
          peakNdvi: r.peakNdviUsed === null ? null : Number(r.peakNdviUsed),
          basis: r.basis as AssessmentBasis,
          verdict: r.verdict as YieldPlausibility,
          attemptCount: percobaan,
          ndviSeries: obs.map((o) => ({
            date: o.sceneDate.toISOString().slice(0, 10),
            ndvi: o.ndviMean === null ? null : Number(o.ndviMean),
            ndmi: o.ndmiMean === null ? null : Number(o.ndmiMean),
            cloudPct: Number(o.cloudPct),
            usable: o.usable,
          })),
          zonePeers: peers,
        };
      }),
    );
  }

  /** Realisasi Tenant LAIN pada komoditas & minggu panen yang sama. */
  private async tetanggaZona(
    batchId: string,
    commodityId: string,
    tenantId: string,
    claimedHarvestDate: Date,
  ): Promise<ZonePeer[]> {
    return this.prisma.$queryRaw<ZonePeer[]>`
      SELECT DISTINCT ON (b.id)
             t.company_name                                              AS "tenantName",
             (b.quota_box_fulfilled::numeric / b.quota_box_sold)::float8 AS "fulfillmentRatio"
      FROM batches b
      JOIN products p     ON p.id = b.product_id
      JOIN tenants  t     ON t.id = p.tenant_id
      JOIN order_items oi ON oi.batch_id = b.id
      JOIN shipments s    ON s.id = oi.shipment_id
      WHERE p.commodity_id = ${commodityId}::uuid
        AND p.tenant_id   <> ${tenantId}::uuid
        AND b.id          <> ${batchId}::uuid
        AND b.quota_box_sold > 0
        AND b.quota_box_fulfilled IS NOT NULL
        AND date_trunc('week', b.claimed_harvest_date)
            = date_trunc('week', ${claimedHarvestDate}::date)
      ORDER BY b.id
    `;
  }

  /**
   * Putusan Operator (OP-13). Menggantikan verdict otomatis — mesin menandai, manusia
   * memutuskan, dan itulah yang akhirnya menentukan cap 10% berlaku atau gugur (FR-7.11).
   *
   * TIDAK menyentuh `assurance_resolutions.cap_waived` yang sudah tercatat: pembeli sudah
   * memilih berdasarkan aturan yang berlaku saat itu, dan keputusan finansial yang sudah
   * diambil tidak boleh berubah surut.
   */
  async putuskanTinjauan(assessmentId: string, finalVerdict: YieldPlausibility, operatorUserId: string) {
    const ada = await this.prisma.yieldAssessment.findUnique({
      where: { id: assessmentId },
      select: { id: true },
    });
    if (!ada) throw new NotFoundException("Penilaian tidak ditemukan");

    const baris = await this.prisma.yieldAssessment.update({
      where: { id: assessmentId },
      data: { finalVerdict, reviewedById: operatorUserId },
      select: { id: true, batchId: true },
    });
    await this.prisma.batch.update({
      where: { id: baris.batchId },
      data: { plausibilityCached: finalVerdict },
    });
    return { assessmentId: baris.id, batchId: baris.batchId, finalVerdict };
  }

  // ------------------------------------------------------------------ internal

  private async muatBatch(batchId: string): Promise<BarisBatch | null> {
    const rows = await this.prisma.$queryRaw<BarisBatch[]>`
      SELECT b.quota_box_sold,
             p.qty_kg_per_box::text,
             c.avg_yield_kg_per_ha::text,
             lp.effective_area_ha::text,
             -- Puncak NDVI hanya sah bila ADA amatan yang mendukungnya.
             --
             -- Kolomnya diisi worker satelit dari deret amatan. Nilai yang muncul tanpa
             -- satu pun amatan layak berarti ia datang dari tempat lain — seed, migrasi,
             -- atau tangan manusia — dan membangun pita di atasnya sama dengan menilai
             -- orang memakai bukti yang tidak pernah ada. Lebih baik TIDAK_DAPAT_DINILAI.
             CASE WHEN EXISTS (
                    SELECT 1 FROM satellite_observations o
                     WHERE o.land_plot_id = lp.id AND o.usable
                  ) THEN b.peak_ndvi::text END AS peak_ndvi,
             c.id::text AS commodity_id,
             b.claimed_harvest_date,
             -- Zona pengiriman batch ini, diambil dari tujuan terbanyak.
             --
             -- ⚠️ Ini PROKSI. Yang seharusnya dibandingkan adalah zona PRODUKSI — Tenant
             -- yang menghadapi cuaca yang sama. Tabel zones belum punya geometri, jadi
             -- zona tujuan pengiriman adalah pendekatan terbaik yang datanya ada. Masih
             -- layak selama pasarnya sesempit Malang Raya; sebelum benchmark dipakai
             -- lintas kabupaten, ini harus menjadi spatial join ke poligon lahan.
             (SELECT s.zone_id::text
                FROM order_items oi JOIN shipments s ON s.id = oi.shipment_id
               WHERE oi.batch_id = b.id
               GROUP BY s.zone_id ORDER BY SUM(oi.qty_box) DESC LIMIT 1) AS zone_id
      FROM batches b
      JOIN products p     ON p.id  = b.product_id
      JOIN commodities c  ON c.id  = p.commodity_id
      JOIN land_plots lp  ON lp.id = b.land_plot_id
      WHERE b.id = ${batchId}::uuid
    `;
    return rows[0] ?? null;
  }

  private async hitung(b: BarisBatch, reportedBox: number): Promise<YieldAssessmentResult> {
    // Dua sebab "tidak ada dasar", dan keduanya bukan salah Tenant.
    if (b.peak_ndvi === null) {
      return this.tanpaDasar(
        "Puncak kehijauan lahan belum terukur — tutupan awan membuat citra satelit tidak terbaca pada siklus ini.",
      );
    }
    if (b.effective_area_ha === null) {
      return this.tanpaDasar(
        "Luas efektif lahan belum dapat dihitung, sehingga perkiraan hasil tidak punya dasar.",
      );
    }

    const musim = this.musim(b.claimed_harvest_date);
    const acuan = await this.prisma.commoditySeasonBaseline.findUnique({
      where: { commodityId_season: { commodityId: b.commodity_id, season: musim } },
      select: { ndviPeakReference: true, vigorCurveParams: true },
    });
    if (!acuan) {
      return this.tanpaDasar(
        `Kurva acuan ${musim === "MUSIM_HUJAN" ? "musim hujan" : "musim kemarau"} untuk komoditas ini belum tersedia.`,
      );
    }

    const puncak = Number(b.peak_ndvi);
    const vigor = this.faktorVigor(puncak, acuan.vigorCurveParams as Kurva);
    const kgPerBox = Number(b.qty_kg_per_box);
    const dugaanBox =
      (Number(b.effective_area_ha) * Number(b.avg_yield_kg_per_ha) * vigor) / (kgPerBox || 1);

    const min = Math.round(dugaanBox * (1 - LEBAR_PITA));
    const max = Math.round(dugaanBox * (1 + LEBAR_PITA));

    const benchmark = b.zone_id ? await this.benchmarkZona(b.zone_id, b.commodity_id, b.claimed_harvest_date) : null;
    const basis: AssessmentBasis = benchmark ? "PITA_PLUS_BENCHMARK" : "PITA_SAJA";
    const rasio = b.quota_box_sold > 0 ? reportedBox / b.quota_box_sold : null;

    const verdict = this.putuskan(reportedBox, min, benchmark, rasio);

    return {
      assessmentId: "",
      verdict,
      basis,
      reportedBox,
      expectedMinBox: min,
      expectedMaxBox: max,
      peakNdvi: puncak,
      zoneBenchmarkRatio: benchmark?.avg ?? null,
      zoneSampleCount: benchmark?.n ?? 0,
      reason: this.alasan(verdict, reportedBox, min, max, basis),
    };
  }

  /**
   * Keputusan verdict. Hanya batas BAWAH yang menghukum.
   *
   * Melaporkan LEBIH dari pita bukan kecurangan yang perlu ditangkap di sini: box yang
   * dilaporkan harus benar-benar dikirim, jadi angka yang dibesar-besarkan merugikan
   * Tenant sendiri. Yang dicegah FR-7.12a adalah laporan yang terlalu KECIL — sisanya
   * dijual ke luar (Risiko 1b).
   */
  private putuskan(
    reportedBox: number,
    min: number,
    benchmark: { avg: number; stddev: number; n: number } | null,
    rasio: number | null,
  ): YieldPlausibility {
    if (reportedBox >= min) {
      // Di dalam pita. Benchmark masih bisa menandai penyimpangan terhadap tetangga
      // sezona — tetapi hanya sebagai bahan tinjauan manusia, tidak langsung menghukum.
      if (benchmark && rasio !== null && benchmark.stddev > 0) {
        const z = (benchmark.avg - rasio) / benchmark.stddev;
        if (z >= DEVIASI_ZONA_SIGMA) return "PERLU_DITINJAU";
      }
      return "WAJAR";
    }
    // Di bawah pita. Sejauh mana?
    return reportedBox < min * BATAS_TIDAK_WAJAR ? "TIDAK_WAJAR" : "PERLU_DITINJAU";
  }

  /**
   * Rata-rata realisasi zona sezona. `null` bila pembandingnya kurang dari
   * `MIN_BENCHMARK_SAMPLE` — cold start dinyatakan apa adanya, bukan dipaksakan (FR-7.12e).
   */
  private async benchmarkZona(zoneId: string, commodityId: string, harvest: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ n: number; avg: string | null; stddev: string | null }>
    >`
      SELECT batch_sample_count AS n,
             avg_fulfillment_ratio::text    AS avg,
             stddev_fulfillment_ratio::text AS stddev
      FROM zone_yield_benchmark
      WHERE zone_id = ${zoneId}::uuid
        AND commodity_id = ${commodityId}::uuid
        AND harvest_week = date_trunc('week', ${harvest}::date)::date
    `;
    const r = rows[0];
    if (!r || r.n < MIN_BENCHMARK_SAMPLE || r.avg === null) return null;
    return { avg: Number(r.avg), stddev: Number(r.stddev ?? 0), n: r.n };
  }

  /**
   * Puncak NDVI → faktor vigor, linear dengan jepitan (§6.2 poin 6).
   *
   * Batas atas ada supaya satu piksel cerah tidak melebarkan pita sampai laporan apa pun
   * terlihat wajar; batas bawah supaya lahan yang tampak gundul tidak menghasilkan pita
   * negatif.
   */
  private faktorVigor(puncak: number, k: Kurva): number {
    const lantai = k.ndviFloor ?? 0.35;
    const acuan = k.ndviPeak ?? 0.75;
    const vLantai = k.vigorAtFloor ?? 0.45;
    const vAcuan = k.vigorAtPeak ?? 1.0;
    const vMaks = k.vigorMax ?? 1.25;

    if (acuan <= lantai) return vAcuan;
    const t = (puncak - lantai) / (acuan - lantai);
    return Math.min(Math.max(vLantai + t * (vAcuan - vLantai), vLantai), vMaks);
  }

  /**
   * Musim tanam dari tanggal panen. Malang Raya: hujan November–April.
   *
   * Kasar memang, tetapi dipakai hanya untuk memilih kurva acuan, dan kurva kedua musim
   * berdekatan. Ketika data BMKG per zona tersedia, di sinilah tempat menggantinya.
   */
  private musim(tanggal: Date): Season {
    const bulan = tanggal.getUTCMonth() + 1;
    return bulan >= 11 || bulan <= 4 ? "MUSIM_HUJAN" : "MUSIM_KEMARAU";
  }

  private tanpaDasar(alasan: string): YieldAssessmentResult {
    return {
      assessmentId: "",
      verdict: "TIDAK_DAPAT_DINILAI",
      basis: "TIDAK_ADA_DASAR",
      reportedBox: 0,
      expectedMinBox: null,
      expectedMaxBox: null,
      peakNdvi: null,
      zoneBenchmarkRatio: null,
      zoneSampleCount: 0,
      reason: alasan,
    };
  }

  /**
   * Kalimat yang dibaca Tenant. NADA INFORMATIF, BUKAN MENUDUH (aturan desain v2.3 butir 4).
   *
   * Rentang pita boleh disebut — itu perkiraan sistem tentang lahannya sendiri, bukan
   * ambang penalti. Yang tidak boleh muncul: seberapa jauh di bawah pita seseorang boleh
   * berada sebelum dihukum.
   */
  private alasan(
    verdict: YieldPlausibility,
    reported: number,
    min: number,
    max: number,
    basis: AssessmentBasis,
  ): string {
    const pita = `${min}–${max} box`;
    const dasar =
      basis === "PITA_PLUS_BENCHMARK"
        ? " Perkiraan ini juga dibandingkan dengan realisasi Tenant lain pada komoditas dan musim yang sama."
        : "";

    switch (verdict) {
      case "WAJAR":
        return `Laporan ${reported} box sejalan dengan kondisi lahan Anda pada siklus ini (perkiraan ${pita}).${dasar}`;
      case "PERLU_DITINJAU":
        return (
          `Laporan ${reported} box berada di bawah perkiraan dari kondisi lahan Anda (${pita}). ` +
          `Selisih sebesar ini bisa punya banyak sebab, jadi tim kami yang akan memeriksanya — panen Anda tetap diproses seperti biasa.${dasar}`
        );
      case "TIDAK_WAJAR":
        return (
          `Kurva kehijauan lahan Anda menunjukkan pertumbuhan normal sampai hari panen, dengan perkiraan hasil ${pita}. ` +
          `Laporan ${reported} box jauh di bawah itu.${dasar}`
        );
      default:
        return "Tidak ada dasar penilaian pada siklus ini.";
    }
  }
}
