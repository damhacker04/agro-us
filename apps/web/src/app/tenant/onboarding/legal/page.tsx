"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Loader2, ShieldCheck } from "lucide-react";
import { GalatApi, kirimLegalitas, unggahFoto } from "@/lib/api";

/**
 * Langkah 3 onboarding — dokumen legalitas (FR-1.7).
 *
 * Ditinjau operator, bukan disetujui otomatis. Selama menunggu, Tenant sudah bisa masuk
 * dan menyiapkan produk — yang terkunci hanya pembukaan kuota Pre-Order.
 */
export default function TenantOnboardingLegalPage() {
  const router = useRouter();

  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    if (!berkas) return setGalat("Dokumen wajib dilampirkan.");
    setProses(true);
    setGalat("");
    try {
      const { url } = await unggahFoto(berkas);
      await kirimLegalitas(url);
      router.push("/tenant/onboarding/success");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal mengirim dokumen.");
      setProses(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <p className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">
            Langkah 3 dari 3
          </p>
          <h1 className="text-2xl font-bold text-emerald-950">Dokumen Legalitas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Foto NIB atau KTP pemilik. Ditinjau operator sebelum Anda bisa membuka kuota
            Pre-Order.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <label className="flex items-center gap-3 px-4 py-4 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 mb-4">
            <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="text-sm text-gray-700 truncate">
              {berkas ? berkas.name : "Pilih foto dokumen"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {/* Endpoint unggah hanya menerima JPEG/PNG/WebP — disebutkan supaya Tenant
              tidak kebingungan saat PDF-nya ditolak. */}
          <p className="text-xs text-gray-400 mb-4">
            Format yang diterima: JPG, PNG, atau WebP. Bila dokumen Anda berupa PDF,
            fotokan halamannya.
          </p>

          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {galat}
            </p>
          )}

          <button
            onClick={kirim}
            disabled={proses}
            className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {proses ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {proses ? "Mengirim…" : "Kirim untuk Ditinjau"}
          </button>
        </div>
      </div>
    </main>
  );
}
