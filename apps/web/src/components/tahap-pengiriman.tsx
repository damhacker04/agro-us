import React from "react";
import type { ShipmentStatus } from "@agro-os/shared";
import { Pil, type Nada } from "@/ui";

/**
 * Enam tahap pengiriman (§5.6.1) sebagai satu kosakata, dipakai daftar maupun rincian, dan
 * dari kedua sisi meja.
 *
 * NAMANYA SATU untuk semua peran. Sebelum ini ada tiga salinan dengan dua kosakata: daftar
 * pesanan Tenant menyebut `PANEN` sebagai "Siap Kirim" sementara rincian pesanan Tenant —
 * halaman berikutnya yang dibuka dari daftar itu — menyebutnya "Panen". Dua nama untuk satu
 * keadaan pada dua layar berurutan membuat orang bertanya apakah statusnya berubah di
 * antara klik.
 *
 * NADANYA BERBEDA PER PERAN, dan itu bukan inkonsistensi melainkan isi. Nada menyatakan
 * SIAPA YANG HARUS BERTINDAK SEKARANG:
 *
 *   · Pembeli hanya perlu bertindak pada `TIBA_DI_LOKASI` — mengonfirmasi penerimaan.
 *   · Tenant justru perlu bertindak pada `PANEN` — menerbitkan QR dan menyerahkan box ke
 *     kurir. Setelah barang berjalan, tidak ada lagi yang bisa ia lakukan.
 *
 * Kalau setiap tahap berkedip, tahap yang benar-benar menunggu tidak lagi menonjol.
 */

export type PeranTahap = "pembeli" | "tenant";

/** Nama tahap — sama untuk semua peran. */
export const TAHAP: Record<ShipmentStatus, string> = {
  MENUNGGU_PANEN: "Menunggu panen",
  PANEN: "Panen",
  DIKIRIM: "Dikirim",
  TIBA_DI_LOKASI: "Tiba di lokasi",
  DITERIMA: "Diterima",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

type Rupa = { nada: Nada; garis: boolean };

const RUPA: Record<PeranTahap, Record<ShipmentStatus, Rupa>> = {
  pembeli: {
    MENUNGGU_PANEN: { nada: "netral", garis: true },
    PANEN: { nada: "utama", garis: true },
    DIKIRIM: { nada: "kabar", garis: true },
    /** Satu-satunya yang menuntut tindakan pembeli. */
    TIBA_DI_LOKASI: { nada: "awas", garis: false },
    DITERIMA: { nada: "utama", garis: true },
    SELESAI: { nada: "utama", garis: false },
    DIBATALKAN: { nada: "awas", garis: true },
  },
  tenant: {
    MENUNGGU_PANEN: { nada: "netral", garis: true },
    /** Giliran Tenant: panen sudah tercatat, QR dan Kode Antar menunggu diterbitkan. */
    PANEN: { nada: "awas", garis: false },
    DIKIRIM: { nada: "kabar", garis: true },
    /** Barang sudah di tangan kurir — Tenant tidak punya tindakan di sini. */
    TIBA_DI_LOKASI: { nada: "kabar", garis: true },
    DITERIMA: { nada: "utama", garis: true },
    SELESAI: { nada: "utama", garis: false },
    DIBATALKAN: { nada: "awas", garis: true },
  },
};

export function PilTahap({
  status,
  peran = "pembeli",
  className,
}: {
  status: ShipmentStatus;
  peran?: PeranTahap;
  className?: string;
}) {
  const r = RUPA[peran][status];
  return (
    <Pil nada={r.nada} garis={r.garis} className={className}>
      {TAHAP[status]}
    </Pil>
  );
}

/** Nada tahap untuk memberi warna pada aturan panel, bukan hanya pilnya. */
export const nadaTahap = (status: ShipmentStatus, peran: PeranTahap = "pembeli"): Nada =>
  RUPA[peran][status].nada;
