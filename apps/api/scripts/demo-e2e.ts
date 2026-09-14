/**
 * Demo end-to-end: PANEN KURANG → PENGIRIMAN PARSIAL → KLAIM → PENCAIRAN.
 *
 * Menjalankan seluruh alur lewat HTTP ke API yang SEDANG BERJALAN, terhadap PostgreSQL +
 * PostGIS sungguhan — tanpa test double. Tiap aktor (pembeli, Tenant, gateway pembayaran,
 * kurir, operator) memakai pintu yang sama dengan aplikasinya: login OTP, JWT, webhook
 * bertanda tangan HMAC, header sesi kurir.
 *
 * Satu-satunya yang TIDAK lewat API adalah waktu. Jendela klaim 24 jam tidak bisa
 * ditunggu saat presentasi, jadi langkah itu dilakukan dengan menggeser stempel waktu di
 * basis data — dan dicetak jelas sebagai "LOMPAT WAKTU", bukan disembunyikan.
 *
 * Setelah tiap langkah, keadaan dibaca LANGSUNG dari basis data dan diperiksa terhadap
 * invarian uang dan barang. Runner berhenti di pemeriksaan pertama yang gagal.
 *
 *   pnpm --filter @agro-os/api db:seed:demo   # data awal yang diketahui
 *   pnpm --filter @agro-os/api demo:e2e       # API harus sudah berjalan
 */
import "dotenv/config";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import type {
  CheckoutResponse,
  ClaimResponse,
  GenerateQrResponse,
  HarvestPreviewResponse,
  PendingAssurance,
  ResolveAssuranceResponse,
  TimelineVerifyResponse,
  TrackingSnapshot,
  VerifyCourierCodeResponse,
} from "@agro-os/shared";
import { PrismaClient } from "../generated/prisma/client";

const API = process.env["DEMO_API_URL"] ?? `http://localhost:${process.env["PORT"] ?? 3001}`;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"]! }) });

// ───────────────────────────── keluaran ─────────────────────────────

let nomorLangkah = 0;
function langkah(judul: string) {
  nomorLangkah += 1;
  console.log(`\n\x1b[1m${String(nomorLangkah).padStart(2, "0")}. ${judul}\x1b[0m`);
}
const catat = (teks: string) => console.log(`    ${teks}`);
const rupiah = (n: number | bigint) => `Rp${Number(n).toLocaleString("id-ID")}`;

class InvarianGagal extends Error {}
function pastikan(benar: boolean, pesan: string) {
  if (!benar) throw new InvarianGagal(pesan);
  console.log(`    \x1b[32m✓\x1b[0m ${pesan}`);
}

// ───────────────────────────── HTTP ─────────────────────────────

class GalatApi extends Error {
  constructor(readonly status: number, readonly isi: unknown, jalur: string) {
    super(`${jalur} → HTTP ${status}: ${JSON.stringify(isi)}`);
  }
}

async function panggil<T>(metode: string, jalur: string, opsi: { token?: string; body?: unknown; headers?: Record<string, string>; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opsi.headers ?? {}) };
  if (opsi.token) headers["Authorization"] = `Bearer ${opsi.token}`;
  let body: FormData | string | undefined;
  if (opsi.form) body = opsi.form;
  else if (opsi.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opsi.body);
  }
  const res = await fetch(`${API}${jalur}`, { method: metode, headers, body });
  const teks = await res.text();
  const isi = teks ? JSON.parse(teks) : undefined;
  if (!res.ok) throw new GalatApi(res.status, isi, `${metode} ${jalur}`);
  return isi as T;
}

async function masuk(telepon: string): Promise<string> {
  const minta = await panggil<{ devOtp?: string }>("POST", "/auth/otp/request", { body: { phone: telepon } });
  if (!minta.devOtp) throw new Error("devOtp tidak dikembalikan — pastikan DEMO_EXPOSE_OTP=true di API.");
  const hasil = await panggil<{ accessToken: string }>("POST", "/auth/otp/verify", { body: { phone: telepon, code: minta.devOtp } });
  return hasil.accessToken;
}

export { API, prisma, langkah, catat, rupiah, pastikan, panggil, masuk, GalatApi, InvarianGagal, createHmac, readFile, join };

// ───────────────────────────── skenario ─────────────────────────────

const TELEPON = { tenant: "081100000101", pembeli: "081100000202", operator: "081100000030" };
const PRODUK = "Wortel Pujon Grade A";
const BOX_DIPESAN = 30;
/**
 * Hasil panen nyata. Kuota terjual 54 (24 milik pesanan seed yang dibayar lebih dulu + 30
 * pesanan ini), jadi 45 box berarti kurang 9. Angkanya dipilih supaya sisa yang diterima
 * pembeli ini (21 × Rp145.000) masih di atas minimum order zona — kalau tidak, opsi
 * "terima sebagian" memang tidak boleh ditawarkan dan skenarionya berubah.
 */
const BOX_PANEN = 45;
const TUJUAN = { lat: -7.9666, lng: 112.6326 };
/**
 * Berat timbang saat barang tiba. Seharusnya 21 box × 10 kg = 210 kg. Kurang 40 kg,
 * toleransi susut wortel 3% (6,3 kg) → dapat diklaim 33,7 kg. Nilainya melewati ambang
 * selesai-otomatis, jadi klaim masuk antrean operator — jalur yang ingin diperagakan.
 */
const BERAT_TIMBANG_KG = 170;
const DISETUJUI_OPERATOR = 400_000;


async function main() {
  console.log(`API: ${API}`);

  langkah("Aktor masuk lewat OTP");
  const token = {
    tenant: await masuk(TELEPON.tenant),
    pembeli: await masuk(TELEPON.pembeli),
    operator: await masuk(TELEPON.operator),
  };
  catat("Tenant Tani Makmur Pujon, pembeli Resto Padi Emas, dan operator memegang JWT masing-masing.");

  langkah(`Pembeli checkout ${BOX_DIPESAN} box ${PRODUK}`);
  const batch = await prisma.batch.findFirstOrThrow({ where: { product: { name: PRODUK } }, include: { product: true } });
  const terjualAwal = batch.quotaBoxSold;
  const checkout = await panggil<CheckoutResponse>("POST", "/orders/checkout", {
    token: token.pembeli,
    body: {
      lines: [{ batchId: batch.id, qtyBox: BOX_DIPESAN }],
      delivery: {
        recipientName: "Dapur Resto Padi Emas",
        phone: "081100000299",
        point: TUJUAN,
        landmark: "Pintu belakang, dekat parkir motor",
        receivingHours: "07:00-15:00",
      },
      paymentMethod: "QRIS",
    },
  });
  const invoiceRef = checkout.payment.invoiceRef;
  catat(`Order ${checkout.orderId.slice(0, 8)}, tagihan ${invoiceRef} sebesar ${rupiah(checkout.totalAmount)}`);
  const setelahCheckout = await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } });
  pastikan(setelahCheckout.quotaBoxSold === terjualAwal + BOX_DIPESAN, `kuota direservasi atomik: terjual ${terjualAwal} → ${setelahCheckout.quotaBoxSold}`);

  langkah("Gateway pembayaran mengirim callback LUNAS bertanda tangan HMAC");
  const bodyWebhook = JSON.stringify({ invoiceRef, status: "PAID" });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", process.env["PAYMENT_WEBHOOK_SECRET"]!).update(`${t}.`).update(bodyWebhook).digest("hex");
  const kirimWebhook = () =>
    fetch(`${API}/payments/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-agro-signature": `t=${t},v1=${v1}` }, body: bodyWebhook });
  // Dua callback kembar DIKIRIM BERSAMAAN — pola yang lazim dari gateway sungguhan, dan
  // pola yang dulu menerbitkan dua HOLD untuk satu tagihan (BE-01).
  const [a, b] = await Promise.all([kirimWebhook(), kirimWebhook()]);
  catat(`dua callback bersamaan → HTTP ${a.status} dan ${b.status}`);
  const hold = await prisma.escrowLedgerEntry.findMany({ where: { orderId: checkout.orderId, entryType: "HOLD" } });
  pastikan(hold.length === 1, `tepat SATU entri HOLD untuk dua callback kembar (dapat ${hold.length})`);
  pastikan(Number(hold[0]!.amount) > 0, `dana ${rupiah(hold[0]!.amount)} ditahan di escrow, belum milik Tenant`);

  langkah("Callback PALSU dengan tanda tangan salah ditolak");
  const palsu = await fetch(`${API}/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agro-signature": `t=${t},v1=${"0".repeat(64)}` },
    body: JSON.stringify({ invoiceRef, status: "FAILED" }),
  });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.orderId } });
  pastikan(palsu.status === 401 && order.orderStatus === "PAID", `callback palsu → HTTP ${palsu.status}, pesanan tetap ${order.orderStatus}`);

  langkah(`Tenant melaporkan panen hanya ${BOX_PANEN} box (pratinjau, belum mengikat)`);
  const pratinjau = await panggil<HarvestPreviewResponse>("POST", `/tenant/batches/${batch.id}/harvest`, {
    token: token.tenant,
    body: { actualBox: BOX_PANEN },
  });
  const semuaBaris = [...pratinjau.allocation.fullyFulfilled, ...pratinjau.allocation.partial, ...pratinjau.allocation.unfulfilled];
  for (const b of semuaBaris) catat(`${b.buyerName.padEnd(26)} pesan ${String(b.qtyBox).padStart(2)} → dapat ${String(b.allocatedBox).padStart(2)}, kurang ${b.shortfallBox}`);
  const barisKami = semuaBaris.find((b) => b.buyerName === "Resto Padi Emas");
  pastikan(pratinjau.allocatableBox === BOX_PANEN, `yang dialokasikan = hasil panen (${pratinjau.allocatableBox} box)`);
  pastikan(
    semuaBaris.reduce((n, b) => n + b.allocatedBox, 0) === BOX_PANEN,
    "jumlah alokasi seluruh pembeli tepat sama dengan hasil panen — tidak ada box yang dijanjikan dua kali",
  );
  pastikan(!!barisKami && barisKami.shortfallBox === 54 - BOX_PANEN, `kekurangan jatuh ke pesanan yang dibayar paling akhir (Resto Padi Emas kurang ${barisKami?.shortfallBox})`);
  const penilaian = await prisma.yieldAssessment.count({ where: { batchId: batch.id, confirmedAt: null } });
  pastikan(penilaian === 1 && (await prisma.orderItem.count({ where: { batchId: batch.id, qtyBoxFulfilled: { not: null } } })) === 0,
    "pratinjau hanya menulis penilaian kewajaran — belum ada satu pun alokasi yang mengikat");

  langkah("Tenant mengonfirmasi panen dengan foto bukti dan GPS di dalam petak");
  // Titik diambil dari PostGIS, bukan ditulis tangan: ST_PointOnSurface dijamin berada DI
  // DALAM poligon lahan batch ini, sehingga pagar GPS diuji terhadap geometri sungguhan.
  const [TITIK_LAHAN] = await prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
    SELECT ST_Y(ST_PointOnSurface(lp.polygon)) AS lat, ST_X(ST_PointOnSurface(lp.polygon)) AS lng
    FROM batches b JOIN land_plots lp ON lp.id = b.land_plot_id WHERE b.id = ${batch.id}::uuid`;
  catat(`titik GPS dari poligon lahan: ${TITIK_LAHAN!.lat.toFixed(5)}, ${TITIK_LAHAN!.lng.toFixed(5)}`);
  const form = new FormData();
  form.set("activityType", "PANEN");
  form.set("description", `Panen wortel ${BOX_PANEN} box; sebagian bedengan busuk akar setelah hujan deras.`);
  form.set("lat", String(TITIK_LAHAN!.lat));
  form.set("lng", String(TITIK_LAHAN!.lng));
  form.set("deviceTs", new Date(Date.now() - 60_000).toISOString());
  form.set("captureSource", "IN_APP_CAMERA");
  form.set("fulfilledBox", String(BOX_PANEN));
  // Konfirmasi WAJIB merujuk penilaian yang dibuat untuk angka ini. Tanpa rujukan itu
  // langkah pratinjau bisa dilewati: minta pratinjau dengan angka aman, konfirmasi angka lain.
  form.set("assessmentId", pratinjau.assessment.assessmentId);
  const foto = await readFile(join(__dirname, "..", "prisma", "demo-assets", "panen.jpg"));
  form.append("photos", new Blob([foto], { type: "image/jpeg" }), "panen.jpg");
  await panggil("POST", `/tenant/batches/${batch.id}/harvest/confirm`, { token: token.tenant, form });
  const items = await prisma.orderItem.findMany({ where: { batchId: batch.id }, include: { order: { include: { buyer: true } } } });
  const itemKami = items.find((i) => i.orderId === checkout.orderId)!;
  pastikan(items.reduce((n, i) => n + (i.qtyBoxFulfilled ?? 0), 0) === BOX_PANEN, `qtyBoxFulfilled di basis data berjumlah ${BOX_PANEN}`);
  pastikan(itemKami.qtyBoxFulfilled === barisKami!.allocatedBox, `alokasi yang mengikat sama persis dengan pratinjau (${itemKami.qtyBoxFulfilled} box)`);
  const verif = await panggil<TimelineVerifyResponse>("GET", `/batches/${batch.id}/timeline/verify`);
  pastikan(verif.intact && verif.broken.length === 0, `rantai hash Verified Timeline utuh setelah node PANEN (${verif.nodeCount} node, dihitung ulang oleh server)`);

  langkah("Pembeli melihat keputusan yang harus diambil atas kekurangannya");
  const tertunda = await panggil<PendingAssurance[]>("GET", "/assurance/pending", { token: token.pembeli });
  const keputusan = tertunda.find((p) => p.orderItemId === itemKami.id);
  pastikan(!!keputusan, "kekurangan muncul sebagai keputusan tertunda milik pembeli ini");
  catat(`kurang ${keputusan!.shortfallBox} box senilai ${rupiah(keputusan!.shortfallValue)}; sisa memenuhi minimum: ${keputusan!.partialMeetsMinimum}`);
  catat(`substitusi: ${keputusan!.substitutes.map((x) => `${x.productName} (${x.tenantName})`).join(", ") || keputusan!.substitutionBlockedReason}`);
  pastikan(keputusan!.partialMeetsMinimum, "opsi terima sebagian sah karena sisanya masih di atas minimum order zona");

  langkah("Pembeli memilih TERIMA SEBAGIAN — nilai kekurangan dikembalikan");
  const holdSebelum = await saldoEscrow(checkout.orderId);
  const resolusi = await panggil<ResolveAssuranceResponse>("POST", `/assurance/${itemKami.id}/resolve`, {
    token: token.pembeli,
    body: { option: "TERIMA_SEBAGIAN" },
  });
  catat(resolusi.message);
  const holdSesudah = await saldoEscrow(checkout.orderId);
  const nilaiKurang = keputusan!.shortfallValue;
  pastikan(resolusi.refundedValue === nilaiKurang, `refund ${rupiah(resolusi.refundedValue)} = ${keputusan!.shortfallBox} box × harga terkunci`);
  pastikan(holdSebelum - holdSesudah === nilaiKurang, `saldo escrow turun tepat ${rupiah(nilaiKurang)}: ${rupiah(holdSebelum)} → ${rupiah(holdSesudah)}`);
  let dobel: unknown = null;
  try {
    await panggil("POST", `/assurance/${itemKami.id}/resolve`, { token: token.pembeli, body: { option: "REFUND" } });
  } catch (err) {
    dobel = err;
  }
  pastikan(dobel instanceof GalatApi && (await saldoEscrow(checkout.orderId)) === holdSesudah, "keputusan kedua atas kekurangan yang sama ditolak — tidak ada refund dobel");

  const sesudahResolusi = holdSesudah;
  const shipmentId = checkout.shipmentIds[0]!;

  langkah("Tenant mencetak QR — satu label per box yang BENAR-BENAR dikirim");
  const qr = await panggil<GenerateQrResponse>("POST", `/tenant/shipments/${shipmentId}/qr`, { token: token.tenant });
  catat(`${qr.boxes.length} label tercetak, Kode Antar ${qr.courierCode} (hanya tampil sekali)`);
  pastikan(qr.boxes.length === itemKami.qtyBoxFulfilled, `label = box terpenuhi (${qr.boxes.length}), bukan box dipesan (${BOX_DIPESAN})`);
  pastikan((await prisma.boxQrToken.count({ where: { orderItem: { shipmentId } } })) === qr.boxes.length, "jumlah token di basis data sama dengan lembar cetak");

  langkah("Posisi pengiriman tidak bisa diintip tanpa hak");
  const intip = await fetch(`${API}/shipments/${shipmentId}/track`);
  pastikan(intip.status === 403, `tamu tanpa token ditolak (HTTP ${intip.status})`);
  const pembeliLain = await masuk("081100000203");
  const intipLain = await fetch(`${API}/shipments/${shipmentId}/track`, { headers: { Authorization: `Bearer ${pembeliLain}` } });
  pastikan(intipLain.status === 403, `pembeli lain yang login pun ditolak (HTTP ${intipLain.status})`);
  await panggil<TrackingSnapshot>("GET", `/shipments/${shipmentId}/track`, { token: token.pembeli });
  pastikan(true, "pembeli pemilik pesanan diizinkan");

  langkah("Kurir tanpa akun memindai QR dan memasukkan Kode Antar");
  const tokenQr = new URL(qr.boxes[0]!.scanUrl).pathname.split("/").pop()!;
  const kodeSalah = qr.courierCode === "0000" ? "1111" : "0000";
  const salah = await fetch(`${API}/scan/${tokenQr}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: kodeSalah }),
  });
  pastikan(salah.status >= 400, `Kode Antar salah ditolak (HTTP ${salah.status})`);
  const sesi = await panggil<VerifyCourierCodeResponse>("POST", `/scan/${tokenQr}/verify`, { body: { code: qr.courierCode } });
  pastikan((await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status === "DIKIRIM", "sesi terbuka dan pengiriman berstatus DIKIRIM");

  langkah("Kurir melaporkan posisi sepanjang rute Pujon → Kota Malang");
  const tanpaHeader = await fetch(`${API}/scan/session/position`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...TITIK_LAHAN, deviceTs: new Date().toISOString() }),
  });
  pastikan(tanpaHeader.status === 400, `laporan posisi tanpa header sesi ditolak (HTTP ${tanpaHeader.status})`);
  /**
   * Kirim posisi SEKARANG, setelah `menitLewat` menit dianggap lewat sejak bacaan sebelumnya.
   *
   * Waktu disimulasikan dengan memundurkan stempel waktu bacaan yang SUDAH tersimpan —
   * jam ponsel maupun jam server — bukan dengan mengirim `deviceTs` masa lalu. Server
   * membatasi waktu tempuh dengan jam server-nya sendiri, jadi `deviceTs` yang mengaku
   * lebih banyak waktu lewat daripada yang dicatat server diperlakukan sebagai
   * pemalsuan. Versi pertama runner ini justru mengandalkan pola itu, dan lulus karena
   * celah yang kemudian ditutup (lihat `nilaiKewajaran`).
   */
  const lapor = async (lat: number, lng: number, menitLewat: number) => {
    await prisma.$executeRaw`
      UPDATE tracking_positions
      SET server_ts = server_ts - make_interval(mins => ${menitLewat}), device_ts = device_ts - make_interval(mins => ${menitLewat})
      WHERE session_id = ${sesi.sessionId}::uuid`;
    return panggil<{ plausible: boolean; distanceToDestM: number; arrived: boolean }>("POST", "/scan/session/position", {
      headers: { "x-tracking-session": sesi.sessionId },
      body: { lat, lng, deviceTs: new Date().toISOString() },
    });
  };
  catat("waktu perjalanan disimulasikan dengan memundurkan stempel waktu bacaan sebelumnya (jam ponsel DAN server)");
  // Delapan titik ~2,5 km berjarak 4 menit: ~37 km/jam.
  const RUTE = 8;
  let hasil = { plausible: true, distanceToDestM: 0, arrived: false };
  for (let i = 0; i < RUTE; i++) {
    const f = i / RUTE;
    hasil = await lapor(
      TITIK_LAHAN!.lat + (TUJUAN.lat - TITIK_LAHAN!.lat) * f,
      TITIK_LAHAN!.lng + (TUJUAN.lng - TITIK_LAHAN!.lng) * f,
      i === 0 ? 0 : 4,
    );
    if (!hasil.plausible) throw new InvarianGagal(`titik rute ke-${i} dinilai tidak wajar`);
  }
  catat(`posisi terakhir ${Math.round(hasil.distanceToDestM)} m dari tujuan`);
  const sebelumPalsu = await panggil<TrackingSnapshot>("GET", `/shipments/${shipmentId}/track`, { token: token.pembeli });
  const palsuGps = await lapor(-7.2575, 112.7521, 1); // Surabaya, ~80 km, semenit kemudian
  const sesudahPalsu = await panggil<TrackingSnapshot>("GET", `/shipments/${shipmentId}/track`, { token: token.pembeli });
  pastikan(!palsuGps.plausible, "lompatan ~80 km dalam semenit dinilai TIDAK wajar");
  pastikan(
    JSON.stringify(sesudahPalsu.position) === JSON.stringify(sebelumPalsu.position),
    "peta pembeli tetap di posisi wajar terakhir, tidak melompat ke Surabaya",
  );
  const [tidakWajar] = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*)::bigint AS n FROM tracking_positions WHERE session_id = ${sesi.sessionId}::uuid AND is_plausible = false`;
  pastikan(tidakWajar!.n === 1n, "bacaan palsu tetap DISIMPAN sebagai bukti, bertanda is_plausible = false");
  // Dari titik wajar terakhir (~2,8 km) ke pintu pembeli, 5 menit kemudian.
  hasil = await lapor(TUJUAN.lat + 0.0002, TUJUAN.lng, 5);
  pastikan(hasil.arrived, `geofence terpicu ${Math.round(hasil.distanceToDestM)} m dari tujuan`);
  pastikan(
    (await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status === "TIBA_DI_LOKASI",
    "status TIBA_DI_LOKASI — GPS saja TIDAK menyelesaikan transaksi",
  );

  langkah("Pembeli memotret barang dan mengonfirmasi penerimaan");
  const fotoTerima = await unggahFoto(token.pembeli, "pod.jpg");
  await panggil("POST", `/shipments/${shipmentId}/receive`, { token: token.pembeli, body: { photoUrl: fotoTerima } });
  const diterima = await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  pastikan(
    diterima.status === "DITERIMA" && !!diterima.claimWindowEndsAt,
    `DITERIMA, jendela klaim sampai ${diterima.claimWindowEndsAt?.toISOString()}`,
  );

  langkah(`Pembeli menimbang ${BERAT_TIMBANG_KG} kg dan mengajukan klaim`);
  const fotoKlaim = await unggahFoto(token.pembeli, "panen.jpg");
  const klaim = await panggil<ClaimResponse>("POST", `/shipments/${shipmentId}/claims`, {
    token: token.pembeli,
    body: {
      orderItemId: itemKami.id,
      actualWeightKg: BERAT_TIMBANG_KG,
      photoUrl: fotoKlaim,
      description: "Timbangan dapur 170 kg dari 21 box; beberapa box berisi wortel patah dan busuk.",
    },
  });
  catat(
    `diharapkan ${klaim.expectedKg} kg, kurang ${klaim.shortfallKg} kg, toleransi ${klaim.toleratedKg} kg → ` +
      `dapat diklaim ${klaim.claimableKg} kg = ${rupiah(klaim.claimValue)} (${klaim.pctOfOrder}% pesanan)`,
  );
  pastikan(klaim.expectedKg === itemKami.qtyBoxFulfilled! * 10, `berat acuan memakai box TERKIRIM (${klaim.expectedKg} kg), bukan box dipesan`);
  pastikan(klaim.route === "OPERATOR", `klaim masuk antrean operator (rute ${klaim.route})`);

  langkah("LOMPAT WAKTU — jendela klaim 24 jam dianggap sudah lewat");
  catat("⚠ satu-satunya langkah yang tidak lewat API: stempel waktu digeser di basis data,");
  catat("  karena jendela klaim 24 jam tidak bisa ditunggu saat peragaan.");
  await prisma.shipment.update({ where: { id: shipmentId }, data: { claimWindowEndsAt: new Date(Date.now() - 60_000) } });

  langkah("Job pencairan berjalan — pengiriman JATUH TEMPO, tapi dana DITAHAN karena klaim belum diputus");
  // Lompat waktu dilakukan SEBELUM langkah ini, bukan sesudahnya. Kalau jendelanya belum
  // lewat, job tidak menyentuh pengiriman ini sama sekali, dan "tidak ada RELEASE" menjadi
  // benar karena alasan yang salah — pemeriksaan yang lulus tanpa menguji apa pun.
  const ditahan = await panggil<{ settled: number; heldByPendingClaims: number }>("POST", "/quality/jobs/settle");
  catat(`rekap job: ${JSON.stringify(ditahan)}`);
  pastikan(ditahan.heldByPendingClaims >= 1, `job melaporkan ${ditahan.heldByPendingClaims} pengiriman DITAHAN klaim — penahanannya benar-benar terjadi`);
  pastikan(
    (await prisma.escrowLedgerEntry.count({ where: { shipmentId, entryType: "RELEASE" } })) === 0 &&
      (await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status === "DITERIMA",
    "tidak ada RELEASE dan pengiriman tetap DITERIMA selama sengketa terbuka",
  );

  langkah(`Operator memutus klaim: disetujui ${rupiah(DISETUJUI_OPERATOR)} dari ${rupiah(klaim.claimValue)}`);
  const lebih = await fetch(`${API}/operator/claims/${klaim.id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.operator}` },
    body: JSON.stringify({ approvedValue: klaim.claimValue + 1, note: "Mencoba menyetujui melebihi nilai klaim." }),
  });
  pastikan(lebih.status === 400, `persetujuan melebihi nilai klaim ditolak (HTTP ${lebih.status})`);
  await panggil("POST", `/operator/claims/${klaim.id}/decide`, {
    token: token.operator,
    body: { approvedValue: DISETUJUI_OPERATOR, note: "Foto menunjukkan kerusakan pada sebagian box; susut transit dianggap wajar sebagian." },
  });
  const potong = await prisma.escrowLedgerEntry.findMany({ where: { shipmentId, entryType: "POTONG_KLAIM" } });
  pastikan(potong.length === 1 && Number(potong[0]!.amount) === DISETUJUI_OPERATOR, `satu entri POTONG_KLAIM ${rupiah(DISETUJUI_OPERATOR)}`);
  const saldoSetelahKlaim = await saldoEscrow(checkout.orderId);
  pastikan(saldoSetelahKlaim === sesudahResolusi - DISETUJUI_OPERATOR, `saldo escrow kini ${rupiah(saldoSetelahKlaim)}`);

  langkah("Job pencairan berjalan lagi — sisa dana dilepas ke Tenant");
  const cair = await panggil<{ settled: number; totalAmount: number }>("POST", "/quality/jobs/settle");
  catat(`rekap job: ${JSON.stringify(cair)}`);
  const release = await prisma.escrowLedgerEntry.findMany({ where: { shipmentId, entryType: "RELEASE" } });
  const harapanCair = sesudahResolusi - DISETUJUI_OPERATOR;
  pastikan(
    release.length === 1 && Number(release[0]!.amount) === harapanCair,
    `satu RELEASE ${rupiah(release[0]?.amount ?? 0)} = ${rupiah(sesudahResolusi)} − klaim ${rupiah(DISETUJUI_OPERATOR)}`,
  );
  pastikan((await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status === "SELESAI", "pengiriman SELESAI");
  pastikan((await saldoEscrow(checkout.orderId)) === 0, "saldo escrow order ini tepat NOL — tidak ada rupiah tertinggal atau keluar dua kali");

  langkah("Job dijalankan sekali lagi — harus idempoten");
  await panggil("POST", "/quality/jobs/settle");
  pastikan((await prisma.escrowLedgerEntry.count({ where: { shipmentId, entryType: "RELEASE" } })) === 1, "tetap satu RELEASE");

  langkah("Rekonsiliasi akhir uang pesanan ini");
  const buku = await prisma.$queryRaw<Array<{ entry_type: string; total: bigint }>>`
    SELECT entry_type::text, SUM(amount)::bigint AS total FROM escrow_ledger
    WHERE order_id = ${checkout.orderId}::uuid GROUP BY entry_type ORDER BY entry_type`;
  for (const r of buku) catat(`${r.entry_type.padEnd(14)} ${rupiah(r.total).padStart(14)}`);
  const uangMasuk = Number(buku.find((r) => r.entry_type === "HOLD")?.total ?? 0);
  const uangKeluar = buku.filter((r) => r.entry_type !== "HOLD").reduce((n, r) => n + Number(r.total), 0);
  pastikan(uangMasuk === uangKeluar, `HOLD ${rupiah(uangMasuk)} = refund + potongan klaim + pencairan ${rupiah(uangKeluar)}`);

  return { token, batch, checkout, itemKami };
}

/** Unggah satu foto contoh lewat endpoint yang sama dengan aplikasi; kembalikan URL-nya. */
async function unggahFoto(token: string, berkas: string): Promise<string> {
  const form = new FormData();
  const isi = await readFile(join(__dirname, "..", "prisma", "demo-assets", berkas));
  form.append("file", new Blob([isi], { type: "image/jpeg" }), berkas);
  return (await panggil<{ url: string }>("POST", "/uploads", { token, form })).url;
}

/** Sisa dana yang masih ditahan untuk satu order: HOLD dikurangi semua arus keluar. */
async function saldoEscrow(orderId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ sisa: bigint | null }>>`
    SELECT SUM(CASE WHEN entry_type = 'HOLD' THEN amount ELSE -amount END)::bigint AS sisa
    FROM escrow_ledger WHERE order_id = ${orderId}::uuid`;
  return Number(rows[0]?.sisa ?? 0);
}

main()
  .then(() => console.log("\n\x1b[32mSELESAI — seluruh invarian terpenuhi.\x1b[0m"))
  .catch((err) => {
    console.error(`\n\x1b[31m${err instanceof InvarianGagal ? "INVARIAN GAGAL" : "GALAT"}: ${err.message}\x1b[0m`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
