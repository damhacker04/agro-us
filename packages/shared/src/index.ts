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

// CATATAN GAYA: sengaja `as const` + union type, BUKAN TS `enum`.
// TS enum bertipe nominal → bentrok dengan enum hasil generate Prisma 7 (string union).
// Pola ini tetap bisa dipakai sebagai nilai (UserRole.TENANT) DAN kompatibel struktural.

/** Peran pengguna (USERS.role). */
export const UserRole = {
  TENANT: "TENANT",
  BUYER: "BUYER",
  OPERATOR: "OPERATOR",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Kelas mutu produk (FR-5.1). */
export const Grade = { A: "A", B: "B", C: "C" } as const;
export type Grade = (typeof Grade)[keyof typeof Grade];

/** Status produksi batch (BATCHES.production_status). */
export const ProductionStatus = {
  PLANNING: "PLANNING",
  GROWING: "GROWING",
  HARVESTED: "HARVESTED",
  FAILED: "FAILED",
} as const;
export type ProductionStatus = (typeof ProductionStatus)[keyof typeof ProductionStatus];

/** Status verifikasi batch (BATCHES.verification_status) — dari satellite-worker (FR-4.5). */
export const VerificationStatus = {
  TERVERIFIKASI: "TERVERIFIKASI",
  FOTO_SAJA: "FOTO_SAJA",
  PERLU_DITINJAU: "PERLU_DITINJAU",
  TIDAK_DAPAT: "TIDAK_DAPAT",
  TIDAK_SESUAI: "TIDAK_SESUAI",
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Badge verifikasi yang tampil ke pembeli (FR-2.6). */
export const VerificationBadge = {
  TERVERIFIKASI_SATELIT: "TERVERIFIKASI_SATELIT",
  BUKTI_FOTO_SAJA: "BUKTI_FOTO_SAJA",
  BELUM_TERVERIFIKASI: "BELUM_TERVERIFIKASI",
} as const;
export type VerificationBadge = (typeof VerificationBadge)[keyof typeof VerificationBadge];

/** Jenis kegiatan node timeline — 7 jenis terstruktur, bukan teks bebas (5.4.1 + FR-4.9). */
export const TimelineActivity = {
  PENYIAPAN_LAHAN: "PENYIAPAN_LAHAN",
  PENANAMAN: "PENANAMAN",
  PEMUPUKAN: "PEMUPUKAN",
  PENGENDALIAN_HAMA: "PENGENDALIAN_HAMA",
  PENGAIRAN: "PENGAIRAN",
  PANEN: "PANEN",
  /** Deklarasi gagal panen total maupun sebagian (FR-4.9). */
  GAGAL_PANEN: "GAGAL_PANEN",
} as const;
export type TimelineActivity = (typeof TimelineActivity)[keyof typeof TimelineActivity];

/** Status pengiriman/pesanan (SHIPMENTS.status, 6 tahap + batal — 5.6.1). */
export const ShipmentStatus = {
  MENUNGGU_PANEN: "MENUNGGU_PANEN",
  PANEN: "PANEN",
  DIKIRIM: "DIKIRIM",
  TIBA_DI_LOKASI: "TIBA_DI_LOKASI",
  DITERIMA: "DITERIMA",
  SELESAI: "SELESAI",
  DIBATALKAN: "DIBATALKAN",
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

/** Jenis entri ledger escrow — append-only (ESCROW_LEDGER.entry_type, FR-7.*). */
export const EscrowEntryType = {
  HOLD: "HOLD",
  RELEASE30: "RELEASE30",
  POTONG_KLAIM: "POTONG_KLAIM",
  RELEASE: "RELEASE",
  REFUND: "REFUND",
  BIAYA_BATAL10: "BIAYA_BATAL10",
} as const;
export type EscrowEntryType = (typeof EscrowEntryType)[keyof typeof EscrowEntryType];

/** Opsi Harvest Assurance saat gagal panen / shortfall (FR-7.4, FR-7.10). */
export const AssuranceOption = {
  SUBSTITUSI: "SUBSTITUSI",
  JADWAL_ULANG: "JADWAL_ULANG",
  REFUND: "REFUND",
  /** Pembeli di perbatasan alokasi memilih terima porsi tersedia + refund sisa (FR-7.10). */
  TERIMA_SEBAGIAN: "TERIMA_SEBAGIAN",
} as const;
export type AssuranceOption = (typeof AssuranceOption)[keyof typeof AssuranceOption];

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

// ============================== KONTRAK AUTH (FR-1.3) ==============================
// Dipakai FE (mock/real) & BE. Endpoint: POST /auth/otp/request · POST /auth/otp/verify · GET /auth/me

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // kode kedaluwarsa 5 menit
export const OTP_MAX_ATTEMPTS = 3; // salah 3× → wajib minta kode baru (node T3)
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // ER-19

/** POST /auth/otp/request */
export interface RequestOtpBody {
  /** 08xx / 62xx / +62xx — dinormalisasi server ke +62. */
  phone: string;
}
export interface RequestOtpResponse {
  expiresInSec: number;
  resendAfterSec: number;
  /** HANYA muncul di non-production (SMS provider = console) untuk kebutuhan dev/demo. */
  devOtp?: string;
}

/** POST /auth/otp/verify */
export interface VerifyOtpBody {
  phone: string;
  code: string;
  /** Wajib HANYA saat nomor belum terdaftar (registrasi). Diabaikan saat login. */
  role?: Extract<UserRole, "TENANT" | "BUYER">;
}
export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
}
export interface VerifyOtpResponse {
  accessToken: string; // Bearer JWT, exp 7 hari
  isNewUser: boolean; // true → FE arahkan ke onboarding sesuai role
  user: AuthUser;
}

// ============================== KONTRAK TENANT ONBOARDING (FR-1.4 s.d. 1.7) ==============================
// Endpoint: /tenant/profile · /tenant/zones · /tenant/land-plots · /tenant/legality

/** GeoJSON Polygon (RFC 7946). Koordinat [lng, lat] — URUTAN INI PENTING, bukan [lat, lng]. */
export interface GeoJsonPolygon {
  type: "Polygon";
  /** Ring pertama = batas luar. Titik pertama & terakhir HARUS sama (ring tertutup). */
  coordinates: [number, number][][];
}

export const LegalityStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type LegalityStatus = (typeof LegalityStatus)[keyof typeof LegalityStatus];

/** Cara poligon direkam (LAND_PLOTS.capture_method) — FR-1.5. */
export const CaptureMethod = {
  GAMBAR_PETA: "GAMBAR_PETA",
  WALK_AROUND: "WALK_AROUND",
} as const;
export type CaptureMethod = (typeof CaptureMethod)[keyof typeof CaptureMethod];

/** Tier verifikasi lahan — TERBATAS bila < 0,1 ha (FR-1.6). */
export const VerificationTier = {
  NORMAL: "NORMAL",
  TERBATAS: "TERBATAS",
} as const;
export type VerificationTier = (typeof VerificationTier)[keyof typeof VerificationTier];

/** POST /tenant/profile — FR-1.4 (dipanggil sekali setelah registrasi TENANT). */
export interface CreateTenantProfileBody {
  companyName: string;
  logoUrl?: string;
  /** Zona layanan (minimal 1). Ambil daftarnya dari GET /zones. */
  zoneIds: string[];
}

export interface TenantProfileResponse {
  id: string;
  companyName: string;
  logoUrl: string | null;
  legalityStatus: LegalityStatus;
  /** Rasio publik (FR-5.7 / FR-7.12) — null bila belum ada riwayat. */
  claimRatioCached: number | null;
  shortfallRatioCached: number | null;
  quotaMultiplier: number;
  zones: ZoneSummary[];
  landPlotCount: number;
}

export interface ZoneSummary {
  id: string;
  name: string;
  city: string;
  minOrderValue: Rupiah;
}

/** POST /tenant/land-plots — FR-1.5. Luas TIDAK dikirim klien; dihitung server via PostGIS. */
export interface CreateLandPlotBody {
  polygon: GeoJsonPolygon;
  captureMethod: CaptureMethod;
}

export interface LandPlotResponse {
  id: string;
  polygon: GeoJsonPolygon;
  /** Hasil hitung server: ST_Area(polygon::geography) / 10000. */
  areaHa: number;
  captureMethod: CaptureMethod;
  /** TERBATAS bila areaHa < MIN_LAND_PLOT_HA — batch di lahan ini tak bisa terverifikasi satelit. */
  verificationTier: VerificationTier;
}

/** PUT /tenant/legality — FR-1.7 (ditinjau operator, UC-12). */
export interface SubmitLegalityBody {
  /** URL dokumen NIB atau KTP pemilik pada object storage. */
  documentUrl: string;
}
