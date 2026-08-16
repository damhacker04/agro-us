"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ambilZona } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import type { ZoneSummary } from "@agro-os/shared";
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
  TautanKembali,
} from "@/ui";

/**
 * BY-1 — Pilih zona layanan.
 *
 * Zona layanan diambil dari API AgroUs, BUKAN daftar wilayah nasional. Sebelumnya halaman
 * ini memanggil API wilayah pihak ketiga dan menampilkan seluruh kabupaten/kota di
 * Indonesia — padahal tidak satu pun di antaranya bisa dipesan. Layanan baru tersedia di
 * tiga zona Malang Raya, dan tiap zona punya minimum order sendiri yang menentukan apakah
 * checkout bisa dilanjutkan (Risiko 3).
 *
 * DROPDOWN KUSTOMNYA DIBUANG, bukan digaya ulang. Halaman lama membangun ulang `<select>`
 * dari nol — tombol, panel mengambang, kotak pencarian, penyaringan — untuk memilih di
 * antara TIGA pilihan. Ia juga tidak punya dukungan papan ketik sama sekali: tanpa panah
 * atas-bawah, tanpa Escape, tanpa `role="listbox"`, jadi satu-satunya cara memakainya
 * adalah tetikus. Menciptakan ulang kendali baku demi rasa adalah kebiasaan yang tidak
 * dibayar siapa pun.
 *
 * Penggantinya bukan `<select>` melainkan daftar: tiga zona itu ISI halaman ini, bukan
 * nilai yang harus disembunyikan di balik kendali. Minimum order tampil pada masing-masing
 * — pembeli lebih baik tahu sekarang daripada ditolak setelah keranjangnya penuh — dan
 * memilih zona langsung membuka katalognya, tanpa tombol "Lanjutkan" kedua.
 */
export default function BuyerRegionPage() {
  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    ambilZona()
      .then(setZona)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Gagal memuat zona layanan"))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <Halaman
      lebar="sempit"
      judul="Pilih wilayah layanan"
      pengantar="Zona menentukan kebun mana yang bisa mengirim ke Anda, bagaimana ongkos kirim dikonsolidasikan, dan berapa minimum pesanannya. Pilih lokasi operasional restoran atau usaha Anda."
      kembali={<TautanKembali href="/">Kembali ke beranda</TautanKembali>}
    >
      {memuat ? <Memuat baris={3} label="Memuat zona layanan" /> : null}

      {galat ? (
        <Galat judul="Zona layanan gagal dimuat">
          {galat} Tanpa daftar zona tidak ada yang bisa dipesan, karena ongkos kirim dan
          minimum order dihitung per zona. Muat ulang halaman ini untuk mencoba lagi.
        </Galat>
      ) : null}

      {!memuat && !galat && zona.length === 0 ? (
        <Kosong judul="Belum ada zona layanan yang dibuka">
          Layanan dibuka per zona, bukan per kota. Saat ini belum ada satu pun yang aktif —
          artinya belum ada kebun terdaftar yang bisa mengirim.
        </Kosong>
      ) : null}

      {zona.length > 0 ? (
        <>
          <Label className="mb-4">{zona.length} zona tersedia</Label>
          <ul className="space-y-5">
            {zona.map((z) => (
              <li key={z.id}>
                <Link
                  href={`/buyer/catalog?zoneId=${z.id}&city=${encodeURIComponent(z.name)}`}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                >
                  <div className="border-t-2 border-tinta bg-kertas-terang p-5 transition-colors duration-150 group-hover:border-ungu">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[17px] font-bold text-tinta transition-colors duration-150 group-hover:text-ungu">
                        {z.name}
                      </span>
                      <Ikon
                        dari={ArrowRight}
                        ukuran="md"
                        className="text-tinta-samar transition-colors duration-150 group-hover:text-ungu"
                      />
                    </div>
                    {/* Minimum order ditampilkan SEJAK AWAL: nilainya berbeda tiap zona dan
                        menentukan apakah checkout nanti bisa dilanjutkan. */}
                    <div className="mt-3 border-t border-kertas-garis pt-2.5">
                      <Label>Minimum pesanan</Label>
                      <span className="mt-1 block font-mono text-[15px] text-tinta">
                        {rupiah(z.minOrderValue)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Panel label="Mengapa ini ditanya lebih dulu" judul="Zona menentukan harga akhirnya" nada="kabar" className="mt-10">
        <Prosa className="text-[14px]">
          Jarak kebun ke alamat Anda, konsolidasi ongkos kirim, dan perkiraan waktu tiba
          semuanya dihitung dari zona. Menanyakannya sekarang berarti angka yang Anda lihat di
          katalog adalah angka yang benar-benar berlaku untuk Anda.
        </Prosa>
        <Sunyi className="mt-3 text-[13px]">
          Zona bisa diganti kapan saja lewat tautan &ldquo;Ganti wilayah&rdquo; di atas katalog.
        </Sunyi>
      </Panel>
    </Halaman>
  );
}
