/**
 * @agro-os/shared — Kontrak bersama FE (apps/web) & BE (apps/api). Contract-first (PRD v2.0).
 *
 * Definisikan tipe/enum/schema di sini DULUAN tiap awal fitur, supaya FE bisa kerja pakai mock
 * tanpa nunggu API dan perubahan kontrak langsung ketahuan di kedua sisi via TypeScript.
 *
 * SEED awal — dilengkapi per sprint. Selaras ERD: docs/diagrams/05-erd.md.
 */

/** Rupiah selalu integer (hindari bug pembulatan float). */
export type Rupiah = number;

/** Titik koordinat (PostGIS geometry di DB). */
export interface GpsCoordinate {
  lat: number;
  lng: number;
}

/** Peran pengguna (USERS.role). */
export enum UserRole {
  TENANT = "TENANT",
  BUYER = "BUYER",
  OPERATOR = "OPERATOR",
}

/** Kelas mutu produk (FR-5.1). */
export enum Grade {
  A = "A",
  B = "B",
  C = "C",
}

/** Status produksi batch (BATCHES.production_status). */
export enum ProductionStatus {
  PLANNING = "PLANNING",
  GROWING = "GROWING",
  HARVESTED = "HARVESTED",
  FAILED = "FAILED",
}

/** Status verifikasi batch (BATCHES.verification_status) — dari satellite-worker (FR-4.5). */
export enum VerificationStatus {
  TERVERIFIKASI = "TERVERIFIKASI",
  FOTO_SAJA = "FOTO_SAJA",
  PERLU_DITINJAU = "PERLU_DITINJAU",
  TIDAK_DAPAT = "TIDAK_DAPAT",
  TIDAK_SESUAI = "TIDAK_SESUAI",
}

/** Badge verifikasi yang tampil ke pembeli (FR-2.6). */
export enum VerificationBadge {
  TERVERIFIKASI_SATELIT = "TERVERIFIKASI_SATELIT",
  BUKTI_FOTO_SAJA = "BUKTI_FOTO_SAJA",
  BELUM_TERVERIFIKASI = "BELUM_TERVERIFIKASI",
}

/** Jenis kegiatan node timeline — 7 jenis terstruktur, bukan teks bebas (5.4.1). */
export enum TimelineActivity {
  PENYIAPAN_LAHAN = "PENYIAPAN_LAHAN",
  PENANAMAN = "PENANAMAN",
  PEMUPUKAN = "PEMUPUKAN",
  PENGENDALIAN_HAMA = "PENGENDALIAN_HAMA",
  PENGAIRAN = "PENGAIRAN",
  PANEN = "PANEN",
  /** Deklarasi gagal panen total maupun sebagian (FR-4.9). */
  GAGAL_PANEN = "GAGAL_PANEN",
}

/** Status pengiriman/pesanan (SHIPMENTS.status, 6 tahap + batal — 5.6.1). */
export enum ShipmentStatus {
  MENUNGGU_PANEN = "MENUNGGU_PANEN",
  PANEN = "PANEN",
  DIKIRIM = "DIKIRIM",
  TIBA_DI_LOKASI = "TIBA_DI_LOKASI",
  DITERIMA = "DITERIMA",
  SELESAI = "SELESAI",
  DIBATALKAN = "DIBATALKAN",
}

/** Jenis entri ledger escrow — append-only (ESCROW_LEDGER.entry_type, FR-7.*). */
export enum EscrowEntryType {
  HOLD = "HOLD",
  RELEASE30 = "RELEASE30",
  POTONG_KLAIM = "POTONG_KLAIM",
  RELEASE = "RELEASE",
  REFUND = "REFUND",
  BIAYA_BATAL10 = "BIAYA_BATAL10",
}

/** Opsi Harvest Assurance saat gagal panen / shortfall (FR-7.4, FR-7.10). */
export enum AssuranceOption {
  SUBSTITUSI = "SUBSTITUSI",
  JADWAL_ULANG = "JADWAL_ULANG",
  REFUND = "REFUND",
  /** Pembeli di perbatasan alokasi memilih terima porsi tersedia + refund sisa (FR-7.10). */
  TERIMA_SEBAGIAN = "TERIMA_SEBAGIAN",
}

export const APP_NAME = "AgroUs" as const;

/** Konstanta operasional (PRD). */
export const GEOFENCE_RADIUS_M = 100; // 5.6.3
export const CLAIM_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 jam (FR-5.3)
export const CLAIM_WINDOW_FALLBACK_MS = 24 * 60 * 60 * 1000; // 24 jam (5.6.4 fallback)
export const POD_TIMEOUT_MS = 60 * 60 * 1000; // 60 menit sebelum "Diterima Otomatis"
export const POSITION_PING_INTERVAL_MS = 10 * 1000; // 10 detik (§6.4)
export const MIN_LAND_PLOT_HA = 0.1; // FR-1.6

/** Kode Antar Kurir — PIN 4 digit sekali pakai per pengiriman (FR-6.1, FR-6.3). */
export const COURIER_PIN_LENGTH = 4;
export const COURIER_PIN_MAX_ATTEMPTS = 5; // lewat ini token terkunci

/** Notifikasi kedatangan bertahap (FR-10.2). Jendela 60 menit mulai di tahap 100 m. */
export const PRENOTIFY_RADIUS_M = 1000;

/**
 * Panen sebagian / shortfall (§5.7.2).
 * Alokasi FIFO memakai PAYMENTS.paid_at — bukan waktu order dibuat (FR-7.9).
 */
/** Cap tanggungan Tenant atas selisih harga substitusi. Gugur bila gagal panen tak terverifikasi (FR-7.11). */
export const SUBSTITUTION_PRICE_GAP_CAP_PCT = 10;
/** Ambang shortfall terverifikasi pemicu penalti kuota, rolling 2 siklus (FR-7.12). */
export const SHORTFALL_PENALTY_THRESHOLD_PCT = 15;
export const SHORTFALL_PENALTY_ROLLING_CYCLES = 2;
/** quota_multiplier: normal → penalti. Pulih setelah 2 siklus bersih (FR-7.12). */
export const QUOTA_MULTIPLIER_NORMAL = 0.7;
export const QUOTA_MULTIPLIER_PENALTY = 0.5;

/** Masa tenggang langganan sebelum fitur dikunci (FR-9.4). */
export const SUBSCRIPTION_GRACE_DAYS = 14;
