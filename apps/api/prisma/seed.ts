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
  catatan: string;
};

const COMMODITIES: SeedCommodity[] = [
  // ---- DAUN (susut 5%) ----
  { name: "Sawi Hijau (Caisim)", category: "DAUN", avgYieldKgPerHa: 15_000, catatan: "Grade by kesegaran daun & bebas lubang hama" },
  { name: "Bayam", category: "DAUN", avgYieldKgPerHa: 8_000, catatan: "Umur simpan pendek — prioritas pengiriman pagi" },
  { name: "Kangkung", category: "DAUN", avgYieldKgPerHa: 10_000, catatan: "Grade by panjang batang & kesegaran" },
  { name: "Kubis", category: "DAUN", avgYieldKgPerHa: 25_000, catatan: "Grade by kepadatan krop & berat per krop" },
  { name: "Selada", category: "DAUN", avgYieldKgPerHa: 12_000, catatan: "Sensitif suhu — utamakan rantai dingin" },
  // ---- BUAH & UMBI (susut 3%) ----
  { name: "Cabai Rawit", category: "BUAH_UMBI", avgYieldKgPerHa: 7_000, catatan: "Grade by tingkat kematangan merah & keseragaman" },
  { name: "Cabai Merah Besar", category: "BUAH_UMBI", avgYieldKgPerHa: 10_000, catatan: "Grade by panjang buah & kilap kulit" },
  { name: "Tomat", category: "BUAH_UMBI", avgYieldKgPerHa: 25_000, catatan: "Grade by diameter & kematangan seragam" },
  { name: "Kentang", category: "BUAH_UMBI", avgYieldKgPerHa: 17_000, catatan: "Grade by ukuran umbi (knol) & bebas hijau" },
  { name: "Wortel", category: "BUAH_UMBI", avgYieldKgPerHa: 15_000, catatan: "Grade by panjang-diameter & bebas cabang" },
  { name: "Bawang Merah", category: "BUAH_UMBI", avgYieldKgPerHa: 10_000, catatan: "Grade by diameter umbi & tingkat kering askip" },
  { name: "Apel Batu", category: "BUAH_UMBI", avgYieldKgPerHa: 15_000, catatan: "Khas Kota Batu — rendemen per tahun, siklus beda dgn sayur" },
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
      gradeStandards: gradeStandards(c.catatan),
    };
    await prisma.commodity.upsert({
      where: { name: c.name },
      update: data,
      create: { name: c.name, ...data },
    });
  }
  console.log(`✔ ${COMMODITIES.length} komoditas (rendemen = INDIKATIF, wajib validasi BPS/penyuluh)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
