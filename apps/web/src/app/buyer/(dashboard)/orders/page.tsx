"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search,
  ChevronDown,
  Hourglass,
  Truck,
  Check,
  AlertTriangle
} from "lucide-react";

export default function BuyerOrdersPage() {
  const [activeTab, setActiveTab] = useState("Semua");

  const tabs = ["Semua", "Aktif", "Selesai", "Dibatalkan"];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950 mb-2">Pesanan Saya</h1>
        <p className="text-gray-500 text-sm">Kelola dan pantau seluruh pasokan komoditas untuk bisnis Anda.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari Order ID atau nama komoditas..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <button className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Semua Tanggal <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 gap-8">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold transition-colors relative ${
              activeTab === tab ? "text-emerald-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="space-y-6">
        
        {/* Order 1: Menunggu Panen */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-400">
          <div className="p-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202608-0991 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">21 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Sawi Pakcoy Premium (5 Box)</h3>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <span className="text-gray-400">🏢</span> Diproses dari Jaya Wijaya Vege
              </div>
            </div>
            <div className="text-right">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200 w-fit ml-auto mb-2">
                <Hourglass className="w-3 h-3" /> MENUNGGU PANEN
              </span>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-0.5">Total Pembayaran</div>
              <div className="font-black text-gray-900 text-sm">Rp 532.000</div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/50 flex justify-between items-center">
            <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5" /> Tanaman sedang dalam tahap pematangan optimal
            </div>
            <Link 
              href="/buyer/orders/1"
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition bg-white"
            >
              Lihat Detail Pesanan
            </Link>
          </div>
        </div>

        {/* Order 2: Dalam Pengiriman */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500">
          <div className="p-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202608-0991 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">22 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Tomat Beef Premium (10 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div><span className="text-gray-400">🏢</span> Diproses dari Tani Rawit Jos</div>
                <div><span className="text-gray-400">🚚</span> Dikirim via AgroUs Zero-Install Logistics</div>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-blue-200 w-fit ml-auto mb-2">
                <Truck className="w-3 h-3" /> DALAM PENGIRIMAN
              </span>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-0.5">Total Pembayaran</div>
              <div className="font-black text-gray-900 text-sm">Rp 1.530.000</div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/50 flex justify-between items-center">
            <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Estimasi Tiba: Hari ini, 14:30 WIB
            </div>
            <Link 
              href="/buyer/orders/2"
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition bg-white"
            >
              Lihat Detail Pesanan
            </Link>
          </div>
        </div>

        {/* Order 3: Selesai */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-emerald-500 opacity-70 hover:opacity-100 transition-opacity">
          <div className="p-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202608-0991 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">22 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Tomat Beef Premium (10 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div><span className="text-gray-400">🏢</span> Diproses dari Tani Rawit Jos</div>
                <div><span className="text-gray-400">🚚</span> Dikirim via AgroUs Zero-Install Logistics</div>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200 w-fit ml-auto mb-2">
                <Check className="w-3 h-3" /> SELESAI
              </span>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-0.5">Total Pembayaran</div>
              <div className="font-black text-gray-900 text-sm">Rp 1.530.000</div>
            </div>
          </div>
          <div className="p-4 bg-gray-50/50 flex justify-between items-center">
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tiba Hari ini, 14:20 WIB
            </div>
            <Link 
              href="/buyer/orders/3"
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition bg-white"
            >
              Lihat Detail Pesanan
            </Link>
          </div>
        </div>

        {/* Order 4: Gagal Panen/Dispute */}
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500">
          <div className="p-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202607-0810 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">4 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Cabai Rawit Merah (50 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div><span className="text-gray-400">🏢</span> Diproses dari Farm Fresh Berdikari</div>
                <div className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Membutuhkan konfirmasi Harvest Assurance.</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-1 mb-2">
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-red-200 w-fit">
                  <AlertTriangle className="w-3 h-3" /> GAGAL PANEN/DISPUTE
                </span>
                <span className="text-[9px] text-gray-500 italic">Pesanan Anda hanya terpenuhi 12 box dari 20 box</span>
              </div>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-0.5">Awal Pembayaran</div>
              <div className="font-semibold text-gray-500 text-xs line-through mb-1">Rp 5.530.000</div>
              
              <div className="text-[10px] text-red-500 font-bold tracking-wider mb-0.5 mt-2">Nilai Ganti Kerugian</div>
              <div className="font-black text-red-600 text-sm">Rp 1.833.000</div>
            </div>
          </div>
          <div className="p-4 bg-red-50/30 flex justify-between items-center gap-8">
            <div className="text-xs text-gray-600 italic">
              Faktor eksternal (cuaca/hama) atau kendala operasional. Silakan pilih opsi kompensasi via asuransi atau dana kembali.
            </div>
            <Link 
              href="/buyer/orders/4/resolution"
              className="shrink-0 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition shadow-sm"
            >
              Pilih Opsi Solusi
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
