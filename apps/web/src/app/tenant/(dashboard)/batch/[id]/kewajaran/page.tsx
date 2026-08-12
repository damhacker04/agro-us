"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleSlash, Info, TriangleAlert } from "lucide-react";
import type { YieldAssessmentHistoryItem, YieldPlausibility } from "@agro-os/shared";
import { GalatApi, ambilRiwayatKewajaran } from "@/lib/api";

/**
 * TN-35 — Riwayat Penilaian Kewajaran Hasil per Batch (FR-4.10).
 *
 * Transparansi perhitungan, bukan skor buta. Tenant melihat rentang pita yang dipakai,
 * angka yang ia laporkan, dan atas dasar apa nilainya keluar.
 *
 * ⚠️ Rentang pita BOLEH ditampilkan; angka ambang penalti TIDAK (FR-7.12c). Keduanya
 * mudah tertukar. Pita adalah hasil hitungan dari lahan Tenant itu sendiri — ia bergerak
 * mengikuti seberapa hijau lahannya, jadi melihatnya tidak memberi tahu apa pun tentang
 * seberapa jauh ia boleh menyimpang sebelum dihukum. Ambang penalti sebaliknya: tetap,
 * dan begitu terlihat ia berubah menjadi target.
 *
 * Nada: menjelaskan, bukan menuduh (aturan desain v2.3 butir 4).
 */

const GAYA: Record<
  YieldPlausibility,
  { label: string; Ikon: typeof CheckCircle2; teks: string; latar: string; garis: string }
> = {
  WAJAR: {
    label: "Wajar",
    Ikon: CheckCircle2,
    teks: "text-emerald-800",
    latar: "bg-emerald-50",
    garis: "border-emerald-200",
  },
  PERLU_DITINJAU: {
    label: "Perlu ditinjau",
    Ikon: Info,
    teks: "text-amber-800",
    latar: "bg-amber-50",
    garis: "border-amber-200",
  },
  TIDAK_WAJAR: {
    label: "Di luar pita",
    Ikon: TriangleAlert,
    teks: "text-red-800",
    latar: "bg-red-50",
    garis: "border-red-200",
  },
  // Sengaja NETRAL — bukan merah. Ini keterbatasan cuaca, bukan kecurigaan
  // (aturan desain v2.3 butir 2, sama seperti TN-19c).
  TIDAK_DAPAT_DINILAI: {
    label: "Tidak dapat dinilai",
    Ikon: CircleSlash,
    teks: "text-slate-700",
    latar: "bg-slate-50",
    garis: "border-slate-200",
  },
};

const DASAR: Record<string, string> = {
  PITA_SAJA: "Pita dari lahan Anda sendiri",
  PITA_PLUS_BENCHMARK: "Pita + rata-rata Tenant sezona",
  TIDAK_ADA_DASAR: "Tidak ada dasar penilaian",
};

const waktu = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RiwayatKewajaranPage() {
  const { id } = useParams<{ id: string }>();
  const [riwayat, setRiwayat] = useState<YieldAssessmentHistoryItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    if (!id) return;
    ambilRiwayatKewajaran(id)
      .then((r) => {
        setRiwayat(r);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat riwayat penilaian"))
      .finally(() => setMemuat(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href={`/tenant/batch/${id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke batch
      </Link>

      <h1 className="text-2xl font-bold text-[#0a381f]">Penilaian Kewajaran Hasil</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Perkiraan hasil dihitung dari luas efektif lahan Anda dan seberapa hijau tanamannya
        terlihat dari satelit sampai hari panen. Rentangnya sengaja lebar — tujuannya menandai
        laporan yang tidak masuk akal, bukan mengaudit selisih kecil.
      </p>

      {memuat && <p className="text-sm text-gray-500">Memuat riwayat…</p>}

      {!memuat && galat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      )}

      {!memuat && !galat && riwayat.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
          Batch ini belum pernah dinilai. Penilaian dibuat saat Anda mengisi jumlah box hasil
          panen.
        </div>
      )}

      <ol className="space-y-3">
        {riwayat.map((r) => {
          const g = GAYA[r.finalVerdict ?? r.verdict];
          const adaPita = r.expectedMinBox !== null && r.expectedMaxBox !== null;
          return (
            <li key={r.assessmentId} className={`rounded-xl border p-5 ${g.garis} ${g.latar}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 font-bold ${g.teks}`}>
                  <g.Ikon className="h-4 w-4" />
                  {g.label}
                </span>
                <div className="flex items-center gap-2">
                  {/* Penilaian yang benar-benar menjadi panen — bukan sekadar yang terakhir. */}
                  {r.confirmed && (
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                      dikonfirmasi
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{waktu(r.assessedAt)}</span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] text-gray-500">Anda laporkan</dt>
                  <dd className="font-bold text-gray-900">{r.reportedBox} box</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-gray-500">Perkiraan dari lahan Anda</dt>
                  <dd className="font-bold text-gray-900">
                    {adaPita ? `${r.expectedMinBox}–${r.expectedMaxBox} box` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-gray-500">Puncak kehijauan (NDVI)</dt>
                  <dd className="font-bold text-gray-900">
                    {r.peakNdvi === null ? "—" : r.peakNdvi.toFixed(2)}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] text-gray-500">
                Dasar penilaian: {DASAR[r.basis] ?? r.basis}
                {r.finalVerdict && (
                  <>
                    {" · "}
                    <b className="text-gray-700">
                      Ditinjau Operator — putusannya menggantikan penilaian otomatis
                    </b>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>

      {riwayat.length > 1 && (
        <p className="mt-5 text-xs leading-relaxed text-gray-500">
          Batch ini dinilai lebih dari sekali. Itu wajar bila Anda memperbaiki angka sebelum
          mengonfirmasi, atau bila citra satelit baru datang setelah awan lewat. Seluruh
          percobaan disimpan supaya perhitungannya bisa ditelusuri.
        </p>
      )}
    </div>
  );
}
