"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZoneSummary } from "@agro-os/shared";
import { GalatApi, ambilZona, buatProfilTenant } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import {
  Centang,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Prosa,
  Tombol,
} from "@/ui";

/**
 * Langkah 1 onboarding Tenant — profil usaha & zona layanan.
 *
 * Zona menentukan pembeli mana yang bisa melihat produk Anda dan Tenant mana yang bisa
 * menjadi pengganti saat panen Anda kurang, jadi dipilih di awal dan bisa lebih dari satu.
 *
 * MIGRASI DUNIA. Zona berhenti jadi tombol yang menyimpan keadaan terpilihnya lewat warna
 * saja: ia kini `Centang` sungguhan — kotak centang yang bisa ditelusuri papan ketik,
 * dibacakan pembaca layar sebagai pilihan ganda, dan menyatakan sendiri bahwa lebih dari
 * satu boleh dipilih. Tombol yang "menyala" tidak menyampaikan itu kepada siapa pun yang
 * tidak melihat warnanya.
 */
export default function TenantOnboardingProfilePage() {
  const router = useRouter();

  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [nama, setNama] = useState("");
  const [dipilih, setDipilih] = useState<string[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatZona, setGalatZona] = useState("");

  useEffect(() => {
    ambilZona()
      .then((z) => {
        setZona(z);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Zona gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  function alihkan(id: string) {
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
    setGalatZona("");
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (dipilih.length === 0) {
      return setGalatZona("Pilih minimal satu zona — tanpa zona, produk Anda tidak muncul di katalog pembeli mana pun.");
    }
    setProses(true);
    setGalat("");
    try {
      await buatProfilTenant({ companyName: nama, zoneIds: dipilih });
      router.push("/tenant/onboarding/mapping");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Profil gagal disimpan.");
      setProses(false);
    }
  }

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Profil usaha tani">
        <Memuat baris={3} label="Memuat zona layanan" />
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      judul="Profil usaha tani"
      pengantar="Dua hal yang menempel pada Anda sepanjang pemakaian: nama yang dilihat pembeli, dan zona tempat Anda melayani."
    >
      <form onSubmit={simpan}>
        <Panel judul="Nama yang dilihat pembeli">
          <Medan
            label="Nama usaha atau kelompok tani"
            petunjuk="Muncul di katalog dan di setiap Verified Timeline batch Anda."
            wajib
          >
            {(alat) => (
              <Masukan
                {...alat}
                minLength={3}
                maxLength={120}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Tani Makmur Pujon"
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
            Boleh lebih dari satu. Tiap zona punya nilai minimum pesanan sendiri, dan itulah
            yang harus dicapai satu pengiriman agar ongkirnya masuk akal.
          </p>
          <div className="space-y-2">
            {zona.map((z) => (
              <Centang
                key={z.id}
                checked={dipilih.includes(z.id)}
                onChange={() => alihkan(z.id)}
                judul={z.name}
              >
                Minimum pesanan{" "}
                <span className="font-mono text-tinta">{rupiah(z.minOrderValue)}</span> per
                pengiriman.
              </Centang>
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
        >
          Lanjut — petakan lahan
        </Tombol>
        <Prosa className="mt-3 text-[13px]">
          Zona masih bisa diubah nanti dari profil Anda. Yang tidak berubah adalah rekam jejak
          batch yang sudah berjalan di zona itu.
        </Prosa>
      </form>
    </Halaman>
  );
}
