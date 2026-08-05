"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  ClipboardList, 
  Leaf, 
  Sprout, 
  Package, 
  ArrowRight,
  MoreVertical,
  X,
  Utensils,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function TenantDashboardPage() {
  // Modal states: null, 'detail', 'resolve'
  const [modalState, setModalState] = useState<null | "detail" | "resolve">(null);
  
  // Resolve options: null, 'partial', 'delay', 'reject'
  const [resolveOption, setResolveOption] = useState<null | "partial" | "delay" | "reject">(null);
  const [rejectReason, setRejectReason] = useState<null | "gagal" | "kuota">(null);

  return (
    <div className="p-8 pb-20 relative min-h-full">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-emerald-950 mb-2">Dashboard</h1>
        <p className="text-gray-500">Ringkasan operasional dan keuangan Farm Fresh Berdikari.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1 */}
        <div className="bg-[#1e5033] text-white rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="text-xs font-semibold text-emerald-100 mb-2">Dana Escrow Tertahan</div>
          <div className="text-3xl font-black tracking-tight mb-6">Rp 15.400.000</div>
          <div className="text-[10px] text-emerald-100 leading-tight">
            Estimasi cair<br/>5 Agustus 2026, 20:00 WIB
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-red-50/30 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">Perlu Tindakan</div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">3 Pesanan</div>
          <div className="text-xs text-red-700 font-medium">
            Menunggu konfirmasi<br/>ketersediaan panen.
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-blue-50/30 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">PO Aktif</div>
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">8 PO</div>
          <div className="text-xs text-blue-700 font-medium">
            Sedang dalam proses<br/>pemenuhan.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Status Batch Lahan */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-emerald-950">Status Batch Lahan</h2>
              <button><MoreVertical className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5 text-gray-700"><Sprout className="w-4 h-4 text-emerald-600" /> Masa Tanam (4 Batch)</span>
                  <span className="text-gray-500">60%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-700 h-2.5 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5 text-gray-700"><CheckCircle2 className="w-4 h-4 text-yellow-500" /> Siap Panen (1 Batch)</span>
                  <span className="text-gray-500">20%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5 text-gray-700"><Package className="w-4 h-4 text-blue-500" /> Sedang Dikirim (2 Batch)</span>
                  <span className="text-gray-500">20%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>

            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
              <button className="text-xs font-bold text-emerald-900 hover:text-emerald-700 transition inline-flex items-center gap-1">
                Lihat Manajemen Batch <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* PO AKTIF List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-indigo-900 uppercase tracking-widest">PO Aktif</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Item 1 */}
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition bg-blue-50/20">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">!</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0991</div>
                    <div className="text-xs text-gray-600 mb-0.5">50 Box Tomat</div>
                    <div className="text-[10px] text-gray-500">Rp 5.350.000 estimasi panen 07 ags 2026</div>
                  </div>
                </div>
                <button className="bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
                  Lihat detail
                </button>
              </div>

              {/* Item 2 */}
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-sm">!</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0992</div>
                    <div className="text-xs text-gray-600 mb-0.5">100 Kg Sawi</div>
                    <div className="text-[10px] text-gray-500">Rp 8.550.000 estimasi panen 11 ags 2026</div>
                  </div>
                </div>
                <button className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
                  Konfirmasi
                </button>
              </div>

              {/* Item 3 */}
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-sm">!</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0993</div>
                    <div className="text-xs text-gray-600 mb-0.5">20 Box Cabai</div>
                    <div className="text-[10px] text-gray-500">Rp 1.500.000 estimasi panen 12 ags 2026</div>
                  </div>
                </div>
                <button className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-sm font-bold text-red-700">Butuh Konfirmasi Ketersediaan</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Conf Item 1 */}
              <div className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0991</div>
                  <div className="text-xs text-gray-500">50 Box Tomat</div>
                </div>
                <button 
                  onClick={() => setModalState("detail")}
                  className="bg-[#1e5033] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#153e26] transition"
                >
                  Konfirmasi
                </button>
              </div>

              {/* Conf Item 2 */}
              <div className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0992</div>
                  <div className="text-xs text-gray-500">100 Kg Sawi</div>
                </div>
                <button className="bg-[#1e5033] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#153e26] transition">
                  Konfirmasi
                </button>
              </div>

              {/* Conf Item 3 */}
              <div className="p-5 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <div className="font-bold text-gray-900 text-sm mb-0.5">PO-0993</div>
                  <div className="text-xs text-gray-500">20 Box Cabai</div>
                </div>
                <button className="bg-[#1e5033] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#153e26] transition">
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS OVERLAY --- */}
      {modalState !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setModalState(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* ---------------- STATE: DETAIL ---------------- */}
            {modalState === "detail" && (
              <>
                <div className="p-6 border-b border-gray-100 relative">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full mb-3 tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> MENDESAK
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Pesanan</h3>
                  <p className="text-xs text-gray-500">PO-0991 • Menunggu persetujuan Anda.</p>
                  
                  <button 
                    onClick={() => setModalState(null)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="text-xs text-gray-500 mb-2">Pemesan:</div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="font-bold text-gray-900">Restoran HORECA Sejahtera</div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 font-bold text-gray-700">
                        <Package className="w-4 h-4" /> Detail Pesanan
                      </div>
                      <div className="font-bold text-gray-500">Qty: 50 Box</div>
                    </div>
                    <div className="p-5">
                      <div className="font-bold text-gray-900 text-sm mb-1">50 Box - Tomat Beef Premium</div>
                      <div className="text-xs text-gray-500 mb-6">Varietas: Solanum lycopersicum L.</div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <div className="font-bold text-gray-700 text-xs">Total Nilai:</div>
                        <div className="font-black text-lg text-emerald-900">Rp 7.500.000</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Sistem mendeteksi kuota panen Anda <strong>(Est. 14 Ags)</strong> masih mencukupi untuk pesanan ini.
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-4">
                  <button 
                    onClick={() => setModalState("resolve")}
                    className="flex-1 py-3.5 rounded-xl border-2 border-red-600 text-red-600 font-bold text-sm hover:bg-red-50 transition"
                  >
                    Tolak / Sesuaikan
                  </button>
                  <button 
                    onClick={() => {
                      setModalState(null);
                      alert("Pesanan diterima!");
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-[#0a381f] text-white font-bold text-sm hover:bg-[#114b2d] transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <ClipboardList className="w-4 h-4" /> Terima Pesanan
                  </button>
                </div>
              </>
            )}

            {/* ---------------- STATE: RESOLVE ---------------- */}
            {modalState === "resolve" && (
              <>
                <div className="p-6 border-b border-gray-100 relative">
                  <button 
                    onClick={() => setModalState("detail")}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition flex items-center gap-1 mb-4 -ml-2 p-2"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                  </button>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Tolak atau Sesuaikan</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">PO-0991</span>
                    <span>• 50 Box Tomat Beef Premium</span>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                      Perubahan pesanan akan dikirimkan ke pihak Pembeli (HORECA) untuk disetujui kembali via sistem <strong>Harvest Assurance</strong>.
                    </p>
                  </div>

                  {/* Option 1: Partial */}
                  <label className={`block border rounded-xl overflow-hidden cursor-pointer transition ${resolveOption === "partial" ? "border-emerald-600 ring-1 ring-emerald-600" : "border-gray-200 hover:border-emerald-300"}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-gray-900 mb-0.5">Sesuaikan Kuantitas (Kirim Sebagian)</div>
                        <div className="text-[10px] text-gray-500">Sanggup memenuhi sebagian pesanan.</div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        {resolveOption === "partial" && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                      </div>
                      <input 
                        type="radio" 
                        name="resolve" 
                        className="hidden" 
                        checked={resolveOption === "partial"}
                        onChange={() => setResolveOption("partial")} 
                      />
                    </div>
                    {resolveOption === "partial" && (
                      <div className="px-4 pb-4 pt-1 bg-emerald-50/30 flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700">Sanggup kirim:</span>
                        <input type="number" defaultValue="30" className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-900" />
                        <span className="text-xs font-bold text-gray-700">dari <span className="text-gray-900">50 Box</span></span>
                      </div>
                    )}
                  </label>

                  {/* Option 2: Delay */}
                  <label className={`block border rounded-xl overflow-hidden cursor-pointer transition ${resolveOption === "delay" ? "border-emerald-600 ring-1 ring-emerald-600" : "border-gray-200 hover:border-emerald-300"}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-gray-900 mb-0.5">Mundurkan Jadwal Panen</div>
                        <div className="text-[10px] text-gray-500">Barang tersedia, namun butuh waktu lebih lama.</div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        {resolveOption === "delay" && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
                      </div>
                      <input 
                        type="radio" 
                        name="resolve" 
                        className="hidden" 
                        checked={resolveOption === "delay"}
                        onChange={() => setResolveOption("delay")} 
                      />
                    </div>
                    {resolveOption === "delay" && (
                      <div className="px-4 pb-4 pt-1 bg-emerald-50/30 flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700">Tanggal panen :</span>
                        <input 
                          type="date" 
                          defaultValue="2026-09-18" 
                          className="text-sm font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    )}
                  </label>

                  {/* Option 3: Reject (Accordion) */}
                  <div className={`border rounded-xl overflow-hidden transition ${resolveOption === "reject" ? "border-red-500" : "border-gray-200"}`}>
                    <label className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition">
                      <div className="flex-1">
                        <div className={`font-bold text-sm mb-0.5 ${resolveOption === "reject" ? "text-red-900" : "text-gray-900"}`}>Tolak Seluruhnya</div>
                        <div className="text-[10px] text-gray-500">Gagal panen atau kuota sudah habis.</div>
                      </div>
                      {resolveOption === "reject" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      <input 
                        type="radio" 
                        name="resolve" 
                        className="hidden" 
                        checked={resolveOption === "reject"}
                        onChange={() => {
                          setResolveOption("reject");
                          setRejectReason(null);
                        }} 
                      />
                    </label>
                    {resolveOption === "reject" && (
                      <div className="p-4 bg-red-50/30 border-t border-red-100 flex gap-3">
                        {/* Gagal Panen */}
                        <label className={`flex-1 flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${rejectReason === "gagal" ? "bg-white border-red-600 ring-1 ring-red-600" : "bg-white border-gray-200"}`}>
                          <span className="text-xs font-bold text-gray-900">Gagal Panen</span>
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                            {rejectReason === "gagal" && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                          </div>
                          <input 
                            type="radio" 
                            name="rejectReason" 
                            className="hidden" 
                            checked={rejectReason === "gagal"}
                            onChange={() => setRejectReason("gagal")}
                          />
                        </label>
                        {/* Kuota Habis */}
                        <label className={`flex-1 flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${rejectReason === "kuota" ? "bg-red-50 border-red-600 ring-1 ring-red-600" : "bg-white border-gray-200"}`}>
                          <span className="text-xs font-bold text-gray-900">Kuota Habis</span>
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                            {rejectReason === "kuota" && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                          </div>
                          <input 
                            type="radio" 
                            name="rejectReason" 
                            className="hidden" 
                            checked={rejectReason === "kuota"}
                            onChange={() => setRejectReason("kuota")}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end">
                  <button 
                    disabled={!resolveOption || (resolveOption === "reject" && !rejectReason)}
                    className="py-3 px-6 rounded-xl bg-[#0a381f] text-white font-bold text-sm hover:bg-[#114b2d] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
                  >
                    Kirim Penawaran Baru <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
