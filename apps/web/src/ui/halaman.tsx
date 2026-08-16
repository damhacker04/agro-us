import React from "react";
import { JudulHalaman, Prosa } from "./teks";
import { cn } from "./cn";

/**
 * Halaman — SAKLAR MIGRASI dunia ini.
 *
 * Ini bukan pembungkus tata letak, ini satu-satunya tempat `font-sertifikat` dinyalakan.
 * Tailwind `sans` sengaja masih menunjuk Poppins supaya 57 halaman yang belum ditinjau tidak
 * diam-diam berganti tipografi; dunia baru terdaftar terpisah sebagai `sertifikat`. Selama
 * begitu, sebuah halaman ada di dunia lama atau dunia baru, tidak pernah separuh.
 *
 * Membungkus halaman dengan komponen ini BERARTI menyatakan halaman itu sudah bermigrasi
 * penuh: setiap warna abu-abu, setiap sudut membulat, setiap ikon lucide mentah di dalamnya
 * sudah diganti. Menyalakannya di atas isi yang belum diganti menghasilkan hal terburuk dari
 * keduanya — Archivo di atas kartu putih beradius 16px.
 *
 * `kertas-sekuriti` membawa serat kertasnya. Ia halus dengan sengaja, tetapi ia ADA: dunia
 * yang mengklaim kertas sekuriti dan mencetak bidang rata adalah dunia yang berbohong.
 */
export function Halaman({
  judul,
  pengantar,
  aksi,
  kembali,
  children,
  lebar = "biasa",
  className = "",
}: {
  judul?: React.ReactNode;
  pengantar?: React.ReactNode;
  /** Kendali tingkat halaman: tombol utama, saringan. */
  aksi?: React.ReactNode;
  /** Slot untuk `<TautanKembali>`. Di atas judul, karena ia menjawab "saya dari mana". */
  kembali?: React.ReactNode;
  children: React.ReactNode;
  lebar?: "biasa" | "sempit" | "penuh";
  className?: string;
}) {
  const batas = { biasa: "max-w-[1100px]", sempit: "max-w-[720px]", penuh: "max-w-none" }[lebar];
  const adaKepala = judul !== undefined || pengantar !== undefined || aksi !== undefined || kembali !== undefined;

  return (
    <div className={cn(`kertas-sekuriti min-h-full bg-kertas font-sertifikat text-tinta ${className}`)}>
      <div className={cn(`mx-auto ${batas} px-6 py-8 md:px-8 md:py-10`)}>
        {adaKepala ? (
          /* Jarak ke bawah dari kepala halaman selalu lebih besar daripada jarak antar
             barisnya sendiri, supaya kepala terbaca sebagai satu kelompok, bukan sebagai
             baris pertama isi. */
          <header className="mb-8">
            {kembali ? <div className="mb-5">{kembali}</div> : null}
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
              <div className="min-w-0">
                {judul ? <JudulHalaman>{judul}</JudulHalaman> : null}
                {pengantar ? <Prosa className="mt-3">{pengantar}</Prosa> : null}
              </div>
              {aksi ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aksi}</div> : null}
            </div>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
