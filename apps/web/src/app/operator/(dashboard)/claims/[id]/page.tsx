"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock, Loader2, Scale } from "lucide-react";
import type { ClaimResponse } from "@agro-os/shared";
import { GalatApi, ambilAntreanKlaim, putuskanKlaim } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const jam = (iso: string) => new Date(iso).toLocaleString("id-ID");

type Antrean = ClaimResponse & { overdue: boolean };

export default function OperatorClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [klaim, setKlaim] = useState<Antrean | null>(null);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    // Tidak ada GET /operator/claims/:id — yang tersedia hanya antreannya, jadi
    // klaim dicari dari daftar itu. Konsekuensinya klaim yang SUDAH diputus tidak
    // bisa dibuka lagi lewat halaman ini.
    ambilAntreanKlaim()
      .then((d) => {
        const c = d.find((x) => x.id === id) ?? null;
        setKlaim(c);
        if (c) setNilai(String(c.claimValue));
        setGalat(c ? "" : "Klaim tidak ada di antrean — mungkin sudah diputus.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat klaim"))
      .finally(() => setMemuat(false));
  }, [id]);

  async function putuskan() {
    if (!klaim) return;
    const angka = Number(nilai);
    if (Number.isNaN(angka) || angka < 0) return setGalat("Nilai disetujui tidak sah.");
    if (angka > klaim.claimValue) {
      return setGalat(`Tidak boleh melebihi nilai klaim ${rp(klaim.claimValue)}.`);
    }
    if (catatan.trim().length < 10) return setGalat("Alasan putusan minimal 10 karakter.");

    setProses(true);
    setGalat("");
    try {
      await putuskanKlaim(klaim.id, angka, catatan.trim());
      router.push("/operator/claims");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan putusan.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat klaim…</div>;

  if (galat && !klaim) {
    return (
      <div className="p-8">
        <Link
          href="/operator/claims"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  if (!klaim) return null;

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/operator/claims"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">{klaim.productName}</h1>
          <p className="text-sm text-gray-500 mt-1">Diajukan {jam(klaim.createdAt)}</p>
        </div>
        {klaim.overdue && (
          <span className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Lewat SLA
          </span>
        )}
      </div>

      {/* Bukti pembeli — dasar putusan, jadi ditaruh sebelum angkanya. */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-3">Bukti dari Pembeli</h2>
        <p className="text-sm text-gray-700 mb-3">{klaim.description}</p>
        {klaim.photoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={
              klaim.photoUrl.startsWith("http") ? klaim.photoUrl : `${API_BASE}${klaim.photoUrl}`
            }
            alt="Foto kondisi barang"
            className="rounded-lg border border-gray-200 max-h-72"
          />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-gray-400" /> Perhitungan Sistem
        </h2>
        <dl className="text-sm space-y-2">
          {[
            ["Seharusnya diterima", `${klaim.expectedKg} kg`],
            ["Hasil timbang pembeli", `${klaim.actualWeightKg} kg`],
            ["Selisih kotor", `${klaim.shortfallKg} kg`],
            [
              `Toleransi susut (${klaim.shrinkTolerancePct}%)`,
              `− ${klaim.toleratedKg} kg`,
            ],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-gray-600">{k}</dt>
              <dd className="font-medium text-gray-900">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
            <dt className="font-semibold text-gray-800">Bisa diklaim</dt>
            <dd className="font-bold text-gray-900">
              {klaim.claimableKg} kg · {rp(klaim.claimValue)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Porsi nilai pesanan</dt>
            <dd className="font-medium text-gray-900">{klaim.pctOfOrder}%</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-1">Putusan</h2>
        <p className="text-xs text-gray-500 mb-4">
          Nilai yang disetujui dipotong dari escrow Tenant dan dikembalikan ke pembeli.
          Isi 0 untuk menolak klaim.
        </p>

        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Nilai disetujui (rupiah)
        </label>
        <input
          type="number"
          min={0}
          max={klaim.claimValue}
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-1"
        />
        <p className="text-[11px] text-gray-500 mb-4">
          Maksimum {rp(klaim.claimValue)} — sistem menolak nilai di atas itu.
        </p>

        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Alasan putusan
        </label>
        <textarea
          rows={3}
          minLength={10}
          maxLength={500}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Dasar keputusan — dibaca pembeli maupun Tenant."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-1"
        />
        <p className="text-[11px] text-gray-500 mb-4">{catatan.length}/500 karakter</p>

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {galat}
          </p>
        )}

        <button
          onClick={putuskan}
          disabled={proses}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Menyimpan…" : "Simpan Putusan"}
        </button>
      </div>
    </div>
  );
}
