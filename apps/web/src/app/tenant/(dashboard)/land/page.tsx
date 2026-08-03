"use client";

import React from "react";
import Link from "next/link";
import { 
  Map as MapIcon, 
  Shapes,
  MoreVertical,
  History,
  MapPin,
  RefreshCw,
  BarChart,
  ArrowRight
} from "lucide-react";

export default function TenantLandManagementPage() {
  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto">
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1">Total Luas Terdaftar</div>
            <div className="text-2xl font-black text-gray-900">1.28 Hektar</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700">
            <Shapes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1">Jumlah Petak Lahan</div>
            <div className="text-2xl font-black text-gray-900">2 Poligon Aktif</div>
          </div>
        </div>
      </div>

      {/* Polygon List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Polygon 1: Blok Utara */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-gray-100 flex items-center justify-center relative border-b border-gray-100">
            <div className="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              VERIFIED
            </div>
            {/* Simple CSS Polygon */}
            <div 
              className="w-32 h-24 bg-emerald-400/50 border-2 border-emerald-500" 
              style={{ clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)" }}
            ></div>
            <div className="absolute bottom-4 right-4 bg-white border border-gray-200 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
              Luas: 1.20 Ha
            </div>
          </div>

          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-0.5">Blok Utara</h3>
                <div className="text-[10px] text-gray-500">Ditambahkan: 12 Jan 2026</div>
              </div>
              <button><MoreVertical className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                🛡️ Tier 1: Verifikasi Satelit Penuh
              </div>
              <p className="text-[10px] text-emerald-700 leading-relaxed">
                Memenuhi standar resolusi piksel satelit Sentinel-2. Pemantauan NDVI real-time tersedia.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 border border-gray-200 rounded-lg py-2 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">KESEHATAN</div>
                <div className="text-xs font-bold text-emerald-700">Optimal</div>
              </div>
              <div className="flex-1 border border-gray-200 rounded-lg py-2 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TERAKHIR SCAN</div>
                <div className="text-xs font-bold text-gray-900">2j yang lalu</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <button className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Riwayat Tanam
            </button>
            <button className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition">
              Edit Poligon
            </button>
          </div>
        </div>

        {/* Polygon 2: Blok Selatan */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 bg-gray-100 flex items-center justify-center relative border-b border-gray-100">
            {/* Simple CSS Polygon Small */}
            <div 
              className="w-12 h-10 bg-amber-400/50 border-2 border-amber-500" 
              style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            ></div>
            <div className="absolute bottom-4 right-4 bg-white border border-gray-200 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
              Luas: 0.08 Ha
            </div>
          </div>

          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-0.5">Blok Selatan</h3>
                <div className="text-[10px] text-gray-500">Ditambahkan: 05 Mar 2026</div>
              </div>
              <button><MoreVertical className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                ⚠️ Tier 2: Verifikasi Terbatas
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Luas {'<'} 0,1 Ha. Akurasi pemantauan kesehatan daun (NDVI) tidak optimal pada resolusi publik.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 border border-gray-200 rounded-lg py-2 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">KESEHATAN</div>
                <div className="text-xs font-bold text-red-700">N/A</div>
              </div>
              <div className="flex-1 border border-gray-200 rounded-lg py-2 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TERAKHIR SCAN</div>
                <div className="text-xs font-bold text-gray-900">-</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <button className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Riwayat Tanam
            </button>
            <button className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition">
              Edit Poligon
            </button>
          </div>
        </div>

      </div>

      {/* Gambar Area Baru */}
      <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center mb-8">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-700 border border-emerald-100 mb-4 shadow-sm">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">Gambar Area Kebun Baru</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-6">
          Dapatkan insight vegetasi otomatis dengan memetakan poligon lahan Anda sekarang.
        </p>
        <Link 
          href="/tenant/land/mapping"
          className="text-[#166534] font-bold text-sm flex items-center gap-2 hover:text-emerald-900 transition"
        >
          Mulai Menggambar <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Panduan Verifikasi Satelit */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-gray-900 mb-6">Panduan Verifikasi Satelit</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-gray-900 mb-1">Sentinel-2 MSI</div>
              <div className="text-[10px] text-gray-500 leading-relaxed">
                Menggunakan data multispektral dengan resolusi 10m/pixel untuk akurasi NDVI tinggi.
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-gray-900 mb-1">Pembaruan 5 Hari</div>
              <div className="text-[10px] text-gray-500 leading-relaxed">
                Lahan Anda akan discan setiap 5 hari sekali tergantung kondisi tutupan awan.
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
              <BarChart className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-gray-900 mb-1">Health Indexing</div>
              <div className="text-[10px] text-gray-500 leading-relaxed">
                Skala 0.0 (Kering/Tanah) hingga 1.0 (Hijau Rimbun) untuk deteksi kesehatan.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
