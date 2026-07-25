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

/** Jenis kegiatan node timeline — daftar terstruktur, bukan teks bebas (5.4.1). */
export enum TimelineActivity {
  PENYIAPAN_LAHAN = "PENYIAPAN_LAHAN",
  PENANAMAN = "PENANAMAN",
  PEMUPUKAN = "PEMUPUKAN",
  PENGENDALIAN_HAMA = "PENGENDALIAN_HAMA",
  PENGAIRAN = "PENGAIRAN",
  PANEN = "PANEN",
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

/** Opsi Harvest Assurance saat gagal panen (FR-7.4). */
export enum AssuranceOption {
  SUBSTITUSI = "SUBSTITUSI",
  JADWAL_ULANG = "JADWAL_ULANG",
  REFUND = "REFUND",
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
