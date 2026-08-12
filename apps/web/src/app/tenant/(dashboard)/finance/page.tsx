"use client";

import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { GalatApi, ambilEscrow } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function FinancePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof ambilEscrow>> | null>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilEscrow()
      .then((d) => { setData(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat escrow"));
  }, []);

  if (galat) return <div className="p-8"><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{galat}</div></div>;
  if (!data) return <div className="p-8 text-sm text-gray-500">Memuat keuangan…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Escrow &amp; Pencairan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Dana pembeli ditahan sampai pengiriman selesai dan jendela klaim mutu berakhir.
        Pencairan berjalan otomatis, tidak perlu diajukan.
      </p>

      <div className="bg-emerald-950 text-white rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold tracking-wider mb-2">
          <Wallet className="w-4 h-4" /> MASIH TERTAHAN
        </div>
        <div className="text-3xl font-bold">{rp(data.tertahan)}</div>
      </div>

      {/* Dana yang sudah lepas dari escrow tetapi belum sampai ke rekening. Ditampilkan
          terpisah, bukan digabung ke "sudah dicairkan": instruksi ke mitra pembayaran
          berizin belum tersambung (§5.7.1), dan menyembunyikannya berarti Tenant menunggu
          uang yang ia kira sudah dikirim. */}
      {data.menungguPenyaluran > 0 && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-1 text-xs font-bold text-amber-900">
            Menunggu penyaluran ke rekening
          </div>
          <div className="text-xl font-bold text-amber-900">{rp(data.menungguPenyaluran)}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            Dana ini sudah lepas dari escrow dan menjadi hak Anda, tetapi instruksi transfer ke
            rekening belum berhasil dikirim. Kami menampilkannya apa adanya alih-alih
            menyatakannya sudah cair.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          ["Total pernah ditahan", data.totalDitahan],
          ["Sudah dicairkan", data.totalDicairkan],
          ["Potongan klaim mutu", data.totalPotonganKlaim],
          ["Dikembalikan ke pembeli", data.totalRefund],
        ].map(([label, nilai]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{label as string}</div>
            <div className="font-bold text-gray-900">{rp(nilai as number)}</div>
          </div>
        ))}
      </div>

      {/* Ledger bersifat append-only (§6.1): koreksi selalu berupa entri baru, tidak pernah
          menimpa yang lama. Rinciannya ditampilkan apa adanya supaya Tenant bisa menelusuri
          sendiri dari mana angkanya berasal. */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
        <h2 className="font-bold text-sm text-gray-900 mb-3">Rincian per jenis entri</h2>
        <div className="space-y-2">
          {Object.entries(data.rincian).map(([jenis, nilai]) => (
            <div key={jenis} className="flex justify-between text-sm">
              <span className="text-gray-600">{jenis.replace(/_/g, " ")}</span>
              <span className="font-semibold text-gray-900">{rp(nilai)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
