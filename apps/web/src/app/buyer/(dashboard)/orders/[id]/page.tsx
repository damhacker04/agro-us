"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { CANCELLATION_FEE_PCT } from "@agro-os/shared";
import type {
  BuyerOrderDetail,
  BuyerOrderShipment,
  ClaimResponse,
  ShipmentStatus,
  TrackingSnapshot,
} from "@agro-os/shared";
import {
  GalatApi,
  ajukanKlaim,
  ambilKlaim,
  ambilPelacakan,
  ambilPesananSatu,
  batalkanPesanan,
  konfirmasiTerima,
  unggahFoto,
} from "@/lib/api";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const jam = (iso: string) => new Date(iso).toLocaleString("id-ID");

/** Enam tahap pengiriman (§5.6.1). */
const TAHAP: Record<ShipmentStatus, { label: string; kelas: string }> = {
  MENUNGGU_PANEN: { label: "Menunggu Panen", kelas: "bg-gray-100 text-gray-700" },
  PANEN: { label: "Panen", kelas: "bg-lime-100 text-lime-800" },
  DIKIRIM: { label: "Dikirim", kelas: "bg-blue-100 text-blue-800" },
  TIBA_DI_LOKASI: { label: "Tiba di Lokasi", kelas: "bg-amber-100 text-amber-900" },
  DITERIMA: { label: "Diterima", kelas: "bg-emerald-100 text-emerald-800" },
  SELESAI: { label: "Selesai", kelas: "bg-emerald-700 text-white" },
  DIBATALKAN: { label: "Dibatalkan", kelas: "bg-red-100 text-red-800" },
};

const meter = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

/** Sisa waktu jendela klaim, dihitung ulang tiap detik. */
function useHitungMundur(sampai: string | null) {
  const [sisa, setSisa] = useState<number>(() =>
    sampai ? new Date(sampai).getTime() - Date.now() : 0,
  );
  useEffect(() => {
    if (!sampai) return;
    const t = setInterval(() => setSisa(new Date(sampai).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [sampai]);
  if (!sampai || sisa <= 0) return null;
  const menit = Math.floor(sisa / 60000);
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = React.use(params);

  const [pesanan, setPesanan] = useState<BuyerOrderDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  const muat = useCallback(() => {
    return ambilPesananSatu(orderId)
      .then((d) => {
        setPesanan(d);
        setGalat("");
      })
      .catch((e) => setGalat(e instanceof GalatApi ? e.message : "Pesanan tidak ditemukan"))
      .finally(() => setMemuat(false));
  }, [orderId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function batalkan() {
    if (!confirm(`Batalkan pesanan? Biaya pembatalan ${CANCELLATION_FEE_PCT}% dari nilai barang.`))
      return;
    try {
      const r = await batalkanPesanan(orderId);
      alert(`Pesanan dibatalkan. Dikembalikan ${rp(r.refundedValue)}.`);
      void muat();
    } catch (e) {
      alert(e instanceof GalatApi ? e.message : "Gagal membatalkan pesanan.");
    }
  }

  if (memuat) return <div className="p-8 text-sm text-gray-500">Memuat pesanan…</div>;

  if (galat || !pesanan) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {galat || "Pesanan tidak ditemukan"}
        </div>
      </div>
    );
  }

  // Pembatalan sepihak hanya sah selama SELURUH pengiriman masih menunggu panen (FR-7.5).
  const bisaBatal =
    pesanan.orderStatus === "PAID" &&
    pesanan.shipments.every((s) => s.status === "MENUNGGU_PANEN");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/buyer/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pesanan Saya
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">
            Pesanan #{pesanan.orderId.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tgl(pesanan.createdAt)} · total {rp(pesanan.totalAmount)}
            {pesanan.payment &&
              ` · ${pesanan.payment.status === "PAID" ? "Lunas" : "Menunggu pembayaran"}`}
          </p>
        </div>
        {bisaBatal && (
          <button
            onClick={batalkan}
            className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg"
          >
            Batalkan Pesanan
          </button>
        )}
      </div>

      <div className="space-y-6">
        {pesanan.shipments.map((s, i) => (
          <KartuPengiriman
            key={s.shipmentId}
            orderId={pesanan.orderId}
            pengiriman={s}
            urutan={i + 1}
            total={pesanan.shipments.length}
            onBerubah={muat}
          />
        ))}
      </div>
    </div>
  );
}

function KartuPengiriman({
  orderId,
  pengiriman: s,
  urutan,
  total,
  onBerubah,
}: {
  orderId: string;
  pengiriman: BuyerOrderShipment;
  urutan: number;
  total: number;
  onBerubah: () => Promise<unknown>;
}) {
  const [jejak, setJejak] = useState<TrackingSnapshot | null>(null);
  const [klaim, setKlaim] = useState<ClaimResponse[]>([]);
  const [bukaKlaim, setBukaKlaim] = useState(false);
  const t = TAHAP[s.status];
  const sisaKlaim = useHitungMundur(s.claimWindowEndsAt);

  // Dipantau hanya saat barang benar-benar di jalan. Menjajaki pengiriman yang belum
  // dipanen atau sudah selesai cuma membebani server tanpa mengubah apa pun di layar.
  const sedangJalan = s.status === "DIKIRIM" || s.status === "TIBA_DI_LOKASI";
  useEffect(() => {
    if (!sedangJalan) return;
    const ambil = () =>
      ambilPelacakan(s.shipmentId)
        .then(setJejak)
        .catch(() => undefined);
    void ambil();
    const jeda = setInterval(ambil, 15_000);
    return () => clearInterval(jeda);
  }, [s.shipmentId, sedangJalan]);

  useEffect(() => {
    if (s.status !== "DITERIMA" && s.status !== "SELESAI") return;
    ambilKlaim(s.shipmentId)
      .then(setKlaim)
      .catch(() => setKlaim([]));
  }, [s.shipmentId, s.status]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-bold text-emerald-950">
            Pengiriman {urutan} dari {total}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">siap {tgl(s.readyDate)}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full ${t.kelas}`}>
          {t.label}
        </span>
      </div>

      {/* ---------- Posisi kurir ---------- */}
      {sedangJalan && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
          {jejak?.noGpsMode ? (
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Kurir tidak berbagi lokasi. Kedatangan akan dikonfirmasi manual — pastikan
              nomor penerima aktif.
            </p>
          ) : jejak?.distanceToDestM !== null && jejak?.distanceToDestM !== undefined ? (
            <>
              <div className="flex items-center gap-2 text-blue-900">
                <Truck className="w-4 h-4 shrink-0" />
                <span className="font-bold">{meter(jejak.distanceToDestM)}</span>
                <span className="text-sm">dari lokasi Anda</span>
              </div>
              {/* Stempel waktu ditampilkan apa adanya, termasuk saat sudah lama —
                  menyembunyikannya membuat posisi basi terlihat seperti posisi terkini. */}
              {jejak.positionAt && (
                <p
                  className={`text-xs mt-1 ${jejak.signalLost ? "text-amber-800 font-semibold" : "text-blue-700"}`}
                >
                  {jejak.signalLost ? "Sinyal hilang — posisi terakhir " : "Diperbarui "}
                  {jam(jejak.positionAt)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-blue-800">Menunggu posisi pertama dari kurir…</p>
          )}
        </div>
      )}

      {/* ---------- Konfirmasi terima ---------- */}
      {s.status === "TIBA_DI_LOKASI" && (
        <KonfirmasiTerima shipmentId={s.shipmentId} onSelesai={onBerubah} />
      )}

      {/* ---------- Jendela klaim ---------- */}
      {s.status === "DITERIMA" && sisaKlaim && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Jendela klaim mutu tersisa {sisaKlaim}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Setelah lewat, dana diteruskan ke Tenant dan keluhan mutu tidak bisa
                diajukan lagi.
              </p>
            </div>
          </div>
          {!bukaKlaim && klaim.length === 0 && (
            <button
              onClick={() => setBukaKlaim(true)}
              className="text-xs font-bold text-amber-900 underline"
            >
              Ada masalah mutu? Ajukan klaim
            </button>
          )}
        </div>
      )}

      {bukaKlaim && (
        <FormKlaim
          shipmentId={s.shipmentId}
          baris={s.lines}
          onSelesai={async (c) => {
            setKlaim((k) => [...k, c]);
            setBukaKlaim(false);
            await onBerubah();
          }}
          onBatal={() => setBukaKlaim(false)}
        />
      )}

      {klaim.map((c) => (
        <div key={c.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4 text-sm">
          <div className="font-bold text-gray-900 mb-1">Klaim mutu — {c.productName}</div>
          <p className="text-xs text-gray-600">
            Kurang {c.shortfallKg} kg, toleransi susut {c.shrinkTolerancePct}% (
            {c.toleratedKg} kg) → bisa diklaim {c.claimableKg} kg senilai {rp(c.claimValue)}.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Jalur {c.route} · status {c.finalStatus}
            {c.settledValue > 0 && ` · dibayar ${rp(c.settledValue)}`}
          </p>
        </div>
      ))}

      {/* ---------- Tujuan ---------- */}
      <div className="rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="font-bold text-gray-900 text-sm mb-2">Alamat Penerima</h3>
        <div className="space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            {s.recipient.name}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {s.recipient.phone}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            Jam terima {s.recipient.receivingHours}
          </div>
          {s.recipient.landmark && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              {s.recipient.landmark}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Item ---------- */}
      <div className="space-y-3">
        {s.lines.map((l) => {
          const kurang =
            l.qtyBoxFulfilled !== null && l.qtyBoxFulfilled < l.qtyBox
              ? l.qtyBox - l.qtyBoxFulfilled
              : 0;
          return (
            <div
              key={l.orderItemId}
              className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900">
                  {l.productName}{" "}
                  <span className="text-xs font-normal text-gray-500">Grade {l.grade}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {l.tenantName} · {l.qtyBox} box × {rp(l.unitPriceLocked)}
                </div>
                {kurang > 0 && (
                  <div className="mt-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                    Kurang {kurang} box dari yang dipesan.{" "}
                    <Link href={`/buyer/orders/${orderId}/resolution`} className="font-bold underline">
                      Pilih penyelesaian
                    </Link>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-gray-900">{rp(l.subtotal)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{l.badge}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sinyal-2 PoD: foto kondisi barang. Tanpa foto, konfirmasi tidak membuktikan apa pun. */
function KonfirmasiTerima({
  shipmentId,
  onSelesai,
}: {
  shipmentId: string;
  onSelesai: () => Promise<unknown>;
}) {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim() {
    if (!berkas) return setGalat("Foto kondisi barang wajib dilampirkan.");
    setProses(true);
    setGalat("");
    try {
      const { url } = await unggahFoto(berkas);
      await konfirmasiTerima(shipmentId, url);
      await onSelesai();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Gagal mengonfirmasi penerimaan.");
      setProses(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-[#fdf8e2] p-5 mb-4">
      <h3 className="font-bold text-amber-900 mb-1">Kurir tiba — konfirmasi penerimaan</h3>
      <p className="text-xs text-amber-800 mb-4">
        Lampirkan foto kondisi barang saat diterima. Foto ini yang menjadi bukti bila nanti
        Anda mengajukan klaim mutu.
      </p>

      <label className="flex items-center gap-3 px-3 py-3 bg-white border border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 mb-3">
        <Camera className="w-5 h-5 text-amber-700 shrink-0" />
        <span className="text-sm text-gray-700 truncate">
          {berkas ? berkas.name : "Ambil foto atau pilih berkas"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {galat}
        </p>
      )}

      <button
        onClick={kirim}
        disabled={proses}
        className="w-full bg-[#657711] hover:bg-[#52600d] text-white font-bold py-3 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {proses ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {proses ? "Mengirim…" : "Barang Diterima"}
      </button>

      <p className="text-[11px] text-amber-800 mt-2 flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" />
        Dana tetap ditahan sampai jendela klaim mutu berakhir.
      </p>
    </div>
  );
}

function FormKlaim({
  shipmentId,
  baris,
  onSelesai,
  onBatal,
}: {
  shipmentId: string;
  baris: BuyerOrderShipment["lines"];
  onSelesai: (c: ClaimResponse) => Promise<void>;
  onBatal: () => void;
}) {
  const [orderItemId, setOrderItemId] = useState(baris[0]?.orderItemId ?? "");
  const [berat, setBerat] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!berkas) return setGalat("Foto barang wajib dilampirkan.");
    setProses(true);
    setGalat("");
    try {
      const { url } = await unggahFoto(berkas);
      const c = await ajukanKlaim(shipmentId, {
        orderItemId,
        actualWeightKg: Number(berat),
        photoUrl: url,
        description: keterangan,
      });
      await onSelesai(c);
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal mengajukan klaim.");
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-4 space-y-3">
      <h3 className="font-bold text-gray-900 text-sm">Ajukan Klaim Mutu</h3>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Item bermasalah</label>
        <select
          value={orderItemId}
          onChange={(e) => setOrderItemId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {baris.map((l) => (
            <option key={l.orderItemId} value={l.orderItemId}>
              {l.productName} ({l.qtyBox} box)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Berat aktual hasil timbang (kg)
        </label>
        <input
          type="number"
          step="0.01"
          min={0}
          required
          value={berat}
          onChange={(e) => setBerat(e.target.value)}
          placeholder="mis. 285.5"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Toleransi susut alami dipotong otomatis sesuai jenis komoditas.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Keluhan</label>
        <textarea
          required
          minLength={10}
          maxLength={500}
          rows={3}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Jelaskan kondisi barang saat diterima…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <label className="flex items-center gap-3 px-3 py-2.5 bg-white border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
        <Camera className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm text-gray-600 truncate">
          {berkas ? berkas.name : "Foto barang (wajib)"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {galat}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={proses}
          className="flex-1 bg-emerald-950 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {proses && <Loader2 className="w-4 h-4 animate-spin" />}
          {proses ? "Mengirim…" : "Kirim Klaim"}
        </button>
        <button
          type="button"
          onClick={onBatal}
          className="px-4 text-sm font-semibold text-gray-600 hover:text-gray-800"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
