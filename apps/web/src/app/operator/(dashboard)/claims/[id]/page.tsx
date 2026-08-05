"use client";

import React, { useState, use } from "react";
import { AlertTriangle, Clock, Tractor, Store, Settings2, CheckCircle2, CircleOff, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClaimReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  // idle: Image 2. rejected: Image 1.
  const [actionState, setActionState] = useState<'idle' | 'rejected' | 'partial' | 'full'>('idle');

  const handleDecision = (decision: 'rejected' | 'partial' | 'full') => {
    setActionState(decision);
  };

  const getDecisionLabel = () => {
    if (actionState === 'rejected') return { text: "Tolak Klaim", color: "text-red-700" };
    if (actionState === 'partial') return { text: "Setujui Sebagian", color: "text-yellow-600" };
    if (actionState === 'full') return { text: "Setujui Penuh", color: "text-emerald-700" };
    return null;
  };

  const decisionLabel = getDecisionLabel();

  return (
    <div className="p-8 pb-24">
      {/* Back button logic */}
      <Link href={actionState === 'idle' ? "/operator/claims" : "/operator/claims?view=history"} className="inline-block mb-6 text-sm font-bold text-gray-500 hover:text-gray-800 transition">
        ← {actionState === 'idle' ? "Kembali ke Antrean" : "Kembali ke Riwayat"}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#b91c1c] text-white text-xs font-bold tracking-wider uppercase">
              <AlertTriangle className="w-3 h-3" /> SLA Kritis
            </span>
            <span className="text-gray-500 font-medium text-sm">Dispute Case ID</span>
          </div>
          <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Putusan Sengketa: {resolvedParams.id}</h1>
          <p className="text-gray-600 font-medium">Review evidence from both parties regarding quality degradation during transit.</p>
        </div>
        
        <div className="text-right">
          {actionState === 'idle' ? (
            <>
              <div className="text-sm font-medium text-gray-500 mb-1">Time Remaining (SLA)</div>
              <div className="text-2xl font-bold text-[#b91c1c] font-serif">02:14:59</div>
            </>
          ) : (
            <div className={`text-xl font-bold font-serif ${decisionLabel?.color}`}>
              {decisionLabel?.text}
            </div>
          )}
        </div>
      </div>

      {actionState !== 'idle' && (
        <div className={`mb-4 text-lg font-bold font-serif ${decisionLabel?.color}`}>
          {decisionLabel?.text}
        </div>
      )}

      {/* Evidence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Buyer Side */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-[#0a1c38] font-bold flex items-center gap-2">
              <Store className="w-5 h-5 text-red-700" /> Bukti HORECA (Buyer)
            </h2>
            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Claimant</span>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div className="text-sm text-gray-500 font-medium">Nama Buyer/Tokonya</div>
            <div className="w-full bg-gray-100 rounded-lg overflow-hidden h-48 relative border border-gray-200">
              <img src="https://thetomatonews.com/wp-content/uploads/2021/04/Tomatoes-in-boxes.jpg" alt="Rotten Tomatoes" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
            </div>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 mt-2">
              <div className="text-xs text-gray-500 font-bold mb-1">Claim Request</div>
              <div className="text-xl font-bold text-red-700 mb-3 font-serif">Klaim 15% (Rp 1.125.000)</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Notes: "Kondisi tomat tiba membusuk dan berair. Tidak layak pakai untuk menu salad kami. 15% dari total pengiriman hancur."
              </p>
            </div>
          </div>
        </div>

        {/* Seller Side */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-[#0a1c38] font-bold flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-700" /> Data Tenant (Seller)
            </h2>
            <span className="bg-[#064e3b] text-white text-xs font-bold px-2 py-1 rounded">Supplier</span>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div className="text-sm text-gray-500 font-medium">Nama Tenant</div>
            <div className="w-full bg-gray-100 rounded-lg overflow-hidden h-48 relative border border-gray-200">
              <img src="https://media.licdn.com/dms/image/C4D12AQExy-8Kj-wZ2w/article-cover_image-shrink_600_2000/0/1628189871790?e=2147483647&v=beta&t=H3-gJzj-sFjB6-zJ_c7J3j-zG8p8G8H3-gJzj-sFjB6" alt="Warehouse" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
            </div>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 mt-2">
              <div className="text-xs text-gray-500 font-bold mb-1">Departure Status</div>
              <div className="text-xl font-bold text-emerald-800 mb-3 font-serif">Dikirim mulus 50 Box</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Notes: "QC lolos 100%. Suhu kontainer dipastikan 12C saat muat. Packing standar ekspor."
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Logistics Telemetry */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[#0a1c38] font-bold font-serif">Logistics Telemetry (Auto-Pulled)</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Transit Time</div>
            <div className="text-lg font-bold text-[#0a1c38] mb-1 font-serif">14h 30m</div>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Within SLA</div>
          </div>
          <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Avg Temp</div>
            <div className="text-lg font-bold text-red-600 mb-1 font-serif">18.5°C</div>
            <div className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> +6.5°C Dev</div>
          </div>
          <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Shock Events</div>
            <div className="text-lg font-bold text-[#0a1c38] mb-1 font-serif">2</div>
            <div className="text-xs text-gray-600">Minor bumps log</div>
          </div>
          <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Escrow Total</div>
            <div className="text-lg font-bold text-[#0a1c38] mb-1 font-serif">Rp 7.500.000</div>
            <div className="text-xs text-gray-600">Locked Funds</div>
          </div>
        </div>
      </div>

      {/* Action Block */}
      {actionState === 'idle' && (
        <div className="bg-[#1e293b] rounded-xl p-6 shadow-lg border border-slate-700 animate-in slide-in-from-bottom-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white font-serif mb-1 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-slate-400" /> Putusan & Potong Escrow
            </h2>
            <p className="text-slate-400 text-sm">Finalize decision. This action is irreversible and will execute smart contracts to release funds.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => handleDecision('rejected')}
              className="flex-1 p-5 rounded-lg border border-[#991b1b] bg-[#b91c1c] text-white hover:bg-[#991b1b] transition group flex flex-col items-center justify-center gap-2"
            >
              <CircleOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-lg font-serif">Tolak Klaim</div>
                <div className="text-xs text-red-200 mt-1">(Escrow Cair Penuh)</div>
              </div>
            </button>
            
            <button 
              onClick={() => handleDecision('partial')}
              className="flex-1 p-5 rounded-lg border border-yellow-700 bg-[#1e293b] hover:bg-slate-800 text-yellow-500 transition group flex flex-col items-center justify-center gap-2"
            >
              <Scale className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-lg font-serif">Setujui Sebagian</div>
                <div className="text-xs text-yellow-700 mt-1 opacity-80">Custom Amount</div>
              </div>
            </button>

            <button 
              onClick={() => handleDecision('full')}
              className="flex-1 p-5 rounded-lg border border-[#064e3b] bg-[#022c22] text-white hover:bg-emerald-950 transition group flex flex-col items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-lg font-serif">Setujui Penuh</div>
                <div className="text-xs text-emerald-300 mt-1 opacity-80">(Potong Rp 1.125.000)</div>
              </div>
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
