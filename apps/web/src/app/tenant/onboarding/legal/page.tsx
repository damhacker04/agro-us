"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  Info,
  CheckCircle2,
  User,
  Building,
  Image as ImageIcon,
  FileText,
  Eye,
  Trash2,
  CloudUpload
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DokumenLegalitasPage() {
  const router = useRouter();
  const [docType, setDocType] = useState<"ktp" | "nib">("ktp");
  const [uploadedKTP, setUploadedKTP] = useState(false);
  const [uploadedNIB, setUploadedNIB] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-2xl relative">
      {/* Progress */}
      <div className="mb-8">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-3 uppercase">Langkah 4 dari 5</div>
        <div className="flex gap-2">
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-emerald-800 rounded-full"></div>
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-emerald-950 mb-2 tracking-tight">Dokumen Legalitas</h2>
        <p className="text-sm text-gray-600">
          Pilih jenis legalitas yang sesuai dengan model bisnis Anda untuk proses verifikasi.
        </p>
      </div>

      {/* Toggles */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-8 bg-gray-50/50 p-1 gap-1">
        <button 
          onClick={() => setDocType("ktp")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-bold transition ${
            docType === "ktp" ? "bg-white text-emerald-900 shadow-sm border border-gray-200" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <User className="w-4 h-4" /> KTP (Perorangan)
        </button>
        <button 
          onClick={() => setDocType("nib")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-bold transition ${
            docType === "nib" ? "bg-white text-emerald-900 shadow-sm border border-gray-200" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Building className="w-4 h-4" /> NIB (Badan Usaha)
        </button>
      </div>

      {/* Content based on Toggle */}
      {docType === "ktp" ? (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Pastikan foto KTP terlihat jelas, tidak terpotong, dan data di dalamnya terbaca dengan baik oleh sistem OCR kami untuk mempercepat verifikasi.
            </p>
          </div>

          {uploadedKTP ? (
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                
                {/* Dummy Image Preview Box */}
                <div className="w-48 h-32 border-2 border-dashed border-emerald-200 bg-white rounded-lg flex flex-col items-center justify-center text-emerald-400 relative">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">PREVIEW_KTP.JPG</span>
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center h-32">
                  <h4 className="font-bold text-sm text-gray-900 mb-1">KTP_Budi_Santoso_2026.jpg</h4>
                  <p className="text-[10px] text-gray-500 mb-6">1.2 MB • Diunggah pada 24 Okt 2026</p>
                  
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border border-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-50 transition">
                      <Eye className="w-3.5 h-3.5" /> Unduh / Pratinjau
                    </button>
                    <button 
                      onClick={() => setUploadedKTP(false)}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Ganti File
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer group">
              <input 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={() => setUploadedKTP(true)}
              />
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm text-gray-900 mb-1">Klik untuk unggah KTP</div>
              <div className="text-[10px] text-gray-400">PNG, JPG, atau SVG (Maks. 2MB)</div>
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Pastikan dokumen NIB (Nomor Induk Berusaha) berstatus aktif dan sesuai dengan nama perusahaan yang didaftarkan. Format yang diterima: PDF.
            </p>
          </div>

          {uploadedNIB ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                
                {/* Dummy PDF Preview Box */}
                <div className="w-32 h-40 border border-gray-200 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400 relative">
                  <FileText className="w-10 h-10 mb-2 text-blue-200" />
                  <span className="text-[8px] font-bold tracking-widest text-gray-400 uppercase">DOKUMEN_NIB_UTAMA</span>
                  <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded flex items-center justify-center text-white font-bold text-[8px]">
                    PDF
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center py-2">
                  <h4 className="font-bold text-sm text-gray-900 mb-1">NIB_Farm_Fresh_Berdikari_2026.pdf</h4>
                  <p className="text-xs text-gray-500 mb-3">2.4 MB</p>
                  <div className="mb-6">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> BERHASIL DIUNGGAH
                    </span>
                  </div>
                  
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                      <Eye className="w-3.5 h-3.5" /> Pratinjau PDF
                    </button>
                    <button 
                      onClick={() => setUploadedNIB(false)}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Ganti File
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer group">
              <input 
                type="file" 
                className="hidden" 
                accept="application/pdf"
                onChange={() => setUploadedNIB(true)}
              />
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm text-gray-900 mb-1">Klik untuk unggah NIB</div>
              <div className="text-[10px] text-gray-400">Hanya format PDF (Maks. 2MB)</div>
            </label>
          )}
        </div>
      )}

      <div className="w-full h-px bg-gray-100 my-8"></div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/tenant/onboarding/confirmation"
          className="text-sm font-semibold text-gray-500 hover:text-emerald-700 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <button 
          onClick={() => router.push("/tenant/onboarding/success")}
          className="bg-[#0a381f] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#114b2d] transition shadow-md"
        >
          Kirim Dokumen & Selesaikan <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
