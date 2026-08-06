"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Map as MapIcon,
  Shapes,
  Footprints,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  Plus,
} from "lucide-react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { CaptureMethod, LandPlotResponse } from "@agro-os/shared";
import { GalatApi, ambilLahan } from "@/lib/api";

const METODE: Record<CaptureMethod, { label: string; Ikon: typeof PenTool }> = {
  GAMBAR_PETA: { label: "Digambar di peta", Ikon: PenTool },
  WALK_AROUND: { label: "Dikelilingi berjalan kaki", Ikon: Footprints },
};

/**
 * Menggambar poligon lahan yang SEBENARNYA, bukan bentuk hiasan.
 *
 * Koordinat dinormalisasi ke kotak 100×100 dengan skala seragam supaya proporsi
 * petak tetap benar; lintang dibalik karena sumbu Y layar tumbuh ke bawah sedangkan
 * lintang tumbuh ke utara. Ini pratinjau bentuk, bukan peta — tidak ada latar peta,
 * jadi tidak ada yang bisa disalahartikan sebagai lokasi presisi.
 */
function PratinjauPoligon({ polygon }: { polygon: LandPlotResponse["polygon"] }) {
  const cincin = polygon?.coordinates?.[0];
  if (!cincin || cincin.length < 3) {
    return <Shapes className="w-10 h-10 text-gray-300" />;
  }

  const xs = cincin.map((c) => c[0]!);
  const ys = cincin.map((c) => c[1]!);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Digambar ke dalam kotak 4–96, bukan 0–100: garis tepi punya ketebalan, dan
  // poligon yang menyentuh persis batas viewBox akan terpotong separuh strokenya.
  const TEPI = 4;
  const isi = 100 - TEPI * 2;
  const rentang = Math.max(maxX - minX, maxY - minY) || 1;
  const geserX = (isi - ((maxX - minX) / rentang) * isi) / 2;
  const geserY = (isi - ((maxY - minY) / rentang) * isi) / 2;

  const titik = cincin
    .map((c) => {
      const x = TEPI + ((c[0]! - minX) / rentang) * isi + geserX;
      const y = 100 - (TEPI + ((c[1]! - minY) / rentang) * isi + geserY);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-32 h-28" role="img" aria-label="Bentuk petak lahan">
      <polygon
        points={titik}
        className="fill-emerald-400/50 stroke-emerald-600"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TenantLandManagementPage() {
  const [lahan, setLahan] = useState<LandPlotResponse[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilLahan()
      .then((d) => {
        setLahan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat lahan"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat lahan…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Manajemen Lahan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Luas dihitung server dari poligon Anda — tidak diketik sendiri.
          </p>
        </div>
        <Link
          href="/tenant/land/mapping"
          className="shrink-0 flex items-center gap-2 bg-emerald-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-800"
        >
          <Plus className="w-4 h-4" /> Petakan Lahan
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1">Total Luas Terdaftar</div>
            <div className="text-2xl font-black text-gray-900">
              {totalHa.toFixed(2)} Hektar
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700">
            <Shapes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1">Jumlah Petak Lahan</div>
            <div className="text-2xl font-black text-gray-900">
              {lahan.length} Poligon Aktif
            </div>
          </div>
        </div>
      </div>

      {lahan.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <MapIcon className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada lahan terpetakan</h2>
          <p className="text-sm text-gray-500">
            Petakan minimal satu petak sebelum bisa membuka kuota Pre-Order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lahan.map((l, i) => {
            const m = METODE[l.captureMethod];
            const terbatas = l.verificationTier === "TERBATAS";
            return (
              <div
                key={l.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center relative border-b border-gray-100">
                  <div
                    className={`absolute top-4 left-4 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      terbatas ? "bg-amber-500" : "bg-emerald-600"
                    }`}
                  >
                    {terbatas ? (
                      <ShieldAlert className="w-3 h-3" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )}
                    {terbatas ? "TERBATAS" : "NORMAL"}
                  </div>
                  <PratinjauPoligon polygon={l.polygon} />
                  <div className="absolute bottom-4 right-4 bg-white border border-gray-200 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                    Luas: {l.areaHa.toFixed(2)} Ha
                  </div>
                </div>

                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 mb-0.5">Petak {i + 1}</h3>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <m.Ikon className="w-3 h-3" /> {m.label}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-gray-300 shrink-0">
                      {l.id.slice(0, 8)}
                    </span>
                  </div>

                  {terbatas && (
                    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Di bawah {MIN_LAND_PLOT_HA} ha — terlalu kecil untuk dipisahkan dari petak
                      tetangga oleh citra satelit. Batch di sini hanya bisa mencapai badge bukti
                      foto, bukan Terverifikasi Satelit.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
