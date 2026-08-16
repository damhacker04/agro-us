"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Search, SearchCode, ShoppingCart } from "lucide-react";
import { jumlahItem } from "@/lib/keranjang";
import { Cangkang, Ikon, Label, Pil, type ItemMenu } from "@/ui";

/**
 * Cangkang Pembeli.
 *
 * Tiga hal yang rusak di versi sebelumnya diperbaiki di sini, dan dua di antaranya bukan
 * soal rupa:
 *
 * 1. PENCARIAN TIDAK PERNAH TERSAMBUNG. `handleSearch` ditulis lengkap, tetapi input-nya
 *    tidak pernah diberi `onChange` — sementara halaman katalog memang membaca `q` dari
 *    query string. Jadi kotak pencarian pembeli tidak melakukan apa pun sejak awal, dan
 *    tidak ada galat di mana pun yang menunjukkannya. Sekarang tersambung.
 *
 * 2. LENCANA KERANJANG DIPAKU "3". Sekarang membaca isi keranjang yang sebenarnya, dan
 *    dibaca di `useEffect` karena sumbernya `localStorage`: membacanya saat render membuat
 *    markup server dan klien berbeda, dan React membuang seluruh pohonnya.
 *
 * 3. Judul `<h1>Katalog: Kota Malang</h1>` yang dipaku DIHAPUS — nama kotanya bahkan sudah
 *    dihitung dari query string dan dibiarkan tak terpakai. Judul milik halaman.
 *
 * Tautan nav `/buyer/history` juga dibuang: rutenya tidak pernah ada, dan isi tautannya
 * kosong — sebuah target klik tanpa label menuju 404.
 */
const MENU: ItemMenu[] = [
  { nama: "Katalog pasokan", href: "/buyer/catalog", ikon: SearchCode },
  { nama: "Keranjang", href: "/buyer/cart", ikon: ShoppingCart },
  { nama: "Pesanan saya", href: "/buyer/orders", ikon: ClipboardList },
];

function IsiCangkangPembeli({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isiKeranjang, setIsiKeranjang] = useState(0);

  useEffect(() => {
    setIsiKeranjang(jumlahItem());
  }, [pathname]);

  function cari(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) params.set("q", e.target.value);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const diKatalog = pathname.includes("/buyer/catalog");

  return (
    <Cangkang
      peran="Pembeli"
      beranda="/buyer/catalog"
      menu={MENU}
      keluar={() => router.push("/auth/buyer/login")}
      aksi={
        <>
          {diKatalog ? (
            <div className="relative min-w-0 flex-1">
              <label htmlFor="cari-katalog" className="sr-only">
                Cari komoditas di katalog
              </label>
              <Ikon
                dari={Search}
                ukuran="sm"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-samar"
              />
              <input
                id="cari-katalog"
                type="search"
                defaultValue={searchParams.get("q") ?? ""}
                onChange={cari}
                placeholder="Cari sawi, tomat, cabai…"
                className="w-full border border-kertas-garis bg-kertas py-2 pl-9 pr-3 text-[14px] text-tinta placeholder:text-tinta-samar transition-colors duration-150 hover:border-tinta-samar focus:border-tinta focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-ungu"
              />
            </div>
          ) : null}
          <Link
            href="/buyer/region"
            className="text-[13px] font-semibold text-tinta-lembut underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
          >
            Ganti wilayah
          </Link>
          {isiKeranjang > 0 ? (
            <Link
              href="/buyer/cart"
              className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              <Label>Keranjang</Label>
              <Pil nada="utama">{isiKeranjang} box</Pil>
            </Link>
          ) : null}
        </>
      }
    >
      {children}
    </Cangkang>
  );
}

/**
 * `useSearchParams()` membuat komponen ini hanya bisa dirender di klien. Karena dipakai
 * di LAYOUT, seluruh halaman di bawah /buyer ikut terdampak — dan `next build` menolak
 * memprarender semuanya dengan galat "should be wrapped in a suspense boundary".
 *
 * Dibungkus Suspense di sini supaya kerangka halaman tetap bisa dirender lebih dulu di
 * server, sementara bagian yang bergantung pada query string menyusul di klien.
 */
export default function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-kertas" />}>
      <IsiCangkangPembeli>{children}</IsiCangkangPembeli>
    </Suspense>
  );
}
