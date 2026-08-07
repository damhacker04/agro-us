"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  PersonStanding,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { CaptureMethod } from "@agro-os/shared";
import { GalatApi, buatLahan } from "@/lib/api";

type Titik = { lat: number; lng: number };

/**
 * Luas perkiraan dengan rumus shoelace di atas proyeksi equirectangular lokal.
 *
 * HANYA panduan di layar. Luas yang mengikat dihitung server dengan PostGIS
 * (`ST_Area(polygon::geography)`) — dan itulah yang menentukan batas kuota. Angka di
 * sini boleh meleset sedikit; yang penting Tenant tahu lebih awal kalau petaknya
 * kekecilan, bukan setelah formulirnya ditolak.
 */
function luasPerkiraanHa(titik: Titik[]): number {
  if (titik.length < 3) return 0;
  const R = 6_371_000;
  const lat0 = (titik.reduce((s, t) => s + t.lat, 0) / titik.length) * (Math.PI / 180);
  const xy = titik.map((t) => ({
    x: ((t.lng * Math.PI) / 180) * R * Math.cos(lat0),
    y: ((t.lat * Math.PI) / 180) * R,
  }));
  let luas = 0;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i]!;
    const b = xy[(i + 1) % xy.length]!;
    luas += a.x * b.y - b.x * a.y;
  }
  return Math.abs(luas / 2) / 10_000;
}

function Pratinjau({ titik }: { titik: Titik[] }) {
  if (titik.length < 2) return null;
  const xs = titik.map((t) => t.lng);
  const ys = titik.map((t) => t.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rentang = Math.max(maxX - minX, maxY - minY) || 1;
  const TEPI = 6;
  const isi = 100 - TEPI * 2;
  const gx = (isi - ((maxX - minX) / rentang) * isi) / 2;
  const gy = (isi - ((maxY - minY) / rentang) * isi) / 2;
  const p = titik
    .map((t) => {
      const x = TEPI + ((t.lng - minX) / rentang) * isi + gx;
      const y = 100 - (TEPI + ((t.lat - minY) / rentang) * isi + gy);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-xs mx-auto" role="img" aria-label="Bentuk petak">
      <polygon
        points={p}
        className="fill-emerald-400/40 stroke-emerald-600"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {titik.map((t, i) => {
        const x = TEPI + ((t.lng - minX) / rentang) * isi + gx;
        const y = 100 - (TEPI + ((t.lat - minY) / rentang) * isi + gy);
        return <circle key={i} cx={x} cy={y} r={1.6} className="fill-emerald-800" />;
      })}
    </svg>
  );
}

/**
 * Penangkap poligon petak lahan (FR-1.5).
 *
 * TIDAK memakai peta latar. Tanpa penyedia ubin peta, yang bisa digambar hanyalah peta
 * hiasan — dan poligon yang digambar di atas peta karangan menghasilkan koordinat
 * karangan pula. Yang dipakai di sini koordinat sungguhan: dari GPS perangkat, atau
 * diketik manual bila Tenant sudah memegang titiknya.
 *
 * Dipakai dua tempat — Manajemen Lahan dan onboarding Tenant — yang hanya berbeda pada
 * ke mana perginya setelah tersimpan.
 */
export function PetaLahan({ setelahSimpan }: { setelahSimpan: () => void }) {
  const [metode, setMetode] = useState<CaptureMethod>("WALK_AROUND");
  const [titik, setTitik] = useState<Titik[]>([]);
  const [latManual, setLatManual] = useState("");
  const [lngManual, setLngManual] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  function ambilGps() {
    setGalat("");
    if (!navigator.geolocation) return setGalat("Perangkat ini tidak mendukung lokasi.");
    navigator.geolocation.getCurrentPosition(
      (p) => setTitik((t) => [...t, { lat: p.coords.latitude, lng: p.coords.longitude }]),
      (e) =>
        setGalat(
          e.code === e.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Gunakan mode ketik koordinat."
            : "Lokasi belum terbaca. Pastikan GPS menyala dan Anda di luar ruangan.",
        ),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function tambahManual() {
    const lat = Number(latManual);
    const lng = Number(lngManual);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return setGalat("Koordinat tidak sah.");
    setTitik((t) => [...t, { lat, lng }]);
    setLatManual("");
    setLngManual("");
    setGalat("");
  }

  async function simpan() {
    if (titik.length < 3) return setGalat("Butuh minimal 3 titik untuk membentuk petak.");
    setProses(true);
    setGalat("");
    try {
      // Cincin GeoJSON WAJIB tertutup: titik terakhir sama persis dengan titik pertama.
      const ring: [number, number][] = [...titik, titik[0]!].map((t) => [t.lng, t.lat]);
      await buatLahan({
        polygon: { type: "Polygon", coordinates: [ring] },
        captureMethod: metode,
      });
      setelahSimpan();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan lahan.");
      setProses(false);
    }
  }

  const luas = luasPerkiraanHa(titik);
  const terlaluKecil = titik.length >= 3 && luas < MIN_LAND_PLOT_HA;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {(
          [
            {
              nilai: "WALK_AROUND" as const,
              Ikon: PersonStanding,
              judul: "Kelilingi Lahan",
              teks: "Berjalan ke tiap sudut, tekan tombol di setiap titik.",
            },
            {
              nilai: "GAMBAR_PETA" as const,
              Ikon: Crosshair,
              judul: "Ketik Koordinat",
              teks: "Bila Anda sudah punya titik sudutnya.",
            },
          ]
        ).map((m) => (
          <button
            key={m.nilai}
            onClick={() => setMetode(m.nilai)}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
              metode === m.nilai
                ? "border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/40"
                : "border-gray-200 hover:border-emerald-300 bg-white"
            }`}
          >
            <m.Ikon
              className={`w-5 h-5 shrink-0 mt-0.5 ${metode === m.nilai ? "text-emerald-700" : "text-gray-400"}`}
            />
            <div>
              <div className="font-bold text-sm text-gray-900">{m.judul}</div>
              <div className="text-xs text-gray-500 mt-0.5">{m.teks}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        {metode === "WALK_AROUND" ? (
          <button
            onClick={ambilGps}
            className="w-full flex items-center justify-center gap-2 bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800"
          >
            <Plus className="w-4 h-4" /> Tandai Titik Sudut di Sini
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={latManual}
              onChange={(e) => setLatManual(e.target.value)}
              placeholder="lintang (mis. -7.8412)"
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <input
              value={lngManual}
              onChange={(e) => setLngManual(e.target.value)}
              placeholder="bujur (mis. 112.4701)"
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={tambahManual}
              className="shrink-0 px-4 bg-emerald-950 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800"
            >
              Tambah
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-emerald-950 text-sm">
            Titik Sudut ({titik.length})
          </h2>
          {titik.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => setTitik((t) => t.slice(0, -1))}
                className="text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <Undo2 className="w-3 h-3" /> Batal satu
              </button>
              <button
                onClick={() => setTitik([])}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Hapus semua
              </button>
            </div>
          )}
        </div>

        {titik.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada titik. Butuh minimal 3 untuk membentuk petak.
          </p>
        ) : (
          <>
            <Pratinjau titik={titik} />
            <ol className="mt-4 space-y-1 text-xs font-mono text-gray-600 max-h-40 overflow-y-auto">
              {titik.map((t, i) => (
                <li key={i}>
                  {i + 1}. {t.lat.toFixed(6)}, {t.lng.toFixed(6)}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {titik.length >= 3 && (
        <div
          className={`rounded-xl border p-4 mb-5 text-sm ${
            terlaluKecil
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <div className="flex items-start gap-2">
            {terlaluKecil ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">Luas perkiraan {luas.toFixed(2)} ha</p>
              <p className="text-xs mt-0.5">
                {terlaluKecil
                  ? `Di bawah ${MIN_LAND_PLOT_HA} ha — terlalu kecil untuk dipisahkan dari petak tetangga oleh citra satelit. Batch di lahan ini hanya bisa mencapai badge bukti foto.`
                  : "Angka pastinya dihitung ulang server dengan PostGIS saat disimpan."}
              </p>
            </div>
          </div>
        </div>
      )}

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {galat}
        </p>
      )}

      <button
        onClick={simpan}
        disabled={proses || titik.length < 3}
        className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {proses && <Loader2 className="w-4 h-4 animate-spin" />}
        {proses ? "Menyimpan…" : "Simpan Petak Lahan"}
      </button>
    </div>
  );
}
