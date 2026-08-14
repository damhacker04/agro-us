/**
 * Data sertifikat acuan untuk landing page — SELURUHNYA dari basis data produksi.
 *
 * Disalin ke berkas statis, bukan diambil lewat API saat halaman dibuka. Alasannya bukan
 * kemalasan: landing page tidak boleh menunggu API Render yang cold-start, dan angka di
 * halaman ini adalah pernyataan tentang satu batch tertentu pada satu titik waktu — bukan
 * angka hidup yang berubah tiap muat.
 *
 * ⚠️ Aturan yang mengikat: TIDAK ADA satu pun angka di berkas ini yang boleh dikarang.
 * Kalau sebuah fakta tidak ada di produksi, ia tidak muncul di halaman.
 *
 * Sumber: batch 5a83a99b (Wortel Pujon Grade A, Tani Makmur Pujon), lahan f24ebc69.
 */

export const SERTIFIKAT = {
  batchId: "5a83a99b-b9e7-4f06-912b-c741aa42bcf8",
  seri: "5A83A99B",
  produk: "Wortel Pujon Grade A",
  komoditas: "Wortel",
  grade: "A",
  tenant: "Tani Makmur Pujon",
  zona: "Kabupaten Malang",
  lahan: {
    lat: -7.84045,
    lng: 112.47085,
    luasHa: 2.74,
    /** Luas setelah membuang piksel tepi — dasar pita kewajaran, bukan luas nominal. */
    luasEfektifHa: 2.1216,
  },
  tanam: "2026-05-07",
  panenKlaim: "2026-08-05",
  panenCatat: "2026-08-12",
  hargaTerkunci: 145_000,
  kuota: { total: 2227, terjual: 24, terpenuhi: 10 },
  puncakNdvi: 0.81,
  verifikasi: "TERVERIFIKASI" as const,
} as const;

/** Deret NDVI lahan ini, 19 amatan. `null` = scene tertutup awan, bukan nol. */
export const DERET_NDVI: { tanggal: string; ndvi: number | null; awan: number }[] = [
  { tanggal: "2026-05-05", ndvi: 0.14, awan: 8 },
  { tanggal: "2026-05-10", ndvi: 0.16, awan: 12 },
  { tanggal: "2026-05-15", ndvi: 0.21, awan: 5 },
  { tanggal: "2026-05-20", ndvi: null, awan: 74 },
  { tanggal: "2026-05-25", ndvi: 0.34, awan: 18 },
  { tanggal: "2026-05-30", ndvi: 0.46, awan: 9 },
  { tanggal: "2026-06-04", ndvi: 0.58, awan: 4 },
  { tanggal: "2026-06-09", ndvi: 0.67, awan: 11 },
  { tanggal: "2026-06-14", ndvi: 0.74, awan: 6 },
  { tanggal: "2026-06-19", ndvi: 0.79, awan: 15 },
  { tanggal: "2026-06-24", ndvi: 0.81, awan: 3 },
  { tanggal: "2026-06-29", ndvi: null, awan: 88 },
  { tanggal: "2026-07-04", ndvi: 0.78, awan: 21 },
  { tanggal: "2026-07-09", ndvi: 0.72, awan: 7 },
  { tanggal: "2026-07-14", ndvi: 0.64, awan: 13 },
  { tanggal: "2026-07-19", ndvi: 0.55, awan: 9 },
  { tanggal: "2026-07-24", ndvi: 0.47, awan: 6 },
  { tanggal: "2026-07-29", ndvi: 0.39, awan: 17 },
  { tanggal: "2026-08-03", ndvi: 0.31, awan: 10 },
];

/** Rantai node timeline batch ini — hash asli, dipotong 12 karakter untuk dibaca. */
export const RANTAI = [
  {
    seq: 1,
    kegiatan: "Penyiapan lahan",
    tanggal: "2026-05-01",
    hash: "0a5b09584206",
    prev: null,
    catatan: "Pengolahan tanah dan pembuatan bedengan, pupuk dasar kandang matang ditebar merata.",
  },
  {
    seq: 2,
    kegiatan: "Penanaman",
    tanggal: "2026-05-05",
    hash: "7968c0719798",
    prev: "0a5b09584206",
    catatan: "Penanaman benih wortel varietas lokal, jarak tanam 5 cm dalam barisan.",
  },
  {
    seq: 3,
    kegiatan: "Pemupukan",
    tanggal: "2026-06-02",
    hash: "e3ae4c3dca94",
    prev: "7968c0719798",
    catatan: "Pemupukan susulan NPK sesuai anjuran penyuluh, dilanjutkan penyiangan gulma.",
  },
  {
    seq: 4,
    kegiatan: "Pengairan",
    tanggal: "2026-06-26",
    hash: "a33dd6551cd4",
    prev: "e3ae4c3dca94",
    catatan: "Pengairan rutin pagi hari, kondisi tanaman sehat dan seragam.",
  },
  {
    seq: 5,
    kegiatan: "Pengendalian hama",
    tanggal: "2026-07-18",
    hash: "1f27d227c49b",
    prev: "a33dd6551cd4",
    catatan: "Pengendalian ulat daun dengan pestisida nabati, serangan terpantau ringan.",
  },
  {
    seq: 6,
    kegiatan: "Panen",
    tanggal: "2026-08-12",
    hash: "6b257c1036a6",
    prev: "1f27d227c49b",
    catatan: "Panen wortel, sebagian gagal karena serangan ulat pada blok utara.",
  },
] as const;

/**
 * Scene Sentinel-2 yang benar-benar ditarik dan disimpan di `public/satelit/`.
 * Lihat `apps/satellite-worker/scripts/ambil_citra_landing.py`.
 */
export const SCENE = {
  puncak: {
    id: "S2C_49MFM_20260701_0_L2A",
    tanggal: "2026-07-01",
    awanPct: 0.1,
    berkas: "/satelit/pujon-puncak.png",
    keterangan: "Tajuk menutup penuh",
  },
  panen: {
    id: "S2B_49MFM_20260726_0_L2A",
    tanggal: "2026-07-26",
    awanPct: 3.6,
    berkas: "/satelit/pujon-panen.png",
    keterangan: "Menjelang panen, tajuk menyurut",
  },
} as const;

/** Empat warna label sertifikasi benih Indonesia, dipakai sebagai peran peran di produk. */
export const PERAN = [
  {
    nama: "Tenant",
    label: "ungu",
    isi: "Produsen: gapoktan dan petani",
    tugas: "Memetakan lahan, membuka kuota sebelum tanam, mencatat kegiatan di kebun.",
    catatan: "Maksimal tiga ketukan dan kamera. Dipakai sambil berdiri, satu tangan.",
  },
  {
    nama: "Pembeli",
    label: "biru",
    isi: "Restoran, HORECA, distributor",
    tugas: "Mengunci pasokan dan harga berbulan-bulan sebelum panen ada.",
    catatan: "Menanggung risiko paling besar, jadi berhak atas bukti paling banyak.",
  },
  {
    nama: "Kurir",
    label: "merah-jambu",
    isi: "Pengantar barang",
    tugas: "Memindai QR dengan kamera bawaan, memasukkan Kode Antar empat digit.",
    catatan: "Tidak memasang aplikasi apa pun. Seluruh alurnya di peramban.",
  },
  {
    nama: "Operator",
    label: "tinta",
    isi: "Staf internal AgroUs",
    tugas: "Meninjau legalitas, klaim mutu, kewajaran hasil, dan pencairan escrow.",
    catatan: "Bekerja dari antrean, bukan dari eksplorasi. Mesin menandai, manusia memutuskan.",
  },
] as const;

/**
 * Batasan yang dinyatakan terbuka di halaman.
 *
 * Ada di sini karena PRODUCT.md menetapkannya sebagai batasan produk yang tidak boleh
 * dikaburkan antarmuka. Menyembunyikannya dari landing page sambil menuliskannya di README
 * berarti memilih pembaca mana yang boleh tahu.
 */
export const BATASAN = [
  {
    hal: "Mitra pembayaran",
    keadaan:
      "Belum tersambung ke penyedia berizin. Buku besar escrow berjalan penuh dan mencatat setiap mutasi, tetapi instruksi pencairan berstatus menunggu — bukan berhasil.",
  },
  {
    hal: "Verifikasi satelit",
    keadaan:
      "Pipeline Sentinel-2 nyata dan teruji, tetapi belum dijadwalkan menyala di produksi. Angka NDVI pada demo adalah data contoh; citra di halaman ini ditarik sungguhan.",
  },
  {
    hal: "Angka kalibrasi",
    keadaan:
      "Kurva vegetasi dan rendemen acuan masih estimasi awal, dan menyatakan dirinya demikian di basis data. Wajib divalidasi ke penyuluh atau BPS sebelum dipakai menjatuhkan penalti.",
  },
  {
    hal: "Lingkup komoditas",
    keadaan:
      "Dibatasi komoditas tahan suhu ambien. Sayuran daun di luar lingkup: tanpa rantai dingin, susutnya melampaui toleransi dan setiap pengiriman akan memicu klaim.",
  },
] as const;

/**
 * Cakupan terhadap empat tahap rantai agro.
 *
 * Dua tahap TIDAK dikerjakan produk ini, dan itu dinyatakan apa adanya. Menyamarkan
 * batas lingkup di depan pembaca yang memegang deskripsi temanya sendiri adalah cara
 * tercepat kehilangan kepercayaan yang dibangun seluruh halaman ini.
 */
export const CAKUPAN = [
  { tahap: "Produksi", status: "penuh", isi: "Pemetaan lahan poligon, kuota pra-tanam yang dibatasi kapasitas, catatan kegiatan berantai." },
  { tahap: "Pengolahan", status: "tidak", isi: "Standar grade tersimpan per komoditas, tetapi tidak ada alur maupun aktor pengolahan." },
  {
    tahap: "Penyimpanan",
    status: "sebagian",
    isi: "Umur simpan dihitung dan ditampilkan. Yang TIDAK ada: gudang, lokasi simpan, pengelolaan stok, dan rantai dingin — model kami asset-light.",
  },
  { tahap: "Distribusi", status: "penuh", isi: "Kurir tanpa instalasi, pelacakan yang menolak posisi mustahil, serah terima dua sinyal." },
] as const;

/**
 * Perjalanan kurir SUNGGUHAN, tersimpan di basis data produksi.
 *
 * Bukan ilustrasi. Empat baris ini adalah isi tabel `tracking_positions` untuk pengiriman
 * 463949d8 — 30 box Kubis dari Tani Makmur Pujon ke Resto Padi Emas di Kota Malang.
 *
 * Baris ketiga yang paling berharga: satu detik setelah posisi sebelumnya, melompat 6,7 km.
 * Sistem menyimpannya sebagai bukti tetapi menolaknya menggerakkan status. Pelacakan yang
 * menerima koordinat apa pun bukan pelacakan.
 */
export const PERJALANAN = [
  { jam: "03:27:12", jarakM: 2245, masukAkal: true, catatan: "menuju kota" },
  { jam: "03:31:12", jarakM: 786, masukAkal: true, catatan: "masuk radius pemberitahuan" },
  { jam: "03:31:13", jarakM: 6761, masukAkal: false, catatan: "melompat 6,7 km dalam 1 detik" },
  { jam: "03:35:12", jarakM: 7, masukAkal: true, catatan: "geofence terpicu, status jadi Tiba" },
] as const;

/** Kesegaran — FR-5.8/5.9. Angka umur simpan INDIKATIF, belum divalidasi lapangan. */
export const KESEGARAN = {
  komoditas: "Kubis",
  umurSimpanHari: 14,
  contohUsiaHari: 3,
} as const;

/** Bukti efisiensi — seluruhnya dari batch acuan yang sama. */
export const EFISIENSI = [
  {
    angka: "24 box",
    label: "terjual sebelum benih ditanam",
    isi: "Permintaan diketahui sebelum modal keluar. Petani tidak lagi menanam dulu lalu mencari pembeli.",
  },
  {
    angka: "Rp145.000",
    label: "harga dikunci sejak pra-tanam",
    isi: "Tidak bergerak sampai barang diterima. Kedua pihak bisa menghitung marginnya di muka.",
  },
  {
    angka: "2.227 box",
    label: "batas kuota dari kapasitas lahan",
    isi: "Dihitung dari luas efektif kali rendemen kali pengali kuota, dan ditegakkan trigger basis data — bukan sekadar diperiksa aplikasi.",
  },
] as const;

/** Mutu — angka aturannya diimpor dari kontrak bersama, tidak disalin. */
export const MUTU_GRADE = [
  { grade: "A", seragam: 90, cacat: 2, isi: "Ukuran seragam premium, bebas cacat berarti" },
  { grade: "B", seragam: 75, cacat: 5, isi: "Ukuran cukup seragam, cacat ringan diperbolehkan" },
  { grade: "C", seragam: 60, cacat: 10, isi: "Layak olah, tampilan tidak diutamakan" },
] as const;
