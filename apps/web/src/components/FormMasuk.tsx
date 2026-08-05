"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Phone } from "lucide-react";
import { GalatApi, mintaOtp } from "@/lib/api";

/**
 * Masuk dengan NOMOR TELEPON + OTP, bukan email + kata sandi (FR-1.3).
 *
 * Pilihan ini disengaja untuk penggunanya: petani dan pemilik warung jauh lebih terbiasa
 * menerima kode lewat pesan daripada mengingat kata sandi, dan tidak semuanya punya
 * alamat surel aktif. Formulir email/kata sandi di rancangan awal tidak punya padanan
 * apa pun di backend.
 */
export function FormMasuk({
  peran,
  judul,
  keterangan,
}: {
  peran: "BUYER" | "TENANT" | "OPERATOR";
  judul: string;
  keterangan: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState("");

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setKirim(true);
    try {
      const res = await mintaOtp(phone);
      const q = new URLSearchParams({ phone, peran });
      // Di lingkungan peragaan server ikut mengembalikan kodenya; dibawa agar penguji
      // tidak perlu membuka log server. Di lingkungan sungguhan field ini tidak ada.
      if (res.devOtp) q.set("kode", res.devOtp);
      router.push(`/auth/verify?${q.toString()}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal mengirim kode. Coba lagi.");
      setKirim(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 text-emerald-600 bg-emerald-100 rounded-sm flex items-center justify-center font-bold">
            A
          </div>
          <span className="text-xl font-bold text-emerald-950">AgroUs</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{judul}</h1>
          <p className="text-sm text-gray-500 mb-6">{keterangan}</p>

          <form className="space-y-5" onSubmit={masuk}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Kode masuk dikirim ke nomor ini. Tidak perlu kata sandi.
              </p>
            </div>

            {galat && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={kirim}
              className="w-full bg-emerald-950 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {kirim && <Loader2 className="w-4 h-4 animate-spin" />}
              {kirim ? "Mengirim kode…" : "Kirim Kode Masuk"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
