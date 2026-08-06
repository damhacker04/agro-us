"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Repeat,
  Undo2,
} from "lucide-react";
import type { AssuranceOption, PendingAssurance, SubstituteOption } from "@agro-os/shared";
import { GalatApi, ambilAssuransiTertunda, putuskanAssuransi } from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

/**
 * Layar keputusan Harvest Assurance (BY-11, FR-7.4 & FR-7.10).
 *
 * Muncul saat panen Tenant tidak menutupi seluruh pesanan. Empat opsinya sengaja
 * dijelaskan dengan konsekuensi uangnya masing-masing — pembeli sedang memutuskan
 * nasib dana yang sudah dibayarkan, bukan sekadar memilih preferensi.
 *
 * Daftarnya berasal dari `GET /assurance/pending` yang cakupannya SELURUH pesanan
 * pembeli, bukan satu pesanan. Disebutkan terang-terangan di halaman supaya pembeli
 * tidak mengira daftar ini terbatas pada pesanan yang tadi diklik.
 */
export default function ResolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = React.use(params);

  const [item, setItem] = useState<PendingAssurance[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  // Keputusan yang baru diambil disimpan di sini. Tanpa ini, memuat ulang daftar
  // tertunda langsung menghapus kartunya dari layar — pembeli tidak pernah sempat
  // membaca apa yang terjadi pada uangnya.
  const [selesai, setSelesai] = useState<Array<{ nama: string; pesan: string }>>([]);

  const muat = useCallback(() => {
    setMemuat(true);
    return ambilAssuransiTertunda()
      .then((d) => {
        setItem(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Gagal memuat daftar keputusan"))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href={`/buyer/orders/${orderId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Pesanan
      </Link>

      <h1 className="text-2xl font-bold text-emerald-950 mb-1">Penyelesaian Panen Kurang</h1>
      <p className="text-sm text-gray-500 mb-6">
        Panen tidak menutupi seluruh pesanan Anda. Pilih penyelesaian untuk tiap item —
        daftar ini mencakup semua pesanan Anda yang menunggu keputusan.
      </p>

      {galat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 mb-4">
          {galat}
        </div>
      )}

      {selesai.length > 0 && (
        <div className="space-y-3 mb-5">
          {selesai.map((s, i) => (
            <div key={i} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-900 mb-1">{s.nama}</h3>
                  <p className="text-sm text-emerald-800">{s.pesan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.length === 0 ? (
        selesai.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
            <h2 className="font-bold text-gray-800 mb-1">Tidak ada yang perlu diputuskan</h2>
            <p className="text-sm text-gray-500">
              Semua item pesanan Anda terpenuhi, atau keputusannya sudah diambil.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-5">
          {item.map((p) => (
            <KartuKeputusan
              key={p.orderItemId}
              p={p}
              onSelesai={async (pesan) => {
                setSelesai((s) => [...s, { nama: p.productName, pesan }]);
                await muat();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KartuKeputusan({
  p,
  onSelesai,
}: {
  p: PendingAssurance;
  onSelesai: (pesan: string) => Promise<unknown>;
}) {
  const [pilihan, setPilihan] = useState<AssuranceOption | null>(null);
  const [batchPengganti, setBatchPengganti] = useState<string>("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    if (!pilihan) return;
    if (pilihan === "SUBSTITUSI" && !batchPengganti) {
      return setGalat("Pilih produk penggantinya dulu.");
    }
    setProses(true);
    setGalat("");
    try {
      const r = await putuskanAssuransi(p.orderItemId, {
        option: pilihan,
        ...(pilihan === "SUBSTITUSI" ? { replacementBatchId: batchPengganti } : {}),
      });
      await onSelesai(r.message);
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal menyimpan keputusan.");
      setProses(false);
    }
  }

  /** Nilai seluruh baris — yang dikembalikan bila pembeli menolak seluruhnya. */
  const nilaiPenuh = p.qtyBox * p.unitPriceLocked;

  const opsi: Array<{
    nilai: AssuranceOption;
    label: string;
    Ikon: typeof Repeat;
    jelas: string;
    nonaktif?: string;
  }> = [
    {
      nilai: "SUBSTITUSI",
      label: "Substitusi",
      Ikon: Repeat,
      jelas:
        "Diganti produk setara dari Tenant lain di zona yang sama. Selisih harga ditanggung Tenant yang gagal panen, bukan Anda.",
      ...(p.substitutes.length === 0
        ? { nonaktif: p.substitutionBlockedReason ?? "Tidak ada pengganti yang tersedia." }
        : {}),
    },
    {
      nilai: "JADWAL_ULANG",
      label: "Jadwal Ulang",
      Ikon: CalendarClock,
      jelas:
        "Dana tetap ditahan, pesanan dipindahkan ke siklus panen berikutnya dari Tenant yang sama.",
    },
    {
      nilai: "TERIMA_SEBAGIAN",
      label: "Terima Sebagian",
      Ikon: PackageCheck,
      jelas: `Ambil ${p.allocatedBox} box yang tersedia, sisanya ${rp(p.shortfallValue)} dikembalikan.`,
      // Di bawah minimum zona, "terima sebagian" berarti ongkir satu perjalanan penuh
      // untuk muatan kecil — pembeli perlu tahu sebelum memilihnya (FR-7.10).
      ...(!p.partialMeetsMinimum
        ? {
            nonaktif:
              "Porsi yang tersedia di bawah nilai minimum pesanan zona ini. Pilih refund atau jadwal ulang.",
          }
        : {}),
    },
    {
      nilai: "REFUND",
      label: "Tolak Seluruhnya",
      Ikon: Undo2,
      // Bukan "refund porsi yang gagal": server mengembalikan qtyBox × harga dan
      // menyetel qtyBoxFulfilled ke 0, jadi pembeli TIDAK menerima box mana pun —
      // termasuk yang sebenarnya tersedia. Menyebutnya "refund penuh" membuat orang
      // mengira tetap dapat barangnya sekaligus uangnya kembali.
      jelas: `Batalkan seluruh item ini, termasuk ${p.allocatedBox} box yang sebenarnya tersedia. Anda tidak menerima barang apa pun dan ${rp(nilaiPenuh)} dikembalikan.`,
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">{p.productName}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{p.tenantName}</p>
      </div>

      <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-5 text-sm">
        <div className="font-bold text-red-900 mb-1">
          Kurang {p.shortfallBox} dari {p.qtyBox} box
        </div>
        <p className="text-red-800 text-xs">
          Tersedia {p.allocatedBox} box. Nilai porsi yang tidak terpenuhi{" "}
          <b>{rp(p.shortfallValue)}</b> — inilah yang Anda putuskan nasibnya.
        </p>
      </div>

      <div className="space-y-2.5 mb-4">
        {opsi.map((o) => {
          const terkunci = Boolean(o.nonaktif);
          const terpilih = pilihan === o.nilai;
          return (
            <button
              key={o.nilai}
              type="button"
              disabled={terkunci}
              onClick={() => setPilihan(o.nilai)}
              className={`w-full text-left rounded-xl border p-4 transition ${
                terkunci
                  ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  : terpilih
                    ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                    : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <o.Ikon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${terpilih ? "text-emerald-700" : "text-gray-400"}`}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{o.label}</div>
                  <p className="text-xs text-gray-600 mt-0.5">{o.jelas}</p>
                  {o.nonaktif && (
                    <p className="text-xs text-amber-800 mt-1.5">{o.nonaktif}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {pilihan === "SUBSTITUSI" && p.substitutes.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Pilih produk pengganti
          </label>
          <div className="space-y-2">
            {p.substitutes.map((s: SubstituteOption) => (
              <button
                key={s.batchId}
                type="button"
                onClick={() => setBatchPengganti(s.batchId)}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  batchPengganti === s.batchId
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">
                      {s.productName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.tenantName} · panen {tgl(s.claimedHarvestDate)} · tersedia{" "}
                      {s.availableBox} box
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">{rp(s.lockedPrice)}</div>
                    {s.priceGapBorneByTenant > 0 && (
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        +{rp(s.priceGapBorneByTenant)} ditanggung Tenant
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {galat}
        </p>
      )}

      <button
        onClick={kirim}
        disabled={!pilihan || proses}
        className="w-full bg-emerald-950 text-white text-sm font-semibold py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {proses && <Loader2 className="w-4 h-4 animate-spin" />}
        {proses ? "Menyimpan…" : "Konfirmasi Pilihan"}
      </button>
      <p className="text-[11px] text-gray-500 mt-2 text-center">
        Keputusan ini final dan langsung menggerakkan dana di escrow.
      </p>
    </div>
  );
}
