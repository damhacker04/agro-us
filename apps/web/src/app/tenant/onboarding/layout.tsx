"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Leaf } from "lucide-react";

export default function TenantOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  let title = "Mulai Digitalisasi Kebun Anda.";
  let description = "Jangkau ribuan jaringan HORECA dan pantau komoditas Anda dengan teknologi satelit terintegrasi.";

  if (pathname?.includes("/mapping")) {
    title = "Akurasi Lahan Menentukan Hasil.";
    description = "Fitur analisis satelit NDVI kami membutuhkan batas poligon kebun yang akurat. Anda dapat menggambarnya langsung atau berjalan mengelilingi lahan Anda.";
  } else if (pathname?.includes("/confirmation")) {
    title = "Verifikasi Luas & Kapasitas Lahan.";
    description = "Sistem kami menghitung otomatis luas poligon yang Anda daftarkan untuk menyesuaikan resolusi citra satelit Sentinel-2.";
  } else if (pathname?.includes("/legal") || pathname?.includes("/success")) {
    title = "Keamanan & Kepercayaan B2B";
    description = "Pembeli dari sektor HORECA membutuhkan kepastian legalitas mitra untuk menjamin keberlanjutan rantai pasok mereka. Dokumen Anda dilindungi dengan enkripsi tingkat tinggi.";
  }

  return (
    <div className="flex min-h-screen bg-[#f5f8ff]">
      {/* Left Panel */}
      <div className="w-[400px] bg-[#165634] text-white flex flex-col justify-between p-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-20 font-bold text-xl">
            <div className="w-8 h-8 bg-[#b8f5d0] text-[#165634] rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            AgroUs Tenant
          </div>

          <h1 className="text-4xl font-black mb-6 leading-tight">
            {title}
          </h1>
          <p className="text-[#a4ccb6] text-sm leading-relaxed mb-10 max-w-sm">
            {description}
          </p>

          <div className="inline-flex items-center gap-2 border border-[#276e47] bg-[#1a613b] px-4 py-2 rounded-full text-xs font-bold text-[#b8f5d0]">
            <span className="w-2 h-2 rounded-full bg-[#b8f5d0] animate-pulse"></span>
            SATELIT AKTIF: Real-time monitoring
          </div>
        </div>

        <div className="text-[10px] text-[#4d8666]">
          © 2026 AgroUs. Precision Agriculture Solutions.
        </div>
      </div>

      {/* Right Panel (Content) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <div className="p-8 flex justify-between items-center bg-white/50 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-xl text-emerald-950">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-md flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5" />
            </div>
            AgroUs
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          {children}
        </div>

        {/* Footer */}
        <div className="p-8 flex justify-between items-center border-t border-gray-200/60 text-xs text-gray-500 bg-[#f5f8ff]">
          <div>© 2026 AgroUs. Precision Agriculture Solutions.</div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-gray-900">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-900">Terms of Service</Link>
            <Link href="#" className="hover:text-gray-900">Contact Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
