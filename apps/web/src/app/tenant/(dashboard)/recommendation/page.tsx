"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Lightbulb, Lock, TrendingUp } from "lucide-react";
import { GalatApi, aktifkanLangganan, ambilRekomendasi } from "@/lib/api";
import type { PlantingRecommendation } from "@agro-os/shared";

/** Penanda kejenuhan pasokan (FR-8.4) — mencegah semua Tenant menanam komoditas sama. */
const SATURASI: Record<string, { label: string; kelas: string }> = {
  KURANG: { label: "Pasokan kurang", kelas: "bg-emerald-100 text-emerald-800" },
  SEIMBANG: { label: "Seimbang", kelas: "bg-gray-100 text-gray-700" },
  JENUH: { label: "Jenuh", kelas: "bg-red-100 text-red-800" },
  TANPA_DATA: { label: "Belum terukur", kelas: "bg-gray-100 text-gray-500" },
};

/** Dasar keyakinan angka permintaan. WAJIB tampil bersama angkanya: Tenant mengeluarkan
 *  uang sungguhan untuk menanam, jadi proyeksi bersandar dua minggu data tidak boleh
 *  terlihat sama meyakinkannya dengan delapan minggu. */
const KEYAKINAN: Record<string, string> = {
  TINGGI: "Keyakinan tinggi",
  SEDANG: "Keyakinan sedang",
  RENDAH: "Keyakinan rendah",
  TANPA_DATA: "Tanpa riwayat",
};

export default function RecommendationPage() {
  const [data, setData] = useState<PlantingRecommendation[]>([]);
  const [terkunci, setTerkunci] = useState(false);
  const [galat, setGalat] = useState("");
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(() => {
    setMemuat(true);
    ambilRekomendasi()
      .then((d) => {
        setData(d);
        setTerkunci(false);
      })
      .catch((e) => {
        if (e instanceof GalatApi && e.kode === "SUBSCRIPTION_REQUIRED") setTerkunci(true);
        else setGalat(e instanceof GalatApi ? e.message : "Gagal memuat rekomendasi");
      })
      .finally(() => setMemuat(false));
  }, []);

  useEffect(muat, [muat]);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat rekomendasi…</div>;

  if (terkunci) {
    return (
      <div className="p-8 max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <Lock className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Fitur Paket Verified</h2>
          <p className="text-sm text-gray-600 mb-1">
            Rekomendasi Tanam menunjukkan permintaan yang belum terpenuhi di zona Anda 8–16
            minggu ke depan.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Badge verifikasi lama Anda dan batch yang PO-nya sudah terjual tidak terpengaruh.
          </p>
          <button
            onClick={() => aktifkanLangganan(1).then(muat)}
            className="bg-emerald-950 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald-800"
          >
            Aktifkan Paket Verified
          </button>
          <p className="text-[11px] text-amber-700 mt-3">Mode peragaan: aktivasi tanpa pembayaran.</p>
        </div>
      </div>
    );
  }

  if (galat)
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{galat}</div>
      </div>
    );

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Rekomendasi Tanam</h1>
      <p className="text-sm text-gray-500 mb-6">
        Angka permintaan adalah <b>proyeksi</b> dari laju pesanan beberapa minggu terakhir —
        bukan pesanan yang sudah ada. Musiman dan hari raya belum dimodelkan.
      </p>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">Belum ada rekomendasi</h2>
          <p className="text-sm text-gray-500">
            Muncul bila ada permintaan yang belum tertutup dan umur tanam komoditasnya masih
            sempat dikejar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => {
            const s = SATURASI[r.saturation];
            return (
              <div
                key={`${r.commodityId}-${r.harvestWeekStart}`}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <h3 className="font-bold text-gray-900">{r.commodityName}</h3>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.kelas}`}>
                      {s.label}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {KEYAKINAN[r.confidence]}
                    </span>
                  </div>
                </div>

                {/* Kalimatnya dirakit server supaya angka dan kata selalu berubah bersamaan. */}
                <p className="text-sm text-gray-700 leading-relaxed">{r.sentence}</p>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>
                    Batas untuk Anda: <b className="text-gray-800">{r.suggestedKgForYou.toLocaleString("id-ID")} kg</b>
                  </span>
                  <span>
                    Sisa waktu tanam: <b className="text-gray-800">{r.daysUntilPlantingDeadline} hari</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
