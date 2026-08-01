"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
  Bell
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function PendaftaranDitinjauPage() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-2xl relative text-center">
      {/* Progress */}
      <div className="mb-10 text-left">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Langkah 5 dari 5</div>
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-amber-500" strokeWidth={2.5} />
        </div>

        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Pendaftaran Sedang Ditinjau</h2>
        
        <div className="bg-amber-100 text-amber-800 text-[10px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200 mb-6">
          <Clock className="w-3 h-3" /> STATUS: PENDING VERIFIKASI
        </div>

        <p className="text-sm text-gray-600 mb-10 leading-relaxed">
          Terima kasih! Dokumen legalitas dan data pemetaan lahan Anda (<strong className="text-gray-900">Farm Fresh Berdikari</strong>) telah kami terima dan sedang direview oleh tim Admin AgroUs (estimasi 1x24 jam kerja).
        </p>

        {/* Features Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-10 text-left">
          {/* Sudah Bisa Dilakukan */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
            <h4 className="flex items-center gap-2 font-bold text-emerald-900 text-xs mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sudah Bisa Dilakukan:
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[10px] text-emerald-800">
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                Mengakses Dashboard Tenant.
              </li>
              <li className="flex items-start gap-2 text-[10px] text-emerald-800">
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                Menambahkan draf komoditas & jadwal panen.
              </li>
              <li className="flex items-start gap-2 text-[10px] text-emerald-800">
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                Mempelajari modul panduan AgroUs.
              </li>
            </ul>
          </div>

          {/* Belum Bisa Dilakukan */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
            <h4 className="flex items-center gap-2 font-bold text-gray-700 text-xs mb-4">
              <Lock className="w-4 h-4 text-gray-500" /> Belum Bisa Dilakukan:
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[10px] text-gray-600">
                <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0 mt-1.5"></span>
                Produk tampil di Katalog Pembeli (HORECA).
              </li>
              <li className="flex items-start gap-2 text-[10px] text-gray-600">
                <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0 mt-1.5"></span>
                Menerima pesanan & pembayaran Escrow.
              </li>
              <li className="flex items-start gap-2 text-[10px] text-gray-600">
                <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0 mt-1.5"></span>
                Mengajukan klaim asuransi gagal panen.
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <button 
          onClick={() => router.push("/")}
          className="w-full bg-[#0a381f] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#114b2d] transition shadow-md mb-4"
        >
          Masuk ke Dashboard Tenant <ArrowRight className="w-4 h-4" />
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
          <Bell className="w-3 h-3" /> Kami akan mengirimkan notifikasi via WhatsApp dan Email saat akun Anda aktif.
        </p>

      </div>
    </div>
  );
}
