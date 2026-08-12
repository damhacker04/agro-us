"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Scale, Settings2, ThumbsUp, TrendingDown } from "lucide-react";
import {
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
} from "@agro-os/shared";
import type { TenantProfileResponse } from "@agro-os/shared";
import { GalatApi, ambilProfilTenant } from "@/lib/api";

/**
 * TN-33 — Kinerja & Reputasi Tenant.
 *
 * ⚠️ HALAMAN INI TIDAK BOLEH MENAMPILKAN ANGKA AMBANG PENALTI (FR-7.12c).
 *
 * Versi sebelumnya menampilkannya di tujuh tempat, termasuk kalimat "mendekati ambang
 * batas kritis 15%" dan progress bar yang mengukur jarak menuju ambang itu. Karena angka
 * shortfall dilaporkan Tenant sendiri, ambang yang terlihat berhenti menjadi pagar dan
 * berubah menjadi target: cukup melaporkan tepat di bawahnya setiap siklus, selamanya.
 *
 * Yang boleh ditampilkan adalah posisi RELATIF terhadap rata-rata zona (TN-34, menyusul
 * setelah benchmark FR-7.12b ada). Sampai itu tersedia, halaman ini menampilkan rasio apa
 * adanya tanpa membandingkannya dengan ambang mana pun.
 *
 * Nada: informatif, bukan mengancam (aturan desain v2.3 butir 4). Tenant adalah sisi
 * pasok yang harus diakuisisi, bukan tersangka yang diawasi.
 */
const persen = (r: number | null) => (r === null ? null : Math.round(r * 1000) / 10);

export default function ReputationPage() {
  const [profil, setProfil] = useState<TenantProfileResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilProfilTenant()
      .then((p) => {
        setProfil(p);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat reputasi"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat reputasi…</div>;

  if (galat || !profil) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Profil Tenant tidak ditemukan"}
        </div>
      </div>
    );
  }

  const shortfall = persen(profil.shortfallRatioCached);
  const klaim = persen(profil.claimRatioCached);
  const pengali = profil.quotaMultiplier;
  const kenaPenalti = pengali <= QUOTA_MULTIPLIER_PENALTY;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-white min-h-screen font-serif">
      <div>
        <h1 className="text-3xl font-bold text-[#0a381f] mb-2">Kinerja &amp; Reputasi Farm</h1>
        <p className="text-sm text-gray-500 font-sans">
          Metrik keandalan pasokan Anda (rolling {SHORTFALL_PENALTY_ROLLING_CYCLES} siklus
          terakhir).
        </p>
      </div>

      {/* Muncul HANYA setelah penalti benar-benar berlaku, dan isinya penjelasan
          perhitungan — bukan peringatan "Anda mendekati ambang". Peringatan semacam itu
          memberi tahu persis seberapa jauh Tenant boleh menyimpang. */}
      {kenaPenalti && (
        <div className="bg-[#fdf2f2] border border-[#fbd5d5] rounded-xl p-6 font-sans">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f8b4b4] text-[#9b1c1c] flex items-center justify-center shrink-0 mt-1">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#9b1c1c] mb-2">Kuota Anda sedang dibatasi</h2>
              <p className="text-sm text-[#c81e1e] leading-relaxed">
                Realisasi panen Anda menyimpang dari pola wajar pada beberapa siklus
                terakhir, sehingga pengali kuota diturunkan ke{" "}
                <strong className="font-black">{pengali}x</strong>. Pengali kembali normal
                setelah {SHORTFALL_PENALTY_ROLLING_CYCLES} siklus realisasi Anda kembali
                dalam batas wajar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Rasio Shortfall — angka apa adanya, tanpa bar "jarak ke ambang". */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <TrendingDown className="w-4 h-4 text-gray-400" /> Rasio Shortfall
              </div>
            </div>
            <div
              className={`text-4xl font-black mb-2 ${shortfall === null ? "text-gray-300" : "text-[#0a381f]"}`}
            >
              {shortfall === null ? "—" : `${shortfall}%`}
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            {shortfall === null
              ? "Belum ada siklus panen selesai — rasio baru muncul setelah batch pertama ditutup."
              : "Bagian kuota terjual yang tidak terpenuhi, dirata-rata pada siklus terakhir."}
          </p>
        </div>

        {/* Rasio Klaim Mutu — TIDAK punya masalah yang sama: pengajunya PEMBELI, bukan
            pihak yang diuntungkan bila angkanya salah. Target 5% boleh ditampilkan. */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <ThumbsUp className="w-4 h-4 text-emerald-600" /> Rasio Klaim Mutu
              </div>
              <div className="w-12 h-12 text-emerald-100 flex items-center justify-center opacity-50 relative">
                <Settings2 className="w-10 h-10 absolute rotate-45" />
                {klaim !== null && klaim < 5 && (
                  <span className="text-[8px] font-black absolute text-emerald-800 tracking-widest z-10">
                    SEHAT
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <div
                className={`text-4xl font-black ${klaim === null ? "text-gray-300" : "text-[#0a381f]"}`}
              >
                {klaim === null ? "—" : `${klaim}%`}
              </div>
              <span className="text-[10px] text-gray-500 font-bold">/ target &lt; 5%</span>
            </div>
            <div className="w-full bg-[#eef3fb] rounded-full h-2 mb-4">
              <div
                className="bg-[#0a381f] h-2 rounded-full"
                style={{ width: `${Math.min(((klaim ?? 0) / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            {klaim === null
              ? "Belum ada pengiriman yang melewati jendela klaim mutu."
              : "Bagian pengiriman yang diklaim bermasalah oleh pembeli."}
          </p>
        </div>

        {/* Quota Multiplier — nilai berjalan, tanpa skala yang membocorkan batasnya. */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Scale className="w-4 h-4 text-amber-700" /> Quota Multiplier Berjalan
              </div>
              <Scale className="w-12 h-12 text-[#f3e8d2] opacity-50" />
            </div>
            <div className="text-4xl font-black text-amber-900 mb-2">{pengali}x</div>
          </div>
          <p className="text-[10px] text-gray-500">
            {kenaPenalti
              ? `Dibatasi ke ${pengali}x. Nilai normal ${QUOTA_MULTIPLIER_NORMAL}x.`
              : `Kuota PO maksimum = luas lahan × rendemen × ${pengali}x. Ini nilai normal.`}
          </p>
        </div>
      </div>

      <div className="font-sans">
        <Link href="/tenant/batch" className="text-sm font-semibold text-emerald-700 hover:underline">
          Lihat batch dan riwayat panen →
        </Link>
      </div>
    </div>
  );
}
