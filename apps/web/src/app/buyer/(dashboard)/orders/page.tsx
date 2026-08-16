"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GalatApi, ambilPesanan, ambilSenioritas } from "@/lib/api";
import { rupiah, tanggalPendek } from "@/lib/format-id";
import type { BuyerSeniority, OrderSummary, ShipmentStatus } from "@agro-os/shared";
import {
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  type Nada,
} from "@/ui";

/**
 * BY-11 — Daftar pesanan pembeli.
 *
 * Enam tahap pengiriman (§5.6.1). Nadanya menyatakan APAKAH PEMBELI PERLU BERTINDAK, bukan
 * seberapa jauh prosesnya berjalan: hanya `TIBA_DI_LOKASI` yang menuntut sesuatu dari
 * pembeli, jadi hanya ia yang memakai pil terisi. Sisanya bergaris. Kalau setiap tahap
 * berkedip, tahap yang benar-benar menunggu tidak lagi menonjol.
 */
const TAHAP: Record<ShipmentStatus, { label: string; nada: Nada; garis: boolean }> = {
  MENUNGGU_PANEN: { label: "Menunggu panen", nada: "netral", garis: true },
  PANEN: { label: "Panen", nada: "utama", garis: true },
  DIKIRIM: { label: "Dikirim", nada: "kabar", garis: true },
  TIBA_DI_LOKASI: { label: "Perlu konfirmasi", nada: "awas", garis: false },
  DITERIMA: { label: "Diterima", nada: "utama", garis: true },
  SELESAI: { label: "Selesai", nada: "utama", garis: false },
  DIBATALKAN: { label: "Dibatalkan", nada: "awas", garis: true },
};

export default function OrdersPage() {
  const [pesanan, setPesanan] = useState<OrderSummary[]>([]);
  const [senioritas, setSenioritas] = useState<BuyerSeniority[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesanan()
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat pesanan"))
      .finally(() => setMemuat(false));

    // Senioritas bukan bagian dari pesanan mana pun, jadi diambil terpisah — dan
    // kegagalannya tidak boleh menggagalkan daftar pesanan.
    ambilSenioritas()
      .then(setSenioritas)
      .catch(() => setSenioritas([]));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Pesanan saya">
        <Memuat baris={3} label="Memuat pesanan" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Pesanan saya">
        <Galat judul="Pesanan gagal dimuat">
          {galat} Pesanan Anda tetap tercatat di server — muat ulang halaman untuk mencoba
          lagi.
        </Galat>
      </Halaman>
    );
  }

  if (!pesanan.length) {
    return (
      <Halaman judul="Pesanan saya">
        <Kosong
          judul="Belum ada pesanan"
          aksi={
            <Link
              href="/buyer/region"
              className="text-[15px] font-semibold text-ungu underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              Mulai belanja
            </Link>
          }
        >
          Pesanan yang sudah dibayar muncul di sini beserta tiap pengirimannya, sampai jendela
          klaim mutunya tertutup.
        </Kosong>
      </Halaman>
    );
  }

  return (
    <Halaman judul="Pesanan saya">
      {/* BY-11d — separuh nilai FR-7.13 ada di panel ini.
          Senioritas yang tidak diberitahukan tidak menghasilkan retensi: pembeli tetap
          merasa dirugikan dan tetap pergi, sementara platform sudah membayar biayanya
          dengan mengurangi prioritas orang lain. Kompensasinya harus terlihat. */}
      {senioritas.length > 0 ? (
        <Panel
          nada="utama"
          label="Kompensasi berlaku"
          judul="Pesanan Anda didahulukan pada panen berikutnya"
          className="mb-10"
        >
          <Prosa className="text-[14px]">
            Karena panen sebelumnya tidak mencukupi, pesanan Anda didahulukan pada panen
            berikutnya dari{" "}
            <span className="font-semibold text-tinta">
              {senioritas.map((s) => s.tenantName).join(", ")}
            </span>{" "}
            — mendahului urutan waktu pembayaran. Berlaku satu siklus.
          </Prosa>
        </Panel>
      ) : null}

      <div className="space-y-8">
        {pesanan.map((o) => (
          <Panel
            key={o.id}
            label={
              <Link
                href={`/buyer/orders/${o.id}`}
                className="font-mono underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
              >
                {o.id.slice(0, 8).toUpperCase()}
              </Link>
            }
            judul={rupiah(o.totalAmount)}
            aksi={
              o.payment ? (
                <Pil nada={o.payment.status === "PAID" ? "utama" : "awas"} garis>
                  {o.payment.status === "PAID" ? "Lunas" : "Menunggu bayar"} · {o.payment.method}
                </Pil>
              ) : null
            }
          >
            <Sunyi className="-mt-3 text-[12px]">Dipesan {tanggalPendek(o.createdAt)}</Sunyi>

            {/* Satu pesanan bisa jadi beberapa pengiriman — dikelompokkan per minggu panen
                (FR-2.4), jadi tiap pengiriman punya status dan tanggal siapnya sendiri. */}
            <Label className="mt-6">
              {o.shipments.length} pengiriman
            </Label>
            <ul className="mt-2">
              {o.shipments.map((s, i) => {
                const t = TAHAP[s.status];
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-kertas-garis py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-tinta">
                        {s.productNames.length
                          ? s.productNames.join(", ")
                          : `${s.itemCount} komoditas`}
                      </span>
                      <Sunyi className="mt-0.5 text-[12px]">
                        Pengiriman {i + 1} · siap {tanggalPendek(s.readyDate)}
                      </Sunyi>
                    </div>
                    <Pil nada={t.nada} garis={t.garis}>
                      {t.label}
                    </Pil>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </Halaman>
  );
}
