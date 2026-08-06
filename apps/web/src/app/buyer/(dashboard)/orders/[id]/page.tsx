"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  Leaf,
  Clock
} from "lucide-react";

/** Empat tahap yang dilihat pembeli saat menunggu barang, dari sisi penerimaan. */
type TahapPenerimaan = "pending" | "approaching" | "arrived" | "completed";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  
  // Determine initial status based on route ID (for demonstration purposes)
  let initialStatus: TahapPenerimaan = "pending";
  if (unwrappedParams.id === "2") initialStatus = "approaching";
  if (unwrappedParams.id === "3") initialStatus = "completed";

  // Tipe ditulis eksplisit, bukan `typeof initialStatus`: "arrived" tidak pernah jadi
  // nilai AWAL — hanya dicapai setelah kurir masuk geofence — sehingga penyempitan alur
  // TS akan membuangnya dari union dan menolak setStatus("arrived").
  const [status, setStatus] = useState<TahapPenerimaan>(initialStatus);

  const subtotal = 1500000;
  const ongkir = 5000;
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
        href="/buyer/orders" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pesanan Saya
      </Link>

      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950 mb-2">Detail Pesanan #AGR-202608-0991</h1>
        <p className="text-gray-500 text-sm">Lengkapi informasi lokasi dan waktu operasional gudang/lahan Anda untuk memastikan logistik yang tepat.</p>
      </div>

      {/* Dynamic Banners */}
      {status === "approaching" && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-lg mb-1">Siapkan Penerimaan! Kurir berada dalam radius 100 meter.</h3>
              <p className="text-sm text-red-700">Segera arahkan staf Anda ke area loading dock. Batas waktu konfirmasi penerimaan (PoD):</p>
              
              {/* Simulation button (hidden from normal view, just for demo) */}
              <button 
                onClick={() => setStatus("arrived")}
                className="mt-3 text-xs bg-red-200 text-red-800 px-3 py-1 rounded hover:bg-red-300 transition font-bold"
              >
                [Simulasi] Klik untuk mengubah ke: Kurir Tiba di Lokasi
              </button>
            </div>
          </div>
          <div className="bg-red-100 border border-red-200 text-red-800 font-black px-6 py-4 rounded-lg flex items-center gap-3 shrink-0">
            <Clock className="w-5 h-5" /> 59 Menit 45 Detik
          </div>
        </div>
      )}

      {status === "arrived" && (
        <div className="mb-8 bg-[#fdf8e2] border border-[#f5e396] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0">
              <span className="font-bold text-amber-600 text-lg">!</span>
            </div>
            <h3 className="font-bold text-amber-800 text-lg">Mohon tekan tombol "diterima" untuk konfirmasi penerimaan pesanan.</h3>
          </div>
          <button 
            onClick={() => setStatus("completed")}
            className="bg-[#657711] hover:bg-[#52600d] text-white font-bold px-8 py-3 rounded-lg shadow-sm transition shrink-0"
          >
            DITERIMA
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="mb-8 bg-emerald-100 border border-emerald-200 rounded-xl p-6 flex items-center gap-4">
          <div className="w-8 h-8 bg-emerald-500 text-white rounded-md flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-emerald-900 text-lg">Pesanan telah diterima</h3>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          
          {/* Live Tracking Map */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-900 text-sm">
              <MapPin className="w-4 h-4 text-emerald-700" /> Live Tracking
            </div>
            <div className="w-full h-64 bg-gray-100 relative">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)`, opacity: 0.7 }}
              />
              {/* Dummy route graphics would go here */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                <Truck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Alamat Penerima */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-3">
              <MapPin className="w-4 h-4" /> Alamat Penerima (HORECA)
            </div>
            <div className="space-y-1">
              <div className="font-bold text-gray-900">Restoran Bumbu Desa (Cabang Malang)</div>
              <div className="text-sm text-gray-600">Jl. Ijen No. 12, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115</div>
              <div className="text-sm text-gray-600">Kontak: Bapak Ahmad (+62 812-3456-7890)</div>
            </div>
          </div>

          {/* Specs & Logistics (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-4">
                <Leaf className="w-4 h-4" /> Detail Komoditas
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Kategori</span>
                  <span className="font-bold text-gray-900">Sayur Buah</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Grade Mutu</span>
                  <span className="bg-amber-700 text-white text-[10px] px-2 py-0.5 rounded font-bold">Grade A</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Tingkat Kemanisan (Brix)</span>
                  <span className="font-bold text-gray-900">4.5 - 5.5%</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Suhu Penyimpanan</span>
                  <span className="font-bold text-gray-900">10°C - 12°C</span>
                </div>
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-gray-500">Masa Simpan</span>
                  <span className="font-bold text-gray-900 text-right">7 - 10 Hari<br/><span className="text-xs font-normal">(Chiller)</span></span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-4">
                <Truck className="w-4 h-4" /> Informasi Pengemasan
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Tipe Kemasan</span>
                  <span className="font-bold text-gray-900 text-right">Keranjang Plastik<br/><span className="text-xs font-normal">Berongga (Crate)</span></span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Berat Bersih</span>
                  <span className="font-bold text-gray-900">10 Kg / Crate</span>
                </div>
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-gray-500">Titik Keberangkatan</span>
                  <span className="font-bold text-gray-900 text-right">Gudang Malang<br/><span className="text-[10px] font-normal text-gray-400">Jawa Timur</span></span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
                <Truck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900 mb-1">Pengiriman Terkonsolidasi</div>
                  <div className="text-[10px] text-gray-600 leading-relaxed">Ongkos kirim akan dihitung otomatis saat checkout berdasarkan total volume belanja area Malang Raya.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Digital Farm Ledger */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Digital Farm Ledger</h3>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified by AgroChain
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-8">Catatan aktivitas pertanian yang tidak dapat diubah (append-only ledger).</p>
            
            <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200">
              
              {/* Item 1 */}
              <div className="relative flex items-start gap-4 before:absolute before:-left-[10px] before:top-1 before:z-10 before:w-5 before:h-5 before:rounded-full before:bg-emerald-500 before:border-2 before:border-white">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-gray-900">Penanaman Bibit</h4>
                    <span className="text-[10px] font-semibold text-gray-500">10 Jun 2026</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Penanaman 5,000 bibit varietas Beef Steak di Blok C. Menggunakan media tanam cocopeat steril.</p>
                  <div className="h-24 bg-gray-100 rounded bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80)` }} />
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative flex items-start gap-4 before:absolute before:-left-[10px] before:top-1 before:z-10 before:w-5 before:h-5 before:rounded-full before:bg-amber-500 before:border-2 before:border-white">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">RALAT: Aplikasi Pupuk</h4>
                      <span className="bg-amber-200 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded">REVISION</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800">25 Jun 2026</span>
                  </div>
                  <p className="text-xs font-bold text-amber-900 mb-1">Volume pupuk direvisi dari 50kg menjadi 55kg</p>
                  <p className="text-[10px] text-amber-700 italic">Alasan: Penyesuaian berdasarkan hasil tes kadar hara tanah terbaru.</p>
                </div>
              </div>

            </div>
          </div>

          {/* NDVI */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Analisis Vegetasi Sentinel-2</h3>
            <p className="text-xs text-gray-500 mb-6">Pantauan objektif biomassa lahan berdasarkan pantulan gelombang.</p>
            
            <div className="h-48 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center flex-col gap-2">
               <span className="text-gray-400 font-bold text-sm">Render Grafik Multiline Recharts:</span>
               <span className="text-gray-400 text-xs">NDVI vs Tanggal Klaim di sini</span>
            </div>
          </div>

        </div>

        {/* Right Column: Summaries */}
        <div className="w-full lg:w-[350px] space-y-6">
          
          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-emerald-900">Laporan Ketertelusuran</span>
                    <span className="text-[10px] font-bold text-emerald-700">+Rp 25.000</span>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-relaxed">
                    Dapatkan sertifikat digital PDF & riwayat Indeks NDVI untuk verifikasi.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4 border-t border-gray-100 pt-4">
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

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-900 text-xs">Total Pembayaran</span>
                <span className="text-lg font-black text-emerald-700">{formatRupiah(total)}</span>
              </div>
            </div>
          </div>

          {/* Shipment Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
            <h2 className="text-sm font-bold text-gray-900 mb-6">Status Pengiriman</h2>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200">
              
              <div className="relative text-xs">
                <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-700 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div>
                <div className="font-bold text-gray-900">Pesanan Dibuat & Dibayar</div>
                <div className="text-[10px] text-gray-400">01 Ags 2026, 08:00 WIB</div>
              </div>

              <div className="relative text-xs">
                <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-700 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div>
                <div className="font-bold text-gray-900">Verifikasi Tenant</div>
                <div className="text-[10px] text-gray-400">01 Ags 2026, 11:30 WIB</div>
              </div>

              <div className="relative text-xs">
                <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-700 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div>
                <div className="font-bold text-gray-900">Menunggu Panen</div>
                <div className="text-[10px] text-gray-400">02 Ags 2026, 08:00 WIB</div>
              </div>

              <div className="relative text-xs">
                <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-700 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div>
                <div className="font-bold text-gray-900">Packing</div>
                <div className="text-[10px] text-gray-400">03 Ags 2026, 12:45 WIB</div>
              </div>

              <div className="relative text-xs">
                <div className={`absolute -left-[30px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white ring-2 ${
                  status === "completed" ? "bg-emerald-700 ring-emerald-200" : (status === "approaching" || status === "arrived" ? "bg-blue-600 ring-blue-200" : "bg-gray-300 ring-gray-100")
                }`}>
                  {status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <div className={`font-bold ${status === "completed" || status === "approaching" || status === "arrived" ? (status === "completed" ? "text-gray-900" : "text-blue-600") : "text-gray-400"}`}>Dikirim</div>
                <div className="text-[10px] text-gray-400">15 Ags 2026, 19:48 WIB</div>
                {status !== "completed" && <div className="text-[10px] text-blue-600 mt-1 font-semibold">Sedang dalam pengiriman - Kurir Budi Santoso</div>}
              </div>

              <div className="relative text-xs">
                <div className={`absolute -left-[30px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white ${
                  status === "completed" ? "bg-emerald-700" : "bg-gray-300"
                }`}>
                  {status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : null}
                </div>
                <div className={`font-bold ${status === "completed" ? "text-gray-900" : "text-gray-400"}`}>Pesanan Diterima (PoD)</div>
                <div className="text-[10px] text-gray-400">Menunggu konfirmasi di lokasi</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
