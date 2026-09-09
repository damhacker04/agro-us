"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommodityCategory } from "@agro-os/shared";
import type { CommoditySummary, UpsertCommodityBody } from "@agro-os/shared";
import { GalatApi, ambilKomoditasOperator, buatKomoditas, ubahKomoditas } from "@/lib/api";
import { KATEGORI, bacaKomoditas } from "@/components/komoditas";
import {
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Prosa,
  Radio,
  Sunyi,
  TautanKembali,
  Tombol,
} from "@/ui";

/**
 * OP-10b — Tambah/ubah komoditas.
 *
 * Rute `/operator/commodity/baru` dipakai sebagai penanda buat-baru. Kata "baru" bukan UUID,
 * jadi tidak akan pernah bentrok dengan id komoditas sungguhan.
 *
 * MIGRASI DUNIA, dengan dua hal yang bukan soal rupa:
 *
 * 1. KATEGORI KETIGA MUNCUL. `CommodityCategory` punya tiga nilai — DAUN, BUAH_UMBI, KERING
 *    — dan formulir ini hanya menawarkan dua. Belum ada komoditas KERING di data demo, jadi
 *    kekurangannya diam: komoditas kering tidak akan pernah bisa dibuat, dan begitu ada satu,
 *    formulirnya terbuka tanpa kategori tersorot sehingga klik pertama operator diam-diam
 *    memindahkan kategorinya. Pilihannya kini dibangkitkan dari enumnya, bukan diketik.
 *
 * 2. ANGKA DIBACA LEWAT `bacaKomoditas`. Decimal Prisma tiba sebagai string; `Number()` yang
 *    ditaruh manual di satu tempat adalah `Number()` yang lupa ditaruh di tempat berikutnya.
 *
 * `gradeStandards` sengaja tidak ada di formulir ini. Server hanya menulisnya bila medannya
 * terkirim (`gradeStandards !== undefined`), jadi definisi grade A/B/C aman — dan itu
 * dinyatakan di layar, karena formulir berisi lima medan di atas data yang punya lebih
 * banyak medan terbaca seperti formulir yang akan menghapus sisanya.
 */
const KOSONG: UpsertCommodityBody = {
  name: "",
  category: "DAUN",
  shrinkTolerancePct: 5,
  avgYieldKgPerHa: 10000,
  growingDaysMin: 30,
};

export default function OperatorCommodityFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const baru = id === "baru";

  const [isi, setIsi] = useState<UpsertCommodityBody>(KOSONG);
  const [memuat, setMemuat] = useState(!baru);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [hilang, setHilang] = useState(false);

  useEffect(() => {
    if (baru) return;
    // Tidak ada GET /operator/commodities/:id — hanya daftarnya.
    ambilKomoditasOperator()
      .then((d: CommoditySummary[]) => {
        const k = d.map(bacaKomoditas).find((x) => x.id === id);
        if (!k) {
          setHilang(true);
          return setGalat("Komoditas ini tidak ada di daftar.");
        }
        setIsi({
          name: k.name,
          category: k.category,
          shrinkTolerancePct: k.shrinkTolerancePct,
          avgYieldKgPerHa: k.avgYieldKgPerHa,
          // `?? 30` hanya berlaku bila servernya benar-benar tidak mengirim medan ini.
          growingDaysMin: k.growingDaysMin ?? 30,
        });
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Komoditas gagal dimuat"))
      .finally(() => setMemuat(false));
  }, [id, baru]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      if (baru) await buatKomoditas(isi);
      else await ubahKomoditas(id, isi);
      // Kembali ke daftar: di sanalah keempat angkanya berdiri berdampingan, jadi daftarnya
      // sendiri yang memperlihatkan bahwa yang tersimpan memang yang dimaksud.
      router.push("/operator/commodity");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Komoditas gagal disimpan.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/operator/commodity">Daftar komoditas</TautanKembali>;
  const judul = baru ? "Tambah komoditas" : "Ubah komoditas";

  if (memuat) {
    return (
      <Halaman judul={judul} kembali={kembali}>
        <Memuat baris={3} label="Memuat komoditas" />
      </Halaman>
    );
  }

  if (hilang) {
    return (
      <Halaman judul={judul} kembali={kembali}>
        <Galat judul="Komoditas tidak ditemukan">
          {galat} Alamat ini mungkin salah ketik, atau komoditasnya dihapus setelah tautan
          dibuka.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul={judul}
      pengantar="Angka di halaman ini berlaku untuk seluruh Tenant yang menanam komoditas ini, termasuk batch yang sedang berjalan."
    >
      <form onSubmit={simpan}>
        <Panel label="Identitas" judul="Nama dan kategori">
          <Medan label="Nama komoditas" wajib>
            {(alat) => (
              <Masukan
                {...alat}
                required
                minLength={2}
                value={isi.name}
                onChange={(e) => setIsi({ ...isi, name: e.target.value })}
                placeholder="Sawi Hijau (Caisim)"
              />
            )}
          </Medan>

          <fieldset className="mt-6">
            <Label as="legend" className="mb-2.5">
              Kategori
            </Label>
            <div className="space-y-3">
              {/* Dibangkitkan dari enumnya, bukan diketik: daftar yang diketik tangan adalah
                  daftar yang tertinggal saat nilai keempat ditambahkan. */}
              {Object.values(CommodityCategory).map((c) => (
                <Radio
                  key={c}
                  nama="kategori"
                  nilai={c}
                  terpilih={isi.category === c}
                  onPilih={(v) => setIsi({ ...isi, category: v as typeof c })}
                  judul={KATEGORI[c]}
                />
              ))}
            </div>
          </fieldset>
        </Panel>

        <Panel nada="awas" label="Kalibrasi" judul="Tiga angka yang mengikat semua Tenant" className="mt-8">
          <Medan
            label="Rendemen rata-rata"
            petunjuk="Kilogram per hektare. Membatasi kuota Pre-Order seluruh Tenant — terlalu tinggi berarti mereka boleh menjual lebih banyak daripada yang bisa dipanen lahannya."
            wajib
          >
            {(alat) => (
              <Masukan
                {...alat}
                required
                type="number"
                inputMode="numeric"
                min={1}
                step="0.01"
                value={isi.avgYieldKgPerHa}
                onChange={(e) => setIsi({ ...isi, avgYieldKgPerHa: Number(e.target.value) })}
                className="font-mono"
              />
            )}
          </Medan>

          <Medan
            label="Toleransi susut"
            petunjuk="Persen. Susut alami yang tidak bisa diklaim pembeli — dipotong lebih dulu dari setiap selisih timbang sebelum klaim mutu dihitung."
            wajib
            className="mt-6"
          >
            {(alat) => (
              <Masukan
                {...alat}
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={isi.shrinkTolerancePct}
                onChange={(e) => setIsi({ ...isi, shrinkTolerancePct: Number(e.target.value) })}
                className="font-mono"
              />
            )}
          </Medan>

          <Medan
            label="Umur tanam minimal"
            petunjuk="Hari. Panen yang dilaporkan lebih cepat dari ini ditolak sistem, jadi angka yang kelewat besar menghalangi panen yang sah."
            wajib
            className="mt-6"
          >
            {(alat) => (
              <Masukan
                {...alat}
                required
                type="number"
                inputMode="numeric"
                min={1}
                value={isi.growingDaysMin}
                onChange={(e) => setIsi({ ...isi, growingDaysMin: Number(e.target.value) })}
                className="font-mono"
              />
            )}
          </Medan>

          {!baru ? (
            <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
              Perubahan berlaku surut: batch yang sedang berjalan ikut dinilai dengan angka
              baru ini, termasuk klaim mutu yang belum diputus.
            </Sunyi>
          ) : null}
        </Panel>

        {!baru ? (
          <Panel label="Yang tidak disentuh" judul="Standar grade tetap seperti semula" className="mt-8">
            <Prosa className="text-[14px]">
              Definisi grade A/B/C komoditas ini tidak ada di formulir ini dan tidak ikut
              tersimpan — server hanya menuliskannya bila medannya memang dikirim. Menyimpan
              dari halaman ini tidak menghapusnya.
            </Prosa>
          </Panel>
        ) : null}

        {galat ? (
          <Galat judul="Komoditas belum tersimpan" className="mt-8">
            {galat}
          </Galat>
        ) : null}

        <Tombol
          type="submit"
          penuh
          className="mt-8 py-4 text-[16px]"
          sibuk={proses}
          labelSibuk="Menyimpan…"
        >
          {baru ? "Tambah komoditas" : "Simpan perubahan"}
        </Tombol>
      </form>
    </Halaman>
  );
}
