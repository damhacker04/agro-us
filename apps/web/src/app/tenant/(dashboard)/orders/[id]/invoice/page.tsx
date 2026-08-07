"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { TenantOrderDetail } from "@agro-os/shared";
import { GalatApi, ambilPesananTenantSatu } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/**
 * Surat jalan / rincian pengiriman untuk Tenant.
 *
 * Yang tercantum HANYA bagian milik Tenant ini — satu pengiriman bisa memuat item
 * beberapa Tenant sekaligus, dan API memang sudah menyaringnya. Ongkir dan add-on
 * laporan tidak ikut: keduanya milik pembeli terhadap AgroUs, bukan pendapatan Tenant,
 * jadi mencantumkannya di sini akan salah dibaca sebagai bagian yang akan diterima.
 */
export default function TenantInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: shipmentId } = React.use(params);

  const [pesanan, setPesanan] = useState<TenantOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesananTenantSatu(shipmentId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [shipmentId]);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (galat || !pesanan) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Pesanan tidak ditemukan"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/tenant/orders/${shipmentId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
        >
          <Printer className="w-4 h-4" /> Cetak
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-black text-emerald-950">Surat Jalan</h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              #{pesanan.shipmentId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Dipesan {tgl(pesanan.createdAt)}</div>
            <div>Siap {tgl(pesanan.readyDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Pembeli
            </div>
            <div className="font-semibold text-gray-900">{pesanan.buyerName}</div>
            <div className="text-gray-600 text-xs mt-0.5">{pesanan.zoneName}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Diterima Oleh
            </div>
            <div className="font-semibold text-gray-900">{pesanan.recipient.name}</div>
            <div className="text-gray-600 text-xs mt-0.5">{pesanan.recipient.phone}</div>
            <div className="text-gray-600 text-xs">
              Jam terima {pesanan.recipient.receivingHours}
            </div>
            {pesanan.recipient.landmark && (
              <div className="text-gray-600 text-xs">{pesanan.recipient.landmark}</div>
            )}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              <th className="text-left font-semibold py-2">Produk</th>
              <th className="text-right font-semibold py-2">Box</th>
              <th className="text-right font-semibold py-2">Harga</th>
              <th className="text-right font-semibold py-2">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {pesanan.lines.map((l) => (
              <tr key={l.orderItemId} className="border-b border-gray-100">
                <td className="py-2.5">
                  <div className="font-medium text-gray-900">{l.productName}</div>
                  <div className="text-xs text-gray-500">Grade {l.grade}</div>
                </td>
                <td className="text-right py-2.5">
                  {l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox ? (
                    <span>
                      {l.qtyBoxFulfilled}
                      <span className="text-xs text-red-700"> / {l.qtyBox}</span>
                    </span>
                  ) : (
                    l.qtyBox
                  )}
                </td>
                <td className="text-right py-2.5">{rp(l.unitPriceLocked)}</td>
                <td className="text-right py-2.5 font-semibold">{rp(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-end pt-2">
          <span className="text-sm font-bold text-gray-700">Nilai bagian Anda</span>
          <span className="text-xl font-black text-emerald-950">{rp(pesanan.subtotal)}</span>
        </div>

        <p className="text-[11px] text-gray-400 mt-6 pt-4 border-t border-gray-100">
          Nilai di atas belum termasuk ongkos kirim dan add-on laporan, yang bukan bagian
          Tenant. Pencairan dana berjalan otomatis setelah jendela klaim mutu berakhir.
        </p>
      </div>
    </div>
  );
}
