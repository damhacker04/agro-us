"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Leaf, 
  Search, 
  ShieldCheck, 
  Satellite, 
  Truck, 
  ArrowRight, 
  X,
  CheckCircle2,
  Smartphone,
  Map,
  ShieldAlert
} from "lucide-react";

export default function LandingPage() {
  // State untuk mengontrol modal mana yang terbuka ('satelit', 'escrow', 'logistik', atau null)
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Nvabar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-emerald-900">
          <img src="/logo.png" alt="AgroUs Logo" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold font-fredoka">AgroUs</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
        </div>
        <div className="w-24"></div> {/* Placeholder for balance */}
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-16 md:py-24 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            VERIFIED SUPPLY CHAIN
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-950 font-fredoka leading-tight">
            Kami tidak asal percaya klaim petani. <span className="text-emerald-700">Kami memverifikasinya.</span>
          </h1>
          <p className="text-gray-600 md:text-lg leading-relaxed max-w-md">
            Platform rantai pasok agrikultur B2B pertama dengan Verified Timeline. Dapatkan kepastian pasokan yang divalidasi langsung oleh citra satelit Sentinel-2.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/auth/buyer" className="flex items-center gap-2 px-6 py-3 bg-emerald-900 text-white font-medium rounded-lg hover:bg-emerald-800 transition">
              Cari Produk <Search className="w-4 h-4" />
            </Link>
            <Link href="/auth/tenant" className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">
              Mulai Menjual
            </Link>
          </div>
        </div>

        {/* Hero Graphic Mockup */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] border-4 border-gray-100">
          {/* Dummy Satellite Map Background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute inset-0 bg-emerald-900/40 mix-blend-overlay"></div>
          
          {/* Mockup UI Elements */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Satellite className="w-3 h-3"/> Sentinel-2 Sensor Data
            </p>
            <p className="text-sm font-bold text-emerald-950">NDVI Index: 0.82</p>
            <p className="text-[10px] text-gray-400">Updated 2h ago</p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3"/> Verified Status
                </p>
                <p className="text-[10px] text-gray-500">Fase: Pre-Harvest Verification</p>
              </div>
              <p className="text-xl font-bold text-emerald-900">75%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-emerald-700 h-1.5 rounded-full w-3/4"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-emerald-50 py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-emerald-950 font-fredoka mb-4">
              Membangun Kepercayaan Melalui Data Mutlak
            </h2>
            <p className="text-gray-600">
              Kami menghilangkan ketidakpastian dalam perdagangan komoditas pertanian dengan verifikasi tiga lapis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div 
              onClick={() => setActiveModal('escrow')}
              className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition cursor-pointer group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 mb-6 group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3 font-fredoka">Transaksi Aman</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Kunci harga dan volume sebelum tanam. Dana ditahan di escrow dengan perlindungan Harvest Assurance yang menjamin pengembalian jika gagal panen terverifikasi.
              </p>
              <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Pelajari Selengkapnya <ArrowRight className="w-4 h-4" />
              </span>
            </div>

            {/* Feature 2 */}
            <div 
              onClick={() => setActiveModal('satelit')}
              className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition cursor-pointer group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 mb-6 group-hover:scale-110 transition">
                <Satellite className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3 font-fredoka">Verifikasi Satelit</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Riwayat tanam mutlak. Divalidasi silang secara otomatis setiap 5 hari dari orbit Sentinel-2 untuk memantau biomassa dan kesehatan tanaman secara objektif.
              </p>
              <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Lihat Demo Peta <ArrowRight className="w-4 h-4" />
              </span>
            </div>

            {/* Feature 3 */}
            <div 
              onClick={() => setActiveModal('logistik')}
              className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition cursor-pointer group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 mb-6 group-hover:scale-110 transition">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3 font-fredoka">Zero-Install Logistik</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Pelacakan real-time dan notifikasi Dual-Signal PoD melalui browser mobile tanpa perlu memaksa kurir mengunduh aplikasi tambahan. Integrasi langsung ke WhatsApp.
              </p>
              <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Integrasi Logistik <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA / Stats */}
      <section className="max-w-7xl mx-auto px-8 py-16 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-emerald-950 rounded-2xl p-10 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10">
             <Leaf className="w-64 h-64" />
          </div>
          <h2 className="text-3xl font-bold font-fredoka mb-4 z-10">Tersambung ke 5,000+ Lahan Terverifikasi</h2>
          <p className="text-emerald-100 mb-8 max-w-md z-10">
            Kami memberikan akses langsung ke produsen tangan pertama dengan data transparansi penuh yang belum pernah ada sebelumnya.
          </p>
          <div className="flex gap-4 z-10">
            <span className="px-4 py-2 bg-emerald-800/50 rounded-lg text-sm font-medium border border-emerald-700">120k Ton Komoditas</span>
            <span className="px-4 py-2 bg-emerald-800/50 rounded-lg text-sm font-medium border border-emerald-700">98% Panen Tepat Waktu</span>
          </div>
        </div>
        
        <div className="bg-gray-200 rounded-2xl relative overflow-hidden h-64 md:h-auto border border-gray-200">
           {/* Placeholder for Sustainable Sourcing Image */}
           <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 to-transparent z-10"></div>
           <div className="absolute bottom-6 left-6 z-20">
             <h3 className="text-xl font-bold text-white font-fredoka">Sustainable Sourcing</h3>
             <p className="text-xs text-emerald-100 mt-1">Validasi kepatuhan lingkungan otomatis.</p>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-emerald-900 mb-4 md:mb-0">
          <Leaf className="w-5 h-5" /> AgroUs
        </div>
        <p>© 2026 AgroUs. Precision Agriculture Solutions.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-emerald-900">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-900">Terms of Service</a>
        </div>
      </footer>

      {/* ========================================= */}
      {/* MODALS OVERLAYS */}
      {/* ========================================= */}
      
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* MODAL 1: ZERO-INSTALL LOGISTIK */}
            {activeModal === 'logistik' && (
              <div className="p-10 grid md:grid-cols-2 gap-10 items-center">
                {/* Phone Mockup */}
                <div className="flex justify-center">
                  <div className="w-64 h-[500px] border-[8px] border-gray-900 rounded-[2.5rem] relative bg-gray-50 shadow-inner overflow-hidden flex flex-col">
                    <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl mx-16"></div>
                    {/* Mockup App UI */}
                    <div className="flex-1 p-4 pt-10 flex flex-col">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-4 flex items-center gap-2 text-xs">
                         <ShieldCheck className="w-4 h-4 text-emerald-600"/> agrous.com/track/991
                      </div>
                      <div className="bg-gray-100 rounded-lg flex-1 mb-4 relative overflow-hidden">
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                         {/* Marker */}
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 border-2 border-white rounded-full"></div>
                         </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status Pengiriman</p>
                        <p className="font-bold text-gray-800 text-sm mb-1 leading-tight">Mengantar ke Resto Bumbu Desa</p>
                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><Truck className="w-3 h-3"/> Estimasi tiba dalam 12 menit</p>
                        <button className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold flex justify-center items-center gap-2"></button>
                          <CheckCircle2 className="w-4 h-4" /> Konfirmasi Sampai (PoD)
                        {/* </p> */}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Text Content */}
                <div>
                  <h2 className="text-2xl font-bold font-fredoka text-emerald-950 mb-2">Zero-Install Logistik: <span className="font-normal text-gray-600">Tanpa Repot Download Aplikasi</span></h2>
                  <p className="text-sm text-gray-500 mb-8">Kurir hanya butuh kamera HP bawaan. Pembeli dapat notifikasi real-time langsung ke WhatsApp.</p>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="mt-1"><Map className="w-5 h-5 text-emerald-600"/></div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">Siapkan Label QR</h4>
                        <p className="text-xs text-gray-500 mt-1">Tenant menempelkan Label QR unik pada box panen sebelum dikirim.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-1"><Smartphone className="w-5 h-5 text-emerald-600"/></div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">Scan Tanpa Aplikasi</h4>
                        <p className="text-xs text-gray-500 mt-1">Kurir scan QR pakai kamera HP biasa. Browser terbuka otomatis untuk tracking.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-1"><Truck className="w-5 h-5 text-emerald-600"/></div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">Web-GPS Tracking</h4>
                        <p className="text-xs text-gray-500 mt-1">Sistem melacak lokasi kurir via Web-GPS selama browser tracking terbuka di HP.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 text-sm">Dual-Signal PoD</h4>
                      <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">Proof of Delivery diverifikasi dari dua sisi: Kurir menekan tombol sampai, dan Pembeli menekan konfirmasi terima barang di dasbor mereka.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 2: VALIDASI SATELIT */}
            {activeModal === 'satelit' && (
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-fredoka text-emerald-950">Demo: Validasi Satelit Sentinel-2</h2>
                  <p className="text-sm text-gray-500">Lihat bagaimana kami memantau fase tanam hingga panen menggunakan data Indeks Vegetasi (NDVI).</p>
                </div>
                <div className="bg-gray-900 w-full h-[400px] rounded-xl relative overflow-hidden">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                   
                   {/* Map Elements Mockup */}
                   <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-2 border-emerald-400 bg-emerald-500/20 rotate-6 backdrop-blur-sm flex items-center justify-center">
                     <span className="bg-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600"/> Blok A: Sawi Pakcoy</span>
                   </div>
                   
                   <div className="absolute top-1/3 right-1/3 w-48 h-32 border-2 border-amber-400 bg-amber-500/20 -rotate-3 backdrop-blur-sm flex items-center justify-center">
                     <span className="bg-white text-xs font-bold px-2 py-1 rounded shadow-sm">Blok B: Persiapan Lahan</span>
                   </div>

                   {/* Floating Stats */}
                   <div className="absolute top-4 right-4 bg-white p-4 rounded-xl shadow-lg w-64">
                     <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                       <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE
                     </p>
                     <h4 className="text-2xl font-bold text-emerald-950 font-fredoka">NDVI Index: 0.82</h4>
                     <p className="text-xs text-gray-500 mb-3">Tanaman sangat sehat</p>
                     <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-semibold text-gray-600">Kelembaban Tanah</span>
                        <span className="text-[10px] font-bold text-emerald-700">68%</span>
                     </div>
                     <div className="w-full bg-gray-100 rounded-full h-1">
                       <div className="bg-emerald-500 h-1 rounded-full w-[68%]"></div>
                     </div>
                   </div>

                   {/* Bottom Slider Control */}
                   <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-white p-4 rounded-xl shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            ▶
                          </button>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Analisis Time-Series</p>
                            <p className="text-xs text-gray-500">Fase Pertumbuhan -15 Hari</p>
                          </div>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                          H+25: Vegetasi Maksimal
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full relative">
                        <div className="absolute top-0 left-0 h-2 bg-emerald-500 rounded-full w-1/3"></div>
                        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-4 h-4 bg-white border-2 border-emerald-600 rounded-full shadow-sm"></div>
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                        <span>H-1</span>
                        <span>H+15</span>
                        <span className="text-emerald-700 font-bold">H+25</span>
                        <span>H+35</span>
                        <span>H+45</span>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* MODAL 3: TRANSAKSI AMAN (ESCROW) */}
            {activeModal === 'escrow' && (
              <div className="p-10">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold font-fredoka text-emerald-950 mb-2">Cara Kerja Transaksi Aman (Harvest Assurance)</h2>
                  <p className="text-sm text-gray-500 max-w-lg mx-auto">Pelajari bagaimana sistem escrow kami melindungi dana pembeli dan menjamin kepastian bagi petani.</p>
                </div>
                
                {/* Stepper */}
                <div className="relative flex justify-between items-start mb-12 max-w-2xl mx-auto">
                  <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>
                  
                  {/* Step 1 */}
                  <div className="flex flex-col items-center w-32">
                    <div className="w-12 h-12 bg-emerald-900 rounded-full flex items-center justify-center text-white shadow-md border-4 border-white mb-3">
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 text-center">Pembayaran</h4>
                    <p className="text-[10px] text-gray-500 text-center mt-1">HORECA membayar ke Escrow.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center w-32">
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-md border-4 border-white mb-3">
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 text-center">Dana Ditahan</h4>
                    <p className="text-[10px] text-gray-500 text-center mt-1">Uang aman selama masa tanam.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center w-32">
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-md border-4 border-white mb-3">
                       <Truck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 text-center">Panen & Kirim</h4>
                    <p className="text-[10px] text-gray-500 text-center mt-1">Petani mengirim pesanan.</p>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col items-center w-32">
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-md border-4 border-white mb-3">
                       <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 text-center">Pencairan</h4>
                    <p className="text-[10px] text-gray-500 text-center mt-1">Dana cair setelah PoD.</p>
                  </div>
                </div>

                {/* Force Majeure Box */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex gap-4 max-w-2xl mx-auto">
                   <div className="mt-1">
                     <div className="w-8 h-8 rounded-full bg-emerald-900 text-white flex items-center justify-center">
                       <ShieldAlert className="w-4 h-4" />
                     </div>
                   </div>
                   <div>
                     <h4 className="font-bold text-emerald-950 text-sm mb-1 uppercase tracking-wide">Jaminan Gagal Panen (Force Majeure)</h4>
                     <p className="text-xs text-emerald-900/80 leading-relaxed">Jika satelit <strong>Sentinel-2</strong> mendeteksi anomali vegetasi fatal atau gagal panen sebelum jadwal, dana di Escrow akan otomatis dikembalikan (refund) <strong>100% ke pihak Pembeli</strong>.</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}