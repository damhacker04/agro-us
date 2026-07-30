"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, MapPin } from "lucide-react";

const REGIONS = [
  {
    province: "JAWA TIMUR",
    cities: [
      "Sidoarjo",
      "Malang",
      "Tulungagung",
      "Surabaya",
      "Batu",
      "Blitar",
      "Mojokerto",
      "Pasuruan",
      "Probolinggo",
      "Madiun",
    ],
  },
  {
    province: "JAWA BARAT",
    cities: ["Bandung", "Sukabumi", "Bekasi", "Depok"],
  },
];

export default function BuyerRegionPage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (selectedCity) {
      // Navigate to catalog
      router.push("/buyer/catalog");
    }
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
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-slate-50 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                >
                  <span className={selectedCity ? "text-gray-900 font-medium" : "text-gray-500"}>
                    {selectedCity || "Pilih kota layanan..."}
                  </span>
                  <ChevronRight 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-90" : ""}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                    {REGIONS.map((region, idx) => (
                      <div key={idx} className="py-2">
                        <div className="px-5 py-2 text-[10px] font-bold text-gray-400 tracking-wider">
                          {region.province}
                        </div>
                        {region.cities.map((city) => (
                          <button
                            key={city}
                            onClick={() => {
                              setSelectedCity(city);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-emerald-50 ${
                              selectedCity === city ? "bg-emerald-50 font-medium text-emerald-900" : "text-gray-700"
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {city}
                          </button>
                        ))}
                      </div>
                    ))}
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
