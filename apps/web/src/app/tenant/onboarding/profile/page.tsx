"use client";

import React from "react";
import Link from "next/link";
import { 
  Building2,
  CloudUpload,
  Info,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function ProfilBisnisPage() {
  const router = useRouter();
  const [logoUploaded, setLogoUploaded] = React.useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-2xl">
      {/* Progress */}
      <div className="mb-10">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Langkah 1 dari 5</div>
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-3xl font-black text-emerald-950 mb-3 tracking-tight">Profil Bisnis</h2>
        <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
          Lengkapi identitas kebun atau perusahaan Anda untuk memulai proses verifikasi akun.
        </p>
      </div>

      <form 
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/tenant/onboarding/mapping");
        }}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700">Nama Perusahaan / Kebun</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              required
              className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors text-sm" 
              placeholder="mis. Farm Fresh Berdikari"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700">Unggah Logo (Opsional)</label>
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer group relative">
            <input 
              type="file" 
              className="hidden" 
              accept="image/png, image/jpeg, image/svg+xml"
              onChange={() => setLogoUploaded(true)}
            />
            {logoUploaded ? (
              <>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-emerald-900 mb-1">Logo Berhasil Dipilih!</div>
                <div className="text-[10px] text-emerald-600">Klik lagi untuk mengganti logo</div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CloudUpload className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-gray-900 mb-1">Klik untuk unggah logo</div>
                <div className="text-[10px] text-gray-400">PNG, JPG, atau SVG (Maks. 2MB)</div>
              </>
            )}
          </label>
        </div>

        <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 italic">
            Data ini akan ditampilkan pada faktur penjualan dan profil publik Anda di jaringan pembeli HORECA.
          </p>
        </div>

        <button 
          type="submit"
          className="w-full bg-[#0a381f] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#114b2d] transition shadow-md"
        >
          Lanjutkan ke Pemetaan <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
