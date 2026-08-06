"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Crosshair, MapPin, Truck, X } from "lucide-react";
import { GEOFENCE_RADIUS_M, POSITION_PING_INTERVAL_MS } from "@agro-os/shared";
import type { VerifyCourierCodeResponse } from "@agro-os/shared";
import { GalatApi, kirimPosisi, tandaiTanpaGps } from "@/lib/api";

type Kiriman = { jarakM: number; wajar: boolean; pada: number };

const meter = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

/**
 * Layar kurir selama pengantaran (§5.6.3, FR-6.4).
 *
 * Posisi dikirim berkala; server yang memutuskan kewajarannya dan kapan dianggap tiba —
 * bukan halaman ini. Kalau geofence dihitung di sisi klien, siapa pun bisa mengaku tiba
 * dengan mengubah koordinat di peramban.
 *
 * TIDAK ada peta di sini. Menggambar peta hiasan dengan rute karangan justru menyesatkan;
 * yang dibutuhkan kurir cuma satu angka jujur — masih berapa jauh — beserta kapan angka
 * itu terakhir diperbarui.
 */
export default function TrackingPage() {
  const router = useRouter();

  const [sesi, setSesi] = useState<VerifyCourierCodeResponse | null>(null);
  const [terakhir, setTerakhir] = useState<Kiriman | null>(null);
  const [tiba, setTiba] = useState(false);
  const [tanpaGps, setTanpaGps] = useState(false);
  const [galat, setGalat] = useState("");
  const [siap, setSiap] = useState(false);

  // Koordinat terbaru disimpan di ref, bukan state: pembaruan GPS bisa datang jauh
  // lebih sering daripada pengiriman berkala, dan tiap render ulang tidak ada gunanya.
  const posisi = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    const mentah = sessionStorage.getItem("agrous.kurir");
    if (!mentah) {
      setGalat("Sesi antar tidak ditemukan. Pindai ulang QR pada box.");
      setSiap(true);
      return;
    }
    setSesi(JSON.parse(mentah) as VerifyCourierCodeResponse);
    setSiap(true);
  }, []);

  const laporkan = useCallback(async () => {
    if (!sesi || !posisi.current || tiba) return;
    const { latitude, longitude } = posisi.current.coords;
    try {
      const r = await kirimPosisi(sesi.sessionId, {
        lat: latitude,
        lng: longitude,
        deviceTs: new Date().toISOString(),
      });
      setTerakhir({ jarakM: r.distanceToDestM, wajar: r.plausible, pada: Date.now() });
      setGalat("");
      if (r.arrived) setTiba(true);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Posisi gagal terkirim. Mencoba lagi…");
    }
  }, [sesi, tiba]);

  useEffect(() => {
    if (!sesi || tanpaGps || tiba) return;
    if (!navigator.geolocation) {
      setGalat("Perangkat ini tidak mendukung lokasi.");
      return;
    }

    const jam = navigator.geolocation.watchPosition(
      (p) => {
        posisi.current = p;
        setGalat("");
      },
      (e) => {
        // Izin ditolak bukan kegagalan sistem — jalur konfirmasi manual memang
        // disediakan untuk kasus ini (§6.3).
        setGalat(
          e.code === e.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Gunakan mode tanpa GPS di bawah."
            : "Lokasi belum terbaca. Pastikan GPS menyala.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    const interval = sesi.positionIntervalMs || POSITION_PING_INTERVAL_MS;
    void laporkan();
    const jeda = setInterval(() => void laporkan(), interval);

    return () => {
      navigator.geolocation.clearWatch(jam);
      clearInterval(jeda);
    };
  }, [sesi, tanpaGps, tiba, laporkan]);

  async function pilihTanpaGps() {
    if (!sesi) return;
    try {
      await tandaiTanpaGps(sesi.sessionId);
      setTanpaGps(true);
      setGalat("");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal mengaktifkan mode tanpa GPS.");
    }
  }

  if (!siap) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[400px] min-h-[700px] bg-white shadow-2xl rounded-[40px] overflow-hidden border-[8px] border-gray-900 relative flex flex-col">
        <div className="bg-[#0a381f] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <h1 className="font-bold text-sm tracking-wide">Pengantaran Berlangsung</h1>
          <button
            onClick={() => router.push("/")}
            aria-label="Tutup"
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {tiba ? (
              <>
                <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center text-white mb-6">
                  <Check className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-emerald-900 mb-2">Tiba di Lokasi</h2>
                <p className="text-sm text-gray-600">
                  Pembeli sudah diberi tahu. Serahkan barang dan tunggu konfirmasi
                  penerimaan.
                </p>
              </>
            ) : tanpaGps ? (
              <>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mb-6">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <h2 className="text-xl font-black text-amber-900 mb-2">Mode Tanpa GPS</h2>
                <p className="text-sm text-gray-600">
                  Posisi tidak dilacak. Pembeli diberi tahu bahwa kedatangan dikonfirmasi
                  manual — hubungi penerima saat Anda sampai.
                </p>
              </>
            ) : terakhir ? (
              <>
                {/* Cincin jarak: lingkaran luar = posisi sekarang, lingkaran dalam =
                    radius geofence. Sederhana, tapi tiap angkanya nyata. */}
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-emerald-200" />
                  <div className="absolute w-24 h-24 rounded-full border-2 border-emerald-300" />
                  <div className="relative w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Truck className="w-8 h-8" />
                  </div>
                </div>

                <div className="text-4xl font-black text-[#111827] mb-1">
                  {meter(terakhir.jarakM)}
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  menuju tujuan · dianggap tiba di bawah {GEOFENCE_RADIUS_M} m
                </p>

                {!terakhir.wajar && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Perpindahan terakhir dianggap tidak wajar dan tidak dipakai menghitung
                    kedatangan.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-32 h-32 bg-emerald-100 rounded-full animate-ping opacity-75" />
                  <div className="relative w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Crosshair className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-[#111827] mb-2">Mencari lokasi…</h2>
                <p className="text-sm text-gray-500">
                  Posisi dikirim tiap{" "}
                  {Math.round((sesi?.positionIntervalMs ?? POSITION_PING_INTERVAL_MS) / 1000)}{" "}
                  detik.
                </p>
              </>
            )}

            {galat && (
              <p className="mt-5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {galat}
              </p>
            )}
          </div>

          <div className="bg-white rounded-t-3xl border-t border-gray-100 p-6">
            <div className="border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 font-bold text-[#0a1c38] mb-2 text-sm">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                Titik Tujuan
              </div>
              <p className="text-xs text-gray-600 font-mono">
                {sesi
                  ? `${sesi.destination.lat.toFixed(5)}, ${sesi.destination.lng.toFixed(5)}`
                  : "—"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Radius terima {sesi?.destRadiusM ?? GEOFENCE_RADIUS_M} m
              </p>
              {terakhir && (
                <p className="text-[11px] text-gray-400 mt-2">
                  Diperbarui {new Date(terakhir.pada).toLocaleTimeString("id-ID")}
                </p>
              )}
            </div>

            {!tiba && !tanpaGps && (
              <button
                onClick={pilihTanpaGps}
                className="w-full text-xs font-semibold text-gray-500 hover:text-gray-700 py-2"
              >
                Tidak bisa berbagi lokasi? Lanjut tanpa GPS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
