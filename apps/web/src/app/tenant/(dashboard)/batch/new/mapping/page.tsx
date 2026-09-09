"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Halaman, Sunyi } from "@/ui";

/**
 * Rute lama yang menawarkan pemetaan lahan di tengah alur buka kuota.
 *
 * Alurnya tidak begitu: buka kuota MEMILIH petak yang sudah terdaftar, karena batas
 * kuotanya dihitung dari luas petak yang sudah diverifikasi server. Memetakan lahan
 * baru sambil membuka kuota berarti kuotanya dihitung dari poligon yang belum tersimpan.
 *
 * Diarahkan ke pemetaan lahan yang sebenarnya; setelah tersimpan, petaknya muncul
 * sebagai pilihan di layar Buka Kuota.
 *
 * Kalimatnya DIPERTAHANKAN, hanya dipindah ke dunia ini. Pengalihan biasanya selesai dalam
 * satu bingkai, tetapi "biasanya" bukan "selalu": pada sambungan yang buruk — dan Tenant
 * memang bekerja di sambungan yang buruk — layar kosong tanpa sepatah kata pun tidak bisa
 * dibedakan dari halaman yang gagal memuat.
 */
export default function BatchNewMappingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tenant/land/mapping");
  }, [router]);

  return (
    <Halaman lebar="sempit" className="min-h-screen">
      <Sunyi>Mengalihkan ke pemetaan lahan…</Sunyi>
    </Halaman>
  );
}
