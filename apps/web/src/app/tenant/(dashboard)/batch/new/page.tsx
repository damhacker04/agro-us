"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  LandPlotCapacityResponse,
  LandPlotResponse,
  OpenQuotaPrefill,
  ProductResponse,
} from "@agro-os/shared";
import {
  GalatApi,
  ambilKapasitasLahan,
  ambilLahan,
  ambilPrefillKuota,
  ambilProdukTenant,
  bukaKuota,
} from "@/lib/api";
import { angka, desimal, rupiah } from "@/lib/format-id";
import {
  Galat,
  Halaman,
  Kosong,
  Label,
  Masukan,
  Medan,
  Memuat,
  Panel,
  Pilihan,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
  TombolTaut,
} from "@/ui";

/**
 * TN-16 — Buka Kuota Pre-Order (FR-3.3/3.4).
 *
 * Batas kuota dihitung server dari luas lahan × rendemen komoditas × pengali reputasi,
 * dan diambil SEBELUM Tenant mengetik jumlahnya. Menampilkannya lebih dulu membuat batas
 * itu terbaca sebagai informasi; kalau baru muncul setelah formulir dikirim, yang sama
 * persis terbaca sebagai penolakan.
 *
 * MIGRASI DUNIA. Dua hal yang berubah selain rupa:
 *
 * 1. ANGKA RUMUS KAPASITAS LEWAT `format-id`. Rumusnya sebelumnya memakai
 *    `toLocaleString("id-ID")` dan `toFixed(2)` — yang pertama bergantung pada data ICU
 *    runtime dan berbeda antara server dan peramban, yang kedua mencetak titik desimal
 *    pada angka Indonesia. Keduanya persis kegagalan yang sudah dicatat di MIGRASI.md.
 *
 * 2. KEADAAN KOSONG BERHENTI JADI PERINGATAN. "Belum ada produk" dan "belum ada lahan"
 *    dulu tampil sebagai kotak amber — rupa yang sama dengan kesalahan. Keduanya bukan
 *    kesalahan: itu urutan kerja yang wajar bagi Tenant yang baru mulai, dan yang mereka
 *    butuhkan adalah pintu menuju langkah sebelumnya, bukan tanda seru.
 */
function FormBukaKuota() {
  const router = useRouter();
  const sp = useSearchParams();

  // Penunjuk dari kartu Rekomendasi Tanam. Yang dibawa hanya identitasnya —
  // angkanya dihitung ulang di server lewat prefill, karena kejenuhan zona bisa
  // berubah antara Tenant membaca kartu dan membuka form ini.
  const zonaRek = sp.get("zona");
  const komoditasRek = sp.get("komoditas");
  const mingguRek = sp.get("minggu");
  const dariRekomendasi = Boolean(zonaRek && komoditasRek && mingguRek);

  const [prefill, setPrefill] = useState<OpenQuotaPrefill | null>(null);
  const [galatPrefill, setGalatPrefill] = useState("");

  const [produk, setProduk] = useState<ProductResponse[]>([]);
  const [lahan, setLahan] = useState<LandPlotResponse[]>([]);
  const [productId, setProductId] = useState("");
  const [landPlotId, setLandPlotId] = useState("");
  const [kuota, setKuota] = useState("");
  const [harga, setHarga] = useState("");
  const [panen, setPanen] = useState("");
  const [tanam, setTanam] = useState("");

  const [kapasitas, setKapasitas] = useState<LandPlotCapacityResponse | null>(null);
  const [galatKapasitas, setGalatKapasitas] = useState("");
  /** Petak yang sudah pernah dicoba otomatis — penjaga agar pemindahan tidak berputar. */
  const dicoba = useRef<Set<string>>(new Set());
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    const dasar = Promise.all([ambilProdukTenant(), ambilLahan()]);
    // Prefill-nya OPSIONAL: kegagalannya tidak boleh mengosongkan form. Tenant tetap
    // harus bisa membuka kuota manual meski rekomendasinya sudah basi.
    const tambahan = dariRekomendasi
      ? ambilPrefillKuota(zonaRek!, komoditasRek!, mingguRek!).catch((e) => {
          setGalatPrefill(
            e instanceof GalatApi ? e.message : "Rekomendasi tidak bisa dimuat ulang.",
          );
          return null;
        })
      : Promise.resolve(null);

    Promise.all([dasar, tambahan])
      .then(([[p, l], pre]) => {
        setProduk(p);
        setLahan(l);
        setPrefill(pre);

        // Produk dipilih berdasarkan KOMODITAS rekomendasinya. Memilih produk pertama
        // begitu saja akan membuka kuota untuk komoditas yang sama sekali berbeda dari
        // yang disarankan — dan angkanya tetap terisi, jadi kekeliruannya tidak terlihat.
        const cocok = pre ? p.find((x) => x.commodity.id === pre.commodityId) : undefined;
        const terpilih = cocok ?? (pre ? undefined : p[0]);

        if (terpilih) {
          setProductId(terpilih.id);
          setHarga(String(pre?.suggestedLockedPrice ?? terpilih.pricePerBox));
          setPanen(pre?.suggestedHarvestDate ?? terpilih.estHarvestDate.slice(0, 10));
        }
        if (pre) setKuota(String(pre.suggestedQuotaBox));
        if (l[0]) setLandPlotId(l[0].id);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Data gagal dimuat"))
      .finally(() => setMemuat(false));
  }, [dariRekomendasi, zonaRek, komoditasRek, mingguRek]);

  const p = produk.find((x) => x.id === productId);

  useEffect(() => {
    if (!landPlotId || !p) return setKapasitas(null);
    setGalatKapasitas("");
    ambilKapasitasLahan(landPlotId, p.commodity.id, p.qtyKgPerBox)
      .then((k) => {
        // Ketersediaan petak baru diketahui SETELAH ditanyakan ke server, jadi petak
        // bawaan bisa saja yang sudah terpakai — dan Tenant mendarat di form dengan
        // tombol simpan mati tanpa melakukan apa pun yang salah. Pindah ke petak
        // berikutnya yang belum dicoba; `dicoba` mencegahnya berputar terus saat SEMUA
        // petak memang terpakai, sehingga pesannya tetap terbaca.
        //
        // YANG DITANDAI ADALAH PETAK YANG BARUSAN DICOBA, bukan petak tujuannya. Versi
        // sebelumnya menandai tujuannya, dan `lahan.find` tidak mengecualikan petak yang
        // sedang dipilih — jadi pada pemanggilan pertama ia menemukan petak itu sendiri,
        // memanggil `setLandPlotId` dengan nilai yang sama, dan React membatalkan render.
        // Efeknya tidak pernah berjalan lagi: `kapasitas` tetap null, batas kuota tidak
        // pernah tampil, peringatan "petak terpakai" tidak pernah muncul, dan tombol
        // simpannya tetap hidup. Tenant baru tahu petaknya terpakai dari penolakan server
        // setelah formulir dikirim — persis kebalikan dari alasan layar ini mengambil
        // kapasitas lebih dulu. Terlihat pada Tenant yang SEMUA petaknya sedang dipakai.
        if (!k.available) {
          dicoba.current.add(landPlotId);
          const berikut = lahan.find((l) => !dicoba.current.has(l.id));
          if (berikut) {
            setLandPlotId(berikut.id);
            return;
          }
        }
        setKapasitas(k);
      })
      .catch(() => {
        setKapasitas(null);
        setGalatKapasitas(
          "Batas kuota petak ini belum bisa diambil. Anda tetap bisa mengisi formulirnya — server memeriksa batasnya sekali lagi saat disimpan.",
        );
      });
  }, [landPlotId, p, lahan]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat("");
    try {
      const b = await bukaKuota(productId, {
        landPlotId,
        quotaBoxTotal: Number(kuota),
        lockedPrice: Number(harga),
        claimedHarvestDate: panen,
        ...(tanam ? { claimedPlantDate: tanam } : {}),
      });
      router.push(`/tenant/batch/${b.id}`);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Kuota gagal dibuka.");
      setProses(false);
    }
  }

  const kembali = <TautanKembali href="/tenant/batch">Daftar batch</TautanKembali>;

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Buka kuota Pre-Order" kembali={kembali}>
        <Memuat baris={4} label="Memuat produk dan lahan" />
      </Halaman>
    );
  }

  // Bukan kesalahan, melainkan langkah sebelumnya yang belum dikerjakan.
  if (produk.length === 0 || lahan.length === 0) {
    const perluProduk = produk.length === 0;
    return (
      <Halaman lebar="sempit" judul="Buka kuota Pre-Order" kembali={kembali}>
        <Kosong
          judul={perluProduk ? "Belum ada produk" : "Belum ada lahan terpetakan"}
          aksi={
            <TombolTaut href={perluProduk ? "/tenant/catalog/edit" : "/tenant/land/mapping"} ukuran="sm">
              {perluProduk ? "Tambah produk" : "Petakan lahan"}
            </TombolTaut>
          }
        >
          {perluProduk
            ? "Kuota dibuka atas sebuah produk — nama, grade, dan isi per box-nya berasal dari sana. Buat produknya dulu, lalu kembali ke layar ini."
            : "Batas kuota dihitung dari luas petak yang poligonnya sudah tersimpan, jadi petaknya harus ada lebih dulu. Petakan lahan Anda, lalu ia muncul sebagai pilihan di sini."}
        </Kosong>
      </Halaman>
    );
  }

  const melebihi = kapasitas && Number(kuota) > kapasitas.maxQuotaBox;
  const lahanTerpakai = kapasitas && !kapasitas.available;
  const adaProdukRekomendasi =
    !prefill || produk.some((x) => x.commodity.id === prefill.commodityId);

  return (
    <Halaman
      lebar="sempit"
      kembali={kembali}
      judul="Buka kuota Pre-Order"
      pengantar="Harga yang Anda kunci di sini berlaku sampai panen dan tidak bisa diubah setelah ada yang memesan. Itulah yang membuat pembeli bersedia membayar di muka."
    >
      {galatPrefill ? (
        <div className="mb-8 border-t-2 border-biru pt-3">
          <Label className="text-biru">Rekomendasi tidak termuat</Label>
          <Prosa className="mt-1.5 text-[14px]">
            {galatPrefill} Formulir tetap bisa diisi manual — angkanya saja yang tidak terisi
            sendiri.
          </Prosa>
        </div>
      ) : null}

      {prefill ? (
        <Panel
          nada="utama"
          label={`Dari rekomendasi tanam · ${prefill.commodityName}`}
          judul="Angka di bawah adalah saran, bukan kunci"
          className="mb-8"
        >
          <Prosa className="text-[14px]">
            Ubah sesukanya sebelum menyimpan.
            {prefill.coveragePct !== null ? (
              <>
                {" "}
                Pasokan zona kini{" "}
                <span className="font-mono text-tinta">{prefill.coveragePct}%</span> dari
                perkiraan permintaan.
              </>
            ) : null}
          </Prosa>

          {/* Peringatan ini dihitung ULANG server saat form dibuka, bukan disalin dari
              kartu. Justru di sinilah gunanya: Tenant yang menunda beberapa hari sebelum
              menekan tombol perlu tahu pasarnya sudah berubah. */}
          {prefill.warning ? (
            <div className="mt-5 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">Pasar berubah sejak kartu itu tampil</Label>
              <Prosa className="mt-1.5 text-[14px]">{prefill.warning}</Prosa>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {/* Rekomendasi menyebut KOMODITAS, sedangkan kuota dibuka atas sebuah PRODUK.
          Kalau Tenant belum punya produk untuk komoditas itu, jalannya buntu di sini —
          jadi ditunjukkan jalan keluarnya, bukan sekadar dropdown berisi komoditas lain. */}
      {prefill && !adaProdukRekomendasi ? (
        <Panel
          nada="kabar"
          label="Satu langkah lagi"
          judul={`Anda belum punya produk ${prefill.commodityName}`}
          className="mb-8"
        >
          <Prosa className="text-[14px]">
            Kuota dibuka atas sebuah produk, jadi produknya dibuat lebih dulu. Isi box{" "}
            <span className="font-mono text-tinta">{prefill.suggestedQtyKgPerBox} kg</span> dan
            harga <span className="font-mono text-tinta">{rupiah(prefill.suggestedLockedPrice)}</span>
            /box mengikuti kebiasaan zona ini.
          </Prosa>
          <TombolTaut
            href={`/tenant/catalog/edit?komoditas=${prefill.commodityId}&kgBox=${prefill.suggestedQtyKgPerBox}&harga=${prefill.suggestedLockedPrice}&panen=${prefill.suggestedHarvestDate}`}
            ukuran="sm"
            className="mt-5"
          >
            Buat produk {prefill.commodityName}
          </TombolTaut>
        </Panel>
      ) : null}

      <form onSubmit={simpan}>
        <Panel label="Dasar kuota" judul="Produk dan petak lahannya">
          <div className="grid gap-5 sm:grid-cols-2">
            <Medan label="Produk" wajib>
              {(alat) => (
                <Pilihan
                  {...alat}
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const baru = produk.find((x) => x.id === e.target.value);
                    if (baru) {
                      setHarga(String(baru.pricePerBox));
                      setPanen(baru.estHarvestDate.slice(0, 10));
                    }
                  }}
                >
                  {produk.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — Grade {x.grade} ({x.qtyKgPerBox} kg/box)
                    </option>
                  ))}
                </Pilihan>
              )}
            </Medan>

            <Medan label="Petak lahan" wajib>
              {(alat) => (
                <Pilihan {...alat} value={landPlotId} onChange={(e) => setLandPlotId(e.target.value)}>
                  {lahan.map((l, i) => (
                    <option key={l.id} value={l.id}>
                      Petak {i + 1} — {desimal(l.areaHa, 2)} ha
                      {l.verificationTier === "TERBATAS" ? " (verifikasi terbatas)" : ""}
                    </option>
                  ))}
                </Pilihan>
              )}
            </Medan>
          </div>

          {lahanTerpakai ? (
            <div className="mt-6 border-t-2 border-jambu pt-3">
              <Label className="text-jambu">Petak ini masih terpakai</Label>
              <Prosa className="mt-1.5 text-[14px]">
                Satu petak hanya boleh menampung satu batch aktif, supaya kuota yang dijanjikan
                ke pembeli tidak dihitung dua kali dari lahan yang sama. Pilih petak lain, atau
                tutup batch lamanya dulu.
              </Prosa>
            </div>
          ) : null}

          {/* Batas kuota ditampilkan SEBELUM angkanya diketik, berikut seluruh aritmetikanya:
              batas yang muncul tanpa cara memeriksanya terbaca sebagai keputusan sepihak. */}
          {kapasitas && !lahanTerpakai ? (
            <div className="mt-6 border-t-2 border-tinta pt-3">
              <Label>Batas kuota petak ini</Label>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-[26px] leading-none text-tinta">
                  {angka(kapasitas.maxQuotaBox)}
                </span>
                <span className="text-[13px] text-tinta-samar">box</span>
              </div>
              <p className="mt-2.5 max-w-[58ch] font-mono text-[12px] leading-relaxed text-tinta-samar">
                {desimal(kapasitas.areaHa, 2)} ha × {angka(kapasitas.avgYieldKgPerHa)} kg/ha ÷{" "}
                {angka(kapasitas.qtyKgPerBox)} kg/box × pengali{" "}
                {desimal(kapasitas.quotaMultiplier, 2)}
              </p>
              {/* Luas di rumus ini adalah luas EFEKTIF, dan hampir selalu lebih kecil dari
                  luas petak di daftar pilihan sebelahnya. Tanpa keterangan ini, dua angka
                  luas berbeda untuk petak yang sama terbaca sebagai salah hitung. */}
              {Math.abs(kapasitas.areaHa - (lahan.find((l) => l.id === landPlotId)?.areaHa ?? kapasitas.areaHa)) > 0.005 ? (
                <Sunyi className="mt-2 max-w-[58ch] text-[12px]">
                  Luas yang dipakai adalah luas efektif tanam — lebih kecil dari luas petak
                  karena batas, jalan kerja, dan saluran air tidak ikut dihitung.
                </Sunyi>
              ) : null}
            </div>
          ) : null}

          {galatKapasitas ? (
            <div className="mt-6 border-t-2 border-biru pt-3">
              <Label className="text-biru">Batas kuota belum termuat</Label>
              <Prosa className="mt-1.5 text-[14px]">{galatKapasitas}</Prosa>
            </div>
          ) : null}
        </Panel>

        <Panel label="Ketentuan" judul="Yang dikunci sampai panen" className="mt-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Medan
              label="Jumlah kuota"
              petunjuk={
                kapasitas ? `Paling banyak ${angka(kapasitas.maxQuotaBox)} box untuk petak ini.` : undefined
              }
              galat={
                melebihi
                  ? `Melebihi batas ${angka(kapasitas!.maxQuotaBox)} box — server akan menolaknya. Turunkan jumlahnya, atau pilih petak yang lebih luas.`
                  : undefined
              }
              wajib
            >
              {(alat) => (
                <Masukan
                  {...alat}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={kapasitas?.maxQuotaBox}
                  value={kuota}
                  onChange={(e) => setKuota(e.target.value)}
                  placeholder="150"
                  className="font-mono"
                />
              )}
            </Medan>

            <Medan label="Harga terkunci per box" petunjuk="Dalam rupiah, tanpa titik." wajib>
              {(alat) => (
                <Masukan
                  {...alat}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  placeholder="145000"
                  className="font-mono"
                />
              )}
            </Medan>

            <Medan label="Tanggal panen" petunjuk="Yang dijanjikan ke pembeli." wajib>
              {(alat) => (
                <Masukan
                  {...alat}
                  type="date"
                  value={panen}
                  onChange={(e) => setPanen(e.target.value)}
                  className="font-mono"
                />
              )}
            </Medan>

            <Medan
              label="Tanggal tanam"
              petunjuk="Opsional. Mengisinya memberi satelit titik awal untuk membandingkan kurva vegetasi."
            >
              {(alat) => (
                <Masukan
                  {...alat}
                  type="date"
                  value={tanam}
                  onChange={(e) => setTanam(e.target.value)}
                  className="font-mono"
                />
              )}
            </Medan>
          </div>

          {p && Number(harga) > 0 && Number(kuota) > 0 ? (
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-tinta pt-3">
              <Label>Nilai kuota penuh</Label>
              <span className="font-mono text-[22px] leading-none text-tinta">
                {rupiah(Number(harga) * Number(kuota))}
              </span>
            </div>
          ) : null}
          <Sunyi className="mt-2 max-w-[68ch] text-[13px]">
            Angka itu berlaku bila seluruh kuota terjual. Yang benar-benar masuk escrow adalah
            yang dipesan pembeli, dan dananya baru berpindah setelah barang diterima.
          </Sunyi>
        </Panel>

        {galat ? (
          <Galat judul="Kuota belum dibuka" className="mt-8">
            {galat}
          </Galat>
        ) : null}

        <Tombol
          type="submit"
          penuh
          className="mt-8 py-4 text-[16px]"
          sibuk={proses}
          labelSibuk="Membuka kuota…"
          disabled={Boolean(lahanTerpakai)}
        >
          Buka kuota
        </Tombol>
      </form>
    </Halaman>
  );
}

export default function OpenQuotaPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit" judul="Buka kuota Pre-Order">
          <Memuat baris={4} label="Memuat formulir" />
        </Halaman>
      }
    >
      <FormBukaKuota />
    </Suspense>
  );
}
