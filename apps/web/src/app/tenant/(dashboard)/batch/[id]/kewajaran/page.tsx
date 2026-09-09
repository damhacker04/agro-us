"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AssessmentBasis, YieldAssessmentHistoryItem, YieldPlausibility } from "@agro-os/shared";
import { GalatApi, ambilRiwayatKewajaran } from "@/lib/api";
import { angka, desimal, jamWib, tanggalPanjang } from "@/lib/format-id";
import {
  Deret,
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  Tanda,
  TautanKembali,
  Ubin,
  type Nada,
} from "@/ui";

/**
 * TN-35 — Riwayat Penilaian Kewajaran Hasil per Batch (FR-4.10).
 *
 * Transparansi perhitungan, bukan skor buta. Tenant melihat rentang pita yang dipakai,
 * angka yang ia laporkan, dan atas dasar apa nilainya keluar.
 *
 * ⚠️ Rentang pita BOLEH ditampilkan; angka ambang penalti TIDAK (FR-7.12c). Keduanya
 * mudah tertukar. Pita adalah hasil hitungan dari lahan Tenant itu sendiri — ia bergerak
 * mengikuti seberapa hijau lahannya, jadi melihatnya tidak memberi tahu apa pun tentang
 * seberapa jauh ia boleh menyimpang sebelum dihukum. Ambang penalti sebaliknya: tetap,
 * dan begitu terlihat ia berubah menjadi target.
 *
 * Konsekuensi bentuknya di dunia ini: TIDAK ADA satu pun elemen proporsional di halaman —
 * tidak ada bilah, tidak ada sumbu, tidak ada penanda posisi di dalam rentang. Angka
 * dilaporkan dan rentang perkiraan berdiri berdampingan sebagai dua nilai terukur, dan
 * pembacanya sendiri yang membandingkan. Menggambar posisi laporan di dalam pita akan
 * menjawab persis pertanyaan yang tidak boleh dijawab: "seberapa jauh lagi sampai kena?"
 *
 * `TIDAK_DAPAT_DINILAI` sengaja NETRAL, bukan merah — sama seperti TN-19c. Ini keterbatasan
 * cuaca, bukan kecurigaan.
 */

const VONIS: Record<YieldPlausibility, { label: string; nada: Nada; tanda: "penuh" | "sebagian" | "tidak" }> = {
  WAJAR: { label: "Wajar", nada: "utama", tanda: "penuh" },
  PERLU_DITINJAU: { label: "Perlu ditinjau", nada: "kabar", tanda: "sebagian" },
  TIDAK_WAJAR: { label: "Di luar pita", nada: "awas", tanda: "tidak" },
  TIDAK_DAPAT_DINILAI: { label: "Tidak dapat dinilai", nada: "netral", tanda: "tidak" },
};

const DASAR: Record<AssessmentBasis, string> = {
  PITA_SAJA: "Pita dari lahan Anda sendiri",
  PITA_PLUS_BENCHMARK: "Pita + rata-rata Tenant sezona",
  TIDAK_ADA_DASAR: "Tidak ada dasar penilaian",
};

export default function RiwayatKewajaranPage() {
  const { id } = useParams<{ id: string }>();
  const [riwayat, setRiwayat] = useState<YieldAssessmentHistoryItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    if (!id) return;
    ambilRiwayatKewajaran(id)
      .then((r) => {
        setRiwayat(r);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Riwayat penilaian gagal dimuat"))
      .finally(() => setMemuat(false));
  }, [id]);

  const kembali = <TautanKembali href={`/tenant/batch/${id}`}>Batch</TautanKembali>;

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Penilaian kewajaran hasil" kembali={kembali}>
        <Memuat baris={3} label="Memuat riwayat penilaian" />
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul="Penilaian kewajaran hasil"
      pengantar="Perkiraan hasil dihitung dari luas efektif lahan Anda dan seberapa hijau tanamannya terlihat dari satelit sampai hari panen. Rentangnya sengaja lebar: tujuannya menandai laporan yang tidak masuk akal, bukan mengaudit selisih kecil."
    >
      {galat ? (
        <Galat judul="Riwayat penilaian gagal dimuat">
          {galat} Penilaian yang sudah dibuat tetap tersimpan — muat ulang halaman untuk
          mencoba lagi.
        </Galat>
      ) : riwayat.length === 0 ? (
        <Kosong judul="Batch ini belum pernah dinilai">
          Penilaian dibuat saat Anda mengisi jumlah box hasil panen, dan hasilnya ditampilkan
          sebelum apa pun tercatat. Sampai itu terjadi, tidak ada perhitungan yang perlu
          ditelusuri di sini.
        </Kosong>
      ) : (
        <>
          <ol className="space-y-8">
            {riwayat.map((r) => (
              <BarisPenilaian key={r.assessmentId} r={r} />
            ))}
          </ol>

          {riwayat.length > 1 ? (
            <Sunyi className="mt-8 max-w-[68ch]">
              Batch ini dinilai lebih dari sekali. Itu wajar bila Anda memperbaiki angka
              sebelum mengonfirmasi, atau bila citra satelit baru datang setelah awan lewat.
              Seluruh percobaan disimpan supaya perhitungannya bisa ditelusuri — bukan sebagai
              catatan pelanggaran.
            </Sunyi>
          ) : null}
        </>
      )}
    </Halaman>
  );
}

function BarisPenilaian({ r }: { r: YieldAssessmentHistoryItem }) {
  // Putusan Operator MENGGANTIKAN penilaian otomatis, jadi ia yang menentukan rupa barisnya.
  const berlaku = r.finalVerdict ?? r.verdict;
  const v = VONIS[berlaku];
  const adaPita = r.expectedMinBox !== null && r.expectedMaxBox !== null;

  return (
    <li>
      <Panel
        nada={v.nada}
        label={`${tanggalPanjang(r.assessedAt)} · ${jamWib(r.assessedAt)} WIB`}
        /* Vonisnya jadi JUDUL, bukan judul plus pil berisi kata yang sama: aturan tebal
           panel sudah membawa nadanya, dan menyebut "Di luar pita" dua kali berdampingan
           membuat yang kedua terbaca sebagai keterangan tambahan yang ternyata bukan. */
        judul={
          <span className="flex items-center gap-2">
            <Tanda jenis={v.tanda} className={v.nada === "netral" ? "text-tinta-samar" : ""} />
            {v.label}
          </span>
        }
        /* Penilaian yang benar-benar menjadi panen — bukan sekadar yang terakhir. */
        aksi={r.confirmed ? <Pil nada="utama">Dikonfirmasi</Pil> : null}
      >
        {/* Dua nilai berdampingan, tanpa satu pun elemen proporsional di antaranya. */}
        <Deret kolom={3} as="dl">
          <Ubin label="Anda laporkan" nilai={angka(r.reportedBox)} satuan="box" nada={v.nada} />
          <Ubin
            label="Perkiraan dari lahan Anda"
            nilai={
              adaPita
                ? `${angka(r.expectedMinBox as number)}–${angka(r.expectedMaxBox as number)}`
                : "—"
            }
            satuan={adaPita ? "box" : undefined}
            catatan={adaPita ? undefined : "Pita tidak dihitung, bukan dihitung nol"}
          />
          <Ubin
            label="Puncak kehijauan"
            nilai={r.peakNdvi === null ? "—" : desimal(r.peakNdvi)}
            catatan={r.peakNdvi === null ? "Citra tidak tersedia" : "NDVI tertinggi musim ini"}
          />
        </Deret>

        <div className="mt-6 border-t border-kertas-garis pt-3">
          <Label>Dasar penilaian</Label>
          <Prosa className="mt-1.5 text-[14px]">{DASAR[r.basis]}</Prosa>
        </div>

        {r.finalVerdict ? (
          <div className="mt-5 border-t-2 border-biru pt-3">
            <Label className="text-biru">Ditinjau operator</Label>
            <Prosa className="mt-1.5 text-[14px]">
              Seorang peninjau memeriksa penilaian ini, dan putusannya menggantikan penilaian
              otomatis. Yang berlaku untuk batch ini adalah{" "}
              <span className="font-semibold text-tinta">{VONIS[r.finalVerdict].label}</span>.
            </Prosa>
          </div>
        ) : null}
      </Panel>
    </li>
  );
}

