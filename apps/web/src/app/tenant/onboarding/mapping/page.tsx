"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PetaLahan } from "@/components/PetaLahan";
import { Halaman } from "@/ui";

/**
 * Langkah 2 onboarding — petakan petak lahan pertama.
 *
 * Memakai penangkap poligon yang sama persis dengan Manajemen Lahan. Menyalinnya
 * menjadi versi tersendiri hanya akan membuat dua tempat yang bisa berbeda diam-diam
 * soal apa yang dikirim ke PostGIS.
 *
 * IKUT BERMIGRASI karena `PetaLahan` bermigrasi: halaman yang setengah dunia lama dan
 * setengah dunia baru lebih buruk daripada yang belum tersentuh sama sekali. Konsekuensinya
 * jujur dan dicatat di MIGRASI.md — alur onboarding kini campur ANTAR-LANGKAH sampai empat
 * halaman sisanya menyusul.
 */
export default function TenantOnboardingMappingPage() {
  const router = useRouter();

  return (
    <Halaman
      lebar="sempit"
      className="min-h-screen"
      judul="Petakan lahan pertama"
      pengantar="Poligon inilah yang dibandingkan dengan citra satelit untuk memverifikasi klaim panen Anda nanti. Menandainya sekali dengan benar menentukan seluruh siklus setelahnya."
    >
      <PetaLahan setelahSimpan={() => router.push("/tenant/onboarding/confirmation")} />
    </Halaman>
  );
}
