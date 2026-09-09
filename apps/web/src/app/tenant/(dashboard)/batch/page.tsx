"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GalatApi, ambilBatchTenant } from "@/lib/api";
import { angka, desimal, rupiah, tanggalPanjang } from "@/lib/format-id";
import type { BatchResponse, ProductionStatus } from "@agro-os/shared";
import { PilStatusMentah, STATUS_MENTAH } from "@/components/tanda-verifikasi";
import {
  Galat,
  Halaman,
  Deret,
  Kosong,
  Memuat,
  Panel,
  Pil,
  Ubin,
  TombolTaut,
  type Nada,
} from "@/ui";

/**
 * TN-14 — Daftar batch Tenant.
 *
 * MIGRASI DUNIA. Dua hal yang berubah selain warna:
 *
 * 1. BILAH KEMAJUAN KUOTA DIBUANG, ANGKANYA TETAP. Bilah `rounded-full` berlatar abu-abu
 *    adalah bentuk yang paling jauh dari dunia beradius nol ini, dan yang dibacanya —
 *    proporsi kuota terjual — sudah dikatakan angkanya sendiri dengan lebih tepat. Dunia
 *    ini tidak memiliki perangkat proporsional, dan mengarang satu untuk daftar ini berarti
 *    memperkenalkan kosakata baru demi informasi yang sudah ada di sebelahnya.
 *
 * 2. LIMA STATUS VERIFIKASI MEMAKAI KOSAKATA BERSAMA. Sebelumnya halaman ini punya
 *    pemetaannya sendiri (emerald/amber/orange/gray/red) yang berbeda kata maupun warnanya
 *    dari layar pembeli untuk keadaan yang sama persis. Sekarang keduanya membaca
 *    `STATUS_MENTAH` yang sama: Tenant tetap melihat kelimanya tanpa diringkas — termasuk
 *    yang tidak menguntungkan dirinya, karena dialah yang harus menindaklanjutinya — tetapi
 *    dengan nama dan warna yang sama seperti yang dilihat pembelinya.
 *
 * Aturan tebal tiap baris mengambil nada status verifikasi, BUKAN status produksi: yang
 * menuntut tindakan Tenant adalah ketidaksesuaian bukti, sementara "sedang tumbuh" hanyalah
 * jalannya waktu.
 */

const PRODUKSI: Record<ProductionStatus, { label: string; nada: Nada; garis: boolean }> = {
  PLANNING: { label: "Perencanaan", nada: "netral", garis: true },
  GROWING: { label: "Tumbuh", nada: "kabar", garis: true },
  HARVESTED: { label: "Sudah panen", nada: "utama", garis: true },
  FAILED: { label: "Gagal panen", nada: "awas", garis: true },
};

export default function BatchListPage() {
  const [batch, setBatch] = useState<BatchResponse[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchTenant()
      .then((d) => {
        setBatch(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  const aksi = (
    <TombolTaut href="/tenant/batch/new" ukuran="sm">
      Buka kuota baru
    </TombolTaut>
  );

  if (memuat) {
    return (
      <Halaman judul="Batch">
        <Memuat baris={4} label="Memuat batch" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Batch" aksi={aksi}>
        <Galat judul="Batch gagal dimuat">
          {galat} Batch Anda tetap tersimpan di server — muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      judul="Batch"
      pengantar="Satu batch adalah satu siklus tanam di satu petak lahan. Pembeli memesan batch, bukan produk — jadi harga dan jumlahnya terkunci sejak kuotanya dibuka."
      aksi={aksi}
    >
      {batch.length === 0 ? (
        <Kosong
          judul="Belum ada batch"
          aksi={
            <TombolTaut href="/tenant/batch/new" ukuran="sm">
              Buka kuota pertama
            </TombolTaut>
          }
        >
          Kuota Pre-Order adalah cara produk Anda tampil di katalog pembeli. Membukanya lebih
          awal berarti permintaan sudah pasti sebelum modal tanam dikeluarkan — itu seluruh
          gunanya bagi sisi Anda.
        </Kosong>
      ) : (
        <div className="space-y-8">
          {batch.map((b) => (
            <BarisBatch key={b.id} b={b} />
          ))}
        </div>
      )}
    </Halaman>
  );
}

function BarisBatch({ b }: { b: BatchResponse }) {
  const produksi = PRODUKSI[b.productionStatus];
  const verifikasi = STATUS_MENTAH[b.verificationStatus];
  const persen = b.quotaBoxTotal ? Math.round((b.quotaBoxSold / b.quotaBoxTotal) * 100) : 0;

  return (
    <Panel
      nada={verifikasi.nada}
      label={`Grade ${b.grade ?? "—"} · panen ${tanggalPanjang(b.claimedHarvestDate)}`}
      judul={
        <Link
          href={`/tenant/batch/${b.id}`}
          className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          {b.productName ?? "Batch"}
        </Link>
      }
      aksi={
        <>
          <Pil nada={produksi.nada} garis={produksi.garis}>
            {produksi.label}
          </Pil>
          <PilStatusMentah status={b.verificationStatus} />
        </>
      }
    >
      <Deret kolom={4} as="dl">
        <Ubin
          label="Kuota terjual"
          nilai={angka(b.quotaBoxSold)}
          satuan={`/${angka(b.quotaBoxTotal)}`}
          catatan={`${persen}% dari kuota`}
        />
        <Ubin label="Harga terkunci" nilai={rupiah(b.lockedPrice)} catatan="per box" />
        <Ubin
          label="Isi per box"
          nilai={b.qtyKgPerBox ? `${b.qtyKgPerBox}` : "—"}
          satuan={b.qtyKgPerBox ? "kg" : undefined}
        />
        <Ubin
          label="Lahan"
          nilai={b.landPlotAreaHa ? desimal(b.landPlotAreaHa, 2) : "—"}
          satuan={b.landPlotAreaHa ? "ha" : undefined}
          /* Lahan bertingkat TERBATAS berarti poligonnya belum bisa diverifikasi penuh —
             dinyatakan apa adanya, tanpa menyiratkan ada yang disembunyikan Tenant. */
          catatan={b.landPlotTier === "TERBATAS" ? "Verifikasi terbatas" : undefined}
        />
      </Deret>

      {/* Kalimat penjelas status TIDAK diulang di sini. Di halaman rincian ia menjelaskan
          satu batch; di daftar dua belas batch, kalimat yang sama tercetak berkali-kali dan
          berhenti dibaca — pil-nya sudah menamai keadaannya, dan penjelasannya menunggu di
          halaman yang memang dibuka untuk satu batch. */}
    </Panel>
  );
}

