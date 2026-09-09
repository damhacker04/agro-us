"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { UpsertZoneBody, ZoneSummary } from "@agro-os/shared";
import { GalatApi, ambilZonaOperator, buatZona, ubahZona } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Kosong,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  Tombol,
} from "@/ui";

/**
 * OP-11 — Manajemen zona layanan.
 *
 * `minOrderValue` bukan angka hiasan: itu gerbang unit economics yang menolak checkout di
 * bawahnya, karena satu perjalanan kurir untuk muatan kecil merugi. Menurunkannya berdampak
 * langsung ke setiap pembeli di zona itu.
 *
 * MIGRASI DUNIA, dengan dua hal yang bukan soal rupa:
 *
 * 1. TOMBOL UBAH PUNYA NAMA. Ia hanya berisi ikon pensil tanpa `aria-label` maupun teks, jadi
 *    pembaca layar mengumumkannya sebagai "button" — dan di daftar tiga zona, tiga tombol
 *    tanpa nama tidak bisa dibedakan satu sama lain.
 *
 * 2. DUA SALURAN GALAT DIPISAH. `galat` dipakai bersama oleh kegagalan MEMUAT daftar dan
 *    kegagalan MENYIMPAN formulir, lalu ditampilkan di dua tempat dengan syarat `galat &&
 *    !buka`. Akibatnya galat pemuatan berpindah ke dalam formulir begitu formulirnya dibuka:
 *    orang membaca "gagal memuat zona" sebagai alasan simpanannya gagal.
 */
const KOSONG: UpsertZoneBody = { name: "", city: "", minOrderValue: 0 };

export default function OperatorZonePage() {
  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState("");

  const [buka, setBuka] = useState(false);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [isi, setIsi] = useState<UpsertZoneBody>(KOSONG);
  const [proses, setProses] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState("");

  const muat = useCallback(() => {
    setMemuat(true);
    ambilZonaOperator()
      .then((d) => {
        setZona(d);
        setGalatMuat("");
      })
      .catch((e) => setGalatMuat(e instanceof GalatApi ? e.message : "Zona gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  function mulaiUbah(z: ZoneSummary) {
    setUbahId(z.id);
    setIsi({ name: z.name, city: z.city, minOrderValue: z.minOrderValue });
    setGalatSimpan("");
    setBuka(true);
  }

  function mulaiBaru() {
    setUbahId(null);
    setIsi(KOSONG);
    setGalatSimpan("");
    setBuka(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalatSimpan("");
    try {
      if (ubahId) await ubahZona(ubahId, isi);
      else await buatZona(isi);
      setBuka(false);
      setUbahId(null);
      setIsi(KOSONG);
      muat();
    } catch (err) {
      setGalatSimpan(err instanceof GalatApi ? err.message : "Zona gagal disimpan.");
    } finally {
      setProses(false);
    }
  }

  return (
    <Halaman
      judul="Manajemen zona"
      pengantar="Zona menentukan katalog mana yang dilihat pembeli dan Tenant mana yang bisa menjadi pengganti saat panen kurang."
      aksi={
        !buka ? (
          <Tombol ukuran="sm" onClick={mulaiBaru}>
            Tambah zona
          </Tombol>
        ) : null
      }
    >
      {buka ? (
        <Panel
          nada="utama"
          label={ubahId ? "Mengubah zona" : "Zona baru"}
          judul={ubahId ? isi.name || "Zona tanpa nama" : "Tambah zona layanan"}
          aksi={
            <Tombol rupa="sunyi" ukuran="sm" onClick={() => setBuka(false)}>
              Batal
            </Tombol>
          }
          className="mb-8"
        >
          <form onSubmit={simpan}>
            <Deret kolom={2}>
              <Medan label="Nama zona" wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    required
                    minLength={3}
                    value={isi.name}
                    onChange={(e) => setIsi({ ...isi, name: e.target.value })}
                    placeholder="Kota Malang"
                  />
                )}
              </Medan>
              <Medan label="Kota / kabupaten" wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    required
                    minLength={3}
                    value={isi.city}
                    onChange={(e) => setIsi({ ...isi, city: e.target.value })}
                    placeholder="Kota Malang"
                  />
                )}
              </Medan>
            </Deret>

            <Medan
              label="Nilai minimum pesanan"
              petunjuk="Dalam rupiah. Checkout di bawah nilai ini ditolak — di titik itu satu perjalanan kurir merugi."
              wajib
              className="mt-6"
            >
              {(alat) => (
                <Masukan
                  {...alat}
                  required
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={isi.minOrderValue}
                  onChange={(e) => setIsi({ ...isi, minOrderValue: Number(e.target.value) })}
                  className="font-mono"
                />
              )}
            </Medan>

            {ubahId ? (
              <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
                Perubahan berlaku langsung bagi setiap pembeli di zona ini: menaikkan minimum
                menolak keranjang yang tadinya sah, menurunkannya membuka perjalanan kurir
                yang muatannya belum tentu menutup ongkos.
              </Sunyi>
            ) : null}

            {/* Galat SIMPAN, bukan galat muat — dua sebab yang berbeda tidak boleh berbagi
                satu kotak, apalagi kotak yang muncul di dalam formulir. */}
            {galatSimpan ? (
              <Galat judul="Zona belum tersimpan" className="mt-6">
                {galatSimpan}
              </Galat>
            ) : null}

            <Tombol
              type="submit"
              penuh
              className="mt-7 py-3.5 text-[15px]"
              sibuk={proses}
              labelSibuk="Menyimpan…"
            >
              {ubahId ? "Simpan perubahan" : "Tambah zona"}
            </Tombol>
          </form>
        </Panel>
      ) : null}

      {galatMuat ? (
        <Galat judul="Zona gagal dimuat">
          {galatMuat} Zona yang sudah ada tetap berlaku di server — muat ulang halaman untuk
          mencoba lagi.
        </Galat>
      ) : memuat ? (
        <Memuat baris={3} label="Memuat zona" />
      ) : zona.length === 0 ? (
        <Kosong judul="Belum ada zona layanan">
          Tanpa zona, pembeli tidak bisa memilih wilayah dan katalog tidak menampilkan apa
          pun. Tambahkan zona pertama untuk membuka pendaftaran Tenant di wilayah itu.
        </Kosong>
      ) : (
        <div className="space-y-8">
          {zona.map((z) => (
            <Panel
              key={z.id}
              label={z.city}
              judul={z.name}
              aksi={
                <Tombol rupa="kedua" ukuran="sm" onClick={() => mulaiUbah(z)}>
                  Ubah
                </Tombol>
              }
            >
              {/* Kotanya sudah berdiri sebagai label panel; mengulanginya sebagai baris data
                  membuat nama yang sama tercetak dua kali di satu kartu. */}
              <Deret kolom={2} as="dl">
                <BarisData label="Minimum pesanan">{rupiah(z.minOrderValue)}</BarisData>
              </Deret>
            </Panel>
          ))}
        </div>
      )}

      {!memuat && !galatMuat && zona.length > 0 ? (
        <Panel label="Yang belum ada" judul="Zona tidak bisa dinonaktifkan" className="mt-8">
          <Prosa className="text-[14px]">
            Belum ada cara menutup zona dari halaman ini. Menutupnya menyentuh Tenant yang
            sudah terdaftar, kuota yang sudah dibuka, dan pesanan yang sedang berjalan di
            dalamnya — jadi ia butuh alurnya sendiri, bukan satu tombol hapus.
          </Prosa>
        </Panel>
      ) : null}
    </Halaman>
  );
}
