import { NextResponse, type NextRequest } from "next/server";

/**
 * Penjaga RUTE di sisi server. Bukan penjaga otorisasi.
 *
 * Berkasnya bernama `proxy.ts`, bukan `middleware.ts`: Next 16 mengganti konvensinya dan
 * nama lama masih jalan tetapi sudah deprecated. Fungsinya HARUS bernama `proxy` agar
 * dikenali, dan ia selalu berjalan di runtime Node.
 *
 * Sebelum berkas ini ada, tidak ada satu pun pemeriksaan rute yang berjalan di server:
 * `/tenant`, `/operator` dan `/buyer` dijaga sepenuhnya oleh layout klien yang membaca
 * `localStorage` di `useEffect`. Akibatnya membuka tautan langsung ke dasbor peran lain
 * tetap memuat cangkangnya dulu — menu, judul, kerangka halaman — dan baru dialihkan
 * sesudah JavaScript-nya jalan. Bagi juri yang mengetik URL, itu terlihat seperti dasbor
 * Operator yang bisa dibuka siapa saja.
 *
 * ═══ BATASNYA, SUPAYA TIDAK ADA YANG SALAH MENGIRA ═══
 *
 * Yang dibaca di sini adalah cookie `agrous.peran` yang berisi NAMA PERAN saja — bukan
 * token, bukan tanda tangan. Cookie itu ditulis oleh JavaScript di peramban, jadi siapa
 * pun bisa mengubahnya sendiri. Middleware ini TIDAK menahan penyerang, dan memang bukan
 * tugasnya: batas otorisasi yang sebenarnya ada di API — `JwtAuthGuard` + `RolesGuard`
 * memeriksa JWT bertanda tangan pada setiap permintaan, dan halaman yang berhasil dimuat
 * tanpa hak tetap kosong karena seluruh datanya ditolak.
 *
 * Middleware ini menyelesaikan masalah yang BERBEDA: tautan langsung yang seharusnya
 * tidak membuka halaman itu sama sekali, dan kekeliruan peran yang terlihat seperti lubang
 * keamanan walaupun bukan. Alasan token tidak dipakai di sini sederhana — token ada di
 * `localStorage` dan middleware tidak bisa membacanya sama sekali; ia hanya melihat
 * cookie dan header. Penjagaan yang benar-benar aman di lapisan ini menuntut sesi
 * berpindah ke cookie httpOnly yang diterbitkan server, dan itu pekerjaan tersendiri yang
 * tidak boleh disamarkan sebagai perbaikan routing.
 */
const KUNCI_PERAN = "agrous.peran";

/** Awalan rute → peran yang boleh membukanya, dan halaman masuknya sendiri. */
const WILAYAH: ReadonlyArray<readonly [string, string, string]> = [
  ["/tenant", "TENANT", "/auth/tenant"],
  ["/operator", "OPERATOR", "/auth/operator/login"],
  ["/buyer", "BUYER", "/auth/buyer"],
];

/** Halaman awal tiap peran — sengaja sama dengan `berandaPeran()` di `lib/auth.ts`. */
function beranda(peran: string): string {
  if (peran === "TENANT") return "/tenant";
  if (peran === "OPERATOR") return "/operator";
  return "/buyer/region";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /**
   * Onboarding dilewati.
   *
   * Di sana perannya SUDAH ada sejak token pertama terbit, tetapi profil usahanya belum —
   * dan justru keadaan profil itulah yang dipakai `rute-masuk.ts` untuk memutuskan tujuan.
   * Mencegat langkah ini berarti memantulkan orang keluar dari pekerjaan yang sedang ia
   * selesaikan.
   */
  if (pathname.includes("/onboarding")) return NextResponse.next();

  const wilayah = WILAYAH.find(([awalan]) => pathname === awalan || pathname.startsWith(`${awalan}/`));
  if (!wilayah) return NextResponse.next();

  const peran = req.cookies.get(KUNCI_PERAN)?.value;

  // Belum masuk: dibawa ke halaman masuk PERAN YANG IA TUJU — bukan ke beranda umum yang
  // memaksanya memilih ulang peran yang sudah jelas dari URL-nya. Tujuan asal dibawa serta
  // supaya setelah masuk ia mendarat di tempat yang ia klik.
  if (!peran) {
    const tujuan = req.nextUrl.clone();
    tujuan.pathname = wilayah[2];
    tujuan.search = `?lanjut=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(tujuan);
  }

  // Peran keliru: dialihkan ke berandanya sendiri, BUKAN diberi 403. Ini bukan penolakan
  // hak — ini orang yang salah pintu, dan pintunya yang benar sudah diketahui.
  if (peran !== wilayah[1]) {
    const tujuan = req.nextUrl.clone();
    tujuan.pathname = beranda(peran);
    tujuan.search = "";
    return NextResponse.redirect(tujuan);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tenant/:path*", "/operator/:path*", "/buyer/:path*"],
};
