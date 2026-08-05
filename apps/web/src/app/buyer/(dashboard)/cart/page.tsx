"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { GalatApi, pratinjauPesanan } from "@/lib/api";
import { bacaKeranjang, hapusDariKeranjang, ubahJumlah, type BarisKeranjang } from "@/lib/keranjang";
import type { PreviewOrderResponse } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function CartPage() {
  const router = useRouter();
  const [isi, setIsi] = useState<BarisKeranjang[]>([]);
  const [pratinjau, setPratinjau] = useState<PreviewOrderResponse | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const hitung = useCallback(async (baris: BarisKeranjang[]) => {
    if (!baris.length) {
      setPratinjau(null);
      return;
    }
    setMemuat(true);
    setGalat(null);
    try {
      // Rencana pengiriman, ongkir, dan pemeriksaan minimum order SELALU dihitung server.
      // Kalau FE ikut menghitung, dua sumber kebenaran akan berselisih dan pembeli
      // melihat angka yang berbeda dengan yang ditagihkan.
      setPratinjau(await pratinjauPesanan({ lines: baris.map((b) => ({ batchId: b.batchId, qtyBox: b.qtyBox })) }));
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menghitung rencana pengiriman");
      setPratinjau(null);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    const muat = () => {
      const baris = bacaKeranjang();
      setIsi(baris);
      void hitung(baris);
    };
    muat();
    window.addEventListener("keranjang:ubah", muat);
    return () => window.removeEventListener("keranjang:ubah", muat);
  }, [hitung]);

  if (!isi.length) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Keranjang masih kosong</h2>
          <p className="text-sm text-gray-500 mb-5">
            Pilih komoditas dari katalog untuk mulai memesan.
          </p>
          <Link
            href="/buyer/region"
            className="inline-block bg-emerald-950 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald-800"
          >
            Lihat Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-6">Keranjang</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {isi.map((b) => (
            <div
              key={b.batchId}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{b.productName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.tenantName} · panen {tgl(b.claimedHarvestDate)}
                </p>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {rp(b.unitPriceLocked)}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    / box ({b.qtyKgPerBox} kg)
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => ubahJumlah(b.batchId, b.qtyBox - 1)}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{b.qtyBox}</span>
                <button
                  onClick={() => ubahJumlah(b.batchId, b.qtyBox + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => hapusDariKeranjang(b.batchId)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {galat && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {galat}
            </div>
          )}

          {memuat && <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />}

          {pratinjau && !memuat && (
            <>
              {/**
               * Rencana Pengiriman (FR-2.4). Item dikelompokkan per MINGGU PANEN, bukan per
               * penjual: barang yang panennya beda minggu tidak mungkin diangkut bersamaan,
               * jadi satu pesanan bisa jadi beberapa pengiriman dengan ongkir masing-masing.
               */}
              {pratinjau.plans.map((p, i) => (
                <div
                  key={p.harvestWeek}
                  className={`rounded-xl border p-4 ${
                    p.meetsMinimum ? "border-gray-200 bg-white" : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-sm text-gray-900">
                      Pengiriman {i + 1} · siap {tgl(p.readyDate)}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal barang</span>
                      <span>{rp(p.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ongkir</span>
                      <span>{rp(p.shippingCost)}</span>
                    </div>
                  </div>

                  {!p.meetsMinimum && (
                    <div className="mt-3 flex gap-2 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        Kurang <b>{rp(p.shortfallToMinimum)}</b> dari minimum{" "}
                        {rp(p.minOrderValue)} untuk pengiriman ini. Minimum dihitung{" "}
                        <b>per pengiriman</b>, bukan per total pesanan, karena ongkir juga
                        timbul per pengiriman.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Total barang</span>
                    <span>{rp(pratinjau.itemsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Total ongkir</span>
                    <span>{rp(pratinjau.shippingTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>{rp(pratinjau.grandTotal)}</span>
                  </div>
                </div>

                <button
                  disabled={!pratinjau.canCheckout}
                  onClick={() => router.push("/buyer/checkout")}
                  className="w-full mt-4 bg-emerald-950 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pratinjau.canCheckout ? "Lanjut ke Pengiriman" : "Ada pengiriman di bawah minimum"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
