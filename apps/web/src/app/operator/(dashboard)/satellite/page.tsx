"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Satellite, ShieldAlert } from "lucide-react";
import type { SatelliteReviewItem, VerificationStatus } from "@agro-os/shared";
import { GalatApi, ambilAntreanSatelit } from "@/lib/api";

const tgl = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

const STATUS: Record<VerificationStatus, { label: string; kelas: string }> = {
  TERVERIFIKASI: { label: "Terverifikasi", kelas: "bg-emerald-100 text-emerald-800" },
  FOTO_SAJA: { label: "Bukti Foto Saja", kelas: "bg-amber-100 text-amber-900" },
  PERLU_DITINJAU: { label: "Perlu Ditinjau", kelas: "bg-orange-100 text-orange-800" },
  TIDAK_DAPAT: { label: "Citra Tidak Tersedia", kelas: "bg-gray-100 text-gray-700" },
  TIDAK_SESUAI: { label: "Tidak Sesuai Klaim", kelas: "bg-red-100 text-red-800" },
};

/**
 * Antrean tinjauan satelit (FR-4.6, OP-04).
 *
 * Hanya PERLU_DITINJAU dan TIDAK_SESUAI yang masuk sini — keduanya berarti pipeline
 * menemukan ketidaksesuaian antara klaim Tenant dan citra, dan keduanya langsung
 * memengaruhi badge yang dilihat pembeli. Status lain tidak menunggu keputusan siapa pun.
 */
export default function OperatorSatellitePage() {
  const [antrean, setAntrean] = useState<SatelliteReviewItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilAntreanSatelit()
      .then((d) => {
        setAntrean(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat antrean…</div>;

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
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950">Verifikasi Satelit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Batch yang klaimnya tidak cocok dengan citra. Keputusan Anda langsung mengubah
          badge yang dilihat pembeli.
        </p>
      </div>

      {antrean.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Antrean bersih</h2>
          <p className="text-sm text-gray-500">
            Tidak ada batch yang menunggu tinjauan manusia.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {antrean.map((b) => {
            const s = STATUS[b.verificationStatus];
            return (
              <Link
                key={b.batchId}
                href={`/operator/satellite/${b.batchId}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{b.productName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.tenantName} · {b.landPlotAreaHa.toFixed(2)} ha
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${s.kelas}`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    {s.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <div>
                    <div className="text-gray-500 mb-0.5">Diklaim Tenant</div>
                    <div className="text-gray-800">
                      tanam {tgl(b.claimedPlantDate)} · panen {tgl(b.claimedHarvestDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-0.5">Terdeteksi citra</div>
                    <div className="text-gray-800">
                      tanam {tgl(b.detectedPlantDate)} · panen {tgl(b.detectedHarvestDate)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                  <Satellite className="w-3 h-3 shrink-0" />
                  {b.usableObservationCount} dari {b.observationCount} pengamatan terpakai
                  {b.observationCount > 0 &&
                    b.usableObservationCount === 0 &&
                    " — seluruhnya tertutup awan"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
