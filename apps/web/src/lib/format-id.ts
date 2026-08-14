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

/** `2026-08-05` → `5 Agustus 2026`. Menerima tanggal ISO saja, tanpa zona waktu. */
export function tanggalPanjang(iso: string): string {
  const [t, b, h] = iso.split("-").map(Number) as [number, number, number];
  return `${h} ${BULAN[b - 1]} ${t}`;
}

/** `2026-08-05` → `5 Agu`. */
export function tanggalPendek(iso: string): string {
  const [, b, h] = iso.split("-").map(Number) as [number, number, number];
  return `${h} ${BULAN_PENDEK[b - 1]}`;
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
