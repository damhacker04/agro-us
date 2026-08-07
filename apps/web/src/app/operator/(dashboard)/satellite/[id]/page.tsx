"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Satellite } from "lucide-react";
import type { NdviSeries, SatelliteReviewItem, VerificationStatus } from "@agro-os/shared";
import { GalatApi, ambilAntreanSatelit, ambilNdvi, putuskanSatelit } from "@/lib/api";

const tgl = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

/** Empat putusan yang masuk akal diambil manusia setelah melihat datanya. */
const PILIHAN: Array<{ nilai: VerificationStatus; label: string; jelas: string }> = [
  {
    nilai: "TERVERIFIKASI",
    label: "Terverifikasi",
    jelas: "Citra mendukung klaim Tenant. Badge tertinggi diberikan.",
  },
  {
    nilai: "FOTO_SAJA",
    label: "Bukti Foto Saja",
    jelas: "Citra tidak menyangkal, tapi juga tidak cukup mendukung. Badge turun satu tingkat.",
  },
  {
    nilai: "TIDAK_DAPAT",
    label: "Citra Tidak Tersedia",
    jelas: "Tutupan awan atau lahan terlalu kecil. Bukan kesalahan Tenant.",
  },
  {
    nilai: "TIDAK_SESUAI",
    label: "Tidak Sesuai Klaim",
    jelas: "Citra menyangkal klaim Tenant. Ditampilkan terbuka kepada pembeli.",
  },
];

export default function OperatorSatelliteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [batch, setBatch] = useState<SatelliteReviewItem | null>(null);
  const [ndvi, setNdvi] = useState<NdviSeries | null>(null);
  const [pilihan, setPilihan] = useState<VerificationStatus | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    // Tidak ada GET /operator/satellite/:batchId — hanya antreannya.
    ambilAntreanSatelit()
      .then((d) => {
        const b = d.find((x) => x.batchId === id) ?? null;
        setBatch(b);
        setGalat(b ? "" : "Batch tidak ada di antrean — mungkin sudah diputus.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat batch"))
      .finally(() => setMemuat(false));

    ambilNdvi(id)
      .then(setNdvi)
      .catch(() => setNdvi(null));
  }, [id]);

  async function putuskan() {
    if (!pilihan) return;
    setProses(true);
    setGalat("");
    try {
      await putuskanSatelit(id, { verificationStatus: pilihan });
      router.push("/operator/satellite");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan putusan.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (!batch) {
    return (
      <div className="p-8">
        <Link
          href="/operator/satellite"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  const titik = ndvi?.points ?? [];
  const terpakai = titik.filter((p) => p.usable);

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/operator/satellite"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">{batch.productName}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {batch.tenantName} · petak {batch.landPlotAreaHa.toFixed(2)} ha
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-3">Klaim vs Deteksi</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-1">Diklaim Tenant</div>
            <div className="text-gray-900">Tanam {tgl(batch.claimedPlantDate)}</div>
            <div className="text-gray-900">Panen {tgl(batch.claimedHarvestDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Terdeteksi citra</div>
            <div className="text-gray-900">Tanam {tgl(batch.detectedPlantDate)}</div>
            <div className="text-gray-900">Panen {tgl(batch.detectedHarvestDate)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-1 flex items-center gap-2">
          <Satellite className="w-4 h-4 text-gray-400" /> Pengamatan
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          {terpakai.length} dari {titik.length} pengamatan terpakai. Yang tertutup awan
          dibuang oleh pipeline, bukan disembunyikan.
        </p>
        {titik.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pengamatan untuk petak ini.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left font-semibold py-1.5">Tanggal</th>
                  <th className="text-right font-semibold py-1.5">NDVI</th>
                  <th className="text-right font-semibold py-1.5">Awan</th>
                </tr>
              </thead>
              <tbody>
                {titik.map((p) => (
                  <tr
                    key={p.date}
                    className={`border-t border-gray-100 ${p.usable ? "" : "text-gray-400"}`}
                  >
                    <td className="py-1.5">{tgl(p.date)}</td>
                    <td className="text-right py-1.5">
                      {p.ndvi !== null ? p.ndvi.toFixed(3) : "—"}
                    </td>
                    <td className="text-right py-1.5">
                      {p.cloudPct.toFixed(0)}%{!p.usable && " · dibuang"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-1">Putusan</h2>
        <p className="text-xs text-gray-500 mb-4">
          Status ini menentukan badge yang dilihat pembeli di katalog dan riwayat pesanan.
        </p>

        <div className="space-y-2 mb-4">
          {PILIHAN.map((o) => (
            <button
              key={o.nilai}
              type="button"
              onClick={() => setPilihan(o.nilai)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                pilihan === o.nilai
                  ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold text-sm text-gray-900">{o.label}</div>
              <p className="text-xs text-gray-600 mt-0.5">{o.jelas}</p>
            </button>
          ))}
        </div>

        {galat && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {galat}
          </p>
        )}

        <button
          onClick={putuskan}
          disabled={!pilihan || proses}
          className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Menyimpan…" : "Simpan Putusan"}
        </button>
      </div>
    </div>
  );
}
