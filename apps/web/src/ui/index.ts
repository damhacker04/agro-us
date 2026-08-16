/**
 * Sistem desain AgroUs — dunia Label Sertifikasi untuk halaman kerja.
 *
 * BATAS YANG MENJAGA BERKAS INI TIDAK MEMBUSUK: tidak ada apa pun di `src/ui/` yang boleh
 * tahu soal AgroUs. Tidak memanggil API, tidak menyebut kuota, escrow, batch, atau kewajaran,
 * tidak mengimpor dari `@/lib/api` maupun `@agro-os/shared`. Begitu sebuah komponen di sini
 * tahu domainnya, ia berhenti jadi sistem dan `src/ui/` berubah jadi grab bag kedua di
 * sebelah grab bag pertama. Komponen yang tahu domain tinggal di `src/components/`.
 *
 * Cara memakai: bungkus halaman dengan `<Halaman>` — itu saklar migrasinya, dan
 * menyalakannya berarti menyatakan halaman ini sudah lepas penuh dari dunia lama
 * (emerald/abu-abu, sudut membulat, ikon lucide mentah). Lihat `halaman.tsx`.
 *
 * Hukum yang ditegakkan kit ini, dan alasannya ada di masing-masing berkas:
 *   radius 0 · tanpa bayangan · mono hanya untuk nilai terukur · label 10px tracking-cap ·
 *   setiap tanda menggores 1,6px · warna masuk lewat GARIS, ground penuh hanya untuk region
 *   kecil yang utuh · `stempel` tidak pernah jadi warna galat umum.
 */

export { Halaman } from "./halaman";
export { Cangkang, type ItemMenu } from "./cangkang";
export { JudulHalaman, JudulPanel, Label, Nilai, Prosa, Sunyi } from "./teks";
export { Panel, Deret, Ubin, BarisData } from "./panel";
export { Pil, Tanda } from "./status";
export { Tombol, TautanKembali } from "./kendali";
export { Medan, Masukan, AreaTeks, Pilihan } from "./medan";
export { Galat, Kosong, Memuat } from "./keadaan";
export { Ikon, type UkuranIkon } from "./ikon";
export { NADA, type Nada } from "./nada";
