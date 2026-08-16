"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GalatApi, mintaOtp } from "@/lib/api";
import { Galat, Halaman, Masukan, Medan, Panel, Prosa, TautanKembali, Tombol } from "@/ui";

/**
 * Masuk dengan NOMOR TELEPON + OTP, bukan email + kata sandi (FR-1.3).
 *
 * Pilihan ini disengaja untuk penggunanya: petani dan pemilik warung jauh lebih terbiasa
 * menerima kode lewat pesan daripada mengingat kata sandi, dan tidak semuanya punya
 * alamat surel aktif. Formulir email/kata sandi di rancangan awal tidak punya padanan
 * apa pun di backend.
 *
 * Satu komponen memikul ketiga peran, jadi memigrasikannya sekali memindahkan seluruh
 * gerbang masuk aplikasi ke dunia Label Sertifikasi.
 */
export function FormMasuk({
  peran,
  judul,
  keterangan,
}: {
  peran: "BUYER" | "TENANT" | "OPERATOR";
  judul: string;
  keterangan: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState("");

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setKirim(true);
    try {
      const res = await mintaOtp(phone);
      const q = new URLSearchParams({ phone, peran });
      // Di lingkungan peragaan server ikut mengembalikan kodenya; dibawa agar penguji
      // tidak perlu membuka log server. Di lingkungan sungguhan field ini tidak ada.
      if (res.devOtp) q.set("kode", res.devOtp);
      router.push(`/auth/verify?${q.toString()}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal mengirim kode. Coba lagi.");
      setKirim(false);
    }
  }

  return (
    <Halaman lebar="sempit" kembali={<TautanKembali href="/">Kembali ke beranda</TautanKembali>}>
      <Panel label="Masuk" judul={judul} nada="utama">
        <Prosa className="text-[14px]">{keterangan}</Prosa>

        <form className="mt-6 space-y-5" onSubmit={masuk} noValidate>
          <Medan
            label="Nomor WhatsApp"
            petunjuk="Kode masuk dikirim ke nomor ini. Tidak ada kata sandi yang perlu diingat."
            wajib
          >
            {(alat) => (
              <Masukan
                {...alat}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
              />
            )}
          </Medan>

          {galat ? (
            <Galat judul="Kode tidak terkirim">
              {galat} Periksa nomornya, lalu coba lagi — belum ada apa pun yang tersimpan.
            </Galat>
          ) : null}

          <Tombol type="submit" penuh sibuk={kirim} labelSibuk="Mengirim kode…">
            Kirim kode masuk
          </Tombol>
        </form>
      </Panel>
    </Halaman>
  );
}
