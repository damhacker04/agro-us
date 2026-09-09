"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Images, MapPin } from "lucide-react";
import { GalatApi, deklarasiPanen, konfirmasiPanen, tambahNodeTimeline } from "@/lib/api";
import { CaptureSource, TimelineActivity, type HarvestPreviewResponse } from "@agro-os/shared";
import {
  AreaTeks,
  Berkas,
  Galat,
  Halaman,
  Ikon,
  Label,
  Masukan,
  Medan,
  Panel,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
} from "@/ui";
import { PenilaianPanen } from "./PenilaianPanen";

/**
 * TN-18 — Catat kegiatan lapangan.
 *
 * Layar ini dibuka SAMBIL BERDIRI DI KEBUN, satu tangan, pada Android kelas menengah-bawah
 * dengan sinyal seadanya. Batasannya mengikat: paling banyak tiga ketukan plus kamera.
 * Itu yang menentukan bentuknya, bukan selera — jenis kegiatan berupa petak besar yang
 * bisa ditekan tanpa membidik, koordinat diminta SENDIRI saat layar dibuka alih-alih
 * menunggu satu ketukan tambahan, dan tombol kirimnya setinggi ibu jari.
 *
 * MIGRASI DUNIA, dengan tiga perubahan yang bukan soal rupa:
 *
 * 1. ASAL FOTO TIDAK LAGI DIPALSUKAN. Versi sebelumnya selalu mengirim
 *    `captureSource: "IN_APP_CAMERA"` — dipaku di kode — meskipun berkasnya dipilih dari
 *    galeri. Kontraknya punya `GALLERY`, server menyimpannya apa adanya, dan halaman
 *    rincian batch milik pembeli menampilkan pil "Dari galeri" dari field itu; artinya pil
 *    itu tidak pernah bisa muncul, dan rantai bukti memuat klaim asal-usul yang tidak
 *    ditopang apa pun. Di produk yang menjual bukti yang bisa diperiksa, itu bukan detail.
 *    Sekarang ada DUA kendali, dan yang tercatat adalah kendali yang benar-benar dipakai.
 *
 * 2. "GAGAL PANEN" TIDAK LAGI DIWARNAI BAHAYA. Tombolnya dulu bergaris merah di antara
 *    enam tombol netral. Deklarasi gagal panen justru yang PALING dibutuhkan sistem ini
 *    tepat waktu dan jujur; mewarnainya seperti tindakan terlarang menghukum kejujuran
 *    sebelum orangnya sempat jujur. Konsekuensinya tetap dinyatakan — tetapi setelah
 *    dipilih, sebagai kalimat, bukan sebagai warna yang menghakimi dari kejauhan.
 *
 * 3. TOMBOL AMBIL LOKASI PUNYA NAMA. Dulu ia hanya glif peta tanpa teks maupun
 *    `aria-label`: bagi pembaca layar ia tombol tanpa nama, dan tanpa koordinat catatan
 *    tidak bisa dikirim sama sekali.
 */

/** Tujuh jenis kegiatan terstruktur, bukan teks bebas (§5.4.1) — supaya bisa dibandingkan
 *  antar batch dan antar Tenant, dan supaya satelit punya acuan yang jelas. */
const JENIS: { nilai: keyof typeof TimelineActivity; label: string }[] = [
  { nilai: "PENYIAPAN_LAHAN", label: "Penyiapan lahan" },
  { nilai: "PENANAMAN", label: "Penanaman" },
  { nilai: "PEMUPUKAN", label: "Pemupukan" },
  { nilai: "PENGENDALIAN_HAMA", label: "Pengendalian hama" },
  { nilai: "PENGAIRAN", label: "Pengairan" },
  { nilai: "PANEN", label: "Panen" },
  { nilai: "GAGAL_PANEN", label: "Gagal panen" },
];

export default function TambahNodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = React.use(params);
  const router = useRouter();

  const [jenis, setJenis] = useState<string>("PEMUPUKAN");
  const [deskripsi, setDeskripsi] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [sumber, setSumber] = useState<CaptureSource>("IN_APP_CAMERA");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [alasanLuar, setAlasanLuar] = useState("");
  const [fulfilledBox, setFulfilledBox] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatFoto, setGalatFoto] = useState("");
  const [galatLokasi, setGalatLokasi] = useState("");

  // Alur panen dua langkah (sequence 04b). Selama `pratinjau` terisi, layar berpindah ke
  // TN-19b/19c/19a dan BELUM ada apa pun yang tertulis — itu seluruh gunanya.
  const [pratinjau, setPratinjau] = useState<HarvestPreviewResponse | null>(null);

  const perluJumlahPanen = jenis === "PANEN";
  const menutupBatch = jenis === "PANEN" || jenis === "GAGAL_PANEN";

  function ambilLokasi() {
    setGalatLokasi("");
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setGalatLokasi("Izin lokasi ditolak. Isi koordinatnya sendiri di bawah."),
    );
  }

  // Diminta sendiri saat layar dibuka. Satu ketukan lebih sedikit di kebun, dan koordinat
  // yang terisi lebih awal punya waktu lebih panjang untuk mengunci titik yang akurat.
  useEffect(() => {
    ambilLokasi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Susun badan multipart node timeline. Sama untuk jalur biasa maupun konfirmasi panen. */
  function susunForm(): FormData {
    const form = new FormData();
    form.append("activityType", jenis);
    form.append("description", deskripsi);
    form.append("lat", lat);
    form.append("lng", lng);
    // Waktu perangkat direkam otomatis, tidak diketik pengguna (§5.4.1). Server menolak
    // stempel waktu yang lebih maju dari waktunya sendiri.
    form.append("deviceTs", new Date().toISOString());
    // Asal foto MENGIKUTI kendali yang dipakai, tidak dipaku.
    form.append("captureSource", sumber);
    if (alasanLuar) form.append("outsidePolygonReason", alasanLuar);
    if (perluJumlahPanen && fulfilledBox) form.append("fulfilledBox", fulfilledBox);
    if (berkas) form.append("photos", berkas);
    return form;
  }

  function pilihFoto(f: File | null, asal: CaptureSource) {
    setBerkas(f);
    setSumber(asal);
    if (f) setGalatFoto("");
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!berkas) {
      setGalatFoto("Lampirkan satu foto kegiatan — tanpa foto, catatan ini tidak membuktikan apa pun.");
      return;
    }
    setGalat("");
    setProses(true);
    try {
      // PANEN tidak langsung ditulis. Nilai kewajarannya dulu, tampilkan dampaknya, baru
      // minta konfirmasi — supaya peringatan datang sebelum konsekuensi, bukan sesudah.
      if (perluJumlahPanen) {
        setPratinjau(await deklarasiPanen(batchId, Number(fulfilledBox || 0)));
        setProses(false);
        return;
      }
      await tambahNodeTimeline(batchId, susunForm());
      router.push(`/tenant/batch/${batchId}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Catatan gagal disimpan. Coba kirim lagi.");
      setProses(false);
    }
  }

  /** Langkah 2 — angka yang dikonfirmasi wajib angka yang dinilai, karena itu id-nya ikut. */
  async function konfirmasi() {
    if (!pratinjau) return;
    setGalat("");
    setProses(true);
    try {
      const form = susunForm();
      form.append("assessmentId", pratinjau.assessment.assessmentId);
      await konfirmasiPanen(batchId, form);
      router.push(`/tenant/batch/${batchId}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Panen gagal dikonfirmasi. Coba lagi.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href={`/tenant/batch/${batchId}`}>Batch</TautanKembali>;

  if (pratinjau) {
    return (
      <Halaman
        lebar="sempit"
        kembali={kembali}
        judul="Periksa dampaknya"
        pengantar="Belum ada yang tercatat. Anda masih bisa kembali dan mengubah angkanya."
      >
        <PenilaianPanen
          data={pratinjau}
          memproses={proses}
          onBatal={() => setPratinjau(null)}
          onLanjut={konfirmasi}
        />
        {galat ? (
          <Galat judul="Panen belum tercatat" className="mt-8">
            {galat}
          </Galat>
        ) : null}
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul="Catat kegiatan"
      pengantar="Catatan ini permanen: tidak bisa diubah maupun dihapus. Koreksi dilakukan dengan menambah catatan Ralat yang menunjuk catatan lama, dan keduanya tetap terlihat pembeli."
    >
      <form onSubmit={simpan}>
        <Panel label="Kegiatan" judul="Apa yang dikerjakan hari ini">
          <fieldset>
            <legend className="mb-3">
              <Label>Jenis kegiatan</Label>
            </legend>
            {/* Petak besar, dua kolom, semuanya serupa. Tidak ada satu pun yang diwarnai
                bahaya — lihat catatan 2 di kepala berkas. */}
            <div className="grid grid-cols-2 gap-2">
              {JENIS.map((j) => (
                <Tombol
                  key={j.nilai}
                  type="button"
                  rupa={jenis === j.nilai ? "utama" : "kedua"}
                  aria-pressed={jenis === j.nilai}
                  className="py-3.5"
                  onClick={() => setJenis(j.nilai)}
                >
                  {j.label}
                </Tombol>
              ))}
            </div>
          </fieldset>

          {/* Peringatan datang sebelum konsekuensi. Nadanya menjelaskan mekanisme, bukan
              memperingatkan orangnya — yang keras adalah mekanismenya, bukan kalimatnya. */}
          {menutupBatch ? (
            <div className="mt-6 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">Catatan ini menutup batch</Label>
              <Prosa className="mt-1.5 text-[14px]">
                Setelah tercatat, timeline batch ini ditutup dan tidak menerima catatan baru.
                Bila hasilnya tidak menutupi seluruh pesanan, pembeli yang kurang langsung
                ditawari substitusi, jadwal ulang, atau pengembalian dana, dan selisihnya
                tercatat pada siklus ini.
              </Prosa>
            </div>
          ) : null}

          {perluJumlahPanen ? (
            <Medan
              label="Total box hasil panen"
              /* Wajib TOTAL, bukan "porsi untuk pesanan". Pita kewajaran membandingkannya
                 dengan kapasitas lahan; kalau yang diisi hanya porsi terjual, Tenant yang
                 jujur pun akan tampak kekurangan hasil. */
              petunjuk="Seluruh hasil panen dari lahan ini, termasuk yang tidak terjual lewat AgroUs. Porsi yang masuk ke pesanan dihitung otomatis."
              wajib
              className="mt-6"
            >
              {(alat) => (
                <Masukan
                  {...alat}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={fulfilledBox}
                  onChange={(e) => setFulfilledBox(e.target.value)}
                  placeholder="150"
                  className="py-3.5 font-mono text-[22px]"
                />
              )}
            </Medan>
          ) : null}

          <Medan
            label="Deskripsi"
            petunjuk="Satu atau dua kalimat tentang yang dikerjakan. Pembeli membacanya apa adanya."
            wajib
            className="mt-6"
          >
            {(alat) => (
              <AreaTeks
                {...alat}
                minLength={3}
                maxLength={280}
                rows={3}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Pemupukan susulan NPK, seluruh bedeng sisi utara."
              />
            )}
          </Medan>
          <Sunyi className="mt-1.5 text-right font-mono text-[12px]">{deskripsi.length}/280</Sunyi>
        </Panel>

        <Panel label="Bukti" judul="Yang membuat catatan ini bisa diperiksa" className="mt-8">
          <fieldset>
            <legend className="mb-1.5">
              <Label>
                Foto kegiatan<span className="ml-1 text-jambu">*</span>
              </Label>
            </legend>
            <p className="mb-3 text-[12px] leading-snug text-tinta-samar">
              Foto ikut di-hash ke dalam rantai bukti, jadi tidak bisa ditukar belakangan.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Berkas
                ikon={Camera}
                accept="image/*"
                capture="environment"
                nama={berkas && sumber === "IN_APP_CAMERA" ? berkas.name : null}
                placeholder="Ambil foto sekarang"
                className="py-3.5"
                onChange={(e) => pilihFoto(e.target.files?.[0] ?? null, "IN_APP_CAMERA")}
              />
              <Berkas
                ikon={Images}
                accept="image/*"
                nama={berkas && sumber === "GALLERY" ? berkas.name : null}
                placeholder="Pilih dari galeri"
                className="py-3.5"
                onChange={(e) => pilihFoto(e.target.files?.[0] ?? null, "GALLERY")}
              />
            </div>

            {/* Dinyatakan, bukan dicegah. Foto galeri tetap sah; yang berbeda hanya derajat
                buktinya, dan pembeli melihat penandanya. Nadanya menjelaskan, tidak menuduh. */}
            {berkas && sumber === "GALLERY" ? (
              <div className="mt-3 border-t-2 border-biru pt-3">
                <Label className="text-biru">Tercatat bersumber galeri</Label>
                <Prosa className="mt-1.5 text-[14px]">
                  Foto dari galeri tetap sah dan tetap masuk rantai bukti. Bedanya, pembeli
                  melihat penanda sumbernya — foto yang diambil langsung di lokasi menopang
                  klaim lebih kuat karena waktu dan tempatnya ikut terekam.
                </Prosa>
              </div>
            ) : null}

            {galatFoto ? (
              <p className="mt-2 text-[12px] font-semibold leading-snug text-jambu">{galatFoto}</p>
            ) : null}
          </fieldset>

          <fieldset className="mt-7">
            <legend className="mb-1.5">
              <Label>
                Koordinat lokasi<span className="ml-1 text-jambu">*</span>
              </Label>
            </legend>
            <p className="mb-3 text-[12px] leading-snug text-tinta-samar">
              Harus di dalam batas lahan terdaftar. Bila di luar, alasannya wajib diisi dan
              ditampilkan kepada pembeli.
            </p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Masukan
                required
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="lintang"
                aria-label="Lintang"
                className="font-mono"
              />
              <Masukan
                required
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="bujur"
                aria-label="Bujur"
                className="font-mono"
              />
              {/* Bernama, bukan sekadar glif — lihat catatan 3 di kepala berkas. */}
              <Tombol type="button" rupa="kedua" onClick={ambilLokasi} className="shrink-0">
                <Ikon dari={MapPin} />
                Ambil lokasi
              </Tombol>
            </div>
            {galatLokasi ? (
              <p className="mt-2 text-[12px] font-semibold leading-snug text-jambu">{galatLokasi}</p>
            ) : null}
          </fieldset>

          <Medan
            label="Alasan bila di luar lahan"
            petunjuk="Opsional. Diisi hanya bila koordinat di atas jatuh di luar batas lahan terdaftar."
            className="mt-7"
          >
            {(alat) => (
              <Masukan
                {...alat}
                value={alasanLuar}
                onChange={(e) => setAlasanLuar(e.target.value)}
                placeholder="Sinyal GPS meleset, foto diambil dari tepi jalan"
              />
            )}
          </Medan>
        </Panel>

        {galat ? (
          <Galat judul="Catatan belum tersimpan" className="mt-8">
            {galat}
          </Galat>
        ) : null}

        <Tombol
          type="submit"
          penuh
          className="mt-8 py-4 text-[16px]"
          sibuk={proses}
          labelSibuk={perluJumlahPanen ? "Memeriksa…" : "Menyimpan…"}
        >
          {perluJumlahPanen ? "Lihat dampaknya sebelum mencatat" : "Simpan catatan permanen"}
        </Tombol>
      </form>
    </Halaman>
  );
}
