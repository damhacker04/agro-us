"use client";

import React, { useState, use } from "react";
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert, X, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReviewLegalityPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  // Use state to control the UI transitions
  const [actionState, setActionState] = useState<'idle' | 'rejecting' | 'rejected' | 'approved'>('idle');
  const [rejectReason, setRejectReason] = useState("");

  const formatIdToName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const tenantName = formatIdToName(resolvedParams.id);

  const handleApprove = () => {
    setActionState('approved');
  };

  const handleReject = () => {
    if(!rejectReason.trim()) return alert("Alasan penolakan wajib diisi");
    setActionState('rejected');
  };

  // Determine back link and text based on state
  const backLink = (actionState === 'rejected' || actionState === 'approved') ? "/operator/legality?view=completed" : "/operator/legality";
  const backText = (actionState === 'rejected' || actionState === 'approved') ? "Kembali ke Antrean (OP-03)" : "Kembali ke Antrean";

  return (
    <div className="p-8 pb-20">
      
      <Link href={backLink} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> {backText}
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#0a1c38] font-serif mb-2">Tinjau Legalitas: {tenantName}</h1>
          <p className="text-gray-600 font-medium">Review and verify tenant submitted legal documents.</p>
        </div>
        
        {/* Status Pill */}
        {(actionState === 'idle' || actionState === 'rejecting') && (
          <div className="bg-[#fef3c7] text-[#92400e] px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
            Menunggu Tinjauan
          </div>
        )}
        {actionState === 'rejected' && (
          <div className="bg-[#fee2e2] text-[#991b1b] px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
            Ditolak
          </div>
        )}
        {actionState === 'approved' && (
          <div className="bg-[#dcfce7] text-[#166534] px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
            Disetujui
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Documents */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0a1c38] mb-6 flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-700" /> Dokumen Pendukung
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Scan KTP Pemilik</h3>
                <div className="w-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-2 relative overflow-hidden aspect-[1.6]">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/KTP_Indonesia.jpg/800px-KTP_Indonesia.jpg" alt="KTP" className="w-full h-full object-cover rounded opacity-80 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent"></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Sertifikat NIB (Nomor Induk Berusaha)</h3>
                <div className="w-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-2 relative overflow-hidden aspect-[1.4]">
                  <img src="https://1.bp.blogspot.com/-i5aC61Q0K1Q/YS2f2KzZBMI/AAAAAAAABU4/X44UoV1_f_wX5_B48-X6Xw_38-W9Z2_CgCLcBGAsYHQ/s1040/CONTOH%2BNIB.webp" alt="NIB" className="w-full h-full object-cover rounded opacity-80 mix-blend-multiply" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Extracted Data & Actions */}
        <div className="space-y-6">
          
          {/* OCR Data */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0a1c38] mb-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" /> Data Terekstraksi (OCR)
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">NIK</span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">3573012345678901</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">Budi Santoso</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">No. NIB</span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">1234567890123</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions - Only show if not approved */}
          {actionState !== 'approved' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              
              {actionState === 'rejected' ? (
                // Rejected State View
                <div className="animate-in fade-in">
                  <div className="text-sm font-semibold text-gray-700 mb-4">
                    Catatan / Alasan Penolakan
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {rejectReason || "Lorem ipsum ini pokoknya alasan penolakannya. iosJDihSOIDsidc aiosCJOJCSJNxCnzjcs koasijcfp9wu eoghsl vgdsojvdsv soig esidjv oldjgudfn sgodov dnkvnsdoig vsndon vdlz nvcnvo ds"}
                  </div>
                </div>
              ) : (
                // Idle or Rejecting State View
                <>
                  <h2 className="text-lg font-bold text-[#0a1c38] mb-4">Tindakan Operator</h2>
                  <hr className="mb-6 border-gray-100" />
                  
                  {actionState === 'idle' ? (
                    <div className="flex flex-col xl:flex-row gap-4">
                      <button 
                        onClick={() => setActionState('rejecting')}
                        className="flex-1 py-3 px-4 border-2 border-red-200 text-red-700 bg-white rounded-lg font-bold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <X className="w-4 h-4" /> Tolak & Minta Revisi
                      </button>
                      <button 
                        onClick={handleApprove}
                        className="flex-1 py-3 px-4 bg-[#064e3b] text-white rounded-lg font-bold hover:bg-[#022c22] transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Verifikasi & Setujui Tenant
                      </button>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Catatan / Alasan Penolakan
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Jika menolak, tuliskan alasan spesifik..."
                        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none mb-4"
                      ></textarea>
                      
                      <div className="flex flex-col xl:flex-row gap-4">
                        <button 
                          onClick={() => setActionState('idle')}
                          className="flex-1 py-3 px-4 border-2 border-red-200 text-red-700 bg-white rounded-lg font-bold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <X className="w-4 h-4" /> Batalkan Penolakan
                        </button>
                        <button 
                          onClick={handleReject}
                          className="flex-1 py-3 px-4 bg-[#b91c1c] text-white rounded-lg font-bold hover:bg-[#991b1b] transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Send className="w-4 h-4" /> Kirim Penolakan
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
