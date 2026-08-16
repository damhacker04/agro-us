"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { PlausibilityReviewItem, YieldPlausibility } from "@agro-os/shared";
import { GalatApi, ambilAntreanKewajaran, putuskanKewajaran } from "@/lib/api";
import {
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Pil,
  Deret,
  Sunyi,
  Tanda,
  Ubin,
  type Nada,
} from "@/ui";

/**
 * OP-13 — Antrean Tinjauan Kewajaran Hasil (FR-7.12a, FR-5.6).
 *
 * Empat hal tampil berdampingan pada satu kartu, dan itu bukan soal kerapian: kurva NDVI,
 * rentang pita, angka yang dilaporkan, dan realisasi Tenant lain sezona. Masing-masing
 * sendirian menyesatkan. Kurva yang bagus tanpa pembanding zona tidak memberi tahu apakah
 * musimnya memang buruk untuk semua orang — dan justru itu pertanyaan yang menentukan
 * putusannya.
 *
 * Putusan di sini menggantikan verdict otomatis dan menentukan apakah cap 10% berlaku
 * untuk shortfall batch ini (FR-7.11). Mesin menandai, manusia memutuskan.
 *
 * MIGRASI DUNIA. Halaman ini salah satu dari empat bukti bahwa kit `@/ui` benar-benar
 * memikul halaman kerja, bukan cuma terdokumentasi. Yang berubah bukan warnanya saja:
 * ikon dekoratif di samping judul dibuang (ia tidak menandai apa pun yang judulnya belum
 * katakan), spinner diganti kerangka muat yang menyatakan bentuk isi yang akan datang, dan
 * ketiga tombol putusan berhenti jadi wash pucat — di dunia ini warna menguasai region kecil
 * secara utuh atau masuk lewat garis, tidak pernah jadi latar pudar dengan teks senada.
 */

const OPSI: {
  nilai: YieldPlausibility;
  label: string;
  nada: Nada;
  tanda: "penuh" | "sebagian" | "tidak";
  jelas: string;
}[] = [
  {
    nilai: "WAJAR",
    label: "Wajar",
    nada: "utama",
    tanda: "penuh",
    jelas: "Cap 10% tetap berlaku — Tenant terlindungi seperti biasa.",
  },
  {
    nilai: "TIDAK_WAJAR",
    label: "Tidak wajar",
    nada: "awas",
    tanda: "tidak",
    jelas: "Cap 10% GUGUR — Tenant menanggung selisih substitusi penuh.",
  },
  {
    // Bukan jalan tengah malas: setelah melihat kurva dan pembanding, "memang tidak ada
    // dasar" adalah kesimpulan yang sah. Memaksa memilih antara dua kutub membuat Operator
    // menebak, dan tebakan itu menempel pada uang seseorang.
    nilai: "TIDAK_DAPAT_DINILAI",
    label: "Tidak dapat dinilai",
    nada: "netral",
    tanda: "sebagian",
    jelas: "Tidak ada dasar cukup. Cap tetap berlaku, tidak ada penalti kuota.",
  },
];

const DASAR: Record<string, string> = {
  PITA_SAJA: "pita saja (zona belum cukup pembanding)",
  PITA_PLUS_BENCHMARK: "pita + benchmark zona",
  TIDAK_ADA_DASAR: "tidak ada dasar",
};

/**
 * Tenggat dibedakan jadi tiga, bukan diwarnai gradasi: lewat menuntut tindakan sekarang,
 * mendekat menuntut perhatian, sisanya tidak menuntut apa-apa. Pil penuh disediakan untuk
 * yang pertama saja — kalau setiap baris antrean berkedip, tidak ada yang berkedip.
 */
function sisaSla(iso: string | null): { teks: string; nada: Nada; garis: boolean } {
  if (!iso) return { teks: "tanpa tenggat", nada: "netral", garis: true };
  const jam = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (jam < 0) return { teks: `lewat ${Math.abs(Math.round(jam))} jam`, nada: "awas", garis: false };
  if (jam < 6) return { teks: `sisa ${Math.round(jam)} jam`, nada: "awas", garis: true };
  return { teks: `sisa ${Math.round(jam)} jam`, nada: "netral", garis: true };
}

/** Sparkline NDVI — cukup untuk melihat bentuk kurvanya, tanpa pustaka grafik. */
function KurvaNdvi({ titik }: { titik: PlausibilityReviewItem["ndviSeries"] }) {
  const layak = titik.filter((t) => t.usable && t.ndvi !== null);
  if (layak.length < 2) {
    return (
      <Sunyi className="text-[12px]">
        Hanya {layak.length} citra layak pakai — kurva tidak dapat digambar.
      </Sunyi>
    );
  }
  const L = 240;
  const T = 48;
  const langkah = L / (layak.length - 1);
  const d = layak
    .map((t, i) => `${i === 0 ? "M" : "L"} ${(i * langkah).toFixed(1)} ${(T - (t.ndvi ?? 0) * T).toFixed(1)}`)
    .join(" ");
  return (
    <div>
      <svg
        viewBox={`0 0 ${L} ${T}`}
        className="h-12 w-full text-ungu"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Kurva kehijauan lahan, ${layak.length} citra layak pakai`}
      >
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="square"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Sunyi className="mt-1.5 text-[11px]">
        {layak.length} dari {titik.length} citra layak pakai · {layak[0]!.date} →{" "}
        {layak[layak.length - 1]!.date}
      </Sunyi>
    </div>
  );
}

export default function OperatorKewajaranPage() {
  const [antrean, setAntrean] = useState<PlausibilityReviewItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState<string | null>(null);

  const muat = useCallback(() => {
    ambilAntreanKewajaran()
      .then((a) => {
        setAntrean(a);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat antrean"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(muat, [muat]);

  async function putuskan(assessmentId: string, finalVerdict: YieldPlausibility) {
    setProses(assessmentId);
    try {
      await putuskanKewajaran(assessmentId, { finalVerdict });
      setAntrean((a) => a.filter((x) => x.assessmentId !== assessmentId));
      setGalat("");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan putusan");
    } finally {
      setProses(null);
    }
  }

  return (
    <Halaman
      judul="Antrean tinjauan kewajaran"
      pengantar="Hasil panen yang penilaian otomatisnya marginal. Putusan Anda menggantikan penilaian mesin dan menentukan apakah cap tanggungan 10% berlaku untuk batch ini."
    >
      {galat ? (
        <Galat judul="Antrean tidak dapat diproses" className="mb-6">
          {galat} Muat ulang halaman ini; bila tetap gagal, putusan yang tertunda tidak hilang —
          ia tetap di antrean sampai ada yang menutupnya.
        </Galat>
      ) : null}

      {memuat ? <Memuat baris={3} label="Memuat antrean tinjauan" /> : null}

      {!memuat && antrean.length === 0 && !galat ? (
        <Kosong judul="Tidak ada penilaian yang menunggu tinjauan">
          Antrean kosong berarti setiap hasil panen yang dilaporkan sejauh ini masih di dalam
          pita kewajarannya sendiri. Batch baru muncul di sini secara otomatis ketika angka
          yang dilaporkan menyimpang cukup jauh untuk menuntut mata manusia.
        </Kosong>
      ) : null}

      <div className="space-y-8">
        {antrean.map((a) => {
          const sla = sisaSla(a.slaDueAt);
          const adaPita = a.expectedMinBox !== null && a.expectedMaxBox !== null;
          const sedang = proses === a.assessmentId;
          return (
            <Panel
              key={a.assessmentId}
              label={`${a.tenantName} · ${a.commodityName}`}
              judul={a.productName}
              aksi={
                <>
                  {/* Penyelidikan ambang tidak dilarang — ia dicatat dan terlihat di sini. */}
                  {a.attemptCount > 1 ? (
                    <Pil nada="awas" garis>
                      {a.attemptCount}× dinilai
                    </Pil>
                  ) : null}
                  <Pil nada={sla.nada} garis={sla.garis}>
                    {sla.teks}
                  </Pil>
                </>
              }
            >
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <Deret kolom={2}>
                    <Ubin label="Dilaporkan Tenant" nilai={a.reportedBox} satuan="box" />
                    <Ubin
                      label="Pita kewajaran"
                      nilai={adaPita ? `${a.expectedMinBox}–${a.expectedMaxBox}` : "—"}
                      satuan={adaPita ? "box" : undefined}
                      nada={adaPita ? "netral" : "awas"}
                    />
                  </Deret>
                  <Sunyi className="mt-4 text-[12px]">
                    Terjual {a.quotaBoxSold} box · puncak NDVI{" "}
                    {a.peakNdvi === null ? "—" : a.peakNdvi.toFixed(2)} · dasar:{" "}
                    {DASAR[a.basis] ?? a.basis}
                  </Sunyi>
                </div>

                <div>
                  <Label className="mb-2">Kurva kehijauan lahan</Label>
                  <KurvaNdvi titik={a.ndviSeries} />
                </div>
              </div>

              {/* Pembanding lintas-Tenant. Tanpa ini, musim buruk yang merata tidak bisa
                  dibedakan dari satu Tenant yang menyembunyikan hasil. */}
              <div className="mt-8 border-t-2 border-biru pt-4">
                <Label className="text-biru">
                  Realisasi Tenant lain, komoditas &amp; minggu panen sama
                </Label>
                {a.zonePeers.length === 0 ? (
                  <Sunyi className="mt-2 text-[13px]">
                    Belum ada Tenant pembanding. Tanpa pembanding, satu-satunya dasar adalah pita
                    dari lahan Tenant ini sendiri.
                  </Sunyi>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {a.zonePeers.map((p, i) => (
                      <li
                        key={`${p.tenantName}-${i}`}
                        className="flex justify-between gap-4 text-[14px] text-tinta"
                      >
                        <span className="truncate">{p.tenantName}</span>
                        <span className="shrink-0 font-mono">
                          {Math.round(p.fulfillmentRatio * 100)}% terpenuhi
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {OPSI.map((o) => (
                  <PilihanPutusan
                    key={o.nilai}
                    opsi={o}
                    sibuk={sedang}
                    onClick={() => putuskan(a.assessmentId, o.nilai)}
                  />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </Halaman>
  );
}

/**
 * Tombol putusan — bukan `Tombol` biasa, karena ketiganya membawa penjelasan konsekuensinya
 * dan itu bagian dari keputusannya, bukan tooltip. Tetap tunduk hukum kit: radius nol,
 * warna masuk lewat aturan tebal di atas, tanda menggores 1,6px, cincin fokus beroffset.
 */
function PilihanPutusan({
  opsi,
  sibuk,
  onClick,
}: {
  opsi: (typeof OPSI)[number];
  sibuk: boolean;
  onClick: () => void;
}) {
  const warna = { utama: "text-ungu", awas: "text-jambu", netral: "text-tinta", kabar: "text-biru" }[
    opsi.nada
  ];
  const garis = { utama: "border-ungu", awas: "border-jambu", netral: "border-tinta", kabar: "border-biru" }[
    opsi.nada
  ];
  return (
    <button
      type="button"
      disabled={sibuk}
      aria-busy={sibuk || undefined}
      onClick={onClick}
      className={`relative border-t-2 ${garis} bg-kertas p-4 text-left transition-colors duration-150 hover:bg-kertas-garis/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu disabled:cursor-not-allowed disabled:opacity-45 ${
        sibuk ? "tombol-sibuk" : ""
      }`}
    >
      <span className={`flex items-center gap-2 text-[14px] font-bold ${warna}`}>
        <Tanda jenis={opsi.tanda} />
        {opsi.label}
      </span>
      <span className="mt-2 block text-[12px] leading-snug text-tinta-lembut">{opsi.jelas}</span>
    </button>
  );
}
