import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

/**
 * Ikon — lucide yang ditundukkan pada hukum dunia Label Sertifikasi.
 *
 * DESIGN.md melarang icon set, dan larangan itu benar UNTUK HALAMAN DEPAN: di sana guilloche
 * memikul seluruh penandaan dan satu glif tambahan akan jadi kebisingan. Tetapi 57 halaman
 * kerja bukan halaman depan. Di mode Operate ikon melakukan pekerjaan nyata — memindai
 * antrean, membedakan baris, menandai keadaan — dan mencabutnya membeli kemurnian dengan
 * ongkos penyelesaian tugas. Larangannya karena itu dipersempit, bukan dibatalkan: nol ikon
 * di halaman Persuade, ikon terkekang di halaman Operate.
 *
 * "Terkekang" berarti lucide TIDAK dipakai apa adanya. Bawaannya `strokeLinecap="round"`,
 * `strokeLinejoin="round"`, dan goresan yang menskala bersama ukuran — tiga hal yang bentrok
 * langsung dengan dunia beradius nol yang setiap sudutnya siku dan setiap garisnya setebal
 * rambut. Ikon lucide mentah di atas kertas sekuriti terbaca seperti tempelan dari aplikasi
 * lain, karena memang begitu.
 *
 * SATU HUKUM GORESAN. Setiap tanda di sistem ini menggores 1,6px, berapa pun ukurannya.
 * Angka itu bukan selera: `TandaCakupan` di halaman depan menggores 1,9 pada viewBox 16 yang
 * dirender 14px — tepat 1,66px. `absoluteStrokeWidth` yang menjaganya tetap 1,6px saat ikon
 * mengecil, alih-alih menipis jadi benang pada 12px dan menebal jadi krayon pada 20px.
 *
 * Impor ikonnya di tempat pemakaian, lalu lewatkan lewat `dari` — bukan diekspor ulang di
 * sini. Barel ikon memaksa 57 halaman menyeret satu berkas yang menumpuk semua glif yang
 * pernah dipakai siapa pun.
 */

const UKURAN = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;

export type UkuranIkon = keyof typeof UKURAN;

export function Ikon({
  dari: Glif,
  ukuran = "md",
  label,
  className = "",
}: {
  dari: LucideIcon;
  ukuran?: UkuranIkon;
  /**
   * Isi hanya bila ikonnya SENDIRIAN memikul makna — tombol tanpa teks, status tanpa kata.
   * Ikon yang berdampingan dengan labelnya harus tetap bisu: membacakannya dua kali membuat
   * pembaca layar mengulang setiap baris antrean.
   */
  label?: string;
  className?: string;
}) {
  return (
    <Glif
      size={UKURAN[ukuran]}
      strokeWidth={1.6}
      absoluteStrokeWidth
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn(`shrink-0 ${className}`)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true, focusable: "false" })}
    />
  );
}
