"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CommoditySummary, ProductResponse } from "@agro-os/shared";
import { GalatApi, ambilKomoditas, ambilProdukTenant, buatProduk, ubahProduk } from "@/lib/api";
import { angka, desimal } from "@/lib/format-id";
import {
  AreaTeks,
  Deret,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Pilihan,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
  Ubin,
} from "@/ui";

/**
 * TN-13b — Tambah / ubah produk.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: rendemen rata-rata komoditas berhenti memakai
 * `toLocaleString("id-ID")` — data ICU runtime berbeda antara server dan peramban, dan
 * selisih satu karakter membuang seluruh pohon React dengan galat hidrasi. Sama seperti
 * yang sudah dicatat di MIGRASI.md.
 *
 * Keterangan toleransi susut DIPERTAHANKAN dan justru diberi tempat lebih jelas. Angka itu
 * melekat pada komoditas, bukan pada produk, dan ia yang menentukan berapa kekurangan berat
 * yang masih dianggap wajar saat pembeli mengajukan klaim — Tenant berhak tahu sebelum
 * memilih, bukan setelah klaim pertama datang.
 */

const GRADE = ["A", "B", "C"] as const;

function FormProduk() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id");
  const sedangUbah = Boolean(id);

  // Nilai bawaan saat datang dari Rekomendasi Tanam: Tenant disuruh membuat produk
  // untuk komoditas yang disarankan, jadi isian yang sudah diketahui dibawa serta.
  // Tanpa ini ia harus mengingat sendiri angka yang baru saja dilihat di layar lain.
  const komoditasAwal = sp.get("komoditas");
  const kgBoxAwal = sp.get("kgBox");
  const hargaAwal = sp.get("harga");
  const panenAwal = sp.get("panen");

  const [komoditas, setKomoditas] = useState<CommoditySummary[]>([]);
  const [commodityId, setCommodityId] = useState("");
  const [nama, setNama] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [harga, setHarga] = useState("");
  const [kgBox, setKgBox] = useState("");
  const [panen, setPanen] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilKomoditas(), sedangUbah ? ambilProdukTenant() : Promise.resolve([])])
      .then(([k, produk]) => {
        setKomoditas(k);
        if (sedangUbah) {
          const p = (produk as ProductResponse[]).find((x) => x.id === id);
          if (!p) return setGalat("Produk tidak ditemukan.");
          setCommodityId(p.commodity.id);
          setNama(p.name);
          setGrade(p.grade);
          setHarga(String(p.pricePerBox));
          setKgBox(String(p.qtyKgPerBox));
          setPanen(p.estHarvestDate.slice(0, 10));
          setDeskripsi(p.description ?? "");
        } else {
          setCommodityId(komoditasAwal ?? k[0]?.id ?? "");
          if (kgBoxAwal) setKgBox(kgBoxAwal);
          if (hargaAwal) setHarga(hargaAwal);
          if (panenAwal) setPanen(panenAwal);
        }
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Data gagal dimuat"))
      .finally(() => setMemuat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sedangUbah]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    const isi = {
      commodityId,
      name: nama,
      grade,
      pricePerBox: Number(harga),
      qtyKgPerBox: Number(kgBox),
      estHarvestDate: panen,
      ...(deskripsi ? { description: deskripsi } : {}),
    };
    try {
      if (sedangUbah && id) await ubahProduk(id, isi);
      else await buatProduk(isi);
      router.push("/tenant/catalog");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Produk gagal disimpan.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/tenant/catalog">Katalog produk</TautanKembali>;
  const judul = sedangUbah ? "Ubah produk" : "Tambah produk";

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul={judul} kembali={kembali}>
        <Memuat baris={4} label="Memuat komoditas" />
      </Halaman>
    );
  }

  const dipilih = komoditas.find((k) => k.id === commodityId);

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul={judul}
      pengantar="Produk belum bisa dipesan sampai Anda membuka kuota Pre-Order untuknya dari halaman Batch. Yang diisi di sini adalah dasarnya: nama, grade, harga, dan isi per box."
    >
      <form onSubmit={simpan}>
        {/* Tanpa `label`: kepala panelnya akan berbunyi "KOMODITAS" tepat di atas isian
            yang labelnya juga "KOMODITAS", dan yang kedua lalu terbaca sebagai keterangan
            tambahan yang ternyata bukan. */}
        <Panel judul="Yang Anda tanam">
          <Medan label="Komoditas" wajib>
            {(alat) => (
              <Pilihan
                {...alat}
                value={commodityId}
                onChange={(e) => setCommodityId(e.target.value)}
              >
                {komoditas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </Pilihan>
            )}
          </Medan>

          {/* Dua angka yang melekat pada KOMODITAS, bukan pada produk, dan keduanya
              menentukan hal yang berbeda: toleransi susut menentukan berapa kekurangan
              berat yang masih dianggap wajar saat pembeli mengajukan klaim; rendemen
              menentukan batas kuota yang boleh Anda buka di petak seluas berapa pun. */}
          {dipilih ? (
            <Deret kolom={2} as="dl" className="mt-6">
              <Ubin
                label="Toleransi susut"
                nilai={desimal(dipilih.shrinkTolerancePct, 0)}
                satuan="%"
                catatan="Kekurangan berat sampai batas ini dianggap susut wajar saat klaim mutu"
              />
              <Ubin
                label="Rendemen rata-rata"
                nilai={angka(dipilih.avgYieldKgPerHa)}
                satuan="kg/ha"
                catatan="Dasar perhitungan batas kuota tiap petak lahan"
              />
            </Deret>
          ) : null}
        </Panel>

        <Panel label="Produk" judul="Bagaimana ia diperkenalkan" className="mt-8">
          <Medan
            label="Nama produk"
            petunjuk="Yang dibaca pembeli di katalog. Sebutkan komoditas dan asalnya."
            wajib
          >
            {(alat) => (
              <Masukan
                {...alat}
                minLength={3}
                maxLength={120}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Wortel Pujon Grade A"
              />
            )}
          </Medan>

          <fieldset className="mt-6">
            <legend className="mb-2">
              <Label>Grade</Label>
            </legend>
            <p className="mb-3 text-[12px] leading-snug text-tinta-samar">
              Standar grade ditetapkan per komoditas, dan pembeli menyaring katalog dengannya.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GRADE.map((g) => (
                <Tombol
                  key={g}
                  type="button"
                  rupa={grade === g ? "utama" : "kedua"}
                  aria-pressed={grade === g}
                  className="py-3.5"
                  onClick={() => setGrade(g)}
                >
                  Grade {g}
                </Tombol>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Medan label="Harga per box" petunjuk="Dalam rupiah, tanpa titik." wajib>
              {(alat) => (
                <Masukan
                  {...alat}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  placeholder="145000"
                  className="font-mono"
                />
              )}
            </Medan>

            <Medan label="Isi per box" petunjuk="Dalam kilogram." wajib>
              {(alat) => (
                <Masukan
                  {...alat}
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={kgBox}
                  onChange={(e) => setKgBox(e.target.value)}
                  placeholder="10"
                  className="font-mono"
                />
              )}
            </Medan>
          </div>

          <Medan
            label="Perkiraan tanggal panen"
            petunjuk="Perkiraan awal untuk produk ini. Tanggal yang mengikat dikunci nanti, saat kuota dibuka."
            wajib
            className="mt-6"
          >
            {(alat) => (
              <Masukan
                {...alat}
                type="date"
                value={panen}
                onChange={(e) => setPanen(e.target.value)}
                className="font-mono"
              />
            )}
          </Medan>

          <Medan
            label="Deskripsi"
            petunjuk="Opsional. Dibaca pembeli apa adanya — sebutkan cara tanam atau ciri yang membedakan."
            className="mt-6"
          >
            {(alat) => (
              <AreaTeks
                {...alat}
                rows={3}
                maxLength={2000}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Ditanam di ketinggian 1.200 mdpl, panen pagi dan langsung disortir."
              />
            )}
          </Medan>
        </Panel>

        {galat ? (
          <Galat judul="Produk belum tersimpan" className="mt-8">
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
          {sedangUbah ? "Simpan perubahan" : "Tambah produk"}
        </Tombol>
        <Prosa className="mt-3 text-[13px]">
          Menyimpan produk belum membuka kuota apa pun, jadi belum ada yang bisa dipesan
          pembeli dan belum ada yang mengikat Anda.
        </Prosa>
      </form>
    </Halaman>
  );
}

export default function CatalogEditPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit" judul="Produk">
          <Memuat baris={4} label="Memuat formulir" />
        </Halaman>
      }
    >
      <FormProduk />
    </Suspense>
  );
}
