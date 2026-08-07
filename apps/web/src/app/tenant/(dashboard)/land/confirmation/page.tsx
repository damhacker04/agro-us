"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Layers, MapPin, ShieldAlert } from "lucide-react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { LandPlotResponse } from "@agro-os/shared";
import { GalatApi, ambilLahan } from "@/lib/api";

/** Ringkasan setelah petak tersimpan — luas di sini hasil hitung PostGIS, bukan ketikan. */
export default function LandConfirmationPage() {
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

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const terbaru = lahan[lahan.length - 1];
  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);

  return (
    <div className="p-8 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-950">Petak Tersimpan</h1>
            <p className="text-sm text-gray-500">
              {lahan.length} petak terdaftar · total {totalHa.toFixed(2)} ha
            </p>
          </div>
        </div>

        {terbaru && (
          <div className="rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin className="w-4 h-4 text-gray-400" /> Petak terbaru
              </span>
              <span className="text-sm font-bold text-gray-900">
                {terbaru.areaHa.toFixed(2)} ha
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Metode{" "}
              {terbaru.captureMethod === "WALK_AROUND"
                ? "dikelilingi berjalan kaki"
                : "digambar di peta"}{" "}
              · tier verifikasi {terbaru.verificationTier}
            </p>

            {terbaru.verificationTier === "TERBATAS" && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                Di bawah {MIN_LAND_PLOT_HA} ha — terlalu kecil untuk dipisahkan dari petak
                tetangga oleh citra satelit. Batch di sini hanya bisa mencapai badge bukti foto.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Link
            href="/tenant/batch/new"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold bg-emerald-950 text-white hover:bg-emerald-800 transition text-sm"
          >
            <Layers className="w-4 h-4" /> Buka Kuota di Petak Ini
          </Link>
          <Link
            href="/tenant/land"
            className="w-full flex items-center justify-center py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
          >
            Kembali ke Manajemen Lahan
          </Link>
        </div>
      </div>
    </div>
  );
}
