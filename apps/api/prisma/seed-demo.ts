/**
 * Seed DEMO — data peragaan untuk presentasi. Malang Raya.
 *
 * ⚠️ TERPISAH dari `seed.ts` dan TIDAK PERNAH dijalankan otomatis.
 * `seed.ts` berisi data yang sah di produksi (zona + komoditas); berkas ini berisi
 * Tenant, pembeli, dan transaksi KARANGAN. Menggabungkan keduanya berarti data palsu
 * ikut terbawa ke produksi pada `migrate reset` pertama.
 *
 * Jalankan sadar-sadar:
 *   pnpm --filter @agro-os/api db:seed:demo
 *
 * MENGHAPUS seluruh data transaksional lebih dulu (zona & komoditas dipertahankan),
 * supaya katalog demo tidak tercampur sisa pengujian. Foto bukti memakai berkas
 * placeholder berlabel di `prisma/demo-assets/` — sengaja terlihat jelas sebagai
 * contoh, bukan foto lahan yang dibuat-buat menyerupai aslinya.
 */
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { computeNodeHash, sha256, type NodeHashInput } from "../src/modules/timeline/hash.util";

if (process.env["NODE_ENV"] === "production") {
  console.error("DITOLAK: seed demo tidak boleh dijalankan dengan NODE_ENV=production.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

const HARI = 86_400_000;
const hariLalu = (n: number) => new Date(Date.now() - n * HARI);
const hariDepan = (n: number) => new Date(Date.now() + n * HARI);
const tanggal = (d: Date) => d.toISOString().slice(0, 10);

/** Persegi ~2,7 ha di sekitar titik pusat — cukup di atas batas 0,1 ha (FR-1.6). */
function petak(lat: number, lng: number, sisi = 0.0015) {
  const ring = [
    [lng, lat],
    [lng + sisi, lat],
    [lng + sisi, lat + sisi],
    [lng, lat + sisi],
    [lng, lat],
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

/** Simpan foto placeholder memakai skema penamaan yang sama dengan LocalDiskStorageService. */
async function simpanFoto(namaBerkas: string) {
  const buf = await readFile(join(__dirname, "demo-assets", namaBerkas));
  const digest = sha256(buf);
  const dir = join(process.cwd(), "uploads", digest.slice(0, 2));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${digest}.jpg`), buf);
  return { url: `/uploads/${digest.slice(0, 2)}/${digest}.jpg`, sha256: digest };
}

// ============================== DATA KARANGAN ==============================
// Nama sengaja generik supaya tidak menyerupai badan usaha yang benar-benar ada.

const TENANTS = [
  {
    kunci: "pujon",
    nama: "Tani Makmur Pujon",
    telepon: "081100000101",
    zona: ["Kabupaten Malang", "Kota Malang"],
    lahan: [
      { lat: -7.8412, lng: 112.4701 },
      { lat: -7.8455, lng: 112.4762 },
    ],
  },
  {
    kunci: "batu",
    nama: "Kebun Lestari Batu",
    telepon: "081100000102",
    zona: ["Kota Batu", "Kota Malang"],
    lahan: [
      { lat: -7.8701, lng: 112.5203 },
      { lat: -7.8748, lng: 112.5261 },
    ],
  },
  {
    kunci: "ngantang",
    nama: "Gapoktan Ngantang Sejahtera",
    telepon: "081100000103",
    zona: ["Kabupaten Malang"],
    lahan: [{ lat: -7.8702, lng: 112.3504 }],
  },
] as const;

const BUYERS = [
  { kunci: "katering", nama: "Katering Sehat Nusantara", telepon: "081100000201", zona: "Kota Malang" },
  { kunci: "resto", nama: "Resto Padi Emas", telepon: "081100000202", zona: "Kota Malang" },
  { kunci: "dapur", nama: "Dapur Kolektif Batu", telepon: "081100000203", zona: "Kota Batu" },
] as const;

/**
 * Katalog demo. `verifikasi` sengaja bervariasi supaya ketiga badge (FR-2.6) tampil
 * berdampingan di katalog — termasuk PERLU_DITINJAU, yang menurut FR-4.6 memang harus
 * terlihat pembeli, bukan disembunyikan.
 */
const KATALOG = [
  { tenant: "pujon", lahan: 0, komoditas: "Wortel", produk: "Wortel Pujon Grade A", grade: "A", hargaBox: 145_000, kgBox: 10, kuota: 180, panenHari: 12, verifikasi: "TERVERIFIKASI" },
  { tenant: "pujon", lahan: 0, komoditas: "Kubis", produk: "Kubis Krop Padat Pujon", grade: "A", hargaBox: 95_000, kgBox: 12, kuota: 150, panenHari: 26, verifikasi: "TERVERIFIKASI" },
  { tenant: "pujon", lahan: 1, komoditas: "Sawi Hijau (Caisim)", produk: "Caisim Segar Pujon", grade: "B", hargaBox: 78_000, kgBox: 8, kuota: 120, panenHari: 9, verifikasi: "FOTO_SAJA" },
  { tenant: "batu", lahan: 0, komoditas: "Selada", produk: "Selada Keriting Batu", grade: "A", hargaBox: 132_000, kgBox: 6, kuota: 90, panenHari: 15, verifikasi: "TERVERIFIKASI" },
  { tenant: "batu", lahan: 1, komoditas: "Tomat", produk: "Tomat Beef Batu", grade: "A", hargaBox: 118_000, kgBox: 10, kuota: 140, panenHari: 21, verifikasi: "PERLU_DITINJAU" },
  { tenant: "ngantang", lahan: 0, komoditas: "Cabai Rawit", produk: "Cabai Rawit Ngantang", grade: "A", hargaBox: 285_000, kgBox: 10, kuota: 70, panenHari: 33, verifikasi: "FOTO_SAJA" },
] as const;

/** Kronologi budidaya yang wajar untuk satu batch — dipakai membangun Verified Timeline. */
const KRONOLOGI = [
  { hariSebelumPanen: 96, jenis: "PENYIAPAN_LAHAN", foto: "penyiapan-lahan.jpg", teks: "Pengolahan tanah dan pembuatan bedengan, pupuk dasar kandang matang ditebar merata." },
  { hariSebelumPanen: 92, jenis: "PENANAMAN", foto: "penanaman.jpg", teks: "Penanaman benih wortel varietas lokal, jarak tanam 5 cm dalam barisan." },
  { hariSebelumPanen: 64, jenis: "PEMUPUKAN", foto: "pemupukan.jpg", teks: "Pemupukan susulan NPK sesuai anjuran penyuluh, dilanjutkan penyiangan gulma." },
  { hariSebelumPanen: 40, jenis: "PENGAIRAN", foto: "pengairan.jpg", teks: "Pengairan rutin pagi hari, kondisi tanaman sehat dan seragam." },
] as const;

// ============================== EKSEKUSI ==============================

async function bersihkan() {
  // TRUNCATE, bukan DELETE: tabel timeline/escrow dilindungi trigger append-only yang
  // menolak DELETE (PRD §6.1). TRUNCATE tidak memicu trigger baris, jadi ini satu-satunya
  // cara mengosongkan data demo tanpa melumpuhkan pengaman integritasnya.
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE t text;
    BEGIN
      FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('zones', 'commodities', '_prisma_migrations', 'spatial_ref_sys')
      LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
      END LOOP;
    END $$;
  `);
  console.log("✔ data transaksional dikosongkan (zona & komoditas dipertahankan)");
}

async function main() {
  await bersihkan();

  const zona = new Map((await prisma.zone.findMany()).map((z) => [z.name, z]));
  const komoditas = new Map((await prisma.commodity.findMany()).map((c) => [c.name, c]));
  if (!zona.size || !komoditas.size) {
    throw new Error("Zona/komoditas kosong — jalankan `pnpm --filter @agro-os/api db:seed` dulu.");
  }

  // ---------- Tenant + lahan ----------
  const tenantId = new Map<string, string>();
  const lahanId = new Map<string, string[]>();

  for (const t of TENANTS) {
    const user = await prisma.user.create({ data: { phone: `+62${t.telepon.slice(1)}`, role: "TENANT" } });
    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        companyName: t.nama,
        legalityStatus: "APPROVED",
        tenantZones: { create: t.zona.map((n) => ({ zoneId: zona.get(n)!.id })) },
      },
    });
    tenantId.set(t.kunci, tenant.id);

    const ids: string[] = [];
    for (const l of t.lahan) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO land_plots (tenant_id, polygon, area_ha, capture_method, verification_tier)
        VALUES (
          ${tenant.id}::uuid,
          ST_GeomFromGeoJSON(${petak(l.lat, l.lng)}),
          ROUND((ST_Area(ST_GeomFromGeoJSON(${petak(l.lat, l.lng)})::geography) / 10000)::numeric, 2),
          'GAMBAR_PETA', 'NORMAL'
        )
        RETURNING id::text
      `;
      ids.push(rows[0]!.id);
    }
    lahanId.set(t.kunci, ids);
  }
  console.log(`✔ ${TENANTS.length} Tenant + lahan terpetakan`);

  // ---------- Pembeli ----------
  const buyerId = new Map<string, string>();
  for (const b of BUYERS) {
    const user = await prisma.user.create({ data: { phone: `+62${b.telepon.slice(1)}`, role: "BUYER" } });
    const buyer = await prisma.buyer.create({
      data: { userId: user.id, companyName: b.nama, activeZoneId: zona.get(b.zona)!.id },
    });
    buyerId.set(b.kunci, buyer.id);
  }
  console.log(`✔ ${BUYERS.length} pembeli`);

  // ---------- Operator ----------
  await prisma.user.create({ data: { phone: "+628110000030", role: "OPERATOR" } });

  // ---------- Katalog ----------
  const batchId = new Map<string, string>();
  for (const k of KATALOG) {
    const panen = hariDepan(k.panenHari);
    const produk = await prisma.product.create({
      data: {
        tenantId: tenantId.get(k.tenant)!,
        commodityId: komoditas.get(k.komoditas)!.id,
        name: k.produk,
        grade: k.grade,
        pricePerBox: k.hargaBox,
        qtyKgPerBox: k.kgBox,
        estHarvestDate: panen,
      },
    });
    const umur = komoditas.get(k.komoditas)!.growingDaysMin;
    const batch = await prisma.batch.create({
      data: {
        productId: produk.id,
        landPlotId: lahanId.get(k.tenant)![k.lahan]!,
        claimedPlantDate: hariLalu(umur - k.panenHari),
        claimedHarvestDate: panen,
        quotaBoxTotal: k.kuota,
        quotaBoxSold: 0,
        lockedPrice: k.hargaBox,
        productionStatus: "GROWING",
        verificationStatus: k.verifikasi,
      },
    });
    batchId.set(k.produk, batch.id);
  }
  console.log(`✔ ${KATALOG.length} produk siap tampil di katalog (badge bervariasi)`);

  // ---------- Verified Timeline untuk batch unggulan ----------
  const unggulan = batchId.get("Wortel Pujon Grade A")!;
  const titik = TENANTS[0].lahan[0];
  let prevHash: string | null = null;
  let seq = 0;

  for (const n of KRONOLOGI) {
    seq += 1;
    const deviceTs = hariLalu(n.hariSebelumPanen - 12); // panen batch ini 12 hari lagi
    const foto = await simpanFoto(n.foto);
    const input: NodeHashInput = {
      batchId: unggulan,
      seq,
      activityType: n.jenis,
      description: n.teks,
      lng: titik.lng + 0.0007,
      lat: titik.lat + 0.0007,
      deviceTs,
      photoHashes: [foto.sha256],
      ralatOfId: null,
    };
    const nodeHash = computeNodeHash(input, prevHash);

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO timeline_nodes (batch_id, seq, activity_type, description, gps_point, device_ts, prev_hash, node_hash)
      VALUES (
        ${unggulan}::uuid, ${seq}, ${n.jenis}::"TimelineActivity", ${n.teks},
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326),
        ${deviceTs}, ${prevHash}, ${nodeHash}
      )
      RETURNING id::text
    `;
    await prisma.nodePhoto.create({
      data: {
        nodeId: rows[0]!.id,
        objectUrl: foto.url,
        photoType: "KEGIATAN",
        captureSource: "IN_APP_CAMERA",
        sha256: foto.sha256,
      },
    });
    prevHash = nodeHash;
  }
  console.log(`✔ Verified Timeline: ${KRONOLOGI.length} node berantai + foto bukti`);

  // ---------- Pesanan di berbagai tahap ----------
  // Supaya stepper 6 status (BY-10) dan ledger escrow bisa diperagakan tanpa menunggu
  // alur nyata berjalan. Tiap pesanan memakai Tenant & pembeli yang berbeda.
  const zonaMalang = zona.get("Kota Malang")!;

  async function buatPesanan(opts: {
    pembeli: string;
    produk: string;
    qtyBox: number;
    status: "MENUNGGU_PANEN" | "DIKIRIM" | "DITERIMA" | "SELESAI";
  }) {
    const batch = await prisma.batch.findUniqueOrThrow({
      where: { id: batchId.get(opts.produk)! },
      include: { product: true },
    });
    const subtotal = batch.lockedPrice * opts.qtyBox;
    const ongkir = 85_000;

    const order = await prisma.order.create({
      data: {
        buyerId: buyerId.get(opts.pembeli)!,
        totalAmount: subtotal + ongkir,
        orderStatus: opts.status === "SELESAI" ? "CLOSED" : "PAID",
      },
    });

    const sudahTiba = opts.status === "DITERIMA" || opts.status === "SELESAI";
    const ship = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO shipments (order_id, zone_id, dest_point, receiving_hours, status,
                             arrived_at, claim_window_ends_at, completed_at, received_mode)
      VALUES (
        ${order.id}::uuid, ${zonaMalang.id}::uuid,
        ST_SetSRID(ST_MakePoint(112.6304, -7.9666), 4326),
        '08:00-16:00', ${opts.status}::"ShipmentStatus",
        ${sudahTiba ? hariLalu(1) : null},
        ${opts.status === "DITERIMA" ? hariDepan(0.05) : opts.status === "SELESAI" ? hariLalu(0.5) : null},
        ${opts.status === "SELESAI" ? hariLalu(0.4) : null},
        ${sudahTiba ? "BUYER_CONFIRM" : null}::"ReceivedMode"
      )
      RETURNING id::text
    `;
    const shipmentId = ship[0]!.id;

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        shipmentId,
        batchId: batch.id,
        qtyBox: opts.qtyBox,
        qtyBoxFulfilled: opts.status === "MENUNGGU_PANEN" ? null : opts.qtyBox,
        unitPriceLocked: batch.lockedPrice,
        subtotal,
      },
    });
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        quotaBoxSold: { increment: opts.qtyBox },
        ...(opts.status !== "MENUNGGU_PANEN"
          ? { productionStatus: "HARVESTED", quotaBoxFulfilled: opts.qtyBox }
          : {}),
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "MIDTRANS",
        method: "QRIS",
        invoiceRef: `AGR-DEMO-${order.id.slice(0, 8).toUpperCase()}`,
        amount: subtotal + ongkir,
        status: "PAID",
        paidAt: hariLalu(6),
        expiresAt: hariLalu(6),
      },
    });

    const entri: Array<{ jenis: "HOLD" | "RELEASE"; jumlah: number }> = [
      { jenis: "HOLD", jumlah: subtotal },
    ];
    if (opts.status === "SELESAI") entri.push({ jenis: "RELEASE", jumlah: subtotal });

    for (const e of entri) {
      await prisma.escrowLedgerEntry.create({
        data: {
          orderId: order.id,
          shipmentId,
          tenantId: batch.product.tenantId,
          entryType: e.jenis,
          amount: e.jumlah,
          gatewayRef: `demo:${order.id.slice(0, 8)}`,
        },
      });
    }
    return opts.status;
  }

  const pesanan = [
    { pembeli: "katering", produk: "Wortel Pujon Grade A", qtyBox: 24, status: "MENUNGGU_PANEN" as const },
    { pembeli: "resto", produk: "Kubis Krop Padat Pujon", qtyBox: 30, status: "DIKIRIM" as const },
    { pembeli: "katering", produk: "Selada Keriting Batu", qtyBox: 20, status: "DITERIMA" as const },
    { pembeli: "resto", produk: "Caisim Segar Pujon", qtyBox: 34, status: "SELESAI" as const },
  ];
  for (const p of pesanan) await buatPesanan(p);
  console.log(`✔ ${pesanan.length} pesanan: ${pesanan.map((p) => p.status).join(", ")}`);

  console.log("\nSelesai. Masuk sebagai salah satu nomor berikut (OTP tercetak di log API):");
  for (const t of TENANTS) console.log(`  Tenant  ${t.telepon}  ${t.nama}`);
  for (const b of BUYERS) console.log(`  Pembeli ${b.telepon}  ${b.nama}`);
  console.log("  Operator 081100000030");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
