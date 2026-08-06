"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, TrendingDown, ThumbsUp, Scale, Settings2 } from "lucide-react";
import {
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
  SHORTFALL_PENALTY_THRESHOLD_PCT,
} from "@agro-os/shared";
import type { TenantProfileResponse } from "@agro-os/shared";
import { GalatApi, ambilProfilTenant } from "@/lib/api";

/**
 * Rasio disimpan sebagai pecahan 0–1 di basis data, ditampilkan sebagai persen.
 * `null` berarti BELUM ADA RIWAYAT — berbeda dari 0% (ada riwayat, tanpa kegagalan),
 * dan keduanya tidak boleh terlihat sama: Tenant baru bukan Tenant sempurna.
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
  const mendekatiAmbang =
    shortfall !== null && !kenaPenalti && shortfall >= SHORTFALL_PENALTY_THRESHOLD_PCT * 0.8;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-white min-h-screen font-serif">
      <div>
        <h1 className="text-3xl font-bold text-[#0a381f] mb-2">Kinerja &amp; Reputasi Farm</h1>
        <p className="text-sm text-gray-500 font-sans">
          Metrik keandalan pasokan Anda (rolling {SHORTFALL_PENALTY_ROLLING_CYCLES} siklus
          terakhir).
        </p>
      </div>

      {(kenaPenalti || mendekatiAmbang) && (
        <div className="bg-[#fdf2f2] border border-[#fbd5d5] rounded-xl p-6 font-sans">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#f8b4b4] text-[#9b1c1c] flex items-center justify-center shrink-0 mt-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#9b1c1c] mb-2">
                {kenaPenalti ? "Kuota Anda sedang dibatasi" : "Tindakan Diperlukan"}
              </h2>
              <p className="text-sm text-[#c81e1e] leading-relaxed">
                {kenaPenalti ? (
                  <>
                    Rasio shortfall Anda melewati ambang{" "}
                    <strong className="font-black">{SHORTFALL_PENALTY_THRESHOLD_PCT}%</strong>,
                    sehingga pengali kuota diturunkan ke{" "}
                    <strong className="font-black">{pengali}x</strong>. Pengali kembali normal
                    setelah rasio turun di bawah ambang pada siklus berikutnya.
                  </>
                ) : (
                  <>
                    Rasio shortfall Anda <strong className="font-black">({shortfall}%)</strong>{" "}
                    mendekati ambang batas kritis {SHORTFALL_PENALTY_THRESHOLD_PCT}%. Jika
                    terlewati, kuota pembukaan PO Anda dikurangi otomatis pada siklus berikutnya.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Rasio Shortfall */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <AlertTriangle
                  className={`w-4 h-4 ${shortfall !== null && shortfall >= SHORTFALL_PENALTY_THRESHOLD_PCT ? "text-red-600" : "text-gray-400"}`}
                />{" "}
                Rasio Shortfall
              </div>
              <TrendingDown className="w-12 h-12 text-[#fbd5d5] opacity-50" />
            </div>
            <div
              className={`text-4xl font-black mb-4 ${
                shortfall === null
                  ? "text-gray-300"
                  : shortfall >= SHORTFALL_PENALTY_THRESHOLD_PCT
                    ? "text-[#c81e1e]"
                    : "text-[#0a381f]"
              }`}
            >
              {shortfall === null ? "—" : `${shortfall}%`}
            </div>
            <div className="w-full bg-[#fdf2f2] rounded-full h-2 mb-4">
              <div
                className="bg-[#c81e1e] h-2 rounded-full"
                style={{
                  width: `${Math.min(((shortfall ?? 0) / SHORTFALL_PENALTY_THRESHOLD_PCT) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            {shortfall === null
              ? "Belum ada siklus panen selesai — rasio baru muncul setelah batch pertama ditutup."
              : `Bagian kuota terjual yang gagal dikirim. Ambang penalti ${SHORTFALL_PENALTY_THRESHOLD_PCT}%.`}
          </p>
        </div>

        {/* Rasio Klaim Mutu */}
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

        {/* Quota Multiplier */}
        <div className="border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Scale className="w-4 h-4 text-amber-700" /> Quota Multiplier Berjalan
              </div>
              <Scale className="w-12 h-12 text-[#f3e8d2] opacity-50" />
            </div>
            <div className="text-4xl font-black text-amber-900 mb-4">{pengali}x</div>
            <div className="flex gap-1 mb-4 h-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${
                    i < Math.round((pengali / QUOTA_MULTIPLIER_NORMAL) * 5)
                      ? "bg-amber-900"
                      : "bg-[#eef3fb]"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            {kenaPenalti
              ? `Dibatasi ke ${pengali}x akibat shortfall siklus lalu (normal ${QUOTA_MULTIPLIER_NORMAL}x).`
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
