"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, MapPin, ShieldCheck } from "lucide-react";
import type { LegalityQueueItem, LegalityStatus } from "@agro-os/shared";
import { GalatApi, ambilAntreanLegalitas } from "@/lib/api";

const tgl = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

const TAB: Array<{ nilai: "PENDING" | "APPROVED" | "REJECTED"; label: string }> = [
  { nilai: "PENDING", label: "Menunggu" },
  { nilai: "APPROVED", label: "Disetujui" },
  { nilai: "REJECTED", label: "Ditolak" },
];

const WARNA: Record<LegalityStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

/** Verifikasi legalitas Tenant (FR-1.7, UC-12/OP-03). */
export default function OperatorLegalityPage() {
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [antrean, setAntrean] = useState<LegalityQueueItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  const muat = useCallback((status: typeof tab) => {
    setMemuat(true);
    ambilAntreanLegalitas(status)
      .then((d) => {
        setAntrean(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    muat(tab);
  }, [tab, muat]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950">Verifikasi Legalitas Tenant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tenant hanya bisa membuka kuota Pre-Order setelah legalitasnya disetujui.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {TAB.map((t) => (
          <button
            key={t.nilai}
            onClick={() => setTab(t.nilai)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.nilai
                ? "bg-emerald-950 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {galat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 mb-4">
          {galat}
        </div>
      )}

      {memuat ? (
        <div className="text-sm text-gray-500">Memuat…</div>
      ) : antrean.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Tidak ada Tenant di daftar ini</h2>
        </div>
      ) : (
        <div className="space-y-3">
          {antrean.map((t) => (
            <Link
              key={t.tenantId}
              href={`/operator/legality/${t.tenantId}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{t.companyName}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t.zoneNames.length ? t.zoneNames.join(", ") : "belum pilih zona"}
                    </span>
                    <span>{t.landPlotCount} petak lahan</span>
                    <span>mendaftar {tgl(t.submittedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-2">
                    <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                    {/* Dokumen yang belum diunggah bukan hal sepele: tanpa itu tidak
                        ada yang bisa ditinjau, jadi dibedakan dari sekadar "menunggu". */}
                    <span className={t.legalityDocUrl ? "text-gray-600" : "text-amber-700 font-semibold"}>
                      {t.legalityDocUrl ? "Dokumen terlampir" : "Dokumen belum diunggah"}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${WARNA[t.legalityStatus]}`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {t.legalityStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
