"use client";

import React, { useEffect, useState } from "react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { CaptureMethod, LandPlotResponse } from "@agro-os/shared";
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
  TombolTaut,
  Ubin,
} from "@/ui";

/**
 * TN-05 — Manajemen lahan.
 *
 * MIGRASI DUNIA. Dua hal yang berubah selain rupa:
 *
 * 1. DUA "KARTU STATISTIK" BERIKON DIBUANG. Total luas dan jumlah petak sebelumnya berdiri
 *    sebagai dua kotak besar berbayang, masing-masing dengan ikon dalam kotak berwarna —
 *    pola hero-metric yang isinya cuma dua angka. Keduanya kini `Ubin`, perangkat yang sudah
 *    dipakai seluruh halaman kerja untuk hal yang sama, dan tempat yang dibebaskannya
 *    dikembalikan ke petaknya sendiri.
 *
 * 2. POLIGON BERHENTI JADI HIASAN HIJAU. Bentuk petak digambar `ungu` — warna mekanisme
 *    verifikasi — karena poligon inilah yang nanti diadu dengan citra satelit. Ia bukan
 *    gambar pemanis di kepala kartu; ia isi kartunya.
 */

const METODE: Record<CaptureMethod, string> = {
  GAMBAR_PETA: "Digambar dari koordinat",
  WALK_AROUND: "Dikelilingi berjalan kaki",
};

/**
 * Menggambar poligon lahan yang SEBENARNYA, bukan bentuk hiasan.
 *
 * Koordinat dinormalisasi ke kotak 100×100 dengan skala seragam supaya proporsi petak tetap
 * benar; lintang dibalik karena sumbu Y layar tumbuh ke bawah sedangkan lintang tumbuh ke
 * utara. Ini pratinjau bentuk, bukan peta — tidak ada latar peta, jadi tidak ada yang bisa
 * disalahartikan sebagai lokasi presisi.
 */
function PratinjauPoligon({ polygon }: { polygon: LandPlotResponse["polygon"] }) {
  const cincin = polygon?.coordinates?.[0];
  if (!cincin || cincin.length < 3) {
    return (
      <div className="flex h-28 w-32 items-center justify-center border border-kertas-garis bg-kertas">
        <Label>Tanpa bentuk</Label>
      </div>
    );
  }

  const xs = cincin.map((c) => c[0]!);
  const ys = cincin.map((c) => c[1]!);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Digambar ke dalam kotak 4–96, bukan 0–100: garis tepi punya ketebalan, dan
  // poligon yang menyentuh persis batas viewBox akan terpotong separuh strokenya.
  const TEPI = 4;
  const isi = 100 - TEPI * 2;
  const rentang = Math.max(maxX - minX, maxY - minY) || 1;
  const geserX = (isi - ((maxX - minX) / rentang) * isi) / 2;
  const geserY = (isi - ((maxY - minY) / rentang) * isi) / 2;

  const titik = cincin
    .map((c) => {
      const x = TEPI + ((c[0]! - minX) / rentang) * isi + geserX;
      const y = 100 - (TEPI + ((c[1]! - minY) / rentang) * isi + geserY);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-32" role="img" aria-label="Bentuk petak lahan">
      <polygon
        points={titik}
        className="fill-ungu/15 stroke-ungu"
        strokeWidth={2}
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export default function TenantLandManagementPage() {
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

  const aksi = (
    <TombolTaut href="/tenant/land/mapping" ukuran="sm">
      Petakan lahan
    </TombolTaut>
  );

  if (memuat) {
    return (
      <Halaman judul="Lahan">
        <Memuat baris={3} label="Memuat lahan" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Lahan" aksi={aksi}>
        <Galat judul="Lahan gagal dimuat">
          {galat} Petak Anda tetap tersimpan di server — muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const totalHa = lahan.reduce((s, l) => s + l.areaHa, 0);

  return (
    <Halaman
      judul="Lahan"
      pengantar="Luas dihitung server dari poligon Anda, tidak diketik sendiri. Poligon itu juga yang dibandingkan dengan citra satelit saat klaim panen diverifikasi — jadi ia menentukan dua hal sekaligus: batas kuota yang boleh dibuka, dan sejauh mana klaim bisa dibuktikan."
      aksi={aksi}
    >
      {lahan.length === 0 ? (
        <Kosong
          judul="Belum ada lahan terpetakan"
          aksi={
            <TombolTaut href="/tenant/land/mapping" ukuran="sm">
              Petakan petak pertama
            </TombolTaut>
          }
        >
          Kuota Pre-Order dihitung dari luas petak yang poligonnya sudah tersimpan, jadi
          setidaknya satu petak harus ada sebelum kuota bisa dibuka. Memetakannya cukup
          sekali per petak.
        </Kosong>
      ) : (
        <>
          <Deret kolom={2} as="dl" className="mb-10">
            <Ubin label="Total luas terdaftar" nilai={desimal(totalHa, 2)} satuan="ha" />
            <Ubin
              label="Petak terdaftar"
              nilai={String(lahan.length)}
              satuan={lahan.length === 1 ? "poligon" : "poligon"}
            />
          </Deret>

          <div className="space-y-8">
            {lahan.map((l, i) => (
              <BarisLahan key={l.id} l={l} urutan={i + 1} />
            ))}
          </div>
        </>
      )}
    </Halaman>
  );
}

function BarisLahan({ l, urutan }: { l: LandPlotResponse; urutan: number }) {
  const terbatas = l.verificationTier === "TERBATAS";

  return (
    <Panel
      nada={terbatas ? "awas" : "netral"}
      label={`Petak ${urutan} · ${METODE[l.captureMethod]}`}
      judul={`${desimal(l.areaHa, 2)} hektar`}
      aksi={
        <Pil nada={terbatas ? "awas" : "utama"} garis={!terbatas}>
          {terbatas ? "Verifikasi terbatas" : "Verifikasi normal"}
        </Pil>
      }
    >
      <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
        <PratinjauPoligon polygon={l.polygon} />
        <div className="min-w-0 flex-1">
          <dl className="space-y-4">
            <div className="border-t border-kertas-garis pt-2.5">
              <Label as="dt">Penanda petak</Label>
              <dd className="mt-1 font-mono text-[13px] text-tinta-lembut">{l.id.slice(0, 8)}</dd>
            </div>
            <div className="border-t border-kertas-garis pt-2.5">
              <Label as="dt">Titik sudut</Label>
              <dd className="mt-1 font-mono text-[13px] text-tinta-lembut">
                {/* Cincin GeoJSON tertutup: titik terakhir mengulang yang pertama, jadi
                    jumlah sudut sebenarnya satu lebih sedikit dari panjang cincinnya. */}
                {Math.max((l.polygon?.coordinates?.[0]?.length ?? 1) - 1, 0)} sudut
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {terbatas ? (
        <div className="mt-6 border-t-2 border-jambu pt-3">
          <Label className="text-jambu">
            Di bawah {desimal(MIN_LAND_PLOT_HA, 1)} hektar
          </Label>
          <Prosa className="mt-1.5 text-[14px]">
            Terlalu kecil untuk dipisahkan dari petak tetangga oleh citra satelit — satu piksel
            Sentinel-2 menutupi 10×10 meter, jadi petak sekecil ini bercampur dengan lahan di
            sebelahnya. Batch di petak ini tetap bisa dibuka dan tetap terjual; yang tidak bisa
            dicapai hanyalah badge Terverifikasi Satelit, jadi ia bersandar pada bukti foto.
          </Prosa>
        </div>
      ) : (
        <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
          Cukup luas untuk dikenali terpisah oleh citra Sentinel-2, jadi batch di petak ini bisa
          mencapai badge Terverifikasi Satelit.
        </Sunyi>
      )}
    </Panel>
  );
}
