"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  ShoppingCart, 
  Bell, 
  User, 
  HelpCircle, 
  LogOut,
  MapPin,
  Clock,
  SearchCode
} from "lucide-react";

function BuyerDashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const city = searchParams.get("city") || "Semua Wilayah";

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleLogout = () => {
    router.push("/auth/buyer/login");
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col justify-between hidden md:flex sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="p-6 pb-8">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="AgroUs Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-bold text-emerald-950 font-fredoka">
                AgroUs
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="px-4 space-y-1">
            <Link
              href="/buyer/catalog"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                pathname.includes("/buyer/catalog") || pathname.includes("/buyer/product") || pathname.includes("/buyer/cart") || pathname.includes("/buyer/checkout")
                  ? "bg-emerald-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <SearchCode className="w-5 h-5" />
              Eksplorasi Katalog
            </Link>
            <Link
              href="/buyer/orders"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname.includes("/buyer/orders")
                  ? "bg-emerald-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              Pesanan Saya
            </Link>
            <Link
              href="/buyer/history"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname.includes("/buyer/history")
                  ? "bg-emerald-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
            </Link>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100 space-y-1">
          <Link
            href="/buyer/help"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            Bantuan
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        {!pathname.includes("/buyer/orders") && (
          <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-emerald-950">
                  Katalog: Kota Malang
                </h1>
                <Link 
                  href="/buyer/region"
                  className="px-4 py-1.5 border border-gray-300 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ganti Wilayah
                </Link>
              </div>
              <div className="flex items-center gap-6">
                <button className="relative text-gray-600 hover:text-emerald-700 transition">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                    3
                  </span>
                </button>
                <button className="text-gray-600 hover:text-emerald-700 transition">
                  <Bell className="w-6 h-6" />
                </button>
                <button className="text-gray-600 hover:text-emerald-700 transition">
                  <User className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Sawi, Tomat, Cabe..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
              />
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 bg-white">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * `useSearchParams()` membuat komponen ini hanya bisa dirender di klien. Karena dipakai
 * di LAYOUT, seluruh halaman di bawah /buyer ikut terdampak — dan `next build` menolak
 * memprarender semuanya dengan galat "should be wrapped in a suspense boundary".
 *
 * Dibungkus Suspense di sini supaya kerangka halaman tetap bisa dirender lebih dulu di
 * server, sementara bagian yang bergantung pada query string menyusul di klien.
 */
export default function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f4f8]" />}>
      <BuyerDashboardLayoutInner>{children}</BuyerDashboardLayoutInner>
    </Suspense>
  );
}
