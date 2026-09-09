"use client";

import React, { useEffect, useState } from "react";
import type { NdviSeries, SatelliteReviewItem, VerificationStatus } from "@agro-os/shared";
import { toVerificationBadge } from "@agro-os/shared";
import { GalatApi, ambilAntreanSatelit, ambilNdvi, putuskanSatelit } from "@/lib/api";
import { desimal, tanggalPanjang } from "@/lib/format-id";
import { KurvaNdviBatch } from "@/components/kurva-ndvi-batch";
import { PilStatusMentah, PilVerifikasi, STATUS_MENTAH } from "@/components/tanda-verifikasi";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Prosa,
  Radio,
  Sunyi,
  TautanKembali,
  Tombol,
} from "@/ui";

/**
 * OP-04b — Putusan verifikasi satelit satu batch (FR-4.6).
 *
 * MIGRASI DUNIA, dengan tiga hal yang bukan soal rupa:
 *
 * 1. KURVANYA AKHIRNYA MUNCUL DI MEJA YANG MEMUTUS. Layar ini menilai apakah kurva vegetasi
 *    mendukung tanggal yang diklaim Tenant — dan satu-satunya bentuk kurvanya adalah TABEL
 *    ANGKA. Pembeli, yang cuma membaca hasilnya, sudah melihat grafiknya sejak Fase C. Orang
 *    yang mengambil keputusan punya bukti visual lebih sedikit daripada orang yang membaca
 *    akibatnya. `KurvaNdviBatch` yang sama dipakai di sini.
 *
 * 2. AKIBATNYA DINYATAKAN DALAM TANDA YANG DILIHAT PEMBELI. Empat status mentah meringkas
 *    jadi tiga badge, dan peringkasan itu tidak jelas dari nama statusnya: memilih
 *    "Tidak sesuai klaim" maupun "Citra tidak tersedia" sama-sama menghasilkan "Belum
 *    terverifikasi" di katalog. Pemetaannya diambil dari `toVerificationBadge` di kontrak
 *    bersama, bukan diketik ulang di sini.
 *
 * 3. TABEL PENGAMATAN TETAP ADA. Operator satu-satunya peran yang berhak melihat tutupan
 *    awan per lintasan; kurva menunjukkan bentuk, tabel menunjukkan apa yang dibuang.
 *
 * TIDAK ADA MEDAN CATATAN, dan itu disengaja: `DecideSatelliteBody.note` diterima DTO lalu
 * dibuang — `decideSatellite(batchId, dto.verificationStatus)` tidak pernah meneruskannya.
 * Menyediakan kotak alasan yang isinya menguap adalah meminta orang menulis untuk tempat
 * sampah. Kalau catatan memang perlu, yang harus diperbaiki lebih dulu adalah servernya.
 */
const PILIHAN: Array<{ nilai: VerificationStatus; label: string; jelas: string }> = [
  {
    nilai: "TERVERIFIKASI",
    label: "Citra mendukung klaim",
    jelas: "Kurva vegetasi konsisten dengan tanggal tanam dan panen yang dicatat Tenant.",
  },
  {
    nilai: "FOTO_SAJA",
    label: "Cukup bukti foto saja",
    jelas:
      "Citra tidak menyangkal, tapi juga tidak cukup menopang. Batch bersandar pada foto berstempel GPS dan rantai hash kegiatannya.",
  },
  {
    nilai: "TIDAK_DAPAT",
    label: "Citra tidak bisa dinilai",
    jelas:
      "Tutupan awan atau petak terlalu kecil untuk resolusi Sentinel-2. Ini cuaca dan geometri, bukan temuan tentang produsennya.",
  },
  {
    nilai: "TIDAK_SESUAI",
    label: "Citra menyangkal klaim",
    jelas:
      "Kurva berbalik pada tanggal yang jauh dari panen yang diklaim. Selisihnya ditampilkan terbuka kepada pembeli, bukan disembunyikan.",
  },
];

const tgl = (iso: string | null) => (iso ? tanggalPanjang(iso) : "tidak terdeteksi");

export default function OperatorSatelliteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [batch, setBatch] = useState<SatelliteReviewItem | null>(null);
  const [ndvi, setNdvi] = useState<NdviSeries | null>(null);
  const [pilihan, setPilihan] = useState<VerificationStatus | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [tersimpan, setTersimpan] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    // Tidak ada GET /operator/satellite/:batchId — hanya antreannya, jadi batch dicari
    // dari daftar itu. Konsekuensinya batch yang SUDAH diputus tidak bisa dibuka lagi.
    ambilAntreanSatelit()
      .then((d) => {
        const b = d.find((x) => x.batchId === id) ?? null;
        setBatch(b);
        setGalat(b ? "" : "Batch ini tidak ada di antrean — kemungkinan sudah diputus peninjau lain.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Batch gagal dimuat"))
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
      setTersimpan(pilihan);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Putusan gagal disimpan.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/operator/satellite">Antrean satelit</TautanKembali>;

  if (memuat) {
    return (
      <Halaman judul="Verifikasi satelit" kembali={kembali}>
        <Memuat baris={4} label="Memuat batch" />
      </Halaman>
    );
  }

  if (!batch) {
    return (
      <Halaman judul="Verifikasi satelit" kembali={kembali}>
        <Galat judul="Batch tidak ada di antrean">
          {galat} Antrean hanya memuat batch yang belum diputus; yang sudah diputus tidak bisa
          dibuka kembali dari sini.
        </Galat>
      </Halaman>
    );
  }

  const titik = ndvi?.points ?? [];
  const terukur = titik.filter((p) => p.ndvi !== null);
  const adaKurva = terukur.length >= 2;

  // Tanggal dibaca dari deret NDVI bila deretnya ada, bukan dari item antrean. Keduanya
  // memuat empat tanggal yang sama, dan kurva di bawah digambar dari deret — kalau panel
  // ini membaca sumber yang lain, layarnya bisa menulis "panen tidak terdeteksi" tepat di
  // atas grafik yang menggambar garis panen terdeteksi.
  const tanggal = ndvi ?? batch;

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul={batch.productName}
      pengantar={`${batch.tenantName} · petak ${desimal(batch.landPlotAreaHa, 2)} ha`}
      aksi={<PilStatusMentah status={batch.verificationStatus} />}
    >
      <Panel label="Yang dibandingkan" judul="Klaim Tenant dan yang terdeteksi citra">
        <Deret kolom={2} as="dl">
          <BarisData label="Diklaim Tenant">
            tanam {tgl(tanggal.claimedPlantDate)}
            <br />
            panen {tgl(tanggal.claimedHarvestDate)}
          </BarisData>
          <BarisData label="Terdeteksi citra">
            tanam {tgl(tanggal.detectedPlantDate)}
            <br />
            panen {tgl(tanggal.detectedHarvestDate)}
          </BarisData>
        </Deret>
        <Prosa className="mt-6 text-[14px]">
          {STATUS_MENTAH[batch.verificationStatus].jelas}
        </Prosa>
      </Panel>

      <Panel label="Bukti" judul="Kurva vegetasi" className="mt-8">
        {!ndvi ? (
          <Sunyi className="max-w-[68ch]">
            Deret NDVI batch ini gagal diambil. Tanpa kurva maupun tabel pengamatan, tidak ada
            dasar untuk memutus — muat ulang halaman sebelum memilih.
          </Sunyi>
        ) : adaKurva ? (
          <>
            <KurvaNdviBatch deret={ndvi} />
            <p className="mt-6 max-w-[58ch] border-t border-kertas-garis pt-3 font-mono text-[11px] leading-relaxed text-tinta-samar">
              <span className="text-stempel">†</span> Pipeline Sentinel-2 nyata dan teruji,
              tetapi belum ditarik langsung di produksi. Deret di atas adalah data contoh, dan
              angka kalibrasinya masih estimasi yang belum divalidasi lapangan.
            </p>
          </>
        ) : titik.length === 0 ? (
          /* Nol lintasan bukan "belum cukup lintasan": tidak ada yang pernah diambil, dan
             itu satu-satunya keadaan di layar ini yang jawabannya sudah ditentukan. */
          <div className="border-t-2 border-jambu pt-3">
            <Label className="text-jambu">Tidak ada citra untuk dinilai</Label>
            <Prosa className="mt-1.5 text-[14px]">
              Belum ada satu pun lintasan Sentinel-2 yang tercatat untuk petak ini — bukan
              tertutup awan, melainkan belum terambil. Tanpa citra, satu-satunya putusan yang
              jujur adalah &ldquo;citra tidak bisa dinilai&rdquo;.
            </Prosa>
          </div>
        ) : (
          <Sunyi className="max-w-[68ch]">
            Baru {terukur.length} dari {titik.length} lintasan yang terukur — belum cukup untuk
            menggambar kurva. Menebak nilai yang tertutup awan sama saja dengan mengarang
            bukti, jadi yang tersisa untuk dinilai hanya tabel di bawah.
          </Sunyi>
        )}
      </Panel>

      <Panel label="Rekaman mentah" judul="Pengamatan per lintasan" className="mt-8">
        <Prosa className="text-[14px]">
          {titik.length === 0
            ? "Belum ada lintasan yang tercatat untuk petak ini."
            : "Setiap lintasan berikut tutupan awannya, termasuk yang dibuang dari penilaian. Operator satu-satunya peran yang melihat angka ini; kurva di atas menunjukkan bentuknya, tabel ini menunjukkan apa yang tidak dipakai."}
        </Prosa>

        {titik.length === 0 ? null : (
          /* Tabel bergulir sendiri: satu musim bisa berisi puluhan lintasan, dan halaman
             yang ikut memanjang mendorong kotak putusan keluar layar. */
          <div className="mt-6 max-h-72 overflow-y-auto border-t-2 border-tinta">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 bg-kertas-terang">
                <tr>
                  <th className="py-2 pr-3 text-left">
                    <Label as="span">Tanggal</Label>
                  </th>
                  <th className="py-2 pr-3 text-right">
                    <Label as="span">NDVI</Label>
                  </th>
                  <th className="py-2 text-right">
                    <Label as="span">Awan</Label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {titik.map((p) => (
                  <tr
                    key={p.date}
                    className={`border-t border-kertas-garis ${p.usable ? "text-tinta" : "text-tinta-samar"}`}
                  >
                    <td className="py-2 pr-3 font-mono">{tgl(p.date)}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {p.ndvi !== null ? desimal(p.ndvi, 3) : "—"}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {desimal(p.cloudPct, 0)}%{p.usable ? "" : " · dibuang"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {tersimpan ? (
        <Panel nada="utama" label="Tersimpan" judul="Putusan tercatat" className="mt-8">
          <Prosa className="text-[14px]">
            Batch ini kini berstatus &ldquo;{STATUS_MENTAH[tersimpan].teks.toLowerCase()}
            &rdquo;, dan tanda yang dilihat pembeli di katalog sudah berubah.
          </Prosa>
          <div className="mt-5">
            <PilVerifikasi badge={toVerificationBadge(tersimpan)} />
          </div>
          <div className="mt-7">
            <TautanKembali href="/operator/satellite">Kembali ke antrean</TautanKembali>
          </div>
        </Panel>
      ) : (
        <Panel nada="awas" label="Putusan" judul="Apa yang akan dilihat pembeli" className="mt-8">
          <div className="space-y-3">
            {PILIHAN.map((o) => (
              <Radio
                key={o.nilai}
                nama="putusan-satelit"
                nilai={o.nilai}
                terpilih={pilihan === o.nilai}
                onPilih={(v) => setPilihan(v as VerificationStatus)}
                judul={o.label}
                /* Tanpa deret NDVI tidak ada satu pun dasar untuk memutus, dan menyimpan
                   status verifikasi berdasarkan tidak-melihat-apa-apa adalah kebalikan dari
                   yang dijanjikan produk ini. */
                nonaktif={ndvi ? undefined : "Deret NDVI batch ini gagal dimuat, jadi belum ada yang bisa dinilai."}
              >
                {o.jelas}
              </Radio>
            ))}
          </div>

          {/* Empat status meringkas jadi tiga badge, dan peringkasannya tidak terbaca dari
              nama statusnya. Akibatnya ditunjukkan sebelum tombolnya ditekan. */}
          {pilihan ? (
            <div className="mt-6 border-t-2 border-tinta pt-3">
              <Label>Tanda di katalog setelah putusan ini</Label>
              <div className="mt-2.5">
                <PilVerifikasi badge={toVerificationBadge(pilihan)} />
              </div>
              {toVerificationBadge(pilihan) === "BELUM_TERVERIFIKASI" ? (
                <Sunyi className="mt-2.5 max-w-[68ch] text-[13px]">
                  &ldquo;Citra tidak bisa dinilai&rdquo; dan &ldquo;citra menyangkal
                  klaim&rdquo; sama-sama menghasilkan tanda ini, padahal artinya jauh
                  berbeda. Status mentahnya tetap ikut dikirim, jadi pembeli masih bisa
                  membaca bedanya di halaman produk — cuaca bukan temuan buruk.
                </Sunyi>
              ) : null}
            </div>
          ) : null}

          {galat ? (
            <Galat judul="Putusan belum tersimpan" className="mt-6">
              {galat}
            </Galat>
          ) : null}

          <Tombol
            penuh
            className="mt-7 py-4 text-[16px]"
            disabled={!pilihan}
            sibuk={proses}
            labelSibuk="Menyimpan putusan…"
            onClick={putuskan}
          >
            Simpan putusan
          </Tombol>
        </Panel>
      )}
    </Halaman>
  );
}
