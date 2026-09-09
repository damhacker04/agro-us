"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GalatApi, ambilBatchTenant, ambilProdukTenant } from "@/lib/api";
import { angka, desimal, rupiah, tanggalPanjang } from "@/lib/format-id";
import type { BatchResponse, ProductResponse } from "@agro-os/shared";
import {
  Deret,
  Galat,
  Halaman,
  Kosong,
  Masukan,
  Memuat,
  Panel,
  Pil,
  Sunyi,
  TombolTaut,
  Ubin,
} from "@/ui";

/**
 * TN-13 — Katalog produk Tenant.
 *
 * MIGRASI DUNIA, dan yang terbesar adalah membuang GAMBAR YANG TIDAK ADA. Tiap kartu
 * sebelumnya dipuncaki blok abu-abu setinggi 192px berisi ikon gambar dan nama komoditas —
 * tempat foto produk yang tidak pernah ada isinya. Itu separuh tinggi kartu yang dihabiskan
 * untuk mengumumkan ketiadaan, sementara harga, isi box, dan sisa kuota berdesakan di
 * bawahnya. Penggantinya bukan gambar lain melainkan ISI: yang dicari Tenant di layar ini
 * adalah produk mana yang sedang bisa dipesan dan berapa harganya, dan keduanya kini
 * terbaca tanpa menggulir.
 *
 * Tombol ubah juga berhenti jadi glif tanpa nama — dulu hanya ikon pensil di kotak hijau,
 * tanpa teks maupun `aria-label`, jadi bagi pembaca layar ia tombol tanpa nama pada satu-
 * satunya jalan menuju perubahan produk.
 */
export default function TenantCatalogPage() {
  const [produk, setProduk] = useState<ProductResponse[]>([]);
  const [batch, setBatch] = useState<BatchResponse[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [cari, setCari] = useState("");

  useEffect(() => {
    Promise.all([ambilProdukTenant(), ambilBatchTenant()])
      .then(([p, b]) => {
        setProduk(p);
        setBatch(b);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Produk gagal dimuat"))
      .finally(() => setMemuat(false));
  }, []);

  /**
   * Sisa kuota yang benar-benar bisa dipesan, dijumlahkan dari batch yang masih
   * berjalan. Kolom `stockBox` pada produk TIDAK dipakai: itu stok gudang yang diisi
   * manual dan selalu 0 di model Pre-Order — barangnya memang belum ada.
   */
  const sisaKuota = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of batch) {
      if (b.productionStatus !== "GROWING" && b.productionStatus !== "PLANNING") continue;
      const sisa = Math.max(b.quotaBoxTotal - b.quotaBoxSold, 0);
      m.set(b.productId, (m.get(b.productId) ?? 0) + sisa);
    }
    return m;
  }, [batch]);

  // Pencarian mencakup nama komoditas, bukan hanya nama produk: Tenant menamai
  // produknya bebas ("Caisim Segar Pujon"), sedangkan yang diingat orang biasanya
  // komoditasnya ("sawi").
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return produk;
    return produk.filter(
      (p) => p.name.toLowerCase().includes(q) || p.commodity.name.toLowerCase().includes(q),
    );
  }, [produk, cari]);

  if (memuat) {
    return (
      <Halaman judul="Katalog produk">
        <Memuat baris={4} label="Memuat produk" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Katalog produk">
        <Galat judul="Produk gagal dimuat">
          {galat} Produk Anda tetap tersimpan di server — muat ulang halaman untuk mencoba
          lagi.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      judul="Katalog produk"
      pengantar="Produk adalah apa yang Anda tawarkan; kuota Pre-Order adalah yang membuatnya bisa dipesan. Selama belum ada kuota terbuka, produk di sini tidak tampil di katalog pembeli."
      aksi={
        <>
          <Masukan
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari sawi, tomat, cabai…"
            aria-label="Cari produk"
            className="w-full sm:w-64"
          />
          <TombolTaut href="/tenant/catalog/edit" ukuran="sm">
            Tambah produk
          </TombolTaut>
        </>
      }
    >
      {tampil.length === 0 ? (
        <Kosong
          judul={produk.length === 0 ? "Belum ada produk" : "Tidak ada yang cocok"}
          aksi={
            produk.length === 0 ? (
              <TombolTaut href="/tenant/catalog/edit" ukuran="sm">
                Tambah produk pertama
              </TombolTaut>
            ) : null
          }
        >
          {produk.length === 0
            ? "Produk memuat nama, grade, harga, dan isi per box — dasar yang dipakai tiap kuota Pre-Order yang Anda buka nanti. Buat satu dulu, lalu buka kuotanya dari halaman Batch."
            : `Tidak ada produk yang namanya maupun komoditasnya memuat “${cari}”. Coba kata yang lebih pendek, atau nama komoditasnya.`}
        </Kosong>
      ) : (
        <div className="space-y-8">
          {tampil.map((p) => (
            <KartuProduk key={p.id} p={p} sisa={sisaKuota.get(p.id) ?? 0} />
          ))}
        </div>
      )}
    </Halaman>
  );
}

function KartuProduk({ p, sisa }: { p: ProductResponse; sisa: number }) {
  const dijual = sisa > 0;

  return (
    <Panel
      nada={dijual ? "utama" : "netral"}
      label={`${p.commodity.name} · Grade ${p.grade}`}
      judul={p.name}
      aksi={
        <>
          <Pil nada={dijual ? "utama" : "netral"} garis={!dijual}>
            {dijual ? `Sisa ${angka(sisa)} box` : "Belum ada kuota terbuka"}
          </Pil>
          <TombolTaut href={`/tenant/catalog/edit?id=${p.id}`} rupa="kedua" ukuran="sm">
            Ubah produk
          </TombolTaut>
        </>
      }
    >
      <Deret kolom={3} as="dl">
        <Ubin label="Harga per box" nilai={rupiah(p.pricePerBox)} />
        <Ubin label="Isi per box" nilai={desimal(p.qtyKgPerBox, 0)} satuan="kg" />
        <Ubin label="Perkiraan panen" nilai={tanggalPanjang(p.estHarvestDate)} />
      </Deret>

      {p.description ? (
        <Sunyi className="mt-6 max-w-[68ch] text-[13px]">{p.description}</Sunyi>
      ) : null}

      {/* Dinyatakan sekali per kartu yang memang belum terjual, bukan sebagai peringatan:
          produk tanpa kuota bukan kesalahan, ia baru separuh jalan. */}
      {!dijual ? (
        <Sunyi className="mt-4 max-w-[68ch] text-[13px]">
          Produk ini belum tampil di katalog pembeli. Ia muncul begitu ada kuota Pre-Order
          yang terbuka untuknya.
        </Sunyi>
      ) : null}
    </Panel>
  );
}
