"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  Plus, 
  Minus, 
  Store, 
  Info,
  ShoppingCart,
  ArrowRight,
  Leaf
} from "lucide-react";

type CartItem = {
  id: string;
  seller: string;
  name: string;
  grade: string;
  harvestDate: string;
  price: number;
  qty: number;
  image: string;
  selected: boolean;
};

const INITIAL_CART: CartItem[] = [
  {
    id: "item-1",
    seller: "Farm Fresh Berdikari",
    name: "Tomat Beef Premium",
    grade: "Grade A",
    harvestDate: "05 Ags 2026",
    price: 150000,
    qty: 10,
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    selected: true,
  },
  {
    id: "item-2",
    seller: "Kebun Makmur Jaya",
    name: "Sawi Pakcoy Premium",
    grade: "Grade B",
    harvestDate: "07 Ags 2026",
    price: 100000,
    qty: 5,
    image: "https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    selected: true,
  },
  {
    id: "item-3",
    seller: "Kebun Makmur Jaya",
    name: "Sawi Pakcoy Premium",
    grade: "Grade B",
    harvestDate: "07 Ags 2026",
    price: 100000,
    qty: 5,
    image: "https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    selected: false,
  },
  {
    id: "item-4",
    seller: "Kebun Makmur Jaya",
    name: "Sawi Pakcoy Premium",
    grade: "Grade B",
    harvestDate: "07 Ags 2026",
    price: 100000,
    qty: 5,
    image: "https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    selected: false,
  },
];

export default function BuyerCartPage() {
  const [items, setItems] = useState<CartItem[]>(INITIAL_CART);

  const toggleSelect = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const updateQty = (id: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const selectedItems = items.filter(item => item.selected);
  const totalQty = selectedItems.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back button */}
      <Link 
        href="/buyer/catalog" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950 mb-2">Keranjang Pasokan</h1>
        <p className="text-gray-500 text-sm">Periksa kembali kuantitas komoditas Anda sebelum mengatur rencana pengiriman.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Items List */}
        <div className="flex-1 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={item.selected}
                    onChange={() => toggleSelect(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                  />
                  <span className="font-bold text-gray-900 text-sm">{item.seller}</span>
                </label>
                <button className="text-gray-400 hover:text-gray-600 transition">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      <button className="text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Store className="w-3.5 h-3.5" />
                      <span>Dari: <strong className="text-gray-700">{item.seller}</strong></span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {item.grade} | Panen: {item.harvestDate}
                    </div>
                    
                    <div className="text-sm font-semibold text-gray-900">
                      {formatRupiah(item.price)} <span className="text-gray-400 font-normal">/ Box</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-1">
                    <button 
                      onClick={() => updateQty(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-gray-900">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-0.5">SUBTOTAL</div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatRupiah(item.price * item.qty)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add more button */}
          <Link 
            href="/buyer/catalog"
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <ShoppingCart className="w-8 h-8 mb-3 text-gray-400" />
            <span className="text-sm font-medium">Tambahkan komoditas lain dari katalog untuk mengoptimalkan logistik Anda.</span>
          </Link>
        </div>

        {/* Right: Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Ringkasan Belanja</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Item ({selectedItems.length} Komoditas)</span>
                <span className="font-bold text-gray-900">{totalQty} Box</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal Produk</span>
                <span className="font-bold text-gray-900">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-900">Estimasi Total</span>
                <span className="text-xl font-bold text-emerald-700">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 mb-6">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Ongkos kirim terkonsolidasi dan jadwal kedatangan akan dihitung pada tahap Rencana Pengiriman.
              </p>
            </div>

            <Link 
              href="/buyer/checkout"
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold transition shadow-sm ${
                selectedItems.length > 0 
                  ? "bg-emerald-950 text-white hover:bg-emerald-900" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
              }`}
            >
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex gap-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm mb-1">AgroUs Logistics Tip</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Menggabungkan pesanan dari tenant yang berdekatan dapat mengurangi biaya emisi karbon hingga 15%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
