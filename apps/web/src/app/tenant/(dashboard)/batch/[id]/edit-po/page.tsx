"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, PencilLine } from "lucide-react";
import type { BatchResponse } from "@agro-os/shared";
import { GalatApi, ambilBatchSatu } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

/**
 * Kuota PO yang sudah dibuka TIDAK bisa diubah, dan memang tidak ada endpoint untuk itu.
 *
 * Alasannya bukan kelalaian: harga dikunci saat pembeli memesan (FR-3.4), dan kuota
 * adalah dasar reservasi mereka. Menaikkan harga atau memangkas kuota setelah ada yang
 * membayar berarti mengubah kesepakatan sepihak — persis yang hendak dicegah model
 * Pre-Order ini.
 *
 * Jadi halaman ini menampilkan nilai yang berlaku beserta alasannya, bukan formulir
 * yang tombol simpannya tidak menuju ke mana-mana.
 */
export default function EditPoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchSatu(id)
      .then((b) => {
        setBatch(b);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [id]);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (galat || !batch) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Batch tidak ditemukan"}
        </div>
      </div>
    );
  }

  const adaPembeli = batch.quotaBoxSold > 0;

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/tenant/batch/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Batch
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Ketentuan Kuota PO</h1>
      <p className="text-sm text-gray-500 mb-6">{batch.productName ?? "Batch"}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <dl className="text-sm space-y-2.5">
          {[
            ["Harga terkunci", `${rp(batch.lockedPrice)} / box`],
            ["Kuota dibuka", `${batch.quotaBoxTotal} box`],
            ["Sudah terjual", `${batch.quotaBoxSold} box`],
            ["Tanggal panen", tgl(batch.claimedHarvestDate)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-gray-600">{k}</dt>
              <dd className="font-semibold text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-amber-900 text-sm mb-1">
              Ketentuan ini tidak bisa diubah
            </h2>
            <p className="text-xs text-amber-800 leading-relaxed">
              {adaPembeli ? (
                <>
                  <b>{batch.quotaBoxSold} box sudah dibayar</b> pembeli dengan harga{" "}
                  {rp(batch.lockedPrice)}. Mengubah harga atau memangkas kuota sekarang berarti
                  mengubah kesepakatan yang sudah mereka bayar — justru hal yang dicegah model
                  Pre-Order.
                </>
              ) : (
                <>
                  Harga dan kuota dikunci sejak batch dibuka supaya pembeli bisa merencanakan
                  biaya. Belum ada yang memesan, tetapi ketentuannya tetap melekat pada batch
                  ini.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-2 flex items-center gap-2">
          <PencilLine className="w-4 h-4 text-gray-400" /> Yang masih bisa Anda ubah
        </h2>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside mb-4">
          <li>Nama produk, grade, dan deskripsi — lewat Katalog Produk.</li>
          <li>Catatan budidaya — dengan menambah node baru di Verified Timeline.</li>
        </ul>
        <div className="flex gap-2">
          <Link
            href="/tenant/catalog"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50"
          >
            Katalog Produk
          </Link>
          <Link
            href={`/tenant/batch/${id}/progress/new`}
            className="flex-1 text-center bg-emerald-950 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-800"
          >
            Catat Kegiatan
          </Link>
        </div>
      </div>
    </div>
  );
}
