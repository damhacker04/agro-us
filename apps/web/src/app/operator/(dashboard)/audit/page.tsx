"use client";

import React from "react";
import { ShieldCheck, Lock, RefreshCw } from "lucide-react";

export default function AuditHashAnchorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Keamanan & Audit Kriptografi</h1>
        <p className="text-gray-600 font-medium">Verifikasi integritas buku besar escrow melalui penjangkaran hash harian.</p>
      </div>

      <div className="bg-[#2f5c40] rounded-xl p-5 mb-8 flex items-center gap-4 shadow-md">
        <div className="bg-[#244732] rounded-full p-2 text-[#4ade80]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="text-[#4ade80] font-bold text-lg font-serif">
          Status Root Hash Harian: VALID (Tidak ada manipulasi database)
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-slate-700 shadow-xl overflow-hidden text-slate-300">
        <div className="px-8 py-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white font-serif">Log Hash Root Harian (Append-Only)</h2>
        </div>

        <div className="p-8 space-y-6">
          
          <div className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-400 mb-2">04 Ags 2026</div>
              <code className="text-sm text-slate-300 bg-[#1e293b] px-3 py-1.5 rounded-md border border-slate-600 inline-block font-mono">
                0x8f3c4e92d1a5b8c7f0e9d8c7b6a51234b1a9
              </code>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border border-[#22c55e] text-[#22c55e] bg-[#052e16]">
                MATCH
              </span>
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-400 mb-2">03 Ags 2026</div>
              <code className="text-sm text-slate-300 bg-[#1e293b] px-3 py-1.5 rounded-md border border-slate-600 inline-block font-mono">
                0x7e2d5f1a3b8c9d0e1f2a3b4c5d6e7f8g9h0c2b8
              </code>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border border-[#22c55e] text-[#22c55e] bg-[#052e16]">
                MATCH
              </span>
            </div>
          </div>

        </div>

        <div className="px-8 py-6 bg-[#0f172a] border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
              Hash di atas telah dipatri secara kriptografis ke dalam penyimpanan write-once untuk mencegah perubahan historis.
            </p>
          </div>
          <button className="shrink-0 flex items-center gap-2 px-6 py-3 bg-[#334155] hover:bg-[#475569] text-white font-bold rounded-lg transition-colors border border-slate-600 shadow-sm">
            <RefreshCw className="w-4 h-4" /> Sinkronisasi Hash Log (Write-Once)
          </button>
        </div>
      </div>
    </div>
  );
}
