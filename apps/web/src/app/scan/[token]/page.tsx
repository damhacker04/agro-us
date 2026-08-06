"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, MapPin, Package, ShieldCheck } from "lucide-react";
import { COURIER_PIN_LENGTH } from "@agro-os/shared";
import type { ScanTokenResponse } from "@agro-os/shared";
import { GalatApi, periksaToken, verifikasiKodeAntar } from "@/lib/api";

/**
 * Halaman pendaratan setelah kurir memindai QR box (§5.6.2, FR-6.2).
 *
 * Kurir TIDAK punya akun. Kredensialnya adalah token di URL ini — yang sengaja hanya
 * DIPERIKSA di sini, belum dikonsumsi. Token baru terpakai saat Kode Antar terverifikasi,
 * supaya kurir yang salah memindai box orang lain tidak menghanguskan QR-nya.
 */
export default function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const router = useRouter();

  const [info, setInfo] = useState<ScanTokenResponse | null>(null);
  const [kode, setKode] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    periksaToken(token)
      .then(setInfo)
      .catch((e) =>
        setInfo({
          valid: false,
          message: e instanceof GalatApi ? e.message : "QR tidak dapat diperiksa.",
        }),
      )
      .finally(() => setMemuat(false));
  }, [token]);

  async function kirimKode(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      const sesi = await verifikasiKodeAntar(token, kode);
      // sessionId adalah kredensial berikutnya — disimpan di sessionStorage, bukan
      // localStorage: sesi antar berumur satu perjalanan, dan ponsel kurir bisa saja
      // dipakai bergantian.
      sessionStorage.setItem("agrous.kurir", JSON.stringify(sesi));
      router.push("/courier/tracking");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Kode tidak dapat diverifikasi.");
      setProses(false);
      // Sisa percobaan berkurang di server; ambil ulang supaya angkanya jujur.
      periksaToken(token)
        .then(setInfo)
        .catch(() => undefined);
    }
  }

  if (memuat) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </main>
    );
  }

  if (!info?.valid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-800 mb-2">QR tidak dapat dipakai</h1>
          <p className="text-sm text-gray-600">
            {info?.message ?? "QR tidak dikenal. Hubungi penjual."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f4f8] p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Ditampilkan SEBELUM kode diminta: kurir harus bisa memastikan box-nya benar
            tanpa mengorbankan percobaan kode. */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 text-emerald-700 mb-4">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-bold text-sm">QR sah</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Dikirim oleh</div>
                <div className="font-semibold text-gray-900">{info.tenantName}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Tujuan</div>
                <div className="font-semibold text-gray-900">{info.destinationLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={kirimKode} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-lg font-bold text-[#0a1c38] mb-1">Masukkan Kode Antar</h1>
          <p className="text-xs text-gray-500 mb-4">
            Kode {COURIER_PIN_LENGTH} digit dari penjual. Diberikan lisan, tidak tertempel di
            box.
          </p>

          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={COURIER_PIN_LENGTH}
            value={kode}
            onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))}
            placeholder="0000"
            className="w-full text-center font-mono text-3xl tracking-[0.4em] py-3 border border-gray-300 rounded-xl mb-3"
          />

          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {galat}
            </p>
          )}

          <p
            className={`text-xs mb-4 ${
              (info.remainingAttempts ?? 0) <= 2 ? "text-red-700 font-semibold" : "text-gray-500"
            }`}
          >
            Sisa {info.remainingAttempts} percobaan. Habis percobaan, QR terkunci dan penjual
            harus menerbitkan kode baru.
          </p>

          <button
            type="submit"
            disabled={proses || kode.length !== COURIER_PIN_LENGTH}
            className="w-full bg-[#0a1c38] text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {proses && <Loader2 className="w-4 h-4 animate-spin" />}
            {proses ? "Memverifikasi…" : "Mulai Pengantaran"}
          </button>
        </form>
      </div>
    </main>
  );
}
