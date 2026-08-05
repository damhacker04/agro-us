"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Store,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  MessageSquare,
  Truck
} from "lucide-react";
import { ambilNdvi, ambilProduk, ambilTimeline, ambilVerifikasi } from "@/lib/api";
import type { CatalogItem, NdviSeries, TimelineNodeResponse, TimelineVerifyResponse } from "@agro-os/shared";

/** Foto bukti disajikan API sebagai jalur relatif (/uploads/...), jadi perlu diawali host. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";


export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const batchId = unwrappedParams.id;
  const [activeTab, setActiveTab] = useState<"specs" | "timeline" | "ndvi">("specs");

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [nodes, setNodes] = useState<TimelineNodeResponse[]>([]);
  const [verify, setVerify] = useState<TimelineVerifyResponse | null>(null);
  const [ndvi, setNdvi] = useState<NdviSeries | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    // Produk wajib ada; timeline/verifikasi/NDVI boleh kosong (batch baru belum punya
    // catatan) — kegagalannya tidak boleh mengosongkan seluruh halaman.
    ambilProduk(batchId)
      .then(setItem)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Produk tidak ditemukan"));
    ambilTimeline(batchId).then(setNodes).catch(() => setNodes([]));
    ambilVerifikasi(batchId).then(setVerify).catch(() => setVerify(null));
    ambilNdvi(batchId).then(setNdvi).catch(() => setNdvi(null));
  }, [batchId]);

  if (galat) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-bold text-red-900 mb-1">Produk tidak dapat dimuat</h2>
          <p className="text-sm text-red-700">{galat}</p>
          <Link href="/buyer/catalog" className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:underline">
            Kembali ke katalog
          </Link>
        </div>
      </div>
    );
  }

  if (!item) return <div className="p-8 text-sm text-gray-500">Memuat produk…</div>;

  // Pengamatan tertutup awan bernilai null — dibuang supaya garis grafik tidak putus
  // dan tidak terbaca sebagai penurunan vegetasi yang sebenarnya tidak terjadi.
  const titikNdvi = (ndvi?.points ?? [])
    .filter((x) => x.ndvi !== null)
    .map((x) => ({ date: new Date(x.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), ndvi: x.ndvi }));

  const rupiah = (n: number) => n.toLocaleString("id-ID");
  const tanggal = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const product = {
    name: item.productName,
    grade: `GRADE ${item.grade}`,
    price: rupiah(item.lockedPrice),
    unit: `Box (${item.qtyKgPerBox} kg)`,
    seller: item.tenant.companyName,
    stock: `${item.quotaBoxAvailable} Box`,
    image: "",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back button */}
      <Link 
        href="/buyer/catalog" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative h-96 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${product.image})` }}
            />
            <div className={`absolute top-4 left-4 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm ${
                product.grade === 'GRADE A' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}>
              {product.grade}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80)` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-2xl font-bold text-gray-900">Rp {product.price}</span>
            <span className="text-sm font-medium text-gray-500">/ {product.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">KAPASITAS</div>
              <div className="text-sm font-semibold text-gray-900">{product.unit}</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">STOK TERSEDIA</div>
              <div className="text-sm font-semibold text-gray-900">{product.stock}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-8">
            <Store className="w-4 h-4" />
            <span>Dari: {product.seller}</span>
          </div>

          <div className="flex gap-4 mt-auto">
            <Link 
              href="/buyer/cart"
              className="flex-1 bg-emerald-950 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-800 transition shadow-sm"
            >
              <ShoppingCart className="w-5 h-5" /> Tambah ke Keranjang
            </Link>
            <button className="px-6 py-3.5 font-semibold text-gray-700 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition">
              Hubungi Sales
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8">
          {[
            { id: "specs", label: "Spesifikasi & Logistik" },
            { id: "timeline", label: "Verified Timeline" },
            { id: "ndvi", label: "Bukti Satelit NDVI" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-sm font-bold transition-colors relative ${
                activeTab === tab.id ? "text-emerald-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-20 shadow-sm">
        
        {/* TAB 1: Specs */}
        {activeTab === "specs" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Detail Komoditas */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Detail Komoditas</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Kategori</span>
                  <span className="text-sm font-semibold text-gray-900">Sayur Buah</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Grade Mutu</span>
                  <span className="text-[10px] font-bold text-white bg-amber-700 px-3 py-1 rounded-full">Grade A</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Tingkat Kemanisan (Brix)</span>
                  <span className="text-sm font-bold text-gray-900">4.5 - 5.5%</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Suhu Penyimpanan Optimal</span>
                  <span className="text-sm font-bold text-gray-900">10°C - 12°C</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Estimasi Masa Simpan (Shelf Life)</span>
                  <span className="text-sm font-bold text-gray-900">7 - 10 Hari (Chiller)</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 border-l-4 border-gray-300 text-sm text-gray-600 italic rounded-r-lg">
                "Cocok digunakan untuk kebutuhan salad, burger, dan panggangan restoran. Buah padat dan tidak mudah berair."
              </div>
            </div>

            {/* Right: Info Pengemasan */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Informasi Pengemasan</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Tipe Kemasan</span>
                  <span className="text-sm font-semibold text-gray-900">Keranjang Plastik Berongga (Crate)</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Berat Bersih (Netto)</span>
                  <span className="text-sm font-bold text-gray-900">10 Kg / Crate</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Dimensi Kemasan</span>
                  <span className="text-sm font-bold text-gray-900">40cm x 30cm x 15cm</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100 items-start">
                  <span className="text-sm text-gray-500">Titik Keberangkatan</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">Gudang Konsolidasi Malang</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Jawa Timur</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Truck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">Pengiriman Terkonsolidasi</div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    Komoditas ini mendukung skema pengiriman gabungan. Ongkos kirim akan dihitung otomatis saat checkout berdasarkan total volume belanja dari area Malang Raya.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Timeline */}
        {activeTab === "timeline" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-lg font-bold text-emerald-950 mb-1">Digital Farm Ledger</h3>
                <p className="text-xs text-gray-500">Catatan aktivitas pertanian yang tidak dapat diubah (append-only ledger).</p>
              </div>
              {/* Klaim keutuhan TIDAK ditulis mati. Nilainya dari server yang menghitung
                  ulang seluruh rantai SHA-256 dari ISI node — kalau ada yang pernah diubah
                  lewat SQL sekalipun, di sinilah ketahuannya. */}
              {verify && (
                <div
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    verify.intact ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {verify.intact ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Rantai bukti utuh ({verify.nodeCount} catatan)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Rantai bukti TIDAK utuh
                    </>
                  )}
                </div>
              )}
            </div>

            {nodes.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                Belum ada catatan budidaya untuk batch ini.
              </div>
            ) : (
              <div className="relative pl-6 space-y-12 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200">
                {nodes.map((n) => {
                  const ralat = n.ralatOfId !== null;
                  return (
                    <div
                      key={n.id}
                      className={`relative flex items-start gap-6 before:absolute before:-left-[15px] before:top-1 before:z-10 before:w-8 before:h-8 before:rounded-full before:border-4 before:border-white before:shadow-sm ${
                        ralat ? "before:bg-amber-500" : "before:bg-emerald-500"
                      }`}
                    >
                      <div
                        className={`rounded-xl p-5 flex-1 shadow-sm relative z-0 border ${
                          ralat ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 gap-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900">
                              {n.activityType.replace(/_/g, " ")}
                            </h4>
                            {ralat && (
                              <span className="bg-amber-200 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded">
                                RALAT
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-500 shrink-0">
                            {tanggal(n.deviceTs)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{n.description}</p>

                        {n.outsidePolygonReason && (
                          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                            Lokasi di luar batas lahan terdaftar. Alasan Tenant: {n.outsidePolygonReason}
                          </p>
                        )}

                        {n.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {n.photos.map((f) => (
                              <div key={f.sha256} className="relative">
                                <div
                                  className="h-32 w-40 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200"
                                  style={{ backgroundImage: `url(${API_BASE}${f.url})` }}
                                />
                                {f.captureSource === "GALLERY" && (
                                  <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    DARI GALERI
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 text-[10px] font-mono text-gray-400 break-all">
                          hash {n.nodeHash.slice(0, 32)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NDVI */}
        {activeTab === "ndvi" && (
          <div>
            <h3 className="text-lg font-bold text-emerald-950 mb-1">Analisis Vegetasi Sentinel-2</h3>
            <p className="text-xs text-gray-500 mb-8">Pantauan objektif biomassa dan tingkat kehijauan lahan berdasarkan pantulan gelombang inframerah dekat (NIR).</p>
            
            {/* Chart Area */}
            <div className="h-72 w-full border border-dashed border-gray-300 rounded-xl mb-6 p-4 flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
              {/* Note: In a real implementation we would render the Recharts here, using standard layout. */}
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={titikNdvi} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} dx={-10} domain={[0, 1]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ndvi" 
                      stroke="#059669" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#059669", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 mb-1">Ketidaksesuaian Data Terbuka (Open Discrepancy)</h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Sistem mendeteksi selisih data. Grafik satelit menunjukkan puncak NDVI (indikasi panen ideal) pada 03 Ags 2026, 
                  namun node klaim "Persiapan Panen" diajukan oleh petani pada 05 Ags 2026. Selisih 2 hari ini masih dalam batas toleransi kesegaran produk.
                </p>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 text-emerald-700 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </div>
                  <div className="text-[10px] font-bold text-emerald-950 tracking-wider">SUMBER DATA</div>
                </div>
                <div className="font-bold text-gray-900">Sentinel-2 L2A</div>
                <div className="text-xs text-gray-500 mt-1">Resolusi 10m Ground Sample</div>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 text-emerald-700 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </div>
                  <div className="text-[10px] font-bold text-emerald-950 tracking-wider">TERAKHIR DIPERBARUI</div>
                </div>
                <div className="font-bold text-gray-900">06 Ags 2026</div>
                <div className="text-xs text-gray-500 mt-1">Cloud Cover: {"<"} 5%</div>
              </div>

              <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 text-emerald-700 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </div>
                  <div className="text-[10px] font-bold text-emerald-950 tracking-wider">STATUS VALIDASI</div>
                </div>
                <div className="font-bold text-emerald-700">Terverifikasi AI</div>
                <div className="text-xs text-emerald-600 mt-1">Akurasi Biomassa 92%</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
