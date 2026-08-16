import React from "react";
import { NADA, type Nada } from "./nada";
import { JudulPanel, Label } from "./teks";
import { cn } from "./cn";

/**
 * Panel — pengganti kartu.
 *
 * Kartu lama: `rounded-2xl border border-gray-200 bg-white p-6`. Empat hal di situ melanggar
 * dunia sekaligus — sudut membulat, garis abu-abu, ground putih, dan tidak adanya aturan
 * yang menyatakan blok ini soal apa.
 *
 * Penggantinya memakai perangkat sertifikat: satu aturan di ATAS blok, kertas di bawahnya,
 * radius nol, tanpa bayangan. Kedalaman di dunia ini datang dari warna ground, garis tinta,
 * dan serat kertas — bukan dari elevasi. Aturannya menebal jadi 2px dan berwarna ketika blok
 * itu sedang menyatakan keadaan.
 *
 * TANPA bayangan, TANPA gradien, TANPA panel bersarang. Panel di dalam panel adalah tanda
 * bahwa hierarkinya belum diputuskan, bukan bahwa ia dalam.
 */
export function Panel({
  judul,
  label,
  aksi,
  nada = "netral",
  padat,
  children,
  className = "",
}: {
  judul?: React.ReactNode;
  /** Label kolom kecil di atas judul — dipakai bila blok ini satu bidang data, bukan bagian. */
  label?: React.ReactNode;
  /** Kendali di sisi kanan kepala: tombol, tautan, pil. */
  aksi?: React.ReactNode;
  nada?: Nada;
  padat?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const n = NADA[nada];
  const adaKepala = judul !== undefined || label !== undefined || aksi !== undefined;
  return (
    <section
      className={cn(`border-t-2 bg-kertas-terang ${n.garis} ${padat ? "p-4" : "p-6"} ${className}`)}
    >
      {adaKepala ? (
        <div className={cn(`flex flex-wrap items-start justify-between gap-x-6 gap-y-2 ${children ? "mb-5" : ""}`)}>
          <div className="min-w-0">
            {label ? <Label className={nada === "netral" ? "" : n.teks}>{label}</Label> : null}
            {judul ? <JudulPanel className={label ? "mt-1.5" : ""}>{judul}</JudulPanel> : null}
          </div>
          {/* `flex-wrap`, dan TIDAK `shrink-0`: kepala panel sering memuat dua pil sekaligus
              (tenggat + jumlah penilaian), dan pada 375px dua pil yang menolak menyusut
              maupun turun baris mendorong seluruh halaman melebar. */}
          {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Ubin angka — label kecil di atas, nilai terukur di bawah.
 *
 * Ini `baris-data` sertifikat, bukan "hero metric": angkanya berdiri sebagai angka karena ia
 * memang isi halaman ini, bukan hiasan yang diperbesar. Tanpa ground sendiri, tanpa kotak
 * abu-abu — yang memisahkannya dari tetangganya adalah aturan tinta di atasnya.
 */
export function Ubin({
  label,
  nilai,
  satuan,
  catatan,
  nada = "netral",
  className = "",
}: {
  label: React.ReactNode;
  nilai: React.ReactNode;
  satuan?: string;
  catatan?: React.ReactNode;
  nada?: Nada;
  className?: string;
}) {
  const n = NADA[nada];
  return (
    <div className={cn(`border-t border-kertas-garis pt-2.5 ${className}`)}>
      <Label>{label}</Label>
      <div className={cn(`mt-1.5 font-mono text-[22px] leading-none ${n.teks}`)}>
        {nilai}
        {satuan ? <span className="ml-1 text-[15px] text-tinta-samar">{satuan}</span> : null}
      </div>
      {catatan ? <div className="mt-1.5 text-[12px] leading-snug text-tinta-samar">{catatan}</div> : null}
    </div>
  );
}

/**
 * Deret — wadah untuk sederet `Ubin` atau `BarisData`.
 *
 * Ada karena `grid-cols-4` yang ditulis tangan di halaman SELALU benar di layar lebar dan
 * SELALU rusak di 375: label `tracking-cap` selebar 0,26em tidak bisa dipersempit, jadi
 * "DILAPORKAN" menabrak "PITA KEWAJARAN" dan nilai dua digit pecah jadi dua baris. Itu
 * bukan kesalahan satu halaman melainkan kesalahan yang akan diulang lima puluh tujuh kali,
 * jadi titik runtuhnya diputuskan sekali di sini.
 *
 * Runtuh ke dua kolom di bawah `sm`, bukan satu: pasangan angka memang dibaca berpasangan
 * (dilaporkan vs pita, terjual vs terpenuhi), dan satu kolom memutus perbandingan itu.
 * Empat kolom baru dibuka pada `lg`, di mana labelnya benar-benar muat.
 */
export function Deret({
  kolom = 3,
  as: Tag = "div",
  children,
  className = "",
}: {
  kolom?: 2 | 3 | 4;
  /** `dl` bila isinya `BarisData` — daftar istilah/nilai punya semantiknya sendiri. */
  as?: "div" | "dl";
  children: React.ReactNode;
  className?: string;
}) {
  const lebar = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[kolom];
  return <Tag className={cn(`grid gap-x-6 gap-y-5 ${lebar}`, className)}>{children}</Tag>;
}

/**
 * Baris data — pasangan istilah/nilai untuk daftar rincian.
 *
 * Dipakai di dalam `<dl>`. Nilainya monospace bila terukur; kalau isinya nama atau status,
 * lewatkan `prosa` supaya ia tidak mengenakan kostum teknis yang tidak ia miliki.
 */
export function BarisData({
  label,
  children,
  prosa,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  prosa?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(`border-t border-kertas-garis pt-2.5 ${className}`)}>
      <Label as="dt">{label}</Label>
      <dd className={cn(`mt-1 text-[15px] leading-snug text-tinta ${prosa ? "" : "font-mono"}`)}>{children}</dd>
    </div>
  );
}
