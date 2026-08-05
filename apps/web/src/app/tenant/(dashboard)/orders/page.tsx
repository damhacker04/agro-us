"use client";

import React, { useState } from "react";
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
  ArrowRight,
  RefreshCcw,
  Hand,
  XCircle,
  X,
  Info,
  Utensils
} from "lucide-react";
import Link from "next/link";

export default function OrderManagementPage() {
  const [modalState, setModalState] = useState<'closed' | 'tinjau' | 'sesuaikan'>('closed');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [adjustmentType, setAdjustmentType] = useState<'kuantitas' | 'jadwal' | 'tolak' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<'gagal_panen' | 'kuota_habis' | null>(null);
  const [adjustedQty, setAdjustedQty] = useState("30");
  const row1Stats = [
    { label: "PERLU TINDAKAN", value: "3", icon: CalendarClock, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
    { label: "MENUNGGU PANEN", value: "2", icon: Clock, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
    { label: "SIAP PACKING", value: "2", icon: Package, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "DALAM PENGIRIMAN", value: "1", icon: Truck, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
  ];

  const row2Stats = [
    { label: "MENUNGGU PENYESUAIAN", value: "2", icon: RefreshCcw, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-100" },
    { label: "MENOLAK", value: "1", icon: Hand, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "DIBATALKAN", value: "1", icon: ShoppingCart, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
  ];

  const row3Stats = [
    { label: "PESANAN AKTIF", value: "8", icon: ShoppingCart, color: "text-cyan-500", bg: "bg-cyan-50", border: "border-cyan-100" },
    { label: "SELESAI", value: "2", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
  ];

  const transactions = [
    {
      id: "PO-0991",
      buyer: "Restoran HORECA Sejahtera",
      buyerType: "",
      commodity: "Tomat Beef",
      qty: "50 Box",
      price: "Rp 7.500.000",
      status: "Menunggu Penyesuaian",
      action: "Detail",
    },
    {
      id: "PO-0991",
      buyer: "Restoran HORECA Sejahtera",
      buyerType: "",
      commodity: "Tomat Beef",
      qty: "50 Box",
      price: "Rp 7.500.000",
      status: "Dibatalkan",
      action: "Detail",
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
      action: "Detail",
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
      case 'Menunggu Penyesuaian':
        return (
          <div className="inline-flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-600 text-[10px] font-bold leading-tight">
            <div className="flex items-center gap-1.5"><RefreshCcw className="w-3 h-3" /> Menunggu Penyesuaian</div>
            <span className="text-[8px] font-normal opacity-90">Persetujuan Penawaran Baru</span>
          </div>
        );
      case 'Menolak':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-bold">
            <Hand className="w-3 h-3" /> Menolak
          </div>
        );
      case 'Dibatalkan':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">
            <XCircle className="w-3 h-3" /> Dibatalkan
          </div>
        );
      default:
        return null;
    }
  };

  const getActionButton = (action: string, trx: any) => {
    switch(action) {
      case 'Tinjau':
        return <button onClick={() => { setSelectedOrder(trx); setModalState('tinjau'); }} className="bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold px-5 py-2 rounded-lg transition shadow-sm">Tinjau</button>;
      case 'Lihat Live Tracking':
        return <Link href={`/tenant/orders/${trx.id}?status=dikirim`} className="inline-block bg-[#0a381f] hover:bg-[#114b2d] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm">Lihat Live Tracking</Link>;
      case 'Cetak Label':
        return <Link href={`/tenant/orders/${trx.id}?status=siap-packing`} className="inline-block bg-[#0a381f] hover:bg-[#114b2d] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm">Cetak Label</Link>;
      case 'Lihat Invoice':
        return <Link href={`/tenant/orders/${trx.id}/invoice`} className="inline-block border border-gray-200 text-gray-700 hover:bg-gray-50 text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm bg-white">Lihat Invoice</Link>;
      case 'Detail': {
        let statusQuery = 'menunggu-panen';
        if (trx.status === 'Menolak') statusQuery = 'menolak';
        else if (trx.status === 'Dibatalkan') statusQuery = 'dibatalkan';
        else if (trx.status === 'Selesai (Dana Cair)') statusQuery = 'selesai';
        else if (trx.status === 'Menunggu Penyesuaian') statusQuery = 'menunggu-penyesuaian';
        else if (trx.status === 'Siap Packing') statusQuery = 'siap-packing';
        else if (trx.status === 'Dikirim') statusQuery = 'dikirim';

        return <Link href={`/tenant/orders/${trx.id}?status=${statusQuery}`} className="inline-block border border-gray-200 text-gray-700 hover:bg-gray-50 text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-sm bg-white">Detail</Link>;
      }
      default:
        return null;
    }
  };

  const filteredTransactions = transactions.filter(trx => {
    const matchesSearch = 
      trx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      trx.buyer.toLowerCase().includes(searchQuery.toLowerCase()) || 
      trx.commodity.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === "Semua") return true;
    if (activeTab === "Perlu Tindakan") return trx.status === "Menunggu Konfirmasi" || trx.status === "Menunggu Penyesuaian";
    if (activeTab === "Menunggu Panen") return trx.status === "Menunggu Panen";
    if (activeTab === "Siap Dikirim") return trx.status === "Siap Packing" || trx.status === "Dikirim";
    if (activeTab === "Selesai") return trx.status === "Selesai (Dana Cair)";
    if (activeTab === "Dibatalkan") return trx.status === "Dibatalkan" || trx.status === "Menolak";
    
    return true;
  });

  return (
    <>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari id pesanan, klien, atau produk" 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Manajemen Pesanan</h1>
          <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
            Kelola pesanan HORECA, cetak label pengiriman, dan pantau status Escrow untuk menjaga kelancaran arus kas bisnis Anda.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm shrink-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-50 text-emerald-600 border-emerald-100">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-black text-gray-500 mb-1 tracking-wider">ESCROW AKTIF</div>
            <div className="text-2xl font-black text-gray-900 leading-none">Rp 20.530.000</div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {row1Stats.map((stat, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {row2Stats.map((stat, i) => (
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

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {row3Stats.map((stat, i) => (
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
      <div className="flex bg-[#f0f4f8] p-1 rounded-xl w-max overflow-x-auto max-w-full">
        {["Semua", "Perlu Tindakan", "Menunggu Panen", "Siap Dikirim", "Selesai", "Dibatalkan"].map((tab) => {
          // Count logic
          let count = 0;
          if (tab === "Perlu Tindakan") count = transactions.filter(t => t.status === "Menunggu Konfirmasi" || t.status === "Menunggu Penyesuaian").length;
          else if (tab === "Menunggu Panen") count = transactions.filter(t => t.status === "Menunggu Panen").length;
          else if (tab === "Siap Dikirim") count = transactions.filter(t => t.status === "Siap Packing" || t.status === "Dikirim").length;
          else if (tab === "Selesai") count = transactions.filter(t => t.status === "Selesai (Dana Cair)").length;
          else if (tab === "Dibatalkan") count = transactions.filter(t => t.status === "Dibatalkan" || t.status === "Menolak").length;

          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs flex items-center gap-2 transition shrink-0 ${
                activeTab === tab ? "bg-white shadow-sm text-gray-900 font-bold" : "text-gray-600 hover:text-gray-900 font-semibold"
              }`}
            >
              {tab}
              {count > 0 && (
                <span className={`text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'Perlu Tindakan' ? 'bg-red-500' : 'bg-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
              {filteredTransactions.map((trx, idx) => (
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
                    {getActionButton(trx.action, trx)}
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


        {/* Escrow & Transparansi */}
        <div className="bg-[#eef3fb] border border-[#d9e5f7] rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition">
          <div>
            <div className="flex items-center gap-2 font-black text-sm text-[#2d4b79] mb-3">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm text-[#0a381f] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              Escrow & Transparansi
            </div>
            <p className="text-[#56739d] text-xs leading-relaxed">
              Setiap transaksi di AgroUs dilindungi oleh sistem Escrow. Dana hanya akan dicairkan ke rekening Anda setelah pembeli mengonfirmasi penerimaan barang berkualitas.
            </p>
          </div>
        </div>
      </div>

    </div>

      {/* Modals */}
      {modalState !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {modalState === 'tinjau' && (
              <>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-bold mb-2">
                      <AlertTriangle className="w-3 h-3" /> TINDAK LANJUT
                    </div>
                    <h2 className="text-lg font-black text-gray-900">Konfirmasi Pesanan</h2>
                    <p className="text-xs text-gray-500">{selectedOrder?.id} • Menunggu persetujuan Anda.</p>
                  </div>
                  <button onClick={() => setModalState('closed')} className="text-gray-400 hover:text-gray-600 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 mb-2">Pemesan:</div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className="font-black text-gray-900 text-sm">{selectedOrder?.buyer}</div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 font-bold text-gray-700 text-xs">
                        <Package className="w-4 h-4" /> Detail Pesanan
                      </div>
                      <div className="text-gray-500 text-[10px]">Qty: {selectedOrder?.qty}</div>
                    </div>
                    <div className="font-black text-sm text-gray-900 mb-1">{selectedOrder?.qty} - {selectedOrder?.commodity} Premium</div>
                    <div className="text-xs text-gray-500 mb-4">Varietas: Solanum lycopersicum L.</div>
                    <div className="bg-[#f0f4f8] rounded-lg p-3 flex justify-between items-center">
                      <div className="text-xs font-bold text-gray-700">Total Nilai:</div>
                      <div className="text-sm font-black text-[#2d4b79]">{selectedOrder?.price}</div>
                    </div>
                  </div>

                  <div className="bg-[#f0fdf4] border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Sistem mendeteksi kuota panen Anda (<strong className="font-black">Est. 14 Ags</strong>) masih mencukupi untuk pesanan ini.
                    </p>
                  </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                  <button 
                    onClick={() => {
                      setModalState('sesuaikan');
                      setAdjustmentType(null);
                      setRejectionReason(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition"
                  >
                    Tolak / Sesuaikan
                  </button>
                  <button 
                    onClick={() => setModalState('closed')}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#0a381f] text-white font-bold text-xs hover:bg-[#114b2d] transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Terima Pesanan
                  </button>
                </div>
              </>
            )}

            {modalState === 'sesuaikan' && (
              <>
                <div className="p-5 border-b border-gray-100">
                  <button onClick={() => setModalState('tinjau')} className="text-gray-500 hover:text-gray-900 font-bold text-[10px] flex items-center gap-1 mb-4 transition">
                    &larr; Kembali
                  </button>
                  <h2 className="text-lg font-black text-gray-900">Tolak atau Sesuaikan</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="bg-[#f0f4f8] text-[#4f6f8f] border border-[#d9e2ec] px-1.5 py-0.5 rounded font-bold text-[9px]">{selectedOrder?.id}</span> 
                    • {selectedOrder?.qty} {selectedOrder?.commodity} Premium
                  </div>
                </div>
                
                <div className="p-5 overflow-y-auto space-y-4">
                  <div className="bg-[#eef3fb] border border-[#d9e5f7] rounded-xl p-3 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-800 leading-relaxed">
                      Perubahan pesanan akan dikirimkan ke pihak Pembeli (HORECA) untuk disetujui kembali via sistem <strong className="font-black">Harvest Assurance.</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Sesuaikan Kuantitas */}
                    <div 
                      className={`border rounded-xl p-4 cursor-pointer transition ${adjustmentType === 'kuantitas' ? 'border-emerald-500 bg-[#f4fbf7]' : 'border-gray-200 hover:border-emerald-300'}`}
                      onClick={() => setAdjustmentType('kuantitas')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-gray-900">Sesuaikan Kuantitas (Kirim Sebagian)</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Sanggup memenuhi sebagian pesanan.</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${adjustmentType === 'kuantitas' ? 'border-[#0a381f]' : 'border-gray-300'}`}>
                          {adjustmentType === 'kuantitas' && <div className="w-2 h-2 bg-[#0a381f] rounded-full" />}
                        </div>
                      </div>
                      {adjustmentType === 'kuantitas' && (
                        <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-2 text-xs">
                          <span className="text-gray-600 font-medium">Sanggup kirim:</span>
                          <input 
                            type="text" 
                            value={adjustedQty} 
                            onChange={(e) => setAdjustedQty(e.target.value)} 
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center font-bold text-gray-900 focus:outline-none focus:border-emerald-500" 
                          />
                          <span className="text-gray-500 font-medium">dari {selectedOrder?.qty}</span>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Mundurkan Jadwal */}
                    <div 
                      className={`border rounded-xl p-4 cursor-pointer transition ${adjustmentType === 'jadwal' ? 'border-emerald-500 bg-[#f4fbf7]' : 'border-gray-200 hover:border-emerald-300'}`}
                      onClick={() => setAdjustmentType('jadwal')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-gray-900">Mundurkan Jadwal Panen</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Barang tersedia, namun butuh waktu lebih lama.</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${adjustmentType === 'jadwal' ? 'border-[#0a381f]' : 'border-gray-300'}`}>
                          {adjustmentType === 'jadwal' && <div className="w-2 h-2 bg-[#0a381f] rounded-full" />}
                        </div>
                      </div>
                      {adjustmentType === 'jadwal' && (
                        <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-3 text-xs">
                          <span className="text-gray-600 font-medium">Tanggal panen:</span>
                          <div className="bg-white px-3 py-1.5 border border-gray-200 rounded text-gray-900 font-bold shadow-sm">18 September 2026</div>
                        </div>
                      )}
                    </div>

                    {/* Option 3: Tolak Seluruhnya */}
                    <div 
                      className={`border rounded-xl p-4 transition ${adjustmentType === 'tolak' ? 'border-red-500' : 'border-gray-200 cursor-pointer hover:border-red-300'}`}
                      onClick={() => setAdjustmentType('tolak')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-sm text-gray-900">Tolak Seluruhnya</div>
                          <div className="text-[10px] text-red-500 mt-0.5 font-medium">Gagal panen atau kuota sudah habis.</div>
                        </div>
                        <div className="text-gray-400 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${adjustmentType === 'tolak' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>
                      
                      {adjustmentType === 'tolak' && (
                        <div className="mt-4 pt-4 border-t border-red-100 flex gap-3">
                          <div 
                            className={`flex-1 border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-sm ${rejectionReason === 'gagal_panen' ? 'border-red-500 text-red-700' : 'border-gray-200 bg-white text-gray-900 hover:border-red-300'}`}
                            onClick={() => setRejectionReason('gagal_panen')}
                          >
                            <span className="text-xs font-black">Gagal Panen</span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${rejectionReason === 'gagal_panen' ? 'border-red-600' : 'border-gray-300'}`}>
                              {rejectionReason === 'gagal_panen' && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                            </div>
                          </div>
                          
                          <div 
                            className={`flex-1 border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-sm ${rejectionReason === 'kuota_habis' ? 'border-red-500 text-red-700' : 'border-gray-200 bg-white text-gray-900 hover:border-red-300'}`}
                            onClick={() => setRejectionReason('kuota_habis')}
                          >
                            <span className="text-xs font-black">Kuota Habis</span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${rejectionReason === 'kuota_habis' ? 'border-red-600' : 'border-gray-300'}`}>
                              {rejectionReason === 'kuota_habis' && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-center">
                  <button 
                    onClick={() => setModalState('closed')}
                    className="w-full max-w-[240px] py-3.5 rounded-xl bg-[#0a381f] text-white font-black text-xs hover:bg-[#114b2d] transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    {adjustmentType === 'tolak' ? "Kirim Informasi Penolakan" : "Kirim Penawaran Baru"} 
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
