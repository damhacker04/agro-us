"use client";

import React from "react";
import Link from "next/link";
import { 
  Check,
  ShieldCheck,
  Hourglass
} from "lucide-react";

export default function BuyerPaymentSuccessPage() {
  const subtotal = 2000000;
  const ongkir = 12000;
  const addonCost = 25000;
  const total = subtotal + ongkir + addonCost;

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center">
      
      {/* Container Card */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-10 shadow-sm flex flex-col items-center">
        
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center mb-6 shadow-md">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        
        <h1 className="text-3xl font-black text-emerald-900 mb-3 tracking-tight">Pembayaran Berhasil!</h1>
        <p className="text-sm text-gray-600 mb-10 text-center max-w-sm">
          Terima kasih, pembayaran Anda untuk <strong>Order #AGR-202608-0991</strong> telah kami terima.
        </p>

        {/* Escrow Box */}
        <div className="w-full bg-[#f0f5ff] border border-[#e0ebff] rounded-xl p-5 mb-8 flex gap-4">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 text-xs tracking-wider mb-1 uppercase">Dana Diamankan di Escrow</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Dana sebesar <strong>{formatRupiah(total)}</strong> saat ini ditahan dengan aman oleh sistem AgroUs. 
              Dana tidak akan diteruskan ke Tenant sampai Anda mengonfirmasi bahwa pesanan telah diterima dengan baik (PoD).
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Ringkasan Pesanan</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded bg-gray-100 shrink-0 overflow-hidden">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80)` }} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-900">Tomat Beef Premium</div>
                <div className="text-[10px] text-gray-500">Rp 150.000 x 10 Box = Rp 1.500.000</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded bg-gray-100 shrink-0 overflow-hidden">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80)` }} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-900">Sawi Pakcoy Premium</div>
                <div className="text-[10px] text-gray-500">Rp 100.000 x 5 Box = Rp 500.000</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6 border-t border-gray-100 pt-6">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Ongkos Kirim</span>
              <span className="font-medium text-gray-900">{formatRupiah(ongkir)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Laporan (Add-on)</span>
              <span className="font-medium text-gray-900">{formatRupiah(addonCost)}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
            <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
            <span className="text-xl font-bold text-emerald-950">{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Note */}
        <p className="text-[10px] text-gray-400 mb-8 text-center">
          E-Receipt telah dikirimkan ke email terdaftar Anda.<br/>
          Butuh bantuan? <strong className="text-emerald-700">Hubungi AgroUs Care</strong>
        </p>

        {/* Status Cards */}
        <div className="w-full space-y-4 mb-8">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-gray-600">Status Pesanan Saat Ini:</span>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200">
                <Hourglass className="w-3 h-3" /> MENUNGGU PANEN
              </span>
            </div>
            <div className="text-xs text-gray-600 font-medium">
              <span className="text-gray-400 mr-2">📄</span> Estimasi Pengiriman 1: <strong className="text-gray-900">06 Ags 2026</strong> (Tomat Beef Premium)
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-gray-600">Status Pesanan Saat Ini:</span>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200">
                <Hourglass className="w-3 h-3" /> MENUNGGU PANEN
              </span>
            </div>
            <div className="text-xs text-gray-600 font-medium">
              <span className="text-gray-400 mr-2">📄</span> Estimasi Pengiriman 2: <strong className="text-gray-900">08 Ags 2026</strong> (Sawi Pakcoy Premium)
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3">
          <Link 
            href="/buyer/orders"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-semibold bg-emerald-950 text-white hover:bg-emerald-900 transition shadow-sm"
          >
            Lihat Status Pesanan
          </Link>
          <Link 
            href="/buyer/catalog"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            Kembali ke Katalog
          </Link>
        </div>

      </div>
    </div>
  );
}
