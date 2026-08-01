"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function KonfirmasiLuasLahanPage() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-2xl relative">
      {/* Progress */}
      <div className="mb-8">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Langkah 3 dari 5</div>
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-3xl font-black text-emerald-950 mb-2 tracking-tight">Konfirmasi Luas Lahan</h2>
        <p className="text-sm text-gray-600">
          Periksa kembali hasil pemetaan otomatis sebelum mengunggah dokumen legalitas.
        </p>
      </div>

      {/* Detected Area */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-2 uppercase">Luas Terdeteksi</div>
          <div className="text-4xl font-black text-emerald-800 mb-2 tracking-tight">0,08 Hektar</div>
          <div className="text-xs text-gray-500 italic">
            Setara dengan ~800 m² (Metode: Gambar Manual di Peta)
          </div>
        </div>
        <div className="bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200">
          <AlertTriangle className="w-3 h-3" /> Verifikasi Terbatas
        </div>
      </div>

      <div className="w-full h-px bg-gray-100 mb-6"></div>

      {/* Preview Map */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 text-xs font-bold text-gray-900">
          <span>Pratinjau Poligon</span>
          <span className="text-gray-400 font-normal">Polygon ID: #AG-9921</span>
        </div>
        <div className="w-full h-64 rounded-xl overflow-hidden relative border border-gray-200 bg-gray-100 shadow-sm">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)` }}
          >
            {/* Dummy Polygon Overlay */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polygon points="100,100 400,120 450,250 150,280" fill="rgba(16, 185, 129, 0.3)" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div className="border border-amber-300 bg-amber-50 rounded-xl p-5 mb-10 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm mb-1">Peringatan: Luas Lahan &lt; 0,1 Hektar</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Luas kebun Anda berada di bawah ambang batas standar pemantauan satelit (0,1 Ha). Pemantauan kesehatan tanaman (NDVI) mungkin tidak memiliki tingkat presisi piksel yang optimal.
            </p>
          </div>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border border-amber-600 bg-amber-600 mt-0.5">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-amber-900 leading-tight">
            Saya memahami dan menyetujui bahwa lahan saya akan diproses dengan label 'Verifikasi Terbatas'.
          </span>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/tenant/onboarding/mapping"
          className="text-sm font-semibold text-gray-500 hover:text-emerald-700 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Ulangi Pemetaan
        </Link>
        <button 
          onClick={() => router.push("/tenant/onboarding/legal")}
          className="bg-[#0a381f] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#114b2d] transition shadow-md"
        >
          Lanjutkan ke Legalitas <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
