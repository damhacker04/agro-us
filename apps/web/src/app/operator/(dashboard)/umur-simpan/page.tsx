"use client";

import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { AntreanUmurSimpan } from "@agro-os/shared";
import { GalatApi, ambilAntreanUmurSimpan } from "@/lib/api";

/**
 * OP-14 — Antrean Pantau Umur Simpan (FR-5.10).
 *
 * ⚠️ HALAMAN INI TIDAK PUNYA TOMBOL YANG MEMBLOKIR PENGIRIMAN, dan itu keputusan produk,
 * bukan fitur yang belum sempat dibuat.
 *
 * Memblokir menuntut ambang, dan angka umur simpan yang dipakai di sini masih estimasi
 * literatur yang belum divalidasi lapangan. Menolak kiriman berdasarkan tebakan adalah
 * persis kesalahan yang FR-7.12e ada untuk mencegah — sistem tidak boleh menjatuhkan
 * konsekuensi di atas dasar yang ia sendiri tahu belum kokoh. Operator melihat keadaannya,
 * lalu memutuskan sebagai manusia.
 *
 * Antreannya juga tidak disaring ambang: menyembunyikan batch yang "masih aman" berarti
 * menyembunyikannya berdasarkan angka yang sama meragukannya.
 */

const HARI = (n: number) => `${n} hari`;

export default function UmurSimpanPage() {
  const [baris, setBaris] = useState<AntreanUmurSimpan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilAntreanUmurSimpan()
      .then((d) => {
        setBaris(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat antrean…</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pantau Umur Simpan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Batch yang sudah dipanen tetapi belum sampai ke pembeli, terurut dari sisa umur
          simpan paling tipis.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <p className="text-xs leading-relaxed text-sky-900">
          Angka umur simpan masih <b>indikatif</b> dan belum divalidasi ke penyuluh atau BPS.
          Karena itu halaman ini tidak memblokir pengiriman apa pun — ia hanya menunjukkan
          keadaan. Usia produk dihitung dari waktu panen yang dicatat sistem, bukan dari
          tanggal yang diisi Tenant.
        </p>
      </div>

      {galat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{galat}</div>
      )}

      {!galat && baris.length === 0 && (
        <div className="rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm font-semibold text-gray-900">Tidak ada batch yang sedang menunggu kirim.</p>
          <p className="mt-1 text-xs text-gray-500">
            Antrean ini hanya memuat batch yang sudah dipanen dan belum tiba — di luar jendela
            itu, umur simpan tidak bisa ditindaklanjuti siapa pun.
          </p>
        </div>
      )}

      {baris.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {["Produk", "Tenant", "Status", "Box", "Usia", "Sisa umur simpan"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const u = b.umurSimpan;
                const lewat = u.remainingDays !== null && u.remainingDays < 0;
                const menipis = u.remainingDays !== null && u.remainingDays >= 0 && u.remainingDays <= 2;
                return (
                  <tr key={b.shipmentId + b.batchId} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{b.productName}</div>
                      <div className="text-xs text-gray-500">{b.commodityName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.tenantName}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-600">{b.shipmentStatus}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{b.qtyBox}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {u.ageDays === null ? "—" : HARI(u.ageDays)}
                    </td>
                    <td className="px-4 py-3">
                      {u.remainingDays === null ? (
                        // Bukan nol, dan bukan tanda hubung tanpa penjelasan: pembaca berhak
                        // tahu bahwa yang hilang adalah angka acuannya, bukan datanya.
                        <span className="text-xs text-gray-500">umur simpan belum ditetapkan</span>
                      ) : (
                        <span
                          className={`font-mono ${
                            lewat ? "font-bold text-red-700" : menipis ? "font-bold text-amber-700" : "text-gray-700"
                          }`}
                        >
                          {lewat ? `lewat ${HARI(Math.abs(u.remainingDays))}` : HARI(u.remainingDays)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
