/**
 * Pemformat Indonesia yang DETERMINISTIK.
 *
 * `toLocaleDateString("id-ID")` dan `toLocaleString("id-ID")` bergantung pada data ICU
 * runtime, dan data itu berbeda antara Node yang merender di server dan peramban yang
 * menghidrasi. Hasilnya hydration mismatch: React membuang markup server dan merender
 * ulang seluruh pohon di klien — yang menghapus keuntungan render server sekaligus
 * memunculkan galat di konsol.
 *
 * Angka dan tanggal di halaman ini adalah isi sertifikat. Ia tidak boleh berubah bentuk
 * tergantung mesin siapa yang membacanya.
 */

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

/**
 * Sepuluh karakter pertama sebuah ISO string adalah tanggalnya, baik ia `2026-08-05`
 * maupun `2026-08-05T04:12:33.000Z`. Dipotong lebih dulu karena `split("-")` pada stempel
 * waktu penuh menghasilkan `05T04:12:33.000Z` — yang jadi `NaN` dan tampil sebagai
 * `undefined` tanpa satu pun galat. Timeline dan pelacakan mengirim stempel penuh.
 */
const bagianTanggal = (iso: string) =>
  iso.slice(0, 10).split("-").map(Number) as [number, number, number];

/** `2026-08-05` → `5 Agustus 2026`. Menerima tanggal ISO maupun stempel waktu penuh. */
export function tanggalPanjang(iso: string): string {
  const [t, b, h] = bagianTanggal(iso);
  return `${h} ${BULAN[b - 1]} ${t}`;
}

/** `2026-08-05` → `5 Agu`. */
export function tanggalPendek(iso: string): string {
  const [, b, h] = bagianTanggal(iso);
  return `${h} ${BULAN_PENDEK[b - 1]}`;
}

/**
 * `2026-08-05T07:12:00Z` → `14.12`. Selalu WIB, dan itu disengaja.
 *
 * Zona waktu dihitung sebagai offset tetap +7 lalu dibaca lewat getter UTC, BUKAN lewat
 * `getHours()` lokal mesin. Bedanya bukan kerapian: `getHours()` menghasilkan jam yang
 * berbeda di server (UTC) dan di peramban pembeli (WIB), dan selisih satu karakter itu
 * membuang seluruh pohon React dengan galat hidrasi — kegagalan yang sama persis dengan
 * yang membuat `toLocaleDateString` dilarang di berkas ini.
 *
 * Titik sebagai pemisah jam mengikuti penulisan waktu Indonesia (14.12, bukan 14:12).
 */
export function jamWib(iso: string): string {
  const wib = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return `${String(wib.getUTCHours()).padStart(2, "0")}.${String(wib.getUTCMinutes()).padStart(2, "0")}`;
}

/** `2227` → `2.227`. Pemisah ribuan Indonesia adalah titik. */
export function angka(n: number): string {
  return String(Math.trunc(Math.abs(n)))
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    .replace(/^/, n < 0 ? "-" : "");
}

/** `145000` → `Rp145.000`. */
export function rupiah(n: number): string {
  return `Rp${angka(n)}`;
}

/** `0.81` → `0,81`. Koma desimal, sesuai penulisan angka Indonesia. */
export function desimal(n: number, digit = 2): string {
  return n.toFixed(digit).replace(".", ",");
}
