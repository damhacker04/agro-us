"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Label, Tanda } from "@/ui";

/**
 * Cangkang onboarding Tenant.
 *
 * MIGRASI DUNIA, dan yang terbesar bukan warnanya melainkan KLAIM YANG DIBUANG. Panel kiri
 * sebelumnya memuat tiga hal yang tidak ditopang apa pun:
 *
 * 1. "Jangkau ribuan jaringan HORECA" — angka penggunaan yang dikarang. PRODUCT.md
 *    mengikat soal ini: tidak ada pelanggan nyata, testimoni, logo mitra, maupun angka
 *    penggunaan, dan tidak boleh dikarang.
 * 2. "SATELIT AKTIF: Real-time monitoring" lengkap dengan titik berdenyut — dua kekeliruan
 *    sekaligus. Verifikasi satelit BELUM menyala di produksi, dan Sentinel-2 melintas tiap
 *    lima harian, bukan real-time. Ini dijanjikan kepada orang yang sedang memutuskan
 *    apakah akan menaruh lahannya di sini.
 * 3. "Dokumen Anda dilindungi dengan enkripsi tingkat tinggi" — klaim keamanan tanpa
 *    penopang, dipasang tepat di layar yang meminta foto KTP.
 *
 * Tiga tautan kaki `href="#"` juga dibuang: tautan yang tidak menuju ke mana-mana pada
 * halaman yang meminta dokumen legal adalah janji yang paling murah untuk tidak ditepati.
 *
 * Yang menggantikan lencana palsu itu: PENUNJUK LANGKAH. Ia menempati tempat yang sama,
 * mengatakan sesuatu yang benar, dan menghapus pengulangan "Langkah N dari 3" yang tadinya
 * ditulis ulang di tiap halaman.
 *
 * Rel kirinya `ungu` karena ungu adalah pintu Tenant di halaman depan — orang yang sampai
 * di sini baru saja melewati pintu itu, dan warnanya melanjutkan kalimat yang sama.
 */

const LANGKAH = [
  { ke: 1, nama: "Profil", cocok: ["/profile"] },
  { ke: 2, nama: "Lahan", cocok: ["/mapping", "/confirmation"] },
  { ke: 3, nama: "Legalitas", cocok: ["/legal", "/success"] },
] as const;

const SALINAN: Record<number, { judul: string; teks: string }> = {
  1: {
    judul: "Zona menentukan siapa yang bisa memesan dari Anda.",
    teks: "Zona layanan memutuskan pembeli mana yang melihat produk Anda di katalog, dan Tenant mana yang bisa menggantikan bila panen Anda meleset. Boleh lebih dari satu.",
  },
  2: {
    judul: "Batas lahan menentukan batas kuota.",
    teks: "Luas dihitung server dari poligon yang Anda tandai, bukan dari angka yang diketik. Poligon yang sama nanti diadu dengan citra satelit saat klaim panen diperiksa.",
  },
  3: {
    judul: "Pembeli membayar sebelum barangnya ada.",
    teks: "Karena itu legalitas ditinjau lebih dulu oleh operator, bukan disetujui otomatis. Selama menunggu, Anda sudah bisa menyiapkan produk — yang terkunci hanya pembukaan kuota.",
  },
};

export default function TenantOnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const aktif = LANGKAH.find((l) => l.cocok.some((c) => pathname.includes(c)))?.ke ?? 1;
  const salinan = SALINAN[aktif]!;

  return (
    <div className="flex min-h-screen bg-kertas font-sertifikat text-tinta">
      {/* ---------- Rel kiri, ≥1024px ---------- */}
      <aside className="hidden w-[22rem] shrink-0 flex-col justify-between bg-ungu p-10 lg:flex">
        <div>
          <Link
            href="/"
            className="mb-16 flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kertas-terang"
          >
            {/* Logo mengikat menurut PRODUCT.md — berkasnya sendiri, bukan glif daun. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
            <span className="text-[15px] font-bold tracking-[0.01em] text-kertas-terang">
              AgroUs
            </span>
            <Label className="text-kabut-ungu">Tenant</Label>
          </Link>

          {/* 26px = langkah `title` yang sudah didokumentasikan, bukan 28px karangan.
              Satu langkah baru hanya boleh lahir dari kebutuhan pakai, bukan dari selera
              sesaat saat menulis satu berkas. */}
          <h2 className="max-w-[22ch] text-[26px] font-extrabold leading-tight text-kertas-terang">
            {salinan.judul}
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-kabut-ungu">
            {salinan.teks}
          </p>

          <ol className="mt-12 space-y-3">
            {LANGKAH.map((l) => {
              const selesai = l.ke < aktif;
              const kini = l.ke === aktif;
              return (
                <li key={l.ke} className="flex items-center gap-3 border-t border-kabut-ungu/30 pt-3">
                  {selesai ? (
                    <Tanda jenis="penuh" className="text-kertas-terang" />
                  ) : (
                    <span
                      className={
                        kini
                          ? "font-mono text-[13px] leading-none text-kertas-terang"
                          : "font-mono text-[13px] leading-none text-kabut-ungu"
                      }
                    >
                      {String(l.ke).padStart(2, "0")}
                    </span>
                  )}
                  <span
                    className={
                      kini
                        ? "text-[14px] font-bold text-kertas-terang"
                        : "text-[14px] text-kabut-ungu"
                    }
                  >
                    {l.nama}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="text-[11px] text-kabut-ungu">© 2026 AgroUs</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Bilah atas, <1024px ---------- */}
        <div className="sticky top-0 z-20 border-b border-tinta bg-kertas-terang lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="-my-1 flex min-w-0 items-center gap-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
              <span className="truncate text-[15px] font-bold tracking-[0.01em]">AgroUs</span>
              <Label className="shrink-0">Tenant</Label>
            </Link>
            <Label className="shrink-0">
              Langkah {aktif} dari {LANGKAH.length}
            </Label>
          </div>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
