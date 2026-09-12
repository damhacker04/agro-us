"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZoneSummary } from "@agro-os/shared";
import { GalatApi, ambilProfilPembeli, ambilZona, buatProfilPembeli } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
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
  Tombol,
} from "@/ui";

/**
 * BY-0 — profil usaha pembeli. Langkah yang selama ini tidak punya halaman.
 *
 * `POST /buyer/profile` sudah ada sejak awal dan `buatProfilPembeli` sudah dibungkus di
 * `lib/api.ts`, tetapi tidak satu halaman pun memanggilnya. Nomor baru karena itu bisa
 * masuk, melihat katalog, mengisi keranjang — lalu ditolak di checkout dengan
 * BUYER_NOT_FOUND, setelah semua pekerjaannya selesai. Akun peragaan menyembunyikannya
 * karena profilnya sudah ditanam lewat seed.
 *
 * ZONA DIPILIH DI SINI, SEKALI, DAN TERSIMPAN. Backend menuntut `activeZoneId` saat
 * profil dibuat — bukan opsional — karena zona itulah yang dipakai menghitung ongkir,
 * minimum pesanan, dan kebun mana yang boleh mengirim. Memilihnya sekarang berarti angka
 * yang tampil di katalog adalah angka yang berlaku di checkout.
 *
 * Pilihannya `Radio`, bukan tombol yang menyala: satu zona aktif pada satu waktu, dan
 * pembaca layar harus mendengar bahwa ini pilihan tunggal — bukan menebaknya dari warna.
 */
export default function BuyerOnboardingProfilePage() {
  const router = useRouter();

  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [nama, setNama] = useState("");
  const [dipilih, setDipilih] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatZona, setGalatZona] = useState("");

  useEffect(() => {
    let batal = false;
    // Profil yang SUDAH ada tidak boleh dibuat dua kali: server menjawab BUYER_EXISTS,
    // dan orang yang kebetulan membuka tautan ini akan membaca galat untuk keadaan yang
    // sebenarnya sudah benar.
    ambilProfilPembeli()
      .then(() => {
        if (!batal) router.replace("/buyer/region");
      })
      .catch(() => {
        /* Belum ada profil — memang itu yang dikerjakan halaman ini. */
      });

    ambilZona()
      .then((z) => {
        if (batal) return;
        setZona(z);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Zona gagal dimuat"))
      .finally(() => {
        if (!batal) setMemuat(false);
      });

    return () => {
      batal = true;
    };
  }, [router]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!dipilih) {
      return setGalatZona(
        "Pilih satu zona layanan — tanpa zona, katalog tidak tahu kebun mana yang bisa mengirim ke Anda.",
      );
    }
    setProses(true);
    setGalat("");
    try {
      const profil = await buatProfilPembeli({ companyName: nama, activeZoneId: dipilih });
      const wilayah = profil.activeZone;
      router.push(
        wilayah
          ? `/buyer/catalog?zoneId=${wilayah.id}&city=${encodeURIComponent(wilayah.name)}`
          : "/buyer/region",
      );
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Profil gagal disimpan.");
      setProses(false);
    }
  }

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Profil usaha Anda">
        <Memuat baris={3} label="Memuat zona layanan" />
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      judul="Profil usaha Anda"
      pengantar="Dua hal yang menempel pada setiap pesanan: nama usaha yang dibaca produsen dan kurir, dan zona tempat barangnya diantar."
    >
      <form onSubmit={simpan}>
        <Panel judul="Nama yang dibaca produsen">
          <Medan
            label="Nama restoran, kafe, atau usaha"
            petunjuk="Muncul pada surat jalan, kode antar, dan setiap pesanan yang Anda buat."
            wajib
          >
            {(alat) => (
              <Masukan
                {...alat}
                minLength={3}
                maxLength={120}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Warung Sambel Bu Tin"
              />
            )}
          </Medan>
        </Panel>

        <fieldset className="mt-8">
          <legend className="mb-1.5">
            <Label>
              Zona layanan<span className="ml-1 text-jambu">*</span>
            </Label>
          </legend>
          <p className="mb-3 max-w-[68ch] text-[12px] leading-snug text-tinta-samar">
            Satu zona aktif pada satu waktu. Zona menentukan minimum pesanan dan ongkos kirim
            yang berlaku untuk Anda, dan bisa diganti kapan saja lewat &ldquo;Ganti
            wilayah&rdquo; di atas katalog.
          </p>
          <div className="space-y-2">
            {zona.map((z) => (
              <Radio
                key={z.id}
                nama="zona-layanan"
                nilai={z.id}
                terpilih={dipilih === z.id}
                onPilih={(nilai) => {
                  setDipilih(nilai);
                  setGalatZona("");
                }}
                judul={z.name}
              >
                Minimum pesanan{" "}
                <span className="font-mono text-tinta">{rupiah(z.minOrderValue)}</span> per
                pengiriman.
              </Radio>
            ))}
          </div>
          {galatZona ? (
            <p className="mt-2 text-[12px] font-semibold leading-snug text-jambu">{galatZona}</p>
          ) : null}
        </fieldset>

        {galat ? (
          <Galat judul="Profil belum tersimpan" className="mt-8">
            {galat}
          </Galat>
        ) : null}

        <Tombol
          type="submit"
          penuh
          className="mt-8 py-4 text-[16px]"
          sibuk={proses}
          labelSibuk="Menyimpan…"
          disabled={zona.length === 0}
        >
          Lanjut — buka katalog
        </Tombol>
        <Prosa className="mt-3 text-[13px]">
          Nama usaha dan zona masih bisa diubah nanti. Yang tidak berubah adalah riwayat
          pesanan yang sudah dikirim ke alamat Anda.
        </Prosa>
      </form>
    </Halaman>
  );
}
