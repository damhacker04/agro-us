"use client";

import React from "react";
import { Star } from "lucide-react";
import { SUBSTITUTION_PRICE_GAP_CAP_PCT } from "@agro-os/shared";
import type { HarvestPreviewResponse } from "@agro-os/shared";
import { angka } from "@/lib/format-id";
import { Ikon, Label, Panel, Prosa, Sunyi, Tanda, Tombol, Ubin } from "@/ui";

/**
 * TN-19b (`THW`) · TN-19c (`THN`) · TN-19a — layar antara pratinjau dan konfirmasi panen.
 *
 * ⚠️ TIGA ATURAN YANG TIDAK BOLEH DILANGGAR DI BERKAS INI. Ketiganya selamat melewati
 * migrasi dunia, dan dunia baru justru memberi perkakas yang lebih tepat untuk memenuhinya.
 *
 * 1. **TN-19b dan TN-19c wajib terasa berbeda** (PAGE_INVENTORY catatan 2, user flow butir 2).
 *    Keduanya berarti "hasil Anda tidak dalam pita", tetapi sebabnya berlainan: yang satu
 *    karena laporannya janggal, yang satu karena langitnya mendung. Menyatukannya membuat
 *    Tenant merasa dituduh karena cuaca — cara tercepat kehilangan sisi pasok.
 *
 *    Di dunia ini pemisahannya jadi lebih tajam daripada sekadar beda warna kartu: TN-19b
 *    menguasai GROUND penuh dalam `jambu` (hukum region-utuh, karena ia memang satu region
 *    kecil yang utuh dan ia mendahului akibat finansial), sementara TN-19c tidak memakai
 *    warna sama sekali — hanya aturan tinta dan tanda "tidak" yang digambar. Itu bukan
 *    kompromi: "belum bisa dinilai" memang punya bahasa visualnya sendiri di sini, yaitu
 *    LUBANG yang dibiarkan terbuka, sama seperti tanggal tertutup awan pada kurva NDVI.
 *
 * 2. **Tidak ada angka ambang** (FR-7.12c). Rentang pita boleh tampil — itu perkiraan
 *    sistem tentang lahan Tenant sendiri. Yang tidak boleh: seberapa jauh di bawah pita
 *    seseorang masih aman, dalam bentuk apa pun, termasuk bilah kemajuan. Tidak ada satu
 *    pun elemen proporsional di berkas ini, dan itu disengaja.
 *
 * 3. **Nada informatif, bukan menuduh** (aturan desain v2.3 butir 4). Tagline
 *    "Kami tidak percaya klaim petani" tidak pernah muncul di antarmuka Tenant.
 *
 * Satu perbaikan ikut migrasi: batas tanggungan yang dulu diketik "10%" langsung di kalimat
 * kini diimpor dari `SUBSTITUTION_PRICE_GAP_CAP_PCT`, dan kalimatnya digerakkan oleh
 * `capWillBeWaived` dari server alih-alih disimpulkan sendiri dari verdict. Angka yang
 * menggerakkan uang tidak boleh punya dua sumber.
 */

const box = (n: number) => `${angka(n)} box`;

export function PenilaianPanen({
  data,
  memproses,
  onBatal,
  onLanjut,
}: {
  data: HarvestPreviewResponse;
  memproses: boolean;
  onBatal: () => void;
  onLanjut: () => void;
}) {
  const { assessment: nilai, allocation: alokasi } = data;
  const takDapatDinilai = nilai.verdict === "TIDAK_DAPAT_DINILAI";
  const diLuarPita = nilai.verdict === "TIDAK_WAJAR";
  const perluDitinjau = nilai.verdict === "PERLU_DITINJAU";
  const adaPita = nilai.expectedMinBox !== null && nilai.expectedMaxBox !== null;

  const baris = [...alokasi.fullyFulfilled, ...alokasi.partial, ...alokasi.unfulfilled];

  return (
    <div className="space-y-10">
      {/* ---------------- TN-19b — Peringatan Kewajaran (THW) ---------------- */}
      {diLuarPita ? (
        <div className="bg-jambu p-6">
          <Label className="text-kabut-jambu">Pita kewajaran hasil</Label>
          <h2 className="mt-2 text-[22px] font-extrabold leading-tight text-kertas-terang">
            Hasil ini di luar perkiraan untuk lahan Anda
          </h2>
          <p className="mt-2.5 max-w-[58ch] text-[14px] leading-relaxed text-kabut-jambu">
            {nilai.reason}
          </p>

          {/* Dua angka berdampingan, tanpa bilah dan tanpa jarak proporsional: yang boleh
              dibaca adalah dilaporkan versus perkiraan, bukan seberapa jauh dari ambang. */}
          <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-kabut-jambu/40 pt-4 sm:grid-cols-2">
            <div>
              <Label as="dt" className="text-kabut-jambu">
                Anda melaporkan
              </Label>
              <dd className="mt-1.5 font-mono text-[26px] leading-none text-kertas-terang">
                {box(nilai.reportedBox)}
              </dd>
            </div>
            <div>
              <Label as="dt" className="text-kabut-jambu">
                Perkiraan dari kondisi lahan
              </Label>
              <dd className="mt-1.5 font-mono text-[26px] leading-none text-kertas-terang">
                {adaPita
                  ? `${angka(nilai.expectedMinBox as number)}–${box(nilai.expectedMaxBox as number)}`
                  : "—"}
              </dd>
            </div>
          </dl>

          {/* Konsekuensinya dinyatakan APA ADANYA sebelum tombol, bukan sesudahnya.
              Inilah seluruh alasan alur panen dipecah jadi dua langkah. */}
          {data.capWillBeWaived ? (
            <div className="mt-6 border-t-2 border-kertas-terang pt-3">
              <Label className="text-kertas-terang">Bila Anda melanjutkan</Label>
              <p className="mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-kertas-terang">
                Batas tanggungan {SUBSTITUTION_PRICE_GAP_CAP_PCT}% untuk batch ini tidak
                berlaku, sehingga selisih harga penggantian pesanan pembeli menjadi tanggungan
                Anda sepenuhnya.
              </p>
            </div>
          ) : null}

          <p className="mt-5 max-w-[58ch] text-[13px] leading-relaxed text-kabut-jambu">
            Bila angkanya keliru, kembali dan perbaiki — tidak ada yang tercatat sampai Anda
            menekan konfirmasi. Bila angkanya memang benar, lanjutkan saja: panen yang
            sungguh-sungguh kecil bukan pelanggaran, dan tim kami dapat meninjaunya.
          </p>
        </div>
      ) : null}

      {/* ---------------- TN-19c — Tidak Dapat Dinilai (THN) ----------------
          TANPA warna, dengan sengaja. Mendung bukan kesalahan Tenant, jadi layarnya tidak
          boleh menyala seperti peringatan. Yang dipakai adalah perangkat "lubang" milik
          dunia ini: aturan tinta dan tanda yang digambar. */}
      {takDapatDinilai ? (
        <div className="border-t-2 border-tinta pt-4">
          <div className="flex items-center gap-2">
            <Tanda jenis="tidak" className="text-tinta-samar" />
            <Label>Belum bisa dinilai</Label>
          </div>
          <h2 className="mt-2 text-[22px] font-extrabold leading-tight text-tinta">
            Kami belum bisa menilai hasil panen siklus ini
          </h2>
          <Prosa className="mt-2.5 text-[15px]">{nilai.reason}</Prosa>
          <Prosa className="mt-3 text-[15px]">
            Ini <span className="font-semibold text-tinta">tidak</span> berpengaruh pada kuota
            maupun reputasi Anda. Foto dan catatan timeline tetap menjadi bukti yang sah, dan
            panen Anda diproses seperti biasa.
          </Prosa>
        </div>
      ) : null}

      {/* ---------------- Verdict marginal — ditinjau manusia ---------------- */}
      {perluDitinjau ? (
        <div className="border-t-2 border-biru pt-4">
          <Label className="text-biru">Akan ditinjau tim kami</Label>
          <Prosa className="mt-2 text-[15px]">{nilai.reason}</Prosa>
        </div>
      ) : null}

      {/* ---------------- TN-19a — Pratinjau alokasi ---------------- */}
      <Panel label="Pratinjau" judul="Dampak ke pesanan pembeli">
        <Prosa className="text-[14px]">
          {data.allocatableBox < nilai.reportedBox ? (
            <>
              Dari {box(nilai.reportedBox)} yang dipanen,{" "}
              <span className="font-mono text-tinta">{box(data.allocatableBox)}</span> masuk ke
              pesanan yang sudah terjual. Sisanya milik Anda.
            </>
          ) : (
            <>
              Seluruh <span className="font-mono text-tinta">{box(data.allocatableBox)}</span>{" "}
              dibagikan ke pesanan yang sudah terjual.
            </>
          )}
        </Prosa>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {/* "Terpenuhi", bukan "Terpenuhi penuh": label `tracking-cap` 0,26em tidak bisa
              dipersempit, dan pada 375px yang dua kata pecah jadi dua baris sementara
              tetangganya tidak — angkanya lalu berdiri di garis dasar yang berbeda. */}
          <Ubin label="Terpenuhi" nilai={angka(alokasi.fullyFulfilled.length)} nada="utama" />
          <Ubin label="Sebagian" nilai={angka(alokasi.partial.length)} nada="awas" />
          <Ubin label="Tidak kebagian" nilai={angka(alokasi.unfulfilled.length)} nada="awas" />
        </div>

        {baris.length === 0 ? (
          <Sunyi className="mt-6 border-t border-kertas-garis pt-3">
            Belum ada pesanan terjual pada batch ini, jadi seluruh hasil panen milik Anda.
          </Sunyi>
        ) : (
          <ul className="mt-6">
            {baris.map((l) => (
              <li
                key={l.orderItemId}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-kertas-garis py-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {/* FR-7.13 — alasan urutannya ditampilkan, bukan dibiarkan tampak acak. */}
                  {l.senioritas ? (
                    <Ikon
                      dari={Star}
                      ukuran="sm"
                      label="Didahulukan karena shortfall siklus lalu"
                      className="text-ungu"
                    />
                  ) : null}
                  <span className="truncate text-[15px] text-tinta">{l.buyerName}</span>
                </span>
                <span className="shrink-0 font-mono text-[15px] text-tinta">
                  {angka(l.allocatedBox)}/{box(l.qtyBox)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {baris.some((l) => l.senioritas) ? (
          <Sunyi className="mt-4 text-[13px]">
            Pembeli bertanda bintang terkena shortfall pada siklus sebelumnya, jadi didahulukan
            kali ini sebelum urutan waktu pembayaran.
          </Sunyi>
        ) : null}
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Tombol rupa="kedua" className="flex-1 py-3.5" onClick={onBatal} disabled={memproses}>
          Kembali &amp; perbaiki angka
        </Tombol>
        {/* TN-19b menuntut konfirmasi EKSPLISIT, bukan sekadar tombol lanjut — kalimat
            tombolnya menyebut konsekuensinya, sehingga tidak bisa ditekan tanpa sadar. */}
        <Tombol
          rupa={diLuarPita ? "bahaya" : "utama"}
          className="flex-1 py-3.5"
          sibuk={memproses}
          labelSibuk="Menyimpan…"
          onClick={onLanjut}
        >
          {diLuarPita ? "Saya paham, tetap catat panen ini" : "Konfirmasi & catat panen"}
        </Tombol>
      </div>
    </div>
  );
}
