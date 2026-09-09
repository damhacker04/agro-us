"use client";

import React, { useState } from "react";
import { MapPin, Trash2, Undo2 } from "lucide-react";
import { MIN_LAND_PLOT_HA } from "@agro-os/shared";
import type { CaptureMethod, LandPlotResponse } from "@agro-os/shared";
import { GalatApi, buatLahan } from "@/lib/api";
import { desimal } from "@/lib/format-id";
import {
  Galat,
  Ikon,
  Label,
  Masukan,
  Medan,
  Panel,
  Prosa,
  Radio,
  Sunyi,
  Tombol,
} from "@/ui";

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

/**
 * Bentuk petak yang sedang dibangun — poligon sungguhan, bukan hiasan.
 *
 * Warnanya `ungu`, warna mekanisme verifikasi, dan itu bukan pilihan sembarang: poligon
 * inilah yang nanti diadu dengan citra satelit. Digambar di atas panel `kertas-terang`
 * tanpa latar peta, jadi tidak ada yang bisa disalahartikan sebagai lokasi presisi.
 */
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
  const xy = (t: Titik) => ({
    x: TEPI + ((t.lng - minX) / rentang) * isi + gx,
    y: 100 - (TEPI + ((t.lat - minY) / rentang) * isi + gy),
  });
  const p = titik
    .map((t) => {
      const { x, y } = xy(t);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto w-full max-w-[16rem]"
      role="img"
      aria-label={`Bentuk petak dari ${titik.length} titik sudut`}
    >
      <polygon
        points={p}
        className="fill-ungu/15 stroke-ungu"
        strokeWidth={1.5}
        strokeLinejoin="miter"
      />
      {titik.map((t, i) => {
        const { x, y } = xy(t);
        return <circle key={i} cx={x} cy={y} r={1.6} className="fill-ungu" />;
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
 *
 * MIGRASI DUNIA, dan konteks pakainya yang menentukan bentuknya: mode "kelilingi lahan"
 * dijalankan SAMBIL BERJALAN DI PEMATANG, berhenti di tiap sudut, satu tangan memegang
 * ponsel. Tombol tandai titiknya karena itu memakai langkah `field-action` — sasaran
 * setinggi ibu jari yang bisa ditekan tanpa membidik, bukan tombol 13px yang menuntut
 * orang berhenti dan menunduk.
 */
export function PetaLahan({
  setelahSimpan,
}: {
  /**
   * Menerima petak yang BARU DIBUAT, bukan sekadar isyarat "sudah selesai".
   *
   * Tanpa itu, layar ringkasan setelahnya harus menebak petak mana yang barusan tersimpan
   * dengan menebak dari daftar — dan daftar lahan diurutkan server `ORDER BY area_ha DESC`,
   * bukan menurut waktu buat. Menebak "yang terakhir di daftar" berarti menampilkan petak
   * TERKECIL sambil menyebutnya petak terbaru.
   */
  setelahSimpan: (lahan: LandPlotResponse) => void;
}) {
  const [metode, setMetode] = useState<CaptureMethod>("WALK_AROUND");
  const [titik, setTitik] = useState<Titik[]>([]);
  const [latManual, setLatManual] = useState("");
  const [lngManual, setLngManual] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  function ambilGps() {
    setGalat("");
    if (!navigator.geolocation) {
      return setGalat("Peramban ini tidak bisa membaca lokasi. Pakai mode ketik koordinat.");
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setTitik((t) => [...t, { lat: p.coords.latitude, lng: p.coords.longitude }]),
      (e) =>
        setGalat(
          e.code === e.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Pakai mode ketik koordinat di atas."
            : "Lokasi belum terbaca. Pastikan GPS menyala dan Anda berada di luar ruangan.",
        ),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function tambahManual() {
    const lat = Number(latManual);
    const lng = Number(lngManual);
    if (!latManual || !lngManual || Number.isNaN(lat) || Number.isNaN(lng)) {
      return setGalat("Koordinat tidak sah. Isi lintang dan bujur sebagai angka desimal.");
    }
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
      const dibuat = await buatLahan({
        polygon: { type: "Polygon", coordinates: [ring] },
        captureMethod: metode,
      });
      setelahSimpan(dibuat);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Petak gagal disimpan.");
      setProses(false);
    }
  }

  const luas = luasPerkiraanHa(titik);
  const terlaluKecil = titik.length >= 3 && luas < MIN_LAND_PLOT_HA;

  return (
    <div>
      <fieldset>
        <legend className="mb-3">
          <Label>Cara menandai sudut</Label>
        </legend>
        <div className="space-y-2">
          <Radio
            nama="metode-petak"
            nilai="WALK_AROUND"
            terpilih={metode === "WALK_AROUND"}
            onPilih={(v) => setMetode(v as CaptureMethod)}
            judul="Kelilingi lahan"
          >
            Berjalan ke tiap sudut petak, lalu tekan tombol di setiap titik. Koordinatnya
            diambil dari GPS ponsel Anda saat itu juga.
          </Radio>
          <Radio
            nama="metode-petak"
            nilai="GAMBAR_PETA"
            terpilih={metode === "GAMBAR_PETA"}
            onPilih={(v) => setMetode(v as CaptureMethod)}
            judul="Ketik koordinat"
          >
            Bila Anda sudah memegang titik sudutnya dari sumber lain — sertifikat, pengukuran
            sebelumnya, atau aplikasi peta.
          </Radio>
        </div>
      </fieldset>

      <Panel label="Menandai" judul="Tambahkan titik sudut" className="mt-8">
        {metode === "WALK_AROUND" ? (
          <>
            <Tombol penuh className="py-4 text-[16px]" onClick={ambilGps}>
              <Ikon dari={MapPin} />
              Tandai sudut di titik ini
            </Tombol>
            <Sunyi className="mt-2.5 max-w-[68ch] text-[13px]">
              Berdiri sedekat mungkin dengan patok sudutnya sebelum menekan. Ketelitian GPS
              ponsel biasanya beberapa meter, dan itu sudah cukup untuk petak seluas hektar.
            </Sunyi>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <Medan label="Lintang">
              {(alat) => (
                <Masukan
                  {...alat}
                  inputMode="decimal"
                  value={latManual}
                  onChange={(e) => setLatManual(e.target.value)}
                  placeholder="-7.8412"
                  className="font-mono"
                />
              )}
            </Medan>
            <Medan label="Bujur">
              {(alat) => (
                <Masukan
                  {...alat}
                  inputMode="decimal"
                  value={lngManual}
                  onChange={(e) => setLngManual(e.target.value)}
                  placeholder="112.4701"
                  className="font-mono"
                />
              )}
            </Medan>
            <Tombol type="button" onClick={tambahManual} className="py-3">
              Tambah titik
            </Tombol>
          </div>
        )}
      </Panel>

      <Panel
        label={`${titik.length} titik sudut`}
        judul="Bentuk petak Anda"
        className="mt-8"
        aksi={
          titik.length > 0 ? (
            <>
              <Tombol rupa="sunyi" ukuran="sm" onClick={() => setTitik((t) => t.slice(0, -1))}>
                <Ikon dari={Undo2} ukuran="sm" />
                Batal satu
              </Tombol>
              <Tombol rupa="sunyi" ukuran="sm" onClick={() => setTitik([])} className="text-jambu">
                <Ikon dari={Trash2} ukuran="sm" />
                Hapus semua
              </Tombol>
            </>
          ) : null
        }
      >
        {titik.length === 0 ? (
          <Prosa className="text-[14px]">
            Belum ada titik. Sebuah petak butuh minimal tiga sudut — mulai dari sudut mana pun,
            lalu lanjutkan searah keliling lahan.
          </Prosa>
        ) : (
          <>
            <Pratinjau titik={titik} />
            <ol className="mt-6 max-h-44 overflow-y-auto">
              {titik.map((t, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-4 border-t border-kertas-garis py-2 font-mono text-[13px] text-tinta"
                >
                  <span className="text-tinta-samar">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    {t.lat.toFixed(6)}, {t.lng.toFixed(6)}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* Luas perkiraan berdiri SEBELUM tombol simpan, bukan sesudah penolakan server:
            Tenant yang petaknya kekecilan berhak tahu sekarang, sambil masih berdiri di
            lahannya dan masih bisa memperluas keliling yang ia tandai. */}
        {titik.length >= 3 ? (
          <div
            className={
              terlaluKecil
                ? "mt-8 border-t-2 border-jambu pt-3"
                : "mt-8 border-t-2 border-tinta pt-3"
            }
          >
            <Label className={terlaluKecil ? "text-jambu" : ""}>Luas perkiraan</Label>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-[26px] leading-none text-tinta">
                {desimal(luas, 2)}
              </span>
              <span className="text-[13px] text-tinta-samar">hektar</span>
            </div>
            <Prosa className="mt-2.5 text-[14px]">
              {terlaluKecil
                ? `Di bawah ${desimal(MIN_LAND_PLOT_HA, 1)} ha — terlalu kecil untuk dipisahkan dari petak tetangga oleh citra satelit. Petak ini tetap bisa disimpan dan tetap bisa dipakai membuka kuota; yang tidak bisa dicapai batch di sini hanyalah badge Terverifikasi Satelit, jadi ia bersandar pada bukti foto.`
                : "Angka pastinya dihitung ulang server dengan PostGIS saat disimpan, dari poligon yang sama. Yang di layar ini perkiraan supaya Anda tahu lebih awal."}
            </Prosa>
          </div>
        ) : null}
      </Panel>

      {galat ? (
        <Galat judul="Petak belum tersimpan" className="mt-8">
          {galat}
        </Galat>
      ) : null}

      <Tombol
        penuh
        className="mt-8 py-4 text-[16px]"
        onClick={simpan}
        sibuk={proses}
        labelSibuk="Menyimpan…"
        disabled={titik.length < 3}
      >
        Simpan petak lahan
      </Tombol>
    </div>
  );
}
