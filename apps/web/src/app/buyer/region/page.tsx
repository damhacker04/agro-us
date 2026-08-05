"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, MapPin, Search } from "lucide-react";
import { ambilZona } from "@/lib/api";
import type { ZoneSummary } from "@agro-os/shared";

export default function BuyerRegionPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Zona layanan diambil dari API AgroUs, BUKAN daftar wilayah nasional.
   *
   * Sebelumnya halaman ini memanggil API wilayah pihak ketiga dan menampilkan seluruh
   * kabupaten/kota di Indonesia — padahal tidak satu pun di antaranya bisa dipesan.
   * Layanan baru tersedia di tiga zona Malang Raya, dan tiap zona punya nilai minimum
   * order sendiri yang menentukan apakah checkout bisa dilanjutkan (Risiko 3).
   */
  useEffect(() => {
    ambilZona()
      .then(setZones)
      .catch((e) => setGalat(e instanceof Error ? e.message : "Gagal memuat zona layanan"))
      .finally(() => setIsLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContinue = () => {
    const zona = zones.find((z) => z.name === selectedCity);
    if (!zona) return;
    // zoneId ikut dibawa: katalog menyaring per zona, dan `city` hanya untuk ditampilkan.
    router.push(`/buyer/catalog?zoneId=${zona.id}&city=${encodeURIComponent(zona.name)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 text-emerald-600 bg-emerald-100 rounded-sm flex items-center justify-center font-bold">
            A
          </div>
          <span className="text-xl font-bold text-emerald-950 font-fredoka">
            AgroUs
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pilih Wilayah Layanan
          </h1>
          <p className="text-gray-500 text-sm mb-6 max-w-md leading-relaxed">
            Pilih lokasi operasional bisnis/restoran Anda untuk melihat ketersediaan komoditas dan kebun (Tenant) di zona Anda.
          </p>

          <div className="space-y-4">
            {/* Custom Dropdown */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="block text-sm font-bold text-slate-700">
                Kota / Kabupaten
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-slate-50 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <span className={selectedCity ? "text-gray-900 font-medium" : "text-gray-500"}>
                    {isLoading ? "Memuat data wilayah..." : (selectedCity || "Pilih kota layanan...")}
                  </span>
                  <ChevronRight 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-90" : ""}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && !isLoading && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                    <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-20">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari nama kota/kabupaten..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {zones
                        .filter((z) => z.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((z) => (
                          <button
                            key={z.id}
                            onClick={() => {
                              setSelectedCity(z.name);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-emerald-50 ${
                              selectedCity === z.name ? "bg-emerald-50 font-medium text-emerald-900" : "text-gray-700"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {z.name}
                            </span>
                            {/* Minimum order ditampilkan SEJAK AWAL: nilainya berbeda tiap zona
                                dan menentukan apakah checkout nanti bisa dilanjutkan. Lebih baik
                                pembeli tahu sekarang daripada ditolak setelah mengisi keranjang. */}
                            <span className="text-[11px] text-gray-400 shrink-0">
                              min. Rp{z.minOrderValue.toLocaleString("id-ID")}
                            </span>
                          </button>
                        ))}
                      {!isLoading && zones.length === 0 && (
                        <div className="px-5 py-4 text-center text-sm text-gray-500">
                          {galat ? "Gagal memuat zona layanan" : "Belum ada zona layanan"}
                        </div>
                      )}
                      {zones.length > 0 &&
                        !zones.some((z) => z.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                          <div className="px-5 py-4 text-center text-sm text-gray-500">
                            Zona tidak ditemukan
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
              <MapPin className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-900 text-sm">
                  Kenapa ini penting?
                </h3>
                <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                  Sistem akan menyesuaikan jarak kebun, ongkos kirim terkonsolidasi, dan estimasi waktu tiba (ETA) berdasarkan zona layanan yang Anda pilih.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedCity}
              className={`w-full mt-8 font-semibold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm ${
                selectedCity
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Lanjutkan ke Katalog <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-8 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>© 2026 AgroUs. Precision Agriculture Solutions.</p>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-emerald-700 transition">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-emerald-700 transition">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-emerald-700 transition">
            Contact Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
