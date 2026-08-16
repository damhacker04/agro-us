"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Ikon } from "./ikon";
import { cn } from "./cn";

/**
 * Tombol.
 *
 * Tujuh keadaan, bukan tiga: diam, tunjuk, fokus-papan-ketik, tekan, nonaktif, sibuk, dan
 * penuh-lebar. Komponen yang mengirim separuhnya adalah komponen yang halamannya akan
 * menambal sendiri, berbeda-beda, sampai tombol "Simpan" tampak lain di dua tempat.
 *
 * Cincin fokus memakai `outline` beroffset, bukan `ring` — dunia ini beradius nol, dan
 * `ring` Tailwind mewarisi radius elemennya, jadi keduanya persegi. Bedanya `outline` tidak
 * ikut terpotong oleh `overflow-hidden` induknya.
 *
 * Sibuk TIDAK memakai spinner. Dunia ini tidak punya satu pun bentuk yang berputar; yang
 * dimilikinya adalah garis. Tombol sibuk menumbuhkan aturan yang menyapu tepi bawahnya
 * (`.tombol-sibuk`, digambar di `global.css`) dan menukar labelnya. Spinner di sini akan
 * jadi satu-satunya lingkaran berputar di seluruh sistem.
 */

type Rupa = "utama" | "kedua" | "bahaya" | "sunyi";

const RUPA: Record<Rupa, string> = {
  utama: "bg-ungu text-kertas-terang hover:bg-ungu-tua active:bg-ungu-tua",
  kedua: "border border-tinta bg-transparent text-tinta hover:bg-tinta hover:text-kertas-terang",
  bahaya: "bg-jambu text-kertas-terang hover:bg-jambu-tua active:bg-jambu-tua",
  sunyi: "bg-transparent text-tinta-lembut hover:text-tinta hover:bg-kertas-garis/50",
};

const UKURAN = {
  sm: "px-3 py-2 text-[13px]",
  md: "px-5 py-2.5 text-[14px]",
} as const;

const DASAR =
  "relative inline-flex items-center justify-center gap-2 font-semibold leading-none transition-colors duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu " +
  "disabled:cursor-not-allowed disabled:opacity-45";

export function Tombol({
  children,
  rupa = "utama",
  ukuran = "md",
  sibuk,
  labelSibuk,
  penuh,
  className = "",
  disabled,
  ...sisa
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  rupa?: Rupa;
  ukuran?: keyof typeof UKURAN;
  sibuk?: boolean;
  /** Menggantikan label saat sibuk. Beri kata kerja berjalan: "Menyimpan…", bukan "Simpan". */
  labelSibuk?: React.ReactNode;
  penuh?: boolean;
}) {
  return (
    <button
      {...sisa}
      disabled={disabled || sibuk}
      aria-busy={sibuk || undefined}
      className={cn(`${DASAR} ${RUPA[rupa]} ${UKURAN[ukuran]} ${penuh ? "w-full" : ""} ${
        sibuk ? "tombol-sibuk" : ""
      } ${className}`)}
    >
      {sibuk && labelSibuk ? labelSibuk : children}
    </button>
  );
}

/**
 * Tautan yang TAMPIL sebagai tombol.
 *
 * Ada karena tanpanya godaannya adalah membungkus `<Link>` dengan `<Tombol>` — kendali
 * interaktif di dalam kendali interaktif, yang tidak valid, menghasilkan dua stop tab untuk
 * satu sasaran, dan membuat pembaca layar mengumumkan tombol berisi tautan.
 *
 * Yang menentukan pilihannya bukan rupa melainkan AKIBAT: pindah tempat itu tautan (bisa
 * dibuka di tab baru, punya alamat, masuk riwayat), mengubah sesuatu itu tombol. Rupa yang
 * sama tidak membuat keduanya sama.
 */
export function TombolTaut({
  href,
  children,
  rupa = "utama",
  ukuran = "md",
  penuh,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  rupa?: Rupa;
  ukuran?: keyof typeof UKURAN;
  penuh?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(DASAR, RUPA[rupa], UKURAN[ukuran], penuh ? "w-full" : "", className)}
    >
      {children}
    </Link>
  );
}

/**
 * Tautan kembali. Muncul 11 kali sebagai potongan kelas yang disalin tangan, dan setiap
 * salinan adalah kesempatan jaraknya melenceng.
 */
export function TautanKembali({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      /* `py-2 -my-2` memperbesar area sentuh jadi ~36px tanpa menggeser apa pun secara
         visual. Teks 13px setinggi 20px adalah sasaran yang meleset di ponsel, dan tautan
         ini justru yang paling sering ditekan sambil berjalan. */
      className={cn(`-my-2 inline-flex items-center gap-2 py-2 text-[13px] font-semibold text-tinta-lembut transition-colors duration-150 hover:text-ungu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu ${className}`)}
    >
      <Ikon dari={ArrowLeft} ukuran="sm" />
      {children}
    </Link>
  );
}
