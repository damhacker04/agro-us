"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { SatelliteReviewItem } from "@agro-os/shared";
import { GalatApi, ambilAntreanSatelit } from "@/lib/api";
import { desimal, tanggalPanjang } from "@/lib/format-id";
import { PilStatusMentah, STATUS_MENTAH } from "@/components/tanda-verifikasi";
import { BarisData, Deret, Galat, Halaman, Kosong, Memuat, Panel, Prosa, Sunyi } from "@/ui";

/**
 * OP-04 — Antrean tinjauan satelit (FR-4.6).
 *
 * Hanya PERLU_DITINJAU dan TIDAK_SESUAI yang masuk sini: pipeline menemukan sesuatu yang
 * tidak langsung cocok antara klaim Tenant dan citra, dan tidak mau menjatuhkan putusannya
 * sendiri. Status lain tidak menunggu keputusan siapa pun.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: halaman ini punya SALINAN KETIGA dari pemetaan
 * status→label, lengkap dengan warnanya sendiri (emerald/amber/orange/gray/red). Itu persis
 * yang dilarang docstring `tanda-verifikasi.tsx` — pemetaan status verifikasi yang
 * diduplikasi akan melenceng, dan yang melenceng di sini adalah derajat kepercayaan yang
 * dijanjikan produk ini. Kosakatanya kini satu, dipakai bersama pembeli dan Tenant.
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
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Antrean gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <Halaman
      judul="Verifikasi satelit"
      pengantar="Batch yang klaimnya tidak langsung cocok dengan citra. Putusan Anda mengubah tanda yang dilihat pembeli di katalog."
      aksi={
        !memuat && !galat && antrean.length > 0 ? (
          <Sunyi className="font-mono text-[12px]">{antrean.length} menunggu tinjauan</Sunyi>
        ) : null
      }
    >
      {galat ? (
        <Galat judul="Antrean gagal dimuat">
          {galat} Batch yang menunggu tetap tercatat di server, dan tandanya tetap
          &ldquo;belum terverifikasi&rdquo; sampai ada yang meninjau — muat ulang halaman
          untuk mencoba lagi.
        </Galat>
      ) : memuat ? (
        <Memuat baris={3} label="Memuat antrean satelit" />
      ) : antrean.length === 0 ? (
        /* Antrean tinjauan yang kosong adalah antrean yang sehat. */
        <Kosong judul="Tidak ada batch yang menunggu tinjauan">
          Batch yang citranya mendukung maupun yang jelas-jelas menyangkal klaim diputus
          otomatis oleh pipeline. Yang sampai ke meja ini hanya yang marginal, dan saat ini
          tidak ada.
        </Kosong>
      ) : (
        <div className="space-y-8">
          {antrean.map((b) => (
            <BarisTinjauan key={b.batchId} b={b} />
          ))}
        </div>
      )}
    </Halaman>
  );
}

/* Tahun ikut dicetak: musim tanam bisa melewati pergantian tahun, dan tanggal tanpa
   tahun di layar pembanding tanggal adalah ambiguitas yang mahal. */
const tgl = (iso: string | null) => (iso ? tanggalPanjang(iso) : "tidak terdeteksi");

function BarisTinjauan({ b }: { b: SatelliteReviewItem }) {
  const s = STATUS_MENTAH[b.verificationStatus];
  // Tiga keadaan, bukan dua: TIDAK ADA lintasan sama sekali berbeda dari ada lintasan yang
  // seluruhnya dibuang. Menyebut "dibuang" saat tidak ada yang pernah diambil mengarang
  // sebuah proses yang tidak terjadi.
  const tanpaLintasan = b.observationCount === 0;
  const semuaTertutup = b.observationCount > 0 && b.usableObservationCount === 0;

  return (
    <Panel
      nada={s.nada}
      label={`${b.tenantName} · ${desimal(b.landPlotAreaHa, 2)} ha`}
      judul={
        <Link
          href={`/operator/satellite/${b.batchId}`}
          className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          {b.productName}
        </Link>
      }
      aksi={<PilStatusMentah status={b.verificationStatus} />}
    >
      {/* Temuannya, bukan sekadar namanya. Pil di atas menyebut keadaan; kalimat ini
          menjelaskan mengapa batch ini berhenti di meja manusia. */}
      <Prosa className="text-[14px]">{s.jelas}</Prosa>

      {/* Klaim dan deteksi berdiri berdampingan tanpa disimpulkan — sama seperti kurva di
          halaman pembeli. Yang membandingkan tetap manusianya (FR-4.6). */}
      <Deret kolom={2} as="dl" className="mt-6">
        <BarisData label="Diklaim Tenant">
          tanam {tgl(b.claimedPlantDate)}
          <br />
          panen {tgl(b.claimedHarvestDate)}
        </BarisData>
        <BarisData label="Terdeteksi citra">
          tanam {tgl(b.detectedPlantDate)}
          <br />
          panen {tgl(b.detectedHarvestDate)}
        </BarisData>
      </Deret>

      <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
        {tanpaLintasan
          ? "Belum ada lintasan Sentinel-2 yang tercatat untuk petak ini, jadi belum ada apa pun untuk dibandingkan dengan klaim di atas."
          : semuaTertutup
            ? `Nol dari ${b.observationCount} lintasan terpakai — seluruhnya tertutup awan, jadi tidak ada yang bisa dibandingkan dengan klaim di atas.`
            : `${b.usableObservationCount} dari ${b.observationCount} lintasan terpakai. Lintasan tertutup awan dibuang oleh pipeline, bukan disembunyikan.`}
      </Sunyi>
    </Panel>
  );
}
