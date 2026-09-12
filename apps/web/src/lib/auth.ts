"use client";

/**
 * Penyimpanan sesi pengguna di sisi klien.
 *
 * Token disimpan di `localStorage`, bukan cookie httpOnly. Konsekuensinya jujur: skrip
 * apa pun yang berhasil disuntikkan ke halaman bisa membacanya (XSS). Untuk peragaan
 * dengan data karangan ini dapat diterima; sebelum ada pengguna sungguhan, pindahkan ke
 * cookie httpOnly + SameSite yang diterbitkan server.
 */
import type { AuthUser } from "@agro-os/shared";
import { kosongkanKeranjang } from "./keranjang";

const KUNCI_TOKEN = "agrous.token";
const KUNCI_USER = "agrous.user";
/**
 * Siapa pemilik keranjang yang sekarang ada di perangkat ini.
 *
 * Sengaja DIPISAH dari `agrous.user` dan sengaja TIDAK dihapus oleh `hapusSesi()`.
 * Kalau penandanya ikut terhapus saat keluar, ia tidak bisa menjawab satu-satunya
 * pertanyaan yang perlu dijawab saat orang berikutnya masuk: "keranjang yang tertinggal
 * ini milik siapa?" — dan justru pada kasus pembeli sebelumnya menutup peramban tanpa
 * menekan keluar, penanda itulah satu-satunya yang tersisa.
 */
const KUNCI_PEMILIK_KERANJANG = "agrous.keranjang.pemilik";

/**
 * Cookie peran — SATU-SATUNYA bagian sesi yang terlihat oleh server.
 *
 * Isinya nama peran saja: tidak ada token, tidak ada nomor telepon, tidak ada tanda
 * tangan. Gunanya tunggal, yaitu memberi `middleware.ts` cukup bahan untuk memutuskan
 * apakah satu URL layak dibuka sama sekali — middleware tidak bisa membaca
 * `localStorage`, jadi tanpa ini tidak ada penjagaan rute apa pun di sisi server.
 *
 * Sengaja BUKAN httpOnly, karena justru JavaScript-lah yang menulisnya di sini; dan
 * karena itu ia tidak boleh dianggap kredensial. Batas otorisasi tetap JWT di header
 * `Authorization` yang diperiksa API. Lihat `middleware.ts` untuk batas yang sama
 * dinyatakan dari sisi sana.
 */
const KUKI_PERAN = "agrous.peran";

function tulisKukiPeran(peran: AuthUser["role"]) {
  if (typeof document === "undefined") return;
  // `SameSite=Lax` menahan pengiriman pada navigasi lintas situs, dan tanpa `Secure`
  // supaya `http://localhost` saat pengembangan tetap bekerja seperti produksi.
  document.cookie = `${KUKI_PERAN}=${peran}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}

function hapusKukiPeran() {
  if (typeof document === "undefined") return;
  document.cookie = `${KUKI_PERAN}=; path=/; max-age=0; samesite=lax`;
}

const PERAN = new Set<AuthUser["role"]>(["BUYER", "TENANT", "OPERATOR"]);

/**
 * Apakah nilai yang tersimpan benar-benar seorang pengguna.
 *
 * `localStorage` adalah masukan dari luar, bukan memori program: isinya bisa ditulis
 * tab lain, ekstensi, konsol, atau versi aplikasi yang lebih tua dengan bentuk data
 * berbeda. `JSON.parse` hanya menjamin sintaksisnya sah — `"not-a-user"` dan `null`
 * lolos dengan gembira — jadi bentuknya harus diperiksa di sini. Tanpa pemeriksaan ini
 * `ambilUser()` mengembalikan string, `user.role` menjadi `undefined`, dan kode
 * pemanggil menyimpulkan "ada yang login" untuk sesuatu yang bukan sesi.
 */
function berbentukUser(nilai: unknown): nilai is AuthUser {
  if (typeof nilai !== "object" || nilai === null) return false;
  const u = nilai as Record<string, unknown>;
  return typeof u["id"] === "string" && typeof u["phone"] === "string" && PERAN.has(u["role"] as AuthUser["role"]);
}

/**
 * Mulai sesi. Kalau yang masuk BUKAN orang yang sesinya tersimpan sebelumnya, keranjang
 * pemilik lama dibuang.
 *
 * Perangkat bersama adalah keadaan normal di sini, bukan kasus tepi: satu ponsel di
 * warung atau koperasi dipakai beberapa pembeli bergantian. Sebelumnya keranjang hanya
 * dibersihkan lewat `akhiriSesi()` — yaitu kalau orang sebelumnya menekan "keluar".
 * Kalau ia hanya menutup peramban, pembeli berikutnya membuka keranjang berisi pesanan
 * orang lain, dan pesanan itu ikut CHECKOUT atas namanya sendiri.
 */
export function simpanSesi(token: string, user: AuthUser) {
  const pemilikKeranjang = localStorage.getItem(KUNCI_PEMILIK_KERANJANG);
  if (pemilikKeranjang && pemilikKeranjang !== user.id) kosongkanKeranjang();
  localStorage.setItem(KUNCI_PEMILIK_KERANJANG, user.id);
  localStorage.setItem(KUNCI_TOKEN, token);
  localStorage.setItem(KUNCI_USER, JSON.stringify(user));
  tulisKukiPeran(user.role);
}

export function ambilToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KUNCI_TOKEN);
}

export function ambilUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const mentah = localStorage.getItem(KUNCI_USER);
  if (!mentah) return null;
  try {
    const nilai: unknown = JSON.parse(mentah);
    // Bentuk yang tidak dikenali diperlakukan sama dengan "belum masuk": lebih baik
    // orangnya diminta masuk lagi daripada aplikasi berjalan dengan sesi setengah jadi.
    return berbentukUser(nilai) ? nilai : null;
  } catch {
    return null;
  }
}

export function hapusSesi() {
  localStorage.removeItem(KUNCI_TOKEN);
  localStorage.removeItem(KUNCI_USER);
  // Kalau kukinya tertinggal, middleware masih mengira ada yang masuk dan meloloskan
  // rute dasbor — lalu halamannya memuat dengan seluruh datanya ditolak API. Yang dilihat
  // orang bukan "silakan masuk", melainkan dasbor yang rusak.
  hapusKukiPeran();
}

/** Halaman awal tiap peran setelah berhasil masuk. */
export function berandaPeran(peran: AuthUser["role"]): string {
  if (peran === "TENANT") return "/tenant";
  if (peran === "OPERATOR") return "/operator";
  return "/buyer/region";
}

/**
 * Keluar sungguhan, satu pintu untuk ketiga peran.
 *
 * Sebelumnya tiap cangkang menafsirkan "keluar" sendiri: Tenant menghapus sesi, Pembeli
 * dan Operator hanya berpindah halaman. Tokennya tetap di `localStorage` dan tetap
 * dikirim di header `Authorization` — pada ponsel yang dipakai bergantian, orang
 * berikutnya melanjutkan sesi orang sebelumnya sambil melihat halaman masuk.
 *
 * Keranjang ikut dibuang karena isinya milik pembeli yang barusan keluar: batch yang
 * dipilih, jumlah box, dan zona tempat ia berbelanja.
 */
export function akhiriSesi() {
  hapusSesi();
  kosongkanKeranjang();
}
