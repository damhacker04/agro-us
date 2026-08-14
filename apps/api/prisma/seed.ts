/**
 * Seed data Fase 1 — ZONES + COMMODITIES (lihat ARCHITECTURE_PLAN §3d).
 * Idempotent: aman dijalankan berulang (upsert by unique name).
 *
 * ⚠️⚠️ PERINGATAN ANGKA RENDEMEN (avgYieldKgPerHa) ⚠️⚠️
 * Nilai di bawah adalah PLACEHOLDER INDIKATIF (kisaran umum literatur pertanian
 * Indonesia, per musim tanam). Angka ini LANGSUNG menentukan batas kuota PO 70%
 * (FR-3.3) — angka salah = Tenant bisa jual melebihi kapasitas lahan.
 * WAJIB divalidasi ke penyuluh pertanian / data BPS Malang Raya SEBELUM produksi.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, CommodityCategory } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

/** Toleransi susut baku (FR-5.2): 5% daun, 3% buah & umbi. */
const SHRINK = { DAUN: 5.0, BUAH_UMBI: 3.0, KERING: 3.0 } as const;

/** Template standar mutu per grade (FR-5.1) — definisi per komoditas bisa
 *  disempurnakan operator di Fase 4 tanpa migrasi (kolom jsonb). */
function gradeStandards(catatan: string) {
  return {
    A: { keseragaman_min_pct: 90, cacat_maks_pct: 2, deskripsi: "Ukuran seragam premium, bebas cacat berarti" },
    B: { keseragaman_min_pct: 75, cacat_maks_pct: 5, deskripsi: "Ukuran cukup seragam, cacat ringan diperbolehkan" },
    C: { keseragaman_min_pct: 60, cacat_maks_pct: 10, deskripsi: "Layak olah/masak, tampilan tidak diutamakan" },
    catatan,
  };
}

const ZONES = [
  // min_order_value > titik kritis Rp2.200.000 (PRD §8.2) — marjin tidak boleh negatif.
  { name: "Kota Malang", city: "Kota Malang", minOrderValue: 2_500_000 },
  { name: "Kabupaten Malang", city: "Kabupaten Malang", minOrderValue: 3_000_000 },
  { name: "Kota Batu", city: "Kota Batu", minOrderValue: 3_000_000 },
];

type SeedCommodity = {
  name: string;
  category: CommodityCategory;
  /** kg/ha per musim — PLACEHOLDER, lihat peringatan di atas. */
  avgYieldKgPerHa: number;
  /** Umur tanam minimal (hari) — dipakai cek kewajaran panen FR-4.8. PLACEHOLDER juga. */
  growingDaysMin: number;
  /**
   * Tahan suhu ambien — penentu lingkup MVP (§11.2). PRD membatasi MVP pada cabai,
   * bawang, dan umbi: tanpa rantai dingin, susut sayuran daun di iklim tropis jauh
   * melampaui toleransi, sehingga setiap pengiriman memicu klaim.
   *
   * Tomat dan Apel Batu sengaja `false`: keduanya BUAH_UMBI, tetapi tidak disebut
   * PRD sebagai komoditas MVP, dan tomat justru termasuk yang paling cepat rusak.
   * Menaikkannya ke `true` adalah keputusan produk, bukan keputusan teknis.
   */
  ambientStable: boolean;
  /** Puncak NDVI acuan kanopi sehat — [kemarau, hujan]. INDIKATIF, lihat CALIBRATION_SOURCE. */
  ndviPeak: [number, number];
  /**
   * Umur simpan pada suhu ambien, hari (FR-5.8).
   *
   * ⚠️ INDIKATIF, dan taruhannya lebih tinggi daripada rendemen: angka ini dipakai memberi
   * tahu PEMBELI seberapa segar barangnya. Salah di sini bukan salah hitung kapasitas,
   * melainkan salah menyampaikan kesegaran. Wajib divalidasi ke penyuluh/BPS.
   */
  umurSimpanHari: number;
  catatan: string;
};

const MUSIM = ["MUSIM_KEMARAU", "MUSIM_HUJAN"] as const;

/**
 * ⚠️ Provenance kurva kalibrasi — kolom `calibration_source` ada justru untuk ini.
 *
 * Angka NDVI di bawah adalah estimasi awal, bukan hasil pengukuran lapangan. Pita
 * kewajaran yang salah menghukum Tenant yang tidak bersalah, jadi teks ini harus tetap
 * jujur sampai Fase 0 (§10.1) benar-benar mengukur poligon nyata di Malang.
 */
const CALIBRATION_SOURCE =
  "Estimasi awal AgroUs v2.3 — kisaran NDVI literatur hortikultura umum. " +
  "BELUM divalidasi lapangan; wajib dikalibrasi ulang dari Fase 0 (§10.1) " +
  "sebelum dipakai menjatuhkan penalti.";

/**
 * Pemetaan puncak NDVI → faktor vigor (§6.2 poin 6).
 *
 * Linear dengan jepitan di kedua ujung: di `ndviFloor` kanopi praktis gagal (vigor 0,45),
 * di puncak acuan vigor 1,0, dan di atas puncak masih boleh naik sampai 1,25. Batas atas
 * ada supaya satu piksel cerah tidak melebarkan pita sampai laporan apa pun terlihat wajar.
 */
function kurvaVigor(puncak: number) {
  return {
    model: "linear_clamp",
    ndviFloor: 0.35,
    ndviPeak: puncak,
    vigorAtFloor: 0.45,
    vigorAtPeak: 1.0,
    vigorMax: 1.25,
  };
}

const COMMODITIES: SeedCommodity[] = [
  // ---- DAUN (susut 5%) ----
  { name: "Sawi Hijau (Caisim)", category: "DAUN", avgYieldKgPerHa: 15_000, growingDaysMin: 25, ambientStable: false, ndviPeak: [0.72, 0.78], umurSimpanHari: 3, catatan: "Grade by kesegaran daun & bebas lubang hama" },
  { name: "Bayam", category: "DAUN", avgYieldKgPerHa: 8_000, growingDaysMin: 20, ambientStable: false, ndviPeak: [0.70, 0.76], umurSimpanHari: 2, catatan: "Umur simpan pendek — prioritas pengiriman pagi" },
  { name: "Kangkung", category: "DAUN", avgYieldKgPerHa: 10_000, growingDaysMin: 21, ambientStable: false, ndviPeak: [0.74, 0.80], umurSimpanHari: 2, catatan: "Grade by panjang batang & kesegaran" },
  { name: "Kubis", category: "DAUN", avgYieldKgPerHa: 25_000, growingDaysMin: 70, ambientStable: false, ndviPeak: [0.78, 0.82], umurSimpanHari: 14, catatan: "Grade by kepadatan krop & berat per krop" },
  { name: "Selada", category: "DAUN", avgYieldKgPerHa: 12_000, growingDaysMin: 40, ambientStable: false, ndviPeak: [0.70, 0.75], umurSimpanHari: 4, catatan: "Sensitif suhu — utamakan rantai dingin" },
  // ---- BUAH & UMBI (susut 3%) ----
  { name: "Cabai Rawit", category: "BUAH_UMBI", avgYieldKgPerHa: 7_000, growingDaysMin: 80, ambientStable: true, ndviPeak: [0.68, 0.74], umurSimpanHari: 10, catatan: "Grade by tingkat kematangan merah & keseragaman" },
  { name: "Cabai Merah Besar", category: "BUAH_UMBI", avgYieldKgPerHa: 10_000, growingDaysMin: 85, ambientStable: true, ndviPeak: [0.68, 0.74], umurSimpanHari: 8, catatan: "Grade by panjang buah & kilap kulit" },
  { name: "Tomat", category: "BUAH_UMBI", avgYieldKgPerHa: 25_000, growingDaysMin: 65, ambientStable: false, ndviPeak: [0.72, 0.78], umurSimpanHari: 7, catatan: "Grade by diameter & kematangan seragam" },
  { name: "Kentang", category: "BUAH_UMBI", avgYieldKgPerHa: 17_000, growingDaysMin: 90, ambientStable: true, ndviPeak: [0.78, 0.84], umurSimpanHari: 60, catatan: "Grade by ukuran umbi (knol) & bebas hijau" },
  { name: "Wortel", category: "BUAH_UMBI", avgYieldKgPerHa: 15_000, growingDaysMin: 90, ambientStable: true, ndviPeak: [0.70, 0.76], umurSimpanHari: 14, catatan: "Grade by panjang-diameter & bebas cabang" },
  { name: "Bawang Merah", category: "BUAH_UMBI", avgYieldKgPerHa: 10_000, growingDaysMin: 60, ambientStable: true, ndviPeak: [0.58, 0.64], umurSimpanHari: 90, catatan: "Grade by diameter umbi & tingkat kering askip" },
  { name: "Apel Batu", category: "BUAH_UMBI", avgYieldKgPerHa: 15_000, growingDaysMin: 150, ambientStable: false, ndviPeak: [0.75, 0.80], umurSimpanHari: 21, catatan: "Khas Kota Batu — rendemen per tahun, siklus beda dgn sayur" },
];

async function main() {
  for (const z of ZONES) {
    await prisma.zone.upsert({
      where: { name: z.name },
      update: { city: z.city, minOrderValue: z.minOrderValue },
      create: z,
    });
  }
  console.log(`✔ ${ZONES.length} zona (Malang Raya)`);

  for (const c of COMMODITIES) {
    const data = {
      category: c.category,
      shrinkTolerancePct: SHRINK[c.category],
      avgYieldKgPerHa: c.avgYieldKgPerHa,
      growingDaysMin: c.growingDaysMin,
      ambientStable: c.ambientStable,
      shelfLifeDays: c.umurSimpanHari,
      gradeStandards: gradeStandards(c.catatan),
    };
    const komoditas = await prisma.commodity.upsert({
      where: { name: c.name },
      update: data,
      create: { name: c.name, ...data },
    });

    for (const [i, musim] of MUSIM.entries()) {
      const acuan = {
        ndviPeakReference: c.ndviPeak[i]!,
        vigorCurveParams: kurvaVigor(c.ndviPeak[i]!),
        // Musim hujan: radiasi lebih rendah, siklus melar ~10%.
        typicalCycleDays: Math.round(c.growingDaysMin * (musim === "MUSIM_HUJAN" ? 1.1 : 1)),
        calibrationSource: CALIBRATION_SOURCE,
      };
      await prisma.commoditySeasonBaseline.upsert({
        where: { commodityId_season: { commodityId: komoditas.id, season: musim } },
        update: acuan,
        create: { commodityId: komoditas.id, season: musim, ...acuan },
      });
    }
  }
  console.log(`✔ ${COMMODITIES.length} komoditas (rendemen & umur simpan = INDIKATIF, wajib validasi BPS/penyuluh)`);
  console.log(`✔ ${COMMODITIES.length * MUSIM.length} baseline musim (kurva vigor = INDIKATIF)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
