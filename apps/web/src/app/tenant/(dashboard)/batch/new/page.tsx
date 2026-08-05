"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, MoreVertical, History } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TenantBatchNewPage() {
  const router = useRouter();

  const handleSelectLand = () => {
    router.push("/tenant/batch/new/mapping");
  };

  return (
    <div className="p-8 pb-20 max-w-4xl mx-auto relative min-h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full relative">
        
        <div className="mb-10">
          <h2 className="text-3xl font-black text-[#0a381f] tracking-tight mb-8">Membuat Batch Baru</h2>
          
          <div className="mb-8">
            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Produk (Produk yang tersedia sesuai dengan katalog produk Anda)
            </label>
            <div className="relative">
              <select defaultValue="" className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                <option value="" disabled>Pilih disini</option>
                <option value="1">Tomat Beef Premium</option>
                <option value="2">Cabai Rawit Merah</option>
                <option value="3">Sawi Pakcoy</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-wider">
            Pilih lahan yang digunakan
          </div>
          
          {/* Polygons Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Polygon 1: Blok Utara */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="h-40 bg-gray-100 flex items-center justify-center relative border-b border-gray-100">
                <div className="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  VERIFIED
                </div>
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
                <button 
                  onClick={handleSelectLand}
                  className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition"
                >
                  Pilih
                </button>
              </div>
            </div>

            {/* Polygon 2: Blok Selatan */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="h-40 bg-gray-100 flex items-center justify-center relative border-b border-gray-100">
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
                <button 
                  onClick={handleSelectLand}
                  className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition"
                >
                  Pilih
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12">
          <Link 
            href="/tenant/batch"
            className="text-sm font-semibold text-[#0a381f] hover:text-[#114b2d] transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke List Batch
          </Link>
        </div>
        
      </div>
    </div>
  );
}
