"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { GalatApi, pratinjauPesanan } from "@/lib/api";
import { rupiah, tanggalPendek } from "@/lib/format-id";
import { bacaKeranjang, hapusDariKeranjang, ubahJumlah, type BarisKeranjang } from "@/lib/keranjang";
import type { PreviewOrderResponse } from "@agro-os/shared";
import {
  Galat,
  Halaman,
  Ikon,
  Kosong,
  Label,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  Tombol,
} from "@/ui";

/**
 * BY-6 — Keranjang, dengan rencana pengiriman.
 *
 * Rencana pengiriman, ongkir, dan pemeriksaan minimum order SELALU dihitung server. Kalau
 * FE ikut menghitung, dua sumber kebenaran akan berselisih dan pembeli melihat angka yang
 * berbeda dengan yang ditagihkan.
 *
 * `toLocaleDateString("id-ID")` diganti `tanggalPendek`: ia bergantung pada data ICU
 * runtime, dan selisih satu karakter antara server dan peramban cukup untuk membuat React
 * membuang seluruh pohon dengan galat hidrasi.
 */
export default function CartPage() {
  const router = useRouter();
  const [isi, setIsi] = useState<BarisKeranjang[]>([]);
  const [pratinjau, setPratinjau] = useState<PreviewOrderResponse | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const hitung = useCallback(async (baris: BarisKeranjang[]) => {
    if (!baris.length) {
      setPratinjau(null);
      return;
    }
    setMemuat(true);
    setGalat(null);
    try {
      setPratinjau(
        await pratinjauPesanan({
          lines: baris.map((b) => ({ batchId: b.batchId, qtyBox: b.qtyBox })),
        }),
      );
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menghitung rencana pengiriman");
      setPratinjau(null);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    const muat = () => {
      const baris = bacaKeranjang();
      setIsi(baris);
      void hitung(baris);
    };
    muat();
    window.addEventListener("keranjang:ubah", muat);
    return () => window.removeEventListener("keranjang:ubah", muat);
  }, [hitung]);

  if (!isi.length) {
    return (
      <Halaman judul="Keranjang">
        <Kosong
          judul="Keranjang masih kosong"
          aksi={
            <Link
              href="/buyer/region"
              className="text-[15px] font-semibold text-ungu underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              Lihat katalog
            </Link>
          }
        >
          Pilih komoditas dari katalog untuk mulai memesan. Harga yang Anda tambahkan di sini
          adalah harga yang sudah dikunci sejak sebelum tanam — ia tidak berubah selama barang
          belum sampai.
        </Kosong>
      </Halaman>
    );
  }

  return (
    <Halaman
      judul="Keranjang"
      pengantar="Pesanan Anda dipecah menjadi beberapa pengiriman berdasarkan minggu panennya. Ongkir dan minimum pesanan berlaku per pengiriman, bukan per total."
    >
      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ---------- Baris keranjang ---------- */}
        <div>
          <Label className="mb-4">{isi.length} komoditas</Label>
          <ul>
            {isi.map((b) => (
              <li
                key={b.batchId}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-t border-kertas-garis py-5"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[16px] font-bold text-tinta">{b.productName}</h2>
                  <Sunyi className="mt-1 text-[12px]">
                    {b.tenantName} · panen {tanggalPendek(b.claimedHarvestDate)}
                  </Sunyi>
                  <p className="mt-2 font-mono text-[15px] text-tinta">
                    {rupiah(b.unitPriceLocked)}
                    <span className="ml-2 font-sertifikat text-[13px] text-tinta-samar">
                      / box · {b.qtyKgPerBox} kg
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center border border-kertas-garis">
                    <BtnJumlah
                      label={`Kurangi ${b.productName}`}
                      ikon={Minus}
                      onClick={() => ubahJumlah(b.batchId, b.qtyBox - 1)}
                    />
                    <span className="w-12 text-center font-mono text-[15px] text-tinta">
                      {b.qtyBox}
                    </span>
                    <BtnJumlah
                      label={`Tambah ${b.productName}`}
                      ikon={Plus}
                      onClick={() => ubahJumlah(b.batchId, b.qtyBox + 1)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => hapusDariKeranjang(b.batchId)}
                    aria-label={`Hapus ${b.productName} dari keranjang`}
                    className="flex h-9 w-9 items-center justify-center text-tinta-samar transition-colors duration-150 hover:text-jambu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                  >
                    <Ikon dari={Trash2} ukuran="md" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- Rencana pengiriman + total ---------- */}
        <div className="space-y-6">
          {galat ? (
            <Galat judul="Rencana pengiriman gagal dihitung">
              {galat} Isi keranjang Anda tidak hilang — ubah jumlahnya atau muat ulang halaman
              untuk menghitung ulang.
            </Galat>
          ) : null}

          {memuat ? <Memuat baris={2} label="Menghitung rencana pengiriman" /> : null}

          {pratinjau && !memuat ? (
            <>
              {/**
               * Rencana Pengiriman (FR-2.4). Item dikelompokkan per MINGGU PANEN, bukan per
               * penjual: barang yang panennya beda minggu tidak mungkin diangkut bersamaan,
               * jadi satu pesanan bisa jadi beberapa pengiriman dengan ongkir masing-masing.
               */}
              {pratinjau.plans.map((p, i) => (
                <Panel
                  key={p.harvestWeek}
                  padat
                  nada={p.meetsMinimum ? "netral" : "awas"}
                  label={`Pengiriman ${i + 1}`}
                  judul={`Siap ${tanggalPendek(p.readyDate)}`}
                >
                  <dl className="space-y-1.5 text-[14px]">
                    <BarisUang istilah="Subtotal barang" nilai={p.subtotal} />
                    <BarisUang istilah="Ongkir" nilai={p.shippingCost} />
                  </dl>

                  {!p.meetsMinimum ? (
                    <div className="mt-4 border-t border-jambu pt-3">
                      <Label className="text-jambu">
                        Kurang {rupiah(p.shortfallToMinimum)}
                      </Label>
                      <Sunyi className="mt-1.5 text-[13px]">
                        Minimum untuk pengiriman ini {rupiah(p.minOrderValue)}, dan dihitung{" "}
                        <span className="font-semibold text-tinta">per pengiriman</span> — bukan
                        per total pesanan — karena ongkirnya juga timbul per pengiriman.
                      </Sunyi>
                    </div>
                  ) : null}
                </Panel>
              ))}

              <Panel padat label="Ringkasan" judul="Total pesanan">
                <dl className="space-y-1.5 text-[14px]">
                  <BarisUang istilah="Total barang" nilai={pratinjau.itemsTotal} />
                  <BarisUang istilah="Total ongkir" nilai={pratinjau.shippingTotal} />
                </dl>
                <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-tinta pt-3">
                  <span className="text-[15px] font-bold text-tinta">Total</span>
                  <span className="font-mono text-[22px] text-tinta">
                    {rupiah(pratinjau.grandTotal)}
                  </span>
                </div>

                <Tombol
                  penuh
                  className="mt-5"
                  disabled={!pratinjau.canCheckout}
                  onClick={() => router.push("/buyer/checkout")}
                >
                  Lanjut ke pengiriman
                </Tombol>
                {!pratinjau.canCheckout ? (
                  <Prosa className="mt-3 text-[13px]">
                    Satu pengiriman atau lebih masih di bawah minimumnya. Tambah jumlah pada
                    komoditas yang panennya sama minggu, atau keluarkan pengiriman itu dari
                    pesanan ini.
                  </Prosa>
                ) : null}
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </Halaman>
  );
}

function BarisUang({ istilah, nilai }: { istilah: string; nilai: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-tinta-lembut">{istilah}</dt>
      <dd className="font-mono text-tinta">{rupiah(nilai)}</dd>
    </div>
  );
}

/**
 * Tombol jumlah. Ikonnya sendirian memikul makna, jadi ia WAJIB dinamai — dan namanya
 * menyebut komoditasnya, karena satu keranjang berisi banyak baris dan "Tambah" saja tidak
 * memberi tahu pembaca layar baris mana yang bertambah.
 */
function BtnJumlah({
  label,
  ikon,
  onClick,
}: {
  label: string;
  ikon: typeof Minus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center text-tinta transition-colors duration-150 hover:bg-kertas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ungu"
    >
      <Ikon dari={ikon} ukuran="sm" />
    </button>
  );
}
