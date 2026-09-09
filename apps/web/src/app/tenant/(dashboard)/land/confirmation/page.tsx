"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { LandPlotResponse } from "@agro-os/shared";
import { GalatApi, ambilLahan } from "@/lib/api";
import { desimal } from "@/lib/format-id";
import {
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  Tanda,
  TombolTaut,
  Ubin,
} from "@/ui";

/**
 * TN-06 — Ringkasan setelah petak tersimpan. Luas di sini hasil hitung PostGIS, bukan
 * ketikan dan bukan perkiraan layar.
 *
 * DUA HAL DIPERBAIKI BERSAMA MIGRASINYA, dan keduanya saling menyebabkan:
 *
 * 1. HALAMAN INI TIDAK PERNAH BISA DICAPAI. Layar pemetaan langsung kembali ke daftar
 *    lahan setelah menyimpan, jadi tidak ada satu pun tautan masuk ke sini. Sekarang
 *    pemetaan mengarah ke halaman ini dengan membawa id petak yang baru dibuat.
 *
 * 2. "PETAK TERBARU" MENAMPILKAN PETAK YANG SALAH. Versi sebelumnya mengambil
 *    `lahan[lahan.length - 1]` — elemen terakhir daftar. Tetapi server mengurutkan lahan
 *    `ORDER BY area_ha DESC`, bukan menurut waktu buat, jadi elemen terakhir adalah petak
 *    TERKECIL milik Tenant. Halaman ini akan dengan percaya diri menyebut petak lama
 *    sebagai petak yang barusan disimpan, berikut luas dan tier yang bukan miliknya.
 *    Cacatnya tidak pernah terlihat justru karena cacat pertama: tidak ada yang membuka
 *    halaman ini. Sekarang petaknya ditunjuk lewat id, bukan ditebak dari urutan.
 */
function IsiKonfirmasi() {
  const id = useSearchParams().get("id");
  const [lahan, setLahan] = useState<LandPlotResponse[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilLahan()
      .then((d) => {
        setLahan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Lahan gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Petak tersimpan">
        <Memuat baris={3} label="Memuat petak" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman lebar="sempit" judul="Petak tersimpan">
        <Galat
          judul="Daftar lahan gagal dimuat"
          aksi={
            <TombolTaut href="/tenant/land" rupa="kedua" ukuran="sm">
              Buka daftar lahan
            </TombolTaut>
          }
        >
          {galat} Petak yang barusan Anda simpan tetap tersimpan di server — kegagalan ini
          hanya pada layar ringkasannya.
        </Galat>
      </Halaman>
    );
  }

  const petak = id ? lahan.find((l) => l.id === id) : undefined;
  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);
  const terbatas = petak?.verificationTier === "TERBATAS";

  return (
    <Halaman
      lebar="sempit"
      judul="Petak tersimpan"
      /* Pengantarnya menjanjikan "luas di bawah ini"; ketika petaknya tidak bisa ditunjuk,
         tidak ada luas di bawahnya, dan janji itu jadi kalimat yang menunjuk ke ruang kosong. */
      pengantar={
        petak
          ? "Luas di bawah ini dihitung server dengan PostGIS dari poligon yang Anda tandai — bukan angka perkiraan yang tampil saat menandai, dan bukan angka yang bisa diketik siapa pun."
          : "Luas tiap petak dihitung server dengan PostGIS dari poligonnya — bukan angka perkiraan, dan bukan angka yang bisa diketik siapa pun."
      }
    >
      {petak ? (
        <Panel
          nada={terbatas ? "awas" : "utama"}
          label="Baru saja tersimpan"
          judul={`${desimal(petak.areaHa, 2)} hektar`}
          aksi={
            <Pil nada={terbatas ? "awas" : "utama"} garis={!terbatas}>
              <Tanda jenis={terbatas ? "sebagian" : "penuh"} />
              {terbatas ? "Verifikasi terbatas" : "Verifikasi normal"}
            </Pil>
          }
        >
          <Deret kolom={3} as="dl">
            <Ubin label="Luas petak" nilai={desimal(petak.areaHa, 2)} satuan="ha" />
            <Ubin
              label="Titik sudut"
              /* Cincin GeoJSON tertutup: titik terakhir mengulang yang pertama. */
              nilai={String(Math.max((petak.polygon?.coordinates?.[0]?.length ?? 1) - 1, 0))}
              satuan="sudut"
            />
            <Ubin
              label="Cara ditandai"
              nilai={petak.captureMethod === "WALK_AROUND" ? "Dikelilingi" : "Dari koordinat"}
            />
          </Deret>

          {terbatas ? (
            <div className="mt-7 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">
                Di bawah {desimal(MIN_LAND_PLOT_HA, 1)} hektar
              </Label>
              <Prosa className="mt-1.5 text-[14px]">
                Terlalu kecil untuk dipisahkan dari petak tetangga oleh citra satelit — satu
                piksel Sentinel-2 menutupi 10×10 meter. Petak ini tetap tersimpan dan tetap
                bisa dipakai membuka kuota; yang tidak bisa dicapai batch di sini hanyalah
                badge Terverifikasi Satelit, jadi ia bersandar pada bukti foto dan rantai hash.
              </Prosa>
            </div>
          ) : (
            <Sunyi className="mt-7 max-w-[68ch] text-[13px]">
              Cukup luas untuk dikenali terpisah oleh citra Sentinel-2, jadi batch di petak ini
              bisa mencapai badge Terverifikasi Satelit.
            </Sunyi>
          )}
        </Panel>
      ) : (
        /* Ditunjuk lewat id dan tidak ketemu — dinyatakan, bukan diganti tebakan. */
        <Panel label="Ringkasan" judul="Petak tidak bisa ditunjuk">
          <Prosa className="text-[14px]">
            Halaman ini dibuka tanpa penanda petak, atau petaknya tidak ada di daftar Anda.
            Seluruh petak yang tersimpan tetap ada di Manajemen Lahan — buka daftarnya untuk
            memeriksa yang barusan Anda tandai.
          </Prosa>
        </Panel>
      )}

      <Deret kolom={2} as="dl" className="mt-10">
        <Ubin label="Total luas terdaftar" nilai={desimal(totalHa, 2)} satuan="ha" />
        <Ubin label="Petak terdaftar" nilai={String(lahan.length)} satuan="poligon" />
      </Deret>

      <div className="mt-10 flex flex-wrap gap-2">
        <TombolTaut href="/tenant/batch/new">Buka kuota di petak ini</TombolTaut>
        <TombolTaut href="/tenant/land" rupa="kedua">
          Kembali ke daftar lahan
        </TombolTaut>
      </div>
      <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
        Petak yang tersimpan belum menjanjikan apa pun kepada siapa pun. Yang mengikat baru
        dimulai saat Anda membuka kuota Pre-Order di atasnya.
      </Sunyi>
    </Halaman>
  );
}

export default function LandConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit" judul="Petak tersimpan">
          <Memuat baris={3} label="Memuat petak" />
        </Halaman>
      }
    >
      <IsiKonfirmasi />
    </Suspense>
  );
}
