"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, TriangleAlert } from "lucide-react";

export default function TenantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy validation for frontend demo
    if (email !== "andi@email.com" || password !== "Agrous123_") {
      setError("Email atau sandi tidak sesuai dengan data yang terdaftar.");
      return;
    }
    setError("");
    router.push("/tenant/onboarding/profile");
  };
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="AgroUs Logo" className="w-10 h-10 object-contain" />
          <span className="text-2xl font-bold text-emerald-950 font-fredoka">
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
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-emerald-500 mb-6 bg-white">
            <div className="flex-1 text-center py-3 bg-emerald-500 text-white font-medium">
              Masuk
            </div>
            <Link
              href="/auth/tenant"
              className="flex-1 text-center py-3 text-emerald-600 font-medium hover:bg-emerald-50 transition"
            >
              Daftar
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Masuk sebagai Penjual
              </h1>
              <p className="text-gray-500 text-sm">
                Silakan lengkapi data Anda untuk melanjutkan.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="andi@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`block w-full px-4 py-3 rounded-lg border shadow-sm outline-none transition-all text-gray-900 placeholder-gray-400 ${
                      error ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500" : "border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 font-medium text-sm mt-2">
                  <TriangleAlert className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-6 bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                Masuk <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-8 text-center space-y-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                Dengan masuk atau mendaftar, Anda menyetujui{" "}
                <Link href="#" className="text-emerald-700 hover:underline">
                  Syarat & Ketentuan
                </Link>{" "}
                serta{" "}
                <Link href="#" className="text-emerald-700 hover:underline">
                  Kebijakan Privasi
                </Link>{" "}
                AgroUs.
              </p>

              <div className="inline-block bg-slate-50 border border-gray-100 rounded-full px-4 py-2">
                <p className="text-xs text-slate-500">
                  AgroUs melayani transaksi B2B (bukan skema investasi).
                </p>
              </div>
            </div>
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
