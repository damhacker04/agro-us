"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Halaman, Panel, Prosa } from "@/ui";

/**
 * Pengarah menuju alur Kode Antar yang sebenarnya.
 *
 * Verifikasi kode WAJIB membawa token QR box: endpoint-nya `POST /scan/:token/verify`,
 * dan tokenlah yang menentukan pengiriman mana yang dibuka sekaligus menghitung sisa
 * percobaan. Halaman tanpa token tidak punya cara memverifikasi apa pun ke server —
 * versi sebelumnya membandingkan dengan PIN tetap di kode FE, yang berarti kode apa pun
 * yang diketik tidak pernah benar-benar diperiksa.
 *
 * Jadi: kalau token ada di query, teruskan; kalau tidak, minta kurir memindai QR-nya.
 *
 * Ikon QR yang dulu berdiri di atas judul DIHAPUS, bukan digaya ulang. Ia tidak menandai
 * apa pun yang judulnya belum katakan, dan halaman ini dibuka kurir yang baru saja gagal
 * masuk — satu glif dekoratif di puncaknya menunda kalimat yang benar-benar mereka butuhkan.
 */
function Pengarah() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  useEffect(() => {
    if (token) router.replace(`/scan/${encodeURIComponent(token)}`);
  }, [token, router]);

  if (token) return <Kosongan />;

  return (
    <Halaman lebar="sempit" className="flex min-h-screen items-center">
      <Panel label="Kode Antar" judul="Pindai QR pada box" nada="kabar">
        <Prosa className="text-[15px]">
          Kode Antar hanya bisa dimasukkan setelah QR box dipindai — QR itulah yang menentukan
          pengiriman mana yang Anda bawa. Arahkan kamera ponsel Anda ke stiker QR di box; tidak
          ada aplikasi yang perlu dipasang.
        </Prosa>
      </Panel>
    </Halaman>
  );
}

/** Ground yang sama dengan halaman tujuannya, supaya pengalihan tidak berkedip putih. */
function Kosongan() {
  return <div className="min-h-screen bg-kertas" />;
}

export default function KodeAntarPage() {
  return (
    <Suspense fallback={<Kosongan />}>
      <Pengarah />
    </Suspense>
  );
}
