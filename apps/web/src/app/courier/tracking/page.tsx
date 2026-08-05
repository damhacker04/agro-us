"use client";

import React, { useState, useEffect } from 'react';
import { X, MapPin, Crosshair, Truck, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TrackingPage() {
  const router = useRouter();
  const [mapState, setMapState] = useState<'connecting' | 'tracking'>('connecting');

  // Simulate connecting to GPS / Map loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapState('tracking');
    }, 3000); // 3 seconds connecting phase
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8 font-sans">
      
      {/* Mobile Frame Container (Responsive for desktop) */}
      <div className="w-full max-w-[400px] h-[800px] max-h-screen bg-white shadow-2xl rounded-[40px] overflow-hidden border-[8px] border-gray-900 relative flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0a381f] text-white px-6 py-5 flex items-center justify-between shrink-0 relative z-20 shadow-md">
          <h1 className="font-bold text-sm tracking-wide">Live Location Tracking</h1>
          <button onClick={() => router.push('/tenant/orders')} className="text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 flex flex-col relative overflow-hidden">
          
          {/* Top Section: Map or Connecting */}
          <div className="flex-1 relative flex flex-col">
            
            {mapState === 'connecting' ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 animate-in fade-in duration-500">
                
                {/* Pulsating Radar */}
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-32 h-32 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute w-24 h-24 bg-emerald-200 rounded-full animate-pulse"></div>
                  <div className="relative w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Crosshair className="w-8 h-8" />
                  </div>
                </div>

                <h2 className="text-xl font-black text-[#111827] mb-2 font-serif text-center">Melacak Lokasi...</h2>
                <p className="text-sm text-gray-500 font-medium text-center">Posisi terkirim tiap 10 detik.</p>
              </div>
            ) : (
              <div className="flex-1 bg-[#f0f4f8] relative overflow-hidden animate-in fade-in duration-1000">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Decorative Map Elements */}
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-green-200/50 rounded-full blur-xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-blue-200/50 rounded-full blur-xl"></div>
                
                {/* Route Path (Simulated) */}
                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                  <path d="M 50,300 Q 150,200 200,250 T 350,100" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="8 8" className="animate-[dash_20s_linear_infinite]" />
                </svg>
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes dash {
                    to { stroke-dashoffset: -100; }
                  }
                `}} />

                {/* Truck Marker (Simulated) */}
                <div className="absolute top-[220px] left-[180px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg mb-1 animate-bounce">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="w-3 h-1 bg-black/20 rounded-[100%] blur-[2px]"></div>
                </div>
                
                {/* Destination Marker */}
                <div className="absolute top-[100px] left-[350px] -translate-x-1/2 -translate-y-1/2 text-red-500 flex flex-col items-center">
                  <MapPin className="w-8 h-8 fill-red-100" />
                </div>
                
                {/* Origin Marker */}
                <div className="absolute top-[300px] left-[50px] -translate-x-1/2 -translate-y-1/2 text-emerald-600 flex flex-col items-center">
                  <Navigation className="w-6 h-6 fill-emerald-100" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Address Card */}
          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 p-6 sm:p-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            
            <div className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
              <div className="flex items-center gap-3 font-bold text-[#0a1c38] mb-4 text-lg">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                Alamat Penerima (HORECA)
              </div>
              
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 leading-snug">Restoran Bumbu Desa (Cabang Malang)</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Jl. Ijen No. 12, Gading Kasri, Kec. Klojen,<br/>
                  Kota Malang, Jawa Timur 65115
                </p>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Kontak:</span> Bapak Ahmad (+62 812-3456-7890)
                  </p>
                </div>
              </div>
            </div>

            {mapState === 'tracking' && (
               <div className="mt-6 text-center">
                 <button className="text-red-500 font-bold text-sm hover:text-red-600 transition">
                   Sesi Berakhir
                 </button>
               </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
