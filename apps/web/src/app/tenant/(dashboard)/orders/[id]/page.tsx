"use client";

import React, { useEffect, useState } from "react";
import type { BoxQrItem, TenantOrderDetail } from "@agro-os/shared";
import {
  GalatApi,
  ambilLembarQr,
  ambilPesananTenantSatu,
  terbitkanQr,
  terbitkanUlangKodeAntar,
} from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import { PilTahap, TAHAP, nadaTahap } from "@/components/tahap-pengiriman";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
  TombolTaut,
} from "@/ui";

/**
 * TN-22 — Rincian pesanan masuk, penerbitan QR box, dan Kode Antar.
 *
 * MIGRASI DUNIA, dengan satu penguatan yang bukan soal rupa: KODE ANTAR yang hanya
 * ditampilkan sekali kini menguasai ground penuh `jambu`, bukan kotak amber pucat di antara
 * kotak lain. Hukum region-utuh berlaku apa adanya di sini karena ia memang satu region
 * kecil yang utuh — dan karena kode ini betul-betul tidak bisa dilihat lagi setelah halaman
 * ditutup. Blok yang terbaca seperti keterangan biasa akan dilewati orang yang sedang
 * buru-buru menyerahkan box ke kurir, dan biayanya adalah menerbitkan ulang kode sambil
 * kurirnya menunggu.
 */
export default function TenantOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: shipmentId } = React.use(params);

  const [pesanan, setPesanan] = useState<TenantOrderDetail | null>(null);
  const [boxes, setBoxes] = useState<BoxQrItem[]>([]);
  const [kodeAntar, setKodeAntar] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatQr, setGalatQr] = useState("");

  useEffect(() => {
    ambilPesananTenantSatu(shipmentId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
        // Lembar cetak ulang hanya ada bila QR pernah diterbitkan; kegagalan di sini
        // bukan kegagalan halaman.
        if (d.qrIssued) {
          ambilLembarQr(shipmentId)
            .then((s) => setBoxes(s.boxes))
            .catch(() => setBoxes([]));
        }
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [shipmentId]);

  async function cetakQr() {
    setProses(true);
    setGalatQr("");
    try {
      const r = await terbitkanQr(shipmentId);
      setBoxes(r.boxes);
      setKodeAntar(r.courierCode);
      setPesanan((p) => (p ? { ...p, qrIssued: true } : p));
    } catch (e) {
      setGalatQr(e instanceof GalatApi ? e.message : "QR gagal diterbitkan.");
    } finally {
      setProses(false);
    }
  }

  async function kodeBaru() {
    setProses(true);
    setGalatQr("");
    try {
      const r = await terbitkanUlangKodeAntar(shipmentId);
      setKodeAntar(r.courierCode);
    } catch (e) {
      setGalatQr(e instanceof GalatApi ? e.message : "Kode baru gagal diterbitkan.");
    } finally {
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/tenant/orders">Pesanan masuk</TautanKembali>;

  if (memuat) {
    return (
      <Halaman judul="Rincian pesanan" kembali={kembali}>
        <Memuat baris={4} label="Memuat pesanan" />
      </Halaman>
    );
  }

  if (galat || !pesanan) {
    return (
      <Halaman judul="Rincian pesanan" kembali={kembali}>
        <Galat judul="Pesanan tidak dapat dimuat">
          {galat || "Pesanan tidak ditemukan."} Pesanan yang masuk tetap tercatat di server —
          muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      kembali={kembali}
      judul={pesanan.buyerName}
      pengantar={`${pesanan.zoneName} · dipesan ${tanggalPanjang(pesanan.createdAt)} · siap ${tanggalPanjang(pesanan.readyDate)}`}
      aksi={
        <>
          <PilTahap status={pesanan.status} peran="tenant" />
          <TombolTaut href={`/tenant/orders/${shipmentId}/invoice`} rupa="kedua" ukuran="sm">
            Surat jalan
          </TombolTaut>
        </>
      }
    >
      {/* Identitas penerima — Tenant perlu tahu siapa yang berhak menerima di lokasi. */}
      <Panel label="Tujuan" judul="Siapa yang menerima barang" className="mb-8">
        <Deret kolom={4} as="dl">
          <BarisData label="Penerima" prosa>
            {pesanan.recipient.name}
          </BarisData>
          <BarisData label="Telepon">{pesanan.recipient.phone}</BarisData>
          <BarisData label="Jam terima">{pesanan.recipient.receivingHours}</BarisData>
          <BarisData label="Patokan" prosa>
            {pesanan.recipient.landmark || "—"}
          </BarisData>
        </Deret>
      </Panel>

      <Panel label="Item Anda" judul="Yang harus Anda siapkan" className="mb-8">
        <ul>
          {pesanan.lines.map((l) => {
            const kurang =
              l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox
                ? l.qtyBox - l.qtyBoxFulfilled
                : 0;
            return (
              <li
                key={l.orderItemId}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-t border-kertas-garis py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-[15px] font-bold text-tinta">{l.productName}</span>
                    <span className="text-[13px] text-tinta-samar">Grade {l.grade}</span>
                  </div>
                  <Sunyi className="mt-1 text-[13px]">
                    <span className="font-mono">
                      {angka(l.qtyBox)} box × {rupiah(l.unitPriceLocked)}
                    </span>
                  </Sunyi>
                  {/* Selisih janji vs realisasi adalah shortfall — angka yang menentukan
                      rasio publik Tenant, jadi ditampilkan apa adanya. */}
                  {kurang > 0 ? (
                    <div className="mt-2.5 border-t-2 border-jambu pt-2">
                      <Label className="text-jambu">
                        Terpenuhi {angka(l.qtyBoxFulfilled as number)} dari {angka(l.qtyBox)} box
                      </Label>
                      <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-tinta-lembut">
                        Pembeli yang kurang sudah ditawari substitusi, jadwal ulang, atau
                        pengembalian dana. Selisihnya tercatat pada siklus ini.
                      </p>
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[15px] text-tinta">
                  {rupiah(l.subtotal)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-tinta pt-3">
          <Label>Nilai bagian Anda</Label>
          <span className="font-mono text-[22px] leading-none text-tinta">
            {rupiah(pesanan.subtotal)}
          </span>
        </div>
        <Sunyi className="mt-2 max-w-[68ch] text-[13px]">
          Belum termasuk ongkir dan add-on laporan — keduanya milik pembeli terhadap AgroUs,
          bukan bagian Anda. Dananya cair otomatis setelah jendela klaim mutu berakhir.
        </Sunyi>
      </Panel>

      {/* ---------- QR & Kode Antar ---------- */}
      <Panel
        nada={nadaTahap(pesanan.status, "tenant")}
        label="Serah terima"
        judul="QR box & Kode Antar"
        aksi={
          pesanan.qrIssued ? (
            <Tombol rupa="sunyi" ukuran="sm" onClick={kodeBaru} disabled={proses}>
              Terbitkan kode antar baru
            </Tombol>
          ) : null
        }
      >
        <Prosa className="text-[14px]">
          Satu QR per box fisik, ditempel di boxnya. Kode Antar 4 digit diberikan kepada kurir
          secara lisan — kalau ia menempel di box, siapa pun yang memegang box bisa membuka
          pengantarannya.
        </Prosa>

        {/* Region kecil yang utuh: ground penuh, tipe kertas, sekunder dari hue-nya sendiri.
            Kode ini tidak bisa dilihat lagi setelah halaman ditutup. */}
        {kodeAntar ? (
          <div className="mt-6 bg-jambu p-6">
            <Label className="text-kabut-jambu">Kode Antar — ditampilkan sekali</Label>
            <p className="mt-2.5 font-mono text-[34px] leading-none tracking-[0.35em] text-kertas-terang">
              {kodeAntar}
            </p>
            <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-kabut-jambu">
              Catat sekarang, lalu sebutkan kepada kurir saat menyerahkan box. Kode ini tidak
              bisa dilihat lagi setelah halaman ditutup — bila hilang, terbitkan kode baru dan
              kode lama langsung berhenti berlaku.
            </p>
          </div>
        ) : null}

        {galatQr ? (
          <Galat judul="Penerbitan gagal" className="mt-6">
            {galatQr}
          </Galat>
        ) : null}

        {/* Tombolnya hanya ditawarkan pada tahap yang server memang menerimanya. QR baru bisa
            diterbitkan setelah batch berstatus Panen, dan tidak lagi berguna setelah barang
            berjalan — menawarkannya di luar jendela itu berarti menyodorkan kendali yang
            satu-satunya hasilnya penolakan. */}
        {!pesanan.qrIssued && pesanan.status === "MENUNGGU_PANEN" ? (
          <div className="mt-6 border-t-2 border-tinta pt-3">
            <Label>Belum bisa diterbitkan</Label>
            <Prosa className="mt-1.5 text-[14px]">
              QR dan Kode Antar terbit setelah Anda mencatat panen batch ini. Sampai itu
              terjadi, belum ada box fisik yang bisa ditempeli.
            </Prosa>
          </div>
        ) : !pesanan.qrIssued && pesanan.status !== "PANEN" ? (
          <div className="mt-6 border-t-2 border-tinta pt-3">
            <Label>Jendela penerbitan sudah lewat</Label>
            <Prosa className="mt-1.5 text-[14px]">
              Pengiriman ini sudah berstatus {TAHAP[pesanan.status].toLowerCase()}, jadi QR
              box tidak lagi berguna. Bila ada yang perlu ditelusuri soal serah terimanya,
              rincian pengirimannya ada di surat jalan.
            </Prosa>
          </div>
        ) : !pesanan.qrIssued ? (
          <Tombol
            penuh
            className="mt-6 py-4 text-[16px]"
            sibuk={proses}
            labelSibuk="Menerbitkan…"
            onClick={cetakQr}
          >
            Terbitkan QR & Kode Antar
          </Tombol>
        ) : boxes.length === 0 ? (
          <Memuat baris={1} label="Memuat lembar QR" className="mt-6" />
        ) : (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-tinta pt-3">
              <Label>{angka(boxes.length)} box</Label>
              <Tombol rupa="kedua" ukuran="sm" onClick={() => window.print()} className="print:hidden">
                Cetak lembar QR
              </Tombol>
            </div>
            <ul className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4">
              {boxes.map((b, i) => (
                <li key={b.tokenId} className="border border-kertas-garis bg-kertas-terang p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.qrDataUrl} alt={`QR box ${i + 1}`} className="w-full" />
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] text-tinta-samar">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {b.consumedAt ? <Pil nada="utama" garis>Terpindai</Pil> : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </Halaman>
  );
}
