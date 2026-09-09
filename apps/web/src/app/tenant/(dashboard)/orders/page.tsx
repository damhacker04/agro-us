"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GalatApi, ambilPesananTenant } from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import type { TenantOrderSummary } from "@agro-os/shared";
import { PilTahap, nadaTahap } from "@/components/tahap-pengiriman";
import {
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Sunyi,
  TombolTaut,
} from "@/ui";

/**
 * TN-21 — Pesanan masuk.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: tahap pengiriman berhenti punya kosakatanya
 * sendiri. Halaman ini menyebut `PANEN` sebagai "Siap Kirim" sementara halaman rincian yang
 * dibuka DARI SINI menyebutnya "Panen" — dua nama untuk satu keadaan pada dua layar
 * berurutan. Keduanya kini membaca `TAHAP` bersama, dengan nada peran `tenant`: yang
 * menyala bagi Tenant adalah `PANEN`, saat QR dan Kode Antar menunggu diterbitkan, bukan
 * `TIBA_DI_LOKASI` yang merupakan giliran pembeli.
 */
export default function TenantOrdersPage() {
  const [pesanan, setPesanan] = useState<TenantOrderSummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesananTenant()
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Pesanan masuk">
        <Memuat baris={3} label="Memuat pesanan" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Pesanan masuk">
        <Galat judul="Pesanan gagal dimuat">
          {galat} Pesanan yang masuk tetap tercatat di server — muat ulang halaman untuk
          mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  if (!pesanan.length) {
    return (
      <Halaman judul="Pesanan masuk">
        <Kosong
          judul="Belum ada pesanan masuk"
          aksi={
            <TombolTaut href="/tenant/batch" ukuran="sm">
              Lihat batch Anda
            </TombolTaut>
          }
        >
          Pesanan muncul di sini setelah pembeli membayar kuota yang Anda buka. Kosong berarti
          kuotanya belum terjual — bukan bahwa ada yang salah dengan batch Anda.
        </Kosong>
      </Halaman>
    );
  }

  return (
    <Halaman
      judul="Pesanan masuk"
      pengantar="Satu baris adalah satu pengiriman, dan nilainya adalah bagian Anda saja — satu pengiriman bisa memuat item beberapa Tenant sekaligus."
    >
      <div className="space-y-8">
        {pesanan.map((o) => (
          <Panel
            key={o.shipmentId}
            nada={nadaTahap(o.status, "tenant")}
            label={`${o.zoneName} · siap ${tanggalPanjang(o.readyDate)}`}
            judul={
              <Link
                href={`/tenant/orders/${o.shipmentId}`}
                className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
              >
                {o.buyerName}
              </Link>
            }
            aksi={
              <>
                <PilTahap status={o.status} peran="tenant" />
                {/* QR baru bisa diterbitkan setelah batch berstatus Panen — penanda ini
                    mencegah Tenant menekan tombolnya lalu kena penolakan tanpa tahu sebabnya. */}
                {o.qrIssued ? <Pil nada="utama" garis>QR terbit</Pil> : null}
              </>
            }
          >
            <Sunyi className="-mt-3 text-[12px]">Dipesan {tanggalPanjang(o.createdAt)}</Sunyi>

            <ul className="mt-5">
              {o.lines.map((l) => (
                <li
                  key={l.batchId}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-kertas-garis py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-[15px] text-tinta">
                    {l.productName}
                  </span>
                  <span className="font-mono text-[13px] text-tinta-samar">
                    {angka(l.qtyBox)} box
                  </span>
                  <span className="font-mono text-[15px] text-tinta">{rupiah(l.subtotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-tinta pt-3">
              <Label>Nilai bagian Anda</Label>
              <span className="font-mono text-[22px] leading-none text-tinta">
                {rupiah(o.subtotal)}
              </span>
            </div>
          </Panel>
        ))}
      </div>
    </Halaman>
  );
}
