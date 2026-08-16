"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BuyerOrderDetail } from "@agro-os/shared";
import { GalatApi, ambilPesananSatu } from "@/lib/api";
import { rupiah, tanggalPendek } from "@/lib/format-id";
import { Galat, Halaman, Label, Memuat, Panel, Pil, Prosa, Sunyi, TombolTaut } from "@/ui";

/**
 * BY-10 — Pembayaran diterima.
 *
 * Cakram centang hijau berdiameter 64px di puncak halaman DIBUANG. Halaman ini bukan
 * perayaan: yang baru terjadi adalah uang pembeli berpindah ke escrow dan ditahan di sana,
 * dan kalimat itulah yang paling perlu mereka baca. Judulnya kini menyatakannya.
 *
 * `toLocaleDateString("id-ID")` diganti `tanggalPendek` — data ICU runtime berbeda antara
 * server dan peramban, dan selisih satu karakter membuang seluruh pohon React.
 */
function IsiHalaman() {
  const orderId = useSearchParams().get("pesanan") ?? "";

  const [pesanan, setPesanan] = useState<BuyerOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(Boolean(orderId));
  const [galat, setGalat] = useState("");

  useEffect(() => {
    if (!orderId) return;
    ambilPesananSatu(orderId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat pesanan"))
      .finally(() => setMemuat(false));
  }, [orderId]);

  return (
    <Halaman
      lebar="sempit"
      judul="Pembayaran diterima, dana ditahan di escrow"
      pengantar={
        pesanan
          ? `Pesanan ${pesanan.orderId.slice(0, 8).toUpperCase()} sudah terbayar. Uangnya belum sampai ke produsen.`
          : "Pembayaran Anda sudah tercatat. Uangnya belum sampai ke produsen."
      }
    >
      <Panel label="Status dana" judul="Ditahan sampai barang Anda terima" nada="utama">
        <Prosa className="text-[14px]">
          Dana{pesanan ? <span className="font-mono text-tinta"> {rupiah(pesanan.totalAmount)}</span> : ""}{" "}
          ditahan sistem, bukan diteruskan. Ia baru berpindah ke produsen setelah Anda
          mengonfirmasi penerimaan dan jendela klaim mutu berakhir — jadi selama tenggat itu
          Anda masih punya jalan bila barangnya tidak sesuai.
        </Prosa>
      </Panel>

      {memuat ? <Memuat baris={3} label="Memuat ringkasan pesanan" className="mt-8" /> : null}

      {galat ? (
        <Galat judul="Ringkasan pesanan gagal dimuat" className="mt-8">
          {galat} Pembayaran Anda tetap tercatat — buka halaman pesanan untuk melihat
          statusnya.
        </Galat>
      ) : null}

      {pesanan ? (
        <>
          <div className="mt-10">
            <Label className="mb-4">Rincian pesanan</Label>
            <ul>
              {pesanan.shipments.flatMap((s) =>
                s.lines.map((l) => (
                  <li
                    key={l.orderItemId}
                    className="flex justify-between gap-6 border-t border-kertas-garis py-3"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-tinta">
                        {l.productName}
                      </span>
                      <Sunyi className="mt-0.5 text-[12px]">
                        {l.tenantName} · <span className="font-mono">{rupiah(l.unitPriceLocked)}</span> ×{" "}
                        <span className="font-mono">{l.qtyBox}</span> box
                      </Sunyi>
                    </div>
                    <span className="shrink-0 font-mono text-[15px] text-tinta">
                      {rupiah(l.subtotal)}
                    </span>
                  </li>
                )),
              )}
            </ul>
            <div className="flex items-baseline justify-between gap-4 border-t border-tinta py-4">
              <span className="text-[15px] font-bold text-tinta">Total pembayaran</span>
              <span className="font-mono text-[22px] text-tinta">
                {rupiah(pesanan.totalAmount)}
              </span>
            </div>
            {/* Selisih total dengan jumlah item adalah ongkir dan add-on laporan.
                Rinciannya tidak ikut di kontrak detail pesanan, jadi tidak dikarang. */}
            <Sunyi className="text-[12px]">
              Selisih dengan jumlah baris di atas adalah ongkir dan tambahan laporan
              ketertelusuran, yang dirinci pada halaman pesanan.
            </Sunyi>
          </div>

          {/* Satu pesanan bisa jadi beberapa pengiriman — dikelompokkan per minggu
              panen (FR-2.4), masing-masing punya tanggal siapnya sendiri. */}
          <div className="mt-10 space-y-5">
            <Label>
              {pesanan.shipments.length} pengiriman, dipecah menurut minggu panen
            </Label>
            {pesanan.shipments.map((s, i) => (
              <Panel
                key={s.shipmentId}
                padat
                nada="kabar"
                label={`Pengiriman ${i + 1} dari ${pesanan.shipments.length}`}
                judul={`Perkiraan siap ${tanggalPendek(s.readyDate)}`}
                aksi={<Pil nada="kabar">{s.status.replace(/_/g, " ").toLowerCase()}</Pil>}
              >
                <Sunyi className="text-[13px]">
                  {s.lines.map((l) => l.productName).join(" · ")}
                </Sunyi>
              </Panel>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <TombolTaut href={pesanan ? `/buyer/orders/${pesanan.orderId}` : "/buyer/orders"}>
          Lihat status pesanan
        </TombolTaut>
        <TombolTaut href="/buyer/catalog" rupa="kedua">
          Kembali ke katalog
        </TombolTaut>
      </div>
    </Halaman>
  );
}

export default function BuyerPaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <Halaman lebar="sempit" judul="Pembayaran diterima">
          <Memuat baris={3} />
        </Halaman>
      }
    >
      <IsiHalaman />
    </Suspense>
  );
}
