"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GalatApi, checkout } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import { bacaKeranjang, kosongkanKeranjang, type BarisKeranjang } from "@/lib/keranjang";
import {
  GEOFENCE_RADIUS_M,
  TRACEABILITY_REPORT_FEE,
  type PaymentMethod,
} from "@agro-os/shared";
import {
  Centang,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Panel,
  Prosa,
  Radio,
  Sunyi,
  Tombol,
} from "@/ui";

/**
 * BY-8 — Detail pengiriman dan pembayaran.
 *
 * Dua angka di halaman ini DIIMPOR, tidak ditulis ulang:
 *
 * - `TRACEABILITY_REPORT_FEE` sebelumnya ditulis dua kali secara terpisah — sekali di
 *   `order.service.ts` yang benar-benar menagihnya, sekali di sini yang menampilkannya.
 *   Angka yang ditagihkan ke pembeli tidak boleh punya dua sumber: begitu salah satunya
 *   berubah, pembeli menyetujui satu angka dan membayar angka lain.
 * - `GEOFENCE_RADIUS_M` menentukan kapan konfirmasi otomatis terpicu, dan itu aturan yang
 *   dijalankan server.
 */
const METODE: { nilai: PaymentMethod; judul: string; jelas: string }[] = [
  { nilai: "QRIS", judul: "QRIS", jelas: "Pindai dari aplikasi bank atau dompet digital mana pun." },
  { nilai: "VA", judul: "Virtual account", jelas: "Transfer ke nomor rekening khusus tagihan ini." },
  { nilai: "EWALLET", judul: "E-wallet", jelas: "Bayar lewat tautan dompet digital." },
];

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
        // Dibawa terus sampai halaman sukses: tanpa ini halaman itu tidak tahu
        // pesanan mana yang baru saja dibayar dan hanya bisa menampilkan angka karangan.
        pesanan: res.orderId,
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
    <Halaman
      judul="Detail pengiriman"
      pengantar="Titik lokasi dan nama penerima menentukan bagaimana serah terima diverifikasi — keduanya dipakai kurir, bukan hanya dicatat."
    >
      <form onSubmit={bayar} className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Panel label="Penerima" judul="Siapa yang menerima barang">
            <div className="grid gap-5 sm:grid-cols-2">
              <Medan
                label="Nama penerima"
                petunjuk="Kurir menyerahkan barang kepada orang ini."
                wajib
              >
                {(alat) => (
                  <Masukan
                    {...alat}
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama orang yang menerima"
                    autoComplete="name"
                  />
                )}
              </Medan>
              <Medan label="Telepon penerima" wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    type="tel"
                    inputMode="numeric"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    autoComplete="tel"
                  />
                )}
              </Medan>
              <Medan label="Patokan alamat" petunjuk="Opsional, tetapi menghemat waktu kurir.">
                {(alat) => (
                  <Masukan
                    {...alat}
                    value={patokan}
                    onChange={(e) => setPatokan(e.target.value)}
                    placeholder="Sebelah masjid, pagar hijau"
                  />
                )}
              </Medan>
              <Medan label="Jam terima" petunjuk="Kurir menyesuaikan jadwalnya dengan jam ini." wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    placeholder="08:00-16:00"
                  />
                )}
              </Medan>
            </div>
          </Panel>

          <Panel label="Titik antar" judul="Koordinat tujuan">
            <div className="grid gap-5 sm:grid-cols-2">
              <Medan label="Lintang" wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    inputMode="decimal"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="font-mono"
                  />
                )}
              </Medan>
              <Medan label="Bujur" wajib>
                {(alat) => (
                  <Masukan
                    {...alat}
                    inputMode="decimal"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="font-mono"
                  />
                )}
              </Medan>
            </div>
            <Sunyi className="mt-4 text-[13px]">
              Status Tiba tidak ditekan kurir, melainkan terpicu jaraknya sendiri ke titik ini —
              dalam radius <span className="font-mono text-tinta">{GEOFENCE_RADIUS_M} m</span>.
              Titik yang meleset membuat serah terima tidak bisa ditutup otomatis.
            </Sunyi>
          </Panel>

          {/**
           * FR-2.10 — Laporan Ketertelusuran dibundel ke tagihan yang sama.
           * Kotaknya sengaja TIDAK tercentang secara bawaan: mencentangkan otomatis
           * membuat orang membayar sesuatu yang tidak pernah ia pilih, dan itu bertentangan
           * dengan seluruh nilai jual produk ini.
           */}
          <Centang
            checked={laporan}
            onChange={(e) => setLaporan(e.target.checked)}
            judul={
              <>
                Laporan ketertelusuran{" "}
                <span className="font-mono text-ungu">+{rupiah(TRACEABILITY_REPORT_FEE)}</span>
              </>
            }
          >
            Berkas PDF berisi rantai bukti lengkap pesanan ini, untuk audit atau pemasaran.
            Timeline, foto bukti, dan verifikasi satelit tetap bisa Anda lihat gratis tanpa ini —
            yang dibeli adalah dokumennya, bukan aksesnya. Hanya bisa dipilih sekarang.
          </Centang>
        </div>

        <div className="space-y-8">
          <div>
            <Label className="mb-3">Metode pembayaran</Label>
            <fieldset className="space-y-2">
              <legend className="sr-only">Metode pembayaran</legend>
              {METODE.map((m) => (
                <Radio
                  key={m.nilai}
                  nama="metode"
                  nilai={m.nilai}
                  terpilih={metode === m.nilai}
                  onPilih={(v) => setMetode(v as PaymentMethod)}
                  judul={m.judul}
                >
                  {m.jelas}
                </Radio>
              ))}
            </fieldset>
          </div>

          <Panel padat label="Ringkasan" judul="Yang akan ditagihkan">
            <dl className="space-y-1.5 text-[14px]">
              <div className="flex justify-between gap-4">
                <dt className="text-tinta-lembut">Barang</dt>
                <dd className="font-mono text-tinta">{rupiah(totalBarang)}</dd>
              </div>
              {laporan ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-tinta-lembut">Laporan ketertelusuran</dt>
                  <dd className="font-mono text-tinta">{rupiah(TRACEABILITY_REPORT_FEE)}</dd>
                </div>
              ) : null}
            </dl>
            <Sunyi className="mt-3 text-[12px]">
              Ongkir dihitung server per pengiriman dan muncul di tagihan.
            </Sunyi>

            {galat ? (
              <Galat judul="Pesanan tidak dibuat" className="mt-4">
                {galat}
              </Galat>
            ) : null}

            <Tombol
              type="submit"
              penuh
              className="mt-5"
              sibuk={proses}
              labelSibuk="Menerbitkan tagihan…"
            >
              Buat pesanan
            </Tombol>
            <Prosa className="mt-3 text-[12px]">
              Dana ditahan di escrow, bukan diteruskan ke produsen. Ia baru berpindah setelah
              barang Anda terima dan jendela klaim mutu berakhir.
            </Prosa>
          </Panel>
        </div>
      </form>
    </Halaman>
  );
}
