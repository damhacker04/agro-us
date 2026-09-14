/**
 * Probe aturan kewajaran GPS terhadap API yang BERJALAN. Bukan bagian dari demo.
 *
 * Dua pertanyaan, keduanya dijawab dengan kurir sungguhan, bukan dengan membaca kode:
 *
 *   A. Kurir jujur yang kehilangan sinyal 10 menit — apakah ia bisa sampai (geofence
 *      menyala), atau terkunci sebagai "tidak wajar" selamanya?
 *   B. Kurir curang yang memalsukan jam ponselnya supaya lompatan 80 km tampak pelan —
 *      apakah tetap tertolak?
 *
 * Waktu yang lewat disimulasikan dengan jujur: sebelum tiap bacaan, SELURUH stempel waktu
 * bacaan sebelumnya (jam ponsel dan jam server) digeser mundur sebesar jedanya. Dari sudut
 * pandang server, jeda itu benar-benar sudah lewat. Mengirim `deviceTs` masa lalu saja
 * tidak cukup — itu justru bentuk pemalsuan yang diuji di skenario B.
 *
 * Menyiapkan sesi pelacakan langsung di basis data untuk pengiriman DIKIRIM hasil seed.
 *
 *   pnpm --filter @agro-os/api db:seed:demo && npx tsx scripts/probe-gps-gap.ts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const API = `http://localhost:${process.env["PORT"] ?? 3001}`;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"]! }) });

type Hasil = { plausible: boolean; distanceToDestM: number; arrived: boolean };

/** Titik sejauh `meter` dari tujuan ke arah barat laut, di garis lurus. */
function titik(tujuan: { lat: number; lng: number }, meter: number) {
  const derajat = meter / 111_320;
  return { lat: tujuan.lat + derajat * 0.6, lng: tujuan.lng - derajat * 0.8 };
}

async function bukaSesi(shipmentId: string, orderItemId: string) {
  const token = await prisma.boxQrToken.create({
    data: { orderItemId, token: randomBytes(24).toString("base64url"), printedAt: new Date(), consumedAt: new Date() },
  });
  return prisma.trackingSession.create({ data: { shipmentId, activationTokenId: token.id } });
}

/** Mundurkan semua bacaan sesi ini sebesar `detik` — seolah waktu itu sudah lewat. */
async function lewatkanWaktu(sessionId: string, detik: number) {
  await prisma.$executeRaw`
    UPDATE tracking_positions
    SET server_ts = server_ts - make_interval(secs => ${detik}), device_ts = device_ts - make_interval(secs => ${detik})
    WHERE session_id = ${sessionId}::uuid`;
}

async function lapor(sessionId: string, p: { lat: number; lng: number }, deviceTs = new Date()): Promise<Hasil> {
  const res = await fetch(`${API}/scan/session/position`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tracking-session": sessionId },
    body: JSON.stringify({ ...p, deviceTs: deviceTs.toISOString() }),
  });
  return (await res.json()) as Hasil;
}

async function main() {
  const shipment = await prisma.shipment.findFirstOrThrow({ where: { status: "DIKIRIM" }, include: { items: true } });
  const [dest] = await prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
    SELECT ST_Y(dest_point) AS lat, ST_X(dest_point) AS lng FROM shipments WHERE id = ${shipment.id}::uuid`;
  let gagal = false;

  // ───────── A. kurir jujur, sinyal hilang 10 menit ─────────
  console.log("A. Kurir jujur 36 km/jam, sinyal hilang 10 menit di tengah jalan");
  const sesiA = await bukaSesi(shipment.id, shipment.items[0]!.id);
  let jarak = 20_000;
  const catat = (label: string, r: Hasil) =>
    console.log(`   ${label.padEnd(36)} ${String(Math.round(r.distanceToDestM)).padStart(6)} m  wajar=${r.plausible}  tiba=${r.arrived}`);

  catat("bacaan normal", await lapor(sesiA.id, titik(dest!, jarak)));
  await lewatkanWaktu(sesiA.id, 60);
  jarak -= 600;
  catat("bacaan normal (+1 menit)", await lapor(sesiA.id, titik(dest!, jarak)));

  await lewatkanWaktu(sesiA.id, 600);
  jarak -= 6_000;
  const kembali = await lapor(sesiA.id, titik(dest!, jarak));
  catat("sinyal kembali (+10 menit, 6 km)", kembali);

  let tiba = false;
  let wajarSesudah = 0;
  let bacaan = 0;
  for (let i = 0; i < 40 && !tiba; i++) {
    await lewatkanWaktu(sesiA.id, 60);
    jarak = Math.max(jarak - 600, 20);
    const r = await lapor(sesiA.id, titik(dest!, jarak));
    bacaan += 1;
    if (r.plausible) wajarSesudah += 1;
    tiba = r.arrived;
    if (tiba || i % 5 === 0) catat(`perjalanan berlanjut (+${i + 1} menit)`, r);
  }
  const statusA = (await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status;
  console.log(`   → bacaan setelah sinyal kembali: ${kembali.plausible ? "wajar" : "TIDAK wajar"}; ${wajarSesudah}/${bacaan} bacaan sesudahnya wajar`);
  console.log(`   → geofence ${tiba ? "TERPICU" : "TIDAK PERNAH TERPICU"}, status ${statusA}`);
  if (!kembali.plausible || !tiba || statusA !== "TIBA_DI_LOKASI") gagal = true;

  // ───────── B. kurir curang memalsukan jam ponsel ─────────
  console.log("\nB. Kurir curang: lompatan ~80 km, jam ponsel diklaim sejam ke depan");
  await prisma.shipment.update({ where: { id: shipment.id }, data: { status: "DIKIRIM", arrivedAt: null } });
  const sesiB = await bukaSesi(shipment.id, shipment.items[0]!.id);
  const awal = titik(dest!, 3_000);
  const rAwal = await lapor(sesiB.id, awal);
  await lewatkanWaktu(sesiB.id, 10);
  const palsu = await lapor(sesiB.id, { lat: -7.2575, lng: 112.7521 }, new Date(Date.now() + 3_600_000));
  console.log(`   bacaan awal wajar=${rAwal.plausible}; bacaan Surabaya ber-jam palsu wajar=${palsu.plausible}`);
  if (palsu.plausible) gagal = true;

  console.log(`\n${gagal ? "PROBE GAGAL" : "PROBE LULUS"}: kurir jujur ${tiba ? "sampai" : "terkunci"}, pemalsuan jam ${palsu.plausible ? "LOLOS" : "tertolak"}.`);
  process.exitCode = gagal ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
