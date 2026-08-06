"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode } from "lucide-react";

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
 */
function Pengarah() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  useEffect(() => {
    if (token) router.replace(`/scan/${encodeURIComponent(token)}`);
  }, [token, router]);

  if (token) return <div className="min-h-screen bg-[#f0f4f8]" />;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0a1c38] mb-2">Pindai QR pada Box</h1>
        <p className="text-sm text-gray-600">
          Kode Antar hanya bisa dimasukkan setelah QR box dipindai — QR itulah yang
          menentukan pengiriman mana yang Anda bawa. Gunakan kamera ponsel Anda pada
          stiker QR di box.
        </p>
      </div>
    </main>
  );
}

export default function KodeAntarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f4f8]" />}>
      <Pengarah />
    </Suspense>
  );
}
