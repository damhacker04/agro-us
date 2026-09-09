import React from "react";
import type { VerificationBadge, VerificationStatus } from "@agro-os/shared";
import { Pil, Tanda, type Nada } from "@/ui";

/**
 * Tiga status verifikasi (FR-2.6) sebagai satu pemetaan, dipakai bersama.
 *
 * Sebelumnya pemetaan ini hidup di katalog saja. Begitu halaman produk memakainya juga,
 * dua salinan berarti dua kesempatan agar "Terverifikasi satelit" tampil ungu di satu
 * halaman dan biru di halaman berikutnya — dan yang melenceng di sini bukan warna,
 * melainkan derajat kepercayaan yang dijanjikan kepada pembeli. Kontrak bersama sudah
 * menolak duplikasi pemetaan status→badge di `toVerificationBadge`; ini padanannya di
 * sisi tampilan.
 *
 * `BELUM_TERVERIFIKASI` tidak pernah disembunyikan (FR-4.6): katalog yang semuanya
 * bertanda penuh tidak memberi informasi apa pun, karena tidak ada pembandingnya.
 */
export const STATUS_VERIFIKASI: Record<
  VerificationBadge,
  { teks: string; nada: Nada; tanda: "penuh" | "sebagian" | "tidak" }
> = {
  TERVERIFIKASI_SATELIT: { teks: "Terverifikasi satelit", nada: "utama", tanda: "penuh" },
  BUKTI_FOTO_SAJA: { teks: "Bukti foto saja", nada: "kabar", tanda: "sebagian" },
  BELUM_TERVERIFIKASI: { teks: "Belum terverifikasi", nada: "netral", tanda: "tidak" },
};

/**
 * Status MENTAH dari pipeline satelit, dinyatakan apa adanya.
 *
 * Badge meringkas tiga status mentah menjadi satu ("belum terverifikasi"), dan peringkasan
 * itu benar untuk daftar. Tetapi di halaman keputusan beli, "awan menutup seluruh citra"
 * dan "klaim tidak cocok dengan citra" adalah dua hal yang sama sekali berbeda bagi orang
 * yang akan membayar di muka. Prinsip 1 produk ini menuntut keduanya terbaca berbeda:
 * belum bisa dinilai bukan bermasalah.
 */
export const STATUS_MENTAH: Record<VerificationStatus, { teks: string; jelas: string; nada: Nada }> = {
  TERVERIFIKASI: {
    teks: "Klaim cocok dengan citra",
    jelas:
      "Kurva vegetasi dari lintasan Sentinel-2 konsisten dengan tanggal tanam dan panen yang dicatat Tenant.",
    nada: "utama",
  },
  FOTO_SAJA: {
    teks: "Bukti foto saja",
    jelas:
      "Batch ini bersandar pada foto berstempel GPS dan rantai hash kegiatan; citra satelitnya belum menopang maupun membantah klaimnya.",
    nada: "kabar",
  },
  PERLU_DITINJAU: {
    teks: "Sedang ditinjau operator",
    jelas:
      "Ada yang tidak langsung cocok antara klaim dan citra. Angkanya marginal, jadi keputusannya diserahkan ke peninjau, bukan dijatuhkan otomatis.",
    nada: "kabar",
  },
  TIDAK_DAPAT: {
    teks: "Belum bisa dinilai",
    jelas:
      "Awan menutup lintasan pada tanggal yang menentukan, jadi tidak ada yang bisa dikatakan. Ini bukan temuan buruk tentang produsen — ini cuaca.",
    nada: "netral",
  },
  TIDAK_SESUAI: {
    teks: "Klaim tidak cocok dengan citra",
    jelas:
      "Kurva vegetasi berbalik pada tanggal yang jauh dari panen yang diklaim. Selisihnya ditampilkan di bawah supaya Anda menilainya sendiri.",
    nada: "awas",
  },
};

/** Pil badge — bentuk yang sama di katalog, halaman produk, dan riwayat pesanan. */
export function PilVerifikasi({
  badge,
  className,
}: {
  badge: VerificationBadge;
  className?: string;
}) {
  const s = STATUS_VERIFIKASI[badge];
  return (
    <Pil nada={s.nada} garis={s.nada === "netral"} className={className}>
      <Tanda jenis={s.tanda} />
      {s.teks}
    </Pil>
  );
}
