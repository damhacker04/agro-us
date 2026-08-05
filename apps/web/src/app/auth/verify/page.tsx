"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { GalatApi, mintaOtp, verifikasiOtp } from "@/lib/api";
import { berandaPeran, simpanSesi } from "@/lib/auth";
import { OTP_LENGTH } from "@agro-os/shared";

function VerifyContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const phone = sp.get("phone") ?? "";
  const peran = (sp.get("peran") ?? "BUYER") as "BUYER" | "TENANT" | "OPERATOR";
  const kodeDemo = sp.get("kode");

  // Panjang kotak mengikuti OTP_LENGTH dari kontrak bersama. Rancangan awal memakai
  // 4 kotak sementara server menerbitkan 6 digit — kodenya tidak akan pernah muat.
  const [digit, setDigit] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) router.replace("/");
  }, [phone, router]);

  // Kode peragaan diisikan otomatis supaya penguji tidak perlu membuka log server.
  useEffect(() => {
    if (kodeDemo && kodeDemo.length === OTP_LENGTH) setDigit(kodeDemo.split(""));
  }, [kodeDemo]);

  useEffect(() => {
    if (sisaDetik <= 0) return;
    const t = setTimeout(() => setSisaDetik((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisaDetik]);

  function isi(i: number, nilai: string) {
    const bersih = nilai.replace(/\D/g, "");
    if (!bersih) return;
    const baru = [...digit];
    // Tempel seluruh kode sekaligus juga didukung — orang biasanya menyalin dari pesan.
    if (bersih.length > 1) {
      bersih
        .slice(0, OTP_LENGTH)
        .split("")
        .forEach((c, idx) => (baru[idx] = c));
      setDigit(baru);
      refs.current[Math.min(bersih.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    baru[i] = bersih;
    setDigit(baru);
    if (i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function mundur(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digit[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    const kode = digit.join("");
    if (kode.length !== OTP_LENGTH) return;
    setGalat("");
    setProses(true);
    try {
      // `role` hanya dipakai server saat nomor BELUM terdaftar (registrasi); saat login
      // nilai ini diabaikan, jadi aman selalu dikirim.
      const res = await verifikasiOtp({
        phone,
        code: kode,
        ...(peran === "OPERATOR" ? {} : { role: peran }),
      });
      simpanSesi(res.accessToken, res.user);
      router.push(berandaPeran(res.user.role));
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Kode tidak sesuai.");
      setProses(false);
    }
  }

  async function kirimUlang() {
    setGalat("");
    try {
      const res = await mintaOtp(phone);
      setSisaDetik(res.resendAfterSec);
      if (res.devOtp) setDigit(res.devOtp.split(""));
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal mengirim ulang.");
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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" /> Ganti nomor
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Masukkan Kode Masuk</h1>
          <p className="text-sm text-gray-500 mb-6">
            Kode {OTP_LENGTH} digit dikirim ke <span className="font-semibold">{phone}</span>
          </p>

          {kodeDemo && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
              Mode peragaan: kode diisikan otomatis. Di layanan sungguhan kode hanya dikirim
              lewat WhatsApp/SMS.
            </p>
          )}

          <form onSubmit={verifikasi} className="space-y-5">
            <div className="flex gap-2 justify-between">
              {digit.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  inputMode="numeric"
                  maxLength={OTP_LENGTH}
                  value={d}
                  onChange={(e) => isi(i, e.target.value)}
                  onKeyDown={(e) => mundur(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ))}
            </div>

            {galat && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={proses || digit.join("").length !== OTP_LENGTH}
              className="w-full bg-emerald-950 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {proses && <Loader2 className="w-4 h-4 animate-spin" />}
              {proses ? "Memeriksa…" : "Masuk"}
            </button>

            <button
              type="button"
              onClick={kirimUlang}
              disabled={sisaDetik > 0}
              className="w-full text-sm text-gray-600 hover:text-emerald-700 disabled:text-gray-400"
            >
              {sisaDetik > 0 ? `Kirim ulang dalam ${sisaDetik} detik` : "Kirim ulang kode"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat…</div>}>
      <VerifyContent />
    </Suspense>
  );
}
