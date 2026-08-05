"use client";

import React from "react";
import { Info, Search, Filter, ChevronLeft, ChevronRight, TriangleAlert, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SatelliteQueuePage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-8">Antrean Anomali Satelit (NDVI)</h1>

      {/* Info Box */}
      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-5 mb-8 flex gap-4 shadow-sm items-start">
        <div className="bg-[#0369a1] text-white p-1 rounded-full shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0369a1]">Filter Deteksi Anomali Aktif</h3>
          <p className="text-sm text-[#0369a1] mt-1 leading-relaxed">
            Sistem saat ini menandai batch di mana terdapat selisih antara laporan tanam manual dan deteksi vegetasi satelit (NDVI) sebesar <strong>7 hingga 21 hari</strong>. Anomali ini membutuhkan investigasi untuk memastikan kepatuhan tenant.
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Antrean Investigasi Aktif</h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">ID BATCH</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">KOMODITAS</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">LAPORAN TANAM</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">DETEKSI SATELIT</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">SELISIH</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">B-1001</td>
                <td className="px-6 py-5 text-left">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                    <span className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">🍅</span>
                    Tomat Beef
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700 text-left">01 Ags 2023</td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700 text-left">13 Ags 2023</td>
                <td className="px-6 py-5 text-left">
                  <div className="inline-flex items-center gap-1.5 text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded border border-red-200">
                    <TriangleAlert className="w-4 h-4" /> 12 Hari
                  </div>
                </td>
                <td className="px-6 py-5">
                  <Link href="/operator/satellite/B-1001">
                    <button className="px-5 py-2.5 bg-[#334155] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1e293b] transition-all flex items-center justify-center gap-2 mx-auto">
                      <Search className="w-4 h-4" /> Investigasi
                    </button>
                  </Link>
                </td>
              </tr>

              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">B-1022</td>
                <td className="px-6 py-5 text-left">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                    <span className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">🥬</span>
                    Sawi
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700 text-left">10 Ags 2023</td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700 text-left">18 Ags 2023</td>
                <td className="px-6 py-5 text-left">
                  <div className="inline-flex items-center gap-1.5 text-yellow-700 text-sm font-bold bg-yellow-50 px-3 py-1.5 rounded border border-yellow-200">
                    <AlertCircle className="w-4 h-4" /> 8 Hari
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="px-5 py-2.5 bg-[#334155] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1e293b] transition-all flex items-center justify-center gap-2 mx-auto">
                    <Search className="w-4 h-4" /> Investigasi
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
        
        <div className="p-8 text-center border-t border-gray-100">
          <p className="text-sm text-gray-400 font-medium">Akhir dari antrean anomali saat ini.</p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
          <span className="text-sm text-gray-500 font-medium">Menampilkan 1–2 dari 2 anomali</span>
          <div className="flex gap-2 text-gray-400">
            <button className="p-1 hover:text-gray-700 transition" disabled><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-1 hover:text-gray-700 transition" disabled><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
