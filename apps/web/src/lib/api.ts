/**
 * Penghubung tunggal ke API AgroUs.
 *
 * Seluruh pemanggilan API lewat sini, bukan `fetch()` yang bertebaran di tiap halaman.
 * Dua alasannya: alamat API cukup diubah di satu tempat saat berpindah lingkungan, dan
 * tipe responsnya diambil dari `@agro-os/shared` — kontrak yang sama yang dipakai
 * backend, sehingga ketidakcocokan ketahuan saat kompilasi, bukan saat dibuka pengguna.
 */
import type {
  CatalogItem,
  NdviSeries,
  TimelineNodeResponse,
  TimelineVerifyResponse,
  ZoneSummary,
} from "@agro-os/shared";

/**
 * Alamat API. Nilai `NEXT_PUBLIC_*` di-INLINE saat build, bukan dibaca saat berjalan —
 * jadi kalau variabelnya tidak ada di lingkungan build, seluruh situs akan menembak
 * alamat cadangan ini selamanya.
 *
 * Cadangannya sengaja diarahkan ke API produksi, bukan `localhost:3001`. Kalau lupa
 * menyetel variabelnya di Vercel, situsnya tetap berfungsi; sebaliknya kalau cadangannya
 * localhost, setiap pengunjung akan memanggil komputernya sendiri dan halamannya kosong
 * tanpa petunjuk apa pun.
 *
 * Untuk pengembangan lokal, timpa lewat `apps/web/.env.local`.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://agro-us.onrender.com";

async function ambil<T>(jalur: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${jalur}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    // Katalog & timeline berubah sepanjang musim tanam; jangan disimpan cache Next.
    cache: "no-store",
  });
  if (!res.ok) {
    const pesan = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${jalur}${pesan ? ` — ${pesan.slice(0, 160)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** Zona layanan (FR-2.1). Hanya Malang Raya — bukan seluruh Indonesia. */
export const ambilZona = () => ambil<ZoneSummary[]>("/zones");

/** Katalog terpadu lintas-Tenant dalam satu zona (FR-2.1, FR-2.2). */
export const ambilKatalog = (zoneId: string) =>
  ambil<CatalogItem[]>(`/catalog?zoneId=${encodeURIComponent(zoneId)}`);

export const ambilProduk = (batchId: string) => ambil<CatalogItem>(`/catalog/${batchId}`);

/** Verified Timeline — publik, tanpa login (§6.1). */
export const ambilTimeline = (batchId: string) =>
  ambil<TimelineNodeResponse[]>(`/batches/${batchId}/timeline`);

/** Hasil hitung ulang rantai hash: bukti data belum pernah diubah. */
export const ambilVerifikasi = (batchId: string) =>
  ambil<TimelineVerifyResponse>(`/batches/${batchId}/timeline/verify`);

export const ambilNdvi = (batchId: string) => ambil<NdviSeries>(`/batches/${batchId}/ndvi`);
