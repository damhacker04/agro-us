"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleSlash, Loader2, Scale, TriangleAlert } from "lucide-react";
import type { PlausibilityReviewItem, YieldPlausibility } from "@agro-os/shared";
import { GalatApi, ambilAntreanKewajaran, putuskanKewajaran } from "@/lib/api";

/**
 * OP-13 — Antrean Tinjauan Kewajaran Hasil (FR-7.12a, FR-5.6).
 *
 * Empat hal tampil berdampingan pada satu kartu, dan itu bukan soal kerapian: kurva NDVI,
 * rentang pita, angka yang dilaporkan, dan realisasi Tenant lain sezona. Masing-masing
 * sendirian menyesatkan. Kurva yang bagus tanpa pembanding zona tidak memberi tahu apakah
 * musimnya memang buruk untuk semua orang — dan justru itu pertanyaan yang menentukan
 * putusannya.
 *
 * Putusan di sini menggantikan verdict otomatis dan menentukan apakah cap 10% berlaku
 * untuk shortfall batch ini (FR-7.11). Mesin menandai, manusia memutuskan.
 */

const OPSI: { nilai: YieldPlausibility; label: string; kelas: string; jelas: string }[] = [
  {
    nilai: "WAJAR",
    label: "Wajar",
    kelas: "border-emerald-600 bg-emerald-50 text-emerald-800",
    jelas: "Cap 10% tetap berlaku — Tenant terlindungi seperti biasa.",
  },
  {
    nilai: "TIDAK_WAJAR",
    label: "Tidak wajar",
    kelas: "border-red-600 bg-red-50 text-red-800",
    jelas: "Cap 10% GUGUR — Tenant menanggung selisih substitusi penuh.",
  },
  {
    // Bukan jalan tengah malas: setelah melihat kurva dan pembanding, "memang tidak ada
    // dasar" adalah kesimpulan yang sah. Memaksa memilih antara dua kutub membuat Operator
    // menebak, dan tebakan itu menempel pada uang seseorang.
    nilai: "TIDAK_DAPAT_DINILAI",
    label: "Tidak dapat dinilai",
    kelas: "border-slate-500 bg-slate-50 text-slate-700",
    jelas: "Tidak ada dasar cukup. Cap tetap berlaku, tidak ada penalti kuota.",
  },
];

const DASAR: Record<string, string> = {
  PITA_SAJA: "pita saja (zona belum cukup pembanding)",
  PITA_PLUS_BENCHMARK: "pita + benchmark zona",
  TIDAK_ADA_DASAR: "tidak ada dasar",
};

function sisaSla(iso: string | null) {
  if (!iso) return { teks: "tanpa tenggat", kelas: "bg-gray-100 text-gray-600" };
  const jam = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (jam < 0) return { teks: `lewat ${Math.abs(Math.round(jam))} jam`, kelas: "bg-red-100 text-red-800" };
  if (jam < 6) return { teks: `sisa ${Math.round(jam)} jam`, kelas: "bg-amber-100 text-amber-900" };
  return { teks: `sisa ${Math.round(jam)} jam`, kelas: "bg-emerald-100 text-emerald-800" };
}

/** Sparkline NDVI — cukup untuk melihat bentuk kurvanya, tanpa pustaka grafik. */
function KurvaNdvi({ titik }: { titik: PlausibilityReviewItem["ndviSeries"] }) {
  const layak = titik.filter((t) => t.usable && t.ndvi !== null);
  if (layak.length < 2) {
    return (
      <p className="text-xs text-gray-500">
        Hanya {layak.length} citra layak pakai — kurva tidak dapat digambar.
      </p>
    );
  }
  const L = 240;
  const T = 48;
  const langkah = L / (layak.length - 1);
  const d = layak
    .map((t, i) => `${i === 0 ? "M" : "L"} ${(i * langkah).toFixed(1)} ${(T - (t.ndvi ?? 0) * T).toFixed(1)}`)
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${L} ${T}`} className="h-12 w-full" preserveAspectRatio="none">
        <path d={d} fill="none" stroke="#047857" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="mt-1 text-[10px] text-gray-500">
        {layak.length} dari {titik.length} citra layak pakai · {layak[0]!.date} →{" "}
        {layak[layak.length - 1]!.date}
      </p>
    </div>
  );
}

export default function OperatorKewajaranPage() {
  const [antrean, setAntrean] = useState<PlausibilityReviewItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState<string | null>(null);

  const muat = useCallback(() => {
    ambilAntreanKewajaran()
      .then((a) => {
        setAntrean(a);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(muat, [muat]);

  async function putuskan(assessmentId: string, finalVerdict: YieldPlausibility) {
    setProses(assessmentId);
    try {
      await putuskanKewajaran(assessmentId, { finalVerdict });
      setAntrean((a) => a.filter((x) => x.assessmentId !== assessmentId));
      setGalat("");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan putusan");
    } finally {
      setProses(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Scale className="h-5 w-5 text-amber-700" /> Antrean Tinjauan Kewajaran
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hasil panen yang penilaian otomatisnya marginal. Putusan Anda menggantikan penilaian
          mesin dan menentukan apakah cap tanggungan 10% berlaku untuk batch ini.
        </p>
      </div>

      {galat && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {galat}
        </div>
      )}

      {memuat && <p className="text-sm text-gray-500">Memuat antrean…</p>}

      {!memuat && antrean.length === 0 && !galat && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
          <p className="text-sm text-gray-600">Tidak ada penilaian yang menunggu tinjauan.</p>
        </div>
      )}

      <div className="space-y-4">
        {antrean.map((a) => {
          const sla = sisaSla(a.slaDueAt);
          const adaPita = a.expectedMinBox !== null && a.expectedMaxBox !== null;
          return (
            <article key={a.assessmentId} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900">{a.productName}</h2>
                  <p className="text-xs text-gray-500">
                    {a.tenantName} · {a.commodityName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Penyelidikan ambang tidak dilarang — ia dicatat dan terlihat di sini. */}
                  {a.attemptCount > 1 && (
                    <span
                      className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800"
                      title="Tenant meminta pratinjau lebih dari sekali sebelum mengonfirmasi"
                    >
                      {a.attemptCount}× dinilai
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sla.kelas}`}>
                    {sla.teks}
                  </span>
                </div>
              </div>

              <div className="mb-5 grid gap-5 md:grid-cols-2">
                <div>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-[10px] text-gray-500">Dilaporkan Tenant</div>
                      <div className="text-lg font-black text-gray-900">{a.reportedBox} box</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-[10px] text-gray-500">Pita kewajaran</div>
                      <div className="text-lg font-black text-gray-900">
                        {adaPita ? `${a.expectedMinBox}–${a.expectedMaxBox}` : "—"}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Terjual {a.quotaBoxSold} box · puncak NDVI{" "}
                    {a.peakNdvi === null ? "—" : a.peakNdvi.toFixed(2)} · dasar:{" "}
                    {DASAR[a.basis] ?? a.basis}
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Kurva kehijauan lahan
                  </div>
                  <KurvaNdvi titik={a.ndviSeries} />
                </div>
              </div>

              {/* Pembanding lintas-Tenant. Tanpa ini, musim buruk yang merata tidak bisa
                  dibedakan dari satu Tenant yang menyembunyikan hasil. */}
              <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div className="mb-2 text-xs font-bold text-sky-900">
                  Realisasi Tenant lain, komoditas &amp; minggu panen sama
                </div>
                {a.zonePeers.length === 0 ? (
                  <p className="text-xs text-sky-800">
                    Belum ada Tenant pembanding. Tanpa pembanding, satu-satunya dasar adalah pita
                    dari lahan Tenant ini sendiri.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs text-sky-900">
                    {a.zonePeers.map((p, i) => (
                      <li key={`${p.tenantName}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate">{p.tenantName}</span>
                        <span className="font-bold">
                          {Math.round(p.fulfillmentRatio * 100)}% terpenuhi
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {OPSI.map((o) => (
                  <button
                    key={o.nilai}
                    type="button"
                    disabled={proses === a.assessmentId}
                    onClick={() => putuskan(a.assessmentId, o.nilai)}
                    className={`rounded-lg border p-3 text-left transition hover:brightness-95 disabled:opacity-60 ${o.kelas}`}
                  >
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      {proses === a.assessmentId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : o.nilai === "WAJAR" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : o.nilai === "TIDAK_WAJAR" ? (
                        <TriangleAlert className="h-3.5 w-3.5" />
                      ) : (
                        <CircleSlash className="h-3.5 w-3.5" />
                      )}
                      {o.label}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug opacity-90">{o.jelas}</p>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
