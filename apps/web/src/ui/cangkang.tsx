"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Ikon } from "./ikon";
import { Label } from "./teks";
import { cn } from "./cn";

/**
 * Cangkang peran — bingkai bersama untuk Tenant, Pembeli, dan Operator.
 *
 * Ketiganya sudah pola yang sama sebelum berkas ini ada: sidebar `w-64`, kunci logo di
 * puncaknya, daftar nav, aksi di kaki. Yang berbeda cuma isi menunya dan warnanya — dan
 * warna bukan alasan menulis tiga komponen. Perbedaannya jadi data.
 *
 * TAPI INI BUKAN PENGGANTIAN RUPA. Tiga cacat struktural ikut diperbaiki di sini, dan
 * ketiganya lebih besar daripada warnanya:
 *
 * 1. NAVIGASI PONSEL TIDAK PERNAH ADA. Cangkang operator dan pembeli menyembunyikan
 *    sidebar-nya dengan `hidden md:flex` dan tidak menyediakan penggantinya — di bawah
 *    768px kedua peran itu tidak punya cara berpindah halaman sama sekali. Cangkang tenant
 *    lebih buruk: sidebar 256px-nya tidak pernah disembunyikan, jadi di layar 375px isi
 *    halaman disisakan 119px. Jadi bagian ini DITULIS, bukan dipindahkan.
 *
 * 2. CANGKANG BERHENTI MEMILIKI JUDUL HALAMAN. Cangkang pembeli merender `<h1>Katalog:
 *    Kota Malang</h1>` — nama kota yang dipaku di kode — sementara `<Halaman>` juga
 *    merender judulnya sendiri. Dua `<h1>` di satu halaman. Judul milik halaman, selalu.
 *
 * 3. `h-screen overflow-hidden` DILEPAS dari cangkang tenant, yang mengunci gulir seluruh
 *    aplikasi ke dalam satu wadah dan mematikan gulir halaman biasa.
 *
 * Laci ponselnya sengaja BUKAN modal: ia disclosure yang membentang di bawah bilah atas.
 * Modal menuntut jebakan fokus, pengembalian fokus, dan penanganan Escape untuk dapat
 * sesuatu yang tidak dibutuhkan menu — tidak ada yang perlu dilindungi di baliknya.
 */

export type ItemMenu = { nama: string; href: string; ikon: LucideIcon };

export function Cangkang({
  peran,
  beranda,
  nama,
  menu,
  keluar,
  aksi,
  children,
}: {
  /** Label peran di bawah kunci logo: "Operator", "Produsen", "Pembeli". */
  peran: string;
  beranda: string;
  /** Nama akun yang sedang masuk, bila cangkangnya tahu. Domain yang mengambilnya. */
  nama?: string;
  menu: ItemMenu[];
  keluar: () => void;
  /** Kendali tambahan khusus peran — keranjang, ganti wilayah. */
  aksi?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);

  const aktif = (href: string) =>
    pathname === href || (href !== beranda && pathname.startsWith(href));

  return (
    /* `kertas-sekuriti` TIDAK dipasang di akar sini. `<Halaman>` sudah membawanya untuk
       bidang isi, dan dua lapis serat yang bertumpuk menggandakan teksturnya persis di
       area yang paling banyak dibaca. Cangkang memakainya hanya pada sidebar. */
    <div className="flex min-h-screen bg-kertas font-sertifikat text-tinta">
      {/* ---------- Sidebar, ≥768px ---------- */}
      <aside className="kertas-sekuriti sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-tinta bg-kertas-terang md:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <KunciLogo beranda={beranda} peran={peran} />
          <nav className="px-3 pb-6">
            <ul className="space-y-0.5">
              {menu.map((m) => (
                <li key={m.href}>
                  <TautanNav item={m} aktif={aktif(m.href)} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <KakiAkun nama={nama} keluar={keluar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Bilah atas, <768px ---------- */}
        <div className="sticky top-0 z-20 border-b border-tinta bg-kertas-terang md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            {/* `-my-1 py-1`: kunci logo setinggi 28px adalah sasaran yang meleset di ponsel.
                Area sentuhnya dinaikkan tanpa menggeser apa pun secara visual. */}
            <Link
              href={beranda}
              className="-my-1 flex min-w-0 items-center gap-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
              <span className="truncate text-[15px] font-bold tracking-[0.01em]">AgroUs</span>
              <Label className="shrink-0">{peran}</Label>
            </Link>
            <button
              type="button"
              onClick={() => setBuka((b) => !b)}
              aria-expanded={buka}
              aria-controls="nav-ponsel"
              className="-mr-1 inline-flex items-center gap-2 px-2 py-2 text-[13px] font-semibold text-tinta transition-colors duration-150 hover:text-ungu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              <Ikon dari={buka ? X : Menu} ukuran="md" />
              {buka ? "Tutup" : "Menu"}
            </button>
          </div>
          {buka ? (
            <nav id="nav-ponsel" className="border-t border-kertas-garis px-3 py-3">
              <ul className="space-y-0.5">
                {menu.map((m) => (
                  <li key={m.href}>
                    <TautanNav item={m} aktif={aktif(m.href)} onNavigasi={() => setBuka(false)} />
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-kertas-garis pt-3">
                <KakiAkun nama={nama} keluar={keluar} rapat />
              </div>
            </nav>
          ) : null}
        </div>

        {aksi ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-kertas-garis bg-kertas-terang px-6 py-3 md:px-8">
            {aksi}
          </div>
        ) : null}

        {/* Judul TIDAK dirender di sini. `<Halaman>` yang memilikinya. */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Kunci logo — sama persis dengan kepala sertifikat di halaman depan. */
function KunciLogo({ beranda, peran }: { beranda: string; peran: string }) {
  return (
    <div className="border-b border-tinta px-5 py-5">
      <Link
        href={beranda}
        className="flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
        <span className="text-[17px] font-bold tracking-[0.01em]">AgroUs</span>
      </Link>
      <Label className="mt-2">{peran}</Label>
    </div>
  );
}

/**
 * Item nav. Aktif ditandai region kecil yang UTUH — ground ungu, tipe kertas — bukan
 * aturan berwarna di tepi kiri. Batang tepi setebal 2px+ pada item daftar adalah kebiasaan
 * permukaan yang dunia ini tidak pernah pilih; pil dan tombol di kit ini sudah menandai
 * "terpilih" dengan cara yang sama, jadi nav memakai kosakata yang sudah ada.
 */
function TautanNav({
  item,
  aktif,
  onNavigasi,
}: {
  item: ItemMenu;
  aktif: boolean;
  onNavigasi?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigasi}
      aria-current={aktif ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-[14px] font-semibold transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu",
        aktif
          ? "bg-ungu text-kertas-terang"
          : "text-tinta-lembut hover:bg-kertas hover:text-tinta",
      )}
    >
      <Ikon dari={item.ikon} ukuran="md" />
      <span className="min-w-0 truncate">{item.nama}</span>
    </Link>
  );
}

function KakiAkun({
  nama,
  keluar,
  rapat,
}: {
  nama?: string;
  keluar: () => void;
  rapat?: boolean;
}) {
  return (
    <div className={cn("border-t border-kertas-garis", rapat ? "" : "px-5 py-4")}>
      {nama ? (
        <>
          <Label>Masuk sebagai</Label>
          <p className="mt-1 truncate text-[14px] font-semibold text-tinta">{nama}</p>
        </>
      ) : null}
      <button
        type="button"
        onClick={keluar}
        className={cn(
          "-ml-1 mt-2 inline-flex items-center gap-2 px-1 py-2 text-[13px] font-semibold text-tinta-lembut",
          "transition-colors duration-150 hover:text-jambu",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu",
          rapat && !nama ? "mt-0" : "",
        )}
      >
        <Ikon dari={LogOut} ukuran="sm" />
        Keluar
      </button>
    </div>
  );
}
