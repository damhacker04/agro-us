"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Plus, ShieldAlert } from "lucide-react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { LandPlotResponse } from "@agro-os/shared";
import { GalatApi, ambilLahan } from "@/lib/api";

/** Ringkasan lahan yang tersimpan, dengan luas hasil hitung server. */
export default function TenantOnboardingConfirmationPage() {
  const router = useRouter();

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

  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);
  const adaTerbatas = lahan.some((l) => l.verificationTier === "TERBATAS");

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <p className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">
            Langkah 2 dari 3 — tersimpan
          </p>
          <h1 className="text-2xl font-bold text-emerald-950">Lahan Anda</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {galat}
            </p>
          )}

          {lahan.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">
              Belum ada petak tersimpan. Kembali dan petakan minimal satu petak.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-700 mb-4">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">
                  {lahan.length} petak · total {totalHa.toFixed(2)} ha
                </span>
              </div>

              <ul className="space-y-2 mb-4">
                {lahan.map((l, i) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-gray-900">Petak {i + 1}</span>
                    <span className="text-sm text-gray-600">
                      {l.areaHa.toFixed(2)} ha
                      {l.verificationTier === "TERBATAS" && (
                        <span className="ml-2 text-[10px] font-bold text-amber-700">TERBATAS</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Luas di bawah ambang bukan penolakan, tapi berkonsekuensi permanen pada
                  badge yang bisa dicapai batch di lahan itu — jadi disampaikan sekarang,
                  bukan setelah Tenant menanam. */}
              {adaTerbatas && (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  Ada petak di bawah {MIN_LAND_PLOT_HA} ha. Batch di petak itu hanya bisa
                  mencapai badge bukti foto, bukan Terverifikasi Satelit.
                </p>
              )}
            </>
          )}

          <div className="space-y-2">
            <button
              onClick={() => router.push("/tenant/onboarding/legal")}
              disabled={lahan.length === 0}
              className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Lanjut — Unggah Legalitas <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/tenant/onboarding/mapping"
              className="w-full border border-gray-300 text-gray-700 text-sm font-semibold py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Petak Lain
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
