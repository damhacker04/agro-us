import React from "react";
import { JudulPanel, Label, Prosa } from "./teks";
import { cn } from "./cn";

/**
 * Galat.
 *
 * Region kecil yang utuh, jadi hukum region-penuh berlaku apa adanya: ground jambu, tipe
 * kertas, sekundernya `kabut-jambu` yang ditarik dari hue ground-nya sendiri. Wash pucat
 * dengan teks merah di atasnya (`bg-red-50 text-red-700`, 25 kali di kode lama) bukan hanya
 * bukan dunia ini — ia juga yang paling sering gagal kontras, karena dua warna pucat yang
 * berdekatan terlihat baik-baik saja sampai diukur.
 *
 * `role="alert"` supaya galat yang muncul setelah halaman dimuat benar-benar dibacakan.
 * Galat yang hanya berwarna adalah galat yang tidak terjadi bagi sebagian orang.
 */
export function Galat({
  judul,
  children,
  aksi,
  className = "",
}: {
  /** Menamai masalahnya. */
  judul?: React.ReactNode;
  /** Menamai jalan keluarnya. Pesan tanpa langkah berikutnya menyerahkan orang ke jalan buntu. */
  children: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn(`bg-jambu p-4 text-kertas-terang ${className}`)}>
      {judul ? <Label className="text-kabut-jambu">{judul}</Label> : null}
      <p className={cn(`text-[14px] leading-relaxed ${judul ? "mt-1.5" : ""}`)}>{children}</p>
      {aksi ? <div className="mt-3 flex flex-wrap gap-2">{aksi}</div> : null}
    </div>
  );
}

/**
 * Keadaan kosong yang MENGAJARKAN antarmukanya.
 *
 * "Belum ada data" memberi tahu orang apa yang sudah mereka lihat sendiri. Yang berguna
 * adalah mengapa kosong dan apa langkah berikutnya — dan di produk ini kosong sering berarti
 * sesuatu yang tepat ("tidak ada yang menunggu tinjauan" adalah antrean yang sehat, bukan
 * kegagalan), jadi nadanya tidak boleh terdengar seperti kesalahan.
 */
export function Kosong({
  judul,
  children,
  aksi,
  className = "",
}: {
  judul: React.ReactNode;
  children?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(`border-t-2 border-kertas-garis bg-kertas-terang px-6 py-12 ${className}`)}>
      <JudulPanel>{judul}</JudulPanel>
      {children ? <Prosa className="mt-2 text-[14px]">{children}</Prosa> : null}
      {aksi ? <div className="mt-5 flex flex-wrap gap-2">{aksi}</div> : null}
    </div>
  );
}

/**
 * Kerangka muat — bentuk isi yang akan datang, bukan roda berputar di tengah halaman.
 *
 * Spinner memberi tahu "tunggu"; kerangka memberi tahu "ini yang sedang datang, dan segini
 * banyaknya". Bentuknya sengaja bentuk `baris-data`: aturan tipis, blok label pendek, blok
 * nilai panjang — jadi ketika isinya tiba, tata letaknya tidak melompat.
 *
 * `animate-pulse` adalah utility inti Tailwind, jadi keyframe-nya selalu ikut ke build.
 */
export function Memuat({
  baris = 3,
  label = "Memuat…",
  className = "",
}: {
  baris?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn(`space-y-4 ${className}`)} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="border-t border-kertas-garis pt-3" aria-hidden>
          <div className="h-2 w-24 animate-pulse bg-kertas-garis" />
          <div className="mt-2.5 h-4 w-2/3 animate-pulse bg-kertas-garis" />
        </div>
      ))}
    </div>
  );
}
