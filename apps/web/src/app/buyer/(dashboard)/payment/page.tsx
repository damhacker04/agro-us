"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Loader2, ShieldCheck } from "lucide-react";
import { GalatApi, bayarSimulasi } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

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

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Selesaikan Pembayaran</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tagihan <span className="font-mono">{invoice}</span>
        {kedaluwarsa && ` · berlaku sampai ${new Date(kedaluwarsa).toLocaleString("id-ID")}`}
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1">TOTAL TAGIHAN</div>
          <div className="text-3xl font-bold text-gray-900">{rp(jumlah)}</div>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-5">
          <div className="text-xs font-bold text-gray-500 mb-2">
            {metode === "VA" ? "NOMOR VIRTUAL ACCOUNT" : metode === "EWALLET" ? "TAUTAN E-WALLET" : "KODE QRIS"}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm break-all text-gray-800">{payload}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(payload)}
              className="shrink-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-white"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/**
         * Tombol ini MENGGANTIKAN pembayaran sungguhan — memanggil webhook gateway
         * secara langsung. Ada karena payment gateway belum tersambung; begitu tersambung,
         * tombolnya hilang dan status berubah sendiri saat gateway memanggil balik.
         *
         * ⚠️ Webhook-nya juga belum memverifikasi signature, jadi siapa pun yang tahu
         * nomor tagihan bisa menandainya lunas. Aman selama datanya karangan.
         */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
          <p className="text-xs text-amber-900">
            <b>Mode peragaan.</b> Pembayaran belum tersambung ke penyedia sungguhan. Tombol di
            bawah meniru panggilan balik dari gateway saat pembayaran diterima.
          </p>
        </div>

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {galat}
          </p>
        )}

        <button
          onClick={tandaiLunas}
          disabled={proses || !invoice}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Memproses…" : "Saya Sudah Bayar"}
        </button>

        <p className="text-[11px] text-gray-500 mt-3 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-700" />
          Dana ditahan di escrow sampai barang Anda terima. Tenant baru dibayar setelah
          jendela klaim mutu berakhir.
        </p>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat…</div>}>
      <PaymentContent />
    </Suspense>
  );
}
