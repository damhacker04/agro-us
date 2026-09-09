"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { BatchResponse, ProductionStatus, TenantOrderSummary } from "@agro-os/shared";
import { GalatApi, ambilBatchTenant, ambilEscrow, ambilPesananTenant } from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
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
 * TN-12 — Beranda Tenant.
 *
 * MIGRASI DUNIA, dan yang dibongkar adalah TIGA PERANGKAT YANG TIDAK DIMILIKI DUNIA INI:
 *
 * 1. Kartu hero berlatar hijau tua dengan piringan putih ber-`blur-2xl` di sudutnya —
 *    kaca dan cahaya sebagai hiasan, di dunia yang kedalamannya hanya dari warna ground,
 *    garis tinta, dan serat kertas.
 * 2. Bilah proporsi status batch (`rounded-full`, empat warna di luar palet). Yang
 *    dibacanya pun tidak berarti: "60% batch Anda GROWING" bukan angka yang menuntun
 *    keputusan apa pun. Yang berarti adalah cacahnya.
 * 3. Kartu PO aktif berwarna indigo — warna yang tidak ada di palet mana pun.
 *
 * Yang menggantikan ketiganya bukan versi yang lebih tenang dari benda yang sama, melainkan
 * URUTAN: apa yang menunggu tindakan Anda hari ini, lalu apa yang sedang berjalan, lalu
 * posisi uangnya. Beranda peran Operate adalah antrean kerja, bukan pameran angka.
 */

const PRODUKSI: Record<ProductionStatus, string> = {
  PLANNING: "Perencanaan",
  GROWING: "Tumbuh",
  HARVESTED: "Sudah panen",
  FAILED: "Gagal panen",
};

type Escrow = Awaited<ReturnType<typeof ambilEscrow>>;

export default function TenantDashboardPage() {
  const [batch, setBatch] = useState<BatchResponse[]>([]);
  const [pesanan, setPesanan] = useState<TenantOrderSummary[]>([]);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilBatchTenant(), ambilPesananTenant(), ambilEscrow()])
      .then(([b, o, e]) => {
        setBatch(b);
        setPesanan(o);
        setEscrow(e);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Beranda gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Beranda">
        <Memuat baris={4} label="Memuat ringkasan" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Beranda">
        <Galat judul="Beranda gagal dimuat">
          {galat} Data batch dan pesanan Anda tetap utuh di server — muat ulang halaman untuk
          mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const aktif = batch.filter(
    (b) => b.productionStatus === "GROWING" || b.productionStatus === "PLANNING",
  );

  // Tindakan yang benar-benar milik Tenant: batch yang tanggal panennya sudah tiba
  // atau lewat tapi belum ditutup dengan catatan PANEN/GAGAL_PANEN. Keputusan
  // substitusi/refund BUKAN milik Tenant — itu hak pembeli setelah shortfall tercatat.
  const hariIni = new Date().setHours(23, 59, 59, 999);
  const perluDipanen = aktif.filter((b) => new Date(b.claimedHarvestDate).getTime() <= hariIni);

  const poAktif = aktif.filter((b) => b.quotaBoxSold > 0);
  const menungguPanen = pesanan.filter((o) => o.status === "MENUNGGU_PANEN");
  const perluQr = pesanan.filter((o) => o.status === "PANEN" && !o.qrIssued);

  return (
    <Halaman
      judul="Beranda"
      pengantar="Yang menunggu tindakan Anda lebih dulu, lalu yang sedang berjalan, lalu posisi uangnya."
    >
      {/* ---------- Yang menunggu tindakan ---------- */}
      {perluDipanen.length > 0 || perluQr.length > 0 ? (
        <div className="space-y-8">
          {perluDipanen.length > 0 ? (
            <Panel
              nada="awas"
              label="Menunggu Anda"
              judul={`${angka(perluDipanen.length)} batch belum dicatat panennya`}
            >
              <Prosa className="text-[14px]">
                Tanggal panen yang Anda janjikan sudah tiba. Selama panen belum dicatat, pesanan
                pembeli tidak bisa maju ke tahap pengiriman — dan mereka tidak punya cara lain
                untuk tahu apa yang terjadi di lahan.
              </Prosa>
              <ul className="mt-6">
                {perluDipanen.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-kertas-garis py-3"
                  >
                    <Link
                      href={`/tenant/batch/${b.id}/progress/new`}
                      className="min-w-0 flex-1 truncate text-[15px] font-semibold text-tinta underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                    >
                      {b.productName ?? "Batch"}
                    </Link>
                    <span className="font-mono text-[13px] text-tinta-samar">
                      panen {tanggalPanjang(b.claimedHarvestDate)} · {angka(b.quotaBoxSold)} box
                      terjual
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {perluQr.length > 0 ? (
            <Panel
              nada="awas"
              label="Menunggu Anda"
              judul={`${angka(perluQr.length)} pengiriman belum diterbitkan QR-nya`}
            >
              <Prosa className="text-[14px]">
                Panennya sudah tercatat, jadi box-nya sudah bisa ditempeli QR dan diserahkan ke
                kurir. Kode Antar terbit bersamaan, dan hanya ditampilkan sekali.
              </Prosa>
              <ul className="mt-6">
                {perluQr.map((o) => (
                  <li
                    key={o.shipmentId}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-kertas-garis py-3"
                  >
                    <Link
                      href={`/tenant/orders/${o.shipmentId}`}
                      className="min-w-0 flex-1 truncate text-[15px] font-semibold text-tinta underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                    >
                      {o.buyerName}
                    </Link>
                    <span className="font-mono text-[13px] text-tinta-samar">
                      siap {tanggalPanjang(o.readyDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : (
        <Panel label="Menunggu Anda" judul="Tidak ada yang menunggu tindakan">
          <Prosa className="text-[14px]">
            Tidak ada batch yang lewat tanggal panennya dan tidak ada pengiriman yang menunggu
            QR. Antrean kerja yang kosong di sini berarti semuanya berjalan, bukan bahwa tidak
            ada yang terjadi.
          </Prosa>
        </Panel>
      )}

      {/* ---------- Yang sedang berjalan ---------- */}
      <div className="mt-12">
        <Label className="mb-4">Sedang berjalan</Label>
        <Deret kolom={4} as="dl">
          <Ubin label="Batch aktif" nilai={angka(aktif.length)} satuan="batch" />
          <Ubin
            label="Kuota terjual"
            nilai={angka(poAktif.length)}
            satuan="batch"
            catatan="Batch yang sudah ada pembelinya"
          />
          <Ubin
            label="Menunggu panen"
            nilai={angka(menungguPanen.length)}
            satuan="kiriman"
            nada={menungguPanen.length > 0 ? "kabar" : "netral"}
          />
          <Ubin label="Total batch" nilai={angka(batch.length)} catatan="Termasuk yang tertutup" />
        </Deret>
      </div>

      {batch.length === 0 ? (
        <Kosong
          judul="Belum ada batch"
          className="mt-8"
          aksi={
            <TombolTaut href="/tenant/batch/new" ukuran="sm">
              Buka kuota pertama
            </TombolTaut>
          }
        >
          Kuota Pre-Order adalah yang membuat produk Anda tampil di katalog pembeli, dan
          membukanya lebih awal berarti permintaan sudah pasti sebelum modal tanam keluar.
        </Kosong>
      ) : (
        <Panel label="Kuota berjalan" judul="Batch yang sudah ada pembelinya" className="mt-8">
          {poAktif.length === 0 ? (
            <Prosa className="text-[14px]">
              Belum ada kuota yang terjual. Batch tetap berjalan di lahan; yang belum terjadi
              hanyalah pesanan pertamanya.
            </Prosa>
          ) : (
            <ul>
              {poAktif.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-kertas-garis py-3"
                >
                  <Link
                    href={`/tenant/batch/${b.id}`}
                    className="min-w-0 flex-1 truncate text-[15px] text-tinta underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                  >
                    {b.productName ?? "Batch"}
                  </Link>
                  <Pil nada="netral" garis>
                    {PRODUKSI[b.productionStatus]}
                  </Pil>
                  <span className="font-mono text-[15px] text-tinta">
                    {rupiah(b.lockedPrice * b.quotaBoxSold)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ---------- Posisi uang ---------- */}
      <Panel
        nada="utama"
        label="Escrow"
        judul="Masih tertahan"
        className="mt-12"
        aksi={
          <TombolTaut href="/tenant/finance" rupa="kedua" ukuran="sm">
            Rincian keuangan
          </TombolTaut>
        }
      >
        <p className="font-mono text-[26px] leading-none text-tinta">
          {rupiah(escrow?.tertahan ?? 0)}
        </p>
        <Prosa className="mt-4 text-[14px]">
          Dana pembeli yang belum dilepas. Ia cair otomatis setelah barang diterima dan jendela
          klaim mutu tiap pengiriman berakhir — tidak ada yang perlu Anda ajukan.
        </Prosa>
        {escrow && escrow.menungguPenyaluran > 0 ? (
          <div className="mt-6 border-t-2 border-jambu pt-3">
            {/* Nilai TIDAK ditaruh di dalam `Label`: label di dunia ini selalu huruf besar
                ber-`tracking-cap`, dan itu mengubah "Rp2.640.000" jadi "RP2.640.000".
                Nama medannya label, angkanya monospace di bawahnya. */}
            <Label className="text-jambu">Menunggu penyaluran</Label>
            <p className="mt-1.5 font-mono text-[22px] leading-none text-jambu">
              {rupiah(escrow.menungguPenyaluran)}
            </p>
            <Sunyi className="mt-1.5 max-w-[68ch] text-[13px]">
              Sudah lepas dari escrow dan menjadi hak Anda, tetapi instruksi transfer ke
              rekening belum berhasil dikirim.
            </Sunyi>
          </div>
        ) : null}
      </Panel>
    </Halaman>
  );
}
