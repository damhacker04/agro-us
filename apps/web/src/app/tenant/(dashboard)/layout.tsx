"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  LayoutDashboard,
  Map,
  PackageSearch,
  ShoppingBag,
  Sprout,
  Star,
  Wallet,
} from "lucide-react";
import { ambilProfilTenant } from "@/lib/api";
import { hapusSesi } from "@/lib/auth";
import { Cangkang, type ItemMenu } from "@/ui";

/**
 * Cangkang Tenant — produsen yang bekerja di kebun, sambil berdiri, sering satu tangan.
 *
 * Justru peran inilah yang paling dirugikan cangkang sebelumnya: sidebar 256px-nya tidak
 * pernah disembunyikan, jadi di layar 375px isi halaman disisakan 119px — dan Tenant
 * adalah satu-satunya peran yang PRODUCT.md nyatakan bekerja di lapangan. Navigasi
 * ponselnya kini ada.
 *
 * Yang juga hilang: `h-screen overflow-hidden` di akar, yang mengunci gulir aplikasi ke
 * dalam satu wadah, dan kaki halaman berisi tiga tautan `href="#"` menuju halaman yang
 * tidak pernah dibuat.
 */
const MENU: ItemMenu[] = [
  { nama: "Dashboard", href: "/tenant", ikon: LayoutDashboard },
  { nama: "Katalog produk", href: "/tenant/catalog", ikon: PackageSearch },
  { nama: "Manajemen pesanan", href: "/tenant/orders", ikon: ShoppingBag },
  { nama: "Manajemen lahan", href: "/tenant/land", ikon: Map },
  { nama: "Manajemen batch", href: "/tenant/batch", ikon: Layers },
  { nama: "Keuangan & escrow", href: "/tenant/finance", ikon: Wallet },
  { nama: "Rekomendasi tanam", href: "/tenant/recommendation", ikon: Sprout },
  { nama: "Reputasi", href: "/tenant/reputation", ikon: Star },
];

export default function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Nama perusahaan diambil sekali di cangkang supaya tiap halaman anak tidak perlu
  // memanggil /tenant/profile sendiri-sendiri.
  const [namaUsaha, setNamaUsaha] = useState<string | undefined>(undefined);
  useEffect(() => {
    ambilProfilTenant()
      .then((p) => setNamaUsaha(p.companyName))
      .catch(() => {
        /* Kepala cangkang bukan alasan menggagalkan halaman — biarkan kosong. */
      });
  }, []);

  return (
    <Cangkang
      peran="Produsen"
      beranda="/tenant"
      nama={namaUsaha}
      menu={MENU}
      keluar={() => {
        hapusSesi();
        router.push("/");
      }}
    >
      {children}
    </Cangkang>
  );
}
