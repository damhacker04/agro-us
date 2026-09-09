import type { CommodityCategory, CommoditySummary } from "@agro-os/shared";

/**
 * Kosakata dan pembacaan komoditas, dipakai bersama meja operator dan halaman pembeli.
 *
 * ADA KARENA DUA CACAT YANG KEDUANYA TIDAK KELIHATAN DARI KODE:
 *
 * 1. KONTRAK MENYEBUT `number`, SERVER MENGIRIM STRING. `shrinkTolerancePct` dan
 *    `avgYieldKgPerHa` adalah Decimal Prisma, dan Decimal diserialkan jadi `"15000"`.
 *    Akibatnya `k.avgYieldKgPerHa.toLocaleString("id-ID")` memanggil
 *    `String.prototype.toLocaleString` — yang mengembalikan stringnya apa adanya dan
 *    MENGABAIKAN argumen locale-nya. Pemanggilan yang tampak memformat angka, tidak
 *    memformat apa pun: "15000", tanpa pemisah ribuan, tanpa satu pun galat. Karena
 *    typing-nya berbohong, TypeScript tidak bisa menangkapnya.
 *
 * 2. `CommoditySummary` TIDAK MEMUAT TIGA MEDAN YANG SUNGGUH DIKIRIM: `growingDaysMin`,
 *    `shelfLifeDays`, `ambientStable`. Halaman menambalnya sendiri dengan cast lokal, dan
 *    cast yang disalin ke berkas kedua adalah cast yang akan melenceng.
 *
 * Keduanya sebetulnya cacat kontrak — yang benar diperbaiki di serialisasi server. Selama
 * belum, pembacaannya dikumpulkan di satu tempat supaya konversinya tidak lupa dilakukan
 * di halaman berikutnya.
 */

/** Bentuk komoditas yang BENAR-BENAR dikirim `/operator/commodities`. */
type Mentah = CommoditySummary & {
  growingDaysMin?: number | string | null;
  shelfLifeDays?: number | string | null;
  ambientStable?: boolean | null;
};

export interface Komoditas {
  id: string;
  name: string;
  category: CommodityCategory;
  shrinkTolerancePct: number;
  avgYieldKgPerHa: number;
  growingDaysMin: number | null;
  shelfLifeDays: number | null;
  ambientStable: boolean | null;
  gradeStandards: unknown;
}

/** `null` bila medannya tidak ada atau tidak terbaca sebagai angka — bukan 0, bukan tebakan. */
const bilangan = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function bacaKomoditas(k: CommoditySummary): Komoditas {
  const m = k as Mentah;
  return {
    id: k.id,
    name: k.name,
    category: k.category,
    // Dua medan ini selalu ada; `?? 0` hanya penjaga terakhir supaya tampilan tidak
    // menampilkan "NaN" bila serialisasinya suatu hari berubah lagi.
    shrinkTolerancePct: bilangan(k.shrinkTolerancePct) ?? 0,
    avgYieldKgPerHa: bilangan(k.avgYieldKgPerHa) ?? 0,
    growingDaysMin: bilangan(m.growingDaysMin),
    shelfLifeDays: bilangan(m.shelfLifeDays),
    ambientStable: m.ambientStable ?? null,
    gradeStandards: k.gradeStandards,
  };
}

/**
 * Ketiga kategori, bukan dua.
 *
 * Formulir komoditas hanya menawarkan DAUN dan BUAH_UMBI, padahal enumnya bertiga. Belum
 * ada komoditas KERING di data demo, jadi kekurangannya diam — tetapi komoditas kering
 * tidak akan pernah bisa dibuat, dan begitu ada satu, formulirnya membuka tanpa satu pun
 * kategori tersorot dan klik pertama operator diam-diam memindahkan kategorinya.
 */
export const KATEGORI: Record<CommodityCategory, string> = {
  DAUN: "Sayuran daun",
  BUAH_UMBI: "Buah & umbi",
  KERING: "Komoditas kering",
};
