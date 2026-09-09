"use client";

import React, { useEffect, useState } from "react";
import type { LegalityStatus, TenantProfileResponse } from "@agro-os/shared";
import { GalatApi, ambilProfilTenant } from "@/lib/api";
import { angka } from "@/lib/format-id";
import {
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  Tanda,
  TombolTaut,
  Ubin,
  type Nada,
} from "@/ui";

/**
 * Akhir onboarding — dan sengaja BUKAN layar perayaan.
 *
 * Yang menentukan apa yang bisa Tenant kerjakan berikutnya adalah status legalitasnya,
 * bukan fakta bahwa formulirnya sudah diisi. Karena itu status yang memimpin halaman, dan
 * tiap status membawa langkah berikutnya yang berbeda — `PENDING` bukan kegagalan dan tidak
 * boleh terbaca begitu, `REJECTED` harus menyebut jalan keluarnya.
 */
const PESAN: Record<LegalityStatus, { judul: string; teks: string; nada: Nada; tanda: "penuh" | "sebagian" | "tidak" }> = {
  PENDING: {
    judul: "Menunggu tinjauan operator",
    teks: "Anda sudah bisa masuk dan menyiapkan produk sekarang. Yang menunggu tinjauan hanyalah pembukaan kuota Pre-Order — begitu legalitas disetujui, kuota bisa langsung dibuka.",
    nada: "kabar",
    tanda: "sebagian",
  },
  APPROVED: {
    judul: "Legalitas disetujui",
    teks: "Tidak ada lagi yang menahan. Anda sudah bisa membuka kuota Pre-Order dan mulai menerima pesanan.",
    nada: "utama",
    tanda: "penuh",
  },
  REJECTED: {
    judul: "Legalitas ditolak",
    teks: "Perbaiki dokumen sesuai catatan operator, lalu ajukan kembali. Penolakan tidak menghapus profil maupun lahan yang sudah Anda daftarkan.",
    nada: "awas",
    tanda: "tidak",
  },
};

export default function TenantOnboardingSuccessPage() {
  const [profil, setProfil] = useState<TenantProfileResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilProfilTenant()
      .then((p) => {
        setProfil(p);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Profil gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Pendaftaran selesai">
        <Memuat baris={3} label="Memuat profil" />
      </Halaman>
    );
  }

  const status = profil ? PESAN[profil.legalityStatus] : null;

  return (
    <Halaman
      lebar="sempit"
      judul="Pendaftaran selesai"
      pengantar={
        profil
          ? `${profil.companyName} terdaftar dan siap dipakai. Yang menentukan langkah berikutnya adalah status legalitas di bawah.`
          : "Pendaftaran Anda tersimpan."
      }
    >
      {galat ? (
        <Galat judul="Profil gagal dimuat" className="mb-8">
          {galat} Pendaftaran Anda tetap tersimpan — muat ulang halaman untuk melihat statusnya.
        </Galat>
      ) : null}

      {profil ? (
        <Deret kolom={2} as="dl" className="mb-8">
          <Ubin label="Zona layanan" nilai={String(profil.zones.length)} satuan="zona" catatan={profil.zones.map((z) => z.name).join(", ")} />
          <Ubin label="Petak lahan" nilai={angka(profil.landPlotCount)} satuan="petak" />
        </Deret>
      ) : null}

      {status ? (
        <Panel
          nada={status.nada}
          label="Status legalitas"
          /* Tandanya menyatu dengan judul, bukan berdiri lagi sebagai pil berisi kata yang
             sama persis di sebelahnya. */
          judul={
            <span className="flex items-center gap-2">
              <Tanda jenis={status.tanda} className={status.nada === "kabar" ? "text-biru" : ""} />
              {status.judul}
            </span>
          }
        >
          <Prosa className="text-[15px]">{status.teks}</Prosa>
        </Panel>
      ) : null}

      <div className="mt-10">
        <Label className="mb-3">Langkah berikutnya</Label>
        <div className="flex flex-wrap gap-2">
          <TombolTaut href="/tenant" className="py-3.5">
            Masuk ke beranda Tenant
          </TombolTaut>
          <TombolTaut href="/tenant/catalog/edit" rupa="kedua" className="py-3.5">
            Tambah produk pertama
          </TombolTaut>
        </div>
        <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
          Menambah produk tidak menunggu tinjauan legalitas. Yang menunggu hanya kuota
          Pre-Order, jadi menyiapkan produk sekarang berarti kuota bisa dibuka di hari
          persetujuannya.
        </Sunyi>
      </div>
    </Halaman>
  );
}
