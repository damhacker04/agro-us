"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COURIER_PIN_LENGTH } from "@agro-os/shared";
import type { ScanTokenResponse } from "@agro-os/shared";
import { GalatApi, periksaToken, verifikasiKodeAntar } from "@/lib/api";
import {
  BarisData,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  Tombol,
} from "@/ui";

/**
 * KR-1 — Pendaratan setelah kurir memindai QR box (§5.6.2, FR-6.2).
 *
 * Kurir TIDAK punya akun. Kredensialnya adalah token di URL ini — yang sengaja hanya
 * DIPERIKSA di sini, belum dikonsumsi. Token baru terpakai saat Kode Antar terverifikasi,
 * supaya kurir yang salah memindai box orang lain tidak menghanguskan QR-nya.
 *
 * MIGRASI DUNIA, dan layar ini punya syarat yang tidak dimiliki halaman pembeli mana pun:
 * ia dibaca sambil BERDIRI, satu tangan, di bawah matahari, pada Android kelas
 * menengah-bawah. Itu sebabnya kertas dingin dan tinta intaglio justru cocok di sini —
 * kontrasnya jauh melampaui kartu putih berbayang yang dulu dipakai — dan sebabnya kode
 * empat digit diset 34px monospace: angka yang harus dibaca ulang sambil menahan box tidak
 * boleh menuntut mata mendekat.
 *
 * Tiga sebab QR ditolak sekarang dibedakan (`TOKEN_UNKNOWN`, `TOKEN_CONSUMED`,
 * `TOKEN_LOCKED`). Server sudah mengirimkannya sejak dulu dan halaman lama membuangnya
 * menjadi satu kalimat merah — padahal langkah keluarnya berbeda-beda, dan kurir yang
 * berdiri di depan pagar orang butuh langkah, bukan diagnosis.
 */

const SEBAB: Record<
  NonNullable<ScanTokenResponse["code"]>,
  { judul: string; langkah: string }
> = {
  TOKEN_UNKNOWN: {
    judul: "QR ini tidak dikenal",
    // Tidak mengulang "hubungi penjual" — pesan server sudah mengatakannya, dan dua kalimat
    // berturut-turut yang menyuruh hal sama membuat langkah yang BARU tenggelam.
    langkah:
      "Pastikan yang Anda pindai adalah stiker QR AgroUs pada box, bukan label pengirim lain.",
  },
  TOKEN_CONSUMED: {
    judul: "QR ini sudah dipakai",
    langkah:
      "Pengantaran untuk box ini sudah pernah dibuka. Bila Anda yang sedang membawanya, minta penjual menerbitkan QR baru — satu QR hanya membuka satu sesi antar.",
  },
  TOKEN_LOCKED: {
    judul: "QR terkunci",
    langkah:
      "Percobaan kode sudah habis, jadi QR ini dikunci demi keamanan pemilik barang. Penjual harus menerbitkan kode dan QR baru sebelum pengantaran bisa dilanjutkan.",
  },
};

export default function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const router = useRouter();

  const [info, setInfo] = useState<ScanTokenResponse | null>(null);
  const [kode, setKode] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState(""); //

  useEffect(() => {
    periksaToken(token)
      .then(setInfo)
      .catch((e) =>
        setInfo({
          valid: false,
          message: e instanceof GalatApi ? e.message : "QR tidak dapat diperiksa.",
        }),
      )
      .finally(() => setMemuat(false));
  }, [token]);

  async function kirimKode(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      const sesi = await verifikasiKodeAntar(token, kode);
      // sessionId adalah kredensial berikutnya — disimpan di sessionStorage, bukan
      // localStorage: sesi antar berumur satu perjalanan, dan ponsel kurir bisa saja
      // dipakai bergantian.
      sessionStorage.setItem("agrous.kurir", JSON.stringify(sesi));
      router.push("/courier/tracking");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Kode tidak dapat diverifikasi.");
      setKode("");
      setProses(false);
      // Sisa percobaan berkurang di server; ambil ulang supaya angkanya jujur.
      periksaToken(token)
        .then(setInfo)
        .catch(() => undefined);
    }
  }

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Memeriksa QR" className="min-h-screen">
        <Memuat baris={2} label="Memeriksa QR box" />
      </Halaman>
    );
  }

  if (!info?.valid) {
    const sebab = info?.code ? SEBAB[info.code] : null;
    return (
      <Halaman lebar="sempit" judul="Pengantaran belum bisa dibuka" className="min-h-screen">
        <Galat judul={sebab?.judul ?? "QR ditolak"}>
          {info?.message ?? "QR tidak dikenal."} {sebab?.langkah}
        </Galat>
        <Sunyi className="mt-6">
          Tidak ada aplikasi yang perlu dipasang untuk mengulang: pindai QR baru dengan kamera
          ponsel Anda seperti tadi.
        </Sunyi>
      </Halaman>
    );
  }

  const sisa = info.remainingAttempts ?? 0;
  const menipis = sisa <= 2;

  return (
    <Halaman lebar="sempit" judul="Kode Antar" className="min-h-screen">
      {/* Ditampilkan SEBELUM kode diminta, dan tetap begitu: kurir harus bisa memastikan
          box-nya benar tanpa mengorbankan satu percobaan. */}
      <Panel nada="utama" label="QR sah" judul="Cocokkan dulu dengan box di tangan Anda">
        {/* Ditumpuk, BUKAN dua kolom. `Deret kolom={2}` menahan dua kolom di segala lebar —
            benar untuk angka pendek yang dibaca berpasangan, salah untuk alamat: pada 375px
            tujuannya pecah jadi empat baris selebar 150px, dan justru baris itulah yang harus
            dicocokkan kurir dengan label di box. */}
        <dl className="space-y-4">
          <BarisData label="Dikirim oleh" prosa>
            {info.tenantName}
          </BarisData>
          <BarisData label="Tujuan" prosa>
            {info.destinationLabel}
          </BarisData>
        </dl>
        <Sunyi className="mt-5 text-[13px]">
          Memeriksa di layar ini tidak mengurangi sisa percobaan. Yang mengurangi hanya kode
          yang salah.
        </Sunyi>
      </Panel>

      <form onSubmit={kirimKode} className="mt-8">
        <Panel label="Kode Antar" judul={`${COURIER_PIN_LENGTH} digit dari penjual`}>
          <Prosa className="text-[15px]">
            Kode diberikan lisan oleh penjual dan sengaja tidak tertempel di box — kalau ia
            menempel di sana, siapa pun yang memegang box bisa membuka pengantarannya.
          </Prosa>

          <Medan
            label="Masukkan kode"
            galat={galat || undefined}
            wajib
            className="mt-6"
          >
            {(alat) => (
              <Masukan
                {...alat}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={COURIER_PIN_LENGTH}
                value={kode}
                onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="py-4 text-center font-mono text-[34px] leading-none tracking-[0.35em]"
              />
            )}
          </Medan>

          {/* Sisa percobaan naik jadi keadaan berwarna hanya ketika benar-benar menipis.
              Peringatan yang menyala sejak percobaan pertama berhenti menandai apa pun. */}
          {menipis ? (
            <div className="mt-5 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">Sisa {sisa} percobaan</Label>
              <Prosa className="mt-1.5 text-[14px]">
                Habis percobaan, QR ini terkunci dan penjual harus menerbitkan kode baru.
                Pastikan kodenya benar sebelum menekan tombol.
              </Prosa>
            </div>
          ) : (
            <Sunyi className="mt-5 text-[13px]">
              Sisa <span className="font-mono text-tinta">{sisa}</span> percobaan. Habis
              percobaan, QR terkunci dan penjual harus menerbitkan kode baru.
            </Sunyi>
          )}

          <Tombol
            type="submit"
            penuh
            className="mt-7 py-4 text-[16px]"
            sibuk={proses}
            labelSibuk="Memverifikasi…"
            disabled={kode.length !== COURIER_PIN_LENGTH}
          >
            Mulai pengantaran
          </Tombol>
        </Panel>
      </form>
    </Halaman>
  );
}
