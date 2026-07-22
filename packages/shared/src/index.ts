/**
 * @agro-os/shared — Kontrak bersama FE (apps/web) & BE (apps/api).
 *
 * Prinsip contract-first: definisikan tipe & schema di sini DULUAN tiap awal fitur,
 * supaya FE bisa kerja pakai mock tanpa nunggu API, dan perubahan kontrak langsung
 * ketahuan di kedua sisi lewat TypeScript.
 *
 * Isi di bawah baru SEED awal — dilengkapi per sprint (lihat docs/ARCHITECTURE_PLAN.md §10).
 */

/** Rupiah selalu integer (hindari bug pembulatan float). */
export type Rupiah = number;

/** Status pesanan — mengikuti alur PO → bayar → produksi → kirim. */
export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  IN_PRODUCTION = "IN_PRODUCTION",
  HARVESTED = "HARVESTED",
  PACKED = "PACKED",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
}

/** Titik koordinat GPS untuk live tracking kurir. */
export interface GpsCoordinate {
  lat: number;
  lng: number;
}

export const APP_NAME = "AgroOS" as const;
