"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TriangleAlert, CircleHelp } from "lucide-react";

export default function VerifyOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(50); // 50 seconds
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    // Limit to 1 character
    const val = value.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setIsError(false); // Clear error when typing

    // Auto focus next input
    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move focus to previous input if current is empty and backspace is pressed
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    // Simulate verification (for demo: "4821" is correct)
    if (code === "4821") {
      setIsError(false);
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type') || 'buyer';
      router.push(`/auth/${type}/login`);
    } else {
      setIsError(true);
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
        <div className="w-full max-w-md bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-emerald-950 mb-3">
              Verifikasi Nomor Telepon
            </h1>
            <p className="text-gray-600 text-sm">
              Masukkan 4 digit kode yang kami <br />
              kirimkan ke nomor <span className="font-bold text-slate-900">+62812xxxxxx</span>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center mb-8 space-y-6">
            {/* OTP Inputs */}
            <div className="flex gap-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-16 h-20 text-center text-3xl font-bold rounded-lg outline-none transition-all border-2 ${
                    isError
                      ? "border-red-600 text-red-600 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      : "border-emerald-800 text-emerald-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {isError && (
              <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                <TriangleAlert className="w-4 h-4" />
                <span>Kode salah. Sisa {attemptsLeft} percobaan.</span>
              </div>
            )}
          </div>

          <div className="text-center space-y-4 mb-8">
            <p className="text-sm text-gray-600">
              Kirim ulang kode dalam <span className="font-bold text-slate-900">{formatTime(timeLeft)}</span>
            </p>
            <button
              disabled={timeLeft > 0}
              onClick={() => {
                setTimeLeft(50);
                setIsError(false);
                setOtp(["", "", "", ""]);
              }}
              className={`text-sm font-medium transition-colors ${
                timeLeft > 0 ? "text-gray-400 cursor-not-allowed" : "text-emerald-600 hover:text-emerald-700"
              }`}
            >
              Kirim Ulang OTP
            </button>
          </div>

          <button
            onClick={handleVerify}
            className="w-full bg-emerald-600 text-white font-semibold py-3.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Verifikasi Sekarang
          </button>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors"
            >
              Punya masalah? <span className="text-emerald-600 flex items-center gap-1">Hubungi Bantuan <CircleHelp className="w-4 h-4" /></span>
            </Link>
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
