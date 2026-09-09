import React from "react";
import type { ShipmentStatus } from "@agro-os/shared";
import { Pil, type Nada } from "@/ui";

/**
 * Enam tahap pengiriman (§5.6.1) sebagai satu kosakata, dipakai daftar maupun rincian.
 *
 * Nadanya menyatakan APAKAH PEMBELI PERLU BERTINDAK, bukan seberapa jauh prosesnya
 * berjalan: hanya `TIBA_DI_LOKASI` yang menuntut sesuatu dari pembeli, jadi hanya ia yang
 * memakai pil terisi. Sisanya bergaris. Kalau setiap tahap berkedip, tahap yang
 * benar-benar menunggu tidak lagi menonjol.
 *
 * Ditaruh bersama karena dua salinan berarti dua kosakata: daftar pesanan sempat menyebut
 * tahap yang sama "Perlu konfirmasi" sementara halaman rinciannya menyebutnya "Tiba di
 * Lokasi" — nama berbeda untuk keadaan yang sama, pada dua layar yang dibaca berurutan.
 */
export const TAHAP: Record<ShipmentStatus, { label: string; nada: Nada; garis: boolean }> = {
  MENUNGGU_PANEN: { label: "Menunggu panen", nada: "netral", garis: true },
  PANEN: { label: "Panen", nada: "utama", garis: true },
  DIKIRIM: { label: "Dikirim", nada: "kabar", garis: true },
  TIBA_DI_LOKASI: { label: "Perlu konfirmasi", nada: "awas", garis: false },
  DITERIMA: { label: "Diterima", nada: "utama", garis: true },
  SELESAI: { label: "Selesai", nada: "utama", garis: false },
  DIBATALKAN: { label: "Dibatalkan", nada: "awas", garis: true },
};

export function PilTahap({ status, className }: { status: ShipmentStatus; className?: string }) {
  const t = TAHAP[status];
  return (
    <Pil nada={t.nada} garis={t.garis} className={className}>
      {t.label}
    </Pil>
  );
}
