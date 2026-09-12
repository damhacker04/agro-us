"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GalatApi, ambilZona, ubahProfilPembeli } from "@/lib/api";
import { bacaKeranjang, kosongkanKeranjang } from "@/lib/keranjang";
import { rupiah } from "@/lib/format-id";
import { RUTE_ONBOARDING_PEMBELI } from "@/lib/rute-masuk";
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
  Tombol,
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
 *
 * ZONANYA KINI BENAR-BENAR PINDAH. Sebelumnya memilih zona hanya mengganti `zoneId` di
 * query katalog, sementara checkout membaca `buyer.activeZoneId` dari basis data. Pembeli
 * bisa menelusuri zona Batu sepanjang sore, lalu ongkir, minimum pesanan, dan kecocokan
 * pesanannya dihitung terhadap zona Kota Malang yang tersimpan — tanpa satu pun layar
 * yang menyebutkan perbedaan itu. Pilihan di sini sekarang di-PATCH ke profil dulu;
 * katalog baru dibuka setelah servernya setuju.
 *
 * Keranjang ikut jadi urusan halaman ini. Barisnya menyimpan `zoneId` asal, dan batch
 * dari zona lain tidak bisa dikirim ke alamat di zona baru — jadi perpindahannya
 * dinyatakan lebih dulu sebagai konsekuensi, bukan sebagai keranjang yang diam-diam
 * kosong di layar berikutnya.
 */
export default function BuyerRegionPage() {
  const router = useRouter();
  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState<string | null>(null);
  const [galatSimpan, setGalatSimpan] = useState("");
  const [konfirmasi, setKonfirmasi] = useState<ZoneSummary | null>(null);

  useEffect(() => {
    ambilZona()
      .then(setZona)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Gagal memuat zona layanan"))
      .finally(() => setMemuat(false));
  }, []);

  /** Box di keranjang yang berasal dari zona LAIN — yang akan gugur bila zona diganti. */
  function boxLuarZona(zoneId: string) {
    return bacaKeranjang()
      .filter((b) => b.zoneId !== zoneId)
      .reduce((s, b) => s + b.qtyBox, 0);
  }

  function pilih(e: React.MouseEvent, z: ZoneSummary) {
    e.preventDefault();
    setGalatSimpan("");
    if (boxLuarZona(z.id) > 0) return setKonfirmasi(z);
    void pindah(z);
  }

  async function pindah(z: ZoneSummary) {
    setKonfirmasi(null);
    setMenyimpan(z.id);
    try {
      await ubahProfilPembeli({ activeZoneId: z.id });
      if (boxLuarZona(z.id) > 0) kosongkanKeranjang();
      router.push(`/buyer/catalog?zoneId=${z.id}&city=${encodeURIComponent(z.name)}`);
    } catch (err) {
      // Pembeli yang belum punya profil tidak bisa menyimpan zona apa pun. Itu bukan
      // galat untuk dibaca — itu langkah yang terlewat, dan halamannya sudah ada.
      if (err instanceof GalatApi && (err.kode === "BUYER_NOT_FOUND" || err.status === 404)) {
        return router.push(RUTE_ONBOARDING_PEMBELI);
      }
      setGalatSimpan(
        err instanceof GalatApi ? err.message : "Zona gagal disimpan. Coba lagi sebentar.",
      );
      setMenyimpan(null);
    }
  }

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

      {galatSimpan ? (
        <Galat judul="Zona belum berpindah">
          {galatSimpan} Selama zonanya belum tersimpan, ongkos kirim dan minimum pesanan
          masih dihitung dengan zona sebelumnya — jadi katalognya sengaja tidak dibuka.
        </Galat>
      ) : null}

      {konfirmasi ? (
        <Panel
          label="Keranjang berisi zona lain"
          judul={`Pindah ke ${konfirmasi.name} akan mengosongkan keranjang`}
          nada="kabar"
          className="mb-8"
        >
          <Prosa className="text-[14px]">
            {boxLuarZona(konfirmasi.id)} box di keranjang Anda berasal dari kebun di zona lain.
            Kebun itu tidak mengirim ke {konfirmasi.name}, jadi barisnya tidak bisa ikut
            berpindah — kuotanya juga belum direservasi, dan tetap tersedia untuk pembeli lain.
          </Prosa>
          <div className="mt-5 flex flex-wrap gap-3">
            <Tombol
              type="button"
              onClick={() => void pindah(konfirmasi)}
              sibuk={menyimpan === konfirmasi.id}
              labelSibuk="Memindahkan…"
            >
              Pindah dan kosongkan keranjang
            </Tombol>
            <Tombol type="button" rupa="sunyi" onClick={() => setKonfirmasi(null)}>
              Batal — tetap di zona sekarang
            </Tombol>
          </div>
        </Panel>
      ) : null}

      {zona.length > 0 ? (
        <>
          <Label className="mb-4">{zona.length} zona tersedia</Label>
          <ul className="space-y-5">
            {zona.map((z) => (
              <li key={z.id}>
                {/* Tetap `<a href>` supaya tujuannya terbaca di status bar dan bisa dibuka
                    di tab baru; kliknya dicegat karena zonanya harus tersimpan lebih dulu. */}
                <Link
                  href={`/buyer/catalog?zoneId=${z.id}&city=${encodeURIComponent(z.name)}`}
                  onClick={(e) => pilih(e, z)}
                  aria-busy={menyimpan === z.id}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                >
                  <div className="border-t-2 border-tinta bg-kertas-terang p-5 transition-colors duration-150 group-hover:border-ungu">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[17px] font-bold text-tinta transition-colors duration-150 group-hover:text-ungu">
                        {z.name}
                      </span>
                      {menyimpan === z.id ? (
                        <Label className="shrink-0 text-ungu">Menyimpan zona…</Label>
                      ) : (
                        <Ikon
                          dari={ArrowRight}
                          ukuran="md"
                          className="text-tinta-samar transition-colors duration-150 group-hover:text-ungu"
                        />
                      )}
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
