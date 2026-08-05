"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  X,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  Calendar,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

export default function TenantProgressReportPage() {
  const router = useRouter();
  const [progressTab, setProgressTab] = useState<"lanjutan" | "ralat">("lanjutan");

  const [newProgress, setNewProgress] = useState({
    type: "Penyiraman & Pupuk",
    desc: "",
    hasImage: false
  });

  const handleSubmitProgress = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/tenant/batch/B-1001?po=open");
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col sm:items-center sm:justify-center sm:p-6">
      
      {/* Mobile-first Container (Full width on mobile, max-md on desktop) */}
      <div className="bg-white w-full h-full min-h-screen sm:min-h-0 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-[#0a381f] text-white p-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-sm">Lapor Progres Lapangan</h2>
            <div className="text-[10px] text-emerald-200">Batch B-1001</div>
          </div>
          <button 
            onClick={() => router.push("/tenant/batch/B-1001?po=open")} 
            className="text-emerald-100 hover:text-white p-1 rounded-full hover:bg-[#114b2d] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-white p-5">
          
          {/* Info Banner */}
          <div className="bg-[#f0f4f8] border border-blue-100 rounded-xl p-3 flex justify-between items-center mb-6">
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">LOKASI</div>
              <div className="text-xs font-bold text-[#165634] flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /> GPS: Akurasi Tinggi (Di dalam Poligon)
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">WAKTU</div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1 justify-end">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setProgressTab("lanjutan")}
              className={`flex-1 py-3 rounded-lg text-xs font-bold border transition ${
                progressTab === "lanjutan" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : "bg-[#eff3f9] border-blue-100 text-gray-500 hover:bg-gray-100"
              }`}
            >
              LANJUTAN
            </button>
            <button 
              onClick={() => setProgressTab("ralat")}
              className={`flex-1 py-3 rounded-lg text-xs font-bold border transition ${
                progressTab === "ralat" 
                  ? "bg-[#fdffe4] border-amber-200 text-amber-800" 
                  : "bg-[#eff3f9] border-blue-100 text-gray-500 hover:bg-gray-100"
              }`}
            >
              RALAT
            </button>
          </div>

          {progressTab === "lanjutan" && (
            <form id="progress-form" onSubmit={handleSubmitProgress} className="space-y-6">
              {/* Step 1 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Nama Aktivitas</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 1/3</span>
                </div>
                <input 
                  type="text"
                  placeholder="Isi nama aktivitas"
                  value={newProgress.type}
                  onChange={(e) => setNewProgress({...newProgress, type: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Deskripsi Singkat</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 2/3</span>
                </div>
                <textarea 
                  required
                  placeholder="Isi deskripsi singkat disini..."
                  rows={3}
                  value={newProgress.desc}
                  onChange={(e) => setNewProgress({...newProgress, desc: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Step 3 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Bukti Foto</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 3/3</span>
                </div>

                {!newProgress.hasImage ? (
                  <div className="space-y-3 relative">
                    <button 
                      type="button"
                      onClick={() => setNewProgress({...newProgress, hasImage: true})}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 transition group"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-xs text-gray-900 flex items-center justify-center gap-1.5 mb-1"><Camera className="w-3.5 h-3.5"/> Ambil Foto Langsung (In-App)</div>
                        <div className="text-[10px] text-gray-500">Pastikan objek terlihat jelas di bawah cahaya matahari</div>
                      </div>
                    </button>
                    
                    <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider relative">
                      <span className="bg-white px-2 relative z-10">Atau</span>
                      <div className="absolute top-1/2 inset-x-0 h-px bg-gray-100"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setNewProgress({...newProgress, hasImage: true})}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-blue-50/30 p-6 flex flex-col items-center justify-center gap-3 hover:bg-blue-50 transition group"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-xs text-gray-900 flex items-center justify-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500"/> Menurunkan Kepercayaan Node (Pilih dari galeri)</div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setNewProgress({...newProgress, hasImage: false})}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 backdrop-blur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}

          {progressTab === "ralat" && (
            <form id="progress-form" onSubmit={handleSubmitProgress} className="space-y-6">
              {/* Step 1 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Nama Aktivitas</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 1/3</span>
                </div>
                <div className="relative">
                  <select defaultValue="" className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3.5 text-sm text-gray-500 bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="" disabled>Pilih dari aktivitas apa</option>
                    <option>Bibit Ditanam</option>
                    <option>Penyiraman & Pupuk</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Deskripsi Singkat</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 2/3</span>
                </div>
                <textarea 
                  required
                  placeholder="Isi deskripsi singkat disini"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

               {/* Step 3 */}
               <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-900">Bukti Foto</label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Langkah 3/3</span>
                </div>
                <button type="button" className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-[#f4f7f9] p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 transition group">
                  <div className="w-12 h-12 bg-[#dde6ea] rounded-full flex items-center justify-center text-[#0a381f] group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xs text-gray-900 flex items-center justify-center gap-1.5 mb-1"><Camera className="w-3.5 h-3.5"/> Ambil Foto Langsung (In-App)</div>
                    <div className="text-[10px] text-gray-500">Pastikan objek terlihat jelas di bawah cahaya matahari</div>
                  </div>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Sticky Bottom Button */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 flex flex-col items-center">
          <button 
            type="submit"
            form="progress-form"
            className="w-full bg-[#0a381f] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#114b2d] transition flex items-center justify-center gap-2 mb-3"
          >
            Simpan Laporan <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-[9px] text-gray-400">Sistem AgroUs Precision Engine © 2024</div>
        </div>

      </div>
    </div>
  );
}

// Icon Helper
const MapPin = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
)
