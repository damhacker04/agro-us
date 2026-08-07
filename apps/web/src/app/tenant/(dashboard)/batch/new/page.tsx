"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, MapPin } from "lucide-react";
import type { LandPlotCapacityResponse, LandPlotResponse, ProductResponse } from "@agro-os/shared";
import {
  GalatApi,
  ambilKapasitasLahan,
  ambilLahan,
  ambilProdukTenant,
  bukaKuota,
} from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/**
 * Buka Kuota Pre-Order (TN-16, FR-3.3/3.4).
 *
 * Batas kuota dihitung server dari luas lahan × rendemen komoditas × pengali reputasi,
 * dan diambil SEBELUM Tenant mengetik jumlahnya. Menampilkannya lebih dulu membuat
 * batas itu terbaca sebagai informasi; kalau baru muncul setelah formulir dikirim,
 * yang sama persis terbaca sebagai penolakan.
 */
export default function OpenQuotaPage() {
  const router = useRouter();

  const [produk, setProduk] = useState<ProductResponse[]>([]);
  const [lahan, setLahan] = useState<LandPlotResponse[]>([]);
  const [productId, setProductId] = useState("");
  const [landPlotId, setLandPlotId] = useState("");
  const [kuota, setKuota] = useState("");
  const [harga, setHarga] = useState("");
  const [panen, setPanen] = useState("");
  const [tanam, setTanam] = useState("");

  const [kapasitas, setKapasitas] = useState<LandPlotCapacityResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilProdukTenant(), ambilLahan()])
      .then(([p, l]) => {
        setProduk(p);
        setLahan(l);
        if (p[0]) {
          setProductId(p[0].id);
          setHarga(String(p[0].pricePerBox));
          setPanen(p[0].estHarvestDate.slice(0, 10));
        }
        if (l[0]) setLandPlotId(l[0].id);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat data"))
      .finally(() => setMemuat(false));
  }, []);

  const p = produk.find((x) => x.id === productId);

  useEffect(() => {
    if (!landPlotId || !p) return setKapasitas(null);
    ambilKapasitasLahan(landPlotId, p.commodity.id, p.qtyKgPerBox)
      .then(setKapasitas)
      .catch(() => setKapasitas(null));
  }, [landPlotId, p]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      const b = await bukaKuota(productId, {
        landPlotId,
        quotaBoxTotal: Number(kuota),
        lockedPrice: Number(harga),
        claimedHarvestDate: panen,
        ...(tanam ? { claimedPlantDate: tanam } : {}),
      });
      router.push(`/tenant/batch/${b.id}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal membuka kuota.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (produk.length === 0 || lahan.length === 0) {
    return (
      <div className="p-8 max-w-2xl">
        <Link
          href="/tenant/batch"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {produk.length === 0
            ? "Belum ada produk. Tambahkan produk dulu di Katalog Produk."
            : "Belum ada lahan terpetakan. Petakan lahan dulu di Manajemen Lahan."}
        </div>
      </div>
    );
  }

  const melebihi = kapasitas && Number(kuota) > kapasitas.maxQuotaBox;
  const lahanTerpakai = kapasitas && !kapasitas.available;

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/tenant/batch"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Batch
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Buka Kuota Pre-Order</h1>
      <p className="text-sm text-gray-500 mb-6">
        Harga yang Anda kunci di sini berlaku sampai panen — tidak bisa diubah setelah ada
        yang memesan.
      </p>

      <form onSubmit={simpan} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produk</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const baru = produk.find((x) => x.id === e.target.value);
                if (baru) {
                  setHarga(String(baru.pricePerBox));
                  setPanen(baru.estHarvestDate.slice(0, 10));
                }
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {produk.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} — Grade {x.grade} ({x.qtyKgPerBox} kg/box)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Petak lahan</label>
            <select
              value={landPlotId}
              onChange={(e) => setLandPlotId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {lahan.map((l, i) => (
                <option key={l.id} value={l.id}>
                  Petak {i + 1} — {l.areaHa.toFixed(2)} ha
                  {l.verificationTier === "TERBATAS" ? " (verifikasi terbatas)" : ""}
                </option>
              ))}
            </select>

            {lahanTerpakai && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                Lahan ini masih dipakai batch yang belum selesai. Satu petak hanya boleh
                menampung satu batch aktif — pilih petak lain atau tutup batch lamanya dulu.
              </p>
            )}
          </div>

          {kapasitas && !lahanTerpakai && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
              Batas kuota petak ini <b className="text-gray-900">{kapasitas.maxQuotaBox} box</b> —
              dari {kapasitas.areaHa.toFixed(2)} ha ×{" "}
              {kapasitas.avgYieldKgPerHa.toLocaleString("id-ID")} kg/ha ÷ {kapasitas.qtyKgPerBox}{" "}
              kg/box × pengali {kapasitas.quotaMultiplier}.
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Jumlah kuota (box)
            </label>
            <input
              required
              type="number"
              min={1}
              max={kapasitas?.maxQuotaBox}
              value={kuota}
              onChange={(e) => setKuota(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            {melebihi && (
              <p className="text-xs text-red-700 mt-1">
                Melebihi batas {kapasitas!.maxQuotaBox} box — server akan menolaknya.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Harga terkunci per box (Rp)
            </label>
            <input
              required
              type="number"
              min={1}
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            {p && Number(harga) > 0 && Number(kuota) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Nilai kuota penuh {rp(Number(harga) * Number(kuota))}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tanggal panen
              </label>
              <input
                required
                type="date"
                value={panen}
                onChange={(e) => setPanen(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tanggal tanam <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <input
                type="date"
                value={tanam}
                onChange={(e) => setTanam(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={proses || Boolean(lahanTerpakai)}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {proses ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {proses ? "Membuka…" : "Buka Kuota"}
        </button>
      </form>
    </div>
  );
}
