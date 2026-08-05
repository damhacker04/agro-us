"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  Lock,
  FileText
} from "lucide-react";

export default function BuyerCheckoutPage() {
  const [useAddon, setUseAddon] = useState(true);

  const subtotal = 2000000;
  const ongkir = 12000;
  const addonCost = 25000;
  
  const total = subtotal + ongkir + (useAddon ? addonCost : 0);

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
        href="/buyer/cart" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Keranjang
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950 mb-2">Detail Pengiriman</h1>
        <p className="text-gray-500 text-sm">Lengkapi informasi lokasi dan waktu operasional gudang/lahan Anda untuk memastikan logistik yang tepat.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Form & Shipment Details */}
        <div className="flex-1 space-y-6">
          
          {/* Map Location */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <MapPin className="w-4 h-4" /> Titik Lokasi Pengiriman
              </div>
              <button className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                Ganti Lokasi
              </button>
            </div>
            <div className="p-2">
              <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                {/* Dummy Map Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-80"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)` }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-10 h-10 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
                {/* Address bar on map */}
                <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-lg shadow-md flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-gray-700 truncate">
                    Kawasan Industri Jababeka V, Cikarang, Jawa Barat 17530
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alamat Penerima */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <MapPin className="w-4 h-4" /> Alamat Penerima (HORECA)
              </div>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                Ubah Alamat
              </button>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-gray-900">Restoran Bumbu Desa (Cabang Malang)</div>
              <div className="text-sm text-gray-600">Jl. Ijen No. 12, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115</div>
              <div className="text-sm text-gray-600">Kontak: Bapak Ahmad (+62 812-3456-7890)</div>
            </div>
          </div>

          {/* Informasi Penerima Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Informasi Penerima</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Nama Penerima/Staf</label>
                <input 
                  type="text" 
                  defaultValue="Budi Santoso"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Nomor Telepon/WhatsApp</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 py-2.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-semibold">
                    +62
                  </span>
                  <input 
                    type="text" 
                    defaultValue="8123456789"
                    className="flex-1 px-4 py-2.5 rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Patokan Alamat (Opsional)</label>
              <textarea 
                rows={3}
                placeholder="Contoh: Gerbang hijau sebelah gudang pupuk, masuk 100m ke arah barat."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none"
              ></textarea>
            </div>
          </div>

          {/* Waktu Operasional */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-2 border-b border-gray-100 pb-2">
              <Clock className="w-4 h-4" /> Waktu Operasional Pengiriman
            </div>
            <p className="text-xs text-gray-500 mb-4">Tentukan rentang waktu di mana staf Anda sedia di lokasi untuk menerima barang.</p>
            
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1 max-w-[150px]">
                <label className="text-xs font-semibold text-gray-700">Jam Buka</label>
                <input 
                  type="time" 
                  defaultValue="09:00"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold"
                />
              </div>
              <div className="text-sm font-bold text-gray-400 mt-6">sampai</div>
              <div className="space-y-1.5 flex-1 max-w-[150px]">
                <label className="text-xs font-semibold text-gray-700">Jam Tutup</label>
                <input 
                  type="time" 
                  defaultValue="16:00"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold"
                />
              </div>
              <div className="text-xs text-gray-400 italic mt-6 ml-4">
                *Disarankan sebelum jam 16:00 WIB
              </div>
            </div>
          </div>

          {/* AgroUs Logistics Info */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 flex gap-4">
            <Truck className="w-6 h-6 text-emerald-700 shrink-0" />
            <div>
              <h4 className="font-bold text-emerald-900 text-sm mb-1">Logistik Internal AgroUs</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Pesanan ini akan ditangani secara eksklusif oleh kurir spesialis alat berat dan pertanian dari AgroUs. Tanpa instalasi tambahan, barang akan langsung diantar ke titik lokasi dengan asuransi penuh.
              </p>
            </div>
          </div>

          {/* Shipments */}
          <div className="space-y-4 pt-4">
            {/* Shipment 1 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900">Pengiriman 1: 06 Ags 2026</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-700 text-white text-[8px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">KONSOLIDASI ZONA MALANG RAYA</span>
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Estimasi Tiba 08:00 - 10:00 WIB</span>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4 bg-white border border-gray-100 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80)` }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">Tomat Beef Premium</div>
                      <div className="text-[10px] text-gray-500">Dari: <strong className="text-gray-700">Tani Rawit Jos</strong></div>
                      <div className="text-[10px] text-gray-500">Grade A | Panen: 05 Ags 2026</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">Rp 150.000 x 10 Box</div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider">SUBTOTAL</div>
                    <div className="font-bold text-gray-900">Rp 1.500.000</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-white flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                    <Truck className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Kurir: AgroUs Zero-Install Logistics</div>
                    <div className="text-[10px] text-gray-500">Pendingin aktif (4°C) & Penanganan Higienis</div>
                  </div>
                </div>
                <div className="font-bold text-sm text-gray-900">Rp 5.000</div>
              </div>
            </div>

            {/* Shipment 2 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900">Pengiriman 2: 08 Ags 2026</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">KONSOLIDASI ZONA MALANG RAYA</span>
                  <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Estimasi Tiba 09:00 - 11:00 WIB</span>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4 bg-white border border-gray-100 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80)` }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">Sawi Pakcoy Premium</div>
                      <div className="text-[10px] text-gray-500">Dari: <strong className="text-gray-700">Jaya Wijaya Vege</strong></div>
                      <div className="text-[10px] text-gray-500">Grade B | Panen: 07 Ags 2026</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">Rp 100.000 x 5 Box</div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider">SUBTOTAL</div>
                    <div className="font-bold text-gray-900">Rp 500.000</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-white flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                    <Truck className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Kurir: AgroUs Zero-Install Logistics</div>
                    <div className="text-[10px] text-gray-500">Optimasi rute klaster B2B</div>
                  </div>
                </div>
                <div className="font-bold text-sm text-gray-900">Rp 7.000</div>
              </div>
            </div>
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

            {/* Add-on Box */}
            <div className="bg-gray-50 border border-emerald-100 rounded-xl p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={useAddon}
                    onChange={() => setUseAddon(!useAddon)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-900">Laporan Ketertelusuran</span>
                    <span className="text-[10px] font-bold text-emerald-700">+Rp 25.000</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Dapatkan sertifikat digital PDF & riwayat indeks NDVI lahan terkait batch pupuk ini untuk verifikasi keberlanjutan (ESG).
                  </p>
                </div>
              </label>
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
              {useAddon && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Laporan (Add-on)</span>
                  <span className="font-medium text-gray-900">{formatRupiah(addonCost)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
                <span className="text-xl font-bold text-emerald-700">{formatRupiah(total)}</span>
              </div>
            </div>

            <Link 
              href="/buyer/payment"
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
