"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Building2,
  Check
} from "lucide-react";

export default function ResolutionPage() {
  const [decision, setDecision] = useState<"terima_sebagian" | "tolak_semua">("tolak_semua");
  const [openAccordion, setOpenAccordion] = useState<string>("refund");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back button */}
      <Link 
        href="/buyer/orders" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pesanan Saya
      </Link>

      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950 mb-2">Resolusi Harvest Assurance Pesanan #AGR-202608-0991</h1>
        <p className="text-gray-500 text-sm">Lengkapi informasi lokasi dan waktu operasional gudang/lahan Anda untuk memastikan logistik yang tepat.</p>
      </div>

      {/* Alert Banner */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Gagal Panen Parsial (Cuaca Ekstrem)</h3>
            <p className="text-sm text-red-700">
              Anda memesan 50 box Cabe Rawit Merah, namun saat ini hanya tersedia 30 box dari Tenant (Farm Fresh Berdikari).
            </p>
          </div>
        </div>
      </div>

      {/* Tahap 1 */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Tahap 1: Apa yang ingin Anda lakukan dengan 30 box yang tersedia?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Option: Terima Sebagian */}
          <button 
            onClick={() => {
              setDecision("terima_sebagian");
              setOpenAccordion("substitusi");
            }}
            className={`text-left p-5 rounded-xl border transition relative ${
              decision === "terima_sebagian" 
                ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                : "bg-white border-gray-200 hover:border-emerald-300"
            }`}
          >
            <h3 className="font-bold text-gray-900 text-sm mb-1">Terima Sebagian (30 Box)</h3>
            <p className="text-xs text-gray-500">30 box akan tetap dikirim. Sisa 20 box akan diselesaikan lewat Asuransi.</p>
            {decision === "terima_sebagian" && (
              <div className="absolute top-4 right-4 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </button>

          {/* Option: Tolak Semua */}
          <button 
            onClick={() => {
              setDecision("tolak_semua");
              setOpenAccordion("refund_all");
            }}
            className={`text-left p-5 rounded-xl border transition relative ${
              decision === "tolak_semua" 
                ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                : "bg-white border-gray-200 hover:border-emerald-300"
            }`}
          >
            <h3 className="font-bold text-gray-900 text-sm mb-1">Tolak Semua Pesanan</h3>
            <p className="text-xs text-gray-500">Batalkan pengiriman ini. Seluruh 50 box akan diselesaikan lewat Asuransi.</p>
            {decision === "tolak_semua" && (
              <div className="absolute top-4 right-4 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Tahap 2 */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          {decision === "tolak_semua" 
            ? "Tahap 2: Konfirmasi untuk pengembalian dana penuh." 
            : "Tahap 2: Pilih resolusi untuk sisa 20 box yang gagal panen."}
        </h2>
        
        {decision === "tolak_semua" ? (
          /* Single Option for Tolak Semua */
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button 
              onClick={() => setOpenAccordion(openAccordion === "refund_all" ? "" : "refund_all")}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="font-bold text-gray-900 text-sm">Refund Dana Pembelian</div>
              {openAccordion === "refund_all" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {openAccordion === "refund_all" && (
              <div className="p-6 bg-red-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-4">Tunggu siklus panen berikutnya dari Farm Fresh Berdikari.</p>
                <div className="bg-white border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                      <span className="text-red-600 font-bold text-xs">Rp</span>
                    </div>
                    <div className="text-sm font-bold text-red-900 leading-snug">
                      Dana dari pesanan (Rp 5.530.000) akan dikembalikan secara penuh ke saldo / rekening Anda dalam 1x24 jam.
                    </div>
                  </div>
                  <button className="shrink-0 bg-red-200 text-red-800 hover:bg-red-300 px-4 py-2 rounded-lg text-xs font-bold transition">
                    Refund sisa pesanan
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Multiple Options for Terima Sebagian */
          <div className="space-y-4">
            
            {/* Option 1: Substitusi */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "substitusi" ? "" : "substitusi")}
                className={`w-full px-6 py-4 flex items-center justify-between transition ${openAccordion === "substitusi" ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="font-bold text-gray-900 text-sm">1. Substitusi dari Tenant Lain (Harga Terkunci)</div>
                {openAccordion === "substitusi" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {openAccordion === "substitusi" && (
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-4">
                    Sistem menemukan tenant pengganti di zona Malang Raya dengan grade mutu yang sama. Anda tidak akan dikenakan biaya tambahan.
                  </p>
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 text-sm">Kebun Agro Maju</h4>
                          <span className="bg-emerald-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">MATCH DITEMUKAN</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Tersedia: 20 Box | Panen: Besok</p>
                      </div>
                    </div>
                    <button className="shrink-0 flex items-center gap-2 border border-emerald-700 text-emerald-800 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition">
                      <Check className="w-3.5 h-3.5" /> Pilih Tenant Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Jadwal Ulang */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "jadwal_ulang" ? "" : "jadwal_ulang")}
                className={`w-full px-6 py-4 flex items-center justify-between transition ${openAccordion === "jadwal_ulang" ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="font-bold text-gray-900 text-sm">2. Jadwal Ulang dari Tenant Sama</div>
                {openAccordion === "jadwal_ulang" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {openAccordion === "jadwal_ulang" && (
                <div className="p-6 bg-blue-50/30 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-4">Tunggu siklus panen berikutnya dari Farm Fresh Berdikari.</p>
                  <div className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm font-bold text-blue-900">
                        Estimasi Panen Berikutnya: 14 Ags 2026
                      </div>
                    </div>
                    <button className="shrink-0 bg-blue-200 text-blue-800 hover:bg-blue-300 px-4 py-2 rounded-lg text-xs font-bold transition">
                      Pilih Jadwal Ulang
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option 3: Refund Dana */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "refund_partial" ? "" : "refund_partial")}
                className={`w-full px-6 py-4 flex items-center justify-between transition ${openAccordion === "refund_partial" ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="font-bold text-gray-900 text-sm">3. Refund Dana Pembelian</div>
                {openAccordion === "refund_partial" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {openAccordion === "refund_partial" && (
                <div className="p-6 bg-red-50/50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-4">Tunggu siklus panen berikutnya dari Farm Fresh Berdikari.</p>
                  <div className="bg-white border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                        <span className="text-red-600 font-bold text-xs">Rp</span>
                      </div>
                      <div className="text-sm font-bold text-red-900 leading-snug">
                        Dana untuk 20 box yang gagal panen (Rp 1.833.000) akan dikembalikan ke saldo / rekening Anda dalam 1x24 jam.
                      </div>
                    </div>
                    <button className="shrink-0 bg-red-200 text-red-800 hover:bg-red-300 px-4 py-2 rounded-lg text-xs font-bold transition">
                      Refund sisa pesanan
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
