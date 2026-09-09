"use client";

import React, { useEffect, useState } from "react";
import { GalatApi, ambilEscrow } from "@/lib/api";
import { rupiah } from "@/lib/format-id";
import { entriEscrow } from "@/components/entri-escrow";
import {
  Deret,
  Galat,
  Halaman,
  Label,
  Memuat,
  Panel,
  Prosa,
  Sunyi,
  Ubin,
} from "@/ui";

/**
 * TN-24 — Escrow & pencairan.
 *
 * MIGRASI DUNIA. Dua hal yang berubah selain rupa:
 *
 * 1. NAMA KOLOM BASIS DATA BERHENTI BOCOR KE LAYAR. Rincian per jenis entri ditampilkan
 *    lewat `jenis.replace(/_/g, " ")`, jadi Tenant membaca "BIAYA BATAL10" dan "RELEASE30"
 *    di halaman yang menjelaskan uangnya sendiri. Sekarang ketujuh jenis punya nama dan
 *    keterangan manusia di `@/components/entri-escrow`, berikut ARAH uangnya — buku besar
 *    ini append-only, jadi entri yang saling meniadakan memang tampil berdampingan dan
 *    harus bisa dibedakan.
 *
 * 2. "MENUNGGU PENYALURAN" NAIK KE GROUND PENUH. Ia keadaan yang paling mudah disalahpahami
 *    di seluruh produk — dana sudah jadi hak Tenant tetapi instruksi ke mitra pembayaran
 *    belum tersambung (§5.7.1) — dan kotak amber pucat di antara kotak lain tidak cukup
 *    untuk memisahkannya dari "sudah cair". Orang yang menunggu uangnya berhak melihat
 *    bedanya tanpa membaca teliti.
 */
export default function FinancePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof ambilEscrow>> | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilEscrow()
      .then((d) => {
        setData(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Data escrow gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Escrow & pencairan">
        <Memuat baris={4} label="Memuat data escrow" />
      </Halaman>
    );
  }

  if (galat || !data) {
    return (
      <Halaman judul="Escrow & pencairan">
        <Galat judul="Data escrow gagal dimuat">
          {galat || "Data tidak ditemukan."} Buku besar escrow tetap utuh di server — muat
          ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const rincian = Object.entries(data.rincian).filter(([, n]) => n !== 0);

  return (
    <Halaman
      judul="Escrow & pencairan"
      pengantar="Dana pembeli ditahan sampai pengiriman selesai dan jendela klaim mutu berakhir. Pencairan berjalan otomatis — tidak ada yang perlu Anda ajukan."
    >
      <Panel nada="utama" label="Posisi sekarang" judul="Masih tertahan di escrow">
        {/* 26px = `data-display`, langkah Operate untuk nilai yang memimpin. BUKAN 34px:
            itu langkah lapangan, dan halaman keuangan dibaca di meja, bukan sambil berdiri
            di kebun. Permukaannya yang menentukan ramp-nya. */}
        <p className="font-mono text-[26px] leading-none text-tinta">{rupiah(data.tertahan)}</p>
        <Prosa className="mt-4 text-[14px]">
          Seluruh pembayaran pembeli yang belum dilepas. Ia berpindah menjadi hak Anda setelah
          barang diterima dan jendela klaim mutu tiap pengiriman berakhir.
        </Prosa>
      </Panel>

      {/* Dana yang sudah lepas dari escrow tetapi belum sampai ke rekening. Ditampilkan
          terpisah, bukan digabung ke "sudah dicairkan": instruksi ke mitra pembayaran
          berizin belum tersambung (§5.7.1), dan menyembunyikannya berarti Tenant menunggu
          uang yang ia kira sudah dikirim. */}
      {data.menungguPenyaluran > 0 ? (
        <div className="mt-8 bg-jambu p-6">
          <Label className="text-kabut-jambu">Menunggu penyaluran ke rekening</Label>
          <p className="mt-2.5 font-mono text-[26px] leading-none text-kertas-terang">
            {rupiah(data.menungguPenyaluran)}
          </p>
          <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-kabut-jambu">
            Dana ini sudah lepas dari escrow dan menjadi hak Anda, tetapi instruksi transfer ke
            rekening belum berhasil dikirim — mitra pembayaran berizin belum tersambung. Kami
            menampilkannya apa adanya alih-alih menyatakannya sudah cair.
          </p>
        </div>
      ) : null}

      <Deret kolom={4} as="dl" className="mt-8">
        <Ubin label="Total pernah ditahan" nilai={rupiah(data.totalDitahan)} />
        <Ubin label="Sudah dicairkan" nilai={rupiah(data.totalDicairkan)} nada="utama" />
        <Ubin label="Potongan klaim mutu" nilai={rupiah(data.totalPotonganKlaim)} nada="awas" />
        <Ubin label="Dikembalikan ke pembeli" nilai={rupiah(data.totalRefund)} nada="awas" />
      </Deret>

      {/* Ledger bersifat append-only (§6.1): koreksi selalu berupa entri baru, tidak pernah
          menimpa yang lama. Rinciannya ditampilkan apa adanya supaya Tenant bisa menelusuri
          sendiri dari mana angkanya berasal. */}
      <Panel label="Buku besar" judul="Rincian per jenis entri" className="mt-10">
        {rincian.length === 0 ? (
          <Prosa className="text-[14px]">
            Belum ada entri. Buku besar terisi begitu pembayaran pertama masuk escrow.
          </Prosa>
        ) : (
          <dl>
            {rincian.map(([jenis, nilai]) => {
              const e = entriEscrow(jenis);
              return (
                <div
                  key={jenis}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-kertas-garis py-4"
                >
                  <div className="min-w-0 flex-1">
                    <dt className="text-[15px] text-tinta">{e.label}</dt>
                    <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-tinta-samar">
                      {e.jelas}
                    </p>
                  </div>
                  <dd
                    className={
                      e.arah === "masuk"
                        ? "shrink-0 font-mono text-[15px] text-tinta"
                        : "shrink-0 font-mono text-[15px] text-jambu"
                    }
                  >
                    {e.arah === "masuk" ? "+" : "−"}
                    {rupiah(nilai)}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
          Buku besar ini append-only: koreksi selalu berupa entri baru, tidak pernah menimpa
          yang lama. Itu sebabnya angka yang saling meniadakan bisa tampil berdampingan —
          jejaknya sengaja tidak dihapus.
        </Sunyi>
      </Panel>
    </Halaman>
  );
}
