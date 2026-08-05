"use client";

import React, { use } from 'react';
import { ArrowLeft, Printer, Download, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function InvoicePage({ params }: any) {
  const resolvedParams = use(params) as any;
  const id = resolvedParams?.id || 'PO-0950';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 font-serif">
      <div className="max-w-4xl mx-auto">
        {/* Top Controls */}
        <div className="flex justify-between items-center mb-6 font-sans">
          <Link href={`/tenant/orders/${id}?status=selesai`} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm">
              <Printer className="w-4 h-4" /> Cetak
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#0a381f] rounded-lg text-sm font-bold text-white hover:bg-[#114b2d] transition shadow-sm">
              <Download className="w-4 h-4" /> Unduh PDF
            </button>
          </div>
        </div>

        {/* Invoice Paper */}
        <div className="bg-white rounded-xl shadow-lg border-t-[8px] border-[#0a381f] p-12 md:p-16 relative overflow-hidden">
          
          {/* Lunas Stamp */}
          <div className="absolute top-16 right-16 border-[4px] border-emerald-600 text-emerald-600 font-black text-4xl tracking-widest px-8 py-3 rounded-lg transform rotate-[-12deg] opacity-80 pointer-events-none">
            LUNAS / PAID
          </div>

          {/* Header */}
          <div className="mb-16">
            <h1 className="text-3xl font-bold text-[#0a381f] mb-2">Farm Fresh Berdikari</h1>
            <p className="text-gray-500 font-medium tracking-wide text-sm">B2B Escrow System</p>
          </div>

          {/* Info Section */}
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-3">KEPADA:</div>
              <div className="text-lg font-bold text-gray-900 mb-1">Catering Ibu Ani</div>
              <div className="text-sm text-gray-600">Jl. Melati No. 12, Malang.</div>
            </div>
            
            <div className="text-right space-y-6">
              <div>
                 <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">NO. INVOICE</div>
                 <div className="text-base font-bold text-gray-900">INV-0950</div>
              </div>
              <div>
                 <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">TANGGAL SELESAI</div>
                 <div className="text-base text-gray-800">16 Agustus 2026</div>
              </div>
              <div>
                 <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">NO. PO REFERENSI</div>
                 <div className="text-base text-gray-800">{id}</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-gray-200 text-[11px] text-gray-500 tracking-wider">
                  <th className="py-4 px-6 font-medium">Deskripsi Komoditas</th>
                  <th className="py-4 px-6 font-medium text-center">Kuantitas</th>
                  <th className="py-4 px-6 font-medium text-right">Harga Satuan</th>
                  <th className="py-4 px-6 font-medium text-right">Ongkir</th>
                  <th className="py-4 px-6 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="py-6 px-6 text-gray-900">Cabai Rawit Premium (Grade A)</td>
                  <td className="py-6 px-6 text-center text-gray-800 font-medium">20 Box</td>
                  <td className="py-6 px-6 text-right text-gray-600">Rp 200.000</td>
                  <td className="py-6 px-6 text-right text-gray-600">Rp 7.000</td>
                  <td className="py-6 px-6 text-right text-gray-900 font-medium">Rp 4.007.000</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-16">
            <div className="w-full max-w-md">
              <div className="flex justify-between py-3 border-b border-gray-100 text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900 font-medium">Rp 4.007.000</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100 text-sm">
                <span className="text-gray-600">Biaya Layanan Escrow (0% Promo):</span>
                <span className="text-gray-900 font-medium">Rp 0</span>
              </div>
              <div className="flex justify-between py-6 items-center">
                <span className="text-xl text-gray-800">Grand Total:</span>
                <span className="text-4xl font-bold text-[#0a381f]">Rp 4.007.000</span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-[#f0fdf4] border border-emerald-200 rounded-xl p-6 flex gap-4 items-start">
            <div className="bg-emerald-600 text-white rounded-full p-1 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900 mb-2 font-sans">Pencairan Dana Berhasil</h3>
              <p className="text-sm text-emerald-800 leading-relaxed font-sans">
                Dana sebesar <strong className="font-black">Rp 4.000.000</strong> telah diteruskan dari rekening penampungan AgroUs ke rekening BCA (****1234) milik Farm Fresh Berdikari pada 04 Agustus 2026 pukul 09:00 WIB.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
