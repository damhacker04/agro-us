"use client";

import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import type { OperatorEscrowSummary } from "@agro-os/shared";
import { GalatApi, ambilEscrowOperator } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function OperatorEscrowPage() {
  const [data, setData] = useState<OperatorEscrowSummary | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilEscrowOperator()
      .then((d) => {
        setData(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat escrow"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat escrow…</div>;

  if (galat || !data) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Data tidak tersedia"}
        </div>
      </div>
    );
  }

  const RINCIAN = [
    ["Total pernah ditahan", data.totalDitahan],
    ["Sudah dicairkan ke Tenant", data.totalDicairkan],
    ["Potongan klaim mutu", data.totalPotonganKlaim],
    ["Dikembalikan ke pembeli", data.totalRefund],
    ["Biaya pembatalan", data.totalBiayaBatal],
    ["Dialihkan lewat substitusi", data.totalAlihSubstitusi],
  ] as const;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950">Escrow Seluruh Tenant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ledger bersifat append-only — angka di sini hasil penjumlahan entri, bukan saldo
          yang bisa disunting.
        </p>
      </div>

      <div className="bg-[#1e5033] text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-semibold text-emerald-100">Total Dana Tertahan</div>
          <Wallet className="w-5 h-5 text-emerald-200" />
        </div>
        <div className="text-4xl font-black tracking-tight">{rp(data.tertahan)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {RINCIAN.map(([label, nilai]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-[11px] font-bold text-gray-500 mb-1">{label}</div>
            <div className="text-lg font-bold text-gray-900">{rp(nilai)}</div>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-emerald-950 mb-3">Per Tenant</h2>
      {data.perTenant.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Belum ada entri escrow.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Tenant</th>
                <th className="text-right font-semibold px-4 py-3">Pernah ditahan</th>
                <th className="text-right font-semibold px-4 py-3">Dicairkan</th>
                <th className="text-right font-semibold px-4 py-3">Tertahan</th>
              </tr>
            </thead>
            <tbody>
              {data.perTenant.map((t) => (
                <tr key={t.tenantId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.companyName}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{rp(t.ditahan)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{rp(t.dicairkan)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {rp(t.tertahan)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
