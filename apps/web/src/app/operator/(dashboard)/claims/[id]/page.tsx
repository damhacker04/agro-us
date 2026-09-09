"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClaimResponse } from "@agro-os/shared";
import { GalatApi, ambilAntreanKlaim, putuskanKlaim } from "@/lib/api";
import { desimal, jamWib, rupiah, tanggalPanjang } from "@/lib/format-id";
import { FotoPutusan } from "@/components/foto-bukti";
import {
  AreaTeks,
  Deret,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
  Ubin,
} from "@/ui";

type Antrean = ClaimResponse & { overdue: boolean };

/**
 * OP-05b — Putusan klaim mutu.
 *
 * Layar ini memindahkan uang dari escrow Tenant ke pembeli, dan putusannya dibaca KEDUANYA.
 * Karena itu urutannya dipertahankan dan dikuatkan: bukti pembeli lebih dulu, perhitungan
 * sistem berikutnya, baru kotak putusan — angka tidak boleh dibaca sebelum dasarnya.
 *
 * MIGRASI DUNIA, dengan dua penguatan yang bukan soal rupa:
 *
 * 1. AKIBAT PUTUSAN DIHITUNG DI DEPAN MATA. Nilai yang diketik langsung diterjemahkan jadi
 *    dua kalimat: berapa yang dipotong dari Tenant, dan berapa yang diterima pembeli.
 *    Peringatan datang sebelum konsekuensi, dan di sini konsekuensinya adalah uang orang.
 *
 * 2. FOTO YANG GAGAL DIMUAT DINYATAKAN SEBAGAI PENGHALANG. Foto klaim adalah dasar putusan;
 *    `<img>` yang diam-diam 404 berarti operator memutus tanpa melihat buktinya, dan tidak
 *    ada apa pun di layar lama yang memberitahunya.
 */
export default function OperatorClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [klaim, setKlaim] = useState<Antrean | null>(null);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatNilai, setGalatNilai] = useState("");
  const [galatCatatan, setGalatCatatan] = useState("");

  useEffect(() => {
    // Tidak ada GET /operator/claims/:id — yang tersedia hanya antreannya, jadi
    // klaim dicari dari daftar itu. Konsekuensinya klaim yang SUDAH diputus tidak
    // bisa dibuka lagi lewat halaman ini.
    ambilAntreanKlaim()
      .then((d) => {
        const c = d.find((x) => x.id === id) ?? null;
        setKlaim(c);
        if (c) setNilai(String(c.claimValue));
        setGalat(c ? "" : "Klaim ini tidak ada di antrean — kemungkinan sudah diputus operator lain.");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Klaim gagal dimuat"))
      .finally(() => setMemuat(false));
  }, [id]);

  async function putuskan() {
    if (!klaim) return;
    const angka = Number(nilai);
    setGalatNilai("");
    setGalatCatatan("");

    if (nilai.trim() === "" || Number.isNaN(angka) || angka < 0) {
      return setGalatNilai("Isi nilai yang disetujui sebagai angka rupiah. Isi 0 untuk menolak klaim.");
    }
    if (angka > klaim.claimValue) {
      return setGalatNilai(
        `Tidak boleh melebihi nilai klaim ${rupiah(klaim.claimValue)} — server menolaknya.`,
      );
    }
    if (catatan.trim().length < 10) {
      return setGalatCatatan(
        "Alasan putusan minimal 10 karakter. Kalimat ini dibaca pembeli maupun Tenant, dan ia satu-satunya penjelasan yang mereka terima.",
      );
    }

    setProses(true);
    setGalat("");
    try {
      await putuskanKlaim(klaim.id, angka, catatan.trim());
      router.push("/operator/claims");
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Putusan gagal disimpan.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/operator/claims">Antrean klaim</TautanKembali>;

  if (memuat) {
    return (
      <Halaman judul="Putusan klaim" kembali={kembali}>
        <Memuat baris={4} label="Memuat klaim" />
      </Halaman>
    );
  }

  if (!klaim) {
    return (
      <Halaman judul="Putusan klaim" kembali={kembali}>
        <Galat judul="Klaim tidak ada di antrean">
          {galat} Antrean hanya memuat klaim yang belum diputus; yang sudah diputus tidak bisa
          dibuka kembali dari sini.
        </Galat>
      </Halaman>
    );
  }

  const disetujui = Number(nilai);
  const sahDihitung = nilai.trim() !== "" && !Number.isNaN(disetujui) && disetujui >= 0;
  const ditolakPenuh = sahDihitung && disetujui === 0;

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul={klaim.productName}
      pengantar={`Diajukan ${tanggalPanjang(klaim.createdAt)} · ${jamWib(klaim.createdAt)} WIB`}
      aksi={klaim.overdue ? <Pil nada="awas">Lewat SLA</Pil> : null}
    >
      {/* Bukti pembeli — dasar putusan, jadi ditaruh sebelum angkanya. */}
      <Panel label="Dasar putusan" judul="Bukti dari pembeli">
        <Prosa className="text-[15px]">{klaim.description}</Prosa>
        {klaim.photoUrl ? (
          <div className="mt-6">
            <FotoPutusan url={klaim.photoUrl} alt="Foto kondisi barang saat diterima pembeli" />
          </div>
        ) : (
          <div className="mt-6 border-t-2 border-jambu pt-3">
            <Label className="text-jambu">Tanpa foto</Label>
            <Prosa className="mt-1.5 text-[14px]">
              Klaim ini diajukan tanpa foto. Angka timbangan sendirian tidak menunjukkan
              kondisi barang — pertimbangkan meminta bukti tambahan sebelum memutus.
            </Prosa>
          </div>
        )}
      </Panel>

      <Panel label="Perhitungan sistem" judul="Dari mana angkanya berasal" className="mt-8">
        <Deret kolom={4} as="dl">
          <Ubin label="Seharusnya" nilai={desimal(klaim.expectedKg, 1)} satuan="kg" />
          <Ubin label="Hasil timbang" nilai={desimal(klaim.actualWeightKg, 1)} satuan="kg" />
          <Ubin label="Selisih kotor" nilai={desimal(klaim.shortfallKg, 1)} satuan="kg" />
          <Ubin
            label={`Toleransi ${desimal(klaim.shrinkTolerancePct, 0)}%`}
            nilai={desimal(klaim.toleratedKg, 1)}
            satuan="kg"
          />
        </Deret>

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-tinta pt-3">
          <Label>Bisa diklaim</Label>
          <span className="font-mono text-[22px] leading-none text-tinta">
            {desimal(klaim.claimableKg, 1)} kg · {rupiah(klaim.claimValue)}
          </span>
        </div>
        <Sunyi className="mt-2 max-w-[68ch] text-[13px]">
          Setara {desimal(klaim.pctOfOrder, 0)}% nilai pesanan — itulah yang membuat klaim ini
          sampai ke meja Anda alih-alih dipotong otomatis.
        </Sunyi>
      </Panel>

      <Panel nada="awas" label="Putusan" judul="Yang akan terjadi pada uangnya" className="mt-8">
        <Medan
          label="Nilai disetujui"
          petunjuk={`Dalam rupiah, paling banyak ${rupiah(klaim.claimValue)}. Isi 0 untuk menolak klaim.`}
          galat={galatNilai || undefined}
          wajib
        >
          {(alat) => (
            <Masukan
              {...alat}
              type="number"
              inputMode="numeric"
              min={0}
              max={klaim.claimValue}
              value={nilai}
              onChange={(e) => {
                setNilai(e.target.value);
                setGalatNilai("");
              }}
              className="font-mono"
            />
          )}
        </Medan>

        {/* Akibatnya dihitung di depan mata, sebelum tombolnya ditekan. */}
        {sahDihitung && disetujui <= klaim.claimValue ? (
          <div className="mt-6 border-t-2 border-tinta pt-3">
            <Label>Akibat putusan ini</Label>
            {ditolakPenuh ? (
              <Prosa className="mt-1.5 text-[14px]">
                Klaim ditolak seluruhnya. Tidak ada dana yang dipotong dari Tenant, dan pembeli
                tidak menerima pengembalian apa pun atas klaim ini.
              </Prosa>
            ) : (
              <Prosa className="mt-1.5 text-[14px]">
                <span className="font-mono text-tinta">{rupiah(disetujui)}</span> dipotong dari
                escrow Tenant dan dikembalikan kepada pembeli
                {disetujui < klaim.claimValue ? (
                  <>
                    ; sisanya{" "}
                    <span className="font-mono text-tinta">
                      {rupiah(klaim.claimValue - disetujui)}
                    </span>{" "}
                    tetap menjadi hak Tenant
                  </>
                ) : null}
                . Putusan ini final dan langsung menggerakkan dana.
              </Prosa>
            )}
          </div>
        ) : null}

        <Medan
          label="Alasan putusan"
          petunjuk="Dibaca pembeli maupun Tenant, dan ia satu-satunya penjelasan yang mereka terima."
          galat={galatCatatan || undefined}
          wajib
          className="mt-6"
        >
          {(alat) => (
            <AreaTeks
              {...alat}
              rows={3}
              minLength={10}
              maxLength={500}
              value={catatan}
              onChange={(e) => {
                setCatatan(e.target.value);
                setGalatCatatan("");
              }}
              placeholder="Foto menunjukkan sepertiga isi krat layu; selisih timbang konsisten dengan kondisi itu."
            />
          )}
        </Medan>
        <Sunyi className="mt-1.5 text-right font-mono text-[12px]">{catatan.length}/500</Sunyi>

        {galat ? (
          <Galat judul="Putusan belum tersimpan" className="mt-6">
            {galat}
          </Galat>
        ) : null}

        <Tombol
          penuh
          className="mt-7 py-4 text-[16px]"
          sibuk={proses}
          labelSibuk="Menyimpan putusan…"
          onClick={putuskan}
        >
          Simpan putusan
        </Tombol>
      </Panel>
    </Halaman>
  );
}
