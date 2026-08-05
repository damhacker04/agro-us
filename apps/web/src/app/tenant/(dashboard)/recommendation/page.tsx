"use client";

import React from 'react';
import { AlertCircle, TrendingUp, Ban, Zap } from 'lucide-react';

export default function RecommendationPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-white min-h-screen font-serif">
      
      {/* Warning Subscription Banner */}
      <div className="bg-[#fff9e6] border border-[#ffecb3] rounded-xl p-6 font-sans flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-[#ffe082] text-[#d97706] flex items-center justify-center shrink-0 mt-0.5">
           <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-[#b45309] mb-1">Masa Tenggang Langganan (Sisa 14 Hari)</h2>
          <p className="text-xs text-[#92400e] leading-relaxed mb-4 max-w-2xl">
            Segera perpanjang Paket Verified Rp199.000/bulan. Badge satelit lama Anda & PO yang berjalan TETAP AMAN secara permanen. Namun, Anda tidak dapat memverifikasi batch tanam baru setelah masa tenggang habis.
          </p>
        </div>
        <div>
          <button className="bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold px-6 py-2.5 rounded-lg transition shadow-sm whitespace-nowrap">
            Bayar Tagihan
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#0a381f] mb-2 tracking-tight">Market Intelligence</h1>
        <p className="text-sm text-gray-500 font-sans">Analisis agregat permintaan HORECA 8-16 minggu ke depan.</p>
      </div>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
        
        {/* Rekomendasi Utama Card */}
        <div className="border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition bg-white flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-[10px] font-black uppercase tracking-widest border border-[#bbf7d0]">
                <TrendingUp className="w-3 h-3" /> Rekomendasi Utama
              </div>
              <div className="bg-[#f0f4f8] text-[#4f6f8f] px-3 py-1 rounded-md text-[10px] font-bold">
                Minggu ke-34
              </div>
            </div>
            
            <h2 className="text-xl font-black text-[#0a381f] mb-8 leading-snug">
              Zona Malang & sekitarnya membutuhkan 8 Ton Cabai Rawit Merah pada (Akhir Agustus).
            </h2>
            
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-600">Kejenuhan Pasokan: <span className="text-emerald-700">Rendah (Peluang Besar)</span></span>
                <span className="text-emerald-700">30%</span>
              </div>
              <div className="w-full bg-[#f1f5f9] rounded-full h-2">
                <div className="bg-[#0a381f] h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
          </div>
          
          <button className="w-full bg-[#0a381f] hover:bg-[#114b2d] text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm">
            <Zap className="w-4 h-4 fill-current" /> Tanam & Buka Kuota (1-Tap)
          </button>
        </div>

        {/* Hindari Card */}
        <div className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef2f2] text-[#991b1b] text-[10px] font-black uppercase tracking-widest border border-[#fecaca]">
                <Ban className="w-3 h-3" /> Hindari
              </div>
              <div className="bg-[#f0f4f8] text-[#4f6f8f] px-3 py-1 rounded-md text-[10px] font-bold">
                2 Bulan Kedepan
              </div>
            </div>
            
            <h2 className="text-xl font-black text-gray-500 mb-8 leading-snug line-through decoration-gray-300">
              Zona Surabaya sedang over-suplai Sawi Pakcoy.
            </h2>
            
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-600">Kejenuhan Pasokan: <span className="text-red-600">Sangat Tinggi (Risiko)</span></span>
                <span className="text-red-600">95%</span>
              </div>
              <div className="w-full bg-[#f1f5f9] rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>
          
          <button disabled className="w-full bg-[#f0f4f8] text-[#94a3b8] border border-[#e2e8f0] py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
            <Ban className="w-4 h-4" /> Hindari Komoditas Ini
          </button>
        </div>

      </div>
    </div>
  );
}
