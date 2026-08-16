"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Compass,
  FileCheck2,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  Satellite,
  Scale,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Cangkang, type ItemMenu } from "@/ui";

/**
 * Cangkang Operator — konsol antrean kerja.
 *
 * Isinya kini data saja; bingkainya milik `<Cangkang>`. Yang hilang dari versi sebelumnya
 * dan memang sengaja: tombol "Settings" yang tidak pernah menuju ke mana-mana, dan tagline
 * "Super Admin Console". Kendali yang tidak melakukan apa-apa lebih buruk daripada kendali
 * yang tidak ada — ia menghabiskan satu klik sebelum orang tahu itu.
 */
const MENU: ItemMenu[] = [
  { nama: "Dashboard", href: "/operator", ikon: LayoutDashboard },
  { nama: "Antrean legalitas", href: "/operator/legality", ikon: FileCheck2 },
  { nama: "Antrean klaim", href: "/operator/claims", ikon: Receipt },
  { nama: "Verifikasi satelit", href: "/operator/satellite", ikon: Satellite },
  { nama: "Tinjauan kewajaran", href: "/operator/kewajaran", ikon: Scale },
  { nama: "Umur simpan", href: "/operator/umur-simpan", ikon: Timer },
  { nama: "Manajemen zona", href: "/operator/zone", ikon: Compass },
  { nama: "Manajemen komoditas", href: "/operator/commodity", ikon: LayoutGrid },
  { nama: "Escrow", href: "/operator/escrow", ikon: Banknote },
  { nama: "Audit hash anchor", href: "/operator/audit", ikon: ShieldCheck },
];

export default function OperatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Cangkang
      peran="Operator"
      beranda="/operator"
      menu={MENU}
      keluar={() => router.push("/auth/operator/login")}
    >
      {children}
    </Cangkang>
  );
}
