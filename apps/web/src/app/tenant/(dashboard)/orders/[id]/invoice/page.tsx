"use client";

import React, { useEffect, useState } from "react";
import type { TenantOrderDetail } from "@agro-os/shared";
import { GalatApi, ambilPesananTenantSatu } from "@/lib/api";
import { angka, rupiah, tanggalPanjang } from "@/lib/format-id";
import { Galat, Halaman, Label, Memuat, Sunyi, TautanKembali, Tombol } from "@/ui";

/**
 * TN-23 — Surat jalan / rincian pengiriman untuk Tenant.
 *
 * Yang tercantum HANYA bagian milik Tenant ini — satu pengiriman bisa memuat item beberapa
 * Tenant sekaligus, dan API memang sudah menyaringnya. Ongkir dan add-on laporan tidak ikut:
 * keduanya milik pembeli terhadap AgroUs, bukan pendapatan Tenant, jadi mencantumkannya di
 * sini akan salah dibaca sebagai bagian yang akan diterima.
 *
 * MIGRASI DUNIA, dan halaman inilah yang paling pantas mendapatkannya: ia satu-satunya layar
 * di aplikasi yang memang DICETAK. Dunia Label Sertifikasi lahir dari dokumen cetak — kertas
 * dingin, tinta intaglio, aturan garis, nol bayangan, nol sudut membulat — jadi di sini ia
 * bukan tema yang ditempelkan melainkan bentuk aslinya.
 *
 * Konsekuensi praktisnya diurus: kendali layar memakai `print:hidden`, dan tabelnya mengikuti
 * aturan tabel dunia ini — kepala 10px `tracking-cap`, satu garis tinta di bawah kepala,
 * baris dipisah hairline `kertas-garis`, tanpa zebra dan tanpa garis sel.
 */
export default function TenantInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: shipmentId } = React.use(params);

  const [pesanan, setPesanan] = useState<TenantOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilPesananTenantSatu(shipmentId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [shipmentId]);

  const kembali = (
    <TautanKembali href={`/tenant/orders/${shipmentId}`}>Rincian pesanan</TautanKembali>
  );

  if (memuat) {
    return (
      <Halaman lebar="sempit" judul="Surat jalan" kembali={kembali}>
        <Memuat baris={4} label="Memuat surat jalan" />
      </Halaman>
    );
  }

  if (galat || !pesanan) {
    return (
      <Halaman lebar="sempit" judul="Surat jalan" kembali={kembali}>
        <Galat judul="Surat jalan tidak dapat dimuat">
          {galat || "Pesanan tidak ditemukan."} Pesanannya tetap tercatat di server — muat
          ulang halaman untuk mencoba lagi.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      lebar="sempit"
      kembali={<span className="print:hidden">{kembali}</span>}
      judul="Surat jalan"
      pengantar={`Nomor ${pesanan.shipmentId.slice(0, 8).toUpperCase()} · dicetak untuk arsip Anda dan untuk dibawa kurir.`}
      aksi={
        <Tombol rupa="kedua" ukuran="sm" onClick={() => window.print()} className="print:hidden">
          Cetak
        </Tombol>
      }
    >
      {/* Kolom identitas — perangkat sertifikat dipakai apa adanya: aturan tipis di atas
          tiap kolom, label kecil ber-tracking, nilai di bawahnya. */}
      <dl className="grid gap-x-10 gap-y-6 border-t-2 border-tinta pt-5 sm:grid-cols-2">
        <div>
          <Label as="dt">Pembeli</Label>
          <dd className="mt-1.5 text-[15px] text-tinta">{pesanan.buyerName}</dd>
          <dd className="mt-0.5 text-[13px] text-tinta-samar">{pesanan.zoneName}</dd>
        </div>
        <div>
          <Label as="dt">Diterima oleh</Label>
          <dd className="mt-1.5 text-[15px] text-tinta">{pesanan.recipient.name}</dd>
          <dd className="mt-0.5 font-mono text-[13px] text-tinta-samar">
            {pesanan.recipient.phone}
          </dd>
          <dd className="mt-0.5 text-[13px] text-tinta-samar">
            Jam terima {pesanan.recipient.receivingHours}
          </dd>
          {pesanan.recipient.landmark ? (
            <dd className="mt-0.5 text-[13px] text-tinta-samar">{pesanan.recipient.landmark}</dd>
          ) : null}
        </div>
        <div>
          <Label as="dt">Dipesan</Label>
          <dd className="mt-1.5 font-mono text-[15px] text-tinta">
            {tanggalPanjang(pesanan.createdAt)}
          </dd>
        </div>
        <div>
          <Label as="dt">Siap kirim</Label>
          <dd className="mt-1.5 font-mono text-[15px] text-tinta">
            {tanggalPanjang(pesanan.readyDate)}
          </dd>
        </div>
      </dl>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-tinta">
              <th className="pb-3 text-[10px] font-semibold uppercase tracking-cap text-tinta-samar">
                Produk
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-cap text-tinta-samar">
                Box
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-cap text-tinta-samar">
                Harga
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-cap text-tinta-samar">
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {pesanan.lines.map((l) => {
              const kurang = l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox;
              return (
                <tr key={l.orderItemId} className="border-b border-kertas-garis align-top">
                  <td className="py-4">
                    <div className="max-w-[36ch] text-[15px] text-tinta">{l.productName}</div>
                    <div className="mt-0.5 text-[13px] text-tinta-samar">Grade {l.grade}</div>
                  </td>
                  <td className="py-4 text-right font-mono text-[15px] text-tinta">
                    {kurang ? (
                      <>
                        <span className="text-jambu">{angka(l.qtyBoxFulfilled as number)}</span>
                        <span className="text-tinta-samar">/{angka(l.qtyBox)}</span>
                      </>
                    ) : (
                      angka(l.qtyBox)
                    )}
                  </td>
                  <td className="py-4 text-right font-mono text-[15px] text-tinta">
                    {rupiah(l.unitPriceLocked)}
                  </td>
                  <td className="py-4 text-right font-mono text-[15px] text-tinta">
                    {rupiah(l.subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-2 border-tinta pt-4">
        <Label>Nilai bagian Anda</Label>
        <span className="font-mono text-[26px] leading-none text-tinta">
          {rupiah(pesanan.subtotal)}
        </span>
      </div>

      <Sunyi className="mt-4 max-w-[68ch] text-[13px]">
        Nilai di atas belum termasuk ongkos kirim dan add-on laporan ketertelusuran — keduanya
        milik pembeli terhadap AgroUs, bukan bagian Tenant. Pencairan dana berjalan otomatis
        setelah jendela klaim mutu berakhir.
      </Sunyi>

      {/* Blok tanda tangan: perangkat dokumen yang paling tua, dan satu-satunya bagian
          halaman ini yang gunanya justru muncul setelah dicetak. */}
      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        <div>
          <Label>Diserahkan oleh</Label>
          <div className="mt-14 border-t border-tinta pt-2">
            <Sunyi className="text-[12px]">Nama terang &amp; tanda tangan</Sunyi>
          </div>
        </div>
        <div>
          <Label>Diterima oleh</Label>
          <div className="mt-14 border-t border-tinta pt-2">
            <Sunyi className="text-[12px]">{pesanan.recipient.name}</Sunyi>
          </div>
        </div>
      </div>
    </Halaman>
  );
}
