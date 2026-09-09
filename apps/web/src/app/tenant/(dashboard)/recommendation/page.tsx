"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GalatApi, aktifkanLangganan, ambilRekomendasi } from "@/lib/api";
import { angka, tanggalPendek } from "@/lib/format-id";
import type { PlantingRecommendation } from "@agro-os/shared";
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
  Tombol,
  TombolTaut,
  Ubin,
  type Nada,
} from "@/ui";

/**
 * TN-25 — Rekomendasi tanam (§5.8).
 *
 * MIGRASI DUNIA. Yang berubah selain rupa: tanggal berhenti memakai
 * `toLocaleDateString("id-ID", { timeZone: "UTC" })` dan jumlah kg berhenti memakai
 * `toLocaleString` — keduanya bergantung pada data ICU runtime yang berbeda antara server
 * dan peramban. Di halaman yang berisi angka untuk dipakai mengambil keputusan modal,
 * angka yang berubah bentuk tergantung mesin siapa yang membacanya adalah cacat, bukan
 * detail.
 */

/** Penanda kejenuhan pasokan (FR-8.4) — mencegah semua Tenant menanam komoditas sama. */
const SATURASI: Record<string, { label: string; nada: Nada; garis: boolean }> = {
  KURANG: { label: "Pasokan kurang", nada: "utama", garis: false },
  SEIMBANG: { label: "Seimbang", nada: "netral", garis: true },
  JENUH: { label: "Jenuh", nada: "awas", garis: false },
  TANPA_DATA: { label: "Belum terukur", nada: "netral", garis: true },
};

/** Dasar keyakinan angka permintaan. WAJIB tampil bersama angkanya: Tenant mengeluarkan
 *  uang sungguhan untuk menanam, jadi proyeksi bersandar dua minggu data tidak boleh
 *  terlihat sama meyakinkannya dengan delapan minggu. */
const KEYAKINAN: Record<string, string> = {
  TINGGI: "Keyakinan tinggi",
  SEDANG: "Keyakinan sedang",
  RENDAH: "Keyakinan rendah",
  TANPA_DATA: "Tanpa riwayat",
};

/**
 * Satu kartu per (zona, komoditas), bukan per minggu panen.
 *
 * Server mengembalikan satu baris untuk SETIAP minggu dalam horizon 8–16 minggu, jadi
 * satu komoditas menghasilkan sembilan baris yang nyaris identik. Angkanya tidak boleh
 * dijumlahkan — permintaan 125 kg di lima minggu berbeda bukan permintaan 625 kg, dan
 * Tenant hanya menanam untuk satu minggu panen. Maka minggunya jadi PILIHAN di dalam
 * kartu, dan kalimat rakitan server tetap ditampilkan utuh per minggu yang dipilih.
 *
 * Default jatuh ke minggu dengan tenggat tanam paling dekat: itu yang paling cepat
 * hangus kalau Tenant menunda.
 */
function KartuKomoditas({ minggu }: { minggu: PlantingRecommendation[] }) {
  const urut = useMemo(
    () => [...minggu].sort((a, b) => a.daysUntilPlantingDeadline - b.daysUntilPlantingDeadline),
    [minggu],
  );
  const [dipilih, setDipilih] = useState(urut[0]!.harvestWeekStart);
  const r = urut.find((x) => x.harvestWeekStart === dipilih) ?? urut[0]!;
  const s = SATURASI[r.saturation]!;

  return (
    <Panel
      nada={s.nada}
      label={r.zoneName}
      judul={r.commodityName}
      aksi={
        <>
          <Pil nada={s.nada} garis={s.garis}>
            {s.label}
          </Pil>
          <Pil nada="netral" garis>
            {KEYAKINAN[r.confidence]}
          </Pil>
        </>
      }
    >
      {urut.length > 1 ? (
        <fieldset className="mb-6">
          <legend className="mb-2">
            <Label>Minggu panen · {urut.length} pilihan</Label>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...urut]
              .sort((a, b) => a.harvestWeekStart.localeCompare(b.harvestWeekStart))
              .map((m) => (
                <Tombol
                  key={m.harvestWeekStart}
                  type="button"
                  ukuran="sm"
                  rupa={m.harvestWeekStart === r.harvestWeekStart ? "utama" : "kedua"}
                  aria-pressed={m.harvestWeekStart === r.harvestWeekStart}
                  onClick={() => setDipilih(m.harvestWeekStart)}
                  className="font-mono"
                >
                  {tanggalPendek(m.harvestWeekStart)}
                </Tombol>
              ))}
          </div>
        </fieldset>
      ) : null}

      {/* Kalimatnya dirakit server supaya angka dan kata selalu berubah bersamaan. */}
      <Prosa className="text-[15px]">{r.sentence}</Prosa>

      <Deret kolom={3} as="dl" className="mt-6">
        <Ubin label="Batas untuk Anda" nilai={angka(r.suggestedKgForYou)} satuan="kg" />
        <Ubin
          label="Sisa waktu tanam"
          nilai={angka(r.daysUntilPlantingDeadline)}
          satuan="hari"
          nada={r.daysUntilPlantingDeadline <= 7 ? "awas" : "netral"}
        />
        <Ubin
          label="Minggu panen"
          nilai={`${tanggalPendek(r.harvestWeekStart)}–${tanggalPendek(r.harvestWeekEnd)}`}
        />
      </Deret>

      {/* Jembatan intelijen → aksi (FR-8.3).
          Tanpa ini rekomendasi berhenti sebagai bacaan: Tenant harus mengetik ulang
          sendiri komoditas, jumlah, harga, dan tanggalnya di layar Buka Kuota — dan
          setiap ketikan ulang adalah peluang angkanya melenceng dari yang disarankan.
          Yang dikirim hanya PENUNJUKNYA, bukan angkanya: form yang menghitung ulang
          lewat endpoint prefill, supaya kejenuhan zona dinilai saat form dibuka. */}
      <TombolTaut
        href={`/tenant/batch/new?zona=${r.zoneId}&komoditas=${r.commodityId}&minggu=${r.harvestWeekStart}`}
        penuh
        className="mt-7 py-3.5"
      >
        Buka kuota untuk minggu ini
      </TombolTaut>
    </Panel>
  );
}

export default function RecommendationPage() {
  const [data, setData] = useState<PlantingRecommendation[]>([]);
  const [terkunci, setTerkunci] = useState(false);
  const [galat, setGalat] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);

  const muat = useCallback(() => {
    setMemuat(true);
    ambilRekomendasi()
      .then((d) => {
        setData(d);
        setTerkunci(false);
      })
      .catch((e) => {
        if (e instanceof GalatApi && e.kode === "SUBSCRIPTION_REQUIRED") setTerkunci(true);
        else setGalat(e instanceof GalatApi ? e.message : "Rekomendasi gagal dimuat");
      })
      .finally(() => setMemuat(false));
  }, []);

  useEffect(muat, [muat]);

  if (memuat) {
    return (
      <Halaman judul="Rekomendasi tanam">
        <Memuat baris={3} label="Memuat rekomendasi" />
      </Halaman>
    );
  }

  if (terkunci) {
    return (
      <Halaman
        lebar="sempit"
        judul="Rekomendasi tanam"
        pengantar="Bagian dari paket Verified. Ia menunjukkan permintaan yang belum tertutup di zona Anda, 8–16 minggu ke depan."
      >
        <Panel nada="utama" label="Paket Verified" judul="Belum aktif untuk akun Anda">
          <Prosa className="text-[15px]">
            Rekomendasi Tanam membaca laju pesanan zona Anda dan menunjukkan komoditas mana yang
            permintaannya belum tertutup, beserta batas yang masuk akal untuk Anda tanam. Tanpa
            paket ini, seluruh fitur lain tetap berjalan seperti biasa.
          </Prosa>
          <Sunyi className="mt-4 max-w-[68ch] text-[13px]">
            Badge verifikasi yang sudah Anda miliki dan batch yang kuotanya sudah terjual tidak
            terpengaruh sama sekali oleh status paket ini.
          </Sunyi>
          <Tombol
            className="mt-7 py-3.5"
            sibuk={proses}
            labelSibuk="Mengaktifkan…"
            onClick={() => {
              setProses(true);
              aktifkanLangganan(1)
                .then(muat)
                .finally(() => setProses(false));
            }}
          >
            Aktifkan paket Verified
          </Tombol>
          {/* Mitra pembayaran belum tersambung — dinyatakan, bukan disamarkan. */}
          <div className="mt-5 border-t-2 border-jambu pt-3">
            <Label className="text-jambu">Mode peragaan</Label>
            <Prosa className="mt-1.5 text-[14px]">
              Aktivasi ini berjalan tanpa pembayaran sungguhan. Mitra pembayaran berizin belum
              tersambung, jadi tidak ada tagihan yang benar-benar diterbitkan.
            </Prosa>
          </div>
        </Panel>
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Rekomendasi tanam">
        <Galat judul="Rekomendasi gagal dimuat">
          {galat} Angka permintaan dihitung ulang tiap kali halaman dibuka — muat ulang untuk
          mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  return <IsiRekomendasi data={data} />;
}

function IsiRekomendasi({ data }: { data: PlantingRecommendation[] }) {
  // Dikelompokkan per zona DAN komoditas: Tenant bisa melayani beberapa zona, dan
  // kekurangan Wortel di Kota Malang bukan kekurangan yang sama dengan di Kota Batu.
  // Urutan kartu mengikuti tenggat tanam terdekat di dalam tiap kelompok.
  const kelompok = useMemo(() => {
    const m = new Map<string, PlantingRecommendation[]>();
    for (const r of data) {
      const k = `${r.zoneId}|${r.commodityId}`;
      const cur = m.get(k);
      if (cur) cur.push(r);
      else m.set(k, [r]);
    }
    return [...m.entries()].sort(
      (a, b) =>
        Math.min(...a[1].map((x) => x.daysUntilPlantingDeadline)) -
        Math.min(...b[1].map((x) => x.daysUntilPlantingDeadline)),
    );
  }, [data]);

  return (
    <Halaman
      judul="Rekomendasi tanam"
      pengantar="Angka permintaan di sini adalah PROYEKSI dari laju pesanan beberapa minggu terakhir — bukan pesanan yang sudah ada di tangan. Musiman dan hari raya belum dimodelkan, jadi perlakukan ia sebagai petunjuk arah, bukan janji."
    >
      {kelompok.length === 0 ? (
        <Kosong
          judul="Belum ada rekomendasi"
          aksi={
            <TombolTaut href="/tenant/batch/new" ukuran="sm">
              Buka kuota sendiri
            </TombolTaut>
          }
        >
          Rekomendasi muncul bila ada permintaan yang belum tertutup di zona Anda dan umur
          tanam komoditasnya masih sempat dikejar. Kosong berarti pasokan zona Anda sedang
          seimbang — itu kabar baik, bukan kegagalan sistem.
        </Kosong>
      ) : (
        <div className="space-y-8">
          {kelompok.map(([kunci, minggu]) => (
            <KartuKomoditas key={kunci} minggu={minggu} />
          ))}
        </div>
      )}
    </Halaman>
  );
}
