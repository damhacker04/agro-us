"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import type { AnchorAuditItem } from "@agro-os/shared";
import { GalatApi, ambilJangkar } from "@/lib/api";

const tgl = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Audit jangkar hash (§6.1, OP-08).
 *
 * `matchesCurrent` bukan perbandingan kolom hash dengan kolom hash — server menghitung
 * ULANG rantai dari isi node saat ini lalu membandingkannya dengan root yang dijangkarkan.
 * Perbandingan hash-tersimpan-vs-hash-tersimpan akan selalu cocok meski isinya diubah,
 * jadi tidak membuktikan apa pun.
 */
export default function OperatorAuditPage() {
  const [jangkar, setJangkar] = useState<AnchorAuditItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilJangkar()
      .then((d) => {
        setJangkar(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat jangkar"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat jangkar…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const rusak = jangkar.filter((a) => !a.matchesCurrent);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950">Audit Hash Anchor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Rantai dihitung ulang dari isi node, lalu dibandingkan dengan root yang
          dijangkarkan hari itu. Ketidakcocokan berarti ada isi yang berubah setelah
          dijangkarkan.
        </p>
      </div>

      {rusak.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900 text-sm">
              {rusak.length} jangkar tidak cocok dengan rantai saat ini
            </p>
            <p className="text-xs text-red-800 mt-0.5">
              Perlu ditelusuri — Verified Timeline batch tersebut tidak lagi bisa diaudit
              sebagai bukti.
            </p>
          </div>
        </div>
      )}

      {jangkar.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada jangkar</h2>
          <p className="text-sm text-gray-500">
            Jangkar dibuat cron harian untuk tiap batch yang punya node timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jangkar.map((a) => (
            <div
              key={`${a.batchId}-${a.anchorDate}`}
              className={`bg-white border rounded-xl p-5 ${
                a.matchesCurrent ? "border-gray-200" : "border-red-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{a.productName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.tenantName} · dijangkarkan {tgl(a.anchorDate)} · {a.nodeCount} node
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    a.matchesCurrent
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {a.matchesCurrent ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Cocok
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" /> TIDAK cocok
                    </>
                  )}
                </span>
              </div>

              <code className="block text-[10px] font-mono text-gray-500 break-all bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5">
                {a.rootHash}
              </code>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                <Link2 className="w-3 h-3 shrink-0" />
                {/* Jangkar yang belum dipublikasikan ke penyimpanan write-once eksternal
                    masih bisa ditulis ulang bersama basis datanya — bukti eksternalnya
                    belum ada, jadi jangan diklaim sudah ada. */}
                {a.externalRef ? (
                  <span className="break-all">Jangkar eksternal: {a.externalRef}</span>
                ) : (
                  <span className="text-amber-700">
                    Belum dipublikasikan ke penyimpanan eksternal — bukti masih internal.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
