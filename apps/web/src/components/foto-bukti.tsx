"use client";

import React, { useState } from "react";
import type { NodePhotoResponse } from "@agro-os/shared";
import { urlBerkas } from "@/lib/api";
import { Label, Pil, Prosa } from "@/ui";

/**
 * Foto bukti — dipakai dari ketiga sisi meja: Tenant, pembeli, dan operator.
 *
 * ADA KARENA FOTONYA BISA HILANG, DAN ITU BUKAN KASUS TEORETIS: foto demo dari sebelum
 * pindah ke R2 sudah hilang permanen dan URL-nya menjawab 404. Tanpa penanganan, `<img>`
 * yang gagal memuat menampilkan kotak putus milik peramban berikut teks `alt` yang meluber —
 * satu-satunya elemen di seluruh layar yang digambar oleh peramban, bukan oleh dunia ini,
 * dan ia muncul justru di tempat buktinya seharusnya berdiri.
 *
 * Penggantinya menyatakan keadaannya: bingkainya tetap (tata letak tidak melompat), dan
 * yang ditulis di dalamnya adalah SIDIK JARI foto itu bila ada. Gambarnya boleh hilang;
 * hash-nya tetap terkunci di rantai, dan itulah yang sebenarnya membuktikan sesuatu.
 */
function GambarBukti({
  url,
  alt,
  sidik,
  className = "h-28 w-36",
  keterangan,
}: {
  url: string;
  alt: string;
  /** Sidik jari berkas, bila kontraknya memilikinya. */
  sidik?: string;
  className?: string;
  /** Kalimat tambahan saat gagal — dipakai layar yang keputusannya BERSANDAR pada foto ini. */
  keterangan?: React.ReactNode;
}) {
  const [gagal, setGagal] = useState(false);

  if (gagal) {
    return (
      <div className={`flex flex-col justify-center border border-kertas-garis bg-kertas px-3 py-3 ${className}`}>
        <Label>Foto tidak termuat</Label>
        {sidik ? (
          <p className="mt-1.5 break-all font-mono text-[10px] leading-snug text-tinta-samar">
            {sidik.slice(0, 16)}
          </p>
        ) : null}
        {keterangan ? <div className="mt-2">{keterangan}</div> : null}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setGagal(true)}
      className={`border border-kertas-garis bg-kertas object-cover ${className}`}
    />
  );
}

/** Foto pada node timeline, berikut penanda sumbernya. */
export function FotoBukti({ foto, alt }: { foto: NodePhotoResponse; alt: string }) {
  return (
    <div className="relative">
      <GambarBukti url={urlBerkas(foto.url)} alt={alt} sidik={foto.sha256} />
      {/* Penanda sumber tetap tampil walau gambarnya gagal dimuat: derajat buktinya tidak
          ikut hilang bersama berkasnya. */}
      {foto.captureSource === "GALLERY" ? (
        <Pil nada="awas" className="absolute bottom-1 left-1">
          Dari galeri
        </Pil>
      ) : null}
    </div>
  );
}

/**
 * Foto tunggal yang menjadi DASAR SEBUAH PUTUSAN — foto klaim mutu di meja operator.
 *
 * Bedanya dengan foto timeline bukan ukurannya melainkan akibat kegagalannya: operator
 * memutus perpindahan uang berdasarkan foto ini, jadi foto yang diam-diam tidak termuat
 * berarti putusan diambil tanpa melihat buktinya. Karena itu kegagalannya tidak cukup
 * dinyatakan kecil di pojok — ia dinyatakan sebagai keadaan yang menghalangi.
 */
export function FotoPutusan({ url, alt }: { url: string; alt: string }) {
  return (
    <GambarBukti
      url={urlBerkas(url)}
      alt={alt}
      className="max-h-80 w-full max-w-[28rem] object-contain"
      keterangan={
        <Prosa className="text-[13px]">
          Berkasnya tidak bisa diambil dari penyimpanan. Jangan memutus klaim ini berdasarkan
          angka timbangan saja — mintakan ulang fotonya kepada pembeli lebih dulu.
        </Prosa>
      }
    />
  );
}
