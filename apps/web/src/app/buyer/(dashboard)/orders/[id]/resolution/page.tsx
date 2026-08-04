"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Package, Calendar, Receipt } from "lucide-react";

export default function ResolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id; // "4" or "5"

  const isTotalFailure = orderId === "5";
  const totalBox = 50;
  const availableBox = isTotalFailure ? 0 : 30;
  const failedBox = isTotalFailure ? 50 : 20;
  const refundAmount = isTotalFailure ? "5.530.000" : "1.833.000";

  // State for Tahap 1 selection
  // If total failure (available === 0), the only option is 'reject'
  const [step1Selection, setStep1Selection] = useState<"partial" | "reject">(isTotalFailure ? "reject" : "partial");

  // State for accordions in Tahap 2
  const [openAccordion, setOpenAccordion] = useState<string>("refund");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <Link href="/buyer/orders" className="text-gray-500 hover:text-gray-900 transition flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pesanan Saya
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-950 mb-2">
            Resolusi Harvest Assurance Pesanan #AGR-202608-0991
          </h1>
          <p className="text-gray-500 text-sm">
            Lengkapi informasi lokasi dan waktu operasional gudang/lahan Anda untuk memastikan logistik yang tepat.
          </p>
        </div>

        {/* Alert Banner */}
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 mb-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700 text-sm mb-1">
              Gagal Panen {isTotalFailure ? "Total" : "Parsial"} (Cuaca Ekstrem)
            </h3>
            <p className="text-red-700 text-sm">
              Anda memesan {totalBox} box Cabe Rawit Raweh, namun saat ini hanya tersedia {availableBox} box dari Tenant (Farm Fresh Berdikari).
            </p>
          </div>
        </div>

        {/* Tahap 1 */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Tahap 1: Apa yang ingin Anda lakukan dengan {availableBox} box yang tersedia?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Terima Sebagian Card */}
            <button
              disabled={isTotalFailure}
              onClick={() => setStep1Selection("partial")}
              className={`relative p-5 rounded-xl border text-left transition-all ${
                isTotalFailure ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200" :
                step1Selection === "partial" 
                  ? "border-emerald-700 bg-emerald-50 shadow-sm" 
                  : "border-gray-200 bg-white hover:border-emerald-300"
              }`}
            >
              {step1Selection === "partial" && (
                <div className="absolute top-4 right-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
              <h3 className={`font-bold mb-1 ${step1Selection === "partial" ? "text-emerald-900" : "text-gray-900"}`}>
                Terima Sebagian ({availableBox} Box)
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed pr-8">
                {availableBox} box akan tetap dikirim. Sisa {failedBox} box akan diselesaikan lewat Asuransi.
              </p>
            </button>

            {/* Tolak Semua Pesanan Card */}
            <button
              onClick={() => setStep1Selection("reject")}
              className={`relative p-5 rounded-xl border text-left transition-all ${
                step1Selection === "reject" 
                  ? "border-emerald-700 bg-emerald-50 shadow-sm" 
                  : "border-gray-200 bg-white hover:border-emerald-300"
              }`}
            >
              {step1Selection === "reject" && (
                <div className="absolute top-4 right-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
              <h3 className={`font-bold mb-1 ${step1Selection === "reject" ? "text-emerald-900" : "text-gray-900"}`}>
                Tolak Semua Pesanan
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed pr-8">
                Batalkan pengiriman ini. Seluruh {totalBox} box akan diselesaikan lewat Asuransi.
              </p>
            </button>
          </div>
        </div>

        {/* Tahap 2 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {step1Selection === "partial" 
              ? `Tahap 2: Pilih resolusi untuk sisa ${failedBox} box yang gagal panen.` 
              : "Tahap 2: Konfirmasi untuk pengembalian dana penuh."}
          </h2>

          <div className="space-y-4">
            {step1Selection === "partial" && (
              <>
                {/* Accordion 1: Terima Sebagian */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === "terima" ? "" : "terima")}
                    className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
                  >
                    <span className="font-bold text-sm text-gray-900">1. Terima Sebagian</span>
                    {openAccordion === "terima" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {openAccordion === "terima" && (
                    <div className="px-6 pb-6 pt-2 bg-gray-50/50">
                      <p className="text-xs text-gray-500 mb-4">Berdasarkan hasil panen yang tersedia saat ini hanya bisa memenuhi sebagian.</p>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">Terima Sebagian Sisa yang Berhasil Dipanen</h4>
                            <p className="text-xs text-gray-500">Tersedia: {availableBox} Box</p>
                          </div>
                        </div>
                        <button className="px-6 py-2 border border-emerald-600 text-emerald-700 font-semibold text-sm rounded-lg hover:bg-emerald-50 transition">
                          Terima
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Jadwal Ulang */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === "jadwal" ? "" : "jadwal")}
                    className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
                  >
                    <span className="font-bold text-sm text-gray-900">2. Jadwal Ulang dari Tenant Sama</span>
                    {openAccordion === "jadwal" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {openAccordion === "jadwal" && (
                    <div className="px-6 pb-6 pt-2 bg-blue-50/30">
                      <p className="text-xs text-gray-500 mb-4">Tunggu siklus panen berikutnya dari Farm Fresh Berdikari.</p>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">Estimasi Panen Berikutnya: 14 Ags 2026</h4>
                          </div>
                        </div>
                        <button className="px-6 py-2 bg-blue-200 text-blue-800 border border-blue-300 font-semibold text-sm rounded-lg hover:bg-blue-300 transition">
                          Pilih Jadwal Ulang
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Accordion 3: Refund Dana */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button 
                onClick={() => setOpenAccordion(openAccordion === "refund" ? "" : "refund")}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
              >
                <span className="font-bold text-sm text-gray-900">
                  {step1Selection === "partial" ? "3. Refund Dana Pembelian" : "Refund Dana Pembelian"}
                </span>
                {openAccordion === "refund" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {openAccordion === "refund" && (
                <div className="px-6 pb-6 pt-2 bg-red-50/50">
                  <p className="text-xs text-gray-500 mb-4">
                    {step1Selection === "partial" 
                      ? "Tunggu siklus panen berikutnya dari Farm Fresh Berdikari." 
                      : "Dana akan dikembalikan secara penuh karena Anda menolak sisa pesanan."}
                  </p>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <Receipt className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-800 text-sm max-w-md leading-relaxed">
                          {step1Selection === "partial"
                            ? `Dana untuk ${failedBox} box yang gagal panen (Rp ${refundAmount}) akan dikembalikan ke saldo / rekening Anda dalam 1x24 jam.`
                            : `Dana dari pesanan (Rp 5.530.000) akan dikembalikan secara penuh ke saldo / rekening Anda dalam 1x24 jam.`
                          }
                        </h4>
                      </div>
                    </div>
                    <button className="shrink-0 px-6 py-2.5 bg-red-200 text-red-700 border border-red-300 font-semibold text-sm rounded-lg hover:bg-red-300 transition">
                      Refund sisa pesanan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
