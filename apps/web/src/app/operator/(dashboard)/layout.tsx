"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard,
  FileCheck2,
  Receipt,
  Satellite,
  Scale,
  Database,
  ScrollText,
  Settings,
  LogOut,
  Compass,
  LayoutGrid,
  Banknote,
  ShieldCheck
} from "lucide-react";

export default function OperatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push("/auth/operator/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/operator", icon: LayoutDashboard },
    { name: "Antrean Legalitas", href: "/operator/legality", icon: FileCheck2 },
    { name: "Antrean Klaim", href: "/operator/claims", icon: Receipt },
    { name: "Verifikasi Satelit", href: "/operator/satellite", icon: Satellite },
    { name: "Tinjauan Kewajaran", href: "/operator/kewajaran", icon: Scale },
    { name: "Manajemen Zona", href: "/operator/zone", icon: Compass },
    { name: "Manajemen Komoditas", href: "/operator/commodity", icon: LayoutGrid },
    { name: "Escrow", href: "/operator/escrow", icon: Banknote },
    { name: "Audit Hash Anchor", href: "/operator/audit", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#bbf7d0] border-r border-emerald-200 flex flex-col justify-between hidden md:flex sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="p-6 pb-6">
            <Link href="/operator" className="flex items-center gap-2 mb-2">
              <img src="/logo.png" alt="AgroUs Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-emerald-900 font-fredoka">
                AgroUs Operator
              </span>
            </Link>
            <p className="text-xs font-serif text-emerald-800 tracking-wide">Super Admin Console</p>
          </div>

          {/* Navigation */}
          <nav className="px-4 space-y-2 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/operator");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#2d5a3f] text-white shadow-md"
                      : "text-[#4b6a53] hover:bg-emerald-200"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-300" : "text-emerald-700"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 space-y-1 mb-4">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-emerald-950 hover:bg-emerald-200 transition-colors">
            <Settings className="w-5 h-5 text-emerald-800" />
            Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}
