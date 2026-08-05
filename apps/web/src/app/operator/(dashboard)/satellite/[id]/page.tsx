"use client";

import React, { use } from "react";
import { ArrowLeft, Clock, Camera, TriangleAlert, TrendingUp, XCircle, CloudOff, Droplets, Leaf, Package } from "lucide-react";
import Link from "next/link";

export default function SatelliteInvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return (
    <div className="p-8 pb-24">
      <Link href="/operator/satellite" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean Anomali
      </Link>

      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-bold text-[#0a1c38] font-serif mb-2">Investigasi Anomali: Batch {resolvedParams.id}</h1>
        <p className="text-gray-600 font-medium">Tomat Beef - Farm Fresh Berdikari</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0a1c38] mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700" /> Timeline Laporan Petani
          </h2>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
            
            {/* Timeline Item 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">Bibit Ditanam</h3>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">10 Ags, 08:00 WIB</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Penanaman bibit di lahan blok utara.</p>
                <div className="text-xs text-gray-500 mb-3 font-medium">
                  Oleh: <span className="font-bold text-gray-700">Admin</span> • GPS: <span className="font-bold text-emerald-700">Cocok di dalam poligon</span>
                </div>
                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 mb-2">
                  <Camera className="w-3 h-3" /> Dilengkapi foto In-App
                </div>
                <img src="https://assets.weforum.org/article/image/XJ-u4B8c90-953e_pS0rK72zM59j7f8v1n4mB6G9c.jpg" alt="Bibit" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* Timeline Item 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">Penyiraman & Pupuk</h3>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">12 Ags, 09:30 WIB</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Pemberian nutrisi AB Mix dosis 1.5 EC.</p>
                <div className="text-xs text-gray-500 mb-3 font-medium">
                  Oleh: <span className="font-bold text-gray-700">Admin</span> • GPS: <span className="font-bold text-emerald-700">Cocok di dalam poligon</span>
                </div>
                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 mb-2">
                  <Camera className="w-3 h-3" /> Dilengkapi foto In-App
                </div>
                <img src="https://media.licdn.com/dms/image/C4D12AQExy-8Kj-wZ2w/article-cover_image-shrink_600_2000/0/1628189871790?e=2147483647&v=beta&t=H3-gJzj-sFjB6-zJ_c7J3j-zG8p8G8H3-gJzj-sFjB6" alt="Pupuk" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* Timeline Item 3 (Anomali) */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-yellow-100 text-yellow-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ring-4 ring-yellow-50">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border-2 border-yellow-300 bg-yellow-50 shadow-sm relative">
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 rounded-full p-1 shadow-sm">
                  <TriangleAlert className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">Penyiraman & Pupuk</h3>
                  <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded">12 Ags, 09:30 WIB</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Pemberian nutrisi BC Mix dosis 1.5 EC.</p>
                <div className="text-xs text-gray-500 mb-3 font-medium">
                  Oleh: <span className="font-bold text-gray-700">Admin</span> • GPS: <span className="font-bold text-emerald-700">Cocok di dalam poligon</span>
                </div>
                <div className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 mb-2">
                  <Camera className="w-3 h-3" /> Foto Diambil dari Galeri
                </div>
                <img src="https://media.licdn.com/dms/image/C4D12AQExy-8Kj-wZ2w/article-cover_image-shrink_600_2000/0/1628189871790?e=2147483647&v=beta&t=H3-gJzj-sFjB6-zJ_c7J3j-zG8p8G8H3-gJzj-sFjB6" alt="Pupuk 2" className="w-24 h-24 object-cover rounded-lg border border-yellow-300" />
              </div>
            </div>
            
            {/* Timeline Item 4 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Package className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">Panen</h3>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">12 Ags, 09:30 WIB</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Pemanenan sayur.</p>
                <div className="text-xs text-gray-500 mb-3 font-medium">
                  Oleh: <span className="font-bold text-gray-700">Admin</span> • GPS: <span className="font-bold text-emerald-700">Cocok di dalam poligon</span>
                </div>
                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 mb-2">
                  <Camera className="w-3 h-3" /> Dilengkapi foto In-App
                </div>
                <img src="https://media.licdn.com/dms/image/C4D12AQExy-8Kj-wZ2w/article-cover_image-shrink_600_2000/0/1628189871790?e=2147483647&v=beta&t=H3-gJzj-sFjB6-zJ_c7J3j-zG8p8G8H3-gJzj-sFjB6" alt="Panen" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Analytics & Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0a1c38] mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-700" /> Kurva Pertumbuhan Vegetasi (NDVI) - Sentinel-2
            </h2>
            <p className="text-sm text-gray-500 mb-6">Analisis citra satelit mendeteksi anomali penanaman dibandingkan dengan laporan manual.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-red-100 bg-red-50/50 rounded-lg p-4">
                <div className="text-[10px] text-red-600 font-bold mb-1 flex items-center gap-1">
                  <TriangleAlert className="w-3 h-3" /> Titik Puncak Deteksi
                </div>
                <div className="text-sm font-bold text-red-900">13 Ags 2026</div>
              </div>
              <div className="border border-gray-200 bg-blue-50/50 rounded-lg p-4">
                <div className="text-[10px] text-blue-600 font-bold mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Selisih Deteksi
                </div>
                <div className="text-sm font-bold text-[#0a1c38]">+12 Hari dari Laporan Tanam</div>
              </div>
            </div>

            <div className="w-full h-64 bg-[#eff6ff] rounded-lg border-2 border-dashed border-blue-200 flex flex-col items-center justify-center p-6 text-center text-blue-800">
              <TrendingUp className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm font-medium opacity-80">
                [Grafik Garis NDVI: Menunjukkan tanah terbuka/kering pada 01-12 Ags, mulai hijau signifikan pada 13 Ags]
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 py-4 px-4 border-2 border-[#b91c1c] text-[#b91c1c] bg-white rounded-lg font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
              <XCircle className="w-5 h-5" /> 
              <div className="text-left">
                <div>Cabut Badge Verifikasi</div>
                <div className="text-xs opacity-80">(Indikasi Fraud)</div>
              </div>
            </button>
            <button className="flex-1 py-4 px-4 bg-[#475569] text-white rounded-lg font-bold hover:bg-[#334155] transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
              <CloudOff className="w-5 h-5" /> 
              <div className="text-left">
                <div>Abaikan</div>
                <div className="text-xs opacity-80">(Toleransi Awan/Cuaca)</div>
              </div>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
