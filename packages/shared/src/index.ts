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

// ============================== KONTRAK KATALOG & KUOTA PO ==============================
// Tenant: /commodities · /tenant/products · /tenant/batches
// Pembeli: /catalog (lintas-Tenant, FR-2.2)

export const CommodityCategory = {
  DAUN: "DAUN",
  BUAH_UMBI: "BUAH_UMBI",
  KERING: "KERING",
} as const;
export type CommodityCategory = (typeof CommodityCategory)[keyof typeof CommodityCategory];

export interface CommoditySummary {
  id: string;
  name: string;
  category: CommodityCategory;
  /** Toleransi susut yang berlaku saat klaim mutu (FR-5.2). */
  shrinkTolerancePct: number;
  /** Rendemen rata-rata kg/ha — basis pembatas kuota (FR-3.3). */
  avgYieldKgPerHa: number;
  /** Definisi grade A/B/C per komoditas (FR-5.1). */
  gradeStandards: unknown;
}

/** POST /tenant/products — FR-3.2. */
export interface CreateProductBody {
  commodityId: string;
  name: string;
  grade: Grade;
  pricePerBox: Rupiah;
  qtyKgPerBox: number;
  stockBox?: number;
  estHarvestDate: string; // ISO date (YYYY-MM-DD)
  description?: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  grade: Grade;
  pricePerBox: Rupiah;
  qtyKgPerBox: number;
  stockBox: number;
  estHarvestDate: string;
  description: string | null;
  commodity: CommoditySummary;
}

/**
 * GET /tenant/land-plots/:id/capacity?commodityId=&qtyKgPerBox=
 * Dipakai layar Buka Kuota PO (TN-16) untuk menampilkan batas sebelum Tenant mengetik.
 */
export interface LandPlotCapacityResponse {
  landPlotId: string;
  areaHa: number;
  avgYieldKgPerHa: number;
  qtyKgPerBox: number;
  /** Pengali kapasitas: 0,70 normal · 0,50 bila kena penalti shortfall (FR-7.12). */
  quotaMultiplier: number;
  /** floor(areaHa × avgYieldKgPerHa ÷ qtyKgPerBox × quotaMultiplier). */
  maxQuotaBox: number;
  /** false bila lahan sudah dipakai batch aktif — satu lahan satu batch aktif. */
  available: boolean;
  blockingBatchId?: string;
}

/** POST /tenant/products/:id/batches — buka kuota PO (FR-3.3, FR-3.4). */
export interface OpenQuotaBody {
  landPlotId: string;
  quotaBoxTotal: number;
  lockedPrice: Rupiah;
  claimedHarvestDate: string; // ISO date
  claimedPlantDate?: string;
}

export interface BatchResponse {
  id: string;
  productId: string;
  landPlotId: string;
  quotaBoxTotal: number;
  quotaBoxSold: number;
  quotaBoxFulfilled: number | null;
  lockedPrice: Rupiah;
  claimedPlantDate: string | null;
  claimedHarvestDate: string;
  productionStatus: ProductionStatus;
  verificationStatus: VerificationStatus;
  detectedPlantDate: string | null;
  detectedHarvestDate: string | null;
}

/** GET /catalog — katalog terpadu lintas-Tenant (FR-2.1, FR-2.2). */
export interface CatalogQuery {
  /** Wajib: pembeli memilih kota layanan lebih dulu (FR-2.1). */
  zoneId: string;
  commodityId?: string;
  grade?: Grade;
  /** true → hanya batch berbadge Terverifikasi Satelit. */
  verifiedOnly?: boolean;
  search?: string;
}

// ============================== KONTRAK KERANJANG · CHECKOUT · ESCROW ==============================
// Fase 2 (FR-2.3, 2.4, 2.7, 2.8, 7.1). Endpoint: /buyer/profile · /orders/preview · /orders/checkout · /orders

/**
 * Ongkir per Rencana Pengiriman. PLACEHOLDER — PRD §8.2 memakai Rp85.000
 * (konsolidasi dalam kota, rata-rata 18 km). Ganti dengan rate card nyata
 * sebelum produksi; angka ini menentukan apakah unit economics positif.
 */
export const SHIPPING_COST_PER_PLAN: Rupiah = 85_000;

/** Batas waktu bayar sebelum reservasi kuota dilepas (activity D3 → A5). */
export const PAYMENT_EXPIRY_MS = 60 * 60 * 1000; // 1 jam

export const PaymentMethod = { QRIS: "QRIS", VA: "VA", EWALLET: "EWALLET" } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const OrderStatus = { DRAFT: "DRAFT", PAID: "PAID", CLOSED: "CLOSED" } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** POST /buyer/profile — pembeli institusional (BUYERS). */
export interface CreateBuyerProfileBody {
  companyName: string;
  /** Kota layanan aktif (FR-2.1). */
  activeZoneId: string;
}

export interface BuyerProfileResponse {
  id: string;
  companyName: string;
  activeZone: ZoneSummary | null;
}

/** Satu baris keranjang. Keranjang disimpan di sisi klien; server hanya menerima isinya. */
export interface CartLine {
  batchId: string;
  qtyBox: number;
}

/** Detail penerima — snapshot saat checkout (FR-2.7). */
export interface DeliveryDetail {
  recipientName: string;
  phone: string;
  /** Titik peta tujuan. Geofence 100 m dihitung terhadap koordinat ini. */
  point: GpsCoordinate;
  /** Patokan alamat — opsional. */
  landmark?: string;
  /** Jam operasional penerimaan, mis. "08:00-16:00". */
  receivingHours: string;
}

/**
 * Satu Rencana Pengiriman (FR-2.4). Item dikelompokkan per **minggu panen** —
 * batch yang panen di minggu berbeda tidak mungkin dikirim bersamaan.
 */
export interface ShipmentPlan {
  /** Senin dari minggu panen (ISO date) — kunci pengelompokan. */
  harvestWeek: string;
  /** Tanggal panen terakhir dalam grup; pengiriman menunggu item paling lambat. */
  readyDate: string;
  lines: ShipmentPlanLine[];
  subtotal: Rupiah;
  shippingCost: Rupiah;
  /** Nilai minimum zona (Risiko 3) — dicek PER RENCANA, bukan per order. */
  minOrderValue: Rupiah;
  meetsMinimum: boolean;
  /** Kekurangan agar memenuhi minimum; 0 bila sudah terpenuhi. */
  shortfallToMinimum: Rupiah;
}

export interface ShipmentPlanLine {
  batchId: string;
  productName: string;
  tenantName: string;
  grade: Grade;
  qtyBox: number;
  unitPriceLocked: Rupiah;
  subtotal: Rupiah;
  qtyKgPerBox: number;
  claimedHarvestDate: string;
}

/** POST /orders/preview — hitung rencana pengiriman TANPA menyimpan (layar BY-05). */
export interface PreviewOrderBody {
  lines: CartLine[];
}

export interface PreviewOrderResponse {
  plans: ShipmentPlan[];
  itemsTotal: Rupiah;
  shippingTotal: Rupiah;
  grandTotal: Rupiah;
  /** true bila SEMUA rencana memenuhi minimum — checkout diblokir bila false (activity D1). */
  canCheckout: boolean;
}

/** POST /orders/checkout — reservasi kuota + terbitkan tagihan. */
export interface CheckoutBody {
  lines: CartLine[];
  delivery: DeliveryDetail;
  paymentMethod: PaymentMethod;
  /** FR-2.10 — Laporan Ketertelusuran dibundel di tagihan yang sama (BY-06a). */
  includeTraceabilityReport?: boolean;
}

export interface CheckoutResponse {
  orderId: string;
  totalAmount: Rupiah;
  payment: PaymentInstruction;
  shipmentIds: string[];
}

export interface PaymentInstruction {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Rupiah;
  invoiceRef: string;
  expiresAt: string; // ISO datetime
  /** Payload yang ditampilkan ke pembeli: string QRIS, nomor VA, atau URL redirect e-wallet. */
  payload: string;
}

export interface OrderSummary {
  id: string;
  orderStatus: OrderStatus;
  totalAmount: Rupiah;
  createdAt: string;
  payment: { status: PaymentStatus; method: PaymentMethod; expiresAt: string } | null;
  shipments: Array<{
    id: string;
    status: ShipmentStatus;
    readyDate: string;
    itemCount: number;
  }>;
}

// ============================== KONTRAK LOGISTIK ZERO-INSTALL (Fase 4) ==============================
// FR-3.6, FR-6.1..6.4, §5.6. Kurir: nol instalasi, nol akun — hanya scan QR + 4 digit.

/** Frekuensi kirim posisi. 10 detik, bukan real-time penuh — hemat baterai & kuota (§6.4). */
export const POSITION_INTERVAL_MS = POSITION_PING_INTERVAL_MS;

/** Ambang kewajaran anti-spoof (§6.3 Batasan 4). Di atas ini posisi ditandai tidak wajar. */
export const MAX_PLAUSIBLE_SPEED_KMH = 150;
export const MAX_PLAUSIBLE_JUMP_M = 5_000;

/** Sesi dianggap kehilangan sinyal bila tak ada posisi selama ini (§6.3 Batasan 3). */
export const SIGNAL_LOST_AFTER_MS = 3 * 60 * 1000;

/** POST /tenant/shipments/:id/qr — FR-3.6, hanya setelah batch berstatus Panen. */
export interface GenerateQrResponse {
  shipmentId: string;
  /** Kode Antar 4 digit — DITAMPILKAN SEKALI di sini dan di detail pesanan Tenant (FR-6.1). */
  courierCode: string;
  boxes: BoxQrItem[];
}

export interface BoxQrItem {
  tokenId: string;
  /** Ditempel pada box fisik. Kurir memindainya dengan kamera bawaan. */
  scanUrl: string;
  /** Data URL PNG QR — siap dicetak tanpa perlu library di FE. */
  qrDataUrl: string;
  consumedAt: string | null;
}

/** GET /scan/:token — halaman pertama kurir. TIDAK mengonsumsi token (FR-6.2). */
export interface ScanTokenResponse {
  valid: boolean;
  /** Alasan bila tidak valid: sudah terpakai, tidak dikenal, atau terkunci. */
  code?: "TOKEN_UNKNOWN" | "TOKEN_CONSUMED" | "TOKEN_LOCKED";
  message?: string;
  /** Hanya bila valid — ditampilkan agar kurir yakin box-nya benar. */
  tenantName?: string;
  destinationLabel?: string;
  remainingAttempts?: number;
}

/** POST /scan/:token/verify — token baru terpakai SETELAH kode benar (FR-6.2). */
export interface VerifyCourierCodeBody {
  code: string;
}
export interface VerifyCourierCodeResponse {
  sessionId: string;
  shipmentId: string;
  destination: GpsCoordinate;
  /** Radius geofence tujuan, meter (§5.6.3). */
  destRadiusM: number;
  positionIntervalMs: number;
}

/** POST /scan/session/:sessionId/position */
export interface ReportPositionBody {
  lat: number;
  lng: number;
  /** Stempel waktu perangkat (ISO). Dipakai menghitung kewajaran kecepatan. */
  deviceTs: string;
}
export interface ReportPositionResponse {
  accepted: boolean;
  /** false bila kecepatan/lompatan tidak wajar — tetap disimpan, tapi ditandai. */
  plausible: boolean;
  distanceToDestM: number;
  /** true saat geofence terpicu; sesi tetap berjalan sampai pembeli konfirmasi. */
  arrived: boolean;
}

/** Yang dilihat pembeli di peta (BY-10a). Dipancarkan juga lewat WebSocket. */
export interface TrackingSnapshot {
  shipmentId: string;
  status: ShipmentStatus;
  /** null bila kurir menolak izin lokasi (§6.3) — jalur konfirmasi manual tetap jalan. */
  position: GpsCoordinate | null;
  /** Stempel waktu JUJUR posisi terakhir, walau sudah lama (§6.3 Batasan 3). */
  positionAt: string | null;
  signalLost: boolean;
  distanceToDestM: number | null;
  arrivedAt: string | null;
  noGpsMode: boolean;
}

/** POST /shipments/:id/receive — Sinyal-2 Dual-Signal PoD (§5.6.4). */
export interface ConfirmReceiptBody {
  /** URL foto kondisi barang. Wajib — inilah yang membuktikan diterima dalam keadaan apa. */
  photoUrl: string;
}
export interface ConfirmReceiptResponse {
  shipmentId: string;
  status: ShipmentStatus;
  receivedMode: "BUYER_CONFIRM" | "AUTO_60MIN";
  /** Jendela klaim mutu berakhir kapan (FR-5.3). */
  claimWindowEndsAt: string;
}

/** Nama event WebSocket — dipakai FE & BE, jangan ditulis ulang sebagai string lepas. */
export const WS_EVENTS = {
  SUBSCRIBE: "shipment:subscribe",
  POSITION: "shipment:position",
  STATUS: "shipment:status",
} as const;

// ============================== KONTRAK MUTU, SUSUT & KLAIM (§5.5) ==============================

/** Ambang klaim yang diselesaikan otomatis tanpa peninjauan operator (FR-5.5/5.6). */
export const CLAIM_AUTO_SETTLE_MAX_PCT = 10;

/** SLA peninjauan operator untuk klaim di atas ambang (FR-5.6). */
export const CLAIM_REVIEW_SLA_HOURS = 24;

export const ClaimRoute = {
  /** Selisih masih dalam toleransi susut — ditolak otomatis (FR-5.2). */
  TOLAK_TOLERANSI: "TOLAK_TOLERANSI",
  /** ≤10% nilai order — potong escrow otomatis (FR-5.5). */
  AUTO_SETTLE: "AUTO_SETTLE",
  /** >10% — antrean operator, SLA 1 hari kerja (FR-5.6). */
  OPERATOR: "OPERATOR",
} as const;
export type ClaimRoute = (typeof ClaimRoute)[keyof typeof ClaimRoute];

export const ClaimFinalStatus = {
  DITOLAK_TOLERANSI: "DITOLAK_TOLERANSI",
  DISETUJUI_OTOMATIS: "DISETUJUI_OTOMATIS",
  MENUNGGU_OPERATOR: "MENUNGGU_OPERATOR",
  DISETUJUI_OPERATOR: "DISETUJUI_OPERATOR",
  DITOLAK_OPERATOR: "DITOLAK_OPERATOR",
} as const;
export type ClaimFinalStatus = (typeof ClaimFinalStatus)[keyof typeof ClaimFinalStatus];

/** POST /shipments/:id/claims — FR-5.4: wajib foto + berat hasil timbang. */
export interface FileClaimBody {
  /** Klaim menunjuk SATU item — tiap komoditas punya toleransi susut berbeda. */
  orderItemId: string;
  /** Berat aktual hasil timbang, kg. */
  actualWeightKg: number;
  photoUrl: string;
  description: string;
}

export interface ClaimResponse {
  id: string;
  shipmentId: string;
  orderItemId: string;
  productName: string;
  /** Berat yang seharusnya diterima: jumlah box × kg per box. */
  expectedKg: number;
  actualWeightKg: number;
  /** Selisih kotor sebelum dipotong toleransi. */
  shortfallKg: number;
  /** Toleransi susut komoditas ini (5% daun, 3% buah-umbi — FR-5.2). */
  shrinkTolerancePct: number;
  toleratedKg: number;
  /** Kekurangan yang benar-benar bisa diklaim = shortfall − toleransi. */
  claimableKg: number;
  claimValue: Rupiah;
  pctOfOrder: number;
  route: ClaimRoute;
  finalStatus: ClaimFinalStatus;
  settledValue: Rupiah;
  slaDueAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** POST /operator/claims/:id/decide — FR-5.6. */
export interface DecideClaimBody {
  /** Nilai yang disetujui. 0 = klaim ditolak. Tidak boleh melebihi nilai klaim. */
  approvedValue: Rupiah;
  note: string;
}

export interface CatalogItem {
  batchId: string;
  productId: string;
  productName: string;
  grade: Grade;
  /** Harga terkunci batch — inilah yang dibayar pembeli, bukan harga katalog produk. */
  lockedPrice: Rupiah;
  qtyKgPerBox: number;
  quotaBoxAvailable: number;
  claimedHarvestDate: string;
  commodity: { id: string; name: string; category: CommodityCategory };
  tenant: { id: string; companyName: string; logoUrl: string | null };
  /** FR-2.6 — tiga status badge. */
  badge: VerificationBadge;
  /**
   * Status mentah dari pipeline satelit. Sengaja diekspos supaya FE bisa menampilkan
   * ketidaksesuaian secara terbuka (FR-4.6), bukan menyembunyikannya di balik badge.
   */
  verificationStatus: VerificationStatus;
}
