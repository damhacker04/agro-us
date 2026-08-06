"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { GalatApi, tambahNodeTimeline } from "@/lib/api";
import { TimelineActivity } from "@agro-os/shared";

/** Tujuh jenis kegiatan terstruktur, bukan teks bebas (§5.4.1) — supaya bisa dibandingkan
 *  antar batch dan antar Tenant, dan supaya satelit punya acuan yang jelas. */
const JENIS: { nilai: keyof typeof TimelineActivity; label: string }[] = [
  { nilai: "PENYIAPAN_LAHAN", label: "Penyiapan Lahan" },
  { nilai: "PENANAMAN", label: "Penanaman" },
  { nilai: "PEMUPUKAN", label: "Pemupukan" },
  { nilai: "PENGENDALIAN_HAMA", label: "Pengendalian Hama" },
  { nilai: "PENGAIRAN", label: "Pengairan" },
  { nilai: "PANEN", label: "Panen" },
  { nilai: "GAGAL_PANEN", label: "Gagal Panen" },
];

export default function TambahNodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = React.use(params);
  const router = useRouter();

  const [jenis, setJenis] = useState<string>("PEMUPUKAN");
  const [deskripsi, setDeskripsi] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [alasanLuar, setAlasanLuar] = useState("");
  const [fulfilledBox, setFulfilledBox] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  const perluJumlahPanen = jenis === "PANEN";

  function ambilLokasi() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setGalat("Izin lokasi ditolak. Isi koordinat secara manual."),
    );
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!berkas) return setGalat("Foto bukti wajib dilampirkan.");
    setGalat("");
    setProses(true);
    try {
      const form = new FormData();
      form.append("activityType", jenis);
      form.append("description", deskripsi);
      form.append("lat", lat);
      form.append("lng", lng);
      // Waktu perangkat direkam otomatis, tidak diketik pengguna (§5.4.1). Server menolak
      // stempel waktu yang lebih maju dari waktunya sendiri.
      form.append("deviceTs", new Date().toISOString());
      form.append("captureSource", "IN_APP_CAMERA");
      if (alasanLuar) form.append("outsidePolygonReason", alasanLuar);
      if (perluJumlahPanen && fulfilledBox) form.append("fulfilledBox", fulfilledBox);
      form.append("photos", berkas);

      await tambahNodeTimeline(batchId, form);
      router.push(`/tenant/batch/${batchId}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan catatan.");
      setProses(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/tenant/batch/${batchId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Batch
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Catat Kegiatan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Catatan bersifat <b>permanen</b>. Tidak bisa diubah atau dihapus — koreksi dilakukan
        dengan menambah catatan Ralat yang menunjuk catatan lama, dan keduanya tetap terlihat
        pembeli.
      </p>

      <form onSubmit={simpan} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis kegiatan</label>
            <div className="grid grid-cols-2 gap-2">
              {JENIS.map((j) => (
                <button
                  key={j.nilai}
                  type="button"
                  onClick={() => setJenis(j.nilai)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                    jenis === j.nilai
                      ? "bg-emerald-950 text-white border-emerald-950"
                      : j.nilai === "GAGAL_PANEN"
                        ? "border-red-200 text-red-700 hover:bg-red-50"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          {(jenis === "PANEN" || jenis === "GAGAL_PANEN") && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              Catatan ini <b>menutup batch</b>. Shortfall tercatat permanen, memengaruhi rasio
              publik Anda dan kuota siklus berikutnya. Pembeli yang pesanannya tidak terpenuhi
              langsung ditawari substitusi, penjadwalan ulang, atau pengembalian dana.
            </div>
          )}

          {perluJumlahPanen && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Jumlah box hasil panen aktual
              </label>
              <input
                type="number"
                min={0}
                value={fulfilledBox}
                onChange={(e) => setFulfilledBox(e.target.value)}
                placeholder="mis. 150"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Kosongkan bila seluruh kuota terjual terpenuhi.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              required
              minLength={3}
              maxLength={280}
              rows={3}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Apa yang dikerjakan hari ini?"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{deskripsi.length}/280 karakter</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto bukti</label>
            <label className="flex items-center gap-3 px-3 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Camera className="w-5 h-5 text-emerald-700" />
              <span className="text-sm text-gray-600">
                {berkas ? berkas.name : "Ambil foto atau pilih berkas"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Foto ikut di-hash ke dalam rantai bukti, jadi tidak bisa ditukar belakangan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Koordinat lokasi
            </label>
            <div className="flex gap-2">
              <input
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="lintang"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <input
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="bujur"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={ambilLokasi}
                className="shrink-0 px-3 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <MapPin className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Harus di dalam batas lahan terdaftar. Bila di luar, alasannya wajib diisi dan{" "}
              <b>akan ditampilkan kepada pembeli</b>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Alasan bila di luar lahan{" "}
              <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              value={alasanLuar}
              onChange={(e) => setAlasanLuar(e.target.value)}
              placeholder="mis. sinyal GPS meleset, foto diambil dari tepi jalan"
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
          {proses ? "Menyimpan…" : "Simpan Catatan Permanen"}
        </button>
      </form>
    </div>
  );
}
