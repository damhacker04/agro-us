"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Clock,
  Copy,
  Lock,
  FileText,
  CheckCircle2
} from "lucide-react";

export default function BuyerPaymentPage() {
  const [openMethod, setOpenMethod] = useState<"qris" | "va">("va");
  const [selectedBank, setSelectedBank] = useState<string>("bca");

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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back button */}
      <Link 
        href="/buyer/checkout" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Pengiriman
      </Link>

      <h1 className="text-3xl font-bold text-emerald-950 mb-6">Pilih Metode Pembayaran</h1>

      {/* Escrow Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex gap-4 w-full lg:w-2/3">
        <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 leading-relaxed">
          Dana Anda aman dengan <strong className="text-gray-900">AgroUs Escrow</strong>. Kami menahan pembayaran hingga konfirmasi barang diterima oleh pembeli untuk menjamin keaslian produk agribisnis Anda.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Payment Methods */}
        <div className="flex-1 space-y-4">
          
          {/* QRIS Accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all">
            <button 
              className={`w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition`}
              onClick={() => setOpenMethod(openMethod === "qris" ? "va" : "qris")}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center p-1">
                  <div 
                    className="w-full h-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg)` }}
                  />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">QRIS</div>
                  <div className="text-xs text-gray-500">OVO, GoPay, ShopeePay, Dana, LinkAja</div>
                </div>
              </div>
              {openMethod === "qris" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {openMethod === "qris" && (
              <div className="p-6 border-t border-gray-100 flex flex-col items-center bg-gray-50/30">
                <div className="bg-orange-100 text-orange-800 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 mb-6">
                  <Clock className="w-4 h-4" /> Kedaluwarsa dalam: 59 menit 59 detik
                </div>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-xs">
                  Scan kode QR di bawah menggunakan aplikasi pembayaran pilihan Anda.
                </p>
                <div className="w-64 h-64 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  {/* Dummy QR Code */}
                  <div className="w-full h-full bg-gray-200" style={{ 
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000"><path d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h-2v2h2v-2zm-2 2h-2v2h2v-2zm2 2h-2v2h2v-2zm2-2h-2v2h2v-2zm-2 2h2v2h-2v-2zm-6-2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Virtual Account Accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all">
            <button 
              className={`w-full px-6 py-5 flex items-center justify-between ${openMethod === "va" ? "bg-blue-50/30 border-b border-gray-100" : "bg-white"} hover:bg-gray-50 transition`}
              onClick={() => setOpenMethod(openMethod === "va" ? "qris" : "va")}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center text-emerald-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">Virtual Account</div>
                  <div className="text-xs text-gray-500">BCA, Mandiri, BNI, BRI</div>
                </div>
              </div>
              {openMethod === "va" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {openMethod === "va" && (
              <div className="p-6 bg-white">
                <div className="font-bold text-gray-900 text-sm mb-4">Pilih Bank</div>
                
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {['bri', 'bca', 'bni', 'bsi'].map((bank) => (
                    <button 
                      key={bank}
                      onClick={() => setSelectedBank(bank)}
                      className={`h-14 border rounded-lg flex items-center justify-center p-2 transition ${
                        selectedBank === bank ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <span className="font-black text-gray-800 text-lg uppercase tracking-wider">{bank}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4 relative">
                  <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 uppercase">
                    NOMOR VIRTUAL ACCOUNT {selectedBank}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-black text-gray-900 tracking-widest">
                      8077 1234 5678 9012
                    </div>
                    <button className="flex items-center gap-2 bg-emerald-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800 transition shadow-sm">
                      <Copy className="w-4 h-4" /> Salin
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Selesaikan pembayaran sebelum besok pukul <strong className="text-gray-900">14:00 WIB</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Ringkasan Pesanan</h2>
            
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

            {/* Add-on Box Static */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-900">Laporan Ketertelusuran</span>
                    <span className="text-[10px] font-bold text-emerald-700">+Rp 25.000</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Dapatkan sertifikat digital PDF & riwayat Indeks NDVI lahan terkait batch pupuk ini untuk verifikasi keberlanjutan (ESG).
                  </p>
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

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
                <span className="text-xl font-bold text-emerald-700">{formatRupiah(total)}</span>
              </div>
            </div>

            <Link 
              href="/buyer/payment-success"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold bg-emerald-950 text-white hover:bg-emerald-900 transition shadow-sm mb-4"
            >
              Bayar Sekarang <FileText className="w-4 h-4" />
            </Link>
            
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-gray-400">
              <Lock className="w-3 h-3" /> Pembayaran Aman & Terenkripsi (SSL)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


