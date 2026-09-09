"use client";

import React, { useEffect, useState } from "react";
import type { OperatorEscrowSummary } from "@agro-os/shared";
import { GalatApi, ambilEscrowOperator } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
} from "@/ui";

/**
 * OP-09 — Escrow seluruh Tenant.
 *
 * MIGRASI DUNIA, dengan tiga hal yang bukan soal rupa:
 *
 * 1. "SUDAH DICAIRKAN" BERHENTI JADI JUDUL YANG MENYESATKAN. `menungguPenyaluran` adalah
 *    BAGIAN dari `totalDicairkan` yang instruksinya ke mitra pembayaran belum sukses, dan
 *    selama mitra belum tersambung keduanya sama persis — artinya nol rupiah benar-benar
 *    sampai ke rekening siapa pun. Layar lama menyatakannya sebagai butir bersarang dengan
 *    indentasi dua spasi di dalam string (`"  ↳ menunggu penyaluran"`), padahal butir-butir
 *    itu duduk di dalam grid: spasinya tidak menghasilkan indentasi apa pun, jadi hubungan
 *    induk-anaknya tidak pernah terlihat. Kedua angka kini berdiri di satu panel yang
 *    menghitung selisihnya sendiri.
 *
 * 2. SALDO TERTAHAN NEGATIF DINYATAKAN SEBAGAI ANOMALI. `tertahan` = seluruh HOLD dikurangi
 *    seluruh arus keluar, jadi angka negatif berarti ada potongan atau pengalihan tanpa dana
 *    yang pernah ditahan untuknya. Di data demo ada satu Tenant seperti itu. Buku besar yang
 *    append-only tidak bisa disunting, jadi satu-satunya guna dashboard ini adalah membuat
 *    keadaan seperti itu KELIHATAN — dan layar lama mencetaknya abu-abu, sama seperti angka
 *    lainnya.
 *
 * 3. KARTU HIJAU TUA BER-`blur-2xl` DIBUANG. Kaca dan cahaya sebagai hiasan adalah perangkat
 *    yang sudah dibuang dari beranda Tenant di Fase E; ini salinan keduanya.
 */
export default function OperatorEscrowPage() {
  const [data, setData] = useState<OperatorEscrowSummary | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilEscrowOperator()
      .then((d) => {
        setData(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Escrow gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Escrow seluruh Tenant">
        <Memuat baris={4} label="Memuat ringkasan escrow" />
      </Halaman>
    );
  }

  if (galat || !data) {
    return (
      <Halaman judul="Escrow seluruh Tenant">
        <Galat judul="Escrow gagal dimuat">
          {galat || "Ringkasan tidak tersedia."} Buku besar tetap utuh di server — angka di
          halaman ini hasil penjumlahan entri, bukan saldo yang disimpan terpisah.
        </Galat>
      </Halaman>
    );
  }

  // Bagian dari "sudah dicairkan" yang instruksinya BELUM sukses. Selama mitra pembayaran
  // belum tersambung, selisihnya nol — dan nol di sini berarti tidak ada satu rupiah pun
  // yang benar-benar berpindah.
  const benarBerpindah = data.totalDicairkan - data.menungguPenyaluran;
  const belumAdaYangCair = data.totalDicairkan > 0 && benarBerpindah === 0;
  const tenantMinus = data.perTenant.filter((t) => t.tertahan < 0);

  return (
    <Halaman
      judul="Escrow seluruh Tenant"
      pengantar="Buku besar bersifat append-only — angka di sini hasil penjumlahan entri, bukan saldo yang bisa disunting."
    >
      <Panel label="Sedang ditahan" judul="Dana yang belum jadi hak siapa pun">
        <p className="font-mono text-[26px] leading-none text-tinta">{rupiah(data.tertahan)}</p>
        <Sunyi className="mt-3 max-w-[68ch] text-[13px]">
          Seluruh entri HOLD dikurangi seluruh arus keluar. Uang ini milik pembeli sampai
          barangnya diterima dan jendela klaim mutu berakhir.
        </Sunyi>
      </Panel>

      {/* Keadaan yang paling mudah disalahpahami di seluruh produk, jadi ia dapat panelnya
          sendiri alih-alih satu baris di antara enam baris lain. */}
      <Panel
        nada={belumAdaYangCair ? "awas" : "netral"}
        label="Penyaluran"
        judul="Berapa yang benar-benar sampai ke Tenant"
        className="mt-8"
      >
        <Deret kolom={3} as="dl">
          <BarisData label="Tercatat cair">{rupiah(data.totalDicairkan)}</BarisData>
          <BarisData label="Menunggu penyaluran">{rupiah(data.menungguPenyaluran)}</BarisData>
          <BarisData label="Sudah diterima Tenant">{rupiah(benarBerpindah)}</BarisData>
        </Deret>
        <Prosa className="mt-6 text-[14px]">
          {belumAdaYangCair
            ? "Seluruh dana yang tercatat cair masih menunggu penyaluran: entri RELEASE sudah ditulis di buku besar, tetapi instruksi ke mitra pembayaran belum tersambung. Dananya sudah menjadi hak Tenant dan belum satu rupiah pun sampai di rekeningnya."
            : "Selisih antara yang tercatat cair dan yang menunggu penyaluran adalah dana yang instruksinya sudah sukses di mitra pembayaran."}
        </Prosa>
      </Panel>

      <Panel label="Arus keluar" judul="Ke mana dana escrow berpindah" className="mt-8">
        <Deret kolom={2} as="dl">
          <BarisData label="Total pernah ditahan">{rupiah(data.totalDitahan)}</BarisData>
          <BarisData label="Potongan klaim mutu">{rupiah(data.totalPotonganKlaim)}</BarisData>
          <BarisData label="Dikembalikan ke pembeli">{rupiah(data.totalRefund)}</BarisData>
          <BarisData label="Biaya pembatalan">{rupiah(data.totalBiayaBatal)}</BarisData>
          <BarisData label="Dialihkan lewat substitusi">
            {rupiah(data.totalAlihSubstitusi)}
          </BarisData>
        </Deret>
      </Panel>

      {tenantMinus.length > 0 ? (
        /* Saldo tertahan tidak bisa negatif tanpa ada yang salah: ia jumlah HOLD dikurangi
           arus keluar, jadi minus berarti ada potongan atau pengalihan tanpa dana yang
           pernah ditahan untuknya. Buku besarnya append-only dan tidak bisa dibetulkan dari
           layar — satu-satunya guna halaman ini adalah membuatnya kelihatan. */
        <Panel
          nada="awas"
          label="Perlu diperiksa"
          judul={`${tenantMinus.length} Tenant bersaldo tertahan negatif`}
          className="mt-8"
        >
          <Prosa className="text-[14px]">
            Saldo tertahan adalah jumlah HOLD dikurangi arus keluar, jadi angka negatif berarti
            ada potongan atau pengalihan yang tidak punya dana tertahan sebagai pasangannya.
            Buku besar append-only tidak bisa disunting dari sini; yang bisa dilakukan halaman
            ini hanya menunjukkannya.
          </Prosa>
          <div className="mt-6 space-y-3">
            {tenantMinus.map((t) => (
              <div key={t.tenantId} className="border-t-2 border-jambu pt-3">
                <Label className="text-jambu">{t.companyName}</Label>
                <p className="mt-1.5 font-mono text-[15px] text-tinta">
                  {rupiah(t.tertahan)} tertahan · {rupiah(t.ditahan)} pernah ditahan
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel label="Rincian" judul="Per Tenant" className="mt-8">
        {data.perTenant.length === 0 ? (
          <Kosong judul="Belum ada entri escrow">
            Entri pertama ditulis saat pembeli menyelesaikan pembayaran Pre-Order.
          </Kosong>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[34rem] border-collapse text-[14px]">
              <thead>
                <tr className="border-b-2 border-tinta">
                  <th className="py-2 pr-4 text-left">
                    <Label as="span">Tenant</Label>
                  </th>
                  <th className="py-2 pr-4 text-right">
                    <Label as="span">Pernah ditahan</Label>
                  </th>
                  <th className="py-2 pr-4 text-right">
                    <Label as="span">Tercatat cair</Label>
                  </th>
                  <th className="py-2 text-right">
                    <Label as="span">Tertahan</Label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.perTenant.map((t) => (
                  <tr key={t.tenantId} className="border-b border-kertas-garis">
                    <td className="py-3 pr-4 font-semibold text-tinta">{t.companyName}</td>
                    <td className="py-3 pr-4 text-right font-mono text-tinta-lembut">
                      {rupiah(t.ditahan)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-tinta-lembut">
                      {rupiah(t.dicairkan)}
                    </td>
                    <td
                      className={`py-3 text-right font-mono ${
                        t.tertahan < 0 ? "font-semibold text-jambu" : "text-tinta"
                      }`}
                    >
                      {rupiah(t.tertahan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* "Tercatat cair" per Tenant memakai kata yang sama dengan panel di atas: kolom yang
            berjudul "dicairkan" mengundang kesimpulan bahwa uangnya sudah sampai. */}
        <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
          Kolom &ldquo;tercatat cair&rdquo; adalah entri RELEASE di buku besar, bukan bukti
          uang sudah diterima Tenant — lihat panel penyaluran di atas.
        </Sunyi>
      </Panel>
    </Halaman>
  );
}
