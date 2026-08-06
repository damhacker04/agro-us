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
  BuyerProfileResponse,
  CatalogItem,
  CheckoutBody,
  CheckoutResponse,
  NdviSeries,
  PreviewOrderResponse,
  OrderSummary,
  PreviewOrderBody,
  BatchResponse,
  LandPlotResponse,
  PlantingRecommendation,
  ProductResponse,
  RequestOtpResponse,
  Rupiah,
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

export const ambilRekomendasi = () => ambil<PlantingRecommendation[]>("/tenant/rekomendasi");

export const aktifkanLangganan = (months = 1) =>
  kirim<{ status: string; periodEnd: string; message: string }>("/tenant/langganan/aktifkan", {
    months,
  });

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
