"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { GalatApi, bayarSimulasi } from "@/lib/api";
import { rupiah, tanggalPanjang } from "@/lib/format-id";
import { Galat, Halaman, Ikon, Label, Panel, Prosa, Sunyi, Tombol } from "@/ui";

/**
 * BY-9 — Selesaikan pembayaran.
 *
 * `toLocaleString("id-ID")` untuk tenggat diganti `tanggalPanjang`: ia bergantung pada data
 * ICU runtime, dan halaman ini dirender ulang di klien setelah SSR.
 */
function PaymentContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const invoice = sp.get("invoice") ?? "";
  const metode = sp.get("metode") ?? "QRIS";
  const jumlah = Number(sp.get("jumlah") ?? 0);
  const payload = sp.get("payload") ?? "";
  const kedaluwarsa = sp.get("kedaluwarsa");
  const pesanan = sp.get("pesanan") ?? "";

  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [tersalin, setTersalin] = useState(false);

  async function tandaiLunas() {
    setProses(true);
    setGalat("");
    try {
      await bayarSimulasi(invoice);
      router.push(`/buyer/payment-success${pesanan ? `?pesanan=${pesanan}` : ""}`);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menandai pembayaran.");
      setProses(false);
    }
  }

  async function salin() {
    try {
      await navigator.clipboard?.writeText(payload);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      /* Papan klip ditolak peramban — kodenya tetap terlihat dan bisa disalin manual. */
    }
  }

  const namaPayload =
    metode === "VA" ? "Nomor virtual account" : metode === "EWALLET" ? "Tautan e-wallet" : "Kode QRIS";

  return (
    <Halaman
      lebar="sempit"
      judul="Selesaikan pembayaran"
      pengantar="Dana yang Anda bayarkan ditahan di escrow, bukan diteruskan ke produsen. Ia baru berpindah setelah barang sampai dan jendela klaim mutu berakhir."
    >
      <Panel label={`Tagihan ${invoice}`} judul="Total tagihan" nada="utama">
        <p className="font-mono text-[34px] leading-none text-tinta">{rupiah(jumlah)}</p>
        {kedaluwarsa ? (
          <Sunyi className="mt-3 text-[13px]">
            Berlaku sampai {tanggalPanjang(kedaluwarsa)}.
          </Sunyi>
        ) : null}

        <div className="mt-7 border-t border-kertas-garis pt-4">
          <div className="flex items-start justify-between gap-4">
            <Label>{namaPayload}</Label>
            <button
              type="button"
              onClick={salin}
              className="-mt-1 inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-tinta-lembut transition-colors duration-150 hover:text-ungu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              <Ikon dari={Copy} ukuran="xs" />
              {tersalin ? "Tersalin" : "Salin"}
            </button>
          </div>
          <code className="mt-2 block break-all font-mono text-[14px] leading-relaxed text-tinta">
            {payload}
          </code>
        </div>
      </Panel>

      {/**
       * Tombol ini MENGGANTIKAN pembayaran sungguhan. Ada karena payment gateway belum
       * tersambung; begitu tersambung, tombolnya hilang dan status berubah sendiri saat
       * mitra memanggil balik.
       *
       * Tidak lagi memanggil `/payments/webhook`. Endpoint itu untuk mitra pembayaran,
       * server ke server, dan kini menuntut tanda tangan HMAC. Tombol ini memakai jalur
       * ber-otentikasi yang hanya bisa menandai lunas tagihan milik pembeli ini sendiri.
       */}
      <div className="mt-8 border-t-2 border-biru pt-4">
        <Label className="text-biru">Mode peragaan</Label>
        <Prosa className="mt-2 text-[14px]">
          Pembayaran belum tersambung ke penyedia sungguhan. Tombol di bawah meniru panggilan
          balik dari gateway saat pembayaran diterima — di layanan sungguhan tombol ini tidak
          ada, dan statusnya berubah sendiri.
        </Prosa>
      </div>

      {galat ? (
        <Galat judul="Pembayaran tidak tercatat" className="mt-6">
          {galat} Tagihan Anda belum ditandai lunas dan tidak ada dana yang berpindah — coba
          lagi, atau muat ulang halaman ini.
        </Galat>
      ) : null}

      <Tombol
        penuh
        className="mt-6"
        onClick={tandaiLunas}
        sibuk={proses}
        labelSibuk="Memproses…"
        disabled={!invoice}
      >
        Saya sudah bayar
      </Tombol>
    </Halaman>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit" judul="Selesaikan pembayaran">
          <Panel judul="Memuat…" />
        </Halaman>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
