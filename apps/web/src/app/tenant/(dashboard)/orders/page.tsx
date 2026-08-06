"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Package, QrCode } from "lucide-react";
import { GalatApi, ambilPesananTenant } from "@/lib/api";
import type { ShipmentStatus, TenantOrderSummary } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const TAHAP: Record<ShipmentStatus, { label: string; kelas: string }> = {
  MENUNGGU_PANEN: { label: "Menunggu Panen", kelas: "bg-gray-100 text-gray-700" },
  PANEN: { label: "Siap Kirim", kelas: "bg-lime-100 text-lime-800" },
  DIKIRIM: { label: "Dikirim", kelas: "bg-blue-100 text-blue-800" },
  TIBA_DI_LOKASI: { label: "Tiba di Lokasi", kelas: "bg-amber-100 text-amber-900" },
  DITERIMA: { label: "Diterima", kelas: "bg-emerald-100 text-emerald-800" },
  SELESAI: { label: "Selesai", kelas: "bg-emerald-700 text-white" },
  DIBATALKAN: { label: "Dibatalkan", kelas: "bg-red-100 text-red-800" },
};

export default function TenantOrdersPage() {
  const [pesanan, setPesanan] = useState<TenantOrderSummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesananTenant()
      .then((d) => { setPesanan(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat pesanan"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat pesanan…</div>;
  if (galat)
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{galat}</div>
      </div>
    );

  if (!pesanan.length)
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada pesanan masuk</h2>
          <p className="text-sm text-gray-500">
            Pesanan muncul setelah pembeli membayar kuota yang Anda buka.
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-6">Pesanan Masuk</h1>

      <div className="space-y-3">
        {pesanan.map((o) => {
          const t = TAHAP[o.status];
          return (
            <Link
              key={o.shipmentId}
              href={`/tenant/orders/${o.shipmentId}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900">{o.buyerName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.zoneName} · dipesan {tgl(o.createdAt)} · siap {tgl(o.readyDate)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${t.kelas}`}>
                    {t.label}
                  </span>
                  {/* QR baru bisa dicetak setelah seluruh batch berstatus Panen — penanda ini
                      mencegah Tenant menekan tombolnya lalu kena penolakan tanpa tahu sebabnya. */}
                  {o.qrIssued && (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                      <QrCode className="w-3 h-3" /> QR sudah terbit
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-700">
                {o.lines.map((l) => (
                  <div key={l.batchId} className="flex justify-between py-0.5">
                    <span>
                      {l.productName} × {l.qtyBox} box
                    </span>
                    <span className="text-gray-500">{rp(l.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-gray-900 pt-2 mt-2 border-t border-gray-100">
                <span className="text-sm">Total</span>
                <span>{rp(o.subtotal)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
