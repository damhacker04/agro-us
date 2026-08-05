"use client";

import React from "react";
import { Filter, Download, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CommodityMasterDataPage() {
  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Master Data Komoditas</h1>
          <p className="text-gray-600 font-medium">Manage agricultural commodity standards and grading criteria.</p>
        </div>
        <button className="px-6 py-3 bg-[#022c22] text-white font-bold rounded-lg shadow-sm hover:bg-[#064e3b] transition flex items-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Komoditas
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
          <div className="text-sm text-gray-500 font-medium">Showing 1 to 2 of 2 entries</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-gray-200">
                <th className="px-6 py-5 text-xs font-bold text-gray-600 uppercase tracking-widest text-left">KOMODITAS</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-600 uppercase tracking-widest text-left">RENDEMEN RATA-RATA</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-600 uppercase tracking-widest text-left">TOLERANSI SUSUT</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-600 uppercase tracking-widest text-left">KRITERIA GRADE A</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-600 uppercase tracking-widest">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              
              <tr className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">🍅</span>
                    <span className="font-bold text-gray-900 text-base">Tomat Beef</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-sm font-medium text-gray-700 text-left">20 Ton/Ha</td>
                <td className="px-6 py-6 text-left">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Maks. 3%
                  </span>
                </td>
                <td className="px-6 py-6 text-sm text-gray-600 font-medium text-left">
                  Grade A: &gt;150g per buah
                </td>
                <td className="px-6 py-6">
                  <Link href="/operator/commodity/CMD-001">
                    <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mx-auto">
                      <Edit2 className="w-4 h-4 text-emerald-700" /> Edit
                    </button>
                  </Link>
                </td>
              </tr>

              <tr className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-6 text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">🥬</span>
                    <span className="font-bold text-gray-900 text-base">Sawi Pakcoy</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-sm font-medium text-gray-700 text-left">15 Ton/Ha</td>
                <td className="px-6 py-6 text-left">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Maks. 5%
                  </span>
                </td>
                <td className="px-6 py-6 text-sm text-gray-600 font-medium text-left">
                  Grade A: Daun Utuh 95%
                </td>
                <td className="px-6 py-6">
                  <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mx-auto">
                    <Edit2 className="w-4 h-4 text-emerald-700" /> Edit
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end bg-[#f8fafc]">
          <div className="flex gap-2">
            <button className="p-1 text-gray-400 hover:text-gray-700 transition" disabled><ChevronLeft className="w-5 h-5" /></button>
            <button className="w-8 h-8 rounded bg-[#022c22] text-white font-bold text-sm flex items-center justify-center shadow-sm">1</button>
            <button className="p-1 text-gray-400 hover:text-gray-700 transition" disabled><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
