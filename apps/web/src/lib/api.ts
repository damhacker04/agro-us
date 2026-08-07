/**
 * Penghubung tunggal ke API AgroUs.
 *
 * Seluruh pemanggilan API lewat sini, bukan `fetch()` yang bertebaran di tiap halaman.
 * Dua alasannya: alamat API cukup diubah di satu tempat saat berpindah lingkungan, dan
 * tipe responsnya diambil dari `@agro-os/shared` — kontrak yang sama yang dipakai
 * backend, sehingga ketidakcocokan ketahuan saat kompilasi, bukan saat dibuka pengguna.
 */
import { ambilToken } from "./auth";
import type {
  AuthUser,
  BuyerOrderDetail,
  BuyerProfileResponse,
  CancelOrderResponse,
  CatalogItem,
  ClaimResponse,
  FileClaimBody,
  AnchorAuditItem,
  DecideSatelliteBody,
  LegalityQueueItem,
  OperatorEscrowSummary,
  PendingAssurance,
  SatelliteReviewItem,
  UpsertCommodityBody,
  UpsertZoneBody,
  VerificationStatus,
  ResolveAssuranceBody,
  ResolveAssuranceResponse,
  CheckoutBody,
  CheckoutResponse,
  NdviSeries,
  PreviewOrderResponse,
  OrderSummary,
  PreviewOrderBody,
  BatchResponse,
  CommoditySummary,
  CreateLandPlotBody,
  CreateProductBody,
  CreateTenantProfileBody,
  LandPlotCapacityResponse,
  LandPlotResponse,
  OpenQuotaBody,
  PlantingRecommendation,
  ProductResponse,
  ReportPositionBody,
  RequestOtpResponse,
  Rupiah,
  ScanTokenResponse,
  TrackingSnapshot,
  VerifyCourierCodeResponse,
  BoxQrItem,
  GenerateQrResponse,
  TenantOrderDetail,
  TenantOrderSummary,
  TenantProfileResponse,
  TimelineNodeResponse,
  TimelineVerifyResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
  ZoneSummary,
} from "@agro-os/shared";

/**
 * Alamat API. Nilai `NEXT_PUBLIC_*` di-INLINE saat build, bukan dibaca saat berjalan —
 * jadi kalau variabelnya tidak ada di lingkungan build, seluruh situs akan menembak
 * alamat cadangan ini selamanya.
 *
 * Cadangannya sengaja diarahkan ke API produksi, bukan `localhost:3001`. Kalau lupa
 * menyetel variabelnya di Vercel, situsnya tetap berfungsi; sebaliknya kalau cadangannya
 * localhost, setiap pengunjung akan memanggil komputernya sendiri dan halamannya kosong
 * tanpa petunjuk apa pun.
 *
 * Untuk pengembangan lokal, timpa lewat `apps/web/.env.local`.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://agro-us.onrender.com";

/** Galat API yang membawa kode mesin, supaya UI bisa membedakan penyebabnya. */
export class GalatApi extends Error {
  constructor(
    readonly status: number,
    readonly kode: string | null,
    pesan: string,
  ) {
    super(pesan);
  }
}

async function ambil<T>(jalur: string, init?: RequestInit): Promise<T> {
  const token = ambilToken();
  const res = await fetch(`${BASE}${jalur}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    // Katalog, pesanan, dan timeline berubah sepanjang musim tanam; jangan di-cache.
    cache: "no-store",
  });

  if (!res.ok) {
    // Backend mengirim { code, message } untuk galat yang bisa ditindaklanjuti pengguna
    // (mis. MIN_ORDER_NOT_MET, QUOTA_RACE_LOST). Pesannya sudah berbahasa Indonesia dan
    // siap tampil — jangan diganti kalimat buatan FE yang lebih miskin konteks.
    let kode: string | null = null;
    let pesan = `Terjadi kesalahan (${res.status})`;
    try {
      const isi = await res.json();
      kode = isi?.code ?? null;
      pesan = Array.isArray(isi?.message) ? isi.message.join(", ") : (isi?.message ?? pesan);
    } catch {
      /* respons bukan JSON — pakai pesan baku */
    }
    throw new GalatApi(res.status, kode, pesan);
  }

  // 204/205 tidak berisi badan respons.
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const kirim = <T>(jalur: string, body: unknown, metode = "POST") =>
  ambil<T>(jalur, { method: metode, body: JSON.stringify(body) });

/** Zona layanan (FR-2.1). Hanya Malang Raya — bukan seluruh Indonesia. */
export const ambilZona = () => ambil<ZoneSummary[]>("/zones");

/** Katalog terpadu lintas-Tenant dalam satu zona (FR-2.1, FR-2.2). */
export const ambilKatalog = (zoneId: string) =>
  ambil<CatalogItem[]>(`/catalog?zoneId=${encodeURIComponent(zoneId)}`);

export const ambilProduk = (batchId: string) => ambil<CatalogItem>(`/catalog/${batchId}`);

/** Verified Timeline — publik, tanpa login (§6.1). */
export const ambilTimeline = (batchId: string) =>
  ambil<TimelineNodeResponse[]>(`/batches/${batchId}/timeline`);

/** Hasil hitung ulang rantai hash: bukti data belum pernah diubah. */
export const ambilVerifikasi = (batchId: string) =>
  ambil<TimelineVerifyResponse>(`/batches/${batchId}/timeline/verify`);

export const ambilNdvi = (batchId: string) => ambil<NdviSeries>(`/batches/${batchId}/ndvi`);

// ============================== AUTH (FR-1.3) ==============================

export const mintaOtp = (phone: string) =>
  kirim<RequestOtpResponse>("/auth/otp/request", { phone });

export const verifikasiOtp = (body: VerifyOtpBody) =>
  kirim<VerifyOtpResponse>("/auth/otp/verify", body);

export const ambilSaya = () => ambil<AuthUser>("/auth/me");

// ============================== PEMBELI ==============================

export const pratinjauPesanan = (body: PreviewOrderBody) =>
  kirim<PreviewOrderResponse>("/orders/preview", body);

export const checkout = (body: CheckoutBody) => kirim<CheckoutResponse>("/orders/checkout", body);

export const bayarSimulasi = (invoiceRef: string) =>
  kirim<unknown>("/payments/webhook", { invoiceRef, status: "PAID" });

export const ambilPesanan = () => ambil<OrderSummary[]>("/orders");

export const ambilPesananSatu = (orderId: string) =>
  ambil<BuyerOrderDetail>(`/orders/${orderId}`);

/** FR-7.5 — pembatalan sepihak, hanya selama Menunggu Panen. Ada biaya 10% nilai barang. */
export const batalkanPesanan = (orderId: string) =>
  kirim<CancelOrderResponse>(`/orders/${orderId}/cancel`, {});

// ---------- Harvest Assurance (FR-7.4, FR-7.10) ----------

export const ambilAssuransiTertunda = () => ambil<PendingAssurance[]>("/assurance/pending");

export const putuskanAssuransi = (orderItemId: string, body: ResolveAssuranceBody) =>
  kirim<ResolveAssuranceResponse>(`/assurance/${orderItemId}/resolve`, body);

// ---------- Klaim mutu (FR-5.x) ----------

export const ajukanKlaim = (shipmentId: string, body: FileClaimBody) =>
  kirim<ClaimResponse>(`/shipments/${shipmentId}/claims`, body);

export const ambilKlaim = (shipmentId: string) =>
  ambil<ClaimResponse[]>(`/shipments/${shipmentId}/claims`);

export const ambilProfilPembeli = () => ambil<BuyerProfileResponse>("/buyer/profile");

export const buatProfilPembeli = (body: { companyName: string; activeZoneId?: string }) =>
  kirim<BuyerProfileResponse>("/buyer/profile", body);

export const ubahProfilPembeli = (body: { companyName?: string; activeZoneId?: string }) =>
  kirim<BuyerProfileResponse>("/buyer/profile", body, "PATCH");

// ============================== TENANT ==============================

export const ambilProfilTenant = () => ambil<TenantProfileResponse>("/tenant/profile");

export const ambilBatchTenant = () => ambil<BatchResponse[]>("/tenant/batches");

export const ambilBatchSatu = (id: string) => ambil<BatchResponse>(`/tenant/batches/${id}`);

export const ambilTimelineTenant = (batchId: string) =>
  ambil<TimelineNodeResponse[]>(`/tenant/batches/${batchId}/timeline`);

export const ambilProdukTenant = () => ambil<ProductResponse[]>("/tenant/products");

export const ambilKomoditas = () => ambil<CommoditySummary[]>("/commodities");

export const buatProduk = (body: CreateProductBody) =>
  kirim<ProductResponse>("/tenant/products", body);

export const ubahProduk = (id: string, body: Partial<CreateProductBody>) =>
  kirim<ProductResponse>(`/tenant/products/${id}`, body, "PATCH");

/**
 * Batas kuota yang boleh dibuka di satu lahan (TN-16). Dipanggil SEBELUM Tenant
 * mengetik jumlahnya, supaya batasnya terbaca sebagai informasi, bukan sebagai
 * penolakan setelah formulir dikirim.
 */
export const ambilKapasitasLahan = (landPlotId: string, commodityId: string, qtyKgPerBox: number) =>
  ambil<LandPlotCapacityResponse>(
    `/tenant/land-plots/${landPlotId}/capacity?commodityId=${commodityId}&qtyKgPerBox=${qtyKgPerBox}`,
  );

export const bukaKuota = (productId: string, body: OpenQuotaBody) =>
  kirim<BatchResponse>(`/tenant/products/${productId}/batches`, body);

export const buatLahan = (body: CreateLandPlotBody) =>
  kirim<LandPlotResponse>("/tenant/land-plots", body);

export const buatProfilTenant = (body: CreateTenantProfileBody) =>
  kirim<TenantProfileResponse>("/tenant/profile", body);

export const kirimLegalitas = (documentUrl: string) =>
  kirim<{ legalityStatus: string; message: string }>("/tenant/legality", { documentUrl }, "PUT");

export const ambilLahan = () => ambil<LandPlotResponse[]>("/tenant/land-plots");

export const ambilEscrow = () =>
  ambil<{
    tertahan: Rupiah;
    totalDitahan: Rupiah;
    totalDicairkan: Rupiah;
    totalPotonganKlaim: Rupiah;
    totalRefund: Rupiah;
    rincian: Record<string, number>;
  }>("/tenant/escrow");

export const ambilPesananTenant = () => ambil<TenantOrderSummary[]>("/tenant/orders");

export const ambilPesananTenantSatu = (shipmentId: string) =>
  ambil<TenantOrderDetail>(`/tenant/orders/${shipmentId}`);

/** Terbitkan QR + Kode Antar. Kode antar HANYA dikembalikan di sini — tidak bisa diambil ulang. */
export const terbitkanQr = (shipmentId: string) =>
  kirim<GenerateQrResponse>(`/tenant/shipments/${shipmentId}/qr`, {});

/** Lembar cetak ulang. Sengaja tanpa Kode Antar. */
export const ambilLembarQr = (shipmentId: string) =>
  ambil<{ shipmentId: string; boxes: BoxQrItem[] }>(`/tenant/shipments/${shipmentId}/qr`);

export const terbitkanUlangKodeAntar = (shipmentId: string) =>
  kirim<{ courierCode: string }>(`/tenant/shipments/${shipmentId}/courier-code/reissue`, {});

// ============================== SISI KURIR ==============================
// Tanpa akun dan tanpa token JWT (§5.6.2). Kredensialnya adalah token QR, lalu
// `sessionId` — keduanya acak dan tidak bisa ditebak. `ambil()` tetap dipakai:
// bila kebetulan ada token pembeli/Tenant tersimpan di peramban yang sama, header
// Authorization ikut terkirim tapi diabaikan endpoint ini.

/** Halaman pertama setelah QR dipindai. TIDAK mengonsumsi token. */
export const periksaToken = (token: string) =>
  ambil<ScanTokenResponse>(`/scan/${encodeURIComponent(token)}`);

/** Verifikasi Kode Antar → token terpakai, sesi terbuka, status jadi Dikirim. */
export const verifikasiKodeAntar = (token: string, code: string) =>
  kirim<VerifyCourierCodeResponse>(`/scan/${encodeURIComponent(token)}/verify`, { code });

export const kirimPosisi = (sessionId: string, body: ReportPositionBody) =>
  kirim<{ accepted: boolean; plausible: boolean; distanceToDestM: number; arrived: boolean }>(
    `/scan/session/${sessionId}/position`,
    body,
  );

/** Kurir menolak/tidak punya izin lokasi — jalur konfirmasi manual tetap jalan. */
export const tandaiTanpaGps = (sessionId: string) =>
  kirim<{ noGpsMode: boolean }>(`/scan/session/${sessionId}/no-gps`, {});

export const ambilPelacakan = (shipmentId: string) =>
  ambil<TrackingSnapshot>(`/shipments/${shipmentId}/track`);

// ============================== SISI OPERATOR ==============================

/** Antrean klaim >10% yang harus diputus manusia, SLA 1 hari kerja (FR-5.6). */
export const ambilAntreanKlaim = () =>
  ambil<Array<ClaimResponse & { overdue: boolean }>>("/operator/claims");

export const putuskanKlaim = (claimId: string, approvedValue: number, note: string) =>
  kirim<ClaimResponse>(`/operator/claims/${claimId}/decide`, { approvedValue, note });

export const ambilAntreanLegalitas = (status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") =>
  ambil<LegalityQueueItem[]>(`/operator/legality?status=${status}`);

export const putuskanLegalitas = (tenantId: string, approve: boolean, note?: string) =>
  kirim<{ tenantId: string; legalityStatus: string; message: string }>(
    `/operator/legality/${tenantId}/decide`,
    { approve, ...(note ? { note } : {}) },
  );

export const ambilEscrowOperator = () => ambil<OperatorEscrowSummary>("/operator/escrow");

export const ambilJangkar = (limit = 50) =>
  ambil<AnchorAuditItem[]>(`/operator/anchors?limit=${limit}`);

export const ambilAntreanSatelit = () => ambil<SatelliteReviewItem[]>("/operator/satellite");

export const putuskanSatelit = (batchId: string, body: DecideSatelliteBody) =>
  kirim<{ batchId: string; verificationStatus: VerificationStatus }>(
    `/operator/satellite/${batchId}/decide`,
    body,
  );

export const ambilZonaOperator = () => ambil<ZoneSummary[]>("/operator/zones");

export const buatZona = (body: UpsertZoneBody) => kirim<ZoneSummary>("/operator/zones", body);

export const ubahZona = (id: string, body: UpsertZoneBody) =>
  kirim<ZoneSummary>(`/operator/zones/${id}`, body, "PATCH");

export const ambilKomoditasOperator = () => ambil<CommoditySummary[]>("/operator/commodities");

export const buatKomoditas = (body: UpsertCommodityBody) =>
  kirim<CommoditySummary>("/operator/commodities", body);

export const ubahKomoditas = (id: string, body: UpsertCommodityBody) =>
  kirim<CommoditySummary>(`/operator/commodities/${id}`, body, "PATCH");

export const ambilRekomendasi = () => ambil<PlantingRecommendation[]>("/tenant/rekomendasi");

export const aktifkanLangganan = (months = 1) =>
  kirim<{ status: string; periodEnd: string; message: string }>("/tenant/langganan/aktifkan", {
    months,
  });

/**
 * Unggah satu foto, kembalikan URL-nya (`POST /uploads`).
 *
 * Dipakai alur yang mewajibkan foto tapi menerimanya sebagai URL — terutama konfirmasi
 * terima pembeli. Seperti `tambahNodeTimeline`, Content-Type TIDAK disetel sendiri:
 * biarkan peramban menuliskannya beserta boundary multipart.
 */
export async function unggahFoto(berkas: File): Promise<{ url: string; sha256: string; bytes: number }> {
  const token = ambilToken();
  const form = new FormData();
  form.append("file", berkas);
  const res = await fetch(`${BASE}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let kode: string | null = null;
    let pesan = `Unggahan gagal (${res.status})`;
    try {
      const j = (await res.json()) as { code?: string; message?: string };
      kode = j.code ?? null;
      if (j.message) pesan = j.message;
    } catch {
      /* respons bukan JSON — pakai pesan bawaan */
    }
    throw new GalatApi(res.status, kode, pesan);
  }
  return (await res.json()) as { url: string; sha256: string; bytes: number };
}

/** Konfirmasi terima barang — Sinyal-2 PoD yang membuka jendela klaim mutu. */
export const konfirmasiTerima = (shipmentId: string, photoUrl: string) =>
  kirim<{
    shipmentId: string;
    status: string;
    receivedMode: string;
    claimWindowEndsAt: string;
  }>(`/shipments/${shipmentId}/receive`, { photoUrl });

/**
 * Tambah node timeline (FR-4.1). Dikirim sebagai multipart karena membawa berkas foto,
 * jadi TIDAK lewat `ambil()` yang selalu menyetel Content-Type JSON — biarkan peramban
 * yang menuliskannya sendiri beserta boundary-nya.
 */
export async function tambahNodeTimeline(batchId: string, form: FormData) {
  const token = ambilToken();
  const res = await fetch(`${BASE}/tenant/batches/${batchId}/timeline`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let kode: string | null = null;
    let pesan = `Gagal menyimpan catatan (${res.status})`;
    try {
      const isi = await res.json();
      kode = isi?.code ?? null;
      pesan = Array.isArray(isi?.message) ? isi.message.join(", ") : (isi?.message ?? pesan);
    } catch {
      /* biarkan pesan baku */
    }
    throw new GalatApi(res.status, kode, pesan);
  }
  return res.json() as Promise<TimelineNodeResponse>;
}
