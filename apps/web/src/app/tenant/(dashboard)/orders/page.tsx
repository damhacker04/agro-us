"use client";

import React from "react";
import { 
  Search, 
  CalendarClock, 
  Clock, 
  Package, 
  Truck, 
  ShoppingCart, 
  CheckCircle2, 
  Wallet,
  Filter,
  MoreVertical,
  Printer,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function OrderManagementPage() {
  const stats = [
    { label: "PERLU TINDAKAN", value: "3", icon: CalendarClock, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
    { label: "MENUNGGU PANEN", value: "2", icon: Clock, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
    { label: "SIAP PACKING", value: "2", icon: Package, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "DALAM PENGIRIMAN", value: "1", icon: Truck, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
  ];

  const secondaryStats = [
    { label: "PESANAN AKTIF", value: "8", icon: ShoppingCart, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-100" },
    { label: "SELESAI", value: "2", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "ESCROW AKTIF", value: "Rp 20.530.000", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  ];

  const transactions = [
    {
      id: "PO-0991",
      buyer: "Restoran HORECA Sejahtera",
      buyerType: "",
      commodity: "Tomat Beef",
      qty: "50 Box",
      price: "Rp 7.500.000",
      status: "Menunggu Konfirmasi",
      action: "Tinjau",
    },
    {
      id: "PO-0985",
      buyer: "Hotel Grand Bintang",
      buyerType: "",
      commodity: "Sawi Pakcoy",
      qty: "100 Kg",
      price: "Rp 1.500.000",
      status: "Dikirim",
      action: "Lihat Live Tracking",
    },
    {
      id: "PO-0950",
      buyer: "Catering Ibu Ani",
      buyerType: "",
      commodity: "Cabai Rawit",
      qty: "20 Box",
      price: "Rp 4.000.000",
      status: "Selesai (Dana Cair)",
      action: "Lihat Invoice",
    },
    {
      id: "PO-0985",
      buyer: "Hotel Grand Bintang",
      buyerType: "Client Korporat",
      commodity: "Sawi Pakcoy",
      qty: "100 Kg",
      price: "Rp 1.500.000",
      status: "Siap Packing",
      action: "Cetak Label",
    },
    {
      id: "PO-0950",
      buyer: "Catering Ibu Ani",
      buyerType: "",
      commodity: "Cabai Rawit",
      qty: "20 Box",
      price: "Rp 4.000.000",
      status: "Selesai (Dana Cair)",
      action: "Lihat Invoice",
    },
    {
      id: "PO-0991",
      buyer: "Restoran HORECA Sejahtera",
      buyerType: "",
      commodity: "Tomat Beef",
      qty: "50 Box",
      price: "Rp 7.500.000",
      status: "Menunggu Konfirmasi",
      action: "Tinjau",
    },
    {
      id: "PO-0948",
      buyer: "Supermarket Maju Jaya",
      buyerType: "",
      commodity: "Paprika Merah",
      qty: "15 Box",
      price: "Rp 3.250.000",
      status: "Menunggu Panen",
      action: "Detail",
    },
    {
      id: "PO-0948",
      buyer: "Supermarket Maju Jaya",
      buyerType: "",
      commodity: "Paprika Merah",
      qty: "15 Box",
      price: "Rp 3.250.000",
      status: "Menunggu Panen",
      action: "Detail",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Menunggu Konfirmasi':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" /> Menunggu Konfirmasi
          </div>
        );
      case 'Dikirim':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold">
            <Truck className="w-3 h-3" /> Dikirim
          </div>
        );
      case 'Selesai (Dana Cair)':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Selesai (Dana Cair)
          </div>
        );
      case 'Siap Packing':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold">
            <Package className="w-3 h-3" /> Siap Packing
          </div>
        );
      case 'Menunggu Panen':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-bold">
            <Clock className="w-3 h-3" /> Menunggu Panen
          </div>
        );
      default:
        return null;
    }
  };

  const getActionButton = (action: string) => {
    switch(action) {
      case 'Tinjau':
        return <button className="bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold px-5 py-2 rounded-lg transition shadow-sm">Tinjau</button>;
      case 'Lihat Live Tracking':
        return <button className="bg-[#0a381f] hover:bg-[#114b2d] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm">Lihat Live Tracking</button>;
      case 'Cetak Label':
        return <button className="bg-[#0a381f] hover:bg-[#114b2d] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm">Cetak Label</button>;
      case 'Lihat Invoice':
        return <button className="text-gray-700 hover:text-gray-900 font-bold text-[10px] transition">Lihat Invoice</button>;
      case 'Detail':
        return <button className="text-gray-400 hover:text-gray-600 font-bold text-[10px] transition">Detail</button>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Cari id pesanan, klien, atau produk" 
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Manajemen Pesanan</h1>
        <p className="text-sm text-gray-500 max-w-3xl leading-relaxed">
          Kelola pesanan HORECA, cetak label pengiriman, dan pantau status Escrow untuk menjaga kelancaran arus kas bisnis Anda.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} ${stat.border}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-black text-gray-500 mb-1 tracking-wider">{stat.label}</div>
                <div className="text-2xl font-black text-gray-900 leading-none">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {secondaryStats.map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} ${stat.border}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-black text-gray-500 mb-1 tracking-wider">{stat.label}</div>
                <div className="text-2xl font-black text-gray-900 leading-none">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#f0f4f8] p-1 rounded-xl w-max">
        <button className="px-5 py-2 rounded-lg bg-white shadow-sm text-xs font-bold text-gray-900">
          Semua
        </button>
        <button className="px-5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-2">
          Perlu Tindakan <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">1</span>
        </button>
        <button className="px-5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900">
          Menunggu Panen
        </button>
        <button className="px-5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900">
          Siap Dikirim
        </button>
        <button className="px-5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900">
          Selesai
        </button>
      </div>

      {/* Transaction Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="font-black text-sm text-gray-900">Daftar Transaksi</h2>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600">
              <Filter className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] text-[10px] font-black text-gray-500 border-b border-gray-200">
                <th className="py-4 px-6 uppercase tracking-wider">NO. PO</th>
                <th className="py-4 px-6 uppercase tracking-wider">PEMBELI</th>
                <th className="py-4 px-6 uppercase tracking-wider">KOMODITAS</th>
                <th className="py-4 px-6 uppercase tracking-wider">KUANTITAS</th>
                <th className="py-4 px-6 uppercase tracking-wider">TOTAL HARGA</th>
                <th className="py-4 px-6 uppercase tracking-wider">STATUS</th>
                <th className="py-4 px-6 uppercase tracking-wider text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {transactions.map((trx, idx) => (
                <tr key={idx} className="hover:bg-[#f9fafb] transition">
                  <td className="py-5 px-6 font-bold text-gray-900 whitespace-nowrap">{trx.id}</td>
                  <td className="py-5 px-6">
                    <div className="font-bold text-gray-900">{trx.buyer}</div>
                    {trx.buyerType && <div className="text-[9px] text-gray-400 mt-0.5">{trx.buyerType}</div>}
                  </td>
                  <td className="py-5 px-6 font-medium text-gray-600">{trx.commodity}</td>
                  <td className="py-5 px-6">
                    <div className="inline-flex items-center justify-center bg-[#f0f4f8] text-[#4f6f8f] text-[10px] font-bold px-2.5 py-1 rounded-md border border-[#d9e2ec]">
                      {trx.qty.split(" ")[0]} <br/> {trx.qty.split(" ")[1]}
                    </div>
                  </td>
                  <td className="py-5 px-6 font-black text-gray-900">{trx.price}</td>
                  <td className="py-5 px-6 whitespace-nowrap">{getStatusBadge(trx.status)}</td>
                  <td className="py-5 px-6 text-center whitespace-nowrap">
                    {getActionButton(trx.action)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-[#f9fafb]">
          <div className="text-[10px] font-medium text-gray-500">Menampilkan 1-4 dari 124 pesanan</div>
          <div className="flex gap-1">
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-[10px]">&lt;</button>
            <button className="w-6 h-6 rounded bg-[#0a381f] text-white flex items-center justify-center font-bold text-[10px]">1</button>
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-medium text-[10px]">2</button>
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-medium text-[10px]">3</button>
            <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-[10px]">&gt;</button>
          </div>
        </div>
      </div>

      {/* Footer Call-to-actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 pb-8">
        {/* Automasi Logistik */}
        <div className="bg-[#0a381f] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition">
          <Printer className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-white font-black text-sm mb-2">Automasi Logistik?</h3>
            <p className="text-[#a4ccb6] text-xs leading-relaxed max-w-[250px]">
              Gunakan fitur cetak massal label pengiriman dan integrasi kurir AgroExpress untuk memproses 50+ pesanan sekaligus.
            </p>
          </div>
          <button className="relative z-10 w-max mt-6 bg-white text-[#0a381f] text-[10px] font-black px-4 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition">
            Cetak Label Massal
          </button>
        </div>

        {/* Escrow & Transparansi */}
        <div className="bg-[#eef3fb] border border-[#d9e5f7] rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex items-center gap-2 font-black text-sm text-[#2d4b79] mb-3">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              Escrow & Transparansi
            </div>
            <p className="text-[#56739d] text-xs leading-relaxed">
              Setiap transaksi di AgroUs dilindungi oleh sistem Escrow. Dana hanya akan dicairkan ke rekening Anda setelah pembeli mengonfirmasi penerimaan barang berkualitas.
            </p>
          </div>
          <Link href="#" className="w-max mt-6 text-[#3b66a8] font-bold text-[10px] hover:text-[#2d4b79] transition flex items-center gap-1">
            Pelajari kebijakan pencairan dana <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
