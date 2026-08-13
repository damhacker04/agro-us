"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText, Loader2, MapPin } from "lucide-react";
import type { LegalityQueueItem } from "@agro-os/shared";
import { GalatApi, ambilAntreanLegalitas, putuskanLegalitas, urlBerkas } from "@/lib/api";

const tgl = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function OperatorLegalityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<LegalityQueueItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    // Tidak ada GET /operator/legality/:tenantId — hanya antrean per status, jadi
    // ketiganya ditelusuri sampai Tenant-nya ketemu.
    Promise.all([
      ambilAntreanLegalitas("PENDING"),
      ambilAntreanLegalitas("APPROVED"),
      ambilAntreanLegalitas("REJECTED"),
    ])
      .then((semua) => {
        const t = semua.flat().find((x) => x.tenantId === id) ?? null;
        setTenant(t);
        setGalat(t ? "" : "Tenant tidak ditemukan.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat Tenant"))
      .finally(() => setMemuat(false));
  }, [id]);

  async function putuskan(setuju: boolean) {
    // Penolakan tanpa alasan tidak bisa ditindaklanjuti Tenant — ia tidak akan tahu
    // apa yang harus diperbaiki sebelum mengajukan ulang.
    if (!setuju && catatan.trim().length === 0) {
      return setGalat("Alasan penolakan wajib diisi.");
    }
    setProses(true);
    setGalat("");
    try {
      await putuskanLegalitas(id, setuju, catatan.trim() || undefined);
      router.push("/operator/legality");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan putusan.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  if (!tenant) {
    return (
      <div className="p-8">
        <Link
          href="/operator/legality"
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

  const sudahDiputus = tenant.legalityStatus !== "PENDING";
  const dokUrl = tenant.legalityDocUrl ? urlBerkas(tenant.legalityDocUrl) : null;

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/operator/legality"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Antrean
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">{tenant.companyName}</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-6">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {tenant.zoneNames.length ? tenant.zoneNames.join(", ") : "belum pilih zona"}
        </span>
        <span>{tenant.landPlotCount} petak lahan</span>
        <span>mendaftar {tgl(tenant.submittedAt)}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-emerald-950 text-sm mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" /> Dokumen Legalitas
        </h2>
        {dokUrl ? (
          <a
            href={dokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-emerald-700 hover:underline break-all"
          >
            Buka dokumen (NIB / KTP pemilik)
          </a>
        ) : (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tenant belum mengunggah dokumen. Tidak ada yang bisa ditinjau — tolak dengan
            alasan ini agar Tenant tahu harus mengunggah dulu.
          </p>
        )}
      </div>

      {sudahDiputus ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
          Legalitas Tenant ini sudah berstatus <b>{tenant.legalityStatus}</b>.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-bold text-emerald-950 text-sm mb-1">Putusan</h2>
          <p className="text-xs text-gray-500 mb-4">
            Menyetujui membuka akses Tenant untuk membuka kuota Pre-Order.
          </p>

          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Catatan <span className="font-normal text-gray-400">(wajib bila menolak)</span>
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Apa yang perlu diperbaiki Tenant?"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-4"
          />

          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {galat}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => putuskan(true)}
              disabled={proses}
              className="flex-1 bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {proses && <Loader2 className="w-4 h-4 animate-spin" />}
              Setujui
            </button>
            <button
              onClick={() => putuskan(false)}
              disabled={proses}
              className="flex-1 border border-red-300 text-red-700 text-sm font-semibold py-3 rounded-lg hover:bg-red-50 disabled:opacity-60"
            >
              Tolak
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
