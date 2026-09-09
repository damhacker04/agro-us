"use client";

import React, { useEffect, useState } from "react";
import type { AntreanUmurSimpan } from "@agro-os/shared";
import { GalatApi, ambilAntreanUmurSimpan } from "@/lib/api";
import { angka } from "@/lib/format-id";
import { TAHAP } from "@/components/tahap-pengiriman";
import { Galat, Halaman, Kosong, Label, Memuat, Panel, Pil, Prosa, Sunyi } from "@/ui";

/**
 * OP-14 — Antrean Pantau Umur Simpan (FR-5.10).
 *
 * HALAMAN INI TIDAK PUNYA TOMBOL YANG MEMBLOKIR PENGIRIMAN, dan itu keputusan produk, bukan
 * fitur yang belum sempat dibuat. Memblokir menuntut ambang, dan angka umur simpan di sini
 * masih estimasi literatur yang belum divalidasi lapangan. Menolak kiriman berdasarkan
 * tebakan adalah persis kesalahan yang FR-7.12e ada untuk mencegah — sistem tidak boleh
 * menjatuhkan konsekuensi di atas dasar yang ia sendiri tahu belum kokoh. Operator melihat
 * keadaannya, lalu memutuskan sebagai manusia.
 *
 * Antreannya juga tidak disaring ambang: menyembunyikan batch yang "masih aman" berarti
 * menyembunyikannya berdasarkan angka yang sama meragukannya.
 *
 * MIGRASI DUNIA, dengan dua hal yang bukan soal rupa:
 *
 * 1. `{b.shipmentStatus}` BERHENTI DICETAK MENTAH. Kolom status memuat "MENUNGGU_PANEN" dan
 *    "TIBA_DI_LOKASI" apa adanya — nama enum basis data, lengkap dengan garis bawahnya. Ini
 *    kebocoran kelima yang sejenis setelah kegiatan timeline, buku besar escrow, status
 *    legalitas, dan verifikasi satelit. Namanya sudah ada di `TAHAP`.
 *
 *    Pilnya sengaja NETRAL, bukan memakai `PilTahap`. `RUPA` di komponen itu menyatakan
 *    GILIRAN SIAPA sebuah tahap — dan di layar ini tidak ada tahap yang menuntut tindakan
 *    operator. Yang mendesak di sini sisa umur simpannya, dan warna yang dipakai dua kali
 *    untuk dua arti berhenti berarti apa pun.
 *
 * 2. `settled` AKHIRNYA DIPAKAI. Kontraknya memuat penanda apakah umurnya sudah final
 *    (barang tiba) atau jamnya masih berjalan, dan layar lama membuangnya. "Sisa 1 hari"
 *    yang membeku dan "sisa 1 hari" yang masih menghitung mundur menuntut tindakan yang
 *    berbeda dari orang yang membacanya.
 */
export default function UmurSimpanPage() {
  const [baris, setBaris] = useState<AntreanUmurSimpan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilAntreanUmurSimpan()
      .then((d) => {
        setBaris(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Antrean gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  const lewat = baris.filter(
    (b) => b.umurSimpan.remainingDays !== null && b.umurSimpan.remainingDays < 0,
  ).length;

  return (
    <Halaman
      judul="Pantau umur simpan"
      pengantar="Batch yang sudah dipanen tetapi belum sampai ke pembeli, terurut dari sisa umur simpan paling tipis."
      aksi={
        lewat > 0 ? <Pil nada="awas">{angka(lewat)} lewat umur simpan</Pil> : null
      }
    >
      {/* Batas dinyatakan sebelum angkanya dibaca, bukan sesudah — pembacanya perlu tahu
          derajat kepercayaan angka itu sebelum ia menimbang tindakan. */}
      <Panel nada="kabar" label="Yang perlu diketahui lebih dulu" judul="Angka ini indikatif">
        <Prosa className="text-[14px]">
          Umur simpan komoditas belum divalidasi ke penyuluh maupun BPS. Karena itu halaman ini
          tidak memblokir pengiriman apa pun — ia hanya menunjukkan keadaan, dan yang memutus
          tetap manusia. Usia produk dihitung dari waktu panen menurut stempel server, bukan
          dari tanggal yang diisi Tenant.
        </Prosa>
      </Panel>

      {galat ? (
        <Galat judul="Antrean gagal dimuat" className="mt-8">
          {galat} Batch yang sedang menunggu kirim tetap tercatat di server — muat ulang
          halaman untuk mencoba lagi.
        </Galat>
      ) : memuat ? (
        <div className="mt-8">
          <Memuat baris={3} label="Memuat antrean umur simpan" />
        </div>
      ) : baris.length === 0 ? (
        <div className="mt-8">
          <Kosong judul="Tidak ada batch yang sedang menunggu kirim">
            Antrean ini hanya memuat batch yang sudah dipanen dan belum tiba. Di luar jendela
            itu, umur simpan tidak bisa ditindaklanjuti siapa pun.
          </Kosong>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {baris.map((b) => (
            <BarisUmur key={`${b.shipmentId}-${b.batchId}`} b={b} />
          ))}
        </div>
      )}
    </Halaman>
  );
}

function BarisUmur({ b }: { b: AntreanUmurSimpan }) {
  const u = b.umurSimpan;
  const belumAdaAcuan = u.remainingDays === null;
  const lewat = u.remainingDays !== null && u.remainingDays < 0;
  const menipis = u.remainingDays !== null && u.remainingDays >= 0 && u.remainingDays <= 2;

  return (
    <Panel
      nada={lewat ? "awas" : menipis ? "kabar" : "netral"}
      label={`${b.tenantName} · ${b.commodityName}`}
      judul={b.productName}
      aksi={
        /* Netral dengan sengaja: tidak ada tahap pengiriman yang menuntut tindakan operator
           di layar ini, dan warna mendesaknya sudah dipakai oleh sisa umur simpan. */
        <Pil nada="netral" garis>
          {TAHAP[b.shipmentStatus]}
        </Pil>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-10 gap-y-5">
        <div>
          <Label>Sisa umur simpan</Label>
          {belumAdaAcuan ? (
            /* Bukan nol dan bukan tanda hubung tanpa penjelasan: yang hilang adalah angka
               acuannya, bukan datanya. */
            <p className="mt-1.5 max-w-[34ch] text-[14px] leading-snug text-tinta-lembut">
              Komoditas ini belum punya angka umur simpan, jadi tidak ada yang bisa dihitung.
            </p>
          ) : (
            <p
              className={`mt-1.5 font-mono text-[26px] leading-none ${
                lewat ? "text-jambu" : "text-tinta"
              }`}
            >
              {lewat
                ? `lewat ${angka(Math.abs(u.remainingDays as number))} hari`
                : `${angka(u.remainingDays as number)} hari`}
            </p>
          )}
        </div>

        <div>
          <Label>Usia produk</Label>
          <p className="mt-1.5 font-mono text-[26px] leading-none text-tinta">
            {u.ageDays === null ? "—" : `${angka(u.ageDays)} hari`}
          </p>
        </div>

        <div>
          <Label>Jumlah</Label>
          <p className="mt-1.5 font-mono text-[26px] leading-none text-tinta">
            {angka(b.qtyBox)} box
          </p>
        </div>
      </div>

      {/* Angka yang membeku dan angka yang masih menghitung mundur menuntut tindakan yang
          berbeda, dan keduanya tampil sama persis tanpa kalimat ini. */}
      {!belumAdaAcuan ? (
        <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
          {u.settled
            ? "Barang sudah tiba, jadi angka ini final — ia tidak berkurang lagi."
            : "Barang belum tiba, jadi jamnya masih berjalan: angka ini berkurang satu setiap hari."}
        </Sunyi>
      ) : null}
    </Panel>
  );
}
