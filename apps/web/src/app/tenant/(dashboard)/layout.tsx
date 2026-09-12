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
import { GalatApi, ambilProfilTenant } from "@/lib/api";
import { akhiriSesi } from "@/lib/auth";
import { RUTE_ONBOARDING_TENANT } from "@/lib/rute-masuk";
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
      .catch((err) => {
        // Profil yang MEMANG belum dibuat bukan galat tampilan: onboarding-nya
        // dilanjutkan di sini, supaya membuka /tenant dari riwayat peramban tidak
        // berakhir pada dasbor yang seluruh datanya menjawab TENANT_NOT_FOUND.
        if (err instanceof GalatApi && (err.kode === "TENANT_NOT_FOUND" || err.status === 404)) {
          router.replace(RUTE_ONBOARDING_TENANT);
          return;
        }
        /* Kegagalan lain: kepala cangkang bukan alasan menggagalkan halaman. */
      });
  }, [router]);

  return (
    <Cangkang
      peran="Produsen"
      beranda="/tenant"
      nama={namaUsaha}
      menu={MENU}
      keluar={() => {
        akhiriSesi();
        router.push("/");
      }}
    >
      {children}
    </Cangkang>
  );
}
