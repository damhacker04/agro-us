"use client";

import React, { useEffect, useState } from "react";
import { ambilBatchSatu, ambilTimelineTenant, ambilVerifikasi, GalatApi } from "@/lib/api";
import { angka, jamWib, rupiah, tanggalPanjang, tanggalPendek } from "@/lib/format-id";
import type { BatchResponse, TimelineNodeResponse, TimelineVerifyResponse } from "@agro-os/shared";
import { KEGIATAN } from "@/components/kegiatan";
import { FotoBukti } from "@/components/foto-bukti";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Tanda,
  TautanKembali,
  TombolTaut,
} from "@/ui";

/**
 * TN-17 — Rincian batch dan Verified Timeline miliknya sendiri.
 *
 * Layar ini dibaca Tenant, bukan pembeli, dan itu menentukan nadanya. Isinya persis sama
 * dengan yang dilihat pembeli — memang begitu maksudnya, Tenant berhak tahu apa yang
 * terlihat dari seberang — tetapi kalimatnya berbicara kepada pemilik catatan, bukan
 * kepada orang yang sedang menimbang apakah akan mempercayainya.
 *
 * Penanda "Dari galeri" ikut ditampilkan di sini, bukan hanya di layar pembeli. Sejak
 * halaman pencatatan berhenti memaku `captureSource`, penanda itu jadi punya arti — dan
 * menyembunyikannya dari Tenant berarti membiarkan mereka terkejut oleh sesuatu yang
 * dilihat pembelinya sendiri.
 */
export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [nodes, setNodes] = useState<TimelineNodeResponse[]>([]);
  const [verify, setVerify] = useState<TimelineVerifyResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchSatu(id)
      .then(setBatch)
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch tidak ditemukan"))
      .finally(() => setMemuat(false));
    ambilTimelineTenant(id)
      .then(setNodes)
      .catch(() => setNodes([]));
    ambilVerifikasi(id)
      .then(setVerify)
      .catch(() => setVerify(null));
  }, [id]);

  const kembali = <TautanKembali href="/tenant/batch">Daftar batch</TautanKembali>;

  if (memuat) {
    return (
      <Halaman judul="Rincian batch" kembali={kembali}>
        <Memuat baris={4} label="Memuat batch" />
      </Halaman>
    );
  }

  if (galat || !batch) {
    return (
      <Halaman judul="Rincian batch" kembali={kembali}>
        <Galat judul="Batch tidak dapat dimuat">
          {galat || "Batch tidak ditemukan."} Catatan batch Anda tetap tersimpan di server —
          muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const tertutup = batch.productionStatus === "HARVESTED" || batch.productionStatus === "FAILED";

  return (
    <Halaman
      kembali={kembali}
      judul={batch.productName ?? "Batch"}
      pengantar="Yang tercatat di sini adalah yang dilihat pembeli. Catatan tidak bisa diubah maupun dihapus — koreksi dilakukan dengan menambah catatan Ralat, dan keduanya tetap terlihat."
      aksi={
        <>
          {/* TN-35 — tautan riwayat penilaian kewajaran. Sengaja selalu ada, termasuk
              setelah batch tertutup: justru saat itulah Tenant ingin tahu dasar
              perhitungannya. */}
          <TombolTaut href={`/tenant/batch/${id}/kewajaran`} rupa="kedua" ukuran="sm">
            Penilaian hasil
          </TombolTaut>
          {!tertutup ? (
            <TombolTaut href={`/tenant/batch/${id}/progress/new`} ukuran="sm">
              Catat kegiatan
            </TombolTaut>
          ) : null}
        </>
      }
    >
      <Panel label="Batch" judul="Kuota yang Anda buka" className="mb-10">
        <Deret kolom={4} as="dl">
          <BarisData label="Panen diklaim">{tanggalPanjang(batch.claimedHarvestDate)}</BarisData>
          <BarisData label="Kuota terjual">
            {angka(batch.quotaBoxSold)}/{angka(batch.quotaBoxTotal)} box
          </BarisData>
          <BarisData label="Harga terkunci">{rupiah(batch.lockedPrice)}</BarisData>
          <BarisData label="Tanam diklaim">
            {batch.claimedPlantDate ? tanggalPanjang(batch.claimedPlantDate) : "Belum dicatat"}
          </BarisData>
        </Deret>

        {tertutup ? (
          <div className="mt-7 border-t-2 border-tinta pt-3">
            <Label>
              Batch {batch.productionStatus === "HARVESTED" ? "sudah dipanen" : "dinyatakan gagal"}
            </Label>
            <Prosa className="mt-1.5 text-[14px]">
              Timeline batch ini ditutup dan tidak menerima catatan baru. Riwayatnya tetap
              terbuka untuk diperiksa siapa pun, dan penilaian hasilnya tetap bisa Anda buka.
            </Prosa>
          </div>
        ) : null}
      </Panel>

      <Panel
        nada={verify && !verify.intact ? "awas" : "netral"}
        label="Verified Timeline"
        judul="Catatan lapangan Anda, berantai hash"
        aksi={
          verify && nodes.length > 0 ? (
            <Pil nada={verify.intact ? "utama" : "awas"} garis={verify.intact}>
              <Tanda jenis={verify.intact ? "penuh" : "tidak"} />
              {verify.intact ? `Rantai utuh · ${angka(verify.nodeCount)} catatan` : "Rantai tidak utuh"}
            </Pil>
          ) : null
        }
      >
        {nodes.length === 0 ? (
          <Kosong
            judul="Belum ada catatan"
            aksi={
              !tertutup ? (
                <TombolTaut href={`/tenant/batch/${id}/progress/new`} ukuran="sm">
                  Catat kegiatan pertama
                </TombolTaut>
              ) : null
            }
          >
            Rantai bukti batch ini mulai terbentuk sejak catatan pertama — biasanya penyiapan
            lahan atau penanaman. Sampai itu ada, pembeli hanya melihat kuota tanpa riwayat.
          </Kosong>
        ) : (
          <>
            <Prosa className="text-[14px]">
              {verify && !verify.intact
                ? "Hitung ulang rantai SHA-256 dari isi catatan tidak cocok dengan hash tersimpan. Hubungi tim kami — temuan ini tampil juga di layar pembeli, jadi sebaiknya ditelusuri sekarang."
                : "Tiap catatan mengunci catatan sebelumnya lewat hash isinya, jadi urutan dan isinya tidak bisa diubah belakangan tanpa ketahuan. Inilah yang membuat pembeli bersedia membayar di muka."}
            </Prosa>
            <ol className="mt-7">
              {nodes.map((n) => (
                <BarisNode key={n.id} n={n} />
              ))}
            </ol>
          </>
        )}
      </Panel>
    </Halaman>
  );
}

/** Satu catatan sebagai baris sertifikat bernomor — urutannya bagian dari buktinya. */
function BarisNode({ n }: { n: TimelineNodeResponse }) {
  const ralat = n.ralatOfId !== null;
  return (
    <li className="grid gap-x-6 gap-y-3 border-t border-kertas-garis py-6 md:grid-cols-[3.5rem_minmax(0,1fr)]">
      <div className="font-mono text-[13px] leading-none text-tinta-samar">
        {String(n.seq).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
          <h3 className="text-[15px] font-bold text-tinta">
            {KEGIATAN[n.activityType]}
            {ralat ? (
              <Pil nada="awas" className="ml-2.5 align-[0.15em]">
                Ralat
              </Pil>
            ) : null}
          </h3>
          <span className="font-mono text-[12px] text-tinta-samar">
            {tanggalPendek(n.deviceTs)} · {jamWib(n.deviceTs)} WIB
          </span>
        </div>

        <p className="mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-tinta-lembut">
          {n.description}
        </p>

        {n.outsidePolygonReason ? (
          <div className="mt-3 border-t-2 border-jambu pt-2">
            <Label className="text-jambu">Titik di luar batas lahan</Label>
            <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-tinta-lembut">
              Alasan yang Anda tulis ikut tampil ke pembeli: {n.outsidePolygonReason}
            </p>
          </div>
        ) : null}

        {n.photos.length ? (
          <ul className="mt-4 flex flex-wrap gap-3">
            {n.photos.map((f) => (
              <li key={f.sha256}>
                <FotoBukti foto={f} alt={`Foto bukti ${KEGIATAN[n.activityType].toLowerCase()}`} />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-tinta-samar">
          <span>
            {n.gps.lat.toFixed(5)}, {n.gps.lng.toFixed(5)}
          </span>
          <span className="break-all">hash {n.nodeHash.slice(0, 32)}</span>
        </div>
      </div>
    </li>
  );
}
