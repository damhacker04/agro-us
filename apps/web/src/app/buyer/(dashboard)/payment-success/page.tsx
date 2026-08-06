"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Hourglass, ShieldCheck } from "lucide-react";
import type { BuyerOrderDetail } from "@agro-os/shared";
import { GalatApi, ambilPesananSatu } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function IsiHalaman() {
  const orderId = useSearchParams().get("pesanan") ?? "";

  const [pesanan, setPesanan] = useState<BuyerOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(Boolean(orderId));
  const [galat, setGalat] = useState("");

  useEffect(() => {
    if (!orderId) return;
    ambilPesananSatu(orderId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat pesanan"))
      .finally(() => setMemuat(false));
  }, [orderId]);

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center">
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-10 shadow-sm flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center mb-6 shadow-md">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>

        <h1 className="text-3xl font-black text-emerald-900 mb-3 tracking-tight">
          Pembayaran Berhasil!
        </h1>
        <p className="text-sm text-gray-600 mb-10 text-center max-w-sm">
          Terima kasih, pembayaran Anda
          {pesanan && (
            <>
              {" "}
              untuk{" "}
              <strong>Pesanan #{pesanan.orderId.slice(0, 8).toUpperCase()}</strong>
            </>
          )}{" "}
          telah kami terima.
        </p>

        <div className="w-full bg-[#f0f5ff] border border-[#e0ebff] rounded-xl p-5 mb-8 flex gap-4">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 text-xs tracking-wider mb-1 uppercase">
              Dana Diamankan di Escrow
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Dana{pesanan ? ` sebesar ${rp(pesanan.totalAmount)}` : ""} ditahan oleh sistem
              AgroUs. Dana baru diteruskan ke Tenant setelah Anda mengonfirmasi penerimaan dan
              jendela klaim mutu berakhir.
            </p>
          </div>
        </div>

        {memuat && <p className="text-sm text-gray-500 mb-8">Memuat ringkasan pesanan…</p>}

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-8">
            {galat}
          </p>
        )}

        {pesanan && (
          <>
            <div className="w-full border border-gray-200 rounded-xl p-6 mb-8">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Ringkasan Pesanan</h2>

              <div className="space-y-3 mb-6">
                {pesanan.shipments.flatMap((s) =>
                  s.lines.map((l) => (
                    <div key={l.orderItemId} className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-900 truncate">
                          {l.productName}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {l.tenantName} · {rp(l.unitPriceLocked)} × {l.qtyBox} box
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 shrink-0">
                        {rp(l.subtotal)}
                      </div>
                    </div>
                  )),
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
                <span className="text-xl font-bold text-emerald-950">
                  {rp(pesanan.totalAmount)}
                </span>
              </div>
              {/* Selisih total dengan jumlah item adalah ongkir dan add-on laporan.
                  Rinciannya tidak ikut di kontrak detail pesanan, jadi tidak dikarang. */}
            </div>

            {/* Satu pesanan bisa jadi beberapa pengiriman — dikelompokkan per minggu
                panen (FR-2.4), masing-masing punya tanggal siapnya sendiri. */}
            <div className="w-full space-y-4 mb-8">
              {pesanan.shipments.map((s, i) => (
                <div
                  key={s.shipmentId}
                  className="bg-gray-50 border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-gray-600">
                      Pengiriman {i + 1} dari {pesanan.shipments.length}
                    </span>
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200">
                      <Hourglass className="w-3 h-3" /> {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Estimasi siap <strong className="text-gray-900">{tgl(s.readyDate)}</strong> ·{" "}
                    {s.lines.map((l) => l.productName).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="w-full space-y-3">
          <Link
            href={pesanan ? `/buyer/orders/${pesanan.orderId}` : "/buyer/orders"}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-semibold bg-emerald-950 text-white hover:bg-emerald-900 transition shadow-sm"
          >
            Lihat Status Pesanan
          </Link>
          <Link
            href="/buyer/catalog"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BuyerPaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat…</div>}>
      <IsiHalaman />
    </Suspense>
  );
}
