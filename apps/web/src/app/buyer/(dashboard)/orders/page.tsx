"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search,
  ChevronDown,
  Hourglass,
  Check,
  AlertTriangle,
  Store,
  MapPin,
  Truck
} from "lucide-react";

export default function BuyerOrdersPage() {
  const [activeTab, setActiveTab] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");

  const tabs = ["Semua", "Aktif", "Selesai", "Dibatalkan"];

  const isVisible = (status: string, date: string, id: string, name: string) => {
    if (activeTab === "Aktif" && !["Menunggu Panen", "Dalam Pengiriman", "Gagal Panen Parsial"].includes(status)) return false;
    if (activeTab === "Selesai" && status !== "Selesai") return false;
    if (activeTab === "Dibatalkan" && status !== "Gagal Panen Total") return false;
    
    if (searchQuery && !id.toLowerCase().includes(searchQuery.toLowerCase()) && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (dateQuery && date !== dateQuery) return false;
    
    return true;
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <input 
          type="date"
          value={dateQuery}
          onChange={(e) => setDateQuery(e.target.value)}
          className="border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
        />
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
        {isVisible("Menunggu Panen", "2026-07-21", "AGR-202608-0991", "Sawi Pakcoy Premium") && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-400">
          <div className="p-5 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202608-0991 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">21 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Sawi Pakcoy Premium (5 Box)</h3>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                <Store className="w-3.5 h-3.5 text-gray-400" /> Dipesan dari Jaya Wijaya Vege
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
          <div className="px-5 pb-5 pt-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
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
        )}

        {/* Order 2: Dalam Pengiriman */}
        {isVisible("Dalam Pengiriman", "2026-07-22", "AGR-202608-0991", "Tomat Beef Premium") && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500">
          <div className="p-5 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202608-0991 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">22 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Tomat Beef Premium (10 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-gray-400" /> Dipesan dari Tani Rawit Jos</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Dikirim via AgroExpress Priority</div>
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
          <div className="px-5 pb-5 pt-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
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
        )}

        {/* Order 3: Selesai */}
        {isVisible("Selesai", "2026-07-04", "AGR-202607-0810", "Cabai Rawit Merah") && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-emerald-400">
          <div className="p-5 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202607-0810 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">4 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Cabai Rawit Merah (50 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-gray-400" /> Dipesan dari Farm Fresh Berdikari</div>
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
          <div className="px-5 pb-5 pt-2 flex justify-between items-center">
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tiba Hari ini, 14:28 WIB
            </div>
            <Link 
              href="/buyer/orders/3"
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition bg-white"
            >
              Lihat Detail Pesanan
            </Link>
          </div>
        </div>
        )}

        {/* Order 4: Gagal Panen/Dispute */}
        {isVisible("Gagal Panen Parsial", "2026-07-04", "AGR-202607-0810", "Cabai Rawit Merah") && (
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500">
          <div className="p-5 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202607-0810 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">4 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Cabai Rawit Merah (50 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-gray-400" /> Dipesan dari Farm Fresh Berdikari</div>
                <div className="text-red-600 font-semibold flex items-center gap-1.5 mt-1"><AlertTriangle className="w-3.5 h-3.5"/> Membutuhkan konfirmasi Harvest Assurance.</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-1 mb-2">
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-red-200 w-fit">
                  <AlertTriangle className="w-3 h-3" /> GAGAL PANEN PARSIAL
                </span>
                <span className="text-[9px] text-gray-500">Pesanan Anda hanya terpenuhi 10 box dari 20 box</span>
              </div>
              <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-0.5 mt-4">Total Pembayaran</div>
              <div className="font-black text-gray-900 text-sm mb-1">Rp 5.530.000</div>
              
              <div className="text-[10px] text-red-500 font-bold tracking-wider mb-0.5 mt-4">Nilai Klaim Tersedia</div>
              <div className="font-black text-red-600 text-sm">Rp 1.833.000</div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex justify-between items-center gap-8">
            <div className="text-xs text-gray-500">
              Faktor eksternal cuaca mempengaruhi 40% hasil panen. Silakan pilih opsi kompensasi atau penggantian komoditas
            </div>
            <Link 
              href="/buyer/orders/4/resolution"
              className="shrink-0 px-6 py-2.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition shadow-sm"
            >
              Pilih Opsi Solusi
            </Link>
          </div>
        </div>
        )}

        {/* Order 5: Gagal Panen Total */}
        {isVisible("Gagal Panen Total", "2026-07-04", "AGR-202607-0810", "Cabai Rawit Merah") && (
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500">
          <div className="p-5 flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-gray-900 mb-2">Order #AGR-202607-0810 <span className="text-gray-400 font-normal mx-1">|</span> <span className="text-gray-500 font-normal">4 Jul 2026</span></div>
              <h3 className="font-bold text-gray-900">Cabai Rawit Merah (50 box)</h3>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-gray-400" /> Dipesan dari Farm Fresh Berdikari</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end gap-1 mb-2">
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-red-200 w-fit">
                  <AlertTriangle className="w-3 h-3" /> GAGAL PANEN TOTAL
                </span>
                <span className="text-[9px] text-gray-500">Dana akan dikembalikan penuh kepada Anda</span>
              </div>
              
              <div className="text-[10px] text-red-500 font-bold tracking-wider mb-0.5 mt-8">Dana yang dikembalikan</div>
              <div className="font-black text-red-600 text-sm">Rp 5.530.000</div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex justify-between items-center gap-8">
            <div className="text-xs text-gray-500">
              Faktor eksternal cuaca mempengaruhi 100% hasil panen. Silakan pilih opsi kompensasi atau penggantian komoditas
            </div>
            <Link 
              href="/buyer/orders/5/resolution"
              className="shrink-0 px-6 py-2.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition shadow-sm"
            >
              Klaim Pengembalian Dana
            </Link>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
