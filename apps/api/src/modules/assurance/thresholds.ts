/**
 * ============ AMBANG PENILAIAN — TIDAK BOLEH KELUAR DARI SERVER (FR-7.12c) ============
 *
 * Berkas ini sengaja BUKAN bagian dari `@agro-os/shared`. Apa pun yang ada di kontrak
 * bersama ikut ter-bundel ke peramban Tenant, dan ambang yang diketahui pihak yang
 * melaporkan angkanya sendiri berhenti menjadi pagar: ia berubah menjadi target. Cukup
 * melaporkan tepat di sisi aman setiap siklus, selamanya.
 *
 * Aturan yang berlaku untuk seluruh isi berkas ini:
 *   - tidak pernah dikirim dalam respons API,
 *   - tidak pernah muncul dalam pesan galat yang dibaca Tenant,
 *   - tidak pernah disimpan sebagai kolom basis data (ERD v2.3: tidak ada kolom `threshold`).
 *
 * Semuanya dapat ditimpa lewat variabel lingkungan supaya kalibrasi tidak menuntut rilis
 * ulang — dan supaya angka pastinya tidak tersimpan di repositori publik.
 */

/**
 * Setengah lebar pita kewajaran, relatif terhadap titik tengah dugaan (§6.2 poin 6).
 *
 * Sengaja LEBAR. Tujuannya menandai laporan yang tidak masuk akal, bukan mengaudit
 * selisih kecil — rendemen acuannya sendiri masih estimasi yang belum divalidasi
 * lapangan, dan pita sempit di atas angka yang belum terkalibrasi hanya memindahkan
 * ketidakpastian kita menjadi tuduhan kepada Tenant.
 */
export const LEBAR_PITA = Number(process.env["YIELD_BAND_SPREAD"] ?? 0.4);

/**
 * Seberapa jauh DI BAWAH batas bawah pita sebelum laporan disebut tidak masuk akal.
 * Di antara batas bawah dan angka ini: `PERLU_DITINJAU` — manusia yang memutuskan.
 */
export const BATAS_TIDAK_WAJAR = Number(process.env["YIELD_IMPLAUSIBLE_RATIO"] ?? 0.65);

/**
 * Deviasi terhadap rata-rata zona, dalam simpangan baku, yang dianggap menyimpang.
 *
 * Diukur sebagai z-score, BUKAN selisih persen — dan itu inti keadilan mekanisme ini.
 * Ketika seluruh zona gagal karena musim buruk, rata-ratanya ikut turun, deviasinya
 * mengecil, dan tidak ada yang dihukum. Ambang tetap tidak bisa membedakan itu.
 */
export const DEVIASI_ZONA_SIGMA = Number(process.env["ZONE_DEVIATION_SIGMA"] ?? 1.5);

/**
 * Berapa siklus menyimpang dalam jendela rolling sebelum penalti dijatuhkan (node `PNB`).
 *
 * Activity diagram menuliskannya "deviasi signifikan DAN BERULANG". Satu siklus buruk
 * adalah pertanian; dua siklus menyimpang sendirian di tengah zona yang baik-baik saja
 * adalah pola. Yang dihukum adalah pola (Risiko 1b).
 */
export const MIN_SIKLUS_MENYIMPANG = Number(process.env["ZONE_DEVIATION_MIN_CYCLES"] ?? 2);

/** Tenggat tinjauan Operator untuk verdict marginal (FR-5.6, OP-13). */
export const SLA_TINJAUAN_JAM = Number(process.env["PLAUSIBILITY_REVIEW_SLA_HOURS"] ?? 24);
