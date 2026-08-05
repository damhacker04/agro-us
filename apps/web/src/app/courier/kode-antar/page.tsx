"use client";

import React, { useState, useEffect } from 'react';
import { X, Delete, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function KodeAntarPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'error' | 'success' | 'locked'>('idle');
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const CORRECT_PIN = '4239'; // Dummy PIN for testing

  const handleKeyPress = (key: string) => {
    if (status === 'locked' || status === 'success') return;

    if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      setStatus('idle');
    } else {
      if (pin.length < 4) {
        const newPin = pin + key;
        setPin(newPin);
        
        // Auto-submit when 4 digits are entered
        if (newPin.length === 4) {
          verifyPin(newPin);
        }
      }
    }
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === CORRECT_PIN) {
      setStatus('success');
      setTimeout(() => {
        router.push('/courier/tracking');
      }, 1500); // 1.5 seconds delay before redirect
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      
      if (remaining <= 0) {
        setStatus('locked');
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8 font-sans">
      
      {/* Mobile Frame Container (Responsive for desktop) */}
      <div className="w-full max-w-[400px] h-[800px] max-h-screen bg-white shadow-2xl rounded-[40px] overflow-hidden border-[8px] border-gray-900 relative flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0a381f] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <h1 className="font-bold text-sm tracking-wide">Kode Antar</h1>
          <button className="text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col px-8 py-10 overflow-y-auto">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#111827] mb-4 font-serif leading-tight">Masukkan 4 Digit Kode</h2>
            {status === 'idle' && (
              <p className="text-sm text-gray-500 font-medium">Minta kode PIN antar dari pihak Penjual/Tenant.</p>
            )}
          </div>

          {/* Status Banners */}
          <div className="mb-8 min-h-[60px] flex items-end">
            {status === 'success' && (
              <div className="w-full bg-[#dcfce7] text-[#166534] px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5" /> Kode benar.
              </div>
            )}
            
            {status === 'error' && (
              <div className="w-full bg-[#fdf2f2] text-[#9b1c1c] px-4 py-3 rounded-lg flex items-start gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> 
                <span>Kode Salah. Sisa {attemptsLeft} percobaan.</span>
              </div>
            )}

            {status === 'locked' && (
              <div className="w-full bg-[#fdf2f2] text-[#9b1c1c] px-4 py-3 rounded-lg flex items-start gap-2 text-sm font-medium leading-relaxed animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9b1c1c]" /> 
                <div>
                  <strong className="font-bold">Kode Salah 5x.</strong> Kode antar telah diganti. Hubungi Tenant Farm Fresh Berdikari di nomor berikut: <span className="font-bold whitespace-nowrap">0821-3345-2134</span>
                </div>
              </div>
            )}
          </div>

          {/* PIN Slots */}
          <div className="flex justify-center gap-4 mb-16">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index}
                className={`w-14 h-16 border-b-[3px] flex items-center justify-center text-4xl font-serif text-[#111827] transition-colors
                  ${pin.length === index ? 'border-[#0a381f]' : 'border-gray-300'}
                  ${status === 'error' ? 'border-red-500 text-red-600' : ''}
                  ${status === 'success' ? 'border-emerald-500 text-emerald-700' : ''}
                `}
              >
                {pin[index] || ''}
              </div>
            ))}
          </div>

          {/* Keypad */}
          <div className="mt-auto pb-4">
            <div className="grid grid-cols-3 gap-x-4 gap-y-4 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num.toString())}
                  disabled={status === 'locked' || status === 'success'}
                  className="h-16 rounded-full bg-[#edf2f9] text-[#1e293b] text-2xl font-serif font-bold hover:bg-[#dbe4f0] active:bg-[#cbd5e1] disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              
              <div className="col-start-2">
                <button
                  onClick={() => handleKeyPress('0')}
                  disabled={status === 'locked' || status === 'success'}
                  className="w-full h-16 rounded-full bg-[#edf2f9] text-[#1e293b] text-2xl font-serif font-bold hover:bg-[#dbe4f0] active:bg-[#cbd5e1] disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  0
                </button>
              </div>

              <div className="col-start-3 flex items-center justify-center">
                <button
                  onClick={() => handleKeyPress('backspace')}
                  disabled={status === 'locked' || status === 'success' || pin.length === 0}
                  className="w-16 h-16 rounded-full text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors flex items-center justify-center"
                >
                  <Delete className="w-7 h-7" />
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
