"use client";

import React from 'react';
import { AlertTriangle, TrendingDown, ThumbsUp, Scale, Settings2 } from 'lucide-react';

export default function ReputationPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-white min-h-screen font-serif">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0a381f] mb-2">Kinerja & Reputasi Farm</h1>
        <p className="text-sm text-gray-500 font-sans">Metrik keandalan pasokan Anda (Rolling 2 Siklus Terakhir).</p>
      </div>

      {/* Warning Banner */}
      <div className="bg-[#fdf2f2] border border-[#fbd5d5] rounded-xl p-6 font-sans">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#f8b4b4] text-[#9b1c1c] flex items-center justify-center shrink-0 mt-1">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#9b1c1c] mb-2">Tindakan Diperlukan</h2>
            <p className="text-sm text-[#c81e1e] leading-relaxed mb-4">
              🚨 Peringatan: Rasio Shortfall Anda <strong className="font-black">(14.2%)</strong> mendekati ambang batas kritis 15%. Jika melewati batas, kuota pembukaan PO Anda akan dikurangi secara otomatis pada siklus berikutnya.
            </p>
            <button className="bg-[#9b1c1c] hover:bg-[#771d1d] text-white text-xs font-bold px-4 py-2 rounded-md transition shadow-sm">
              Lihat Detail Shortfall
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        
        {/* Rasio Shortfall */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Rasio Shortfall
              </div>
              <TrendingDown className="w-12 h-12 text-[#fbd5d5] opacity-50" />
            </div>
            <div className="text-4xl font-black text-[#c81e1e] mb-4">14.2%</div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#fdf2f2] rounded-full h-2 mb-4">
              <div className="bg-[#c81e1e] h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">Dari total 1.000 Kg yang dijanjikan, 142 Kg gagal dikirim.</p>
        </div>

        {/* Rasio Klaim Mutu */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <ThumbsUp className="w-4 h-4 text-emerald-600" /> Rasio Klaim Mutu
              </div>
              <div className="w-12 h-12 text-emerald-100 flex items-center justify-center opacity-50 relative">
                <Settings2 className="w-10 h-10 absolute rotate-45" />
                <span className="text-[8px] font-black absolute text-emerald-800 tracking-widest z-10">SEHAT</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <div className="text-4xl font-black text-[#0a381f]">2.1%</div>
              <span className="text-[10px] text-gray-500 font-bold">/ target &lt; 5%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#eef3fb] rounded-full h-2 mb-4">
              <div className="bg-[#0a381f] h-2 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">Sangat baik. Tingkat komplain kualitas di bawah 5%.</p>
        </div>

        {/* Quota Multiplier */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Scale className="w-4 h-4 text-amber-700" /> Quota Multiplier Berjalan
              </div>
              <Scale className="w-12 h-12 text-[#f3e8d2] opacity-50" />
            </div>
            <div className="text-4xl font-black text-amber-900 mb-4">0.8x</div>
            
            {/* Step Bar */}
            <div className="flex gap-1 mb-4 h-2">
              <div className="bg-amber-900 flex-1 rounded-full"></div>
              <div className="bg-amber-900 flex-1 rounded-full"></div>
              <div className="bg-amber-900 flex-1 rounded-full"></div>
              <div className="bg-amber-900 flex-1 rounded-full"></div>
              <div className="bg-[#eef3fb] flex-1 rounded-full"></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">Kapasitas PO Anda saat ini dibatasi 80% dari total lahan akibat shortfall siklus lalu.</p>
        </div>

      </div>
    </div>
  );
}
