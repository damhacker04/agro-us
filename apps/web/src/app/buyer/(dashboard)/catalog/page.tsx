"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { ambilKatalog } from "@/lib/api";
import { tambahKeKeranjang } from "@/lib/keranjang";
import { rupiah, tanggalPendek } from "@/lib/format-id";
import type { CatalogItem } from "@agro-os/shared";
import {
  Galat,
  Halaman,
  Ikon,
  Deret,
  Kosong,
  Label,
  Memuat,
  Nilai,
  Panel,
  Pil,
  Tanda,
  Tombol,
  type Nada,
} from "@/ui";

/**
 * BY-3 — Katalog per zona.
 *
 * MIGRASI DUNIA, dan yang terbesar bukan warnanya. Tiap kartu dulu dipuncaki blok gradien
 * setinggi 224px berisi nama komoditas dalam huruf putih — persegi berwarna yang berdiri di
 * tempat foto produk yang tidak ada. Itu dekorasi yang menempati bagian terpenting kartu.
 * Penggantinya bukan gambar lain melainkan ISI: tiap item berdiri sebagai potongan
 * sertifikat, dengan kolom bernomor yang sama seperti sertifikat penuh di halaman depan.
 * Pembeli institusional memilih dari tanggal panen, sisa kuota, dan dasar verifikasi —
 * bukan dari warna kotak.
 *
 * `toLocaleDateString("id-ID")` juga diganti `tanggalPendek`: ia bergantung pada data ICU
 * runtime, dan server serta peramban tidak selalu memuat data yang sama — selisih satu
 * karakter cukup untuk membuat React membuang seluruh pohon dengan galat hidrasi.
 */

/**
 * Tiga status verifikasi (FR-2.6).
 *
 * `BELUM_TERVERIFIKASI` sengaja TIDAK disembunyikan. Menurut FR-4.6 ketidaksesuaian
 * justru harus terlihat pembeli — katalog yang semuanya bertanda hijau tidak memberi
 * informasi apa pun, karena tidak ada pembandingnya.
 *
 * Ketiganya persis tiga-keadaan yang sudah punya tanda tergambar sendiri di sistem ini:
 * penuh, sebagian, tidak. Memakai kembali tanda itu — alih-alih mengarang perisai baru —
 * berarti pembeli yang sudah membaca blok cakupan di halaman depan tidak perlu belajar
 * kosakata kedua.
 */
const STATUS: Record<CatalogItem["badge"], { teks: string; nada: Nada; tanda: "penuh" | "sebagian" | "tidak" }> = {
  TERVERIFIKASI_SATELIT: { teks: "Terverifikasi satelit", nada: "utama", tanda: "penuh" },
  BUKTI_FOTO_SAJA: { teks: "Bukti foto saja", nada: "kabar", tanda: "sebagian" },
  BELUM_TERVERIFIKASI: { teks: "Belum terverifikasi", nada: "netral", tanda: "tidak" },
};

const URUT = [
  ["default", "Semua komoditas"],
  ["grade", "Grade A–Z"],
  ["harvest", "Tanggal panen"],
  ["price", "Harga termurah"],
] as const;

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const zoneId = searchParams.get("zoneId");
  const kota = searchParams.get("city") ?? "";
  const query = searchParams.get("q")?.toLowerCase() || "";

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [urut, setUrut] = useState<(typeof URUT)[number][0]>("default");

  useEffect(() => {
    // Katalog SELALU disaring per zona (FR-2.1) — tanpa zona, tidak ada yang bisa dipesan
    // karena ongkir dan minimum order dihitung per zona.
    if (!zoneId) {
      router.replace("/buyer/region");
      return;
    }
    ambilKatalog(zoneId)
      .then(setItems)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Gagal memuat katalog"))
      .finally(() => setMemuat(false));
  }, [zoneId, router]);

  const daftar = useMemo(() => {
    const hasil = items.filter((i) => i.productName.toLowerCase().includes(query));
    if (urut === "grade") hasil.sort((a, b) => a.grade.localeCompare(b.grade));
    else if (urut === "price") hasil.sort((a, b) => a.lockedPrice - b.lockedPrice);
    else if (urut === "harvest")
      hasil.sort((a, b) => a.claimedHarvestDate.localeCompare(b.claimedHarvestDate));
    return hasil;
  }, [items, query, urut]);

  if (memuat) {
    return (
      <Halaman judul="Katalog pasokan">
        <Memuat baris={4} label="Memuat katalog" />
      </Halaman>
    );
  }

  if (galat) {
    return (
      <Halaman judul="Katalog pasokan">
        <Galat judul="Katalog gagal dimuat">
          {galat} Server API mungkin sedang bangun dari mode tidur — coba muat ulang dalam 30
          detik.
        </Galat>
      </Halaman>
    );
  }

  return (
    <Halaman
      judul="Katalog pasokan"
      pengantar={`Kuota Pre-Order yang masih terbuka${kota ? ` di ${kota}` : ""}. Harga dan jumlahnya terkunci sejak sebelum tanam.`}
      aksi={
        <div className="flex flex-wrap items-center gap-2">
          <Label className="mr-1">Urutkan</Label>
          {URUT.map(([nilai, label]) => (
            <Tombol
              key={nilai}
              rupa={urut === nilai ? "utama" : "kedua"}
              ukuran="sm"
              aria-pressed={urut === nilai}
              onClick={() => setUrut(nilai)}
            >
              {label}
            </Tombol>
          ))}
        </div>
      }
    >
      {daftar.length === 0 ? (
        <Kosong
          judul={`Belum ada kuota terbuka di ${kota || "zona ini"}`}
          aksi={
            <Link
              href="/buyer/region"
              className="text-[15px] font-semibold text-ungu underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
            >
              Ganti wilayah layanan
            </Link>
          }
        >
          Kuota Pre-Order dibuka Tenant per musim tanam, jadi katalog kosong berarti musimnya
          belum dibuka di sini — bukan bahwa tidak ada produsen. Coba zona lain, atau kembali
          beberapa hari lagi.
        </Kosong>
      ) : (
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {daftar.map((item) => (
            <KartuKuota key={item.batchId} item={item} zoneId={zoneId!} />
          ))}
        </div>
      )}
    </Halaman>
  );
}

/**
 * Satu item katalog sebagai potongan sertifikat.
 *
 * Kartunya BUKAN lagi satu `<Link>` raksasa. Membungkus seluruh kartu dengan tautan memaksa
 * tombol keranjang di dalamnya memanggil `preventDefault` supaya kliknya tidak ikut
 * bernavigasi, dan menyerahkan satu target tautan sebesar kartu ke pembaca layar yang
 * membacakan seluruh isinya sebagai nama tautan. Sekarang judulnya yang jadi tautan, dan
 * tombolnya berdiri sendiri — dua target, masing-masing menamai tujuannya.
 */
function KartuKuota({ item, zoneId }: { item: CatalogItem; zoneId: string }) {
  const router = useRouter();
  const status = STATUS[item.badge];

  return (
    <Panel
      nada={status.nada}
      label={`Grade ${item.grade} · ${item.commodity.name}`}
      judul={
        <Link
          href={`/buyer/product/${item.batchId}`}
          className="underline-offset-4 transition-colors duration-150 hover:text-ungu hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ungu"
        >
          {item.productName}
        </Link>
      }
      aksi={
        <Pil nada={status.nada} garis={status.nada === "netral"}>
          <Tanda jenis={status.tanda} />
          {status.teks}
        </Pil>
      }
    >
      <Deret kolom={3} as="dl">
        <div className="border-t border-kertas-garis pt-2.5">
          <Label as="dt">Panen diklaim</Label>
          <dd className="mt-1 font-mono text-[14px] text-tinta">
            {tanggalPendek(item.claimedHarvestDate)}
          </dd>
        </div>
        <div className="border-t border-kertas-garis pt-2.5">
          <Label as="dt">Sisa kuota</Label>
          <dd className="mt-1 font-mono text-[14px] text-tinta">{item.quotaBoxAvailable} box</dd>
        </div>
        <div className="border-t border-kertas-garis pt-2.5">
          <Label as="dt">Produsen</Label>
          <dd className="mt-1 truncate text-[14px] text-tinta">{item.tenant.companyName}</dd>
        </div>
      </Deret>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-tinta pt-4">
        <div>
          <Label className="mb-1.5">Harga terkunci</Label>
          <Nilai ukuran="lg" className="text-tinta">
            {rupiah(item.lockedPrice)}
          </Nilai>
          <span className="ml-2 text-[13px] text-tinta-samar">
            / box · {item.qtyKgPerBox} kg
          </span>
        </div>
        <Tombol
          ukuran="sm"
          onClick={() => {
            tambahKeKeranjang(item, zoneId);
            router.push("/buyer/cart");
          }}
        >
          <Ikon dari={ShoppingCart} ukuran="sm" />
          Ke keranjang
        </Tombol>
      </div>
    </Panel>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <Halaman judul="Katalog pasokan">
          <Memuat baris={4} label="Memuat katalog" />
        </Halaman>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
