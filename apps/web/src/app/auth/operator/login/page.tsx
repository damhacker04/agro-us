"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, TriangleAlert, LogIn } from "lucide-react";

export default function OperatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/operator");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 sm:p-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="AgroUs Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-2xl font-bold text-emerald-950 font-fredoka">AgroUs HQ</h1>
          </div>
          <p className="text-sm text-gray-500 font-medium">Portal Internal Operator & Auditor</p>
        </div>

        {/* Security Alert */}
        <div className="bg-[#fdf2f2] border border-[#fbd5d5] rounded-lg p-4 mb-8 flex gap-3">
          <TriangleAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Peringatan Keamanan</h3>
            <p className="text-xs text-red-700 mt-1">Sistem mendeteksi login dari IP eksternal. Wajib gunakan 2FA.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              ID Karyawan / Email Corporate
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="OP-xxxx atau @agrous.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
              <span className="text-gray-600 group-hover:text-gray-900 transition">Ingat saya di perangkat ini</span>
            </label>
            <a href="#" className="font-bold text-emerald-700 hover:text-emerald-800">
              Lupa Sandi/Akses Terkunci?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-[#064e3b] text-white py-3.5 rounded-lg font-bold hover:bg-[#022c22] transition-colors flex items-center justify-center gap-2 mt-4"
          >
            Otentikasi & Masuk <LogIn className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-6">
          Akses ilegal ke sistem ini diawasi secara ketat dan<br />dilindungi oleh hukum.<br />
          <span className="font-medium mt-1 block">© AgroUs Security 2026.</span>
        </div>
      </div>
    </div>
  );
}
