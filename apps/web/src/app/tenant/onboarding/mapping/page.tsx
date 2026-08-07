"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PetaLahan } from "@/components/PetaLahan";

/**
 * Langkah 2 onboarding — petakan petak lahan pertama.
 *
 * Memakai penangkap poligon yang sama persis dengan Manajemen Lahan. Menyalinnya
 * menjadi versi tersendiri hanya akan membuat dua tempat yang bisa berbeda diam-diam
 * soal apa yang dikirim ke PostGIS.
 */
export default function TenantOnboardingMappingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">
            Langkah 2 dari 3
          </p>
          <h1 className="text-2xl font-bold text-emerald-950">Petakan Lahan Pertama</h1>
          <p className="text-sm text-gray-500 mt-1">
            Poligon inilah yang dibandingkan dengan citra satelit untuk memverifikasi klaim
            panen Anda nanti.
          </p>
        </div>

        <PetaLahan setelahSimpan={() => router.push("/tenant/onboarding/confirmation")} />
      </div>
    </main>
  );
}
