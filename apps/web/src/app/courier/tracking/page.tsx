"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GEOFENCE_RADIUS_M,
  POSITION_PING_INTERVAL_MS,
  SIGNAL_LOST_AFTER_MS,
} from "@agro-os/shared";
import type { VerifyCourierCodeResponse } from "@agro-os/shared";
import { GalatApi, kirimPosisi, tandaiTanpaGps } from "@/lib/api";
import { desimal, jamWib } from "@/lib/format-id";
import { Galat, Halaman, Label, Panel, Pil, Prosa, Sunyi, Tombol } from "@/ui";

type Kiriman = { jarakM: number; wajar: boolean; pada: number };

const jarak = (m: number) => (m >= 1000 ? `${desimal(m / 1000, 1)} km` : `${Math.round(m)} m`);

/**
 * KR-2 — Layar kurir selama pengantaran (§5.6.3, FR-6.4).
 *
 * Posisi dikirim berkala; server yang memutuskan kewajarannya dan kapan dianggap tiba —
 * bukan halaman ini. Kalau geofence dihitung di sisi klien, siapa pun bisa mengaku tiba
 * dengan mengubah koordinat di peramban.
 *
 * TIDAK ada peta di sini, dan itu keputusan yang dipertahankan: peta hiasan dengan rute
 * karangan menyesatkan, sementara yang dibutuhkan kurir cuma satu angka jujur — masih
 * berapa jauh — beserta kapan angka itu terakhir diperbarui.
 *
 * MIGRASI DUNIA, dan yang terbesar bukan warnanya:
 *
 * 1. BINGKAI PONSEL PALSU DIBUANG. Layar ini sebelumnya menggambar ponsel — lebar dipatok
 *    400px, tinggi 700px, sudut 40px, bezel hitam 8px, `shadow-2xl` — lalu disajikan KEPADA
 *    kurir yang membukanya DI ponsel. Artinya ponsel di dalam ponsel: bezel dan sudut
 *    membulat memakan layar sungguhan milik orang yang sedang berdiri di bawah matahari
 *    sambil menahan box. Itu artefak mockup yang lolos ke produksi, bukan pilihan desain.
 *    Sekarang halamannya adalah layarnya.
 *
 * 2. LINGKARAN BERDENYUT DIBUANG. `animate-ping`, cincin putus-putus, dan piringan hijau
 *    tidak menyampaikan satu pun angka. Dunia ini menandai keadaan dengan GROUND penuh dan
 *    aturan tinta, dan angka jaraknya sendiri yang berubah tiap sepuluh detik adalah geraknya.
 *
 * 3. SINYAL BASI DINYATAKAN. Bila laporan terakhir sudah lewat `SIGNAL_LOST_AFTER_MS`,
 *    pembeli melihat "sinyal hilang" di layarnya (BY-12). Kurir sebelumnya tidak pernah
 *    diberi tahu bahwa dirinya terlihat begitu — sekarang layar ini mengatakannya, memakai
 *    ambang yang sama persis dari kontrak bersama.
 */
export default function TrackingPage() {
  const router = useRouter();

  const [sesi, setSesi] = useState<VerifyCourierCodeResponse | null>(null);
  const [terakhir, setTerakhir] = useState<Kiriman | null>(null);
  const [tiba, setTiba] = useState(false);
  const [tanpaGps, setTanpaGps] = useState(false);
  const [galat, setGalat] = useState("");
  const [siap, setSiap] = useState(false);
  // Jam dinding yang berdetak sendiri. Tanpa ini, "sinyal hilang" tidak pernah muncul pada
  // kasus yang justru paling membutuhkannya: ketika pengiriman posisi GAGAL, tidak ada
  // state yang berubah, jadi tidak ada render ulang yang bisa menyadari waktunya lewat.
  const [sekarang, setSekarang] = useState(() => Date.now());

  // Koordinat terbaru disimpan di ref, bukan state: pembaruan GPS bisa datang jauh
  // lebih sering daripada pengiriman berkala, dan tiap render ulang tidak ada gunanya.
  const posisi = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    const mentah = sessionStorage.getItem("agrous.kurir");
    if (mentah) setSesi(JSON.parse(mentah) as VerifyCourierCodeResponse);
    setSiap(true);
  }, []);

  useEffect(() => {
    const jeda = setInterval(() => setSekarang(Date.now()), 15_000);
    return () => clearInterval(jeda);
  }, []);

  const laporkan = useCallback(async () => {
    if (!sesi || !posisi.current || tiba) return;
    const { latitude, longitude } = posisi.current.coords;
    try {
      const r = await kirimPosisi(sesi.sessionId, {
        lat: latitude,
        lng: longitude,
        deviceTs: new Date().toISOString(),
      });
      setTerakhir({ jarakM: r.distanceToDestM, wajar: r.plausible, pada: Date.now() });
      setGalat("");
      if (r.arrived) setTiba(true);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Posisi gagal terkirim. Mencoba lagi…");
    }
  }, [sesi, tiba]);

  useEffect(() => {
    if (!sesi || tanpaGps || tiba) return;
    if (!navigator.geolocation) {
      setGalat("Peramban ini tidak bisa membaca lokasi. Pakai mode tanpa GPS di bawah.");
      return;
    }

    const jam = navigator.geolocation.watchPosition(
      (p) => {
        posisi.current = p;
        setGalat("");
      },
      (e) => {
        // Izin ditolak bukan kegagalan sistem — jalur konfirmasi manual memang
        // disediakan untuk kasus ini (§6.3).
        setGalat(
          e.code === e.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Pakai mode tanpa GPS di bawah — pengantaran tetap bisa diselesaikan."
            : "Lokasi belum terbaca. Pastikan GPS ponsel menyala.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    const interval = sesi.positionIntervalMs || POSITION_PING_INTERVAL_MS;
    void laporkan();
    const jeda = setInterval(() => void laporkan(), interval);

    return () => {
      navigator.geolocation.clearWatch(jam);
      clearInterval(jeda);
    };
  }, [sesi, tanpaGps, tiba, laporkan]);

  async function pilihTanpaGps() {
    if (!sesi) return;
    try {
      await tandaiTanpaGps(sesi.sessionId);
      setTanpaGps(true);
      setGalat("");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Mode tanpa GPS gagal diaktifkan.");
    }
  }

  /* Ground yang sama dengan halaman tujuannya, supaya perpindahan tidak berkedip putih. */
  if (!siap) return <div className="min-h-screen bg-kertas" />;

  if (!sesi) {
    return (
      <Halaman lebar="sempit" judul="Sesi antar tidak ditemukan" className="min-h-screen">
        <Galat judul="Pengantaran ini belum dibuka di ponsel ini">
          Sesi antar berumur satu perjalanan dan tersimpan hanya selama tab ini terbuka.
          Pindai ulang QR pada box dengan kamera ponsel Anda, lalu masukkan Kode Antar dari
          penjual.
        </Galat>
      </Halaman>
    );
  }

  const basi = terakhir !== null && sekarang - terakhir.pada > SIGNAL_LOST_AFTER_MS;
  const detik = Math.round((sesi.positionIntervalMs || POSITION_PING_INTERVAL_MS) / 1000);

  return (
    <Halaman
      lebar="sempit"
      judul="Pengantaran berlangsung"
      className="min-h-screen"
      aksi={
        tiba ? (
          <Pil nada="utama">Tiba</Pil>
        ) : tanpaGps ? (
          <Pil nada="awas">Tanpa GPS</Pil>
        ) : (
          <Pil nada="kabar" garis>
            Mengirim tiap {detik} detik
          </Pil>
        )
      }
    >
      {/* Keadaan yang menentukan menguasai ground penuh — hukum region-utuh dipakai apa
          adanya di sini karena blok ini memang satu region kecil yang utuh, dan karena
          layar yang dibaca di bawah matahari butuh bidang warna, bukan aksen. */}
      {tiba ? (
        <div className="bg-ungu p-6">
          <Label className="text-kabut-ungu">Tiba di titik antar</Label>
          <p className="mt-2 text-[22px] font-extrabold leading-tight text-kertas-terang">
            Pembeli sudah diberi tahu
          </p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-kabut-ungu">
            Serahkan barang dan tunggu pembeli menekan konfirmasi penerimaan. Sesi ini tetap
            terbuka sampai mereka melakukannya — jangan tutup layar sebelum barang berpindah
            tangan.
          </p>
        </div>
      ) : tanpaGps ? (
        <div className="bg-jambu p-6">
          <Label className="text-kabut-jambu">Mode tanpa GPS</Label>
          <p className="mt-2 text-[22px] font-extrabold leading-tight text-kertas-terang">
            Posisi Anda tidak dilacak
          </p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-kabut-jambu">
            Pembeli sudah diberi tahu bahwa kedatangan dikonfirmasi manual. Hubungi penerima
            saat Anda sampai di lokasi; nomornya ada pada penjual yang menyerahkan box.
          </p>
        </div>
      ) : terakhir ? (
        <div className="border-t-2 border-tinta pt-4">
          <Label>Jarak ke titik antar</Label>
          {/* Satu angka, sebesar yang layar izinkan. Inilah seluruh isi layar ini bagi orang
              yang sedang menyetir motor dan berhenti sebentar untuk melihatnya.
              Tracking negatif tipis: monospace pada 56px merenggang sampai angka dan
              satuannya terbaca sebagai dua benda terpisah. */}
          <p className="mt-2.5 font-mono text-[56px] leading-none tracking-[-0.03em] text-tinta">
            {jarak(terakhir.jarakM)}
          </p>
          <Prosa className="mt-4 text-[14px]">
            Dianggap tiba di bawah{" "}
            <span className="font-mono text-tinta">{sesi.destRadiusM ?? GEOFENCE_RADIUS_M} m</span>.
            Yang memutuskan kedatangan adalah server, bukan ponsel ini — jadi tidak ada tombol
            &ldquo;saya sudah sampai&rdquo; yang bisa ditekan lebih awal.
          </Prosa>

          {!terakhir.wajar ? (
            <div className="mt-5 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">Perpindahan terakhir ditandai</Label>
              <Prosa className="mt-1.5 text-[14px]">
                Lompatan posisinya di luar batas kecepatan wajar, jadi titik itu disimpan tetapi
                tidak dipakai menghitung kedatangan. Ini biasa terjadi saat sinyal melompat di
                antara gedung; teruskan perjalanan seperti biasa.
              </Prosa>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-t-2 border-biru pt-4">
          <Label className="text-biru">Mencari lokasi</Label>
          <p className="mt-2.5 text-[22px] font-extrabold leading-tight text-tinta">
            Menunggu titik pertama dari GPS
          </p>
          <Prosa className="mt-2.5 text-[14px]">
            Posisi dikirim tiap <span className="font-mono text-tinta">{detik} detik</span> begitu
            GPS terbaca. Bila ponsel meminta izin lokasi, izinkan — tanpa itu kedatangan harus
            dikonfirmasi manual.
          </Prosa>
        </div>
      )}

      {/* Stempel waktu ditampilkan apa adanya, termasuk saat sudah lama: menyembunyikannya
          membuat posisi basi terlihat seperti posisi terkini, di layar yang justru dipakai
          memutuskan apakah perlu menelepon penerima. */}
      {terakhir ? (
        <div className={basi ? "mt-6 border-t-2 border-jambu pt-3" : "mt-6 border-t border-kertas-garis pt-3"}>
          <Label className={basi ? "text-jambu" : ""}>
            {basi ? "Sinyal hilang" : "Posisi terakhir terkirim"}
          </Label>
          <p className="mt-1.5 font-mono text-[15px] text-tinta">
            {jamWib(new Date(terakhir.pada).toISOString())} WIB
          </p>
          {basi ? (
            <Prosa className="mt-1.5 text-[14px]">
              Sudah lebih dari {Math.round(SIGNAL_LOST_AFTER_MS / 60000)} menit sejak posisi
              terakhir sampai ke server, dan pembeli melihat pengiriman ini sebagai sinyal
              hilang. Bila sinyal tidak kembali, telepon penerima saat Anda dekat.
            </Prosa>
          ) : null}
        </div>
      ) : null}

      {galat ? (
        <Galat judul="Lokasi belum terkirim" className="mt-6">
          {galat}
        </Galat>
      ) : null}

      <Panel label="Titik tujuan" judul="Koordinat yang dipakai server" className="mt-8">
        <p className="font-mono text-[15px] text-tinta">
          {sesi.destination.lat.toFixed(5)}, {sesi.destination.lng.toFixed(5)}
        </p>
        <Sunyi className="mt-2 text-[13px]">
          Radius terima {sesi.destRadiusM ?? GEOFENCE_RADIUS_M} m. Titik ini diisi pembeli saat
          memesan, jadi patokan alamatnya ada pada penjual bila koordinatnya meleset.
        </Sunyi>
      </Panel>

      {/* Jalan keluar yang MENYELESAIKAN pengantaran memenuhi lebar dan setinggi ibu jari;
          yang sekadar menutup layar tidak. Keduanya rata kiri: dokumen ini rata kiri dari
          judul sampai catatan kaki, dan satu blok yang ditengahkan terbaca sebagai judul
          bagian baru, bukan sebagai kendali. */}
      <div className="mt-8">
        {!tiba && !tanpaGps ? (
          <>
            {/* Pertanyaannya jadi label, bukan isi tombol. Label tombol sepanjang kalimat
                pecah jadi dua baris di 375px dan berhenti terbaca sebagai satu tindakan. */}
            <Label className="mb-2">Tidak bisa berbagi lokasi?</Label>
            <Tombol rupa="kedua" penuh className="py-4 text-[15px]" onClick={pilihTanpaGps}>
              Lanjut tanpa GPS
            </Tombol>
          </>
        ) : null}
        <div className={!tiba && !tanpaGps ? "mt-6 border-t border-kertas-garis pt-4" : "border-t border-kertas-garis pt-4"}>
          <Tombol rupa="sunyi" className="-ml-3" onClick={() => router.push("/")}>
            Tutup layar antar
          </Tombol>
          <Sunyi className="mt-1.5 text-[12px]">
            Menutup layar menghentikan pengiriman posisi. Pengantaran sendiri tidak dibatalkan,
            tetapi pembeli akan melihat sinyal Anda hilang.
          </Sunyi>
        </div>
      </div>
    </Halaman>
  );
}
