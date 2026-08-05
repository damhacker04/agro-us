"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  ArrowRight,
  MapPin,
  PersonStanding,
  Undo2,
  Trash2,
  AlertTriangle,
  Pause,
  CheckCircle2,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function PemetaanAreaPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"manual" | "gps">("manual");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-2xl relative">
      {/* Progress */}
      <div className="mb-8">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Langkah 2 dari 5</div>
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-emerald-950 mb-2 tracking-tight">Pemetaan Area Kebun</h2>
        <p className="text-sm text-gray-600">
          Pilih metode pendaftaran lahan yang paling nyaman untuk Anda.
        </p>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setMethod("manual")}
          className={`flex items-center gap-4 p-4 rounded-xl border transition ${
            method === "manual" ? "border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-300 bg-white"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${method === "manual" ? "bg-white border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
            <MapPin className={`w-5 h-5 ${method === "manual" ? "text-emerald-700" : "text-gray-500"}`} />
          </div>
          <div className="text-left">
            <div className={`font-bold text-sm ${method === "manual" ? "text-emerald-950" : "text-gray-700"}`}>Gambar Manual</div>
            <div className="text-[10px] text-gray-500">Gunakan pointer peta</div>
          </div>
        </button>

        <button 
          onClick={() => setMethod("gps")}
          className={`flex items-center gap-4 p-4 rounded-xl border transition ${
            method === "gps" ? "border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-300 bg-white"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${method === "gps" ? "bg-white border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
            <PersonStanding className={`w-5 h-5 ${method === "gps" ? "text-emerald-700" : "text-gray-500"}`} />
          </div>
          <div className="text-left">
            <div className={`font-bold text-sm ${method === "gps" ? "text-emerald-950" : "text-gray-700"}`}>Walk-Around GPS</div>
            <div className="text-[10px] text-gray-500">Kelilingi batas fisik</div>
          </div>
        </button>
      </div>

      {/* Map Area */}
      <div className="mb-6">
        {method === "manual" ? (
          <div className="w-full h-80 rounded-2xl overflow-hidden relative border border-gray-200 bg-gray-100 shadow-inner">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)` }}
            >
              {/* Dummy Polygon Overlay */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polygon points="100,100 400,120 450,250 150,280" fill="rgba(16, 185, 129, 0.3)" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
                <circle cx="100" cy="100" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
                <circle cx="400" cy="120" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
                <circle cx="450" cy="250" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
                <circle cx="150" cy="280" r="4" fill="white" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
              </svg>
            </div>
            
            {/* Overlay Info */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-gray-900 font-bold text-[10px] px-3 py-1.5 rounded-md shadow-sm border border-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 border border-gray-900 bg-transparent inline-block transform rotate-45"></span>
              Luas Berjalan: 1.2 Hektar
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition">
                <Undo2 className="w-3.5 h-3.5" /> Undo Titik
              </button>
              <button className="bg-white text-red-600 hover:bg-red-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition">
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
              </button>
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Ketuk pada peta untuk menambah titik batas
            </div>
          </div>
        ) : (
          <div className="w-full relative">
            <div className="w-full h-72 rounded-t-2xl overflow-hidden relative border border-gray-200 bg-gray-100 shadow-inner">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)` }}
              >
                {/* Dummy Path Overlay */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <polyline points="50,200 150,250 300,200 450,150 550,180" fill="none" stroke="rgba(6, 182, 212, 0.8)" strokeWidth="3" strokeDasharray="6,4" />
                  <circle cx="550" cy="180" r="6" fill="rgba(6, 182, 212, 0.5)" />
                  <circle cx="550" cy="180" r="3" fill="rgba(6, 182, 212, 1)" />
                </svg>
              </div>

              {/* Warning Overlay */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4/5 max-w-sm bg-red-50/95 backdrop-blur border border-red-200 rounded-xl p-3 shadow-md flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <div className="font-bold text-red-800 text-xs mb-0.5">Akurasi GPS Rendah (± 15 meter)</div>
                  <div className="text-[9px] text-red-700 leading-tight">Berhenti sejenak dan hindari kanopi pohon lebat agar sinyal stabil sebelum melanjutkan perjalanan.</div>
                </div>
              </div>
            </div>

            {/* GPS Controls Panel */}
            <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-6">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Sedang Merekam...
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-black text-gray-900 leading-none">14</span>
                    <span className="text-[10px] text-gray-500 font-semibold mb-0.5 tracking-wider">TITIK TEREKAM</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-black text-gray-900 leading-none">450</span>
                    <span className="text-[10px] text-gray-500 font-semibold mb-0.5 tracking-wider">M JARAK TEMPUH</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-5 py-2.5 rounded-full font-bold text-xs hover:bg-gray-50 transition shadow-sm">
                    <Pause className="w-4 h-4" /> Jeda
                  </button>
                  <button className="flex items-center gap-2 bg-[#0a381f] text-white px-5 py-2.5 rounded-full font-bold text-xs hover:bg-[#114b2d] transition shadow-md">
                    <CheckCircle2 className="w-4 h-4" /> Selesai
                  </button>
                </div>
              </div>
            </div>

            <button className="mt-4 flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition">
              <X className="w-3.5 h-3.5" /> Batalkan Perekaman
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="border border-amber-200 rounded-xl p-4 flex gap-3 items-start bg-white shadow-sm mb-12">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-gray-900 text-xs mb-1">Tips Pemetaan</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Ketuk pada peta untuk membuat titik batas lahan. Pastikan garis tidak berpotongan satu sama lain untuk analisis NDVI yang optimal.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-auto">
        <Link 
          href="/tenant/onboarding/profile"
          className="text-sm font-semibold text-gray-500 hover:text-emerald-700 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Profil Bisnis
        </Link>
        <button 
          onClick={() => router.push("/tenant/onboarding/confirmation")}
          className="bg-[#0a381f] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#114b2d] transition shadow-md"
        >
          Lanjutkan ke Konfirmasi <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
