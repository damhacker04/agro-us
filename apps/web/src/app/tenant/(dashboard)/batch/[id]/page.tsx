"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft,
  Settings,
  LogOut,
  Leaf,
  ShieldCheck,
  TrendingUp,
  ShoppingCart,
  Map,
  Plus,
  CheckCircle2,
  Droplets,
  Camera,
  Image as ImageIcon,
  X,
  Lock,
  ChevronDown,
  Calendar,
  AlertTriangle,
  Layers
} from "lucide-react";

export default function TenantBatchDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPOOpen = searchParams.get('po') === 'open';

  const [isProgressEnded, setIsProgressEnded] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const [progressReports] = useState([
    {
      id: 1,
      type: "Bibit Ditanam",
      desc: "Penanaman bibit di lahan blok utara.",
      time: "10 Ags, 08:00 WIB",
      author: "Admin",
      gps: "Cocok di dalam poligon",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      color: "border-[#165634]",
      inApp: true
    },
    {
      id: 2,
      type: "Penyiraman & Pupuk",
      desc: "Pemberian nutrisi AB Mix dosis 1.5 EC.",
      time: "12 Ags, 08:30 WIB",
      author: "Admin",
      gps: "Cocok di dalam poligon",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      color: "border-[#165634]",
      inApp: true
    },
    {
      id: 3,
      type: "Penyiraman & Pupuk",
      desc: "Pemberian nutrisi BC Mix dosis 1.5 EC.",
      time: "12 Ags, 08:30 WIB",
      author: "Admin",
      gps: "Cocok di dalam poligon",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      color: "border-amber-400",
      inApp: false
    },
    {
      id: 4,
      type: "Penyiraman & Pupuk",
      desc: "Pemberian nutrisi BC Mix dosis 1.5 EC.",
      time: "15 Ags, 08:30 WIB",
      author: "Admin",
      gps: "Cocok di dalam poligon",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      color: "border-[#165634]",
      inApp: true
    },
    {
      id: 5,
      type: "Panen",
      desc: "Pemanenan sayur.",
      time: "15 Ags, 08:30 WIB",
      author: "Admin",
      gps: "Cocok di dalam poligon",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      color: "border-[#165634]",
      inApp: true
    }
  ]);


  return (
    <div className="p-8 pb-24 max-w-6xl mx-auto relative min-h-full">
      
      {/* Top Header */}
      <div className="mb-6">
        <Link 
          href="/tenant/batch"
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Manajemen Batch
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-emerald-950 tracking-tight mb-2">Batch B-1001: Tomat Beef Premium</h1>
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" /> Lokasi tanam : blok utara (0,2 ha • poligon #129)
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Terverifikasi NDVI
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Product Gallery Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 space-y-2">
              <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200">
                <div className="absolute top-3 left-3 bg-[#165634] text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider z-10 shadow-sm">
                  GRADE A
                </div>
                <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Tomat Beef" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative w-full aspect-video rounded-lg border-2 border-emerald-500 overflow-hidden bg-gray-100">
                  <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="thumb1" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="relative w-full aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-100 opacity-60 hover:opacity-100 cursor-pointer">
                  <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="thumb2" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="relative w-full aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-100 opacity-60 hover:opacity-100 cursor-pointer">
                  <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="thumb3" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Tomat Beef Premium</h2>
              <div className="text-gray-500 text-sm mb-6">
                <span className="text-xl font-bold text-gray-900">Rp 100.000</span> / Box
              </div>
              <div className="bg-[#f0f4f8] rounded-xl p-4 w-32 border border-gray-200">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">KAPASITAS KG/BOX</div>
                <div className="text-sm font-bold text-gray-900 flex items-end gap-2">
                  15 <span className="text-xs font-semibold text-gray-600 mb-0.5">Kg/Box</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentinel-2 Monitoring */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Pemantauan Satelit Sentinel-2
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">NDVI SCORE</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-emerald-700 leading-none">0.85</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Excellent</span>
                </div>
              </div>
            </div>
            
            <div className="h-48 border border-gray-200 border-dashed rounded-xl flex items-center justify-center bg-gray-50/50 relative overflow-hidden">
              {/* Dummy Chart */}
              <div className="absolute inset-x-8 bottom-0 flex items-end justify-between px-4">
                <div className="w-12 bg-[#cbd5e1] rounded-t-sm" style={{ height: '30%' }}></div>
                <div className="w-12 bg-[#cbd5e1] rounded-t-sm" style={{ height: '45%' }}></div>
                <div className="w-12 bg-[#94a3b8] rounded-t-sm" style={{ height: '55%' }}></div>
                <div className="w-12 bg-[#cbd5e1] rounded-t-sm" style={{ height: '65%' }}></div>
                <div className="w-12 bg-[#94a3b8] rounded-t-sm" style={{ height: '90%' }}></div>
              </div>
              
              <div className="z-10 text-center backdrop-blur-sm bg-white/60 p-4 rounded-xl">
                <TrendingUp className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-gray-700">Visualisasi NDVI & LAI</div>
                <div className="text-[10px] text-gray-500">Grafik historis kerapatan vegetasi berdasarkan citra satelit terbaru (Terakhir Update: 14 Ags 2026)</div>
              </div>
            </div>
          </div>

          {/* Operational History */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <Layers className="w-4 h-4 text-emerald-600" /> Riwayat Operasional
              </div>
              {!isProgressEnded && (
                <button 
                  onClick={() => router.push("/tenant/batch/B-1001/progress/new")}
                  className="bg-[#165634] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#114529] transition shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Lapor Progres
                </button>
              )}
            </div>

            <div className="relative pl-3 space-y-8 before:absolute before:inset-y-0 before:left-[17px] before:w-px before:bg-gray-200">
              
              {progressReports.map((report) => (
                <div key={report.id} className="relative pl-10">
                  <div className={`absolute left-1 top-1.5 w-3 h-3 rounded-full border-2 bg-white ${report.color} z-10`}></div>
                  
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                      {report.type}
                    </div>
                    <div className="bg-gray-100 text-gray-500 text-[9px] font-bold px-2 py-1 rounded border border-gray-200">
                      {report.time}
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                    {report.desc}
                  </p>
                  
                  <div className="text-[10px] text-gray-500 mb-3 flex items-center gap-2">
                    <span>Oleh: <strong className="text-gray-700">{report.author}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Map className="w-3 h-3" /> GPS: <span className="text-[#165634] font-bold">{report.gps}</span></span>
                  </div>

                  {report.image && (
                    <div className="flex gap-2">
                      <div className="relative group w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        <img src={report.image} alt={report.type} className="absolute inset-0 w-full h-full object-cover" />
                        <div className={`absolute top-2 left-2 backdrop-blur text-[7px] font-bold px-1.5 py-0.5 rounded shadow-sm border flex items-center gap-1 z-10 ${
                          report.inApp 
                            ? "bg-white/90 text-[#165634] border-emerald-100" 
                            : "bg-[#fdffe4]/90 text-amber-800 border-amber-200"
                        }`}>
                          <ImageIcon className="w-2 h-2" /> 
                          {report.inApp ? "Dilengkapi foto In-App" : "Foto Diambil dari Galeri"}
                        </div>
                      </div>
                      <div className="w-24 h-24 shrink-0 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition cursor-pointer">
                        <Plus className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
            </div>

            {isPOOpen && !isProgressEnded && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <button 
                  onClick={() => setShowEndConfirm(true)}
                  className="w-full bg-[#0a381f] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#114b2d] transition"
                >
                  Akhiri
                  <div className="text-[9px] font-normal opacity-80 mt-0.5">Tekan tombol ini jika Anda yakin seluruh progres telah selesai dilakukan</div>
                </button>
              </div>
            )}

            {isProgressEnded && (
              <div className="mt-8 pt-6 flex justify-center">
                <div className="text-[10px] font-bold text-gray-900">Progres telah di akhiri</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          
          {/* Status PO Card */}
          <div className="bg-[#f5f8ff] border border-blue-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm">Status PO & Kuota</h3>
                <div className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 ${isPOOpen ? 'bg-white border-blue-200 text-blue-600' : 'bg-transparent border-gray-300 text-gray-500'}`}>
                  {isPOOpen ? 'Dibuka' : 'Belum Dibuka'}
                </div>
              </div>
            </div>

            {isPOOpen ? (
              <div className="mb-6">
                <div className="flex justify-between text-[10px] font-bold text-blue-800 mb-1.5">
                  <span>Terjual: 20 / 35 Box</span>
                  <span>60%</span>
                </div>
                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }}></div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white border border-blue-50 rounded-xl p-3 shadow-sm">
                    <div className="text-[8px] font-bold text-blue-400 uppercase tracking-wider mb-1">ESTIMASI PANEN</div>
                    <div className="text-xs font-black text-blue-900">15 Okt '26</div>
                  </div>
                  <div className="bg-white border border-blue-50 rounded-xl p-3 shadow-sm">
                    <div className="text-[8px] font-bold text-blue-400 uppercase tracking-wider mb-1">SISA KUOTA</div>
                    <div className="text-xs font-black text-blue-900">15 Box</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="text-xs font-bold text-blue-400 mb-4">Kuota belum ditentukan</div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-transparent border border-blue-100 rounded-xl p-3">
                    <div className="text-[8px] font-bold text-blue-300 uppercase tracking-wider mb-1">ESTIMASI PANEN</div>
                    <div className="text-xs font-semibold text-blue-300">Belum ditentukan</div>
                  </div>
                  <div className="bg-transparent border border-blue-100 rounded-xl p-3">
                    <div className="text-[8px] font-bold text-blue-300 uppercase tracking-wider mb-1">SISA KUOTA</div>
                    <div className="text-xs font-semibold text-blue-300">Data belum ada</div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => router.push("/tenant/batch/B-1001/edit-po")}
              className="w-full bg-blue-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Buka/Edit Kuota PO
            </button>
          </div>

          {/* Land Metadata Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-gray-50 rounded-full border border-gray-100"></div>
            
            <h3 className="font-black text-gray-900 text-sm mb-4 relative z-10">Metadata Lahan</h3>
            
            <div className="space-y-3 mb-6 text-xs relative z-10">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Varietas</span>
                <span className="font-bold text-gray-900">Beef Tomato X-1</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Luas Poligon</span>
                <span className="font-bold text-gray-900">1,240 m²</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Kondisi Tanah</span>
                <span className="font-bold text-gray-900 flex items-center gap-1">Normal <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span></span>
              </div>
            </div>

            <div className="w-full h-24 bg-gray-100 rounded-xl border border-gray-200 relative overflow-hidden">
              {/* Dummy mini map image */}
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="map" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-xl m-2 pointer-events-none"></div>
            </div>
          </div>

        </div>
      </div>

      {/* End Progress Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900">Konfirmasi Akhiri Progres</h3>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-gray-700 leading-relaxed mb-6">
                Apakah Anda Yakin telah Melakukan Semua Aktivitas dan Memasukkannya di Laporan Progres?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Tidak
                </button>
                <button 
                  onClick={() => {
                    setIsProgressEnded(true);
                    setShowEndConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-[#0a381f] text-white text-xs font-bold hover:bg-[#114b2d] transition"
                >
                  Yakin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon Helper
const MapPin = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
)
