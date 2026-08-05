"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ImagePlus, 
  Box, 
  Truck,
  CheckCircle2
} from "lucide-react";

export default function TenantCatalogEditPage() {
  // Mock states for image uploads
  const [mainImg, setMainImg] = useState(false);
  const [thumb1, setThumb1] = useState(false);
  const [thumb2, setThumb2] = useState(false);
  const [thumb3, setThumb3] = useState(false);

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto relative min-h-full bg-white">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-10">
        <Link 
          href="/tenant/catalog"
          className="text-sm font-semibold text-emerald-900 hover:text-emerald-700 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
        </Link>
        <button 
          className="bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] font-bold text-sm px-10 py-2 rounded-lg hover:bg-[#bbf7d0] transition shadow-sm"
        >
          Simpan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Left Col: Images */}
        <div className="space-y-4">
          
          {/* Main Image */}
          <label className="border-2 border-emerald-700/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition aspect-square relative overflow-hidden group">
            <input type="file" accept="image/*" className="hidden" onChange={() => setMainImg(true)} />
            {mainImg ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="font-bold text-emerald-900 text-sm">Gambar Utama Tersimpan</span>
                <span className="text-xs text-emerald-600">Klik untuk mengganti</span>
              </div>
            ) : (
              <ImagePlus className="w-12 h-12 text-gray-900 group-hover:scale-110 transition-transform" />
            )}
          </label>

          {/* Thumbnails */}
          <div className="grid grid-cols-3 gap-4">
            <label className="border-2 border-emerald-700/20 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition aspect-square relative group overflow-hidden">
              <input type="file" accept="image/*" className="hidden" onChange={() => setThumb1(true)} />
              {thumb1 ? <CheckCircle2 className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" /> : <ImagePlus className="w-6 h-6 text-gray-700 group-hover:scale-110 transition-transform" />}
            </label>
            <label className="border-2 border-emerald-700/20 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition aspect-square relative group overflow-hidden">
              <input type="file" accept="image/*" className="hidden" onChange={() => setThumb2(true)} />
              {thumb2 ? <CheckCircle2 className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" /> : <ImagePlus className="w-6 h-6 text-gray-700 group-hover:scale-110 transition-transform" />}
            </label>
            <label className="border-2 border-emerald-700/20 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition aspect-square relative group overflow-hidden">
              <input type="file" accept="image/*" className="hidden" onChange={() => setThumb3(true)} />
              {thumb3 ? <CheckCircle2 className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" /> : <ImagePlus className="w-6 h-6 text-gray-700 group-hover:scale-110 transition-transform" />}
            </label>
          </div>
        </div>

        {/* Right Col: Basic Info */}
        <div className="pt-4 flex flex-col justify-start">
          <input 
            type="text" 
            placeholder="Nama Komoditas (cth: Tomat Beef Premium)" 
            className="text-3xl font-black text-gray-900 placeholder:text-gray-400 border-none p-0 focus:ring-0 w-full mb-4 bg-transparent"
            defaultValue="Tomat Beef Premium"
          />
          
          <div className="flex items-end gap-2 mb-8">
            <span className="text-xl text-gray-400 font-medium">cth: Rp</span>
            <input 
              type="text"
              placeholder="100.000"
              defaultValue="100.000"
              className="text-2xl font-medium text-gray-900 border-b border-gray-300 w-32 pb-1 focus:ring-0 focus:border-emerald-500 bg-transparent px-0 text-center"
            />
            <span className="text-gray-500 font-medium">/ Box</span>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 inline-block w-fit">
            <div className="text-[10px] font-bold text-gray-500 mb-1">KAPASITAS KG/BOX</div>
            <div className="flex items-baseline gap-2">
              <span className="text-gray-400 text-sm">cth:</span>
              <input 
                type="text"
                defaultValue="15"
                className="w-12 border-b border-gray-300 bg-transparent pb-1 px-0 text-center font-bold text-gray-900 focus:ring-0 focus:border-emerald-500"
              />
              <span className="font-bold text-gray-900">Kg/Box</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="inline-block border-b-2 border-[#1e5033] py-3 text-sm font-bold text-[#1e5033]">
          Spesifikasi & Logistik
        </div>
      </div>

      {/* Detailed Form Section */}
      <div className="border border-gray-200 rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Col 1: Detail Komoditas */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                <Box className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-emerald-950">Detail Komoditas</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Kategori</span>
                <input type="text" defaultValue="Sayur Buah" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-32 text-right" />
              </div>
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Grade Mutu</span>
                <input type="text" defaultValue="A" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-12 text-center" />
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Tingkat Kemanisan (Brix)</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="4.5" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-12 text-center" />
                  <span className="text-xs font-bold text-gray-900">% hingga</span>
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="5.5" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-12 text-center" />
                  <span className="text-xs font-bold text-gray-900">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Suhu Penyimpanan Optimal</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="10" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-12 text-center" />
                  <span className="text-xs font-bold text-gray-900">°C hingga</span>
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="12" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-12 text-center" />
                  <span className="text-xs font-bold text-gray-900">°C</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Estimasi Masa Simpan (Shelf Life)</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="7" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-10 text-center" />
                  <span className="text-xs font-bold text-gray-900">hingga</span>
                  <input type="text" defaultValue="10" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-10 text-center" />
                  <span className="text-xs font-bold text-gray-900">hari</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Tempat Menyimpan</span>
                <input type="text" defaultValue="chiller" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-24 text-right" />
              </div>
            </div>

            <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-gray-600 italic">
                "Cocok digunakan untuk kebutuhan salad, burger, dan panggangan restoran. Buah padat dan tidak mudah berair."
              </p>
            </div>
          </div>

          {/* Col 2: Informasi Pengemasan */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                <Box className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-emerald-950">Informasi Pengemasan</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Dimensi Kemasan</span>
                <div className="flex items-center gap-1.5">
                  <input type="text" defaultValue="40" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-10 text-center" />
                  <span className="text-xs font-bold text-gray-900">cm x</span>
                  <input type="text" defaultValue="30" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-10 text-center" />
                  <span className="text-xs font-bold text-gray-900">cm x</span>
                  <input type="text" defaultValue="15" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-10 text-center" />
                  <span className="text-xs font-bold text-gray-900">cm</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-600">Titik Keberangkatan</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">cth:</span>
                  <input type="text" defaultValue="Gudang Tani Jos, Malang, Jawa Timur" className="bg-gray-100 border-none rounded-md px-2 py-1 text-xs font-bold text-gray-700 w-64 text-right" />
                </div>
              </div>
            </div>

            <div className="mt-8 bg-blue-50/50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900 mb-2">
                <Truck className="w-4 h-4 text-blue-700" /> Pengiriman Terkonsolidasi
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Komoditas ini mendukung skema pengiriman gabungan. Ongkos kirim akan dihitung otomatis saat checkout berdasarkan total volume belanja dari area Malang Raya.
              </p>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
