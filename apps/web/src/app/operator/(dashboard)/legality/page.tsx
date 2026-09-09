"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LegalityQueueItem, LegalityStatus } from "@agro-os/shared";
import { GalatApi, ambilAntreanLegalitas } from "@/lib/api";
import { angka, tanggalPanjang } from "@/lib/format-id";
import { PilLegalitas } from "@/components/status-legalitas";
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
  Tombol,
} from "@/ui";

/**
 * OP-03 — Verifikasi legalitas Tenant (FR-1.7, UC-12).
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: pil status berhenti mencetak `{legalityStatus}`
 * apa adanya. Konsol sebelumnya memuat "PENDING" dan "REJECTED" — nama kolom basis data,
 * bukan label. Kosakatanya kini di `@/components/status-legalitas`, dan sengaja berbeda dari
 * kalimat yang dibaca Tenant: operator butuh tahu apa yang harus ia lakukan, Tenant butuh
 * tahu apa artinya bagi dirinya.
 */
const TAB: Array<{ nilai: LegalityStatus; label: string }> = [
  { nilai: "PENDING", label: "Menunggu" },
  { nilai: "APPROVED", label: "Disetujui" },
  { nilai: "REJECTED", label: "Ditolak" },
];

export default function OperatorLegalityPage() {
  const [tab, setTab] = useState<LegalityStatus>("PENDING");
  const [antrean, setAntrean] = useState<LegalityQueueItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  const muat = useCallback((status: LegalityStatus) => {
    setMemuat(true);
    ambilAntreanLegalitas(status)
      .then((d) => {
        setAntrean(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Antrean gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    muat(tab);
  }, [tab, muat]);

  return (
    <Halaman
      judul="Verifikasi legalitas"
      pengantar="Tenant baru bisa membuka kuota Pre-Order setelah legalitasnya disetujui — pembeli membayar di muka atas nama yang tertera di dokumen ini."
      aksi={
        <>
          {TAB.map((t) => (
            <Tombol
              key={t.nilai}
              rupa={tab === t.nilai ? "utama" : "kedua"}
              ukuran="sm"
              aria-pressed={tab === t.nilai}
              onClick={() => setTab(t.nilai)}
            >
              {t.label}
            </Tombol>
          ))}
        </>
      }
    >
      {galat ? (
        <Galat judul="Antrean gagal dimuat" className="mb-8">
          {galat} Pendaftaran Tenant tetap tersimpan di server — muat ulang halaman untuk
          mencoba lagi.
        </Galat>
      ) : null}

      {memuat ? (
        <Memuat baris={3} label="Memuat antrean legalitas" />
      ) : antrean.length === 0 ? (
        /* Antrean tinjauan yang kosong adalah antrean yang sehat, bukan kegagalan. */
        <Kosong judul={`Tidak ada Tenant berstatus ${TAB.find((t) => t.nilai === tab)!.label.toLowerCase()}`}>
          {tab === "PENDING"
            ? "Tidak ada pendaftaran yang menunggu tinjauan Anda. Tenant baru muncul di sini setelah mengunggah dokumen legalitasnya."
            : "Belum ada Tenant di daftar ini."}
        </Kosong>
      ) : (
        <div className="space-y-8">
          {antrean.map((t) => (
            <Panel
              key={t.tenantId}
              nada={t.legalityStatus === "PENDING" ? "kabar" : "netral"}
              /* `submittedAt` boleh null, dan mengisinya dengan tanggal hari ini akan
                 MENGARANG tanggal pendaftaran — persis jenis kekeliruan yang paling sulit
                 terlihat, karena hasilnya tampak masuk akal. */
              label={
                t.submittedAt ? `Mendaftar ${tanggalPanjang(t.submittedAt)}` : "Belum mengirim dokumen"
              }
              judul={
                <Link
                  href={`/operator/legality/${t.tenantId}`}
                  className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                >
                  {t.companyName}
                </Link>
              }
              aksi={<PilLegalitas status={t.legalityStatus} />}
            >
              <Deret kolom={3} as="dl">
                <BarisData label="Zona layanan" prosa>
                  {t.zoneNames.length ? t.zoneNames.join(", ") : "Belum memilih zona"}
                </BarisData>
                <BarisData label="Petak lahan">{angka(t.landPlotCount)} petak</BarisData>
                <BarisData label="Dokumen" prosa>
                  {t.legalityDocUrl ? "Terlampir" : "Belum diunggah"}
                </BarisData>
              </Deret>

              {/* Dokumen yang belum diunggah bukan hal sepele: tanpa itu tidak ada yang bisa
                  ditinjau, jadi dibedakan dari sekadar "menunggu". */}
              {!t.legalityDocUrl ? (
                <div className="mt-6 border-t-2 border-jambu pt-3">
                  <Label className="text-jambu">Belum ada yang bisa ditinjau</Label>
                  <Prosa className="mt-1.5 text-[14px]">
                    Tenant ini belum mengunggah dokumen apa pun. Menolak dengan alasan itu
                    memberitahunya apa yang harus dilakukan; membiarkannya di antrean tidak.
                  </Prosa>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </Halaman>
  );
}
