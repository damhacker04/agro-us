"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TenantLandConfirmationPage() {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="p-8 pb-20 max-w-4xl mx-auto relative min-h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full relative">
        
        <div className="mb-6">
          <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-1 uppercase">LUAS TERDETEKSI</div>
          <h2 className="text-4xl font-black text-[#0a381f] tracking-tight mb-2">0,08 Hektar</h2>
          <p className="text-sm text-gray-500 italic">
            Setara dengan ~800 m² (Metode: Gambar Manual di Peta)
          </p>
        </div>

        <hr className="border-gray-100 mb-8" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-gray-900">Pratinjau Poligon</h3>
          <span className="text-[10px] text-gray-400">Polygon ID: #AG-9921</span>
        </div>

        {/* Map Preview Area */}
        <div className="w-full h-80 rounded-xl overflow-hidden relative border border-gray-200 mb-8 bg-gray-100 shadow-inner">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)` }}
          >
            {/* Dummy Polygon Overlay */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polygon points="200,100 500,150 550,250 150,200" fill="rgba(16, 185, 129, 0.3)" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
              <circle cx="200" cy="100" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
              <circle cx="500" cy="150" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
              <circle cx="550" cy="250" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
              <circle cx="150" cy="200" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Warning Section */}
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-5 mb-10">
          <div className="flex gap-3 items-start mb-4">
            <AlertTriangle className="w-5 h-5 text-[#d97706] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[#b45309] text-sm mb-1">Peringatan: Luas Lahan {'<'} 0,1 Hektar</h4>
              <p className="text-xs text-[#92400e] leading-relaxed">
                Luas kebun Anda berada di bawah ambang batas standar pemantauan satelit (0,1 Ha). Pemantauan kesehatan tanaman (NDVI) mungkin tidak memiliki tingkat presisi piksel yang optimal.
              </p>
            </div>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer group p-2 -ml-2 rounded-lg hover:bg-[#fef3c7] transition">
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-[#b45309] focus:ring-[#b45309]"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
            </div>
            <span className="text-[10px] font-bold text-[#92400e] pt-0.5">
              Saya memahami dan menyetujui bahwa lahan saya akan diproses dengan label 'Verifikasi Terbatas'.
            </span>
          </label>
        </div>

        <hr className="border-gray-100 mb-6" />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link 
            href="/tenant/land/mapping"
            className="text-sm font-semibold text-gray-500 hover:text-emerald-700 transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Ulangi Pemetaan
          </Link>
          <button 
            disabled={!isChecked}
            onClick={() => router.push("/tenant/land")}
            className="bg-[#0a381f] text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-[#114b2d] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
          >
            Simpan
          </button>
        </div>
        
      </div>
    </div>
  );
}
