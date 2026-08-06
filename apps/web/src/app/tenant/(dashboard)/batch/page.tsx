"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";
import { GalatApi, ambilBatchTenant } from "@/lib/api";
import type { BatchResponse, ProductionStatus, VerificationStatus } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const PRODUKSI: Record<ProductionStatus, { label: string; kelas: string }> = {
  PLANNING: { label: "Perencanaan", kelas: "bg-gray-100 text-gray-700" },
  GROWING: { label: "Tumbuh", kelas: "bg-lime-100 text-lime-800" },
  HARVESTED: { label: "Sudah Panen", kelas: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Gagal Panen", kelas: "bg-red-100 text-red-800" },
};

/**
 * Lima status verifikasi dari pipeline satelit (FR-4.5) — bukan tiga badge pembeli.
 * Tenant berhak melihat versi mentahnya, termasuk yang tidak menguntungkan dirinya,
 * karena dialah yang harus menindaklanjuti bila ada ketidaksesuaian.
 */
const VERIFIKASI: Record<VerificationStatus, { label: string; kelas: string; baik: boolean }> = {
  TERVERIFIKASI: { label: "Terverifikasi Satelit", kelas: "bg-emerald-700 text-white", baik: true },
  FOTO_SAJA: { label: "Bukti Foto Saja", kelas: "bg-amber-500 text-white", baik: false },
  PERLU_DITINJAU: { label: "Perlu Ditinjau", kelas: "bg-orange-500 text-white", baik: false },
  TIDAK_DAPAT: { label: "Citra Tidak Tersedia", kelas: "bg-gray-400 text-white", baik: false },
  TIDAK_SESUAI: { label: "Tidak Sesuai Klaim", kelas: "bg-red-600 text-white", baik: false },
};

export default function BatchListPage() {
  const [batch, setBatch] = useState<BatchResponse[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchTenant()
      .then((d) => { setBatch(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat batch"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat batch…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Manajemen Batch</h1>
          <p className="text-sm text-gray-500 mt-1">
            Satu batch = satu siklus tanam di satu petak lahan. Pembeli memesan batch, bukan
            produk.
          </p>
        </div>
        <Link
          href="/tenant/batch/new"
          className="bg-emerald-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-800"
        >
          Buka Kuota Baru
        </Link>
      </div>

      {batch.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada batch</h2>
          <p className="text-sm text-gray-500">
            Buka kuota Pre-Order agar produk Anda tampil di katalog pembeli.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batch.map((b) => {
            const pr = PRODUKSI[b.productionStatus];
            const vr = VERIFIKASI[b.verificationStatus];
            const terjualPct = b.quotaBoxTotal ? (b.quotaBoxSold / b.quotaBoxTotal) * 100 : 0;
            return (
              <Link
                key={b.id}
                href={`/tenant/batch/${b.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">
                      {b.productName ?? "Batch"}
                      {b.grade && (
                        <span className="ml-2 text-xs font-semibold text-gray-500">
                          Grade {b.grade}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.landPlotAreaHa ? `${b.landPlotAreaHa} ha` : "lahan"}
                        {b.landPlotTier === "TERBATAS" && " · verifikasi terbatas"}
                      </span>
                      <span>panen {tgl(b.claimedHarvestDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${pr.kelas}`}>
                      {pr.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${vr.kelas}`}
                    >
                      {vr.baik ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      {vr.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        Kuota terjual {b.quotaBoxSold} / {b.quotaBoxTotal} box
                      </span>
                      <span>{Math.round(terjualPct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min(terjualPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 shrink-0">
                    {rp(b.lockedPrice)}
                    <span className="text-xs font-normal text-gray-500"> /box</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
