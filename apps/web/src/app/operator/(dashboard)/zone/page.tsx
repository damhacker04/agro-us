"use client";

import React from "react";
import { Truck, Map as MapIcon, TriangleAlert, Save, Settings2 } from "lucide-react";

export default function ZoneManagementPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Manajemen Zona Logistik</h1>
        <p className="text-gray-600 font-medium">Atur radius pengiriman dan parameter unit economics untuk optimalisasi supply chain.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left Column: Map Placeholder */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden shadow-sm relative h-[600px] flex items-center justify-center">
          <img src="https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
              <MapIcon className="w-8 h-8 text-[#0a1c38]" />
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg text-center max-w-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#0a1c38] font-serif mb-2">[Integrasi Peta Geospasial Zona]</h2>
              <p className="text-sm text-gray-600 font-medium">Sistem sedang memuat data koordinat wilayah untuk visualisasi zona operasional.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Config */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm h-fit">
          <h2 className="text-xl font-bold text-[#0a1c38] font-serif mb-6 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-800" /> Konfigurasi Unit Economics
          </h2>
          <hr className="mb-6 border-gray-100" />

          <div className="space-y-8 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2 uppercase">ZONA 1 (LOKAL)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                  <span className="text-gray-900 font-bold">Rp</span>
                </div>
                <input 
                  type="text" 
                  defaultValue="250.000" 
                  className="w-full pl-20 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">i</span> 
                Nilai minimum pesanan untuk area radius 15km.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2 uppercase">ZONA 2 (INTER-CITY)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                  <span className="text-gray-900 font-bold">Rp</span>
                </div>
                <input 
                  type="text" 
                  defaultValue="750.000" 
                  className="w-full pl-20 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">i</span> 
                Nilai minimum pesanan untuk pengiriman lintas kota.
              </p>
            </div>
          </div>

          <button className="w-full py-4 bg-[#022c22] text-white rounded-lg font-bold hover:bg-[#064e3b] transition-colors flex items-center justify-center gap-2 shadow-md">
            <Save className="w-5 h-5" /> Simpan Unit Economics
          </button>
        </div>

      </div>

      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-full px-6 py-3 flex items-center justify-center gap-2 mx-auto w-fit shadow-sm">
        <TriangleAlert className="w-4 h-4 text-red-600" />
        <span className="text-sm font-medium text-red-800">Perubahan zona akan berdampak langsung pada validasi keranjang belanja Buyer (BY-01).</span>
      </div>
    </div>
  );
}
