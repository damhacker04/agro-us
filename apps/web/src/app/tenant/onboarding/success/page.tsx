"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, MapPin, ShieldCheck } from "lucide-react";
import type { LegalityStatus, TenantProfileResponse } from "@agro-os/shared";
import { GalatApi, ambilProfilTenant } from "@/lib/api";

const PESAN: Record<LegalityStatus, { judul: string; teks: string; kelas: string }> = {
  PENDING: {
    judul: "Menunggu Tinjauan Operator",
    teks: "Anda sudah bisa menyiapkan produk. Kuota Pre-Order terbuka setelah legalitas disetujui.",
    kelas: "bg-amber-100 text-amber-900",
  },
  APPROVED: {
    judul: "Legalitas Disetujui",
    teks: "Anda sudah bisa membuka kuota Pre-Order.",
    kelas: "bg-emerald-100 text-emerald-800",
  },
  REJECTED: {
    judul: "Legalitas Ditolak",
    teks: "Perbaiki dokumen sesuai catatan operator, lalu ajukan kembali.",
    kelas: "bg-red-100 text-red-800",
  },
};

export default function TenantOnboardingSuccessPage() {
  const [profil, setProfil] = useState<TenantProfileResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilProfilTenant()
      .then((p) => {
        setProfil(p);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat profil"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  const status = profil ? PESAN[profil.legalityStatus] : null;

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>

          <h1 className="text-2xl font-black text-emerald-900 mb-2">Pendaftaran Selesai</h1>
          {profil && (
            <p className="text-sm text-gray-600 mb-6">
              <b>{profil.companyName}</b> terdaftar di{" "}
              {profil.zones.map((z) => z.name).join(", ")} dengan {profil.landPlotCount} petak
              lahan.
            </p>
          )}

          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 w-full">
              {galat}
            </p>
          )}

          {status && profil && (
            <div className="w-full rounded-xl border border-gray-200 p-5 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                {profil.legalityStatus === "APPROVED" ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-700" />
                )}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.kelas}`}>
                  {status.judul}
                </span>
              </div>
              <p className="text-xs text-gray-600">{status.teks}</p>
            </div>
          )}

          <div className="w-full space-y-2">
            <Link
              href="/tenant"
              className="w-full flex items-center justify-center py-3 rounded-lg font-semibold bg-emerald-950 text-white hover:bg-emerald-800 transition text-sm"
            >
              Masuk ke Dashboard
            </Link>
            <Link
              href="/tenant/land"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
            >
              <MapPin className="w-4 h-4" /> Kelola Lahan
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
