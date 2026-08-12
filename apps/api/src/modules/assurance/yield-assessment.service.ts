import { Injectable, Logger } from "@nestjs/common";
import {
  MIN_BENCHMARK_SAMPLE,
  type AssessmentBasis,
  type Season,
  type YieldAssessmentResult,
  type YieldPlausibility,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * ================== PARAMETER SERVER — TIDAK PERNAH SAMPAI KE PERAMBAN ==================
 *
 * Semua angka di blok ini adalah ambang, dan FR-7.12c melarangnya tampil di antarmuka
 * mana pun. Karena itu ia hidup di sini, bukan di `@agro-os/shared`: apa pun yang ada di
 * kontrak bersama ikut ter-bundel ke peramban Tenant, dan ambang yang diketahui pihak
 * yang melaporkan angkanya sendiri berubah dari pagar menjadi target.
 */

/**
 * Setengah lebar pita, relatif terhadap titik tengah. 0,40 berarti pita membentang
 * 60%–140% dari dugaan.
 *
 * Sengaja LEBAR (§6.2 poin 6). Tujuannya menandai laporan yang tidak masuk akal, bukan
 * mengaudit selisih kecil. Rendemen acuan sendiri masih estimasi (lihat
 * `calibration_source`), dan pita sempit di atas angka yang belum terkalibrasi hanya
 * memindahkan ketidakpastian kita menjadi tuduhan kepada Tenant.
 */
const LEBAR_PITA = Number(process.env["YIELD_BAND_SPREAD"] ?? 0.4);

/**
 * Seberapa jauh DI BAWAH batas bawah pita sebelum laporan disebut tidak masuk akal.
 * Di antara keduanya: `PERLU_DITINJAU` — manusia yang memutuskan, bukan mesin.
 */
const BATAS_TIDAK_WAJAR = Number(process.env["YIELD_IMPLAUSIBLE_RATIO"] ?? 0.65);

/** Deviasi terhadap rata-rata zona (dalam simpangan baku) yang dianggap menyimpang. */
const DEVIASI_ZONA_SIGMA = Number(process.env["ZONE_DEVIATION_SIGMA"] ?? 1.5);

/** Tenggat tinjauan Operator untuk verdict marginal (FR-5.6, OP-13). */
const SLA_TINJAUAN_JAM = 24;

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

  // ------------------------------------------------------------------ internal

  private async muatBatch(batchId: string): Promise<BarisBatch | null> {
    const rows = await this.prisma.$queryRaw<BarisBatch[]>`
      SELECT b.quota_box_sold,
             p.qty_kg_per_box::text,
             c.avg_yield_kg_per_ha::text,
             lp.effective_area_ha::text,
             b.peak_ndvi::text,
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
