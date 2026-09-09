"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CLAIM_AUTO_SETTLE_MAX_PCT } from "@agro-os/shared";
import type { ClaimResponse } from "@agro-os/shared";
import { GalatApi, ambilAntreanKlaim } from "@/lib/api";
import { desimal, jamWib, rupiah, tanggalPanjang } from "@/lib/format-id";
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
  Ubin,
} from "@/ui";

type Antrean = ClaimResponse & { overdue: boolean };

/**
 * OP-05 — Antrean klaim mutu di atas ambang potong-otomatis (FR-5.6).
 *
 * Klaim di bawah ambang sudah dipotong otomatis dari escrow dan TIDAK muncul di sini — yang
 * sampai ke meja operator hanya yang nilainya cukup besar untuk perlu diputus manusia.
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: ambang 10% berhenti diketik di kalimat dan
 * diimpor dari `CLAIM_AUTO_SETTLE_MAX_PCT`. Ia aturan yang dijalankan server saat memutuskan
 * klaim mana yang masuk antrean ini; angka yang menentukan beban kerja operator tidak boleh
 * punya dua sumber.
 */
export default function OperatorClaimsPage() {
  const [antrean, setAntrean] = useState<Antrean[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilAntreanKlaim()
      .then((d) => {
        setAntrean(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Antrean klaim gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return (
      <Halaman judul="Antrean klaim mutu">
        <Memuat baris={3} label="Memuat antrean klaim" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Antrean klaim mutu">
        <Galat judul="Antrean gagal dimuat">
          {galat} Klaim yang menunggu tetap tercatat di server, dan dananya tetap tertahan —
          muat ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  const telat = antrean.filter((c) => c.overdue).length;

  return (
    <Halaman
      judul="Antrean klaim mutu"
      pengantar={`Hanya klaim di atas ${CLAIM_AUTO_SETTLE_MAX_PCT}% nilai pesanan yang sampai ke meja ini. Sisanya sudah dipotong otomatis dari escrow tanpa melewati siapa pun.`}
      aksi={
        antrean.length > 0 ? (
          <Pil nada={telat > 0 ? "awas" : "netral"} garis={telat === 0}>
            {antrean.length} menunggu putusan
          </Pil>
        ) : null
      }
    >
      {telat > 0 ? (
        <Panel nada="awas" label="Lewat SLA" judul={`${telat} klaim menunggu terlalu lama`} className="mb-8">
          <Prosa className="text-[14px]">
            Selama belum diputus, dana pembeli maupun Tenant sama-sama tertahan — keduanya
            menunggu tanpa bisa berbuat apa pun. Klaim yang lewat SLA berdiri paling atas di
            daftar di bawah.
          </Prosa>
        </Panel>
      ) : null}

      {antrean.length === 0 ? (
        /* Antrean kosong di sini adalah antrean yang SEHAT, bukan kegagalan memuat. */
        <Kosong judul="Tidak ada klaim yang menunggu putusan">
          Klaim di bawah ambang potong-otomatis diselesaikan sistem tanpa melewati meja ini,
          jadi antrean kosong berarti tidak ada perselisihan besar yang sedang berjalan.
        </Kosong>
      ) : (
        <div className="space-y-8">
          {[...antrean]
            .sort((a, b) => Number(b.overdue) - Number(a.overdue))
            .map((c) => (
              <BarisKlaim key={c.id} c={c} />
            ))}
        </div>
      )}
    </Halaman>
  );
}

function BarisKlaim({ c }: { c: Antrean }) {
  return (
    <Panel
      nada={c.overdue ? "awas" : "kabar"}
      label={`Diajukan ${tanggalPanjang(c.createdAt)} · ${jamWib(c.createdAt)} WIB`}
      judul={
        <Link
          href={`/operator/claims/${c.id}`}
          className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          {c.productName}
        </Link>
      }
      aksi={
        <Pil nada={c.overdue ? "awas" : "kabar"} garis={!c.overdue}>
          {c.overdue
            ? "Lewat SLA"
            : c.slaDueAt
              ? `SLA ${tanggalPanjang(c.slaDueAt)} ${jamWib(c.slaDueAt)}`
              : "Menunggu"}
        </Pil>
      }
    >
      <Deret kolom={4} as="dl">
        <Ubin label="Seharusnya" nilai={desimal(c.expectedKg, 1)} satuan="kg" />
        <Ubin label="Hasil timbang" nilai={desimal(c.actualWeightKg, 1)} satuan="kg" />
        <Ubin
          label={`Toleransi ${desimal(c.shrinkTolerancePct, 0)}%`}
          nilai={desimal(c.toleratedKg, 1)}
          satuan="kg"
        />
        <Ubin
          label="Bisa diklaim"
          nilai={desimal(c.claimableKg, 1)}
          satuan="kg"
          nada="awas"
          catatan={`${rupiah(c.claimValue)} · ${desimal(c.pctOfOrder, 0)}% nilai pesanan`}
        />
      </Deret>

      <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
        Selisih kotornya {desimal(c.shortfallKg, 1)} kg; toleransi susut alami komoditas ini
        sudah dipotong dari angka yang bisa diklaim.
      </Sunyi>

      <div className="mt-5 border-t border-kertas-garis pt-3">
        <Label>Keluhan pembeli</Label>
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-tinta-lembut">
          {c.description}
        </p>
      </div>
    </Panel>
  );
}
