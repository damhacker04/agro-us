"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Edit2, ImageIcon, PackageSearch } from "lucide-react";
import { GalatApi, ambilBatchTenant, ambilProdukTenant } from "@/lib/api";
import type { BatchResponse, ProductResponse } from "@agro-os/shared";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

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
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat produk"))
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

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat produk…</div>;

  if (galat) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 relative min-h-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari Sawi, Tomat, Cabe..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>
        <Link
          href="/tenant/catalog/edit"
          className="bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] font-bold text-sm px-6 py-2 rounded-lg hover:bg-[#bbf7d0] transition shadow-sm shrink-0"
        >
          Tambah Produk
        </Link>
      </div>

      {tampil.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <PackageSearch className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-gray-800 mb-1">
            {produk.length === 0 ? "Belum ada produk" : "Tidak ada yang cocok"}
          </h2>
          <p className="text-sm text-gray-500">
            {produk.length === 0
              ? "Tambahkan produk dulu, lalu buka kuota Pre-Order dari Manajemen Batch."
              : `Tidak ada produk yang cocok dengan "${cari}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tampil.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition"
            >
              <div className="h-48 bg-gray-100 flex flex-col items-center justify-center relative border-b border-gray-100">
                <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
                <span className="text-xs text-gray-400">{p.commodity.name}</span>
                <div className="absolute top-4 left-4 bg-[#1e5033] text-white text-[10px] font-bold px-2 py-1 rounded-full tracking-wide">
                  GRADE {p.grade}
                </div>
                {(() => {
                  const sisa = sisaKuota.get(p.id) ?? 0;
                  return (
                    <div
                      className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full border ${
                        sisa > 0
                          ? "bg-white/90 text-gray-700 border-gray-200"
                          : "bg-gray-200/90 text-gray-500 border-gray-300"
                      }`}
                    >
                      {sisa > 0 ? `sisa ${sisa} box` : "tidak dijual"}
                    </div>
                  );
                })()}
              </div>

              <div className="p-5 flex justify-between items-end">
                <div className="min-w-0">
                  <h3 className="font-black text-gray-900 text-lg mb-1 truncate">{p.name}</h3>
                  <div className="text-xs text-gray-500 mb-3">
                    perkiraan panen {tgl(p.estHarvestDate)}
                  </div>

                  <div className="text-[10px] font-bold text-gray-500 mb-1 tracking-widest uppercase">
                    Harga Unit
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-xl text-gray-900">{rp(p.pricePerBox)}</span>
                    <span className="text-xs text-gray-500 font-medium">
                      / Box ({p.qtyKgPerBox}kg)
                    </span>
                  </div>
                </div>

                <Link
                  href={`/tenant/catalog/edit?id=${p.id}`}
                  className="w-10 h-10 bg-[#0a381f] text-white rounded-xl flex items-center justify-center hover:bg-[#114b2d] transition shadow-sm shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
