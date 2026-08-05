"use client";

import React from "react";
import { AlertTriangle, Clock, Satellite } from "lucide-react";
import Link from "next/link";

export default function CommandCenterPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Command Center</h1>
      <p className="text-gray-600 mb-8 font-medium">Pantau antrean tugas dan pelanggaran SLA.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#fee2e2] rounded-xl p-6 shadow-sm border border-red-200 cursor-pointer hover:shadow-md transition">
          <div className="flex items-center gap-2 text-red-800 font-bold mb-4 text-sm">
            <AlertTriangle className="w-4 h-4" />
            SLA Klaim Kritis ({"<"} 2 Jam)
          </div>
          <div className="text-4xl font-bold text-red-700 font-serif mb-4">
            3 Tiket
          </div>
          <div className="text-sm text-red-700 font-bold flex items-center gap-1 group">
            Proses Sekarang <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        <div className="bg-[#fefce8] rounded-xl p-6 shadow-sm border border-yellow-200 cursor-pointer hover:shadow-md transition">
          <div className="flex items-center gap-2 text-yellow-800 font-bold mb-4 text-sm">
            <Clock className="w-4 h-4" />
            Legalitas Menunggu
          </div>
          <div className="text-4xl font-bold text-yellow-700 font-serif mb-4">
            12 Tenant
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
          <div className="flex items-center gap-2 text-[#0a1c38] font-bold mb-4 text-sm">
            <Satellite className="w-4 h-4" />
            Anomali Satelit
          </div>
          <div className="text-4xl font-bold text-[#0a1c38] font-serif mb-4">
            5 Batch
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#0a1c38] font-serif">Antrean Prioritas Lintas Modul</h2>
          <button className="text-gray-400 hover:text-gray-600">
            <div className="flex flex-col gap-1">
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
            </div>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider">ID TIKET</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider">MODUL</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider">KETERANGAN</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider">TENGGAT WAKTU (SLA)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-semibold text-gray-800">KLM-091</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    Klaim Sengketa
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600 font-medium">Tomat Pakcoy Susut 15%</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                    <Clock className="w-4 h-4" /> 1j 45m tersisa
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="px-4 py-2 bg-[#b91c1c] text-white text-sm font-bold rounded hover:bg-red-800 transition">Tinjau</button>
                </td>
              </tr>

              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-semibold text-gray-800">LGL-102</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                    Legalitas
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600 font-medium">Verifikasi NIB Koperasi</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5 text-yellow-600 text-sm font-medium">
                    <Clock className="w-4 h-4" /> 5j 10m tersisa
                  </div>
                </td>
                <td className="px-6 py-5">
                  <Link href="/operator/legality/LGL-102">
                    <button className="px-4 py-2 bg-[#334155] text-white text-sm font-bold rounded hover:bg-slate-800 transition">Tinjau</button>
                  </Link>
                </td>
              </tr>

              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-semibold text-gray-800">SAT-045</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Satelit
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-600 font-medium">Batch Lahan #890 - Anomali Hijau</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                    <Clock className="w-4 h-4" /> 12j 30m tersisa
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-bold rounded hover:bg-blue-200 transition">Tinjau</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">Menampilkan 3 dari 24 tiket</span>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 border border-gray-200 text-gray-400 rounded text-sm font-medium bg-gray-50" disabled>Sebelumnya</button>
            <button className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50">Selanjutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
}
