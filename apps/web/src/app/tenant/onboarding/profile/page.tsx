"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";
import type { ZoneSummary } from "@agro-os/shared";
import { GalatApi, ambilZona, buatProfilTenant } from "@/lib/api";

/**
 * Langkah 1 onboarding Tenant — profil usaha & zona layanan.
 *
 * Zona menentukan pembeli mana yang bisa melihat produk Anda dan Tenant mana yang bisa
 * menjadi pengganti saat panen Anda kurang, jadi dipilih di awal dan bisa lebih dari satu.
 */
export default function TenantOnboardingProfilePage() {
  const router = useRouter();

  const [zona, setZona] = useState<ZoneSummary[]>([]);
  const [nama, setNama] = useState("");
  const [dipilih, setDipilih] = useState<string[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    ambilZona()
      .then((z) => {
        setZona(z);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat zona"))
      .finally(() => setMemuat(false));
  }, []);

  function alihkan(id: string) {
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (dipilih.length === 0) return setGalat("Pilih minimal satu zona layanan.");
    setProses(true);
    setGalat("");
    try {
      await buatProfilTenant({ companyName: nama, zoneIds: dipilih });
      router.push("/tenant/onboarding/mapping");
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan profil.");
      setProses(false);
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  return (
    <main className="min-h-screen bg-[#f5f8ff] p-6 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <p className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">
            Langkah 1 dari 3
          </p>
          <h1 className="text-2xl font-bold text-emerald-950">Profil Usaha Tani</h1>
        </div>

        <form onSubmit={simpan} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nama usaha / kelompok tani
            </label>
            <input
              required
              minLength={3}
              maxLength={120}
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Tani Makmur Pujon"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Nama ini yang dilihat pembeli di katalog dan Verified Timeline.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Zona layanan <span className="font-normal text-gray-400">(boleh lebih dari satu)</span>
            </label>
            <div className="space-y-2">
              {zona.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => alihkan(z.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition ${
                    dipilih.includes(z.id)
                      ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <MapPin
                      className={`w-4 h-4 ${dipilih.includes(z.id) ? "text-emerald-700" : "text-gray-400"}`}
                    />
                    {z.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    min. order Rp{z.minOrderValue.toLocaleString("id-ID")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {galat && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {galat}
            </p>
          )}

          <button
            type="submit"
            disabled={proses}
            className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {proses && <Loader2 className="w-4 h-4 animate-spin" />}
            {proses ? "Menyimpan…" : "Lanjut — Petakan Lahan"}
          </button>
        </form>
      </div>
    </main>
  );
}
