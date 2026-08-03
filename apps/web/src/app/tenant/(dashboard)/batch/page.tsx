"use client";

import React from "react";
import Link from "next/link";
import { 
  Plus, 
  ClipboardList, 
  CheckCircle, 
  Leaf, 
  LayoutList, 
  LayoutGrid,
  Sprout,
  MoreHorizontal,
  Check,
  TrendingUp,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function TenantBatchManagementPage() {
  return (
    <div className="p-8 pb-20 max-w-6xl mx-auto min-h-full">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight mb-2">Manajemen Batch</h1>
          <p className="text-sm text-gray-500">Pantau dan kelola siklus produksi pertanian secara real-time.</p>
        </div>
        <Link 
          href="/tenant/batch/new"
          className="bg-[#0a381f] text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-[#114b2d] transition shadow-md"
        >
          <Plus className="w-5 h-5" /> Buat Batch Baru
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <ClipboardList className="w-24 h-24 text-gray-100 absolute -right-4 -bottom-4" />
          <div className="relative">
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Total Batch Aktif</div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-gray-900">3</span>
              <span className="text-sm font-medium text-gray-500 mb-1">Unit Produksi</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <CheckCircle className="w-24 h-24 text-gray-100 absolute -right-4 -bottom-4" />
          <div className="relative">
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Terverifikasi NDVI</div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-black text-emerald-700">2</span>
              <span className="text-sm font-bold text-emerald-700 mb-1">Lahan Sehat</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> +12% dari bulan lalu
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <Leaf className="w-24 h-24 text-amber-50 absolute -right-4 -bottom-4" />
          <div className="relative">
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Siap Panen Bulan Ini</div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-black text-blue-600">1</span>
              <span className="text-sm font-bold text-blue-600 mb-1">Antrian Panen</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400" /> Estimasi: 24 Okt 2026
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30 rounded-t-2xl">
          <h3 className="font-bold text-gray-900">Daftar Batch Berjalan</h3>
          <div className="flex gap-2 text-gray-400">
            <button className="p-1 hover:text-gray-900 text-gray-900 transition"><LayoutList className="w-5 h-5" /></button>
            <button className="p-1 hover:text-gray-900 transition"><LayoutGrid className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/5">ID & Komoditas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/5">Lokasi Lahan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/5">Progres Kuota</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Verifikasi</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              
              {/* Row 1 */}
              <tr className="hover:bg-gray-50 transition group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900 text-sm">B-1001</div>
                      <div className="text-xs text-gray-500">Tomat Beef Premium</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="font-bold text-gray-800 text-xs mb-0.5">Blok Utara Utama</div>
                  <div className="text-[10px] text-gray-500">0,5 Ha • Irigasi Otomatis</div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-gray-900">20/35 Box</span>
                    <span className="text-blue-600">60%</span>
                  </div>
                  <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-[10px] font-bold border border-blue-200">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Masa Tanam
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-emerald-600 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" /> Terverifikasi NDVI
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="border border-gray-300 bg-white text-gray-700 font-bold text-xs px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm w-full text-center">
                    Lihat Detail
                  </button>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-gray-50 transition group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                      <MoreHorizontal className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900 text-sm">B-1002</div>
                      <div className="text-xs text-gray-500">Cabai Rawit Merah</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="font-bold text-gray-800 text-xs mb-0.5">Blok Selatan</div>
                  <div className="text-[10px] text-gray-500">0,2 Ha • Tanah Lempung</div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-gray-900">0/20 Box</span>
                    <span className="text-gray-400">0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "0%" }}></div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Menunggu Bibit
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-500 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
                    <Calendar className="w-3.5 h-3.5" /> Menunggu Data
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="border border-gray-300 bg-white text-gray-700 font-bold text-xs px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm w-full text-center">
                    Lihat Detail
                  </button>
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-gray-50 transition group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-gray-900 text-sm">B-0998</div>
                      <div className="text-xs text-gray-500">Sawi Pakcoy</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="font-bold text-gray-800 text-xs mb-0.5">Blok Timur</div>
                  <div className="text-[10px] text-gray-500">0,8 Ha • Greenhouse A</div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-gray-900">100/100 Box</span>
                    <span className="text-emerald-600">100%</span>
                  </div>
                  <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }}></div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Siap Panen
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-emerald-600 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" /> Terverifikasi NDVI
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button className="bg-blue-50 text-blue-700 font-bold text-xs px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm w-full text-center">
                    Tandai Panen
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-gray-100 bg-blue-50/20 rounded-b-2xl flex items-center justify-between text-xs text-gray-500 font-medium">
          <div>Menampilkan 1-3 dari 3 batch berjalan</div>
          <div className="flex gap-1 items-center">
            <button className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&lt;</button>
            <button className="w-6 h-6 flex items-center justify-center rounded bg-[#0a381f] text-white font-bold">1</button>
            <button className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&gt;</button>
          </div>
        </div>

      </div>

    </div>
  );
}
