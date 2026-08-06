"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { ambilBatchSatu, ambilTimelineTenant, ambilVerifikasi, GalatApi } from "@/lib/api";
import type { BatchResponse, TimelineNodeResponse, TimelineVerifyResponse } from "@agro-os/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [nodes, setNodes] = useState<TimelineNodeResponse[]>([]);
  const [verify, setVerify] = useState<TimelineVerifyResponse | null>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilBatchSatu(id)
      .then(setBatch)
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch tidak ditemukan"));
    ambilTimelineTenant(id).then(setNodes).catch(() => setNodes([]));
    ambilVerifikasi(id).then(setVerify).catch(() => setVerify(null));
  }, [id]);

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }
  if (!batch) return <div className="p-8 text-sm text-gray-500">Memuat batch…</div>;

  const tertutup = batch.productionStatus === "HARVESTED" || batch.productionStatus === "FAILED";

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/tenant/batch"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Batch
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">{batch.productName ?? "Batch"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Panen {tgl(batch.claimedHarvestDate)} · kuota terjual {batch.quotaBoxSold}/
            {batch.quotaBoxTotal} box · {rp(batch.lockedPrice)}/box
          </p>
        </div>
        {!tertutup && (
          <Link
            href={`/tenant/batch/${id}/progress/new`}
            className="shrink-0 flex items-center gap-2 bg-emerald-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-800"
          >
            <Plus className="w-4 h-4" /> Catat Kegiatan
          </Link>
        )}
      </div>

      {tertutup && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-6 text-sm text-gray-600">
          Batch sudah {batch.productionStatus === "HARVESTED" ? "dipanen" : "dinyatakan gagal"} —
          timeline ditutup dan tidak menerima catatan baru.
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-emerald-950">Verified Timeline</h2>
        {verify && (
          <span
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              verify.intact ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}
          >
            {verify.intact ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Rantai utuh ({verify.nodeCount})
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" /> Rantai TIDAK utuh
              </>
            )}
          </span>
        )}
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Belum ada catatan. Mulai dari penyiapan lahan atau penanaman.
        </div>
      ) : (
        <div className="space-y-3">
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.ralatOfId ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400">#{n.seq}</span>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {n.activityType.replace(/_/g, " ")}
                  </h3>
                  {n.ralatOfId && (
                    <span className="bg-amber-200 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded">
                      RALAT
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 shrink-0">{tgl(n.deviceTs)}</span>
              </div>

              <p className="text-sm text-gray-600 mb-2">{n.description}</p>

              {n.outsidePolygonReason && (
                <p className="text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded px-2.5 py-1.5 mb-2">
                  Di luar batas lahan — {n.outsidePolygonReason}
                </p>
              )}

              {n.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {n.photos.map((f) => (
                    <div
                      key={f.sha256}
                      className="h-24 w-32 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200"
                      style={{ backgroundImage: `url(${API_BASE}${f.url})` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
