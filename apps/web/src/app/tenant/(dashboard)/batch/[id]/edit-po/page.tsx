"use client";

import React, { useEffect, useState } from "react";
import type { BatchResponse } from "@agro-os/shared";
import { GalatApi, ambilBatchSatu } from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import {
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Prosa,
  TautanKembali,
  TombolTaut,
  Ubin,
} from "@/ui";

/**
 * TN-20 — Ketentuan kuota PO.
 *
 * Kuota PO yang sudah dibuka TIDAK bisa diubah, dan memang tidak ada endpoint untuk itu.
 *
 * Alasannya bukan kelalaian: harga dikunci saat pembeli memesan (FR-3.4), dan kuota
 * adalah dasar reservasi mereka. Menaikkan harga atau memangkas kuota setelah ada yang
 * membayar berarti mengubah kesepakatan sepihak — persis yang hendak dicegah model
 * Pre-Order ini.
 *
 * Jadi halaman ini menampilkan nilai yang berlaku beserta alasannya, bukan formulir yang
 * tombol simpannya tidak menuju ke mana-mana. Migrasinya mempertahankan keputusan itu apa
 * adanya dan hanya menguatkan satu hal: yang MASIH bisa diubah diberi tempat yang sama
 * besarnya dengan yang tidak. Halaman yang hanya berisi larangan mengirim Tenant pergi
 * tanpa jalan; halaman ini menutup satu pintu sambil menunjuk dua pintu yang terbuka.
 */
export default function EditPoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchSatu(id)
      .then((b) => {
        setBatch(b);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [id]);

  const kembali = <TautanKembali href={`/tenant/batch/${id}`}>Batch</TautanKembali>;

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Ketentuan kuota PO" kembali={kembali}>
        <Memuat baris={3} label="Memuat ketentuan batch" />
      </Halaman>
    );
  }

  if (galat || !batch) {
    return (
      <Halaman lebar="sempit" judul="Ketentuan kuota PO" kembali={kembali}>
        <Galat judul="Batch tidak dapat dimuat">
          {galat || "Batch tidak ditemukan."} Ketentuan batch Anda tetap tersimpan di server —
          muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const adaPembeli = batch.quotaBoxSold > 0;

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul="Ketentuan kuota PO"
      pengantar={batch.productName ?? "Batch"}
    >
      <Panel label="Berlaku sampai panen" judul="Yang sudah dikunci">
        <Deret kolom={4} as="dl">
          <Ubin label="Harga terkunci" nilai={rupiah(batch.lockedPrice)} catatan="per box" />
          <Ubin label="Kuota dibuka" nilai={angka(batch.quotaBoxTotal)} satuan="box" />
          <Ubin
            label="Sudah terjual"
            nilai={angka(batch.quotaBoxSold)}
            satuan="box"
            nada={adaPembeli ? "utama" : "netral"}
          />
          <Ubin label="Panen diklaim" nilai={tanggalPanjang(batch.claimedHarvestDate)} />
        </Deret>
      </Panel>

      {/* Larangannya dinyatakan sebagai MEKANISME, bukan sebagai aturan rumah. Nadanya
          menjelaskan siapa yang dilindungi dan mengapa — yang keras adalah mekanismenya,
          bukan kalimatnya. */}
      <div className="mt-10 border-t-2 border-tinta pt-4">
        <Label>Ketentuan ini tidak bisa diubah</Label>
        <Prosa className="mt-2 text-[15px]">
          {adaPembeli ? (
            <>
              <span className="font-mono text-tinta">{angka(batch.quotaBoxSold)} box</span> sudah
              dibayar pembeli pada harga{" "}
              <span className="font-mono text-tinta">{rupiah(batch.lockedPrice)}</span>. Mengubah
              harga atau memangkas kuota sekarang berarti mengubah kesepakatan yang sudah mereka
              bayar — justru hal yang dicegah model Pre-Order, dan justru alasan mereka bersedia
              membayar di muka.
            </>
          ) : (
            <>
              Harga dan kuota dikunci sejak batch dibuka supaya pembeli bisa merencanakan
              biayanya jauh sebelum panen. Belum ada yang memesan batch ini, tetapi ketentuannya
              tetap melekat: yang membuat kunci itu bernilai adalah bahwa ia tidak bisa dibuka
              belakangan.
            </>
          )}
        </Prosa>
      </div>

      <Panel label="Masih terbuka" judul="Yang masih bisa Anda ubah" className="mt-10">
        <dl className="space-y-4">
          <div className="border-t border-kertas-garis pt-2.5">
            <Label as="dt">Katalog produk</Label>
            <dd className="mt-1 max-w-[58ch] text-[14px] leading-relaxed text-tinta-lembut">
              Nama produk, grade, dan deskripsinya. Yang terkunci adalah ketentuan batch ini,
              bukan cara produknya diperkenalkan.
            </dd>
          </div>
          <div className="border-t border-kertas-garis pt-2.5">
            <Label as="dt">Verified Timeline</Label>
            <dd className="mt-1 max-w-[58ch] text-[14px] leading-relaxed text-tinta-lembut">
              Catatan budidaya bertambah sepanjang musim. Inilah yang paling menentukan apakah
              pembeli berikutnya percaya kuota Anda selanjutnya.
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <TombolTaut href="/tenant/catalog" rupa="kedua">
            Katalog produk
          </TombolTaut>
          <TombolTaut href={`/tenant/batch/${id}/progress/new`}>Catat kegiatan</TombolTaut>
        </div>
      </Panel>
    </Halaman>
  );
}
