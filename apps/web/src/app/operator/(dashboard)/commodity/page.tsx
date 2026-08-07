"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, Plus, Sprout } from "lucide-react";
import type { CommoditySummary } from "@agro-os/shared";
import { GalatApi, ambilKomoditasOperator } from "@/lib/api";

/**
 * Daftar komoditas (OP-10).
 *
 * Tiga angka di tiap baris punya konsekuensi berbeda dan semuanya berat:
 * rendemen membatasi kuota PO seluruh Tenant, toleransi susut menentukan klaim mutu
 * mana yang sah, dan umur tanam menjadi pagar kewajaran tanggal panen.
 */
export default function OperatorCommodityPage() {
  const [komoditas, setKomoditas] = useState<CommoditySummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilKomoditasOperator()
      .then((d) => { setKomoditas(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat komoditas"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{galat}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Manajemen Komoditas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Angka di sini berlaku untuk seluruh Tenant — rendemen membatasi kuota, toleransi
            susut menentukan klaim yang sah, umur tanam menjadi pagar tanggal panen.
          </p>
        </div>
        <Link href="/operator/commodity/baru"
          className="shrink-0 flex items-center gap-2 bg-emerald-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-800">
          <Plus className="w-4 h-4" /> Tambah
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Komoditas</th>
              <th className="text-right font-semibold px-4 py-3">Rendemen (kg/ha)</th>
              <th className="text-right font-semibold px-4 py-3">Toleransi susut</th>
              <th className="text-right font-semibold px-4 py-3">Umur tanam</th>
            </tr>
          </thead>
          <tbody>
            {komoditas.map((k) => (
              <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/operator/commodity/${k.id}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-emerald-700">
                    {k.category === "DAUN" ? (
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Sprout className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    {k.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {k.avgYieldKgPerHa.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{k.shrinkTolerancePct}%</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {(k as CommoditySummary & { growingDaysMin?: number }).growingDaysMin ?? "—"} hari
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
