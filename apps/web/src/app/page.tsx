import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CLAIM_AUTO_SETTLE_MAX_PCT,
  COURIER_PIN_MAX_ATTEMPTS,
  GEOFENCE_RADIUS_M,
  MAX_PLAUSIBLE_JUMP_M,
  MAX_PLAUSIBLE_SPEED_KMH,
  PRENOTIFY_RADIUS_M,
  QUOTA_MULTIPLIER_NORMAL,
} from "@agro-os/shared";
import { BarisAturan, KepalaBagian } from "@/components/bagian";
import { Guilloche } from "@/components/guilloche";
import { KurvaNdvi } from "@/components/kurva-ndvi";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import {
  CAKUPAN,
  DERET_NDVI,
  EFISIENSI,
  MUTU_GRADE,
  PERAN,
  RANTAI,
  SCENE,
  SERTIFIKAT,
} from "@/lib/sertifikat";

/**
 * Landing page AgroUs — dunia visual "Label Sertifikasi".
 *
 * Kontrak arahnya ada di `layout.tsx` sebagai komentar HTML yang bertahan di markup build.
 *
 * SUSUNAN halaman mengikuti empat hal yang deskripsi temanya minta ditingkatkan: efisiensi
 * rantai pasok, transparansi distribusi, kualitas produk, dan keamanan produk. Kata-katanya
 * tidak pernah disalin ke halaman — yang ditiru struktur jawabannya, supaya pembaca yang
 * memegang kriteria itu menemukan jawabannya tanpa mencari.
 *
 * Verifikasi satelit BUKAN salah satu dari empat: ia mekanisme yang membuat keempatnya bisa
 * dijanjikan, jadi ia berdiri lebih dulu.
 *
 * Aturan yang mengikat isi: setiap angka berasal dari basis data produksi
 * (`lib/sertifikat.ts`), dari scene Sentinel-2 yang benar-benar ditarik, atau diimpor
 * langsung dari `@agro-os/shared` supaya tidak bisa melenceng dari aturan yang benar-benar
 * dijalankan server. Tidak ada pelanggan, testimoni, logo mitra, atau metrik penggunaan.
 */

const layak = DERET_NDVI.filter((d) => d.ndvi !== null).length;
const tertutup = DERET_NDVI.length - layak;
const kurang = SERTIFIKAT.kuota.terjual - SERTIFIKAT.kuota.terpenuhi;

/** Catatan kaki yang menempel pada fakta yang dikualifikasinya, bukan berdiri sendiri. */
function Dagger({ n, judul }: { n: 1 | 2; judul: string }) {
  return (
    <sup className="ml-1 font-mono text-[11px] text-stempel" title={judul}>
      {"†".repeat(n)}
    </sup>
  );
}

function Kolom({
  nomor,
  label,
  children,
}: {
  nomor: string;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="baris-data">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-tinta-samar">{nomor}</span>
        <span className="text-[10px] font-semibold uppercase tracking-cap text-tinta-samar">{label}</span>
      </div>
      <div className="font-mono text-[15px] leading-snug text-tinta">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="kertas-sekuriti min-h-screen bg-kertas font-sertifikat text-tinta">
      {/* ======================= SERTIFIKAT ======================= */}
      <section className="relative overflow-hidden border-b-2 border-tinta">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[22%] top-1/2 hidden w-[85vh] -translate-y-1/2 text-ungu opacity-[0.42] md:block"
        >
          <Guilloche />
        </div>

        <div className="relative mx-auto grid max-w-[1180px] gap-y-12 px-6 py-10 md:px-10 md:py-14">
          <header className="flex flex-wrap items-center justify-between gap-6 border-b border-tinta pb-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <span className="text-[19px] font-bold tracking-[0.02em]">AgroUs</span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-cap text-tinta-samar">
              Malang Raya · cabai, bawang, umbi
            </p>
          </header>

          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="max-w-[26ch]">
              <h1
                className="text-balance text-[clamp(2.4rem,5.6vw,4.25rem)] font-extrabold leading-[0.94] tracking-[-0.035em]"
                style={{ fontStretch: "112%" }}
              >
                Sertifikat untuk panen yang belum ada.
              </h1>
            </div>
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-tinta-lembut md:text-right">
              Pembeli mengunci pasokan berbulan-bulan sebelum barangnya tumbuh. Halaman ini
              satu contoh nyata dari produksi — lengkap dengan bagian yang gagal.
            </p>
          </div>

          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <Kolom nomor="01" label="Komoditas">
              {SERTIFIKAT.produk}
              <span className="ml-2 text-tinta-samar">Grade {SERTIFIKAT.grade}</span>
            </Kolom>
            <Kolom nomor="02" label="Produsen">
              {SERTIFIKAT.tenant}
              <span className="mt-0.5 block text-[13px] text-tinta-samar">{SERTIFIKAT.zona}</span>
            </Kolom>
            <Kolom nomor="03" label="Lahan">
              {SERTIFIKAT.lahan.lat.toFixed(5)}, {SERTIFIKAT.lahan.lng.toFixed(5)}
              <span className="mt-0.5 block text-[13px] text-tinta-samar">
                {SERTIFIKAT.lahan.luasHa} ha · efektif {SERTIFIKAT.lahan.luasEfektifHa} ha
              </span>
            </Kolom>
            <Kolom
              nomor="04"
              label={
                <>
                  Harga terkunci
                  <Dagger n={1} judul="Escrow belum di mitra berizin" />
                </>
              }
            >
              {rupiah(SERTIFIKAT.hargaTerkunci)}
              <span className="mt-0.5 block text-[13px] text-tinta-samar">per box, sejak pra-tanam</span>
            </Kolom>
            <Kolom nomor="05" label="Tanam">
              {tanggalPanjang(SERTIFIKAT.tanam)}
            </Kolom>
            <Kolom nomor="06" label="Panen diklaim">
              {tanggalPanjang(SERTIFIKAT.panenKlaim)}
            </Kolom>
            <Kolom nomor="07" label="Kuota terjual">
              {SERTIFIKAT.kuota.terjual} box
              <span className="mt-0.5 block text-[13px] text-tinta-samar">
                dari kapasitas {angka(SERTIFIKAT.kuota.total)}
              </span>
            </Kolom>
            <Kolom nomor="08" label="Terpenuhi">
              <span className="text-stempel">{SERTIFIKAT.kuota.terpenuhi} box</span>
              <span className="mt-0.5 block text-[13px] text-tinta-samar">kurang {kurang} box</span>
            </Kolom>
          </div>

          <div className="flex flex-col gap-8 border-t-2 border-tinta pt-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="#verifikasi"
                className="bg-tinta px-7 py-3.5 text-[15px] font-semibold text-kertas-terang transition-colors hover:bg-ungu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
              >
                Bagaimana ini diverifikasi
              </Link>
              <Link
                href="#masuk"
                className="border border-tinta px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-tinta hover:text-kertas-terang focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
              >
                Masuk ke aplikasi
              </Link>
            </div>

            <div className="cap max-w-[24rem] border-[2.5px] border-stempel px-5 py-3 text-stempel">
              <p className="text-[11px] font-bold uppercase tracking-cap">
                Diperiksa citra satelit
                <Dagger n={2} judul="Penjadwalan produksi belum menyala" />
              </p>
              <p className="mt-1.5 font-mono text-[12px] leading-relaxed">
                {SCENE.puncak.id}
                <br />
                {tanggalPanjang(SCENE.puncak.tanggal)} · tutupan awan {SCENE.puncak.awanPct}%
              </p>
            </div>
          </div>

          {/* Catatan kaki menempel pada kolom yang dikualifikasinya, bukan menjadi daftar
              kekurangan terpisah tepat sebelum ajakan bertindak. */}
          <div className="grid gap-3 border-t border-kertas-garis pt-6 font-mono text-[12px] leading-relaxed text-tinta-samar md:grid-cols-2">
            <p>
              <span className="text-stempel">†</span> Buku besar escrow berjalan penuh dan mencatat
              setiap mutasi, tetapi mitra pembayaran berizin belum tersambung: instruksi pencairan
              berstatus menunggu, bukan berhasil.
            </p>
            <p>
              <span className="text-stempel">††</span> Citra dan nomor scene di halaman ini ditarik
              sungguhan. Penjadwalan verifikasi di produksi belum menyala, jadi angka NDVI di
              aplikasi peragaan masih data contoh.
            </p>
          </div>

          <p className="font-mono text-[11px] tracking-[0.2em] text-tinta-samar">
            SERI {SERTIFIKAT.seri} · BATCH {SERTIFIKAT.batchId}
          </p>
        </div>
      </section>

      {/* ======================= MEKANISME: VERIFIKASI ======================= */}
      <section id="verifikasi" className="scroll-mt-4 bg-ungu text-kertas-terang">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <h2
            className="max-w-[16ch] text-balance text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.03em]"
            style={{ fontStretch: "108%" }}
          >
            Petani melaporkan panennya sendiri. Itu masalahnya.
          </h2>
          <p className="mt-7 max-w-[68ch] text-[17px] leading-relaxed text-kabut-ungu">
            Siapa pun bisa mengetik angka panen yang menguntungkan dirinya. Karena itu angka
            yang dilaporkan tidak pernah berdiri sendiri di sini: ia diuji terhadap sesuatu
            yang tidak bisa disetel Tenant — kehijauan lahannya sendiri, dilihat dari orbit,
            setiap lima hari, sepanjang musim. Dari sinilah keempat hal berikutnya bisa
            dijanjikan.
          </p>

          <div className="mt-16 bg-kertas-terang p-6 text-tinta md:p-10">
            <KurvaNdvi />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[SCENE.puncak, SCENE.panen].map((s) => (
              <figure key={s.id} className="bg-kertas-terang p-4 text-tinta">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={s.berkas}
                    alt={`Citra Sentinel-2 kawasan Pujon, ${tanggalPanjang(s.tanggal)}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden fill="none">
                    <rect x="48.35" y="48.35" width="3.3" height="3.3" className="stroke-stempel" strokeWidth="0.7" />
                    <line x1="51.65" y1="48.35" x2="70" y2="30" className="stroke-stempel" strokeWidth="0.4" />
                    <text x="70.6" y="29.4" className="fill-stempel font-mono" fontSize="3">
                      lahan
                    </text>
                  </svg>
                </div>
                <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[14px] font-semibold">{s.keterangan}</span>
                  <span className="font-mono text-[11px] text-tinta-samar">
                    {s.id} · awan {s.awanPct}%
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= 1. EFISIENSI RANTAI PASOK ======================= */}
      <section className="kertas-sekuriti border-b-2 border-tinta bg-kertas">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <KepalaBagian judul="Permintaan dikunci sebelum modal keluar." lebarJudul="max-w-[20ch]">
            Urutan lazimnya terbalik: petani menanam dulu, memanen, baru mencari pembeli, dan
            menanggung sendiri kalau harga jatuh. Di sini kuota dibuka sebelum benih masuk
            tanah, sehingga jumlah dan harga sudah pasti sejak awal — untuk kedua pihak.
          </KepalaBagian>

          <div className="mt-14">
            {EFISIENSI.map((e) => (
              <BarisAturan key={e.label} nilai={e.angka} label={e.label} warnaNilai="text-ungu">
                {e.isi}
              </BarisAturan>
            ))}
            <BarisAturan
              nilai={String(QUOTA_MULTIPLIER_NORMAL * 100)}
              satuan="%"
              label="pengali kuota"
              warnaNilai="text-ungu"
            >
              Hanya sebagian kapasitas lahan yang boleh dijual, menyisakan bantalan untuk musim
              yang tidak sempurna. Angka ini turun sendiri bila realisasi Tenant menyimpang
              berulang dari rata-rata zonanya.
            </BarisAturan>
          </div>
        </div>
      </section>

      {/* ======================= 2. TRANSPARANSI DISTRIBUSI ======================= */}
      <section className="bg-biru text-kertas-terang">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <KepalaBagian
            nada="warna"
            judul="Kurir tidak memasang apa pun, dan tetap terlacak."
            lebarJudul="max-w-[20ch]"
          >
            Pengantar barang di lapangan tidak akan mengunduh aplikasi untuk satu pengiriman.
            Jadi seluruh alurnya berjalan di peramban, dimulai dari memindai QR dengan kamera
            bawaan ponsel — dan justru di situ pengawasannya diperketat, bukan dilonggarkan.
          </KepalaBagian>

          <div className="mt-14">
            <BarisAturan
              nilai="1"
              satuan="× pakai"
              label="token QR"
              warnaNilai="text-kertas-terang"
              warnaGaris="border-biru-muda/40"
              warnaTeks="text-kabut-biru"
            >
              Setiap token hanya bisa ditukar sekali. Jaminannya indeks unik parsial di basis
              data, bukan pemeriksaan aplikasi — dua pemindaian bersamaan atas token yang sama
              tidak mungkin dua-duanya lolos.
            </BarisAturan>
            <BarisAturan
              nilai={String(COURIER_PIN_MAX_ATTEMPTS)}
              satuan="percobaan"
              label="Kode Antar 4 digit"
              warnaNilai="text-kertas-terang"
              warnaGaris="border-biru-muda/40"
              warnaTeks="text-kabut-biru"
            >
              Memindai QR saja tidak cukup membuka pengiriman. Lewat batas ini token terkunci,
              dan Tenant harus menerbitkan kode baru.
            </BarisAturan>
            <BarisAturan
              nilai={angka(MAX_PLAUSIBLE_JUMP_M)}
              satuan="m"
              label="lompatan posisi ditolak"
              warnaNilai="text-kertas-terang"
              warnaGaris="border-biru-muda/40"
              warnaTeks="text-kabut-biru"
            >
              Posisi yang melompat lebih jauh dari ini, atau menyiratkan kecepatan di atas{" "}
              {MAX_PLAUSIBLE_SPEED_KMH} km/jam, ditandai tidak masuk akal dan tidak ikut
              menggerakkan status. Pelacakan yang menerima koordinat apa pun bukan pelacakan.
            </BarisAturan>
            <BarisAturan
              nilai={angka(PRENOTIFY_RADIUS_M)}
              satuan="m"
              label="pemberitahuan mendekat"
              warnaNilai="text-kertas-terang"
              warnaGaris="border-biru-muda/40"
              warnaTeks="text-kabut-biru"
            >
              Penerima dikabari sebelum kurir tiba, supaya barang tidak menunggu di depan pintu.
              Terpisah dari penanda kedatangan agar keduanya bisa diaudit sendiri-sendiri.
            </BarisAturan>
            <BarisAturan
              nilai={String(GEOFENCE_RADIUS_M)}
              satuan="m"
              label="geofence kedatangan"
              warnaNilai="text-kertas-terang"
              warnaGaris="border-biru-muda/40"
              warnaTeks="text-kabut-biru"
            >
              Status Tiba tidak ditekan kurir, melainkan terpicu jaraknya sendiri ke titik
              tujuan. Serah terimanya kemudian menuntut dua sinyal terpisah: pindaian kurir dan
              konfirmasi penerima.
            </BarisAturan>
          </div>
        </div>
      </section>

      {/* ======================= 3. KUALITAS PRODUK ======================= */}
      <section className="kertas-sekuriti border-b-2 border-tinta bg-kertas">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <KepalaBagian
            judul="Mutu disepakati di muka, bukan diperdebatkan setelah barang datang."
            lebarJudul="max-w-[24ch]"
          >
            Sengketa mutu hampir selalu berawal dari dua pihak yang tidak pernah menyepakati
            artinya bagus. Grade, toleransi susut, dan tenggat pengajuan klaim ditetapkan
            sebelum transaksi, per komoditas.
          </KepalaBagian>

          <div className="mt-14 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">Definisi grade A, B, dan C</caption>
              <thead>
                <tr className="border-b border-tinta">
                  {["Grade", "Keseragaman min.", "Cacat maks.", "Definisi"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-3 text-[10px] font-semibold uppercase tracking-cap text-tinta-samar"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MUTU_GRADE.map((g) => (
                  <tr key={g.grade} className="border-b border-kertas-garis">
                    <td className="py-4 font-mono text-[20px] text-jambu">{g.grade}</td>
                    <td className="py-4 font-mono text-[15px]">{g.seragam}%</td>
                    <td className="py-4 font-mono text-[15px]">{g.cacat}%</td>
                    <td className="max-w-[36ch] py-4 text-[15px] leading-relaxed text-tinta-lembut">{g.isi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12">
            <BarisAturan nilai="2" satuan="jam" label="jendela klaim mutu" warnaNilai="text-jambu">
              Dihitung sejak status Diterima. Lewat itu pesanan dianggap diterima penuh dan
              escrow dicairkan. Tenggat yang pendek justru melindungi kedua pihak: mutu hasil
              pertanian berubah cepat, dan buktinya ikut kabur bersama waktu.
            </BarisAturan>
            <BarisAturan
              nilai={String(CLAIM_AUTO_SETTLE_MAX_PCT)}
              satuan="%"
              label="batas selesai otomatis"
              warnaNilai="text-jambu"
            >
              Klaim di bawah nilai ini diselesaikan lewat potongan escrow tanpa peninjauan
              manual. Di atasnya masuk antrean Operator — mesin menandai, manusia memutuskan.
            </BarisAturan>
            <BarisAturan nilai="3" satuan="%" label="toleransi susut" warnaNilai="text-jambu">
              Disepakati per komoditas sebelum transaksi. Selisih di dalam toleransi tidak dapat
              diklaim, sehingga tidak ada tawar-menawar atas penyusutan yang memang wajar.
            </BarisAturan>
          </div>
        </div>
      </section>

      {/* ======================= 4. KEAMANAN PRODUK ======================= */}
      <section className="bg-tinta text-kertas-terang">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <KepalaBagian
            nada="warna"
            judul="Catatan yang tidak bisa disunting belakangan."
            lebarJudul="max-w-[20ch]"
          >
            Ketertelusuran hanya berarti kalau catatannya tidak bisa dirapikan setelah ada
            masalah. Setiap kegiatan disimpan sebagai baris baru yang memuat sidik jari baris
            sebelumnya; mengubah satu catatan lama memutus seluruh rantai sesudahnya. Basis
            datanya menolak operasi ubah dan hapus, termasuk dari koneksi administratif.
          </KepalaBagian>

          <ol className="mt-14 border-t border-tinta-lembut">
            {RANTAI.map((n) => (
              <li
                key={n.seq}
                className="grid items-baseline gap-x-8 gap-y-2 border-b border-tinta-lembut py-6 md:grid-cols-[3rem_11rem_minmax(0,1fr)_auto]"
              >
                <span className="font-mono text-[13px] text-kertas-garis">
                  {String(n.seq).padStart(2, "0")}
                </span>
                <span className="text-[16px] font-semibold">{n.kegiatan}</span>
                <span className="max-w-[58ch] text-[15px] leading-relaxed text-kertas-garis">{n.catatan}</span>
                <span className="font-mono text-[12px] text-kertas-garis md:text-right">
                  {n.prev ? (
                    <>
                      <span className="opacity-60">{n.prev}</span>
                      <span className="mx-1.5">&rarr;</span>
                    </>
                  ) : null}
                  <span className="text-ungu-muda">{n.hash}</span>
                  <span className="ml-2 block text-[11px] md:mt-1 md:inline-block">{n.tanggal}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-8 max-w-[68ch] text-[15px] leading-relaxed text-kertas-garis">
            Baris terakhir mengakui panen yang gagal sebagian, dan tidak ada yang menghapusnya.
            Itulah gunanya: catatan yang hanya memuat kabar baik tidak membuktikan apa pun. Uang
            pembeli mengikuti aturan yang sama — buku besar escrow bersifat tambah-saja, dan
            koreksi dilakukan dengan menambah baris, bukan menghapus jejak.
          </p>
        </div>
      </section>

      {/* ======================= PERAN & BATAS LINGKUP ======================= */}
      <section className="border-b-2 border-tinta">
        <h2 className="sr-only">Empat peran, empat salinan</h2>
        <div className="grid md:grid-cols-4">
          {PERAN.map((p) => {
            const ground =
              p.label === "ungu"
                ? "bg-ungu"
                : p.label === "biru"
                  ? "bg-biru"
                  : p.label === "merah-jambu"
                    ? "bg-jambu"
                    : "bg-tinta";
            const kabut =
              p.label === "ungu"
                ? "text-kabut-ungu"
                : p.label === "biru"
                  ? "text-kabut-biru"
                  : p.label === "merah-jambu"
                    ? "text-kabut-jambu"
                    : "text-kertas-garis";
            return (
              <div
                key={p.nama}
                className={`${ground} flex flex-col gap-4 px-7 py-12 text-kertas-terang md:px-8 md:py-16`}
              >
                <h3 className="text-[26px] font-extrabold leading-none" style={{ fontStretch: "108%" }}>
                  {p.nama}
                </h3>
                <p className={`text-[13px] font-medium ${kabut}`}>{p.isi}</p>
                <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed">{p.tugas}</p>
                <p className={`mt-auto max-w-[34ch] pt-6 text-[13px] leading-relaxed ${kabut}`}>{p.catatan}</p>
              </div>
            );
          })}
        </div>

        {/* Batas lingkup dinyatakan apa adanya. Dua dari empat tahap rantai agro memang tidak
            dikerjakan produk ini, dan menyamarkannya di depan pembaca yang memegang deskripsi
            temanya sendiri akan meruntuhkan kepercayaan yang dibangun seluruh halaman. */}
        <div className="kertas-sekuriti bg-kertas">
          <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10">
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-tinta-lembut">
              Empat warna di atas adalah warna label sertifikasi benih Indonesia — penjenis,
              dasar, pokok, sebar. Dipakai di sini untuk hal yang sama: menandai mutu yang tidak
              bisa dilihat mata. Dan seperti label sungguhan, ia menyatakan juga apa yang tidak
              dijaminnya.
            </p>
            <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {CAKUPAN.map((c) => (
                <div key={c.tahap} className={`border-t pt-4 ${c.ada ? "border-tinta" : "border-kertas-garis"}`}>
                  <dt className="flex items-baseline gap-2 text-[15px] font-bold">
                    <span className={`font-mono text-[12px] ${c.ada ? "text-ungu" : "text-tinta-samar"}`}>
                      {c.ada ? "✓" : "—"}
                    </span>
                    {c.tahap}
                  </dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-tinta-lembut">{c.isi}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ======================= MASUK ======================= */}
      <section id="masuk" className="kertas-sekuriti scroll-mt-4 bg-kertas">
        <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <h2
                className="max-w-[15ch] text-balance text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.03em]"
                style={{ fontStretch: "108%" }}
              >
                Periksa sendiri, jangan percaya halaman ini.
              </h2>
              <p className="mt-7 max-w-[62ch] text-[17px] leading-relaxed text-tinta-lembut">
                Seluruh alur berjalan di produksi dengan data peragaan. Masuk sebagai peran mana
                pun, telusuri rantainya, dan bandingkan dengan yang tertulis di sini.
              </p>
            </div>
            <div aria-hidden className="hidden w-40 shrink-0 text-ungu opacity-50 md:block lg:w-52">
              <Guilloche diam />
            </div>
          </div>

          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              href="/auth/tenant"
              className="bg-ungu px-7 py-3.5 text-[15px] font-semibold text-kertas-terang transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
            >
              Masuk sebagai Tenant
            </Link>
            <Link
              href="/auth/buyer"
              className="bg-biru px-7 py-3.5 text-[15px] font-semibold text-kertas-terang transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
            >
              Masuk sebagai Pembeli
            </Link>
            <Link
              href="/auth/operator/login"
              className="border border-tinta px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-tinta hover:text-kertas-terang focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
            >
              Masuk sebagai Operator
            </Link>
          </div>

          <p className="mt-8 max-w-[68ch] font-mono text-[13px] leading-relaxed text-tinta-samar">
            Nomor telepon akun peragaan tercantum di README repositori. Mode peragaan aktif,
            jadi kode OTP dikembalikan langsung oleh API — dan itu wajib dimatikan sebelum ada
            data sungguhan. Tidak ada pelanggan, testimoni, logo mitra, atau angka penggunaan di
            halaman ini; tidak ada karena memang belum ada.
          </p>

          <footer className="mt-20 flex flex-wrap items-baseline justify-between gap-4 border-t border-tinta pt-8 font-mono text-[11px] uppercase tracking-cap text-tinta-samar">
            <span>AgroUs · Malang Raya</span>
            <span>
              {layak} amatan layak · {tertutup} tertutup awan · citra Sentinel-2 L2A, AWS Open Data
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}
