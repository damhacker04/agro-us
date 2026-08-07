"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import type { CommoditySummary, UpsertCommodityBody } from "@agro-os/shared";
import { GalatApi, ambilKomoditasOperator, buatKomoditas, ubahKomoditas } from "@/lib/api";

const KOSONG: UpsertCommodityBody = {
  name: "",
  category: "DAUN",
  shrinkTolerancePct: 5,
  avgYieldKgPerHa: 10000,
  growingDaysMin: 30,
};

type Lengkap = CommoditySummary & { growingDaysMin?: number };

/**
 * Tambah/ubah komoditas (OP-10).
 *
 * Rute `/operator/commodity/baru` dipakai sebagai penanda buat-baru. Kata "baru" bukan
 * UUID, jadi tidak akan pernah bentrok dengan id komoditas sungguhan.
 */
export default function OperatorCommodityFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const baru = id === "baru";

  const [isi, setIsi] = useState<UpsertCommodityBody>(KOSONG);
  const [memuat, setMemuat] = useState(!baru);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    if (baru) return;
    ambilKomoditasOperator()
      .then((d) => {
        const k = (d as Lengkap[]).find((x) => x.id === id);
        if (!k) return setGalat("Komoditas tidak ditemukan.");
        setIsi({
          name: k.name,
          category: k.category,
          shrinkTolerancePct: Number(k.shrinkTolerancePct),
          avgYieldKgPerHa: Number(k.avgYieldKgPerHa),
          growingDaysMin: Number(k.growingDaysMin ?? 30),
        });
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat komoditas"))
      .finally(() => setMemuat(false));
  }, [id, baru]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      if (baru) await buatKomoditas(isi);
      else await ubahKomoditas(id, isi);
      router.push("/operator/commodity");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan komoditas.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/operator/commodity"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Komoditas
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">
        {baru ? "Tambah Komoditas" : "Ubah Komoditas"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Perubahan berlaku untuk seluruh Tenant yang menanam komoditas ini.
      </p>

      <form onSubmit={simpan} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama</label>
            <input
              required
              minLength={2}
              value={isi.name}
              onChange={(e) => setIsi({ ...isi, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
            <div className="flex gap-2">
              {(["DAUN", "BUAH_UMBI"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setIsi({ ...isi, category: c })}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                    isi.category === c
                      ? "bg-emerald-950 text-white border-emerald-950"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {c === "DAUN" ? "Daun" : "Buah & Umbi"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Rendemen rata-rata (kg/ha)
            </label>
            <input
              required
              type="number"
              min={1}
              step="0.01"
              value={isi.avgYieldKgPerHa}
              onChange={(e) => setIsi({ ...isi, avgYieldKgPerHa: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-amber-700 mt-1">
              Membatasi kuota PO seluruh Tenant. Terlalu tinggi berarti Tenant boleh menjual
              lebih banyak daripada yang bisa dipanen lahannya.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Toleransi susut (%)
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={isi.shrinkTolerancePct}
                onChange={(e) => setIsi({ ...isi, shrinkTolerancePct: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Susut alami yang tidak bisa diklaim pembeli.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Umur tanam minimal (hari)
              </label>
              <input
                required
                type="number"
                min={1}
                value={isi.growingDaysMin}
                onChange={(e) => setIsi({ ...isi, growingDaysMin: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Panen lebih cepat dari ini ditolak sistem.
              </p>
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
          disabled={proses}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
    </div>
  );
}
