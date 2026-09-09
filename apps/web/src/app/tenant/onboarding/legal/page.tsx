"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { GalatApi, kirimLegalitas, unggahFoto } from "@/lib/api";
import { Berkas, Galat, Halaman, Medan, Panel, Prosa, Sunyi, Tombol } from "@/ui";

/**
 * Langkah 3 onboarding — dokumen legalitas (FR-1.7).
 *
 * Ditinjau operator, bukan disetujui otomatis. Selama menunggu, Tenant sudah bisa masuk
 * dan menyiapkan produk — yang terkunci hanya pembukaan kuota Pre-Order.
 *
 * MIGRASI DUNIA. Input berkasnya berhenti disembunyikan dengan `display:none`, yang
 * mencabutnya dari urutan tab: pada layar yang meminta dokumen legal, satu-satunya kendali
 * yang ada tidak boleh cuma bisa ditekan tetikus. `Berkas` dari kit menyimpannya dengan
 * `sr-only` dan meminjamkan cincin fokusnya ke label.
 */
export default function TenantOnboardingLegalPage() {
  const router = useRouter();

  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatBerkas, setGalatBerkas] = useState("");

  async function kirim() {
    if (!berkas) {
      return setGalatBerkas("Lampirkan foto dokumennya lebih dulu — tanpa itu tidak ada yang bisa ditinjau.");
    }
    setProses(true);
    setGalat("");
    try {
      const { url } = await unggahFoto(berkas);
      await kirimLegalitas(url);
      router.push("/tenant/onboarding/success");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Dokumen gagal dikirim. Coba lagi.");
      setProses(false);
    }
  }

  return (
    <Halaman
      lebar="sempit"
      judul="Dokumen legalitas"
      pengantar="Foto NIB atau KTP pemilik. Ditinjau operator sebelum Anda bisa membuka kuota Pre-Order — bukan disetujui otomatis, karena pembeli membayar di muka atas nama yang tertera di sini."
    >
      <Panel judul="Unggah dokumen">
        <Medan
          label="Foto dokumen"
          /* Endpoint unggah hanya menerima JPEG/PNG/WebP — disebutkan supaya Tenant tidak
             kebingungan saat PDF-nya ditolak setelah menunggu unggahan selesai. */
          petunjuk="Diterima JPG, PNG, atau WebP. Bila dokumen Anda berupa PDF, fotokan halamannya."
          galat={galatBerkas || undefined}
          wajib
        >
          {(alat) => (
            <Berkas
              {...alat}
              ikon={FileText}
              accept="image/*"
              capture="environment"
              nama={berkas?.name ?? null}
              placeholder="Pilih atau foto dokumen"
              className="py-3.5"
              onChange={(e) => {
                setBerkas(e.target.files?.[0] ?? null);
                setGalatBerkas("");
              }}
            />
          )}
        </Medan>

        <Sunyi className="mt-5 max-w-[68ch] text-[13px]">
          Pastikan nomor dan nama terbaca jelas di foto. Dokumen yang buram adalah sebab
          penolakan yang paling sering, dan setiap penolakan menambah satu putaran tinjauan.
        </Sunyi>
      </Panel>

      {galat ? (
        <Galat judul="Dokumen belum terkirim" className="mt-8">
          {galat}
        </Galat>
      ) : null}

      <Tombol
        penuh
        className="mt-8 py-4 text-[16px]"
        sibuk={proses}
        labelSibuk="Mengirim…"
        onClick={kirim}
      >
        Kirim untuk ditinjau
      </Tombol>
      <Prosa className="mt-3 text-[13px]">
        Setelah terkirim Anda langsung bisa masuk dan menyiapkan produk. Yang menunggu tinjauan
        hanyalah pembukaan kuota Pre-Order.
      </Prosa>
    </Halaman>
  );
}
