"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Scale } from "lucide-react";
import type { ClaimResponse } from "@agro-os/shared";
import { GalatApi, ambilAntreanKlaim } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const jam = (iso: string) => new Date(iso).toLocaleString("id-ID");

type Antrean = ClaimResponse & { overdue: boolean };

/**
 * Antrean klaim mutu >10% nilai order (FR-5.6, OP-05).
 *
 * Klaim ≤10% sudah dipotong otomatis dari escrow dan TIDAK muncul di sini — yang
 * sampai ke meja operator hanya yang nilainya cukup besar untuk perlu diputus manusia.
 */
export default function OperatorClaimsPage() {
  const [antrean, setAntrean] = useState<Antrean[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilAntreanKlaim()
      .then((d) => {
        setAntrean(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean klaim"))
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

  const telat = antrean.filter((c) => c.overdue).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950">Antrean Klaim Mutu</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hanya klaim di atas 10% nilai pesanan yang masuk sini. Sisanya sudah dipotong
          otomatis dari escrow.
        </p>
      </div>

      {telat > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900 text-sm">{telat} klaim melewati SLA</p>
            <p className="text-xs text-red-800 mt-0.5">
              Selama belum diputus, dana pembeli maupun Tenant sama-sama tertahan.
            </p>
          </div>
        </div>
      )}

      {antrean.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Antrean bersih</h2>
          <p className="text-sm text-gray-500">Tidak ada klaim yang menunggu keputusan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {antrean.map((c) => (
            <Link
              key={c.id}
              href={`/operator/claims/${c.id}`}
              className={`block bg-white border rounded-xl p-5 hover:shadow-md transition ${
                c.overdue ? "border-red-300" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{c.productName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    diajukan {jam(c.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-gray-900">{rp(c.claimValue)}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      c.overdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {c.overdue ? "Lewat SLA" : c.slaDueAt ? `SLA ${jam(c.slaDueAt)}` : "Menunggu"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <Scale className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                Seharusnya {c.expectedKg} kg, ditimbang {c.actualWeightKg} kg — setelah
                toleransi susut {c.shrinkTolerancePct}% ({c.toleratedKg} kg), yang bisa diklaim{" "}
                <b>{c.claimableKg} kg</b> · {c.pctOfOrder}% nilai pesanan
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
