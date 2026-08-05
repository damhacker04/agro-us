"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Calendar, ShieldCheck, ShieldAlert, Store, ShoppingCart } from "lucide-react";
import { ambilKatalog } from "@/lib/api";
import { tambahKeKeranjang } from "@/lib/keranjang";
import type { CatalogItem } from "@agro-os/shared";

const rupiah = (n: number) => n.toLocaleString("id-ID");

const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/**
 * Tiga badge verifikasi (FR-2.6).
 *
 * `BELUM_TERVERIFIKASI` sengaja TIDAK disembunyikan. Menurut FR-4.6 ketidaksesuaian
 * justru harus terlihat pembeli — katalog yang semuanya bertanda hijau tidak memberi
 * informasi apa pun, karena tidak ada pembandingnya.
 */
const BADGE: Record<CatalogItem["badge"], { teks: string; kelas: string; ikon: typeof ShieldCheck }> = {
  TERVERIFIKASI_SATELIT: {
    teks: "Terverifikasi Satelit",
    kelas: "bg-emerald-700 text-white",
    ikon: ShieldCheck,
  },
  BUKTI_FOTO_SAJA: {
    teks: "Bukti Foto Saja",
    kelas: "bg-amber-500 text-white",
    ikon: ShieldAlert,
  },
  BELUM_TERVERIFIKASI: {
    teks: "Belum Terverifikasi",
    kelas: "bg-gray-400 text-white",
    ikon: ShieldAlert,
  },
};

/** Warna latar kartu diturunkan dari nama komoditas supaya konsisten tiap render. */
function warnaKomoditas(nama: string) {
  const palet = [
    "from-emerald-600 to-emerald-800",
    "from-lime-600 to-green-800",
    "from-amber-600 to-orange-800",
    "from-teal-600 to-cyan-800",
    "from-rose-600 to-red-800",
  ];
  let h = 0;
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) % palet.length;
  return palet[h];
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const zoneId = searchParams.get("zoneId");
  const kota = searchParams.get("city") ?? "";
  const query = searchParams.get("q")?.toLowerCase() || "";

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"default" | "grade" | "harvest" | "price">("default");

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
    if (sortOption === "grade") hasil.sort((a, b) => a.grade.localeCompare(b.grade));
    else if (sortOption === "price") hasil.sort((a, b) => a.lockedPrice - b.lockedPrice);
    else if (sortOption === "harvest")
      hasil.sort((a, b) => a.claimedHarvestDate.localeCompare(b.claimedHarvestDate));
    return hasil;
  }, [items, query, sortOption]);

  if (memuat) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-bold text-red-900 mb-1">Gagal memuat katalog</h2>
          <p className="text-sm text-red-700">{galat}</p>
          <p className="text-xs text-red-600 mt-3">
            Server API mungkin sedang bangun dari mode tidur. Coba muat ulang dalam 30 detik.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {(
            [
              ["default", "Semua Komoditas"],
              ["grade", "Grade A - Z"],
              ["harvest", "Tanggal Panen"],
            ] as const
          ).map(([nilai, label]) => (
            <button
              key={nilai}
              onClick={() => setSortOption(nilai)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition border ${
                sortOption === nilai
                  ? "bg-emerald-950 text-white border-emerald-950"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortOption(sortOption === "price" ? "default" : "price")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition shadow-sm border ${
            sortOption === "price"
              ? "bg-emerald-950 text-white border-emerald-950"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Urutkan: Harga Termurah <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {daftar.length > 0 ? (
          daftar.map((item) => {
            const badge = BADGE[item.badge];
            const IkonBadge = badge.ikon;
            return (
              <Link
                key={item.batchId}
                href={`/buyer/product/${item.batchId}`}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                <div
                  className={`relative h-56 w-full bg-gradient-to-br ${warnaKomoditas(item.commodity.name)} overflow-hidden flex items-center justify-center`}
                >
                  <span className="text-white/90 text-2xl font-bold tracking-wide px-6 text-center">
                    {item.commodity.name}
                  </span>
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold bg-white/95 text-gray-800 shadow-sm">
                    GRADE {item.grade}
                  </div>
                  <div
                    className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm ${badge.kelas}`}
                  >
                    <IkonBadge className="w-3 h-3" />
                    {badge.teks}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">
                    {item.productName}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Panen: {tanggal(item.claimedHarvestDate)}</span>
                    </div>
                    <div className="w-px h-3 bg-gray-300" />
                    <span>Sisa: {item.quotaBoxAvailable} Box</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium mb-6">
                    <Store className="w-3.5 h-3.5" />
                    <span>Dari: {item.tenant.companyName}</span>
                  </div>

                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider">
                        HARGA TERKUNCI
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-900">
                          Rp {rupiah(item.lockedPrice)}
                        </span>
                        <span className="text-xs text-gray-500">/ Box ({item.qtyKgPerBox} kg)</span>
                      </div>
                    </div>
                    <button
                      className="w-10 h-10 rounded-xl bg-emerald-950 text-white flex items-center justify-center hover:bg-emerald-800 transition-colors shadow-sm z-10 relative"
                      onClick={(e) => {
                        // Kartu ini adalah <Link> ke detail produk; tombol keranjang di
                        // dalamnya harus mencegah navigasi itu, bukan ikut terbawa.
                        e.preventDefault();
                        tambahKeKeranjang(item, zoneId!);
                        router.push("/buyer/cart");
                      }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="font-bold text-gray-800 mb-1">Belum ada produk di {kota || "zona ini"}</h2>
            <p className="text-sm text-gray-500">
              Kuota Pre-Order dibuka Tenant per musim tanam. Coba zona lain atau kembali beberapa
              hari lagi.
            </p>
            <Link
              href="/buyer/region"
              className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:underline"
            >
              Ganti wilayah layanan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat katalog…</div>}>
      <CatalogContent />
    </Suspense>
  );
}
