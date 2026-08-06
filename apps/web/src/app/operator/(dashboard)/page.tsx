"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import type { ClaimResponse, LegalityQueueItem } from "@agro-os/shared";
import { GalatApi, ambilAntreanKlaim, ambilAntreanLegalitas } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const jam = (iso: string) => new Date(iso).toLocaleString("id-ID");

type Antrean = ClaimResponse & { overdue: boolean };

/**
 * Dashboard operator.
 *
 * Sengaja dirakit dari dua antrean yang SUDAH punya endpoint — klaim mutu dan
 * legalitas — bukan dari endpoint ringkasan tersendiri. Yang ditampilkan hanya
 * pekerjaan yang benar-benar bisa dikerjakan operator hari ini; kartu metrik yang
 * angkanya tidak ada sumbernya lebih baik tidak ada sama sekali.
 */
export default function OperatorDashboardPage() {
  const [klaim, setKlaim] = useState<Antrean[]>([]);
  const [legalitas, setLegalitas] = useState<LegalityQueueItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilAntreanKlaim(), ambilAntreanLegalitas("PENDING")])
      .then(([k, l]) => {
        setKlaim(k);
        setLegalitas(l);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat dashboard"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat dashboard…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const telat = klaim.filter((c) => c.overdue);
  const nilaiTertahan = klaim.reduce((s, c) => s + c.claimValue, 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-emerald-950 mb-2">Konsol Operator</h1>
        <p className="text-gray-500">Pekerjaan yang menunggu keputusan manusia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/operator/claims"
          className={`rounded-2xl p-6 border-2 shadow-sm transition ${
            telat.length
              ? "bg-red-50/40 border-red-200 hover:bg-red-50"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">Klaim Mutu</div>
            <Scale className={`w-5 h-5 ${telat.length ? "text-red-600" : "text-gray-300"}`} />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">{klaim.length}</div>
          <div className={`text-xs font-medium ${telat.length ? "text-red-700" : "text-gray-500"}`}>
            {telat.length
              ? `${telat.length} sudah melewati SLA.`
              : "Semua masih dalam SLA."}
          </div>
        </Link>

        <Link
          href="/operator/legality"
          className="rounded-2xl p-6 border-2 border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">Verifikasi Legalitas</div>
            <FileCheck2 className="w-5 h-5 text-gray-300" />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">{legalitas.length}</div>
          <div className="text-xs text-gray-500 font-medium">
            Tenant menunggu persetujuan sebelum bisa membuka kuota.
          </div>
        </Link>

        <div className="rounded-2xl p-6 border-2 border-gray-200 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">Nilai Klaim Tertahan</div>
            <ShieldCheck className="w-5 h-5 text-gray-300" />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">{rp(nilaiTertahan)}</div>
          <div className="text-xs text-gray-500 font-medium">
            Selama belum diputus, dana ini tertahan bagi pembeli maupun Tenant.
          </div>
        </div>
      </div>

      {telat.length > 0 && (
        <div className="bg-white border-2 border-red-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-red-700">Klaim Melewati SLA</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            SLA 1 hari kerja. Semakin lama menggantung, semakin lama uang kedua pihak
            tertahan.
          </p>
          <div className="space-y-2">
            {telat.map((c) => (
              <Link
                key={c.id}
                href={`/operator/claims/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">
                    {c.productName}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    jatuh tempo {c.slaDueAt ? jam(c.slaDueAt) : "—"} · {rp(c.claimValue)}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {klaim.length === 0 && legalitas.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Tidak ada antrean</h2>
          <p className="text-sm text-gray-500">
            Semua klaim dan pengajuan legalitas sudah diputus.
          </p>
        </div>
      )}
    </div>
  );
}
