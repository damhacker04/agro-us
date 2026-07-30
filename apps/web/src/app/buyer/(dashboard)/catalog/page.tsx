"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronDown, 
  Calendar, 
  Store, 
  ShoppingCart,
  ArrowUpDown
} from "lucide-react";

const PRODUCTS = [
  {
    id: "prod-1",
    name: "Sawi Pakcoy Premium",
    image: "https://images.unsplash.com/photo-1596180377074-ce49b596afdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    grade: "GRADE A",
    harvestDate: "27 Agustus 2026",
    stock: "15 Box",
    seller: "Farm Fresh Berdikari",
    price: "125.000",
    unit: "Box (5kg)",
  },
  {
    id: "prod-2",
    name: "Tomat Beef Premium",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    grade: "GRADE A",
    harvestDate: "01 Agustus 2026",
    stock: "10 Box",
    seller: "Tani Rawit Jos",
    price: "150.000",
    unit: "Box (5kg)",
  },
  {
    id: "prod-3",
    name: "Tomat Cherry",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", // Using same tomato for mock
    grade: "GRADE A",
    harvestDate: "20 Agustus 2026",
    stock: "30 Box",
    seller: "Kebun Makmur Jaya",
    price: "100.000",
    unit: "Box (5kg)",
  },
  {
    id: "prod-4",
    name: "Cabe Rawit Merah",
    image: "https://images.unsplash.com/photo-1588015343469-80ce5664188b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    grade: "GRADE B",
    harvestDate: "13 Agustus 2026",
    stock: "10 Box",
    seller: "Mitra Tani Malang",
    price: "200.000",
    unit: "Box (5kg)",
  },
];

export default function BuyerCatalogPage() {
  return (
    <div className="p-8">
      {/* Filters Row */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-emerald-950 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-emerald-900 transition">
            Komoditas <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-xs font-semibold hover:bg-emerald-100 transition border border-emerald-100">
            Grade
          </button>
          <button className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-xs font-semibold hover:bg-emerald-100 transition border border-emerald-100">
            Badge Verifikasi
          </button>
          <button className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-xs font-semibold hover:bg-emerald-100 transition border border-emerald-100">
            Tanggal Panen
          </button>
        </div>
        <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm">
          Urutkan: Harga Termurah <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {PRODUCTS.map((product) => (
          <Link 
            key={product.id} 
            href={`/buyer/product/${product.id}`}
            className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col"
          >
            {/* Image Section */}
            <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
              {/* Fallback color if image fails to load during dev, or use generic next/image */}
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url(${product.image})` }}
              />
              
              {/* Grade Badge */}
              <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm ${
                product.grade === 'GRADE A' ? 'bg-emerald-700' : 'bg-white border border-gray-300 !text-gray-700'
              }`}>
                {product.grade}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">
                {product.name}
              </h3>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Panen: {product.harvestDate}</span>
                </div>
                <div className="w-px h-3 bg-gray-300" />
                <span>Sisa: {product.stock}</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium mb-6">
                <Store className="w-3.5 h-3.5" />
                <span>Dari: {product.seller}</span>
              </div>

              {/* Price and Cart */}
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider">HARGA UNIT</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-gray-900">Rp {product.price}</span>
                    <span className="text-xs text-gray-500">/ {product.unit}</span>
                  </div>
                </div>
                
                <button 
                  className="w-10 h-10 rounded-xl bg-emerald-950 text-white flex items-center justify-center hover:bg-emerald-800 transition-colors shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    // Handle add to cart
                    alert("Ditambahkan ke keranjang");
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
