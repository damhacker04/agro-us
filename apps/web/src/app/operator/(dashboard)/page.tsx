"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CLAIM_REVIEW_SLA_HOURS } from "@agro-os/shared";
import type { ClaimResponse } from "@agro-os/shared";
import {
  ambilAntreanKewajaran,
  ambilAntreanKlaim,
  ambilAntreanLegalitas,
  ambilAntreanSatelit,
  ambilAntreanUmurSimpan,
} from "@/lib/api";
import { angka, jamWib, rupiah, tanggalPanjang } from "@/lib/format-id";
import { Galat, Halaman, Kosong, Label, Memuat, Panel, Pil, Prosa, Sunyi } from "@/ui";

type Antrean = ClaimResponse & { overdue: boolean };

/**
 * Beranda operator — antrean kerja, bukan pameran angka.
 *
 * MIGRASI DUNIA, dengan tiga hal yang bukan soal rupa:
 *
 * 1. LIMA ANTREAN, BUKAN DUA. Layar lama merakit dirinya dari klaim mutu dan legalitas
 *    saja, dan docstring-nya menyebut alasannya: hanya keduanya yang punya endpoint. Itu
 *    benar saat ditulis dan tidak lagi benar sekarang — tinjauan satelit, tinjauan kewajaran,
 *    dan pantau umur simpan semuanya punya endpoint dan halamannya sendiri. Akibatnya
 *    beranda bisa berkata "tidak ada antrean" sementara sebuah tinjauan satelit menunggu:
 *    **kesalahan terburuk yang bisa dilakukan sebuah antrean kerja adalah menyatakan dirinya
 *    kosong padahal tidak.**
 *
 * 2. SATU ENDPOINT GAGAL TIDAK LAGI MENGOSONGKAN SELURUH HALAMAN. `Promise.all` menolak pada
 *    kegagalan pertama, jadi satu antrean yang bermasalah menghapus empat antrean lain yang
 *    baik-baik saja. Dengan `allSettled`, yang gagal menyebut dirinya gagal dan sisanya tetap
 *    terbaca — dan sebuah antrean yang tidak diketahui isinya TIDAK pernah dihitung nol.
 *
 * 3. "SLA 1 HARI KERJA" BERHENTI DIKETIK DI KALIMAT. Angkanya `CLAIM_REVIEW_SLA_HOURS` di
 *    kontrak bersama — aturan yang dijalankan server saat menandai klaim lewat SLA.
 */
type Keadaan = { jumlah: number | null; gagal: boolean };

const KOSONG_KEADAAN: Keadaan = { jumlah: null, gagal: false };

export default function OperatorDashboardPage() {
  const [klaim, setKlaim] = useState<Antrean[]>([]);
  const [klaimGagal, setKlaimGagal] = useState(false);
  const [legalitas, setLegalitas] = useState<Keadaan>(KOSONG_KEADAAN);
  const [satelit, setSatelit] = useState<Keadaan>(KOSONG_KEADAAN);
  const [kewajaran, setKewajaran] = useState<Keadaan>(KOSONG_KEADAAN);
  const [umurLewat, setUmurLewat] = useState<Keadaan>(KOSONG_KEADAAN);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ambilAntreanKlaim(),
      ambilAntreanLegalitas("PENDING"),
      ambilAntreanSatelit(),
      ambilAntreanKewajaran(),
      ambilAntreanUmurSimpan(),
    ])
      .then(([k, l, s, w, u]) => {
        if (k.status === "fulfilled") setKlaim(k.value);
        else setKlaimGagal(true);

        setLegalitas(
          l.status === "fulfilled"
            ? { jumlah: l.value.length, gagal: false }
            : { jumlah: null, gagal: true },
        );
        setSatelit(
          s.status === "fulfilled"
            ? { jumlah: s.value.length, gagal: false }
            : { jumlah: null, gagal: true },
        );
        setKewajaran(
          w.status === "fulfilled"
            ? { jumlah: w.value.length, gagal: false }
            : { jumlah: null, gagal: true },
        );
        setUmurLewat(
          u.status === "fulfilled"
            ? {
                jumlah: u.value.filter(
                  (b) => b.umurSimpan.remainingDays !== null && b.umurSimpan.remainingDays < 0,
                ).length,
                gagal: false,
              }
            : { jumlah: null, gagal: true },
        );
      })
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Konsol operator" pengantar="Pekerjaan yang menunggu keputusan manusia.">
        <Memuat baris={4} label="Memuat antrean" />
      </Halaman>
    );
  }

  const telat = klaim.filter((c) => c.overdue);
  const nilaiTertahan = klaim.reduce((s, c) => s + c.claimValue, 0);

  const PUTUSAN = [
    {
      href: "/operator/claims",
      nama: "Klaim mutu",
      keadaan: klaimGagal
        ? { jumlah: null, gagal: true }
        : { jumlah: klaim.length, gagal: false },
      akibat:
        "Selama belum diputus, dana pembeli maupun Tenant sama-sama tertahan dan keduanya menunggu tanpa bisa berbuat apa pun.",
    },
    {
      href: "/operator/legality",
      nama: "Verifikasi legalitas",
      keadaan: legalitas,
      akibat: "Tenant belum bisa membuka kuota Pre-Order sebelum legalitasnya disetujui.",
    },
    {
      href: "/operator/satellite",
      nama: "Tinjauan satelit",
      keadaan: satelit,
      akibat:
        "Batch tetap bertanda “belum terverifikasi” di katalog selama tidak ada yang meninjau.",
    },
    {
      href: "/operator/kewajaran",
      nama: "Tinjauan kewajaran",
      keadaan: kewajaran,
      akibat:
        "Hasil panen yang berada di tepi pita perkiraan menunggu penilaian manusia, bukan putusan otomatis.",
    },
  ];

  const adaGagal =
    klaimGagal || legalitas.gagal || satelit.gagal || kewajaran.gagal || umurLewat.gagal;
  // Antrean yang tidak diketahui isinya TIDAK boleh ikut menyimpulkan "semua bersih".
  const semuaBersih =
    !adaGagal &&
    PUTUSAN.every((p) => p.keadaan.jumlah === 0) &&
    (umurLewat.jumlah ?? 0) === 0;

  return (
    <Halaman judul="Konsol operator" pengantar="Pekerjaan yang menunggu keputusan manusia.">
      {adaGagal ? (
        <Galat judul="Sebagian antrean tidak bisa dibaca" className="mb-8">
          Antrean yang gagal dimuat ditandai di bawah. Isinya tidak dihitung nol — muat ulang
          halaman sebelum menyimpulkan bahwa tidak ada yang menunggu.
        </Galat>
      ) : null}

      {telat.length > 0 ? (
        <Panel
          nada="awas"
          label="Lewat SLA"
          judul={`${angka(telat.length)} klaim menunggu terlalu lama`}
          className="mb-8"
        >
          <Prosa className="text-[14px]">
            SLA peninjauan {angka(CLAIM_REVIEW_SLA_HOURS)} jam. Semakin lama menggantung,
            semakin lama uang kedua pihak tertahan.
          </Prosa>
          <div className="mt-6 space-y-3">
            {telat.map((c) => (
              <Link
                key={c.id}
                href={`/operator/claims/${c.id}`}
                className="block border-t-2 border-jambu pt-3 transition-colors duration-150 hover:bg-kertas-garis/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
              >
                <Label className="text-jambu">{c.productName}</Label>
                <p className="mt-1.5 font-mono text-[14px] text-tinta">
                  {rupiah(c.claimValue)}
                  {c.slaDueAt
                    ? ` · jatuh tempo ${tanggalPanjang(c.slaDueAt)} ${jamWib(c.slaDueAt)} WIB`
                    : ""}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {semuaBersih ? (
        <Kosong judul="Tidak ada yang menunggu keputusan Anda">
          Kelima antrean kosong: tidak ada klaim, pendaftaran legalitas, tinjauan satelit,
          maupun tinjauan kewajaran yang menggantung, dan tidak ada batch yang lewat umur
          simpan.
        </Kosong>
      ) : (
        <Panel label="Menunggu putusan" judul="Antrean yang terbuka">
          <div className="space-y-0">
            {PUTUSAN.map((p) => (
              <BarisAntrean key={p.href} {...p} />
            ))}
          </div>
        </Panel>
      )}

      <Panel label="Perlu dilihat" judul="Bukan putusan, tetapi tidak boleh luput" className="mt-8">
        <BarisAntrean
          href="/operator/umur-simpan"
          nama="Batch lewat umur simpan"
          keadaan={umurLewat}
          akibat="Halaman itu tidak memblokir pengiriman apa pun — angkanya masih indikatif, jadi yang menimbang tetap manusia."
        />
      </Panel>

      {!klaimGagal && klaim.length > 0 ? (
        <Panel label="Sedang tertahan" judul="Nilai klaim yang belum diputus" className="mt-8">
          <p className="font-mono text-[26px] leading-none text-tinta">
            {rupiah(nilaiTertahan)}
          </p>
          <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
            Jumlah nilai seluruh klaim di antrean. Selama belum diputus, dana ini tertahan bagi
            pembeli maupun Tenant.
          </Sunyi>
        </Panel>
      ) : null}
    </Halaman>
  );
}

function BarisAntrean({
  href,
  nama,
  keadaan,
  akibat,
}: {
  href: string;
  nama: string;
  keadaan: Keadaan;
  akibat: string;
}) {
  const kosong = keadaan.jumlah === 0;

  return (
    <Link
      href={href}
      className="flex items-baseline gap-6 border-b border-kertas-garis py-4 transition-colors duration-150 last:border-b-0 hover:bg-kertas-garis/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
    >
      {/* Angkanya lebih dulu dan sejajar: yang dicari mata di antrean kerja adalah berapa,
          bukan namanya. */}
      <span
        className={`w-12 shrink-0 text-right font-mono text-[26px] leading-none ${
          keadaan.gagal ? "text-tinta-samar" : kosong ? "text-tinta-samar" : "text-tinta"
        }`}
      >
        {keadaan.gagal ? "?" : angka(keadaan.jumlah ?? 0)}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-[15px] font-semibold text-tinta">{nama}</span>
          {keadaan.gagal ? <Pil nada="awas">Gagal dimuat</Pil> : null}
        </span>
        <span className="mt-1 block max-w-[68ch] text-[13px] leading-relaxed text-tinta-lembut">
          {keadaan.gagal
            ? "Jumlahnya tidak diketahui, dan tidak dianggap nol. Muat ulang halaman untuk membacanya lagi."
            : kosong
              ? "Tidak ada yang menunggu."
              : akibat}
        </span>
      </span>
    </Link>
  );
}
