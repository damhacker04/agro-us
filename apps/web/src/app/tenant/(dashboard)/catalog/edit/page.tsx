"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { CommoditySummary, ProductResponse } from "@agro-os/shared";
import {
  GalatApi,
  ambilKomoditas,
  ambilProdukTenant,
  buatProduk,
  ubahProduk,
} from "@/lib/api";

const GRADE = ["A", "B", "C"] as const;

function FormProduk() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const sedangUbah = Boolean(id);

  const [komoditas, setKomoditas] = useState<CommoditySummary[]>([]);
  const [commodityId, setCommodityId] = useState("");
  const [nama, setNama] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [harga, setHarga] = useState("");
  const [kgBox, setKgBox] = useState("");
  const [panen, setPanen] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    Promise.all([ambilKomoditas(), sedangUbah ? ambilProdukTenant() : Promise.resolve([])])
      .then(([k, produk]) => {
        setKomoditas(k);
        if (sedangUbah) {
          const p = (produk as ProductResponse[]).find((x) => x.id === id);
          if (!p) return setGalat("Produk tidak ditemukan.");
          setCommodityId(p.commodity.id);
          setNama(p.name);
          setGrade(p.grade);
          setHarga(String(p.pricePerBox));
          setKgBox(String(p.qtyKgPerBox));
          setPanen(p.estHarvestDate.slice(0, 10));
          setDeskripsi(p.description ?? "");
        } else if (k[0]) {
          setCommodityId(k[0].id);
        }
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat data"))
      .finally(() => setMemuat(false));
  }, [id, sedangUbah]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    const isi = {
      commodityId,
      name: nama,
      grade,
      pricePerBox: Number(harga),
      qtyKgPerBox: Number(kgBox),
      estHarvestDate: panen,
      ...(deskripsi ? { description: deskripsi } : {}),
    };
    try {
      if (sedangUbah && id) await ubahProduk(id, isi);
      else await buatProduk(isi);
      router.push("/tenant/catalog");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan produk.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  const dipilih = komoditas.find((k) => k.id === commodityId);

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/tenant/catalog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">
        {sedangUbah ? "Ubah Produk" : "Tambah Produk"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Produk belum bisa dipesan sebelum Anda membuka kuota Pre-Order untuknya dari
        Manajemen Batch.
      </p>

      <form onSubmit={simpan} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Komoditas</label>
            <select
              required
              value={commodityId}
              onChange={(e) => setCommodityId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {komoditas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            {/* Toleransi susut menentukan berapa kekurangan berat yang masih dianggap
                wajar saat pembeli mengajukan klaim — angkanya melekat pada komoditas,
                bukan pada produk, jadi Tenant perlu tahu sebelum memilih. */}
            {dipilih && (
              <p className="text-xs text-gray-500 mt-1">
                Toleransi susut {dipilih.shrinkTolerancePct}% · rendemen rata-rata{" "}
                {dipilih.avgYieldKgPerHa.toLocaleString("id-ID")} kg/ha
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama produk</label>
            <input
              required
              minLength={3}
              maxLength={120}
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Wortel Pujon Grade A"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Grade</label>
            <div className="flex gap-2">
              {GRADE.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                    grade === g
                      ? "bg-emerald-950 text-white border-emerald-950"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Harga per box (Rp)
              </label>
              <input
                required
                type="number"
                min={1}
                step={1}
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                placeholder="145000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Isi per box (kg)
              </label>
              <input
                required
                type="number"
                min={0.01}
                step={0.01}
                value={kgBox}
                onChange={(e) => setKgBox(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Perkiraan tanggal panen
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
              Deskripsi <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={proses}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Menyimpan…" : sedangUbah ? "Simpan Perubahan" : "Tambah Produk"}
        </button>
      </form>
    </div>
  );
}

export default function CatalogEditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat…</div>}>
      <FormProduk />
    </Suspense>
  );
}
