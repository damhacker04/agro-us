"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft,
  ShoppingCart,
  Lock,
  CheckCircle2,
  X
} from "lucide-react";

export default function TenantEditPOPage() {
  const router = useRouter();
  
  const [poData, setPoData] = useState({
    qty: "35",
    price: "150.000",
    estDate: "2026-10-15"
  });

  const handleOpenPO = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/tenant/batch/B-1001?po=open");
  };

  return (
    <div className="p-8 pb-24 max-w-4xl mx-auto relative min-h-full">
      <div className="mb-8">
        <Link 
          href="/tenant/batch/B-1001"
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Detail Batch
        </Link>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manajemen Detail Batch</h1>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi pengaturan kuota dan penawaran Pre-Order ke Katalog Produk.</p>
      </div>

      <div className="bg-white rounded-2xl w-full max-w-xl mx-auto shadow-sm border border-gray-200 overflow-hidden mt-12">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="font-black text-gray-900">Buka Penawaran Pre-Order</h3>
            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">Batch B-1001 (Tomat Beef)</div>
          </div>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
        
        <form onSubmit={handleOpenPO} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Jumlah Box Dijual</label>
            <div className="relative">
              <input 
                type="number" 
                required 
                value={poData.qty}
                onChange={(e) => setPoData({...poData, qty: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Box</div>
            </div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-1.5 mt-2 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Maksimal 35 Box (70% dari kapasitas lahan 0.5 Ha).
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Harga per Box (Rp)</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-sm font-bold text-gray-400">Rp</div>
              <input 
                type="text" 
                value={poData.price}
                disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-10 pr-12 py-3 text-sm font-bold text-gray-500 cursor-not-allowed" 
              />
              <Lock className="absolute right-4 w-4 h-4 text-gray-400" />
            </div>
            <div className="text-[10px] text-gray-500 mt-1.5 px-1">Harga dikunci dari Katalog Produk (TN-11).</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Tanggal Estimasi Panen</label>
            <input 
              type="date" 
              required
              value={poData.estDate}
              onChange={(e) => setPoData({...poData, estDate: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" 
            />
          </div>

          <div className="pt-6 flex gap-3 justify-end items-center border-t border-gray-100 mt-8">
            <button 
              type="button" 
              onClick={() => router.push("/tenant/batch/B-1001")}
              className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="bg-[#0a381f] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#114b2d] shadow-md flex items-center gap-2 transition transform hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" /> Terbitkan PO ke Katalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
