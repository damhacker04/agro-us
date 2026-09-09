"use client";

import React, { useEffect, useState } from "react";
import type { AnchorAuditItem } from "@agro-os/shared";
import { GalatApi, ambilJangkar } from "@/lib/api";
import { angka, tanggalPanjang } from "@/lib/format-id";
import { Galat, Halaman, Kosong, Label, Memuat, Panel, Pil, Prosa, Sunyi } from "@/ui";

/**
 * OP-08 — Audit jangkar hash (§6.1).
 *
 * `matchesCurrent` bukan perbandingan kolom hash dengan kolom hash — server menghitung ULANG
 * rantai dari isi node saat ini lalu membandingkannya dengan root yang dijangkarkan.
 * Perbandingan hash-tersimpan-vs-hash-tersimpan akan selalu cocok meski isinya diubah, jadi
 * tidak membuktikan apa pun.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: `toLocaleDateString("id-ID")` diganti
 * `tanggalPanjang`. ICU peramban dan ICU server bisa berbeda, dan di halaman yang seluruh
 * gunanya adalah membuktikan bahwa sesuatu TIDAK berubah, tanggal yang berbeda antara render
 * server dan render klien adalah jenis ketidakcocokan yang paling buruk untuk ditemukan.
 *
 * Kalimat tentang jangkar yang belum dipublikasikan ke penyimpanan eksternal dipertahankan
 * apa adanya dan dinaikkan bobotnya: selama belum terbit, jangkarnya masih bisa ditulis
 * ulang bersama basis datanya, jadi bukti eksternalnya belum ada dan tidak boleh diklaim ada.
 */
export default function OperatorAuditPage() {
  const [jangkar, setJangkar] = useState<AnchorAuditItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilJangkar()
      .then((d) => {
        setJangkar(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Jangkar gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  const rusak = jangkar.filter((a) => !a.matchesCurrent);
  const belumTerbit = jangkar.filter((a) => !a.externalRef).length;

  return (
    <Halaman
      judul="Audit jangkar hash"
      pengantar="Rantai dihitung ulang dari isi node, lalu dibandingkan dengan root yang dijangkarkan hari itu. Ketidakcocokan berarti ada isi yang berubah setelah dijangkarkan."
      aksi={
        !memuat && !galat && jangkar.length > 0 ? (
          <Pil nada={rusak.length > 0 ? "awas" : "utama"} garis={rusak.length === 0}>
            {rusak.length > 0
              ? `${angka(rusak.length)} tidak cocok`
              : `${angka(jangkar.length)} jangkar cocok`}
          </Pil>
        ) : null
      }
    >
      {galat ? (
        <Galat judul="Jangkar gagal dimuat">
          {galat} Jangkar tetap tersimpan di server dan cron hariannya tetap berjalan — muat
          ulang halaman untuk mencoba lagi.
        </Galat>
      ) : memuat ? (
        <Memuat baris={3} label="Memuat jangkar" />
      ) : (
        <>
          {rusak.length > 0 ? (
            <Panel
              nada="awas"
              label="Perlu ditelusuri"
              judul={`${angka(rusak.length)} jangkar tidak cocok dengan rantai saat ini`}
              className="mb-8"
            >
              <Prosa className="text-[14px]">
                Isi node batch tersebut berubah setelah dijangkarkan, jadi Verified Timeline-nya
                tidak lagi bisa dipakai sebagai bukti yang bisa diperiksa sendiri oleh pembeli.
                Yang perlu ditemukan adalah node mana yang berubah dan kapan.
              </Prosa>
            </Panel>
          ) : null}

          {jangkar.length === 0 ? (
            <Kosong judul="Belum ada jangkar">
              Jangkar dibuat cron harian untuk tiap batch yang punya node timeline. Batch yang
              belum punya kegiatan lapangan belum punya rantai untuk dijangkarkan.
            </Kosong>
          ) : (
            <>
              <div className="space-y-8">
                {jangkar.map((a) => (
                  <BarisJangkar
                    key={`${a.batchId}-${a.anchorDate}`}
                    a={a}
                    /* Bila SEMUA jangkar belum terbit, keadaannya dinyatakan sekali di panel
                       bawah. Mengulanginya di tiap kartu membuat kalimat yang sama dibaca
                       sebanyak jumlah barisnya, dan pengulangan itu justru menumpulkannya. */
                    diamkanBelumTerbit={belumTerbit === jangkar.length}
                  />
                ))}
              </div>

              {/* Batas dinyatakan sekali di bawah daftarnya, bukan diulang di tiap kartu:
                  keadaannya sama untuk semuanya selama penerbitan eksternal belum menyala. */}
              {belumTerbit === jangkar.length ? (
                <Panel label="Batas yang diakui" judul="Bukti masih internal" className="mt-8">
                  <Prosa className="text-[14px]">
                    Belum ada jangkar yang dipublikasikan ke penyimpanan write-once di luar
                    sistem ini. Selama itu belum terjadi, jangkarnya masih bisa ditulis ulang
                    bersama basis datanya — pemeriksaan di halaman ini membuktikan konsistensi
                    internal, bukan ketidakmungkinan pengubahan.
                  </Prosa>
                </Panel>
              ) : null}
            </>
          )}
        </>
      )}
    </Halaman>
  );
}

function BarisJangkar({
  a,
  diamkanBelumTerbit,
}: {
  a: AnchorAuditItem;
  diamkanBelumTerbit: boolean;
}) {
  const adaYangDitulis = Boolean(a.externalRef) || !diamkanBelumTerbit;
  return (
    <Panel
      nada={a.matchesCurrent ? "netral" : "awas"}
      label={`${a.tenantName} · dijangkarkan ${tanggalPanjang(a.anchorDate)}`}
      judul={a.productName}
      aksi={
        <Pil nada={a.matchesCurrent ? "utama" : "awas"} garis={a.matchesCurrent}>
          {a.matchesCurrent ? "Cocok" : "Tidak cocok"}
        </Pil>
      }
    >
      <Label>Root hash · {angka(a.nodeCount)} node</Label>
      <p className="mt-1.5 break-all font-mono text-[12px] leading-relaxed text-tinta-lembut">
        {a.rootHash}
      </p>

      {adaYangDitulis ? (
        <div className="mt-6 border-t border-kertas-garis pt-3">
          {a.externalRef ? (
            <>
              <Label>Jangkar eksternal</Label>
              <p className="mt-1.5 break-all font-mono text-[12px] text-tinta">{a.externalRef}</p>
            </>
          ) : (
            <Sunyi className="max-w-[68ch] text-[13px]">
              Belum dipublikasikan ke penyimpanan eksternal — buktinya masih internal.
            </Sunyi>
          )}
        </div>
      ) : null}
    </Panel>
  );
}
