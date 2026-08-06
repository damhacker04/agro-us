"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ShieldAlert,
  User,
} from "lucide-react";
import type { BoxQrItem, ShipmentStatus, TenantOrderDetail } from "@agro-os/shared";
import {
  GalatApi,
  ambilLembarQr,
  ambilPesananTenantSatu,
  terbitkanQr,
  terbitkanUlangKodeAntar,
} from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const TAHAP: Record<ShipmentStatus, { label: string; kelas: string }> = {
  MENUNGGU_PANEN: { label: "Menunggu Panen", kelas: "bg-gray-100 text-gray-700" },
  PANEN: { label: "Panen", kelas: "bg-lime-100 text-lime-800" },
  DIKIRIM: { label: "Dikirim", kelas: "bg-blue-100 text-blue-800" },
  TIBA_DI_LOKASI: { label: "Tiba di Lokasi", kelas: "bg-amber-100 text-amber-900" },
  DITERIMA: { label: "Diterima", kelas: "bg-emerald-100 text-emerald-800" },
  SELESAI: { label: "Selesai", kelas: "bg-emerald-700 text-white" },
  DIBATALKAN: { label: "Dibatalkan", kelas: "bg-red-100 text-red-800" },
};

export default function TenantOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: shipmentId } = React.use(params);

  const [pesanan, setPesanan] = useState<TenantOrderDetail | null>(null);
  const [boxes, setBoxes] = useState<BoxQrItem[]>([]);
  const [kodeAntar, setKodeAntar] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatQr, setGalatQr] = useState("");

  useEffect(() => {
    ambilPesananTenantSatu(shipmentId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
        // Lembar cetak ulang hanya ada bila QR pernah diterbitkan; kegagalan di sini
        // bukan kegagalan halaman.
        if (d.qrIssued) {
          ambilLembarQr(shipmentId)
            .then((s) => setBoxes(s.boxes))
            .catch(() => setBoxes([]));
        }
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [shipmentId]);

  async function cetakQr() {
    setProses(true);
    setGalatQr("");
    try {
      const r = await terbitkanQr(shipmentId);
      setBoxes(r.boxes);
      setKodeAntar(r.courierCode);
      setPesanan((p) => (p ? { ...p, qrIssued: true } : p));
    } catch (e) {
      setGalatQr(e instanceof GalatApi ? e.message : "Gagal menerbitkan QR.");
    } finally {
      setProses(false);
    }
  }

  async function kodeBaru() {
    setProses(true);
    setGalatQr("");
    try {
      const r = await terbitkanUlangKodeAntar(shipmentId);
      setKodeAntar(r.courierCode);
    } catch (e) {
      setGalatQr(e instanceof GalatApi ? e.message : "Gagal menerbitkan kode baru.");
    } finally {
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat pesanan…</div>;

  if (galat || !pesanan) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Pesanan tidak ditemukan"}
        </div>
      </div>
    );
  }

  const t = TAHAP[pesanan.status];

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/tenant/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Pesanan Masuk
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">{pesanan.buyerName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pesanan.zoneName} · dipesan {tgl(pesanan.createdAt)} · siap {tgl(pesanan.readyDate)}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full ${t.kelas}`}>
          {t.label}
        </span>
      </div>

      {/* Identitas penerima — Tenant perlu tahu siapa yang berhak menerima di lokasi. */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-emerald-950 mb-3 text-sm">Tujuan Pengiriman</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            {pesanan.recipient.name}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {pesanan.recipient.phone}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            Jam terima {pesanan.recipient.receivingHours}
          </div>
          {pesanan.recipient.landmark && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              {pesanan.recipient.landmark}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-emerald-950 mb-3 text-sm">Item Anda</h2>
        <div className="space-y-3">
          {pesanan.lines.map((l) => (
            <div
              key={l.orderItemId}
              className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">
                  {l.productName}{" "}
                  <span className="text-xs font-normal text-gray-500">Grade {l.grade}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {l.qtyBox} box × {rp(l.unitPriceLocked)}
                  {/* Selisih janji vs realisasi adalah shortfall — angka yang menentukan
                      rasio publik Tenant, jadi ditampilkan apa adanya. */}
                  {l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox && (
                    <span className="text-red-700 font-semibold">
                      {" "}
                      · terpenuhi {l.qtyBoxFulfilled} box
                    </span>
                  )}
                </div>
              </div>
              <div className="font-bold text-sm text-gray-900 shrink-0">{rp(l.subtotal)}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Nilai bagian Anda</span>
          <span className="font-bold text-lg text-gray-900">{rp(pesanan.subtotal)}</span>
        </div>
      </div>

      {/* ---------- QR & Kode Antar ---------- */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h2 className="font-bold text-emerald-950 text-sm">QR Box &amp; Kode Antar</h2>
          {pesanan.qrIssued && (
            <button
              onClick={kodeBaru}
              disabled={proses}
              className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
            >
              Terbitkan kode antar baru
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Satu QR per box fisik. Kode Antar 4 digit diberikan kepada kurir secara lisan —
          bukan ditempel di box.
        </p>

        {galatQr && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {galatQr}
          </p>
        )}

        {kodeAntar && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-900 mb-1">
                  Kode Antar — ditampilkan sekali
                </div>
                <div className="font-mono text-3xl font-black tracking-[0.3em] text-amber-950">
                  {kodeAntar}
                </div>
                <p className="text-[11px] text-amber-800 mt-1.5">
                  Catat sekarang. Kode ini tidak bisa dilihat lagi setelah halaman ditutup —
                  bila hilang, terbitkan kode baru.
                </p>
              </div>
            </div>
          </div>
        )}

        {!pesanan.qrIssued ? (
          <button
            onClick={cetakQr}
            disabled={proses}
            className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {proses ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            {proses ? "Menerbitkan…" : "Terbitkan QR & Kode Antar"}
          </button>
        ) : boxes.length === 0 ? (
          <p className="text-sm text-gray-500">Memuat lembar QR…</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{boxes.length} box</span>
              <button
                onClick={() => window.print()}
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> Cetak lembar
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {boxes.map((b, i) => (
                <div
                  key={b.tokenId}
                  className={`rounded-lg border p-2 text-center ${
                    b.consumedAt ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.qrDataUrl} alt={`QR box ${i + 1}`} className="w-full" />
                  <div className="text-[10px] text-gray-500 mt-1">
                    Box {i + 1}
                    {b.consumedAt && " · terpindai"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
