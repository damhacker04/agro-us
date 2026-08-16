"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GalatApi, mintaOtp, verifikasiOtp } from "@/lib/api";
import { berandaPeran, simpanSesi } from "@/lib/auth";
import { OTP_LENGTH } from "@agro-os/shared";
import { Galat, Halaman, Label, Panel, Prosa, Sunyi, TautanKembali, Tombol } from "@/ui";

/**
 * Verifikasi kode masuk. Dipakai ketiga peran.
 *
 * Kotak OTP diset monospace: enam digit yang dibaca ulang dari layar ponsel adalah nilai
 * terukur, dan monospace membuat tiap digit menempati kolom yang sama sehingga posisi
 * kesalahan ketik terlihat tanpa dihitung.
 *
 * Ikon perisai di puncak kartu dibuang. Halaman ini dibuka orang yang sedang menunggu
 * pesan masuk; satu glif dekoratif di atas judul menunda kalimat yang benar-benar mereka
 * butuhkan — ke mana kodenya dikirim.
 */
function VerifyContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const phone = sp.get("phone") ?? "";
  const peran = (sp.get("peran") ?? "BUYER") as "BUYER" | "TENANT" | "OPERATOR";
  const kodeDemo = sp.get("kode");

  // Panjang kotak mengikuti OTP_LENGTH dari kontrak bersama. Rancangan awal memakai
  // 4 kotak sementara server menerbitkan 6 digit — kodenya tidak akan pernah muat.
  const [digit, setDigit] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) router.replace("/");
  }, [phone, router]);

  // Kode peragaan diisikan otomatis supaya penguji tidak perlu membuka log server.
  useEffect(() => {
    if (kodeDemo && kodeDemo.length === OTP_LENGTH) setDigit(kodeDemo.split(""));
  }, [kodeDemo]);

  useEffect(() => {
    if (sisaDetik <= 0) return;
    const t = setTimeout(() => setSisaDetik((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisaDetik]);

  function isi(i: number, nilai: string) {
    const bersih = nilai.replace(/\D/g, "");
    if (!bersih) return;
    const baru = [...digit];
    // Tempel seluruh kode sekaligus juga didukung — orang biasanya menyalin dari pesan.
    if (bersih.length > 1) {
      bersih
        .slice(0, OTP_LENGTH)
        .split("")
        .forEach((c, idx) => (baru[idx] = c));
      setDigit(baru);
      refs.current[Math.min(bersih.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    baru[i] = bersih;
    setDigit(baru);
    if (i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function mundur(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digit[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    const kode = digit.join("");
    if (kode.length !== OTP_LENGTH) return;
    setGalat("");
    setProses(true);
    try {
      // `role` hanya dipakai server saat nomor BELUM terdaftar (registrasi); saat login
      // nilai ini diabaikan, jadi aman selalu dikirim.
      const res = await verifikasiOtp({
        phone,
        code: kode,
        ...(peran === "OPERATOR" ? {} : { role: peran }),
      });
      simpanSesi(res.accessToken, res.user);
      router.push(berandaPeran(res.user.role));
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Kode tidak sesuai.");
      setProses(false);
    }
  }

  async function kirimUlang() {
    setGalat("");
    try {
      const res = await mintaOtp(phone);
      setSisaDetik(res.resendAfterSec);
      if (res.devOtp) setDigit(res.devOtp.split(""));
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal mengirim ulang.");
    }
  }

  const lengkap = digit.join("").length === OTP_LENGTH;

  return (
    <Halaman
      lebar="sempit"
      kembali={
        <button
          type="button"
          onClick={() => router.back()}
          className="-my-2 inline-flex items-center gap-2 py-2 text-[13px] font-semibold text-tinta-lembut transition-colors duration-150 hover:text-ungu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          Ganti nomor
        </button>
      }
    >
      <Panel label="Verifikasi" judul="Masukkan kode masuk" nada="utama">
        <Prosa className="text-[14px]">
          Kode {OTP_LENGTH} digit dikirim ke <span className="font-mono text-tinta">{phone}</span>.
        </Prosa>

        {kodeDemo ? (
          <div className="mt-5 border-t-2 border-biru pt-3">
            <Label className="text-biru">Mode peragaan</Label>
            <Sunyi className="mt-1.5 text-[13px]">
              Kodenya diisikan otomatis supaya penguji tidak perlu membuka log server. Di
              layanan sungguhan kode hanya dikirim lewat WhatsApp atau SMS.
            </Sunyi>
          </div>
        ) : null}

        <form onSubmit={verifikasi} className="mt-6 space-y-5">
          <fieldset>
            <Label as="legend" className="mb-2">
              Kode masuk
            </Label>
            <div className="flex gap-2">
              {digit.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_LENGTH}
                  value={d}
                  onChange={(e) => isi(i, e.target.value)}
                  onKeyDown={(e) => mundur(i, e)}
                  /* Tiap kotak dinamai sendiri. Tanpa ini pembaca layar mengumumkan enam
                     kotak identik tanpa cara mengetahui yang mana sedang diisi. */
                  aria-label={`Digit ke-${i + 1} dari ${OTP_LENGTH}`}
                  className="h-14 w-full min-w-0 border border-kertas-garis bg-kertas-terang text-center font-mono text-[22px] text-tinta transition-colors duration-150 hover:border-tinta-samar focus:border-tinta focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-ungu"
                />
              ))}
            </div>
          </fieldset>

          {galat ? (
            <Galat judul="Kode ditolak">
              {galat} Periksa ulang enam digitnya, atau kirim ulang kode baru di bawah.
            </Galat>
          ) : null}

          <Tombol
            type="submit"
            penuh
            sibuk={proses}
            labelSibuk="Memeriksa…"
            disabled={!lengkap}
          >
            Masuk
          </Tombol>

          <Tombol
            type="button"
            rupa="sunyi"
            penuh
            onClick={kirimUlang}
            disabled={sisaDetik > 0}
          >
            {sisaDetik > 0 ? `Kirim ulang dalam ${sisaDetik} detik` : "Kirim ulang kode"}
          </Tombol>
        </form>
      </Panel>
    </Halaman>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit">
          <Panel judul="Memuat…" />
        </Halaman>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
