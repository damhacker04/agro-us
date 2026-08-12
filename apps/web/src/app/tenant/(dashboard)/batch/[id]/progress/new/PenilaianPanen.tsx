"use client";

import React from "react";
import { CloudOff, Info, Loader2, ScrollText, Star } from "lucide-react";
import type { HarvestPreviewResponse } from "@agro-os/shared";

/**
 * TN-19b (`THW`) · TN-19c (`THN`) · TN-19a — layar antara pratinjau dan konfirmasi panen.
 *
 * ⚠️ TIGA ATURAN YANG TIDAK BOLEH DILANGGAR DI BERKAS INI.
 *
 * 1. **TN-19b dan TN-19c wajib terasa berbeda** (PAGE_INVENTORY catatan 2, user flow butir 2).
 *    Keduanya berarti "hasil Anda tidak dalam pita", tetapi sebabnya berlainan: yang satu
 *    karena laporannya janggal, yang satu karena langitnya mendung. Menyatukannya membuat
 *    Tenant merasa dituduh karena cuaca — cara tercepat kehilangan sisi pasok. Karena itu
 *    keduanya memakai warna, ikon, dan bahasa yang berbeda, dan hanya TN-19b yang meminta
 *    konfirmasi eksplisit.
 *
 * 2. **Tidak ada angka ambang** (FR-7.12c). Rentang pita boleh tampil — itu perkiraan
 *    sistem tentang lahan Tenant sendiri. Yang tidak boleh: seberapa jauh di bawah pita
 *    seseorang masih aman, dalam bentuk apa pun, termasuk bilah kemajuan.
 *
 * 3. **Nada informatif, bukan menuduh** (aturan desain v2.3 butir 4). Tagline
 *    "Kami tidak percaya klaim petani" tidak pernah muncul di antarmuka Tenant.
 */

const rupiahBox = (n: number) => `${n} box`;

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

  return (
    <div className="space-y-4">
      {/* ---------------- TN-19b — Peringatan Kewajaran (THW) ---------------- */}
      {diLuarPita && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-full bg-amber-200 p-2 text-amber-900">
              <ScrollText className="h-4 w-4" />
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-bold text-amber-950">
                Hasil ini di luar perkiraan untuk lahan Anda
              </h2>
              <p className="text-sm leading-relaxed text-amber-900">{nilai.reason}</p>

              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Anda melaporkan</dt>
                  <dd className="text-lg font-black text-amber-900">
                    {rupiahBox(nilai.reportedBox)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Perkiraan dari kondisi lahan</dt>
                  <dd className="text-lg font-black text-gray-900">
                    {nilai.expectedMinBox}–{nilai.expectedMaxBox} box
                  </dd>
                </div>
              </dl>

              {/* Konsekuensinya dinyatakan APA ADANYA sebelum tombol, bukan sesudahnya.
                  Inilah seluruh alasan alur panen dipecah jadi dua langkah. */}
              <div className="rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-950">
                <b className="font-bold">Bila Anda melanjutkan:</b> batas tanggungan 10% untuk
                batch ini tidak berlaku, sehingga selisih harga penggantian pesanan pembeli
                menjadi tanggungan Anda sepenuhnya.
              </div>

              <p className="text-xs leading-relaxed text-amber-800">
                Bila angkanya keliru, kembali dan perbaiki — tidak ada yang tercatat sampai Anda
                menekan konfirmasi. Bila angkanya memang benar, lanjutkan saja; panen yang
                sungguh-sungguh kecil bukan pelanggaran, dan tim kami dapat meninjaunya.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- TN-19c — Tidak Dapat Dinilai (THN) ---------------- */}
      {takDapatDinilai && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-full bg-slate-200 p-2 text-slate-700">
              <CloudOff className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-800">
                Kami belum bisa menilai hasil panen siklus ini
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">{nilai.reason}</p>
              {/* Nada di sini SENGAJA netral: tidak ada konsekuensi, tidak ada peringatan,
                  tidak ada permintaan konfirmasi tambahan. Mendung bukan kesalahan Tenant. */}
              <p className="text-sm leading-relaxed text-slate-600">
                Ini <b>tidak</b> berpengaruh pada kuota maupun reputasi Anda. Foto dan catatan
                timeline tetap menjadi bukti yang sah, dan panen Anda diproses seperti biasa.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Verdict marginal — ditinjau manusia ---------------- */}
      {perluDitinjau && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-full bg-sky-200 p-2 text-sky-800">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-sky-900">Akan ditinjau tim kami</h2>
              <p className="text-sm leading-relaxed text-sky-800">{nilai.reason}</p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- TN-19a — Pratinjau alokasi ---------------- */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-emerald-950">Dampak ke pesanan pembeli</h2>
        <p className="mb-4 text-xs text-gray-500">
          {data.allocatableBox < nilai.reportedBox ? (
            <>
              Dari {rupiahBox(nilai.reportedBox)} yang dipanen,{" "}
              <b>{rupiahBox(data.allocatableBox)}</b> masuk ke pesanan yang sudah terjual.
              Sisanya milik Anda.
            </>
          ) : (
            <>Seluruh {rupiahBox(data.allocatableBox)} dibagikan ke pesanan yang sudah terjual.</>
          )}
        </p>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Angka label="Terpenuhi penuh" nilai={alokasi.fullyFulfilled.length} warna="emerald" />
          <Angka label="Sebagian" nilai={alokasi.partial.length} warna="amber" />
          <Angka label="Tidak kebagian" nilai={alokasi.unfulfilled.length} warna="red" />
        </div>

        {alokasi.fullyFulfilled.length + alokasi.partial.length + alokasi.unfulfilled.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
            Belum ada pesanan terjual pada batch ini.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {[...alokasi.fullyFulfilled, ...alokasi.partial, ...alokasi.unfulfilled].map((l) => (
              <li key={l.orderItemId} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* FR-7.13 — alasan urutannya ditampilkan, bukan dibiarkan tampak acak. */}
                  {l.senioritas && (
                    <Star
                      className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                      aria-label="Prioritas dari shortfall siklus lalu"
                    />
                  )}
                  <span className="truncate text-gray-700">{l.buyerName}</span>
                </span>
                <span className="shrink-0 font-semibold text-gray-900">
                  {l.allocatedBox}/{l.qtyBox} box
                </span>
              </li>
            ))}
          </ul>
        )}

        {[...alokasi.fullyFulfilled, ...alokasi.partial, ...alokasi.unfulfilled].some(
          (l) => l.senioritas,
        ) && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
            <Star className="mt-0.5 h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
            Pembeli bertanda ini terkena shortfall pada siklus sebelumnya, jadi didahulukan kali
            ini sebelum urutan waktu pembayaran.
          </p>
        )}
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBatal}
          disabled={memproses}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Kembali &amp; perbaiki angka
        </button>
        <button
          type="button"
          onClick={onLanjut}
          disabled={memproses}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60 ${
            diLuarPita ? "bg-amber-700 hover:bg-amber-600" : "bg-emerald-950 hover:bg-emerald-800"
          }`}
        >
          {memproses && <Loader2 className="h-4 w-4 animate-spin" />}
          {/* TN-19b menuntut konfirmasi EKSPLISIT, bukan sekadar tombol lanjut — kalimat
              tombolnya menyebut konsekuensinya, sehingga tidak bisa ditekan tanpa sadar. */}
          {memproses
            ? "Menyimpan…"
            : diLuarPita
              ? "Saya paham, tetap catat panen ini"
              : "Konfirmasi & catat panen"}
        </button>
      </div>
    </div>
  );
}

function Angka({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: number;
  warna: "emerald" | "amber" | "red";
}) {
  const kelas = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
  }[warna];
  return (
    <div className={`rounded-lg border px-2 py-3 ${kelas}`}>
      <div className="text-2xl font-black">{nilai}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
}
