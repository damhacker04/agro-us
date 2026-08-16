import React from "react";
import { NADA, type Nada } from "./nada";
import { cn } from "./cn";

/**
 * Pil status — persegi, bukan kapsul.
 *
 * Lencana lama `rounded-full` adalah bentuk yang paling jauh dari dunia beradius nol ini.
 * Penggantinya persegi penuh dan memakai hukum region-utuh apa adanya: pil itu region kecil,
 * jadi warnanya menguasai ground, tipe, dan seluruhnya sekaligus — bukan wash pucat dengan
 * teks berwarna di atasnya, yang gagal kontras justru pada ukuran tempat ia dipakai.
 *
 * Varian `garis` untuk keadaan yang TIDAK menuntut perhatian: netral, selesai, arsip. Pil
 * penuh yang dipakai untuk segalanya membuat halaman antrean berkedip di setiap baris, dan
 * yang berkedip di mana-mana berhenti menandai apa pun.
 */
export function Pil({
  children,
  nada = "netral",
  garis,
  className = "",
}: {
  children: React.ReactNode;
  nada?: Nada;
  garis?: boolean;
  className?: string;
}) {
  const n = NADA[nada];
  const rupa = garis
    ? `border ${n.garis} ${n.teks} bg-transparent`
    : `${n.ground} ${n.atasGround}`;
  return (
    <span
      className={cn(`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-cap ${rupa} ${className}`)}
    >
      {children}
    </span>
  );
}

/**
 * Tanda keadaan yang DIGAMBAR, untuk tiga hal yang tidak boleh bergantung pada font.
 *
 * `✓ ± —` diketik sebagai karakter menyerahkan bentuk, bobot, dan perataannya kepada font
 * mana pun yang kebetulan memuatnya. Yang paling berbahaya `±`: satu-satunya yang menyatakan
 * "sebagian", dan sebagian adalah pengakuan yang paling mahal di produk ini.
 *
 * Menggores 1,6px, sama dengan setiap tanda lain di sistem — lihat `ikon.tsx`.
 */
export function Tanda({
  jenis,
  className = "",
}: {
  jenis: "penuh" | "sebagian" | "tidak";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(`h-3.5 w-3.5 shrink-0 ${className}`)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.83}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
    >
      {jenis === "penuh" && <path d="M3 8.4 L6.4 12 L13 4" />}
      {jenis === "sebagian" && (
        <>
          <path d="M3 6.2 H13" />
          <path d="M3 11 H13" />
          <path d="M8 2.4 V9" />
        </>
      )}
      {jenis === "tidak" && <path d="M3 8 H13" />}
    </svg>
  );
}
