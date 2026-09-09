"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SUBSTITUTION_PRICE_GAP_CAP_PCT } from "@agro-os/shared";
import type { AssuranceOption, PendingAssurance, SubstituteOption } from "@agro-os/shared";
import { GalatApi, ambilAssuransiTertunda, putuskanAssuransi } from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Kosong,
  Label,
  Memuat,
  Nilai,
  Panel,
  Prosa,
  Radio,
  Sunyi,
  TautanKembali,
  Tombol,
  TombolTaut,
} from "@/ui";

/**
 * BY-11 — Layar keputusan Harvest Assurance (FR-7.4 & FR-7.10).
 *
 * Muncul saat panen Tenant tidak menutupi seluruh pesanan. Uang berpindah di layar ini, jadi
 * salah tampil berarti salah keputusan — dan dua hal yang dulu salah tampil diperbaiki di
 * sini bersama migrasinya:
 *
 * 1. BATAS 10% DIIMPOR, TIDAK DIKETIK. Angka tanggungan selisih harga substitusi sebelumnya
 *    ditulis "10%" langsung di dua kalimat opsi. Ia aturan yang dijalankan server
 *    (`SUBSTITUTION_PRICE_GAP_CAP_PCT`), dan angka yang menggerakkan uang tidak boleh punya
 *    dua sumber: begitu satu berubah, pembeli menyetujui satu angka dan menerima angka lain.
 *
 * 2. OPSI MATI MENJELASKAN DIRINYA. Empat opsi kini radio sungguhan — kelompok pilihan
 *    tunggal yang memang dibandingkan sebelum diputuskan — dan opsi yang tertutup membawa
 *    alasannya sendiri, karena `Radio` menolak dimatikan tanpa kalimat.
 *
 * Daftarnya berasal dari `GET /assurance/pending` yang cakupannya SELURUH pesanan pembeli,
 * bukan satu pesanan. Disebutkan terang-terangan supaya pembeli tidak mengira daftar ini
 * terbatas pada pesanan yang tadi diklik.
 */
export default function ResolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = React.use(params);

  const [item, setItem] = useState<PendingAssurance[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  // Keputusan yang baru diambil disimpan di sini. Tanpa ini, memuat ulang daftar tertunda
  // langsung menghapus kartunya dari layar — pembeli tidak pernah sempat membaca apa yang
  // terjadi pada uangnya.
  const [selesai, setSelesai] = useState<Array<{ nama: string; pesan: string }>>([]);

  const muat = useCallback(() => {
    setMemuat(true);
    return ambilAssuransiTertunda()
      .then((d) => {
        setItem(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Daftar keputusan gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const kembali = <TautanKembali href={`/buyer/orders/${orderId}`}>Rincian pesanan</TautanKembali>;

  if (memuat && !selesai.length) {
    return (
      <Halaman judul="Penyelesaian panen kurang" kembali={kembali}>
        <Memuat baris={3} label="Memuat daftar keputusan" />
      </Halaman>
    );
  }

  return (
    <Halaman
      kembali={kembali}
      judul="Penyelesaian panen kurang"
      pengantar="Panen tidak menutupi seluruh pesanan Anda. Pilih penyelesaian untuk tiap item — daftar ini mencakup semua pesanan Anda yang menunggu keputusan, bukan hanya pesanan yang tadi Anda buka."
      lebar="sempit"
    >
      {galat ? (
        <Galat judul="Daftar keputusan gagal dimuat" className="mb-8">
          {galat} Porsi yang belum diputuskan tetap tertahan di escrow — tidak ada dana yang
          bergerak selama daftar ini tidak bisa dibuka.
        </Galat>
      ) : null}

      {selesai.length ? (
        <div className="mb-10 space-y-6">
          {selesai.map((s, i) => (
            <Panel key={i} nada="utama" label="Keputusan tercatat" judul={s.nama}>
              <Prosa className="text-[14px]">{s.pesan}</Prosa>
            </Panel>
          ))}
        </div>
      ) : null}

      {item.length === 0 ? (
        selesai.length === 0 ? (
          <Kosong
            judul="Tidak ada yang perlu diputuskan"
            aksi={
              <TombolTaut href={`/buyer/orders/${orderId}`} rupa="kedua" ukuran="sm">
                Kembali ke rincian pesanan
              </TombolTaut>
            }
          >
            Seluruh item pesanan Anda terpenuhi, atau keputusannya sudah diambil. Layar ini
            hanya terisi ketika panen Tenant meleset dari kuota yang sudah Anda bayar — kosong
            di sini berarti tidak ada yang meleset.
          </Kosong>
        ) : (
          <Sunyi>
            Tidak ada item lain yang menunggu keputusan. Dana bergerak sesuai pilihan di atas.
          </Sunyi>
        )
      ) : (
        <div className="space-y-12">
          {item.map((p) => (
            <BlokKeputusan
              key={p.orderItemId}
              p={p}
              onSelesai={async (pesan) => {
                setSelesai((s) => [...s, { nama: p.productName, pesan }]);
                await muat();
              }}
            />
          ))}
        </div>
      )}
    </Halaman>
  );
}

function BlokKeputusan({
  p,
  onSelesai,
}: {
  p: PendingAssurance;
  onSelesai: (pesan: string) => Promise<unknown>;
}) {
  const [pilihan, setPilihan] = useState<AssuranceOption | null>(null);
  const [batchPengganti, setBatchPengganti] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    if (!pilihan) return;
    if (pilihan === "SUBSTITUSI" && !batchPengganti) {
      return setGalat("Pilih produk penggantinya dulu — substitusi tidak bisa dikirim tanpa batch tujuan.");
    }
    setProses(true);
    setGalat("");
    try {
      const r = await putuskanAssuransi(p.orderItemId, {
        option: pilihan,
        ...(pilihan === "SUBSTITUSI" ? { replacementBatchId: batchPengganti } : {}),
      });
      await onSelesai(r.message);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Keputusan gagal disimpan. Coba lagi.");
      setProses(false);
    }
  }

  /** Nilai seluruh baris — yang dikembalikan bila pembeli menolak seluruhnya. */
  const nilaiPenuh = p.qtyBox * p.unitPriceLocked;

  const opsi: Array<{ nilai: AssuranceOption; label: string; jelas: string; nonaktif?: string }> = [
    {
      nilai: "SUBSTITUSI",
      label: "Substitusi",
      // Kalimatnya berbeda ketika cap gugur, karena yang ditanggung Tenant juga berbeda.
      // Menyamakan keduanya membuat pembeli mengira selisih selalu tak terbatas — lalu heran
      // saat substitusi menghilang pada kasus lain.
      jelas: p.capWaived
        ? "Diganti produk setara dari Tenant lain di zona yang sama. Berapa pun selisih harganya ditanggung Tenant yang gagal panen, bukan Anda."
        : `Diganti produk setara dari Tenant lain di zona yang sama. Selisih harga ditanggung Tenant yang gagal panen sampai batas ${SUBSTITUTION_PRICE_GAP_CAP_PCT}% nilai pesanan yang gagal.`,
      ...(p.substitutes.length === 0
        ? { nonaktif: p.substitutionBlockedReason ?? "Tidak ada pengganti yang tersedia di zona ini." }
        : {}),
    },
    {
      nilai: "JADWAL_ULANG",
      label: "Jadwal ulang",
      jelas:
        "Dana tetap ditahan di escrow, pesanan dipindahkan ke siklus panen berikutnya dari Tenant yang sama.",
    },
    {
      nilai: "TERIMA_SEBAGIAN",
      label: "Terima sebagian",
      jelas: `Ambil ${angka(p.allocatedBox)} box yang tersedia, sisanya ${rupiah(p.shortfallValue)} dikembalikan.`,
      // Di bawah minimum zona, "terima sebagian" berarti ongkir satu perjalanan penuh untuk
      // muatan kecil — pembeli perlu tahu sebelum memilihnya (FR-7.10).
      ...(!p.partialMeetsMinimum
        ? {
            nonaktif:
              "Porsi yang tersedia jatuh di bawah nilai minimum pesanan zona ini, jadi ongkir satu perjalanan penuh akan menagih muatan kecil. Pilih refund atau jadwal ulang.",
          }
        : {}),
    },
    {
      nilai: "REFUND",
      label: "Tolak seluruhnya",
      // Bukan "refund porsi yang gagal": server mengembalikan qtyBox × harga dan menyetel
      // qtyBoxFulfilled ke 0, jadi pembeli TIDAK menerima box mana pun — termasuk yang
      // sebenarnya tersedia. Menyebutnya "refund penuh" membuat orang mengira tetap dapat
      // barangnya sekaligus uangnya kembali.
      jelas: `Batalkan seluruh item ini, termasuk ${angka(p.allocatedBox)} box yang sebenarnya tersedia. Anda tidak menerima barang apa pun dan ${rupiah(nilaiPenuh)} dikembalikan.`,
    },
  ];

  return (
    <Panel nada="awas" label={p.tenantName} judul={p.productName}>
      <Deret kolom={3} as="dl">
        <BarisData label="Dipesan">{angka(p.qtyBox)} box</BarisData>
        <BarisData label="Tersedia">{angka(p.allocatedBox)} box</BarisData>
        <BarisData label="Kurang">
          <span className="text-jambu">{angka(p.shortfallBox)} box</span>
        </BarisData>
      </Deret>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-jambu pt-3">
        <Label className="text-jambu">Nilai porsi yang tidak terpenuhi</Label>
        <Nilai ukuran="lg" className="text-jambu">
          {rupiah(p.shortfallValue)}
        </Nilai>
      </div>
      <Sunyi className="mt-2 max-w-[58ch] text-[13px]">
        Inilah yang Anda putuskan nasibnya. Uangnya masih ada di escrow dan belum berpindah ke
        siapa pun.
      </Sunyi>

      {/* BY-11e — alasan substitusi tertutup TIDAK lagi diulang di panel tersendiri di atas
          daftar opsi. Kalimat yang sama pernah muncul dua kali di layar yang sama: sekali
          sebagai panel "mengapa", sekali di bawah opsi matinya. Sekarang ia tinggal di
          tempat orang benar-benar menabraknya — pada opsi yang tidak bisa dipilih — dan
          `Radio` menolak dimatikan tanpa kalimat itu, jadi ia tidak bisa hilang. */}

      {/* Cap gugur berarti Tenant menanggung selisih penuh — pembeli perlu tahu bahwa
          substitusi tetap terbuka berapa pun harga penggantinya. */}
      {p.capWaived && p.substitutes.length > 0 ? (
        <div className="mt-7 border-t-2 border-ungu pt-3">
          <Label className="text-ungu">Batas tanggungan gugur</Label>
          <Prosa className="mt-1.5 text-[14px]">
            Untuk pesanan ini batas {SUBSTITUTION_PRICE_GAP_CAP_PCT}% tidak berlaku: seluruh
            selisih harga pengganti menjadi tanggungan Tenant. Anda tidak menambah pembayaran
            apa pun, berapa pun harga batch penggantinya.
          </Prosa>
        </div>
      ) : null}

      <fieldset className="mt-8">
        <legend className="mb-3">
          <Label>Pilih penyelesaian</Label>
        </legend>
        <div className="space-y-2">
          {opsi.map((o) => (
            <Radio
              key={o.nilai}
              nama={`penyelesaian-${p.orderItemId}`}
              nilai={o.nilai}
              terpilih={pilihan === o.nilai}
              onPilih={(v) => setPilihan(v as AssuranceOption)}
              judul={o.label}
              nonaktif={o.nonaktif}
            >
              {o.jelas}
            </Radio>
          ))}
        </div>
      </fieldset>

      {pilihan === "SUBSTITUSI" && p.substitutes.length > 0 ? (
        <fieldset className="mt-7">
          <legend className="mb-3">
            <Label>Produk pengganti</Label>
          </legend>
          <div className="space-y-2">
            {p.substitutes.map((s: SubstituteOption) => (
              <Radio
                key={s.batchId}
                nama={`pengganti-${p.orderItemId}`}
                nilai={s.batchId}
                terpilih={batchPengganti === s.batchId}
                onPilih={setBatchPengganti}
                judul={
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span>{s.productName}</span>
                    <span className="font-mono font-normal">{rupiah(s.lockedPrice)}</span>
                  </span>
                }
              >
                {s.tenantName} · panen {tanggalPanjang(s.claimedHarvestDate)} · tersedia{" "}
                {angka(s.availableBox)} box
                {s.priceGapBorneByTenant > 0 ? (
                  <span className="mt-1 block text-ungu">
                    Selisih {rupiah(s.priceGapBorneByTenant)} ditanggung Tenant yang gagal panen.
                  </span>
                ) : null}
              </Radio>
            ))}
          </div>
        </fieldset>
      ) : null}

      {galat ? (
        <Galat judul="Keputusan tidak tersimpan" className="mt-6">
          {galat}
        </Galat>
      ) : null}

      <Tombol
        penuh
        className="mt-7"
        disabled={!pilihan}
        sibuk={proses}
        labelSibuk="Menyimpan keputusan…"
        onClick={kirim}
      >
        Konfirmasi pilihan
      </Tombol>
      <Sunyi className="mt-2.5 text-center text-[12px]">
        Keputusan ini final dan langsung menggerakkan dana di escrow.
      </Sunyi>
    </Panel>
  );
}
