"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MapPin } from "lucide-react";
import { GalatApi, checkout } from "@/lib/api";
import { bacaKeranjang, kosongkanKeranjang, type BarisKeranjang } from "@/lib/keranjang";
import type { PaymentMethod } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Biaya laporan ketertelusuran (FR-2.10) — masuk tagihan yang sama, porsi platform. */
const BIAYA_LAPORAN = 25_000;

export default function CheckoutPage() {
  const router = useRouter();
  const [isi, setIsi] = useState<BarisKeranjang[]>([]);
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [patokan, setPatokan] = useState("");
  const [jam, setJam] = useState("08:00-16:00");
  const [lat, setLat] = useState("-7.9666");
  const [lng, setLng] = useState("112.6304");
  const [metode, setMetode] = useState<PaymentMethod>("QRIS");
  const [laporan, setLaporan] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    const baris = bacaKeranjang();
    if (!baris.length) router.replace("/buyer/cart");
    setIsi(baris);
  }, [router]);

  async function bayar(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setProses(true);
    try {
      const res = await checkout({
        lines: isi.map((b) => ({ batchId: b.batchId, qtyBox: b.qtyBox })),
        delivery: {
          recipientName: nama,
          phone: telepon,
          point: { lat: Number(lat), lng: Number(lng) },
          ...(patokan ? { landmark: patokan } : {}),
          receivingHours: jam,
        },
        paymentMethod: metode,
        includeTraceabilityReport: laporan,
      });
      // Kuota sudah direservasi di server; keranjang tidak boleh menyisakan salinannya.
      kosongkanKeranjang();
      const q = new URLSearchParams({
        invoice: res.payment.invoiceRef,
        metode: res.payment.method,
        jumlah: String(res.payment.amount),
        payload: res.payment.payload,
        kedaluwarsa: res.payment.expiresAt,
      });
      router.push(`/buyer/payment?${q.toString()}`);
    } catch (err) {
      // Pesan dari server dipakai apa adanya: MIN_ORDER_NOT_MET dan QUOTA_RACE_LOST
      // sudah menjelaskan sebab dan langkah selanjutnya lebih baik daripada kalimat umum.
      setGalat(err instanceof GalatApi ? err.message : "Checkout gagal. Coba lagi.");
      setProses(false);
    }
  }

  const totalBarang = isi.reduce((s, b) => s + b.unitPriceLocked * b.qtyBox, 0);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-6">Detail Pengiriman</h1>

      <form onSubmit={bayar} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nama penerima
              </label>
              <input
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama orang yang menerima barang"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Kurir akan menyerahkan barang kepada orang ini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Telepon penerima
              </label>
              <input
                required
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Titik lokasi
              </label>
              <div className="flex gap-2">
                <input
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Konfirmasi otomatis dipicu saat kurir masuk radius 100 m dari titik ini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Patokan alamat <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <input
                value={patokan}
                onChange={(e) => setPatokan(e.target.value)}
                placeholder="Sebelah masjid, pagar hijau"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Jam operasional penerimaan
              </label>
              <input
                required
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                placeholder="08:00-16:00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/**
           * FR-2.10 — Laporan Ketertelusuran dibundel ke tagihan yang sama.
           * Kotaknya sengaja TIDAK tercentang secara bawaan: mencentangkan otomatis
           * membuat orang membayar sesuatu yang tidak pernah ia pilih, dan itu bertentangan
           * dengan seluruh nilai jual produk ini.
           */}
          <label className="flex gap-3 bg-white border border-gray-200 rounded-xl p-5 cursor-pointer">
            <input
              type="checkbox"
              checked={laporan}
              onChange={(e) => setLaporan(e.target.checked)}
              className="mt-1 w-4 h-4 accent-emerald-700"
            />
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <FileText className="w-4 h-4 text-emerald-700" />
                Laporan Ketertelusuran
                <span className="text-emerald-800">+{rp(BIAYA_LAPORAN)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Berkas PDF berisi rantai bukti lengkap pesanan ini untuk audit atau pemasaran.
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                Timeline, foto bukti, dan verifikasi satelit tetap bisa Anda lihat gratis tanpa
                ini. Yang dibeli adalah dokumennya, bukan aksesnya.{" "}
                <b>Hanya bisa dipilih sekarang.</b>
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-sm text-gray-900 mb-3">Metode Pembayaran</h3>
            <div className="space-y-2">
              {(["QRIS", "VA", "EWALLET"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm cursor-pointer ${
                    metode === m ? "border-emerald-600 bg-emerald-50" : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    checked={metode === m}
                    onChange={() => setMetode(m)}
                    className="accent-emerald-700"
                  />
                  {m === "VA" ? "Virtual Account" : m === "EWALLET" ? "E-Wallet" : "QRIS"}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Barang</span>
                <span>{rp(totalBarang)}</span>
              </div>
              {laporan && (
                <div className="flex justify-between text-gray-600">
                  <span>Laporan</span>
                  <span>{rp(BIAYA_LAPORAN)}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 pt-1">Ongkir dihitung server per pengiriman.</p>
            </div>

            {galat && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={proses}
              className="w-full mt-4 bg-emerald-950 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {proses && <Loader2 className="w-4 h-4 animate-spin" />}
              {proses ? "Menerbitkan tagihan…" : "Buat Pesanan"}
            </button>

            <p className="text-[11px] text-gray-400 mt-2 text-center">
              Dana ditahan di escrow, tidak langsung diteruskan ke Tenant.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
