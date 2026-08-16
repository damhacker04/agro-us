import React from "react";
import { cn } from "./cn";

/**
 * Tipografi halaman kerja.
 *
 * Skala di sini TETAP, bukan cair. Halaman depan memakai `clamp()` karena ia satu dokumen
 * yang dilihat di lebar apa pun; halaman kerja dilihat pada DPI yang konsisten, dan judul
 * yang menyusut karena sidebar terbuka terbaca rusak, bukan responsif. Rasio antar langkah
 * ditahan di ~1,2: elemen tipe jauh lebih banyak di sini daripada di halaman depan, dan
 * kontras yang dilebih-lebihkan berubah jadi kebisingan.
 *
 * Satu keluarga memikul semuanya — Archivo dari label 10px sampai judul halaman. Dunia ini
 * mendapat suara display-nya dari LEBAR dan bobot, bukan dari pasangan display/body.
 */

/** Judul halaman. Satu per halaman, dan jaraknya ke bawah selalu lebih kecil dari ke atas. */
export function JudulHalaman({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(`text-[26px] font-extrabold leading-[1.08] tracking-[-0.022em] text-tinta ${className}`)}
      style={{ fontStretch: "108%" }}
    >
      {children}
    </h1>
  );
}

/** Judul blok di dalam halaman. */
export function JudulPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn(`text-[17px] font-bold leading-snug text-tinta ${className}`)}>{children}</h2>;
}

/**
 * Label kolom — perangkat formulir sertifikat, dipakai apa adanya.
 *
 * 10px, huruf besar, `tracking-cap` 0.26em. Renggang itulah yang membuatnya terbaca sebagai
 * label cetak alih-alih teks kecil yang gagal. Warnanya `tinta-samar`, yang sudah digelapkan
 * sampai 4,63:1 di atas kertas justru untuk ukuran ini.
 */
export function Label({
  children,
  className = "",
  as: Tag = "span",
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "dt" | "legend" | "label";
  /** Hanya bermakna dengan `as="label"`. */
  htmlFor?: string;
}) {
  return (
    <Tag
      {...(Tag === "label" && htmlFor ? { htmlFor } : {})}
      className={cn(`block text-[10px] font-semibold uppercase tracking-cap text-tinta-samar ${className}`)}
    >
      {children}
    </Tag>
  );
}

/**
 * Nilai terukur. SELALU monospace, dan hanya untuk yang benar-benar terukur.
 *
 * Nomor seri, hash, koordinat, jumlah box, rupiah, tanggal, persentase, jarak. BUKAN nama,
 * status, judul, atau prosa — monospace sebagai kostum "teknis" adalah cara tercepat
 * membuat sistem ini kehilangan artinya, karena kalau semuanya mono maka mono tidak lagi
 * menandai apa pun.
 */
export function Nilai({
  children,
  ukuran = "md",
  satuan,
  className = "",
}: {
  children: React.ReactNode;
  ukuran?: "sm" | "md" | "lg";
  satuan?: string;
  className?: string;
}) {
  const skala = { sm: "text-[13px]", md: "text-[15px]", lg: "text-[22px]" }[ukuran];
  return (
    <span className={cn(`font-mono leading-none ${skala} ${className}`)}>
      {children}
      {satuan ? <span className="ml-1 text-[0.68em] text-tinta-samar">{satuan}</span> : null}
    </span>
  );
}

/**
 * Prosa. Ukurannya dibatasi dalam `ch` PADA ELEMEN TEKSNYA, tidak pernah pada pembungkus —
 * `ch` di pembungkus dihitung dari ukuran font yang diwarisi pembungkus itu, yang hampir
 * selalu bukan ukuran font teksnya, dan hasilnya kolom yang tercekik tanpa sebab terlihat.
 */
export function Prosa({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(`max-w-[68ch] text-[15px] leading-relaxed text-tinta-lembut ${className}`)}>{children}</p>;
}

/** Keterangan pendukung: pengapit, catatan, metadata baris. */
export function Sunyi({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(`text-[13px] leading-relaxed text-tinta-samar ${className}`)}>{children}</p>;
}
