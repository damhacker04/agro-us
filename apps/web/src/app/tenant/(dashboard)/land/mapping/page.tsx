"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PetaLahan } from "@/components/PetaLahan";
import { Halaman, TautanKembali } from "@/ui";

export default function TenantMappingPage() {
  const router = useRouter();

  return (
    <Halaman
      lebar="sempit"
      kembali={<TautanKembali href="/tenant/land">Lahan</TautanKembali>}
      judul="Petakan lahan"
      pengantar="Luas dihitung server dari poligon Anda, tidak diketik sendiri. Poligon inilah yang dibandingkan dengan citra satelit untuk memverifikasi klaim panen — jadi menandainya sekali dengan benar menentukan seluruh siklus setelahnya."
    >
      <PetaLahan
        setelahSimpan={(l) => router.push(`/tenant/land/confirmation?id=${l.id}`)}
      />
    </Halaman>
  );
}
