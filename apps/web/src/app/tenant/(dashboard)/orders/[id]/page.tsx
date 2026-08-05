"use client";

import React, { use, useState } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Package, 
  Truck, 
  Printer, 
  FileText, 
  Check, 
  MapPin, 
  Activity, 
  Download, 
  Camera, 
  Info,
  CheckCircle2,
  Circle,
  QrCode,
  Hand,
  XCircle,
  RefreshCcw,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage({ params, searchParams }: any) {
  // Unwrap params and searchParams for Next.js 15
  const resolvedParams = use(params) as any;
  const resolvedSearchParams = use(searchParams) as any;
  
  const statusParam = resolvedSearchParams?.status || 'menunggu-panen';
  const id = resolvedParams?.id || 'B-1001';

  // Simulated State for "Kurir Salah 5x"
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  const getStatusPill = () => {
    switch(statusParam) {
      case 'siap-packing':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold">
            <Package className="w-3 h-3" /> Siap Packing
          </div>
        );
      case 'dikirim':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f4f8] border border-[#d9e2ec] text-[#4f6f8f] text-[10px] font-bold">
            <Truck className="w-3 h-3" /> Dikirim
          </div>
        );
      case 'menolak':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-bold">
            <Hand className="w-3 h-3" /> Menolak
          </div>
        );
      case 'dibatalkan':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">
            <XCircle className="w-3 h-3" /> Dibatalkan
          </div>
        );
      case 'selesai':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Selesai (Dana Cair)
          </div>
        );
      case 'menunggu-penyesuaian':
        return (
          <div className="inline-flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-600 text-[10px] font-bold leading-tight">
            <div className="flex items-center gap-1.5"><RefreshCcw className="w-3 h-3" /> Menunggu Penyesuaian</div>
            <span className="text-[8px] font-normal opacity-90">Persetujuan Penawaran Baru</span>
          </div>
        );
      case 'menunggu-panen':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold">
            <Clock className="w-3 h-3" /> Menunggu Panen
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-white min-h-screen">
      
      {/* Breadcrumb */}
      <div>
        <Link href="/tenant/orders" className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-[#0a381f] transition">
          <ArrowLeft className="w-3 h-3" /> Kembali ke Manajemen Batch
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-[#0a381f] flex items-center gap-2">
            Batch {id}: Tomat Beef Premium
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Lokasi tanam : blok utara (0.2 ha • poligon #129)
          </p>
        </div>
        <div>
          {statusParam === 'selesai' ? (
            <div className="flex items-center gap-3">
              <Link href={`/tenant/orders/${id}/invoice`} className="border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 font-bold text-[10px] px-4 py-2 rounded-lg transition">
                Lihat Invoice
              </Link>
              {getStatusPill()}
            </div>
          ) : (
            getStatusPill()
          )}
        </div>
      </div>

      {/* Product Summary Row */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left: Images */}
        <div className="w-full md:w-[320px] shrink-0 space-y-2">
          {/* Main Image placeholder */}
          <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl border border-gray-200 relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-3 left-3 bg-[#0a381f] text-white text-[9px] font-black px-2 py-1 rounded-full z-10">GRADE A</div>
            <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=600&auto=format&fit=crop" alt="Tomatoes" className="w-full h-full object-cover" />
          </div>
          {/* Thumbnails */}
          <div className="grid grid-cols-3 gap-2">
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
               <img src="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=200&auto=format&fit=crop" alt="Thumb 1" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
               <img src="https://images.unsplash.com/photo-1627844642677-9b4df15a6bfa?q=80&w=200&auto=format&fit=crop" alt="Thumb 2" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
               <img src="https://images.unsplash.com/photo-1524593166156-312f362cada0?q=80&w=200&auto=format&fit=crop" alt="Thumb 3" className="w-full h-full object-cover opacity-80" />
            </div>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex-1 w-full space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#0a381f]">Tomat Beef Premium</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#0a381f]">Rp 100.000</span>
              <span className="text-xs text-gray-500 font-bold">/ Box</span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">KUANTITAS YANG DIBELI</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0a381f]">15</span>
              <span className="text-xs font-bold text-gray-500">Box</span>
            </div>
          </div>

          {statusParam === 'dikirim' && (
            <div className="pt-4 border-t border-gray-100 relative">
              {/* Dev tool to simulate failed attempt */}
              <button 
                onClick={() => setFailedAttempts(prev => prev + 1)} 
                className="absolute -top-3 right-0 bg-red-50 text-red-600 border border-red-100 text-[8px] font-bold px-2 py-1 rounded"
              >
                Simulasikan Kurir Gagal (Sekarang: {failedAttempts}x)
              </button>

              <div className="text-sm font-bold text-[#0a381f] mb-3">
                {failedAttempts >= 5 ? "Kode Antar Baru" : "Kode Antar"}
              </div>
              <div className={`border rounded-xl px-6 py-4 inline-flex ${failedAttempts >= 5 ? 'bg-[#eef3fb] border-[#d9e5f7]' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-3xl font-black tracking-[0.2em] ${failedAttempts >= 5 ? 'text-[#2d4b79]' : 'text-gray-900'}`}>
                  {failedAttempts >= 5 ? "7 1 2 2" : "6 9 0 3"}
                </span>
              </div>
              {failedAttempts >= 5 && (
                <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Kurir sebelumnya gagal 5x. Kode baru telah di-generate secara otomatis.
                </p>
              )}
            </div>
          )}

          {statusParam === 'menolak' && (
            <div className="pt-4 border-t border-gray-100">
              <div className="text-sm font-bold text-[#0a381f] mb-3">Alasan menolak pesanan</div>
              <div className="border border-gray-200 bg-white rounded-xl px-6 py-3 inline-flex shadow-sm">
                <span className="text-sm font-bold text-gray-900">Kuota habis</span>
              </div>
            </div>
          )}

          {statusParam === 'menunggu-penyesuaian' && (
            <div className="pt-4 border-t border-gray-100">
              <div className="text-sm font-bold text-[#0a381f] mb-3">Penawaran yang Diajukan</div>
              <div className="border border-gray-200 bg-white rounded-xl px-6 py-4 shadow-sm max-w-[200px]">
                <span className="text-sm font-bold text-[#0a381f]">Kirim Sebagian<br/>(30 Box)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conditionally Render Sections based on Status */}

      {statusParam === 'siap-packing' && (
        <div className="space-y-4">
          <div className="bg-[#eef3fb] border border-[#d9e5f7] rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Silakan cetak label resi di bawah ini dan tempelkan pada 100 Kg kemasan Sawi Pakcoy Anda sebelum memanggil kurir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900 mb-4">Dokumen Pengiriman</h3>
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 bg-gray-50 mb-5">
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                    <QrCode className="w-8 h-8 text-gray-800" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Label_PO0985.pdf</div>
                    <div className="text-[10px] text-gray-500 mt-1 mb-2">1.2 MB • Berisi QR Tracking</div>
                    <div className="text-[9px] font-bold bg-[#0a381f]/10 text-[#0a381f] px-2 py-1 rounded inline-block">Siap Cetak</div>
                  </div>
                </div>
              </div>
              <button className="w-full py-3 bg-[#0a381f] text-white rounded-xl text-xs font-bold hover:bg-[#114b2d] transition flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Cetak Label (PDF)
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">PASTIKAN HAL INI TERPENUHI SEBELUM MENGIRIM PESANAN</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Barang sudah dipacking</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Gunakan kemasan standar AgroUs</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Label tertempel</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Pastikan barcode terbaca jelas</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Jumlah sesuai</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Total 15 Kg Tomat Beef Premium</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {statusParam === 'dikirim' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
             <div className="flex items-center gap-2 mb-4">
               <MapPin className="w-4 h-4 text-[#0a381f]" />
               <h3 className="text-xs font-bold text-gray-900">Live Tracking</h3>
             </div>
             <div className="w-full h-48 bg-gray-100 rounded-xl relative overflow-hidden border border-gray-200">
               {/* Map Mockup */}
               <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop" alt="Map" className="w-full h-full object-cover opacity-60" />
               <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                 <div className="bg-white/90 backdrop-blur border border-blue-100 rounded-full py-2 px-4 flex items-center gap-2 shadow-lg">
                   <Truck className="w-4 h-4 text-blue-600" />
                   <span className="text-xs font-bold text-gray-900">Kurir sedang dalam perjalanan...</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-3">
               <MapPin className="w-4 h-4 text-[#0a381f]" />
               <h3 className="text-xs font-bold text-gray-900">Alamat Penerima (HORECA)</h3>
             </div>
             <div className="space-y-1">
               <div className="text-sm font-black text-gray-900">Restoran Bumbu Desa (Cabang Malang)</div>
               <div className="text-xs text-gray-500">Jl. Ijen No. 12, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115</div>
               <div className="text-[10px] text-gray-400 mt-2">Kontak: Bapak Ahmad (+62 812-3456-7890)</div>
             </div>
          </div>
        </div>
      )}


      {/* Pemantauan Satelit Sentinel-2 */}
      <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0a381f]" />
            <h3 className="text-sm font-black text-[#0a381f]">Pemantauan Satelit Sentinel-2</h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] font-bold text-gray-400">NDVI SCORE</span>
            <span className="font-black text-lg text-[#0a381f]">0.85</span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">Excellent</span>
          </div>
        </div>
        
        <div className="border border-dashed border-[#d9e2ec] bg-[#f8fafc] rounded-xl h-48 flex items-center justify-center relative overflow-hidden">
          {/* Mockup Bar Chart */}
          <div className="absolute bottom-0 left-0 w-full h-full flex items-end justify-around px-8 pb-4">
            <div className="w-12 bg-[#cbd5e1] rounded-t-sm h-[30%] opacity-50"></div>
            <div className="w-12 bg-[#cbd5e1] rounded-t-sm h-[45%] opacity-50"></div>
            <div className="w-12 bg-[#cbd5e1] rounded-t-sm h-[70%] opacity-50"></div>
            <div className="w-12 bg-[#94a3b8] rounded-t-sm h-[90%] opacity-70"></div>
          </div>
          <div className="z-10 text-center">
             <Activity className="w-6 h-6 text-[#94a3b8] mx-auto mb-2" />
             <div className="text-xs font-bold text-gray-600">Visualisasi NDVI & LAI</div>
             <div className="text-[9px] text-gray-400 mt-1 max-w-[200px]">Grafik historis kerapatan vegetasi berdasarkan citra satelit terbaru. (Terakhir Update: 14 Ags 2024)</div>
          </div>
        </div>
      </div>

      {/* Riwayat Operasional Timeline */}
      <div className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-[#0a381f]" />
          <h3 className="text-sm font-black text-[#0a381f]">Riwayat Operasional</h3>
        </div>

        <div className="relative border-l-2 border-[#e2e8f0] ml-3 space-y-8 pb-4">
          
          {/* Item 1: Bibit */}
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-white border-2 border-[#0a381f] rounded-full -left-[9px] top-0 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-[#0a381f] rounded-full"></div>
            </div>
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-xs font-black text-gray-900">Bibit Ditanam</h4>
              <span className="bg-[#f1f5f9] text-[#64748b] text-[9px] px-2 py-0.5 rounded font-bold">10 Ags, 08:00 WIB</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">Penanaman bibit di lahan blok utara.</p>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 mb-3">
              <span>Oleh: <strong className="text-gray-700">Admin</strong></span>
              <span>•</span>
              <span className="text-[#0a381f] font-bold">GPS: Cocok di dalam poligon</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[9px] px-2 py-1 rounded font-bold border border-emerald-100 mb-2">
              <Camera className="w-3 h-3" /> Dilengkapi foto In-App
            </div>
            <div className="w-32 aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 mt-1">
               <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop" alt="Foto Bibit" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Item 2: Penyiraman 1 */}
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-white border-2 border-[#0a381f] rounded-full -left-[9px] top-0 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-[#0a381f] rounded-full"></div>
            </div>
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-xs font-black text-gray-900">Penyiraman & Pupuk</h4>
              <span className="bg-[#f1f5f9] text-[#64748b] text-[9px] px-2 py-0.5 rounded font-bold">12 Ags, 08:00 WIB</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">Pemberian nutrisi AB Mix dosis 1.5 EC.</p>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 mb-3">
              <span>Oleh: <strong className="text-gray-700">Admin</strong></span>
              <span>•</span>
              <span className="text-[#0a381f] font-bold">GPS: Cocok di dalam poligon</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[9px] px-2 py-1 rounded font-bold border border-emerald-100 mb-2">
              <Camera className="w-3 h-3" /> Dilengkapi foto In-App
            </div>
            <div className="w-32 aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 mt-1">
               <img src="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=200&auto=format&fit=crop" alt="Foto Pupuk" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Item 3: Penyiraman 2 (Kuning/Warning for galeri upload) */}
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-white border-2 border-amber-400 rounded-full -left-[9px] top-0 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
            </div>
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-xs font-black text-gray-900">Penyiraman & Pupuk</h4>
              <span className="bg-[#f1f5f9] text-[#64748b] text-[9px] px-2 py-0.5 rounded font-bold">13 Ags, 08:00 WIB</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">Pemberian nutrisi AB Mix dosis 1.5 EC.</p>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 mb-3">
              <span>Oleh: <strong className="text-gray-700">Admin</strong></span>
              <span>•</span>
              <span className="text-[#0a381f] font-bold">GPS: Cocok di dalam poligon</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-[9px] px-2 py-1 rounded font-bold border border-amber-100 mb-2">
              <Camera className="w-3 h-3" /> Foto Diambil dari Galeri
            </div>
            <div className="w-32 aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 mt-1">
               <img src="https://images.unsplash.com/photo-1627844642677-9b4df15a6bfa?q=80&w=200&auto=format&fit=crop" alt="Foto Galeri" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Item 4: Panen (Hanya tampil untuk siap-packing atau dikirim) */}
          {(statusParam === 'siap-packing' || statusParam === 'dikirim') && (
            <div className="relative pl-6 pt-2">
              <div className="absolute w-4 h-4 bg-white border-2 border-[#0a381f] rounded-full -left-[9px] top-2 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#0a381f] rounded-full"></div>
              </div>
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-xs font-black text-gray-900">Panen</h4>
                <span className="bg-[#f1f5f9] text-[#64748b] text-[9px] px-2 py-0.5 rounded font-bold">14 Ags, 09:30 WIB</span>
              </div>
              <p className="text-[10px] text-gray-600 mb-2">Pemanenan sayur.</p>
              <div className="flex items-center gap-2 text-[9px] text-gray-500 mb-3">
                <span>Oleh: <strong className="text-gray-700">Admin</strong></span>
                <span>•</span>
                <span className="text-[#0a381f] font-bold">GPS: Cocok di dalam poligon</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[9px] px-2 py-1 rounded font-bold border border-emerald-100 mb-2">
                <Camera className="w-3 h-3" /> Dilengkapi foto In-App
              </div>
              <div className="w-32 aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 mt-1">
                <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop" alt="Foto Panen" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          
        </div>
      </div>

    </div>
  );
}
