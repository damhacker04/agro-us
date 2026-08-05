"use client";

import React from "react";
import { Filter, Download, ExternalLink, Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default function EscrowLedgerPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Buku Besar Escrow (Append-Only)</h1>
        <p className="text-gray-600 font-medium">Audit trail mutasi dana untuk transparansi finansial platform.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="text-sm text-gray-500 font-medium">Showing <strong className="font-bold text-gray-800">1–3</strong> of 1,204 records</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#eff6ff] border-b border-gray-200">
                <th className="px-6 py-5 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">WAKTU (TIME)</th>
                <th className="px-6 py-5 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">TX-ID</th>
                <th className="px-6 py-5 text-xs font-bold text-[#475569] uppercase tracking-widest text-left">REFERENSI PO</th>
                <th className="px-6 py-5 text-xs font-bold text-[#475569] uppercase tracking-widest text-center">TIPE MUTASI</th>
                <th className="px-6 py-5 text-xs font-bold text-[#475569] uppercase tracking-widest text-right">NOMINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              
              {/* Row 1 */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> 14:00</span>
                    <span className="text-xs text-gray-500 ml-5 font-medium">Today</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-600 text-left">TX-9901</td>
                <td className="px-6 py-5 text-left">
                  <a href="#" className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-sm transition-colors group">
                    PO-0950 <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-emerald-100 text-emerald-800 uppercase">
                    RELEASE
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-bold text-emerald-600 text-sm">
                  + Rp 4.000.000
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> 11:30</span>
                    <span className="text-xs text-gray-500 ml-5 font-medium">Today</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-600 text-left">TX-9900</td>
                <td className="px-6 py-5 text-left">
                  <a href="#" className="inline-flex items-center gap-1.5 text-[#0a1c38] hover:text-[#1e3a8a] font-bold text-sm transition-colors group">
                    KLM-091 <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-red-100 text-red-700 uppercase">
                    POTONG_KLAIM
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-bold text-red-600 text-sm">
                  - Rp 1.125.000
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-5 text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> 09:15</span>
                    <span className="text-xs text-gray-500 ml-5 font-medium">Today</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-600 text-left">TX-9899</td>
                <td className="px-6 py-5 text-left">
                  <a href="#" className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-sm transition-colors group">
                    PO-0991 <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                  </a>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-orange-100 text-orange-800 uppercase">
                    HOLD
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-medium text-gray-600 text-sm">
                  Rp 7.500.000
                </td>
              </tr>

            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center bg-white">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-700 transition" disabled><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded bg-[#022c22] text-white font-bold text-sm flex items-center justify-center shadow-sm">1</button>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 font-bold text-sm flex items-center justify-center transition">2</button>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 font-bold text-sm flex items-center justify-center transition">3</button>
            <span className="text-gray-400 px-1">...</span>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 font-bold text-sm flex items-center justify-center transition">40</button>
            <button className="p-2 text-gray-500 hover:text-gray-800 transition"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
