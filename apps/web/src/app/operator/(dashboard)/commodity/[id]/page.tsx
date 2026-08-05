"use client";

import React from "react";
import { Settings, CheckSquare, TriangleAlert, Save, X } from "lucide-react";
import Link from "next/link";

export default function CommodityEditPage() {
  return (
    <div className="p-8">
      {/* Modal-like container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <h1 className="text-2xl font-bold text-[#0a1c38] font-serif mb-1">Edit Standar Komoditas</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">CMD-001</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 font-medium">Tomat Beef</span>
            </div>
          </div>
          <Link href="/operator/commodity">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="p-8 space-y-10">
          
          {/* Section 1: Parameter Operasional */}
          <section>
            <h2 className="text-lg font-bold text-[#0a1c38] font-serif mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-800" /> Parameter Operasional
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2">Average Yield (Target)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    defaultValue="20" 
                    className="w-full pl-4 pr-16 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-sm font-medium">
                    Ton/Ha
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2">Shrinkage Tolerance (Penyusutan)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    defaultValue="3" 
                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-sm font-medium">
                    %
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#fdf3e7] border-l-4 border-[#b45309] rounded-r-lg p-5 flex gap-3">
              <TriangleAlert className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#b45309]">Peringatan Sistem</h4>
                <p className="text-sm text-[#b45309] mt-1 leading-relaxed">
                  Klaim penyusutan yang melebihi ambang batas toleransi (3%) akan <strong className="font-bold">secara otomatis ditolak</strong> oleh sistem operasional HQ.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2: Spesifikasi Grading */}
          <section>
            <h2 className="text-lg font-bold text-[#0a1c38] font-serif mb-6 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-800" /> Spesifikasi Grading
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="bg-[#064e3b] text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider w-24 text-center shrink-0">
                  GRADE A
                </div>
                <div className="text-gray-700 font-medium text-sm">
                  &gt;150g per buah, mulus <strong className="font-bold text-gray-900">tanpa cacat</strong>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="bg-[#e2e8f0] text-gray-700 text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider w-24 text-center shrink-0">
                  GRADE B
                </div>
                <div className="text-gray-700 font-medium text-sm">
                  100-150g per buah, toleransi cacat minor 5%
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="bg-[#eff6ff] text-blue-700 text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider w-24 text-center shrink-0">
                  GRADE C
                </div>
                <div className="text-gray-700 font-medium text-sm">
                  &lt;100g per buah, khusus olahan <strong className="font-bold text-gray-900">saus</strong>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-4">
          <Link href="/operator/commodity">
            <button className="text-sm font-bold text-gray-500 hover:text-gray-800 transition px-4 py-2">
              Batal
            </button>
          </Link>
          <Link href="/operator/commodity">
            <button className="px-6 py-2.5 bg-[#022c22] text-white font-bold rounded-lg shadow-sm hover:bg-[#064e3b] transition flex items-center gap-2">
              <Save className="w-4 h-4" /> Simpan Perubahan
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
