"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { GalatApi, ambilPesanan } from "@/lib/api";
import type { OrderSummary, ShipmentStatus } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

/** Enam tahap pengiriman (§5.6.1) — warnanya menandakan apakah pembeli perlu bertindak. */
const TAHAP: Record<ShipmentStatus, { label: string; kelas: string }> = {
  MENUNGGU_PANEN: { label: "Menunggu Panen", kelas: "bg-gray-100 text-gray-700" },
  PANEN: { label: "Panen", kelas: "bg-lime-100 text-lime-800" },
  DIKIRIM: { label: "Dikirim", kelas: "bg-blue-100 text-blue-800" },
  TIBA_DI_LOKASI: { label: "Perlu Konfirmasi", kelas: "bg-amber-100 text-amber-900" },
  DITERIMA: { label: "Diterima", kelas: "bg-emerald-100 text-emerald-800" },
  SELESAI: { label: "Selesai", kelas: "bg-emerald-700 text-white" },
  DIBATALKAN: { label: "Dibatalkan", kelas: "bg-red-100 text-red-800" },
};

export default function OrdersPage() {
  const [pesanan, setPesanan] = useState<OrderSummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesanan()
      .then((d) => { setPesanan(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat pesanan"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat pesanan…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  if (!pesanan.length) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada pesanan</h2>
          <Link
            href="/buyer/region"
            className="inline-block mt-3 text-sm font-semibold text-emerald-700 hover:underline"
          >
            Mulai belanja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-6">Pesanan Saya</h1>

      <div className="space-y-4">
        {pesanan.map((o) => (
          <Link
            key={o.id}
            href={`/buyer/orders/${o.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="font-mono text-xs text-gray-400">
                  #{o.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{tgl(o.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{rp(o.totalAmount)}</div>
                {o.payment && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {o.payment.status === "PAID" ? "Lunas" : "Menunggu pembayaran"} ·{" "}
                    {o.payment.method}
                  </div>
                )}
              </div>
            </div>

            {/* Satu pesanan bisa jadi beberapa pengiriman — dikelompokkan per minggu panen
                (FR-2.4), jadi tiap pengiriman punya status dan tanggal siapnya sendiri. */}
            <div className="space-y-2">
              {o.shipments.map((s, i) => {
                const t = TAHAP[s.status];
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5"
                  >
                    <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 truncate">
                        {s.productNames.length ? s.productNames.join(", ") : `${s.itemCount} item`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Pengiriman {i + 1} · siap {tgl(s.readyDate)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${t.kelas}`}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
