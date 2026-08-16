"use client";

import React, { useId } from "react";
import { Label } from "./teks";
import { cn } from "./cn";

/**
 * Medan — pembungkus satu isian: label, kendali, petunjuk, galat.
 *
 * Yang diambil alih komponen ini bukan tata letaknya melainkan PENGKABELANNYA. Pola lama
 * (`<label className="block text-sm …">` lalu `<input>` terpisah, 30 kali) hampir tidak
 * pernah menautkan keduanya, tidak pernah menautkan petunjuk ke kendali, dan menampilkan
 * galat sebagai teks merah yang tidak pernah sampai ke pembaca layar. Di sini `htmlFor`,
 * `aria-describedby`, dan `aria-invalid` dirakit dari satu `useId`, jadi tidak ada halaman
 * yang bisa lupa.
 *
 * Galat memakai `jambu`, bukan `stempel`: cap disediakan untuk mencap dan menandai, dan
 * warna yang dipakai untuk segalanya berhenti berarti apa-apa.
 */
export function Medan({
  label,
  petunjuk,
  galat,
  wajib,
  children,
  className = "",
}: {
  label: React.ReactNode;
  /** Aturan isian yang berlaku SEBELUM orang mengetik. Bukan tempat menaruh galat. */
  petunjuk?: React.ReactNode;
  /** Menamai masalahnya DAN jalan keluarnya. "Wajib diisi" saja bukan galat, itu label. */
  galat?: string;
  wajib?: boolean;
  children: (alat: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    required?: boolean;
  }) => React.ReactNode;
  className?: string;
}) {
  const dasar = useId();
  const id = `${dasar}-medan`;
  const idPetunjuk = `${dasar}-petunjuk`;
  const idGalat = `${dasar}-galat`;
  const terkait = [petunjuk ? idPetunjuk : null, galat ? idGalat : null].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <Label as="label" htmlFor={id} className="mb-1.5">
        {label}
        {wajib ? <span className="ml-1 text-jambu">*</span> : null}
      </Label>
      {petunjuk ? (
        <p id={idPetunjuk} className="mb-2 text-[12px] leading-snug text-tinta-samar">
          {petunjuk}
        </p>
      ) : null}
      {children({
        id,
        ...(terkait ? { "aria-describedby": terkait } : {}),
        ...(galat ? { "aria-invalid": true as const } : {}),
        ...(wajib ? { required: true } : {}),
      })}
      {galat ? (
        <p id={idGalat} className="mt-1.5 text-[12px] font-semibold leading-snug text-jambu">
          {galat}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Kendali isian. Persegi, bergaris tinta, ground kertas-terang.
 *
 * Yang lama `border-gray-300 rounded-lg` — abu-abu netral yang bukan bagian dunia mana pun,
 * dan sudut membulat. Yang menandai fokus di sini adalah garis yang MENEBAL jadi tinta
 * penuh plus outline ungu, bukan cincin lembut: dokumen sekuriti menandai bidang isian
 * dengan ketebalan garis, karena itu yang bisa dicetak.
 */
const KENDALI =
  "w-full border border-kertas-garis bg-kertas-terang px-3 py-2.5 text-[15px] text-tinta " +
  "placeholder:text-tinta-samar transition-colors duration-150 " +
  "hover:border-tinta-samar " +
  "focus:border-tinta focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-ungu " +
  "aria-[invalid]:border-jambu " +
  "disabled:cursor-not-allowed disabled:bg-kertas disabled:text-tinta-samar";

export function Masukan({
  className = "",
  ...sisa
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...sisa} className={cn(`${KENDALI} ${className}`)} />;
}

export function AreaTeks({
  className = "",
  rows = 4,
  ...sisa
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...sisa} rows={rows} className={cn(`${KENDALI} resize-y leading-relaxed ${className}`)} />;
}

/**
 * Centang — kotak, judul, dan penjelasannya sebagai satu sasaran klik.
 *
 * `appearance-none` mencabut kotak bawaan sistem, yang membulat di sebagian peramban.
 * Centangnya digambar dengan hukum goresan yang sama seperti setiap tanda lain di sistem.
 *
 * Sengaja TIDAK pernah tercentang secara bawaan bila ia menambah biaya: mencentangkan
 * otomatis membuat orang membayar sesuatu yang tidak pernah mereka pilih.
 */
export function Centang({
  judul,
  children,
  className = "",
  ...sisa
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  judul: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 border-t-2 border-tinta bg-kertas-terang p-5",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ungu",
        className,
      )}
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          {...sisa}
          type="checkbox"
          className="peer h-4 w-4 appearance-none border border-tinta bg-kertas-terang checked:bg-ungu checked:border-ungu focus:outline-none"
        />
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute h-3 w-3 text-kertas-terang opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden
        >
          <path d="M3 8.4 L6.4 12 L13 4" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-tinta">{judul}</span>
        {children ? (
          <span className="mt-1.5 block text-[13px] leading-relaxed text-tinta-lembut">
            {children}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Pilihan tunggal. Dipakai ketika opsinya sedikit DAN perbandingannya bagian dari
 * keputusan — metode bayar, tiga putusan kewajaran. Lebih dari lima opsi, atau opsi yang
 * tidak perlu dibandingkan, tetap milik `<Pilihan>`.
 */
export function Radio({
  nama,
  nilai,
  terpilih,
  onPilih,
  judul,
  children,
}: {
  nama: string;
  nilai: string;
  terpilih: boolean;
  onPilih: (nilai: string) => void;
  judul: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border-t-2 px-4 py-3 transition-colors duration-150",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ungu",
        terpilih ? "border-ungu bg-kertas-terang" : "border-kertas-garis hover:bg-kertas-terang",
      )}
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="radio"
          name={nama}
          value={nilai}
          checked={terpilih}
          onChange={() => onPilih(nilai)}
          className="peer h-4 w-4 appearance-none border border-tinta bg-kertas-terang checked:border-ungu focus:outline-none"
        />
        {/* Penanda terpilih persegi, bukan titik bulat: radius nol berlaku sampai ke sini. */}
        <span className="pointer-events-none absolute h-2 w-2 bg-ungu opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-[14px] font-semibold", terpilih ? "text-ungu" : "text-tinta")}>
          {judul}
        </span>
        {children ? (
          <span className="mt-1 block text-[12px] leading-snug text-tinta-lembut">{children}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * `appearance-none` mencabut panah bawaan sistem, yang di setiap peramban punya bentuk dan
 * radiusnya sendiri — satu-satunya kendali yang bisa menyelundupkan sudut membulat ke dunia
 * beradius nol. Penggantinya digambar: dua garis lurus bertemu siku, sama seperti tanda lain.
 */
export function Pilihan({
  className = "",
  children,
  ...sisa
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...sisa} className={cn(`${KENDALI} appearance-none pr-10 ${className}`)}>
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-tinta-samar"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden
        focusable="false"
      >
        <path d="M3 6 L8 11 L13 6" />
      </svg>
    </div>
  );
}
