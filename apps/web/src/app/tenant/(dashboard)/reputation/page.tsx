"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
} from "@agro-os/shared";
import type { TenantProfileResponse } from "@agro-os/shared";
import { GalatApi, ambilProfilTenant } from "@/lib/api";
import { Galat, Halaman, Label, Memuat, Panel, Prosa, Sunyi, Ubin } from "@/ui";

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
 * Yang ditampilkan adalah posisi RELATIF terhadap rata-rata zona (TN-34). Rasio mentah pun
 * tidak lagi ditampilkan: dibandingkan berulang kali lintas siklus, ambangnya tersimpulkan
 * meski tidak pernah tertulis di mana pun.
 *
 * Selama benchmark lintas-Tenant (FR-7.12b) belum tersedia, posisinya `null` dan
 * dinyatakan apa adanya sebagai "belum ada pembanding" — bukan 0, yang akan terbaca
 * sebagai "tepat rata-rata" (FR-7.12e).
 *
 * Nada: informatif, bukan mengancam (aturan desain v2.3 butir 4). Tenant adalah sisi
 * pasok yang harus diakuisisi, bukan tersangka yang diawasi.
 *
 * MIGRASI DUNIA. Selain warna dan tipografi, tiga hal dibuang karena memang tidak pernah
 * membawa isi: `font-serif` di seluruh halaman (serif sistem sebagai suara display adalah
 * kostum, bukan pilihan), ikon `Settings2` raksasa yang diputar 45° dengan tulisan "SEHAT"
 * ditumpuk di tengahnya, dan ikon hantu di pojok tiap kartu. Yang tersisa adalah tiga angka
 * dan kalimat yang menjelaskannya — dan itu memang seluruh isi halaman ini.
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

  if (memuat) {
    return (
      <Halaman judul="Kinerja &amp; reputasi farm">
        <Memuat baris={3} label="Memuat reputasi" />
      </Halaman>
    );
  }

  if (galat || !profil) {
    return (
      <Halaman judul="Kinerja &amp; reputasi farm">
        <Galat judul="Reputasi tidak dapat dimuat">
          {galat || "Profil Tenant tidak ditemukan."} Angka di halaman ini dihitung ulang tiap
          siklus dan tidak hilang — muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  // Posisi relatif terhadap rata-rata zona — BUKAN rasio mentah (FR-7.12f, user flow TRP).
  // Angka mentah mengundang dibandingkan dengan ambang, dan ambang yang bisa disimpulkan
  // sama saja dengan ambang yang ditampilkan.
  const posisi = profil.yieldPosition;
  const klaim = persen(profil.claimRatioCached);
  const pengali = profil.quotaMultiplier;
  const kenaPenalti = pengali <= QUOTA_MULTIPLIER_PENALTY;

  return (
    <Halaman
      judul="Kinerja &amp; reputasi farm"
      pengantar={`Keandalan pasokan Anda, dihitung dari ${SHORTFALL_PENALTY_ROLLING_CYCLES} siklus terakhir yang berjalan.`}
    >
      {/* Muncul HANYA setelah penalti benar-benar berlaku, dan isinya penjelasan
          perhitungan — bukan peringatan "Anda mendekati ambang". Peringatan semacam itu
          memberi tahu persis seberapa jauh Tenant boleh menyimpang. */}
      {kenaPenalti ? (
        <Panel label="Status kuota" judul="Kuota Anda sedang dibatasi" nada="awas" className="mb-8">
          <Prosa>
            Realisasi panen Anda menyimpang dari pola wajar pada beberapa siklus terakhir,
            sehingga pengali kuota diturunkan ke <span className="font-mono text-jambu">{pengali}×</span>.
            Pengali kembali normal setelah {SHORTFALL_PENALTY_ROLLING_CYCLES} siklus realisasi
            Anda kembali dalam batas wajar — saat ini{" "}
            <span className="font-mono text-tinta">{profil.cleanCyclesStreak}</span> siklus
            berturut-turut sudah tercatat wajar.
          </Prosa>
        </Panel>
      ) : null}

      <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
        {/* TN-34 — Posisi Realisasi vs Zona. Menggantikan tampilan rasio shortfall. */}
        <div>
          <Ubin
            label="Realisasi vs rata-rata zona"
            nilai={posisi === null ? "—" : `${posisi > 0 ? "+" : ""}${Math.round(posisi * 10) / 10}%`}
            nada={posisi === null ? "netral" : posisi < 0 ? "awas" : "utama"}
          />
          <Sunyi className="mt-3 text-[12px]">
            {posisi === null
              ? "Belum ada cukup Tenant pembanding pada komoditas dan musim yang sama, jadi posisi Anda belum bisa dihitung. Tidak ada penilaian yang dijatuhkan tanpa dasar."
              : posisi < 0
                ? "Realisasi panen Anda di bawah rata-rata zona untuk komoditas dan musim ini."
                : "Realisasi panen Anda di atas atau setara rata-rata zona untuk komoditas dan musim ini."}
          </Sunyi>
        </div>

        {/* Rasio Klaim Mutu — TIDAK punya masalah yang sama: pengajunya PEMBELI, bukan
            pihak yang diuntungkan bila angkanya salah. Target 5% boleh ditampilkan. */}
        <div>
          <Ubin
            label="Rasio klaim mutu"
            nilai={klaim === null ? "—" : `${klaim}%`}
            nada={klaim !== null && klaim >= 5 ? "awas" : "utama"}
            catatan={<span className="font-mono">target &lt; 5%</span>}
          />
          {klaim !== null ? <PitaTarget nilai={klaim} target={5} /> : null}
          <Sunyi className="mt-3 text-[12px]">
            {klaim === null
              ? "Belum ada pengiriman yang melewati jendela klaim mutu."
              : "Bagian pengiriman yang diklaim bermasalah oleh pembeli."}
          </Sunyi>
        </div>

        {/* Quota Multiplier — nilai berjalan, tanpa skala yang membocorkan batasnya. */}
        <div>
          <Ubin
            label="Pengali kuota berjalan"
            nilai={`${pengali}×`}
            nada={kenaPenalti ? "awas" : "netral"}
          />
          <Sunyi className="mt-3 text-[12px]">
            {kenaPenalti
              ? `Dibatasi ke ${pengali}×. Nilai normal ${QUOTA_MULTIPLIER_NORMAL}×.`
              : `Kuota PO maksimum = luas lahan × rendemen × ${pengali}×. Ini nilai normal.`}
          </Sunyi>
        </div>
      </div>

      <div className="mt-12 border-t border-kertas-garis pt-5">
        <Label className="mb-2">Selanjutnya</Label>
        <Link
          href="/tenant/batch"
          className="text-[15px] font-semibold text-ungu underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          Lihat batch dan riwayat panen
        </Link>
      </div>
    </Halaman>
  );
}

/**
 * Pita target — bukan progress bar berujung bulat.
 *
 * Yang diukur di sini sah untuk ditampilkan skalanya: targetnya 5%, dan pengaju klaim adalah
 * PEMBELI, jadi tidak ada yang diuntungkan dengan melapor tepat di bawah garis. Bentuknya
 * dua aturan bertumpuk setebal 3px, radius nol — dunia ini mengukur dengan garis, dan garis
 * yang terisi sebagian adalah persis bagaimana dokumen cetak menunjukkan proporsi.
 */
function PitaTarget({ nilai, target }: { nilai: number; target: number }) {
  const isi = Math.min((nilai / target) * 100, 100);
  const lewat = nilai >= target;
  return (
    <div className="mt-3 h-[3px] w-full bg-kertas-garis" aria-hidden>
      <div className={`h-full ${lewat ? "bg-jambu" : "bg-ungu"}`} style={{ width: `${isi}%` }} />
    </div>
  );
}
