"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  PackageSearch,
  Map,
  Layers,
  Settings,
  LogOut,
  Leaf,
  ShoppingBag,
  Wallet,
  Sprout,
  Star
} from "lucide-react";

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/tenant", icon: LayoutDashboard },
    { name: "Katalog Produk", href: "/tenant/catalog", icon: PackageSearch },
    { name: "Manajemen Pesanan", href: "/tenant/orders", icon: ShoppingBag },
    { name: "Manajemen Lahan", href: "/tenant/land", icon: Map },
    { name: "Manajemen Batch", href: "/tenant/batch", icon: Layers },
    { name: "Keuangan & Escrow", href: "/tenant/finance", icon: Wallet },
    { name: "Rekomendasi Tanam", href: "/tenant/recommendation", icon: Sprout },
    { name: "Reputation", href: "/tenant/reputation", icon: Star },
  ];

  return (
    <div className="flex h-screen bg-[#f5f8ff] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#39533f] text-white flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 gap-3">
          <div className="w-7 h-7 bg-[#b8f5d0] text-[#165634] rounded-md flex items-center justify-center font-bold shrink-0">
            <Leaf className="w-4 h-4" />
          </div>
          <span className="font-bold text-[#b8f5d0] text-sm tracking-wide uppercase">Tani Rawit Jos</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/tenant" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                      isActive 
                        ? "bg-[#4b6a53] text-[#b8f5d0]" 
                        : "text-[#a4ccb6] hover:bg-[#4b6a53]/50 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#b8f5d0]" : "text-[#87ad97]"}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 bg-[#f5f8ff] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl text-emerald-950">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-md flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5" />
            </div>
            AgroUs
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <div className="w-6 h-6 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 bg-white">
                <Leaf className="w-3 h-3" />
              </div>
              Tani Rawit Jos
            </div>
            <button className="text-emerald-800 hover:text-emerald-600 transition">
              <Settings className="w-5 h-5" />
            </button>
            <Link href="/" className="text-red-500 hover:text-red-600 transition">
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="py-6 px-8 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <div>© 2026 AgroUs. Precision Agriculture Solutions.</div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-gray-900">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-900">Terms of Service</Link>
            <Link href="#" className="hover:text-gray-900">Contact Support</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
