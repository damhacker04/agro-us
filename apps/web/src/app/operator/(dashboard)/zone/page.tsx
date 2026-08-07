"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, MapPin, Pencil, Plus, X } from "lucide-react";
import type { UpsertZoneBody, ZoneSummary } from "@agro-os/shared";
import { GalatApi, ambilZonaOperator, buatZona, ubahZona } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const KOSONG: UpsertZoneBody = { name: "", city: "", minOrderValue: 0 };

/**
 * Manajemen zona layanan (OP-09).
 *
 * `minOrderValue` bukan angka hiasan: itu gerbang unit economics yang menolak checkout
 * di bawahnya, karena satu perjalanan kurir untuk muatan kecil merugi. Menurunkannya
 * berdampak langsung ke setiap pembeli di zona itu.
 */
export default function OperatorZonePage() {
  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  const [buka, setBuka] = useState(false);
  const [ubahId, setUbahId] = useState<string | null>(null);
  const [isi, setIsi] = useState<UpsertZoneBody>(KOSONG);
  const [proses, setProses] = useState(false);

  const muat = useCallback(() => {
    setMemuat(true);
    ambilZonaOperator()
      .then((d) => { setZona(d); setGalat(""); })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat zona"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => { muat(); }, [muat]);

  function mulaiUbah(z: ZoneSummary) {
    setUbahId(z.id);
    setIsi({ name: z.name, city: z.city, minOrderValue: z.minOrderValue });
    setBuka(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      if (ubahId) await ubahZona(ubahId, isi);
      else await buatZona(isi);
      setBuka(false);
      setUbahId(null);
      setIsi(KOSONG);
      muat();
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan zona.");
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Manajemen Zona</h1>
          <p className="text-sm text-gray-500 mt-1">
            Zona menentukan katalog mana yang dilihat pembeli dan Tenant mana yang bisa
            menjadi pengganti saat panen kurang.
          </p>
        </div>
        <button
          onClick={() => { setUbahId(null); setIsi(KOSONG); setBuka(true); }}
          className="shrink-0 flex items-center gap-2 bg-emerald-950 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-800"
        >
          <Plus className="w-4 h-4" /> Tambah Zona
        </button>
      </div>

      {galat && !buka && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 mb-4">{galat}</div>
      )}

      {buka && (
        <form onSubmit={simpan} className="bg-white border border-emerald-200 rounded-xl p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-emerald-950 text-sm">{ubahId ? "Ubah Zona" : "Zona Baru"}</h2>
            <button type="button" onClick={() => setBuka(false)} aria-label="Tutup">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required minLength={3} value={isi.name}
              onChange={(e) => setIsi({ ...isi, name: e.target.value })}
              placeholder="Nama zona (mis. Kota Malang)"
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
            <input required minLength={3} value={isi.city}
              onChange={(e) => setIsi({ ...isi, city: e.target.value })}
              placeholder="Kota/kabupaten"
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nilai minimum pesanan (Rp)</label>
            <input required type="number" min={0} value={isi.minOrderValue}
              onChange={(e) => setIsi({ ...isi, minOrderValue: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
            <p className="text-[11px] text-gray-500 mt-1">
              Checkout di bawah nilai ini ditolak — di titik itu satu perjalanan kurir merugi.
            </p>
          </div>
          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{galat}
            </p>
          )}
          <button type="submit" disabled={proses}
            className="w-full bg-emerald-950 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2">
            {proses && <Loader2 className="w-4 h-4 animate-spin" />}
            {proses ? "Menyimpan…" : "Simpan"}
          </button>
        </form>
      )}

      {memuat ? (
        <div className="text-sm text-gray-500">Memuat…</div>
      ) : (
        <div className="space-y-3">
          {zona.map((z) => (
            <div key={z.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />{z.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">
                  {z.city} · minimum pesanan {rp(z.minOrderValue)}
                </p>
              </div>
              <button onClick={() => mulaiUbah(z)}
                className="shrink-0 w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50">
                <Pencil className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
