"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { LandPlotResponse } from "@agro-os/shared";
import { GalatApi, ambilLahan } from "@/lib/api";
import { desimal } from "@/lib/format-id";
import {
  Deret,
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  Tombol,
  TombolTaut,
  Ubin,
} from "@/ui";

/** Ringkasan lahan yang tersimpan, dengan luas hasil hitung server. */
export default function TenantOnboardingConfirmationPage() {
  const router = useRouter();

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
      <Halaman lebar="sempit" judul="Lahan Anda">
        <Memuat baris={3} label="Memuat lahan" />
      </Halaman>
    );
  }

  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);
  const adaTerbatas = lahan.some((l) => l.verificationTier === "TERBATAS");

  return (
    <Halaman
      lebar="sempit"
      judul="Lahan Anda"
      pengantar="Luas di bawah ini dihitung server dengan PostGIS dari poligon yang Anda tandai — bukan angka yang bisa diketik siapa pun, termasuk Anda."
    >
      {galat ? (
        <Galat judul="Daftar lahan gagal dimuat" className="mb-8">
          {galat} Petak yang sudah Anda simpan tetap ada di server.
        </Galat>
      ) : null}

      {lahan.length === 0 ? (
        <Kosong
          judul="Belum ada petak tersimpan"
          aksi={
            <TombolTaut href="/tenant/onboarding/mapping" ukuran="sm">
              Kembali menandai petak
            </TombolTaut>
          }
        >
          Langkah berikutnya butuh setidaknya satu petak: kuota Pre-Order dihitung dari luas
          petak, jadi tanpa poligon tidak ada dasar untuk menghitungnya.
        </Kosong>
      ) : (
        <>
          <Deret kolom={2} as="dl" className="mb-8">
            <Ubin label="Total luas terdaftar" nilai={desimal(totalHa, 2)} satuan="ha" />
            <Ubin label="Petak tersimpan" nilai={String(lahan.length)} satuan="poligon" />
          </Deret>

          <Panel label="Petak Anda" judul="Yang sudah tersimpan">
            <ul>
              {lahan.map((l, i) => {
                const terbatas = l.verificationTier === "TERBATAS";
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-kertas-garis py-3"
                  >
                    <span className="text-[15px] text-tinta">Petak {i + 1}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[15px] text-tinta">
                        {desimal(l.areaHa, 2)} ha
                      </span>
                      {terbatas ? <Pil nada="awas">Terbatas</Pil> : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Luas di bawah ambang bukan penolakan, tapi berkonsekuensi permanen pada badge
                yang bisa dicapai batch di lahan itu — jadi disampaikan sekarang, bukan
                setelah Tenant menanam. */}
            {adaTerbatas ? (
              <div className="mt-6 border-t-2 border-jambu pt-3">
                <Label className="text-jambu">
                  Ada petak di bawah {desimal(MIN_LAND_PLOT_HA, 1)} hektar
                </Label>
                <Prosa className="mt-1.5 text-[14px]">
                  Satu piksel Sentinel-2 menutupi 10×10 meter, jadi petak sekecil itu bercampur
                  dengan lahan tetangganya di citra. Batch di petak tersebut tetap bisa dibuka
                  dan tetap terjual; yang tidak bisa dicapai hanyalah badge Terverifikasi
                  Satelit, jadi ia bersandar pada bukti foto dan rantai hash.
                </Prosa>
              </div>
            ) : null}
          </Panel>
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-2">
        <Tombol
          className="py-3.5"
          disabled={lahan.length === 0}
          onClick={() => router.push("/tenant/onboarding/legal")}
        >
          Lanjut — unggah legalitas
        </Tombol>
        <TombolTaut href="/tenant/onboarding/mapping" rupa="kedua" className="py-3.5">
          Tambah petak lain
        </TombolTaut>
      </div>
      <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
        Petak bisa ditambah kapan saja setelah onboarding selesai. Menambahnya sekarang hanya
        menghemat langkah nanti.
      </Sunyi>
    </Halaman>
  );
}
