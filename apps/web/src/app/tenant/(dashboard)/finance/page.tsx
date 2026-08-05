"use client";

import React from 'react';
import { Landmark, ArrowDownCircle, Info, Filter, Download } from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen font-serif">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0a381f] mb-2">Keuangan & Escrow</h1>
        <p className="text-sm text-gray-500 font-sans">Buku besar (Ledger) transparan untuk semua transaksi Anda.</p>
      </div>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
        
        {/* Saldo Ditarik */}
        <div className="bg-[#0a381f] text-white rounded-2xl p-8 flex flex-col justify-between min-h-[200px] shadow-lg relative overflow-hidden">
          {/* subtle background pattern */}
          <div className="absolute right-0 top-0 opacity-10">
            <Landmark className="w-48 h-48 transform translate-x-1/4 -translate-y-1/4" />
          </div>
          
          <div className="relative z-10">
            <div className="text-sm font-medium text-emerald-100/80 mb-2">Saldo Bisa Ditarik</div>
            <div className="text-4xl font-black tracking-tight">Rp 8.500.000</div>
          </div>
          
          <div className="relative z-10 mt-6">
            <button className="bg-white text-[#0a381f] px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
              <Landmark className="w-4 h-4" /> Tarik Dana (Withdraw)
            </button>
          </div>
        </div>

        {/* Dana Escrow */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col justify-between min-h-[200px] shadow-sm">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              Dana Escrow (Tertahan) <Info className="w-3 h-3 text-gray-400" />
            </div>
            <div className="text-4xl font-black text-[#0a381f] tracking-tight">Rp 12.000.000</div>
          </div>
          
          <div className="mt-6 flex items-center justify-between bg-[#f0f4f8] rounded-xl p-3 border border-[#d9e2ec]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4f6f8f]">
              <ArrowDownCircle className="w-4 h-4" /> Tersedia 1 PO untuk logistik
            </div>
            <button className="bg-[#d9e5f7] text-[#2d4b79] px-4 py-1.5 rounded-lg text-xs font-black hover:bg-[#c1d3f0] transition shadow-sm">
              Cairkan 30%
            </button>
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden font-sans">
        
        {/* Table Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfcfc]">
          <h2 className="text-lg font-bold text-[#0a381f] font-serif">
            Mutasi Escrow <span className="text-sm font-normal text-gray-500 font-sans ml-2">(Append-Only Ledger)</span>
          </h2>
          <div className="flex gap-2">
            <button className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition shadow-sm">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f4f8] text-[10px] font-bold text-[#4f6f8f] border-b border-[#d9e2ec]">
                <th className="py-4 px-6 uppercase tracking-wider text-center">Tanggal</th>
                <th className="py-4 px-6 uppercase tracking-wider text-center">Ref ID</th>
                <th className="py-4 px-6 uppercase tracking-wider">Tipe</th>
                <th className="py-4 px-6 uppercase tracking-wider">Deskripsi</th>
                <th className="py-4 px-6 uppercase tracking-wider text-right">Jumlah</th>
                <th className="py-4 px-6 uppercase tracking-wider text-right">Saldo Tertahan</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              
              <tr className="hover:bg-gray-50 transition">
                <td className="py-5 px-6 text-gray-500 text-center text-xs">04 Ags</td>
                <td className="py-5 px-6 font-bold text-gray-900 text-center font-serif text-xs">INV-0950</td>
                <td className="py-5 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-[#d1f4e0] text-[#0a6c38] border border-[#a3e5c0]">
                    RELEASE
                  </span>
                </td>
                <td className="py-5 px-6 text-gray-600 text-xs">Pencairan PO Selesai</td>
                <td className="py-5 px-6 text-right font-medium text-red-500 text-xs">- Rp 4.000.000</td>
                <td className="py-5 px-6 text-right font-bold text-gray-900 text-xs">Rp 12.000.000</td>
              </tr>

              <tr className="hover:bg-gray-50 transition">
                <td className="py-5 px-6 text-gray-500 text-center text-xs">02 Ags</td>
                <td className="py-5 px-6 font-bold text-gray-900 text-center font-serif text-xs">KLM-011</td>
                <td className="py-5 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-[#fbd5d5] text-[#9b1c1c] border border-[#f8b4b4]">
                    POTONG_KLAIM
                  </span>
                </td>
                <td className="py-5 px-6 text-gray-600 text-xs">Klaim Mutu Tomat</td>
                <td className="py-5 px-6 text-right font-medium text-red-500 text-xs">- Rp 500.000</td>
                <td className="py-5 px-6 text-right font-bold text-gray-900 text-xs">Rp 16.000.000</td>
              </tr>

              <tr className="hover:bg-gray-50 transition">
                <td className="py-5 px-6 text-gray-500 text-center text-xs">01 Ags</td>
                <td className="py-5 px-6 font-bold text-gray-900 text-center font-serif text-xs">PO-0991</td>
                <td className="py-5 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-[#fbe8cc] text-[#9a5b13] border border-[#f3d0a2]">
                    HOLD
                  </span>
                </td>
                <td className="py-5 px-6 text-gray-600 text-xs">Pesanan Baru Masuk</td>
                <td className="py-5 px-6 text-right font-medium text-emerald-600 text-xs">+ Rp 7.500.000</td>
                <td className="py-5 px-6 text-right font-bold text-gray-900 text-xs">Rp 16.500.000</td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#fcfcfc] border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <div>Menampilkan 3 dari 128 mutasi</div>
          <div className="flex gap-1">
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50">&lt;</button>
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50">&gt;</button>
          </div>
        </div>

      </div>

    </div>
  );
}
