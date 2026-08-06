"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Layers, Wallet, ArrowRight } from "lucide-react";
import type { BatchResponse, ProductionStatus, TenantOrderSummary } from "@agro-os/shared";
import { GalatApi, ambilBatchTenant, ambilEscrow, ambilPesananTenant } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

type Escrow = Awaited<ReturnType<typeof ambilEscrow>>;

const STATUS_BATCH: { kunci: ProductionStatus; label: string; warna: string }[] = [
  { kunci: "GROWING", label: "Tumbuh", warna: "bg-emerald-700" },
  { kunci: "PLANNING", label: "Perencanaan", warna: "bg-blue-500" },
  { kunci: "HARVESTED", label: "Sudah Panen", warna: "bg-yellow-500" },
  { kunci: "FAILED", label: "Gagal Panen", warna: "bg-red-500" },
];

export default function TenantDashboardPage() {
  const [batch, setBatch] = useState<BatchResponse[]>([]);
  const [pesanan, setPesanan] = useState<TenantOrderSummary[]>([]);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilBatchTenant(), ambilPesananTenant(), ambilEscrow()])
      .then(([b, o, e]) => {
        setBatch(b);
        setPesanan(o);
        setEscrow(e);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat dashboard"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat dashboard…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const aktif = batch.filter(
    (b) => b.productionStatus === "GROWING" || b.productionStatus === "PLANNING",
  );

  // Tindakan yang benar-benar milik Tenant: batch yang tanggal panennya sudah tiba
  // atau lewat tapi belum ditutup dengan catatan PANEN/GAGAL_PANEN. Keputusan
  // substitusi/refund BUKAN milik Tenant — itu hak pembeli setelah shortfall tercatat.
  const hariIni = new Date().setHours(23, 59, 59, 999);
  const perluDipanen = aktif.filter(
    (b) => new Date(b.claimedHarvestDate).getTime() <= hariIni,
  );

  const poAktif = aktif.filter((b) => b.quotaBoxSold > 0);
  const menungguPanen = pesanan.filter((o) => o.status === "MENUNGGU_PANEN");

  const jumlahPerStatus = STATUS_BATCH.map((s) => ({
    ...s,
    n: batch.filter((b) => b.productionStatus === s.kunci).length,
  })).filter((s) => s.n > 0);

  return (
    <div className="p-8 pb-20 relative min-h-full">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-emerald-950 mb-2">Dashboard</h1>
        <p className="text-gray-500">Ringkasan operasional dan keuangan usaha tani Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link
          href="/tenant/finance"
          className="bg-[#1e5033] text-white rounded-2xl p-6 relative overflow-hidden shadow-sm hover:brightness-110 transition"
        >
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-semibold text-emerald-100">Dana Escrow Tertahan</div>
            <Wallet className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-3xl font-black tracking-tight mb-6">
            {rp(escrow?.tertahan ?? 0)}
          </div>
          <div className="text-[10px] text-emerald-100 leading-tight">
            Cair otomatis setelah
            <br />
            jendela klaim mutu berakhir.
          </div>
        </Link>

        <Link
          href="/tenant/batch"
          className={`rounded-2xl p-6 shadow-sm border-2 transition ${
            perluDipanen.length
              ? "bg-red-50/30 border-red-200 hover:bg-red-50"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">Perlu Tindakan</div>
            <AlertTriangle
              className={`w-5 h-5 ${perluDipanen.length ? "text-red-600" : "text-gray-300"}`}
            />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">
            {perluDipanen.length} Batch
          </div>
          <div
            className={`text-xs font-medium ${perluDipanen.length ? "text-red-700" : "text-gray-500"}`}
          >
            {perluDipanen.length
              ? "Tanggal panen sudah tiba — catat hasil panen agar pesanan bisa berjalan."
              : "Tidak ada batch yang menunggu dicatat."}
          </div>
        </Link>

        <Link
          href="/tenant/orders"
          className="bg-blue-50/30 border-2 border-blue-200 rounded-2xl p-6 shadow-sm hover:bg-blue-50 transition"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-gray-700">PO Aktif</div>
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-gray-900 mb-6">{poAktif.length} PO</div>
          <div className="text-xs text-blue-700 font-medium">
            {menungguPanen.length} pengiriman masih menunggu panen.
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-emerald-950">Status Batch Lahan</h2>
              <Link
                href="/tenant/batch"
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                Kelola <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {batch.length === 0 ? (
              <p className="text-sm text-gray-500">
                Belum ada batch. Buka kuota Pre-Order agar produk Anda tampil di katalog.
              </p>
            ) : (
              <div className="space-y-4">
                {jumlahPerStatus.map((s) => {
                  const pct = Math.round((s.n / batch.length) * 100);
                  return (
                    <div key={s.kunci}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{s.label}</span>
                        <span className="text-gray-500">
                          {s.n} batch · {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`${s.warna} h-2.5 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {perluDipanen.length > 0 && (
            <div className="bg-white border-2 border-red-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-red-700">Batch Menunggu Dicatat</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Selama panen belum dicatat, pembeli tidak bisa maju ke tahap pengiriman.
              </p>
              <div className="space-y-2">
                {perluDipanen.map((b) => (
                  <Link
                    key={b.id}
                    href={`/tenant/batch/${b.id}/progress/new`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {b.productName ?? "Batch"}
                      </div>
                      <div className="text-xs text-gray-500">
                        panen {tgl(b.claimedHarvestDate)} · {b.quotaBoxSold} box terjual
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-emerald-800">
                      Catat Panen →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-indigo-900" />
              <h2 className="text-lg font-black text-indigo-900 uppercase tracking-widest">
                PO Aktif
              </h2>
            </div>

            {poAktif.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada kuota yang terjual.</p>
            ) : (
              <div className="space-y-3">
                {poAktif.map((b) => (
                  <Link
                    key={b.id}
                    href={`/tenant/batch/${b.id}`}
                    className="block bg-white rounded-xl border border-indigo-100 p-3 hover:shadow-sm transition"
                  >
                    <div className="font-bold text-sm text-gray-900 truncate">
                      {b.productName ?? "Batch"}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {rp(b.lockedPrice * b.quotaBoxSold)} · estimasi panen{" "}
                      {tgl(b.claimedHarvestDate)}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-indigo-50 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min((b.quotaBoxSold / (b.quotaBoxTotal || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {b.quotaBoxSold}/{b.quotaBoxTotal} box terjual
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
