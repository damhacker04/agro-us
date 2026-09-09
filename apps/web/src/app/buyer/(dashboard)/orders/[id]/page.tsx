"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { CANCELLATION_FEE_PCT } from "@agro-os/shared";
import type {
  BuyerOrderDetail,
  BuyerOrderShipment,
  CancelOrderResponse,
  ClaimFinalStatus,
  ClaimResponse,
  ClaimRoute,
  TrackingSnapshot,
  UmurSimpan,
} from "@agro-os/shared";
import {
  GalatApi,
  ajukanKlaim,
  ambilKlaim,
  ambilPelacakan,
  ambilPesananSatu,
  batalkanPesanan,
  konfirmasiTerima,
  unggahFoto,
} from "@/lib/api";
import { angka, desimal, jamWib, rupiah, tanggalPanjang, tanggalPendek } from "@/lib/format-id";
import { PilTahap } from "@/components/tahap-pengiriman";
import { PilVerifikasi } from "@/components/tanda-verifikasi";
import {
  AreaTeks,
  BarisData,
  Berkas,
  Deret,
  Galat,
  Halaman,
  Label,
  Masukan,
  Medan,
  Memuat,
  Nilai,
  Panel,
  Pil,
  Pilihan,
  Prosa,
  Sunyi,
  TautanKembali,
  Tombol,
} from "@/ui";

/**
 * BY-12 — Rincian satu pesanan. Halaman terbesar aplikasi ini.
 *
 * MIGRASI DUNIA, dan tiga hal yang berubah bukan soal rupa:
 *
 * 1. `confirm()` DAN `alert()` DIBUANG. Pembatalan menagih 10% nilai barang, dan sebelumnya
 *    peringatannya berupa dialog bawaan peramban berisi satu kalimat tanpa satu pun angka —
 *    lalu akibatnya diumumkan lewat `alert()` yang hilang begitu ditutup, tanpa jejak. Di
 *    produk ini setiap layar yang menjatuhkan akibat finansial wajib punya layar peringatan
 *    pasangannya: sekarang dendanya dirinci SEBELUM tombolnya, dan hasilnya menetap di
 *    halaman setelahnya. Dialog bawaan juga satu-satunya permukaan di aplikasi yang tidak
 *    bisa dibawa ke dunia ini — ia membulat, memakai huruf sistem, dan datang dari peramban.
 *
 * 2. WAKTU DIPAKU KE WIB. `toLocaleString("id-ID")` bergantung pada data ICU runtime; jam
 *    yang berbeda antara server dan peramban membuang seluruh pohon React dengan galat
 *    hidrasi. `jamWib` menghitungnya sebagai offset tetap.
 *
 * 3. FOTO BUKTI BISA DIJANGKAU PAPAN KETIK. Dua input berkas di halaman ini sebelumnya
 *    disembunyikan dengan `display:none`, yang mencabutnya dari urutan tab — dan tanpa foto,
 *    konfirmasi penerimaan maupun klaim mutu tidak bisa dikirim sama sekali.
 */

const RUTE: Record<ClaimRoute, string> = {
  TOLAK_TOLERANSI: "Selisihnya masih di dalam toleransi susut alami, jadi klaim ditutup otomatis.",
  AUTO_SETTLE: "Nilainya di bawah 10% nilai pesanan, jadi dipotong langsung dari escrow tanpa antre.",
  OPERATOR: "Nilainya di atas 10% nilai pesanan, jadi diperiksa peninjau lebih dulu.",
};

const PUTUSAN: Record<ClaimFinalStatus, { teks: string; nada: "netral" | "utama" | "kabar" | "awas" }> = {
  DITOLAK_TOLERANSI: { teks: "Ditolak — dalam toleransi", nada: "netral" },
  DISETUJUI_OTOMATIS: { teks: "Disetujui otomatis", nada: "utama" },
  MENUNGGU_OPERATOR: { teks: "Menunggu peninjau", nada: "kabar" },
  DISETUJUI_OPERATOR: { teks: "Disetujui peninjau", nada: "utama" },
  DITOLAK_OPERATOR: { teks: "Ditolak peninjau", nada: "awas" },
};

const jarak = (m: number) => (m >= 1000 ? `${desimal(m / 1000, 1)} km` : `${Math.round(m)} m`);

/** Sisa waktu jendela klaim, dihitung ulang tiap detik. */
function useHitungMundur(sampai: string | null) {
  const [sisa, setSisa] = useState<number>(() => (sampai ? new Date(sampai).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!sampai) return;
    const t = setInterval(() => setSisa(new Date(sampai).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [sampai]);
  if (!sampai || sisa <= 0) return null;
  const menit = Math.floor(sisa / 60000);
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = React.use(params);

  const [pesanan, setPesanan] = useState<BuyerOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  const [siapBatal, setSiapBatal] = useState(false);
  const [prosesBatal, setProsesBatal] = useState(false);
  const [galatBatal, setGalatBatal] = useState("");
  const [hasilBatal, setHasilBatal] = useState<CancelOrderResponse | null>(null);

  const muat = useCallback(() => {
    return ambilPesananSatu(orderId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [orderId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function batalkan() {
    setProsesBatal(true);
    setGalatBatal("");
    try {
      const r = await batalkanPesanan(orderId);
      setHasilBatal(r);
      setSiapBatal(false);
      await muat();
    } catch (e) {
      setGalatBatal(e instanceof GalatApi ? e.message : "Pesanan gagal dibatalkan.");
    } finally {
      setProsesBatal(false);
    }
  }

  if (memuat) {
    return (
      <Halaman judul="Rincian pesanan">
        <Memuat baris={4} label="Memuat pesanan" />
      </Halaman>
    );
  }

  if (galat || !pesanan) {
    return (
      <Halaman judul="Rincian pesanan" kembali={<TautanKembali href="/buyer/orders">Pesanan saya</TautanKembali>}>
        <Galat judul="Pesanan tidak dapat dimuat">
          {galat || "Pesanan tidak ditemukan."} Pesanan Anda tetap tercatat di server — muat
          ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  // Pembatalan sepihak hanya sah selama SELURUH pengiriman masih menunggu panen (FR-7.5):
  // sesudah itu Tenant sudah memanen untuk pesanan ini.
  const bisaBatal =
    pesanan.orderStatus === "PAID" && pesanan.shipments.every((s) => s.status === "MENUNGGU_PANEN");

  // Denda dihitung dari nilai BARANG, di luar ongkir — sama seperti perhitungan server.
  const nilaiBarang = pesanan.shipments.reduce(
    (jml, s) => jml + s.lines.reduce((j, l) => j + l.subtotal, 0),
    0,
  );
  const perkiraanDenda = Math.round((nilaiBarang * CANCELLATION_FEE_PCT) / 100);

  return (
    <Halaman
      kembali={<TautanKembali href="/buyer/orders">Pesanan saya</TautanKembali>}
      judul={`Pesanan ${pesanan.orderId.slice(0, 8).toUpperCase()}`}
      pengantar={`Dipesan ${tanggalPanjang(pesanan.createdAt)}. Satu pesanan dipecah menjadi beberapa pengiriman menurut minggu panennya, jadi tiap pengiriman punya tahap dan jendela klaimnya sendiri.`}
      aksi={
        bisaBatal && !siapBatal && !hasilBatal ? (
          <Tombol rupa="kedua" ukuran="sm" onClick={() => setSiapBatal(true)}>
            Batalkan pesanan
          </Tombol>
        ) : null
      }
    >
      <Panel label="Ringkasan" judul="Yang sudah dibayarkan" className="mb-10">
        <Deret kolom={4} as="dl">
          <BarisData label="Total dibayar">{rupiah(pesanan.totalAmount)}</BarisData>
          <BarisData label="Nilai barang">{rupiah(nilaiBarang)}</BarisData>
          {/* Selisihnya diberi barisnya sendiri, dan hanya muncul bila memang ada. Kalimat
              "selisihnya adalah ongkir" pada pesanan yang selisihnya nol menyuruh pembeli
              mencari angka yang tidak ada di layar. */}
          {pesanan.totalAmount > nilaiBarang ? (
            <BarisData label="Ongkir & laporan">
              {rupiah(pesanan.totalAmount - nilaiBarang)}
            </BarisData>
          ) : null}
          <BarisData label="Pembayaran" prosa>
            {pesanan.payment
              ? `${pesanan.payment.status === "PAID" ? "Lunas" : "Menunggu pembayaran"} · ${pesanan.payment.method}`
              : "Belum ada tagihan"}
          </BarisData>
        </Deret>
        <Sunyi className="mt-5 max-w-[68ch] text-[13px]">
          Dana ditahan di escrow, bukan diteruskan ke produsen. Ia baru berpindah setelah barang
          Anda terima dan jendela klaim mutu tiap pengiriman berakhir.
        </Sunyi>
      </Panel>

      {/* Peringatan datang SEBELUM akibatnya, dengan angkanya, bukan sesudah lewat dialog. */}
      {siapBatal ? (
        <Panel nada="awas" label="Sebelum membatalkan" judul="Pembatalan menagih denda" className="mb-10">
          <Prosa className="text-[14px]">
            Denda {CANCELLATION_FEE_PCT}% diteruskan penuh ke Tenant, bukan diambil platform:
            benih, pupuk, dan lahan untuk pesanan ini sudah dialokasikan sejak kuota dikunci.
            Angka pasti dihitung server saat pembatalan diproses.
          </Prosa>
          <Deret kolom={3} as="dl" className="mt-6">
            <BarisData label="Nilai barang">{rupiah(nilaiBarang)}</BarisData>
            <BarisData label={`Denda ${CANCELLATION_FEE_PCT}%`}>
              <span className="text-jambu">−{rupiah(perkiraanDenda)}</span>
            </BarisData>
            <BarisData label="Perkiraan kembali">{rupiah(nilaiBarang - perkiraanDenda)}</BarisData>
          </Deret>

          {galatBatal ? (
            <Galat judul="Pembatalan tidak diproses" className="mt-6">
              {galatBatal}
            </Galat>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-2">
            <Tombol rupa="bahaya" sibuk={prosesBatal} labelSibuk="Membatalkan…" onClick={batalkan}>
              Ya, batalkan dan terima denda
            </Tombol>
            <Tombol rupa="sunyi" onClick={() => setSiapBatal(false)} disabled={prosesBatal}>
              Jangan batalkan
            </Tombol>
          </div>
        </Panel>
      ) : null}

      {hasilBatal ? (
        <Panel nada="awas" label="Pesanan dibatalkan" judul="Rincian pengembalian dana" className="mb-10">
          <Deret kolom={3} as="dl">
            <BarisData label="Nilai barang">{rupiah(hasilBatal.goodsValue)}</BarisData>
            <BarisData label="Denda dibayarkan">
              <span className="text-jambu">−{rupiah(hasilBatal.cancellationFee)}</span>
            </BarisData>
            <BarisData label="Dikembalikan">{rupiah(hasilBatal.refundedValue)}</BarisData>
          </Deret>
          <Prosa className="mt-5 text-[14px]">{hasilBatal.message}</Prosa>
        </Panel>
      ) : null}

      <div className="space-y-10">
        {pesanan.shipments.map((s, i) => (
          <BlokPengiriman
            key={s.shipmentId}
            orderId={pesanan.orderId}
            pengiriman={s}
            urutan={i + 1}
            total={pesanan.shipments.length}
            onBerubah={muat}
          />
        ))}
      </div>
    </Halaman>
  );
}

function BlokPengiriman({
  orderId,
  pengiriman: s,
  urutan,
  total,
  onBerubah,
}: {
  orderId: string;
  pengiriman: BuyerOrderShipment;
  urutan: number;
  total: number;
  onBerubah: () => Promise<unknown>;
}) {
  const [jejak, setJejak] = useState<TrackingSnapshot | null>(null);
  const [klaim, setKlaim] = useState<ClaimResponse[]>([]);
  const [bukaKlaim, setBukaKlaim] = useState(false);
  const sisaKlaim = useHitungMundur(s.claimWindowEndsAt);

  // Dipantau hanya saat barang benar-benar di jalan. Menjajaki pengiriman yang belum
  // dipanen atau sudah selesai cuma membebani server tanpa mengubah apa pun di layar.
  const sedangJalan = s.status === "DIKIRIM" || s.status === "TIBA_DI_LOKASI";
  useEffect(() => {
    if (!sedangJalan) return;
    const ambil = () =>
      ambilPelacakan(s.shipmentId)
        .then(setJejak)
        .catch(() => undefined);
    void ambil();
    const jeda = setInterval(ambil, 15_000);
    return () => clearInterval(jeda);
  }, [s.shipmentId, sedangJalan]);

  useEffect(() => {
    if (s.status !== "DITERIMA" && s.status !== "SELESAI") return;
    ambilKlaim(s.shipmentId)
      .then(setKlaim)
      .catch(() => setKlaim([]));
  }, [s.shipmentId, s.status]);

  return (
    <Panel
      nada={s.status === "TIBA_DI_LOKASI" ? "awas" : s.status === "DIKIRIM" ? "kabar" : "netral"}
      label={`Pengiriman ${urutan} dari ${total}`}
      judul={`Siap ${tanggalPanjang(s.readyDate)}`}
      aksi={<PilTahap status={s.status} />}
    >
      {/* ---------- Posisi kurir ---------- */}
      {sedangJalan ? (
        <div className="mb-8 border-t-2 border-biru pt-3">
          <Label className="text-biru">Posisi kurir</Label>
          {jejak?.noGpsMode ? (
            <Prosa className="mt-2 text-[14px]">
              Kurir tidak berbagi lokasi, jadi kedatangan dikonfirmasi manual. Pastikan nomor
              penerima aktif — itu satu-satunya jalur pemberitahuannya.
            </Prosa>
          ) : jejak?.distanceToDestM !== null && jejak?.distanceToDestM !== undefined ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <Nilai ukuran="lg" className="text-biru">
                  {jarak(jejak.distanceToDestM)}
                </Nilai>
                <span className="text-[14px] text-tinta-lembut">dari titik antar Anda</span>
              </div>
              {/* Stempel waktu ditampilkan apa adanya, termasuk saat sudah lama —
                  menyembunyikannya membuat posisi basi terlihat seperti posisi terkini. */}
              {jejak.positionAt ? (
                <p
                  className={
                    jejak.signalLost
                      ? "mt-2 text-[13px] font-semibold text-jambu"
                      : "mt-2 text-[13px] text-tinta-samar"
                  }
                >
                  {jejak.signalLost ? "Sinyal hilang — posisi terakhir " : "Diperbarui "}
                  <span className="font-mono">
                    {tanggalPendek(jejak.positionAt)} {jamWib(jejak.positionAt)} WIB
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <Sunyi className="mt-2">Menunggu posisi pertama dari kurir…</Sunyi>
          )}
        </div>
      ) : null}

      {/* ---------- Konfirmasi terima ---------- */}
      {s.status === "TIBA_DI_LOKASI" ? (
        <KonfirmasiTerima shipmentId={s.shipmentId} onSelesai={onBerubah} />
      ) : null}

      {/* ---------- Jendela klaim ---------- */}
      {s.status === "DITERIMA" && sisaKlaim ? (
        <div className="mb-8 border-t-2 border-jambu pt-3">
          <Label className="text-jambu">Jendela klaim mutu</Label>
          <div className="mt-2">
            <Nilai ukuran="lg" className="text-jambu">
              {sisaKlaim}
            </Nilai>
          </div>
          <Prosa className="mt-2 text-[14px]">
            Setelah jendela ini tertutup, dana diteruskan ke Tenant dan keluhan mutu tidak bisa
            diajukan lagi. Timbang barangnya sekarang bila ada yang mencurigakan.
          </Prosa>
          {!bukaKlaim && klaim.length === 0 ? (
            <Tombol rupa="kedua" ukuran="sm" className="mt-4" onClick={() => setBukaKlaim(true)}>
              Ajukan klaim mutu
            </Tombol>
          ) : null}
        </div>
      ) : null}

      {bukaKlaim ? (
        <FormKlaim
          shipmentId={s.shipmentId}
          baris={s.lines}
          onSelesai={async (c) => {
            setKlaim((k) => [...k, c]);
            setBukaKlaim(false);
            await onBerubah();
          }}
          onBatal={() => setBukaKlaim(false)}
        />
      ) : null}

      {klaim.map((c) => {
        const putusan = PUTUSAN[c.finalStatus];
        return (
          <div key={c.id} className="mb-8 border-t-2 border-tinta pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <Label>Klaim mutu · {c.productName}</Label>
              <Pil nada={putusan.nada} garis={putusan.nada !== "awas"}>
                {putusan.teks}
              </Pil>
            </div>
            <Deret kolom={4} as="dl" className="mt-4">
              <BarisData label="Seharusnya">{desimal(c.expectedKg, 1)} kg</BarisData>
              <BarisData label="Hasil timbang">{desimal(c.actualWeightKg, 1)} kg</BarisData>
              <BarisData label={`Toleransi ${desimal(c.shrinkTolerancePct, 0)}%`}>
                {desimal(c.toleratedKg, 1)} kg
              </BarisData>
              <BarisData label="Bisa diklaim">{desimal(c.claimableKg, 1)} kg</BarisData>
            </Deret>
            <Prosa className="mt-4 text-[14px]">
              {RUTE[c.route]} Nilai klaim {rupiah(c.claimValue)}
              {c.settledValue > 0 ? `, dibayarkan ${rupiah(c.settledValue)}` : ""}.
            </Prosa>
            {c.reviewNote ? (
              <Sunyi className="mt-2 text-[13px]">Catatan peninjau: {c.reviewNote}</Sunyi>
            ) : null}
          </div>
        );
      })}

      {/* ---------- Tujuan ---------- */}
      <Label className="mb-3">Alamat penerima</Label>
      <Deret kolom={4} as="dl">
        <BarisData label="Penerima" prosa>
          {s.recipient.name}
        </BarisData>
        <BarisData label="Telepon">{s.recipient.phone}</BarisData>
        <BarisData label="Jam terima">{s.recipient.receivingHours}</BarisData>
        <BarisData label="Patokan" prosa>
          {s.recipient.landmark || "—"}
        </BarisData>
      </Deret>

      {/* ---------- Item ---------- */}
      <Label className="mb-1 mt-8">
        {s.lines.length} komoditas dalam pengiriman ini
      </Label>
      <ul>
        {s.lines.map((l) => {
          const kurang =
            l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox ? l.qtyBox - l.qtyBoxFulfilled : 0;
          return (
            <li
              key={l.orderItemId}
              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-t border-kertas-garis py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[15px] font-bold text-tinta">{l.productName}</span>
                  <span className="text-[13px] text-tinta-samar">Grade {l.grade}</span>
                  <PilVerifikasi badge={l.badge} />
                </div>
                <Sunyi className="mt-1 text-[13px]">
                  {l.tenantName} ·{" "}
                  <span className="font-mono">
                    {angka(l.qtyBox)} box × {rupiah(l.unitPriceLocked)}
                  </span>
                </Sunyi>

                {kurang > 0 ? (
                  <div className="mt-3 border-t-2 border-jambu pt-2">
                    <Label className="text-jambu">Kurang {angka(kurang)} box dari yang dipesan</Label>
                    <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-tinta-lembut">
                      Panen tidak menutupi seluruh baris ini. Nasib porsi yang kurang Anda yang
                      memutuskan — substitusi, jadwal ulang, terima sebagian, atau tolak.{" "}
                      <Link
                        href={`/buyer/orders/${orderId}/resolution`}
                        className="font-semibold text-jambu underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
                      >
                        Pilih penyelesaian
                      </Link>
                    </p>
                  </div>
                ) : null}

                <BarisUmurSimpan umur={l.umurSimpan} />
              </div>

              <div className="shrink-0 text-right">
                <Nilai>{rupiah(l.subtotal)}</Nilai>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/**
 * BY-12b — kesegaran barang (FR-5.9).
 *
 * Angka ini diturunkan dari stempel SERVER node Panen, bukan dari tanggal yang diketik
 * penjual, dan kalimatnya menyatakan itu. Bedanya bukan detail teknis: inilah satu-satunya
 * angka kesegaran di seluruh sistem yang tidak berasal dari klaim pihak yang menjual.
 *
 * Komoditas yang belum punya angka umur simpan menampilkan usianya saja — "dipanen 4 hari
 * lalu" tetap benar tanpa perlu tahu batas simpannya. Mengarang batasnya berarti
 * menyampaikan tebakan sebagai fakta kesegaran kepada orang yang akan memakan barangnya.
 */
function BarisUmurSimpan({ umur }: { umur: UmurSimpan }) {
  if (umur.ageDays === null) return null;

  const usia = umur.settled ? `Umur saat tiba ${umur.ageDays} hari` : `Dipanen ${umur.ageDays} hari lalu`;

  if (umur.remainingDays === null) {
    return (
      <Sunyi className="mt-2 max-w-[58ch] text-[13px]">
        {usia}. Umur simpan komoditas ini belum ditetapkan, jadi sisa kesegarannya belum bisa
        dinyatakan.
      </Sunyi>
    );
  }

  const lewat = umur.remainingDays < 0;
  const menipis = !lewat && umur.remainingDays <= 2;

  return (
    <p
      className={
        lewat
          ? "mt-2 text-[13px] font-semibold text-jambu"
          : menipis
            ? "mt-2 text-[13px] font-semibold text-tinta"
            : "mt-2 text-[13px] text-tinta-lembut"
      }
    >
      {usia} ·{" "}
      {lewat
        ? `melewati umur simpan ${Math.abs(umur.remainingDays)} hari`
        : `sisa umur simpan ${umur.remainingDays} hari`}
      <span className="mt-0.5 block max-w-[58ch] font-normal leading-relaxed text-tinta-samar">
        Dihitung dari waktu panen yang dicatat sistem, bukan dari tanggal yang diisi penjual.
        Angka umur simpannya sendiri masih indikatif.
      </span>
    </p>
  );
}

/** Sinyal-2 PoD: foto kondisi barang. Tanpa foto, konfirmasi tidak membuktikan apa pun. */
function KonfirmasiTerima({
  shipmentId,
  onSelesai,
}: {
  shipmentId: string;
  onSelesai: () => Promise<unknown>;
}) {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    if (!berkas) return setGalat("Lampirkan satu foto kondisi barang lebih dulu — tanpa itu klaim mutu nanti tidak punya pembanding.");
    setProses(true);
    setGalat("");
    try {
      const { url } = await unggahFoto(berkas);
      await konfirmasiTerima(shipmentId, url);
      await onSelesai();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Penerimaan gagal dikonfirmasi. Coba kirim ulang.");
      setProses(false);
    }
  }

  return (
    <div className="mb-8 border-t-2 border-jambu pt-3">
      <Label className="text-jambu">Kurir tiba — konfirmasi penerimaan</Label>
      <Prosa className="mt-2 text-[14px]">
        Foto kondisi barang saat diterima inilah yang menjadi pembanding bila Anda mengajukan
        klaim mutu dalam dua jam ke depan. Dana tetap ditahan sampai jendela itu berakhir.
      </Prosa>

      <Medan
        label="Foto kondisi barang"
        petunjuk="Ambil dari kamera saat barang dibuka, sebelum dipindahkan."
        galat={galat || undefined}
        wajib
        className="mt-5 max-w-[28rem]"
      >
        {(alat) => (
          <Berkas
            {...alat}
            ikon={Camera}
            accept="image/*"
            capture="environment"
            nama={berkas?.name ?? null}
            placeholder="Ambil foto atau pilih berkas"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
        )}
      </Medan>

      <Tombol className="mt-5" sibuk={proses} labelSibuk="Mengirim…" onClick={kirim}>
        Barang diterima
      </Tombol>
    </div>
  );
}

function FormKlaim({
  shipmentId,
  baris,
  onSelesai,
  onBatal,
}: {
  shipmentId: string;
  baris: BuyerOrderShipment["lines"];
  onSelesai: (c: ClaimResponse) => Promise<void>;
  onBatal: () => void;
}) {
  const [orderItemId, setOrderItemId] = useState(baris[0]?.orderItemId ?? "");
  const [berat, setBerat] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatFoto, setGalatFoto] = useState("");

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!berkas) {
      setGalatFoto("Foto barang wajib dilampirkan — peninjau memutus klaim justru dari foto dan keterangannya.");
      return;
    }
    setProses(true);
    setGalat("");
    setGalatFoto("");
    try {
      const { url } = await unggahFoto(berkas);
      const c = await ajukanKlaim(shipmentId, {
        orderItemId,
        actualWeightKg: Number(berat),
        photoUrl: url,
        description: keterangan,
      });
      await onSelesai(c);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Klaim gagal dikirim. Coba lagi.");
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mb-8 border-t-2 border-tinta pt-3">
      <Label>Ajukan klaim mutu</Label>
      <Prosa className="mt-2 text-[14px]">
        Timbang barang yang bermasalah, lalu masukkan berat sebenarnya. Toleransi susut alami
        komoditas dipotong otomatis, jadi angka yang Anda isi tidak perlu dikurangi sendiri.
      </Prosa>

      <div className="mt-6 grid max-w-[42rem] gap-5 sm:grid-cols-2">
        <Medan label="Item bermasalah" wajib>
          {(alat) => (
            <Pilihan {...alat} value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)}>
              {baris.map((l) => (
                <option key={l.orderItemId} value={l.orderItemId}>
                  {l.productName} ({l.qtyBox} box)
                </option>
              ))}
            </Pilihan>
          )}
        </Medan>

        <Medan label="Berat aktual hasil timbang" petunjuk="Dalam kilogram, satu angka desimal." wajib>
          {(alat) => (
            <Masukan
              {...alat}
              type="number"
              step="0.01"
              min={0}
              value={berat}
              onChange={(e) => setBerat(e.target.value)}
              placeholder="285.5"
              className="font-mono"
            />
          )}
        </Medan>
      </div>

      <Medan
        label="Keluhan"
        petunjuk="Sebutkan kondisi barang saat kotak dibuka, minimal sepuluh karakter."
        wajib
        className="mt-5 max-w-[42rem]"
      >
        {(alat) => (
          <AreaTeks
            {...alat}
            minLength={10}
            maxLength={500}
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Sepertiga isi krat layu dan berair saat dibuka…"
          />
        )}
      </Medan>

      <Medan
        label="Foto barang"
        petunjuk="Satu foto yang memperlihatkan kondisi yang Anda keluhkan."
        galat={galatFoto || undefined}
        wajib
        className="mt-5 max-w-[28rem]"
      >
        {(alat) => (
          <Berkas
            {...alat}
            ikon={Camera}
            accept="image/*"
            capture="environment"
            nama={berkas?.name ?? null}
            placeholder="Ambil foto atau pilih berkas"
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
        )}
      </Medan>

      {galat ? (
        <Galat judul="Klaim tidak terkirim" className="mt-5 max-w-[42rem]">
          {galat}
        </Galat>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Tombol type="submit" sibuk={proses} labelSibuk="Mengirim…">
          Kirim klaim
        </Tombol>
        <Tombol type="button" rupa="sunyi" onClick={onBatal} disabled={proses}>
          Batal
        </Tombol>
      </div>
    </form>
  );
}
