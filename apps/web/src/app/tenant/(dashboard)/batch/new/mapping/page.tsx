"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rute lama yang menawarkan pemetaan lahan di tengah alur buka kuota.
 *
 * Alurnya tidak begitu: buka kuota MEMILIH petak yang sudah terdaftar, karena batas
 * kuotanya dihitung dari luas petak yang sudah diverifikasi server. Memetakan lahan
 * baru sambil membuka kuota berarti kuotanya dihitung dari poligon yang belum tersimpan.
 *
 * Diarahkan ke pemetaan lahan yang sebenarnya; setelah tersimpan, petaknya muncul
 * sebagai pilihan di layar Buka Kuota.
 */
export default function BatchNewMappingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tenant/land/mapping");
  }, [router]);

  return <div className="p-8 text-sm text-gray-500">Mengalihkan ke pemetaan lahan…</div>;
}
