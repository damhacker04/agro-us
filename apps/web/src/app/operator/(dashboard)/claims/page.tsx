"use client";

import React, { use } from "react";
import { AlertTriangle, Clock, Activity, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ClaimsQueuePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = use(searchParams);
  const view = resolvedSearchParams?.view as string || 'queue';
  const isHistory = view === 'history';

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">
            {isHistory ? "Riwayat Resolusi Klaim" : "Antrean Resolusi Klaim"}
          </h1>
          {!isHistory && (
            <p className="text-gray-600 font-medium">Manage and adjudicate high-priority claims requiring manual intervention.</p>
          )}
        </div>
        
        {/* Toggle Button */}
        <Link href={isHistory ? "/operator/claims" : "/operator/claims?view=history"}>
          <button className="px-6 py-2.5 border-2 border-[#0a1c38] text-[#0a1c38] font-bold rounded-lg hover:bg-slate-50 transition shadow-sm">
            {isHistory ? "Lihat Antrean" : "Riwayat Klaim"}
          </button>
        </Link>
      </div>

      {/* Alert */}
      <div className="bg-[#ffedd5] border border-[#fed7aa] rounded-xl p-5 mb-8 flex gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-[#9a3412] shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-[#9a3412]">Operator Action Required</h3>
          <p className="text-sm text-[#9a3412] mt-1">Klaim {">"} 10% membutuhkan intervensi Operator. Patuhi batas waktu 24 jam kerja.</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widest text-left">ID KLAIM</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widest text-left">REF PO</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widest text-left">PERSENTASE RUSAK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widest text-left">
                  {isHistory ? "PUTUSAN" : "TENGGAT WAKTU"}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-widest">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              
              {!isHistory ? (
                // --- QUEUE VIEW ---
                <>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">KLM-091</td>
                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 text-left">PO-0991</td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                        <Activity className="w-4 h-4" /> 15% (7.5 Box)
                      </div>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-1.5 text-red-600 text-sm font-bold bg-red-50 inline-flex px-2 py-1 rounded">
                        <Clock className="w-4 h-4" /> 01:45:00
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Link href="/operator/claims/KLM-091">
                        <button className="px-6 py-2 bg-[#064e3b] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#022c22] transition-all">Adili</button>
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">KLM-092</td>
                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 text-left">PO-0985</td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2 text-yellow-600 text-sm font-bold">
                        <Activity className="w-4 h-4" /> 12% (12 Kg)
                      </div>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-1.5 text-yellow-600 text-sm font-bold bg-yellow-50 inline-flex px-2 py-1 rounded">
                        <Clock className="w-4 h-4" /> 08:30:00
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button className="px-6 py-2 bg-[#064e3b] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#022c22] transition-all">Adili</button>
                    </td>
                  </tr>
                </>
              ) : (
                // --- HISTORY VIEW ---
                <>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">KLM-091</td>
                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 text-left">PO-0991</td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                        <Activity className="w-4 h-4" /> 15% (7.5 Box)
                      </div>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <span className="text-red-700 font-bold text-sm">Tolak Klaim</span>
                    </td>
                    <td className="px-6 py-5">
                      <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all">Detail</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">KLM-092</td>
                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 text-left">PO-0985</td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2 text-yellow-600 text-sm font-bold">
                        <Activity className="w-4 h-4" /> 12% (12 Kg)
                      </div>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <span className="text-yellow-600 font-bold text-sm">Setujui Sebagian</span>
                    </td>
                    <td className="px-6 py-5">
                      <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all">Detail</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0a1c38] text-left">KLM-093</td>
                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 text-left">PO-0955</td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" /> 10% (10 Kg)
                      </div>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <span className="text-emerald-700 font-bold text-sm">Setujui Penuh</span>
                    </td>
                    <td className="px-6 py-5">
                      <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all">Detail</button>
                    </td>
                  </tr>
                </>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
