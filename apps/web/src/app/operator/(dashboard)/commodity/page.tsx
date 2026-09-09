"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { CommoditySummary } from "@agro-os/shared";
import { GalatApi, ambilKomoditasOperator } from "@/lib/api";
import { angka, desimal } from "@/lib/format-id";
import { KATEGORI, bacaKomoditas, type Komoditas } from "@/components/komoditas";
import {
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  TombolTaut,
} from "@/ui";

/**
 * OP-10 — Daftar komoditas dan angka kalibrasinya.
 *
 * Tiga angka di tiap baris punya konsekuensi berbeda dan semuanya berat: rendemen membatasi
 * kuota PO seluruh Tenant, toleransi susut menentukan klaim mutu mana yang sah, dan umur
 * tanam minimal menjadi pagar kewajaran tanggal panen.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: `avgYieldKgPerHa.toLocaleString("id-ID")`
 * berhenti dipakai. Nilainya Decimal Prisma yang diserialkan sebagai STRING, jadi yang
 * terpanggil adalah `String.prototype.toLocaleString` — mengembalikan stringnya apa adanya
 * dan mengabaikan locale-nya. Rendemen lima digit tampil "15000" tanpa pemisah ribuan, dan
 * karena kontraknya mengaku `number`, tidak ada yang bisa menangkapnya. Pembacaannya kini
 * lewat `bacaKomoditas`, alasannya di `@/components/komoditas`.
 */
export default function OperatorCommodityPage() {
  const [komoditas, setKomoditas] = useState<Komoditas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilKomoditasOperator()
      .then((d: CommoditySummary[]) => {
        setKomoditas(d.map(bacaKomoditas));
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Komoditas gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <Halaman
      judul="Manajemen komoditas"
      pengantar="Angka di sini berlaku untuk seluruh Tenant sekaligus: rendemen membatasi kuota, toleransi susut menentukan klaim yang sah, umur tanam menjadi pagar tanggal panen."
      aksi={
        <TombolTaut href="/operator/commodity/baru" ukuran="sm">
          Tambah komoditas
        </TombolTaut>
      }
    >
      {galat ? (
        <Galat judul="Komoditas gagal dimuat">
          {galat} Angka kalibrasi tetap tersimpan di server dan tetap berlaku — muat ulang
          halaman untuk mencoba lagi.
        </Galat>
      ) : memuat ? (
        <Memuat baris={4} label="Memuat komoditas" />
      ) : komoditas.length === 0 ? (
        <Kosong judul="Belum ada komoditas">
          Tenant tidak bisa membuat batch sebelum komoditasnya terdaftar di sini, karena
          rendemen dan toleransi susutnya diambil dari daftar ini.
        </Kosong>
      ) : (
        <Panel label={`${angka(komoditas.length)} komoditas`} judul="Angka yang berlaku sekarang">
          {/* Tabel, bukan kartu: yang dicari operator di layar ini adalah PERBANDINGAN antar
              baris — toleransi mana yang menyimpang, rendemen mana yang kelewat tinggi. */}
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[38rem] border-collapse text-[14px]">
              <thead>
                <tr className="border-b-2 border-tinta">
                  <th className="py-2 pr-4 text-left">
                    <Label as="span">Komoditas</Label>
                  </th>
                  <th className="py-2 pr-4 text-right">
                    <Label as="span">Rendemen kg/ha</Label>
                  </th>
                  <th className="py-2 pr-4 text-right">
                    <Label as="span">Toleransi susut</Label>
                  </th>
                  <th className="py-2 text-right">
                    <Label as="span">Umur tanam</Label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {komoditas.map((k) => (
                  <tr key={k.id} className="border-b border-kertas-garis">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/operator/commodity/${k.id}`}
                        className="font-semibold text-tinta underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                      >
                        {k.name}
                      </Link>
                      <span className="mt-0.5 block text-[12px] text-tinta-lembut">
                        {KATEGORI[k.category]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">{angka(k.avgYieldKgPerHa)}</td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {desimal(k.shrinkTolerancePct, 0)}%
                    </td>
                    {/* Medan ini bisa tidak terkirim, dan "—" jujur; menampilkan 0 hari akan
                        terbaca sebagai "panen kapan saja boleh". */}
                    <td className="py-3 text-right font-mono">
                      {k.growingDaysMin === null ? "—" : `${angka(k.growingDaysMin)} hari`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
            Mengubah salah satu angka ini berlaku surut bagi Tenant yang sudah menanam
            komoditasnya — batch yang berjalan ikut dinilai dengan angka yang baru.
          </Sunyi>
        </Panel>
      )}

      {!memuat && !galat && komoditas.length > 0 ? (
        <Panel label="Batas yang diakui" judul="Angka ini masih estimasi" className="mt-8">
          <Prosa className="text-[14px]">
            Rendemen dan toleransi susut di atas belum divalidasi lapangan, dan basis data
            menyatakan dirinya demikian. Keduanya aset kalibrasi yang hanya matang lewat
            pengamatan berulang — bukan konstanta yang sudah selesai.
          </Prosa>
        </Panel>
      ) : null}
    </Halaman>
  );
}
