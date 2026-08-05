"use client";

import React from "react";
import Link from "next/link";
import { Search, Edit2, ImageIcon } from "lucide-react";

export default function TenantCatalogPage() {
  const products = [
    {
      id: 1,
      name: "Sawi Pakcoy Premium",
      grade: "GRADE A",
      price: "125.000",
      unit: "Box (5kg)",
    },
    {
      id: 2,
      name: "Cabe Rawit Merah",
      grade: "GRADE B",
      price: "200.000",
      unit: "Box (5kg)",
    },
    {
      id: 3,
      name: "Tomat Cherry",
      grade: "GRADE A",
      price: "100.000",
      unit: "Box (5kg)",
    },
    {
      id: 4,
      name: "Tomat Beef Premium",
      grade: "GRADE A",
      price: "150.000",
      unit: "Box (5kg)",
    }
  ];

  return (
    <div className="p-8 pb-20 relative min-h-full max-w-5xl mx-auto">
      
      {/* Top Actions */}
      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input 
            type="text"
            placeholder="Cari Sawi, Tomat, Cabe..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>
        <Link 
          href="/tenant/catalog/edit"
          className="bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] font-bold text-sm px-6 py-2 rounded-lg hover:bg-[#bbf7d0] transition shadow-sm"
        >
          Tambah Produk
        </Link>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition">
            
            {/* Image Placeholder */}
            <div className="h-48 bg-gray-100 flex flex-col items-center justify-center relative border-b border-gray-100">
              <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
              <div className="absolute top-4 left-4 bg-[#1e5033] text-white text-[10px] font-bold px-2 py-1 rounded-full tracking-wide">
                {product.grade}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex justify-between items-end">
              <div>
                <h3 className="font-black text-gray-900 text-lg mb-4">{product.name}</h3>
                
                <div className="text-[10px] font-bold text-gray-500 mb-1 tracking-widest uppercase">Harga Unit</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-xl text-gray-900">Rp {product.price}</span>
                  <span className="text-xs text-gray-500 font-medium">/ {product.unit}</span>
                </div>
              </div>

              <Link 
                href="/tenant/catalog/edit"
                className="w-10 h-10 bg-[#0a381f] text-white rounded-xl flex items-center justify-center hover:bg-[#114b2d] transition shadow-sm shrink-0"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
            </div>
            
          </div>
        ))}
      </div>

    </div>
  );
}
