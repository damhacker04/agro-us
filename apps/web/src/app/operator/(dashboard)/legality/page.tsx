"use client";

import React, { use } from "react";
import { Search, ChevronDown, CheckCircle2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function LegalityQueuePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = use(searchParams);
  const view = resolvedSearchParams?.view as string || 'pending';
  const isCompleted = view === 'completed';

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-8">Antrean Legalitas Tenant</h1>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari Nama Farm..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer">
          Status: PENDING <ChevronDown className="w-4 h-4 ml-2" />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8] border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">TANGGAL DAFTAR</th>
                <th className="px-6 py-4 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">NAMA FARM</th>
                <th className="px-6 py-4 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">NIK / NIB TERSUBMIT</th>
                <th className="px-6 py-4 text-xs font-bold text-[#475569] uppercase tracking-widest">STATUS</th>
                <th className="px-6 py-4 text-xs font-bold text-[#475569] uppercase tracking-widest">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              
              {/* Row 1: Farm Fresh Berdikari */}
              <tr className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6 text-sm font-medium text-gray-800 text-left">04 Ags 2026</td>
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#fed7aa] text-[#c2410c] flex items-center justify-center font-bold text-sm shrink-0">F</div>
                    <span className="text-sm font-semibold text-gray-800">Farm Fresh Berdikari</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Ada KTP & NIB
                  </div>
                </td>
                <td className="px-6 py-6">
                  {isCompleted ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#fecaca] text-[#991b1b] capitalize tracking-wider">
                      Ditolak
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#fed7aa] text-[#9a3412] uppercase tracking-wider">
                      PENDING
                    </span>
                  )}
                </td>
                <td className="px-6 py-6">
                  <Link href="/operator/legality/farm-fresh-berdikari">
                    {isCompleted ? (
                      <button className="px-6 py-2 bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-sm font-bold rounded-lg shadow-sm hover:bg-[#fecaca] hover:shadow transition-all group-hover:-translate-y-0.5">Lihat Detail</button>
                    ) : (
                      <button className="px-6 py-2 bg-[#4b5563] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#374151] hover:shadow transition-all group-hover:-translate-y-0.5">Tinjau</button>
                    )}
                  </Link>
                </td>
              </tr>

              {/* Row 2: Tani Jaya */}
              <tr className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6 text-sm font-medium text-gray-800 text-left">03 Ags 2026</td>
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#d1fae5] text-[#047857] flex items-center justify-center font-bold text-sm shrink-0">T</div>
                    <span className="text-sm font-semibold text-gray-800">Tani Jaya</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                    <Info className="w-4 h-4" /> Hanya KTP
                  </div>
                </td>
                <td className="px-6 py-6">
                  {isCompleted ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#bbf7d0] text-[#166534] capitalize tracking-wider">
                      Disetujui
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#fed7aa] text-[#9a3412] uppercase tracking-wider">
                      PENDING
                    </span>
                  )}
                </td>
                <td className="px-6 py-6">
                  <Link href="/operator/legality/tani-jaya">
                    {isCompleted ? (
                      <button className="px-6 py-2 bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] text-sm font-bold rounded-lg shadow-sm hover:bg-[#bbf7d0] hover:shadow transition-all group-hover:-translate-y-0.5">Lihat Detail</button>
                    ) : (
                      <button className="px-6 py-2 bg-[#4b5563] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#374151] hover:shadow transition-all group-hover:-translate-y-0.5">Tinjau</button>
                    )}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-[#f8fafc]">
          <span className="text-sm text-gray-500 font-medium">Menampilkan 2 dari 2 data</span>
          <div className="flex gap-2 text-gray-400">
            <button className="p-1 hover:text-gray-700 transition" disabled><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-1 hover:text-gray-700 transition" disabled><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
