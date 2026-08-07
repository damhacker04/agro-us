"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PetaLahan } from "@/components/PetaLahan";

export default function TenantMappingPage() {
  const router = useRouter();

  return (
    <div className="p-8 pb-20 max-w-3xl mx-auto">
      <Link
        href="/tenant/land"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Lahan
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Petakan Lahan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Luas dihitung server dari poligon Anda, tidak diketik sendiri. Poligon inilah yang
        dibandingkan dengan citra satelit untuk memverifikasi klaim panen.
      </p>

      <PetaLahan setelahSimpan={() => router.push("/tenant/land")} />
    </div>
  );
}
