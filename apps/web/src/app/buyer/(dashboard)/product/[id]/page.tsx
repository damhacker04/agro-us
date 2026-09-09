"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { ambilNdvi, ambilProduk, ambilTimeline, ambilVerifikasi } from "@/lib/api";
import { bacaKeranjang, tambahKeKeranjang } from "@/lib/keranjang";
import { angka, jamWib, rupiah, tanggalPanjang, tanggalPendek } from "@/lib/format-id";
import type {
  CatalogItem,
  NdviSeries,
  TimelineNodeResponse,
  TimelineVerifyResponse,
} from "@agro-os/shared";
import { KEGIATAN } from "@/components/kegiatan";
import { KATEGORI } from "@/components/komoditas";
import { FotoBukti } from "@/components/foto-bukti";
import { KurvaNdviBatch } from "@/components/kurva-ndvi-batch";
import { PilVerifikasi, STATUS_MENTAH } from "@/components/tanda-verifikasi";
import {
  BarisData,
  Deret,
  Galat,
  Halaman,
  Ikon,
  Label,
  Masukan,
  Medan,
  Memuat,
  Nilai,
  Panel,
  Pil,
  Prosa,
  Sunyi,
  Tanda,
  TautanKembali,
  Tombol,
  TombolTaut,
} from "@/ui";

/**
 * BY-3b — Rincian batch. Halaman yang menentukan keputusan beli.
 *
 * MIGRASI DUNIA, dan yang dibongkar bukan warnanya melainkan ISINYA. Versi sebelumnya
 * memuat satu blok spesifikasi yang seluruhnya diketik di kode: Brix 4,5–5,5%, "suhu
 * penyimpanan 10–12°C", "7–10 hari (Chiller)", dimensi krat, "Gudang Konsolidasi Malang",
 * tiga foto stok Unsplash, dan kartu "Terverifikasi AI · Akurasi Biomassa 92%".
 *
 * Dua di antaranya bukan sekadar data karangan, melainkan janji yang bertentangan dengan
 * batasan produk: komoditas MVP dibatasi yang tahan suhu ambien JUSTRU karena tidak ada
 * rantai dingin, jadi halaman yang menjanjikan chiller menjual sesuatu yang tidak bisa
 * ditepati. Dan verifikasi satelit belum menyala di produksi, jadi "Terverifikasi AI 92%"
 * adalah klaim kepercayaan tanpa penopang — persis hal yang produk ini ada untuk menolak.
 * Semuanya dibuang. Yang tersisa hanya yang benar-benar dikirim server, dan yang belum ada
 * dinyatakan belum ada.
 *
 * Tab juga dibuang. Dua pertiga bukti dulu tersembunyi di balik klik pada halaman yang
 * seluruh nilai jualnya "bukti bisa diperiksa sendiri". Sekarang satu dokumen menggulir —
 * sertifikat, citra, rantai — dengan panel keputusan beli yang lengket di sisi kanan
 * supaya bukti tidak perlu ditukar dengan tombolnya.
 */

const HARI = 86_400_000;
const selisihHari = (dari: string, ke: string) =>
  Math.round((new Date(ke).getTime() - new Date(dari).getTime()) / HARI);

/** "3 hari lebih awal" / "2 hari lebih lambat" / "tanggal yang sama". */
function bandingTanggal(diklaim: string, terdeteksi: string): string {
  const d = selisihHari(diklaim, terdeteksi);
  if (d === 0) return "Tanggal yang sama";
  return `${Math.abs(d)} hari lebih ${d < 0 ? "awal" : "lambat"} dari klaim`;
}

function IsiHalamanProduk({ batchId }: { batchId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [nodes, setNodes] = useState<TimelineNodeResponse[]>([]);
  const [verify, setVerify] = useState<TimelineVerifyResponse | null>(null);
  const [ndvi, setNdvi] = useState<NdviSeries | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  // Disimpan sebagai teks supaya isian bisa dikosongkan saat mengetik ulang, tetapi DIJEPIT
  // ke sisa kuota pada tiap ketukan: nilai pesanan di bawahnya dihitung dari angka yang sama
  // dengan yang terbaca di kotaknya, jadi keduanya tidak pernah menyatakan hal berbeda.
  const [jumlahTeks, setJumlahTeks] = useState("1");

  // Zona menentukan ongkir dan minimum pesanan, jadi keranjang menyimpannya per baris.
  // Tautan dari katalog membawanya; tautan dalam (mis. dari riwayat) tidak, dan zona yang
  // sudah ada di keranjang menjadi cadangannya. Bila keduanya kosong, halaman ini TIDAK
  // menebak — ia mengirim pembeli memilih wilayah dulu.
  const [zonaKeranjang, setZonaKeranjang] = useState<string | null>(null);
  useEffect(() => setZonaKeranjang(bacaKeranjang()[0]?.zoneId ?? null), []);
  const zoneId = searchParams.get("zoneId") ?? zonaKeranjang;
  const kota = searchParams.get("city") ?? "";
  const hrefKatalog = zoneId
    ? `/buyer/catalog?zoneId=${zoneId}${kota ? `&city=${encodeURIComponent(kota)}` : ""}`
    : "/buyer/region";

  useEffect(() => {
    // Produk WAJIB ada; timeline, verifikasi, dan NDVI boleh kosong — batch baru memang
    // belum punya catatan, dan kegagalannya tidak boleh mengosongkan seluruh halaman.
    ambilProduk(batchId)
      .then(setItem)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Batch tidak ditemukan"))
      .finally(() => setMemuat(false));
    ambilTimeline(batchId)
      .then(setNodes)
      .catch(() => setNodes([]));
    ambilVerifikasi(batchId)
      .then(setVerify)
      .catch(() => setVerify(null));
    ambilNdvi(batchId)
      .then(setNdvi)
      .catch(() => setNdvi(null));
  }, [batchId]);

  if (memuat) {
    return (
      <Halaman judul="Rincian batch">
        <Memuat baris={5} label="Memuat rincian batch" />
      </Halaman>
    );
  }

  if (galat || !item) {
    return (
      <Halaman judul="Rincian batch" kembali={<TautanKembali href={hrefKatalog}>Katalog pasokan</TautanKembali>}>
        <Galat
          judul="Batch tidak dapat dimuat"
          aksi={<TombolTaut href={hrefKatalog} rupa="kedua" ukuran="sm">Kembali ke katalog</TombolTaut>}
        >
          {galat ?? "Batch tidak ditemukan."} Kuota yang sudah habis atau ditutup Tenant memang
          hilang dari katalog — coba muat ulang katalog zona Anda.
        </Galat>
      </Halaman>
    );
  }

  const habis = item.quotaBoxAvailable <= 0;
  const box = Math.min(Math.max(Math.floor(Number(jumlahTeks) || 1), 1), Math.max(item.quotaBoxAvailable, 1));
  const nilaiPesanan = box * item.lockedPrice;
  const mentah = STATUS_MENTAH[item.verificationStatus];
  const terukur = ndvi?.points.filter((p) => p.ndvi !== null).length ?? 0;
  // Dua titik adalah minimum sebuah garis. Di bawah itu kurvanya tidak digambar, dan
  // ketiadaannya dinyatakan — sumbu kosong terbaca sebagai gagal memuat.
  const adaKurva = terukur >= 2;

  return (
    <Halaman
      kembali={<TautanKembali href={hrefKatalog}>Katalog pasokan</TautanKembali>}
      judul={item.productName}
      pengantar={`Grade ${item.grade} · ${item.commodity.name} · dibuka ${item.tenant.companyName}. Seluruh angka di halaman ini berasal dari catatan batch, bukan dari deskripsi penjual.`}
      aksi={<PilVerifikasi badge={item.badge} />}
    >
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        {/* Panel keputusan berdiri lebih dulu di DOM supaya di ponsel ia tidak terkubur di
            bawah seluruh bukti, lalu ditempatkan ke kolom kanan pada layar lebar. */}
        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1">
          <Panel nada="utama" label="Harga terkunci">
            <div className="-mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-[26px] leading-none text-tinta">
                {rupiah(item.lockedPrice)}
              </span>
              <span className="text-[13px] text-tinta-samar">
                / box · {item.qtyKgPerBox} kg
              </span>
            </div>

            {habis ? (
              <>
                <div className="mt-5 border-t-2 border-jambu pt-3">
                  <Label className="text-jambu">Kuota habis</Label>
                  <Prosa className="mt-1.5 text-[14px]">
                    Seluruh kuota batch ini sudah terjual. Kuota dibuka per musim tanam, jadi
                    Tenant yang sama biasanya membukanya lagi untuk panen berikutnya.
                  </Prosa>
                </div>
                <TombolTaut href={hrefKatalog} rupa="kedua" penuh className="mt-5">
                  Lihat kuota lain
                </TombolTaut>
              </>
            ) : (
              <>
                <Medan
                  label="Jumlah box"
                  petunjuk={`Sisa kuota ${angka(item.quotaBoxAvailable)} box.`}
                  className="mt-5"
                >
                  {(alat) => (
                    <Masukan
                      {...alat}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={item.quotaBoxAvailable}
                      value={jumlahTeks}
                      onChange={(e) => {
                        const t = e.target.value;
                        if (t === "") return setJumlahTeks("");
                        setJumlahTeks(
                          String(
                            Math.min(Math.max(Math.floor(Number(t) || 1), 1), item.quotaBoxAvailable),
                          ),
                        );
                      }}
                      onBlur={() => setJumlahTeks(String(box))}
                      className="font-mono"
                    />
                  )}
                </Medan>

                <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-tinta pt-3">
                  <Label>Nilai pesanan</Label>
                  <Nilai ukuran="lg" className="text-tinta">
                    {rupiah(nilaiPesanan)}
                  </Nilai>
                </div>

                {zoneId ? (
                  <Tombol
                    penuh
                    className="mt-5"
                    onClick={() => {
                      tambahKeKeranjang(item, zoneId, box);
                      router.push("/buyer/cart");
                    }}
                  >
                    <Ikon dari={ShoppingCart} ukuran="sm" />
                    Ke keranjang
                  </Tombol>
                ) : (
                  <>
                    <TombolTaut href="/buyer/region" penuh className="mt-5">
                      Pilih wilayah dulu
                    </TombolTaut>
                    <Sunyi className="mt-2 text-[12px]">
                      Ongkir dan nilai minimum pesanan berlaku per zona, jadi keranjang perlu
                      tahu wilayah antarnya sebelum batch ini bisa dimasukkan.
                    </Sunyi>
                  </>
                )}

                <Prosa className="mt-4 text-[12px]">
                  Dana ditahan di escrow, bukan diteruskan ke produsen. Ia baru berpindah
                  setelah barang Anda terima dan jendela klaim mutu berakhir.
                </Prosa>
              </>
            )}
          </Panel>
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
          {/* ---------- Sertifikat batch ---------- */}
          <Panel
            label={`Batch · ${batchId.slice(0, 8).toUpperCase()}`}
            judul="Yang tercatat pada kuota ini"
          >
            <Deret kolom={4} as="dl">
              <BarisData label="Grade">{item.grade}</BarisData>
              <BarisData label="Isi per box">{item.qtyKgPerBox} kg</BarisData>
              <BarisData label="Sisa kuota">{angka(item.quotaBoxAvailable)} box</BarisData>
              <BarisData label="Panen diklaim">
                {tanggalPanjang(item.claimedHarvestDate)}
              </BarisData>
              <BarisData label="Komoditas" prosa>
                {item.commodity.name}
              </BarisData>
              <BarisData label="Kategori" prosa>
                {KATEGORI[item.commodity.category]}
              </BarisData>
              <BarisData label="Produsen" prosa>
                {item.tenant.companyName}
              </BarisData>
              <BarisData label="Harga terkunci">{rupiah(item.lockedPrice)}</BarisData>
            </Deret>
            <Sunyi className="mt-6 max-w-[68ch] text-[13px]">
              Harga dan jumlah batch ini terkunci sejak kuota dibuka, sebelum benihnya ditanam.
              Keduanya tidak berubah oleh harga pasar saat panen — itulah yang Anda beli di
              muka, dan itulah yang ditanggung produsen.
            </Sunyi>
          </Panel>

          {/* ---------- Bukti satelit ---------- */}
          <Panel
            nada={mentah.nada}
            label="Bukti satelit"
            judul={mentah.teks}
            aksi={
              ndvi && ndvi.points.length > 0 ? (
                <Pil nada={mentah.nada} garis>
                  Sentinel-2 · {ndvi.points.length} lintasan
                </Pil>
              ) : null
            }
          >
            <Prosa className="text-[14px]">{mentah.jelas}</Prosa>

            {ndvi ? (
              <>
                <Deret kolom={4} as="dl" className="mt-7">
                  <BarisData label="Tanam diklaim">
                    {ndvi.claimedPlantDate ? tanggalPanjang(ndvi.claimedPlantDate) : "Belum dicatat"}
                  </BarisData>
                  <BarisData label="Tanam terdeteksi">
                    {ndvi.detectedPlantDate ? (
                      tanggalPanjang(ndvi.detectedPlantDate)
                    ) : (
                      <TidakTerdeteksi />
                    )}
                  </BarisData>
                  <BarisData label="Panen diklaim">
                    {tanggalPanjang(ndvi.claimedHarvestDate)}
                  </BarisData>
                  <BarisData label="Panen terdeteksi">
                    {ndvi.detectedHarvestDate ? (
                      tanggalPanjang(ndvi.detectedHarvestDate)
                    ) : (
                      <TidakTerdeteksi />
                    )}
                  </BarisData>
                </Deret>

                {ndvi.detectedHarvestDate ? (
                  <p className="mt-5 max-w-[58ch] text-[14px] leading-relaxed text-tinta-lembut">
                    Citra menempatkan panen{" "}
                    <span className="font-semibold text-tinta">
                      {bandingTanggal(ndvi.claimedHarvestDate, ndvi.detectedHarvestDate).toLowerCase()}
                    </span>
                    . Selisihnya ditampilkan apa adanya, tanpa kesimpulan: kurva berbalik pada
                    tanggal tertentu, dan Tenant mencatat tanggal lain.
                  </p>
                ) : null}

                {/* Tiga keadaan, bukan dua. Nol lintasan berarti belum ada citra sama sekali;
                    satu lintasan berarti ada citra tetapi belum ada garis. Menyamakan
                    keduanya membuat halaman menyebut "sisanya tertutup awan" pada batch yang
                    tidak punya satu pun lintasan — menyalahkan cuaca atas ketiadaan data. */}
                {ndvi.points.length === 0 ? (
                  <Sunyi className="mt-6 max-w-[58ch] border-t border-kertas-garis pt-3">
                    Belum ada lintasan Sentinel-2 yang tercatat untuk batch ini. Batch yang baru
                    dibuka memang belum punya citra sampai musim tanamnya berjalan — ini bukan
                    temuan tentang produsennya.
                  </Sunyi>
                ) : adaKurva ? (
                  <>
                    <KurvaNdviBatch deret={ndvi} className="mt-8" />

                    {/* Batas dinyatakan DI TEMPAT klaimnya dibuat, bukan dikumpulkan jadi
                        daftar kekurangan yang ditaruh menjelang tombol beli. */}
                    <p className="mt-6 max-w-[58ch] border-t border-kertas-garis pt-3 font-mono text-[11px] leading-relaxed text-tinta-samar">
                      <span className="text-stempel">†</span> Pipeline Sentinel-2 nyata dan
                      teruji, tetapi belum ditarik langsung di produksi. Deret di atas adalah
                      data contoh, dan angka kalibrasinya masih estimasi yang belum divalidasi
                      lapangan.
                    </p>
                  </>
                ) : (
                  <Sunyi className="mt-6 max-w-[58ch] border-t border-kertas-garis pt-3">
                    Baru {terukur} dari {ndvi.points.length} lintasan yang terukur — belum cukup
                    untuk menggambar kurva. Sisanya tertutup awan, dan menebak nilainya sama saja
                    dengan mengarang bukti.
                  </Sunyi>
                )}
              </>
            ) : (
              <div className="mt-6 border-t-2 border-kertas-garis pt-3">
                <Label>Belum ada deret</Label>
                <Prosa className="mt-1.5 text-[14px]">
                  Belum ada lintasan Sentinel-2 yang tercatat untuk batch ini. Batch yang baru
                  dibuka memang belum punya citra sampai musim tanamnya berjalan — ini bukan
                  temuan tentang produsennya.
                </Prosa>
              </div>
            )}
          </Panel>

          {/* ---------- Verified Timeline ---------- */}
          <Panel
            nada={verify && !verify.intact ? "awas" : "netral"}
            label="Verified Timeline"
            judul="Kegiatan lapangan, berantai hash"
            /* Rantai kosong TIDAK memakai pil "rantai utuh". Nol catatan yang menyatakan
               dirinya utuh adalah klaim yang benar secara teknis dan menyesatkan secara
               praktis — sama seperti memajang hash akar yang sebenarnya SHA-256 dari string
               kosong sebagai kalau-kalau itu bukti. */
            aksi={
              verify && nodes.length > 0 ? (
                <Pil nada={verify.intact ? "utama" : "awas"} garis={verify.intact}>
                  <Tanda jenis={verify.intact ? "penuh" : "tidak"} />
                  {verify.intact ? `Rantai utuh · ${verify.nodeCount} catatan` : "Rantai tidak utuh"}
                </Pil>
              ) : null
            }
          >
            {nodes.length === 0 ? (
              <div className="border-t-2 border-kertas-garis pt-3">
                <Label>Belum ada catatan</Label>
                <Prosa className="mt-1.5 text-[14px]">
                  Tenant belum mencatat kegiatan apa pun untuk batch ini. Catatan pertama
                  biasanya muncul saat penyiapan lahan, jadi kuota yang baru dibuka memang
                  kosong di sini. Rantai buktinya mulai terbentuk sejak catatan itu.
                </Prosa>
              </div>
            ) : (
              <>
                <Prosa className="text-[14px]">
                  {verify && !verify.intact
                    ? "Hitung ulang rantai SHA-256 dari isi node tidak cocok dengan hash tersimpan: ada isi yang berubah setelah dicatat. Temuan ini ditampilkan, bukan disembunyikan."
                    : "Klaim keutuhan di atas bukan tulisan tetap. Server menghitung ulang seluruh rantai SHA-256 dari ISI tiap node setiap kali halaman ini dibuka — isi yang pernah diubah, bahkan lewat SQL langsung, ketahuan di situ."}
                </Prosa>

                {verify ? (
                  <dl className="mt-6 space-y-4">
                    <div className="border-t border-kertas-garis pt-2.5">
                      <Label as="dt">Hash akar</Label>
                      <dd className="mt-1 break-all font-mono text-[12px] leading-relaxed text-tinta-lembut">
                        {verify.rootHash}
                      </dd>
                    </div>
                    <div className="border-t border-kertas-garis pt-2.5">
                      <Label as="dt">Jangkar eksternal</Label>
                      <dd className="mt-1 font-mono text-[12px] leading-relaxed text-tinta-lembut">
                        {verify.anchor
                          ? `${tanggalPanjang(verify.anchor.anchorDate)}${
                              verify.anchor.externalRef ? ` · ${verify.anchor.externalRef}` : ""
                            }`
                          : "Belum dipublikasikan"}
                      </dd>
                    </div>
                  </dl>
                ) : null}

                <ol className="mt-7">
                  {nodes.map((n) => (
                    <BarisNode key={n.id} n={n} />
                  ))}
                </ol>
              </>
            )}
          </Panel>
        </div>
      </div>
    </Halaman>
  );
}

/** "Belum terdeteksi" berhak terbaca berbeda dari "bermasalah" — prinsip 1. */
function TidakTerdeteksi() {
  return (
    <span className="inline-flex items-center gap-1.5 text-tinta-samar">
      <Tanda jenis="tidak" />
      <span className="font-sertifikat text-[14px]">Belum terdeteksi</span>
    </span>
  );
}

/**
 * Satu node sebagai baris sertifikat bernomor, bukan kartu di atas garis waktu.
 *
 * Rangkaian kartu berbayang dengan titik bulat di kiri adalah bentuk yang paling jauh dari
 * dokumen beradius nol ini — dan bentuk itu juga menyembunyikan hal terpenting: urutan.
 * Nomor urut node adalah bagian dari buktinya, karena rantai hash mengunci urutannya.
 */
function BarisNode({ n }: { n: TimelineNodeResponse }) {
  const ralat = n.ralatOfId !== null;
  return (
    <li className="grid gap-x-6 gap-y-3 border-t border-kertas-garis py-6 md:grid-cols-[3.5rem_minmax(0,1fr)]">
      <div className="font-mono text-[13px] leading-none text-tinta-samar">
        {String(n.seq).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
          <h3 className="text-[15px] font-bold text-tinta">
            {KEGIATAN[n.activityType]}
            {ralat ? (
              <Pil nada="awas" className="ml-2.5 align-[0.15em]">
                Ralat
              </Pil>
            ) : null}
          </h3>
          <span className="font-mono text-[12px] text-tinta-samar">
            {tanggalPendek(n.deviceTs)} · {jamWib(n.deviceTs)} WIB
          </span>
        </div>

        <p className="mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-tinta-lembut">
          {n.description}
        </p>

        {/* Ditampilkan apa adanya ke pembeli (FR-4.3), dengan alasan Tenant ikut terbaca —
            tanpa alasannya, koordinat di luar poligon hanya jadi tuduhan tanpa jawaban. */}
        {n.outsidePolygonReason ? (
          <div className="mt-3 border-t-2 border-jambu pt-2">
            <Label className="text-jambu">Titik di luar batas lahan</Label>
            <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-tinta-lembut">
              Alasan Tenant: {n.outsidePolygonReason}
            </p>
          </div>
        ) : null}

        {n.photos.length ? (
          <ul className="mt-4 flex flex-wrap gap-3">
            {n.photos.map((f) => (
              <li key={f.sha256}>
                <FotoBukti foto={f} alt={`Foto bukti ${KEGIATAN[n.activityType].toLowerCase()}`} />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-tinta-samar">
          <span>
            {n.gps.lat.toFixed(5)}, {n.gps.lng.toFixed(5)}
          </span>
          <span className="break-all">hash {n.nodeHash.slice(0, 32)}</span>
        </div>
      </div>
    </li>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = React.use(params);
  return (
    <Suspense
      fallback={
        <Halaman judul="Rincian batch">
          <Memuat baris={5} label="Memuat rincian batch" />
        </Halaman>
      }
    >
      <IsiHalamanProduk batchId={batchId} />
    </Suspense>
  );
}
