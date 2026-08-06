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

/** Nomor operator — satu sumber untuk pembuatan akun DAN baris panduan yang dicetak. */
const OPERATOR_PHONE = "081100000030";

const BUYERS = [
  { kunci: "katering", nama: "Katering Sehat Nusantara", telepon: "081100000201", zona: "Kota Malang" },
  { kunci: "resto", nama: "Resto Padi Emas", telepon: "081100000202", zona: "Kota Malang" },
  { kunci: "dapur", nama: "Dapur Kolektif Batu", telepon: "081100000203", zona: "Kota Batu" },
] as const;

/**
 * Nama batch unggulan: satu-satunya yang punya Verified Timeline lengkap, dan sengaja
 * dibuat SIAP PANEN HARI INI (`panenHari: 0`).
 *
 * Alasannya praktis. Pagar umur tanam (FR-4.8) menolak PANEN yang lebih cepat dari
 * `growingDaysMin` komoditasnya — wortel 90 hari. Kalau batch unggulan panennya masih
 * belasan hari lagi, catatan penanamannya pun belum genap 90 hari, sehingga peragaan
 * "tandai panen → cetak QR → kurir antar → pembeli konfirmasi" MENTOK di langkah
 * pertama dan pagarnya terlihat seperti bug padahal bekerja benar.
 */
export const BATCH_UNGGULAN = "Wortel Pujon Grade A";

/**
 * Katalog demo. `verifikasi` sengaja bervariasi supaya ketiga badge (FR-2.6) tampil
 * berdampingan di katalog — termasuk PERLU_DITINJAU, yang menurut FR-4.6 memang harus
 * terlihat pembeli, bukan disembunyikan.
 */
const KATALOG = [
  { tenant: "pujon", lahan: 0, komoditas: "Wortel", produk: BATCH_UNGGULAN, grade: "A", hargaBox: 145_000, kgBox: 10, kuota: 180, panenHari: 0, verifikasi: "TERVERIFIKASI" },
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
  { hariSebelumPanen: 18, jenis: "PENGENDALIAN_HAMA", foto: "pemupukan.jpg", teks: "Pengendalian ulat daun dengan pestisida nabati, serangan terpantau ringan." },
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
  // Nomornya dipakai bersama dengan baris panduan di bawah lewat satu konstanta:
  // sebelumnya ditulis dua kali dan MELENCENG satu digit, sehingga siapa pun yang
  // mengikuti panduan cetak justru membuat akun baru alih-alih masuk sebagai operator.
  await prisma.user.create({
    data: { phone: `+62${OPERATOR_PHONE.slice(1)}`, role: "OPERATOR" },
  });

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
  const unggulan = batchId.get(BATCH_UNGGULAN)!;
  const panenHariUnggulan = KATALOG.find((k) => k.produk === BATCH_UNGGULAN)!.panenHari;
  const titik = TENANTS[0].lahan[0];
  let prevHash: string | null = null;
  let seq = 0;

  for (const n of KRONOLOGI) {
    seq += 1;
    // Diukur mundur dari tanggal panen batch ini, BUKAN dari angka tetap. Sebelumnya
    // pengurangnya ditulis mati (12) sehingga begitu jadwal panen digeser, node
    // penanaman ikut bergeser dan diam-diam melanggar pagar umur tanam.
    const deviceTs = hariLalu(n.hariSebelumPanen - panenHariUnggulan);
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

  // ---------- Pengamatan satelit untuk batch unggulan ----------
  // Tanpa ini grafik NDVI (BY-03b/TN-15) kosong saat diperagakan, padahal verifikasi
  // satelit justru pembeda utama produk ini. Kurvanya dibuat mengikuti pola tanaman
  // sungguhan: nyaris telanjang saat tanam, naik selama vegetatif, memuncak, lalu
  // turun menjelang panen. Dua tanggal sengaja tertutup awan supaya lubang datanya
  // ikut terlihat — grafik yang mulus sempurna justru tidak realistis untuk Indonesia.
  const lahanUnggulan = lahanId.get("pujon")![0]!;
  const kurva: Array<[number, number | null, number]> = [
    // [hari sebelum panen, NDVI, tutupan awan %]
    [92, 0.14, 8], [87, 0.16, 12], [82, 0.21, 5], [77, null, 74],
    [72, 0.34, 18], [67, 0.46, 9], [62, 0.58, 4], [57, 0.67, 11],
    [52, 0.74, 6], [47, 0.79, 15], [42, 0.81, 3], [37, null, 88],
    [32, 0.78, 21], [27, 0.72, 7], [22, 0.64, 13], [17, 0.55, 9],
    [12, 0.47, 6], [7, 0.39, 17], [2, 0.31, 10],
  ];
  for (const [hari, ndvi, awan] of kurva) {
    await prisma.satelliteObservation.create({
      data: {
        landPlotId: lahanUnggulan,
        sceneDate: hariLalu(hari - panenHariUnggulan),
        cloudPct: awan,
        ndviMean: ndvi,
        ndmiMean: ndvi === null ? null : Math.round(ndvi * 0.72 * 1e4) / 1e4,
        // >40% awan dibuang dari penilaian (§6.2) — tetap disimpan, tidak dihapus.
        usable: awan <= 40 && ndvi !== null,
      },
    });
  }
  await prisma.batch.update({
    where: { id: unggulan },
    data: { detectedPlantDate: hariLalu(90 - panenHariUnggulan) },
  });
  console.log(`✔ ${kurva.length} pengamatan satelit (2 tertutup awan) untuk grafik NDVI`);

  // ---------- Pesanan di berbagai tahap ----------
  // Supaya stepper 6 status (BY-10) dan ledger escrow bisa diperagakan tanpa menunggu
  // alur nyata berjalan. Tiap pesanan memakai Tenant & pembeli yang berbeda.
  const zonaMalang = zona.get("Kota Malang")!;

  async function buatPesanan(opts: {
    pembeli: string;
    produk: string;
    qtyBox: number;
    status: "MENUNGGU_PANEN" | "DIKIRIM" | "DITERIMA" | "SELESAI";
    penerima: string;
    teleponPenerima: string;
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
      INSERT INTO shipments (order_id, zone_id, dest_point, recipient_name, recipient_phone,
                             landmark, receiving_hours, status,
                             arrived_at, claim_window_ends_at, completed_at, received_mode)
      VALUES (
        ${order.id}::uuid, ${zonaMalang.id}::uuid,
        ST_SetSRID(ST_MakePoint(112.6304, -7.9666), 4326),
        ${opts.penerima}, ${opts.teleponPenerima}, 'Sebelah Masjid Al-Ikhlas',
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
    { pembeli: "katering", produk: BATCH_UNGGULAN, qtyBox: 24, status: "MENUNGGU_PANEN" as const, penerima: "Bu Winarti (Kepala Dapur)", teleponPenerima: "081234500101" },
    { pembeli: "resto", produk: "Kubis Krop Padat Pujon", qtyBox: 30, status: "DIKIRIM" as const, penerima: "Pak Hendra (Gudang)", teleponPenerima: "081234500102" },
    { pembeli: "katering", produk: "Selada Keriting Batu", qtyBox: 20, status: "DITERIMA" as const, penerima: "Bu Winarti (Kepala Dapur)", teleponPenerima: "081234500101" },
    { pembeli: "resto", produk: "Caisim Segar Pujon", qtyBox: 34, status: "SELESAI" as const, penerima: "Pak Hendra (Gudang)", teleponPenerima: "081234500102" },
  ];
  for (const p of pesanan) await buatPesanan(p);
  console.log(`✔ ${pesanan.length} pesanan: ${pesanan.map((p) => p.status).join(", ")}`);

  // ---------- Riwayat & sinyal permintaan (FR-8.1) ----------
  // Rekomendasi Tanam membaca dua jendela waktu yang TIDAK beririsan dengan katalog
  // di atas: riwayat pesanan 8 minggu ke BELAKANG, dan pasokan 8–16 minggu ke DEPAN.
  // Semua batch katalog panen dalam ~5 minggu, jadi tanpa blok ini kedua jendela
  // kosong dan halaman rekomendasi tidak punya apa pun untuk dihitung.
  //
  // Komoditas di sini sengaja dipilih yang TIDAK ada di katalog: permintaannya nyata
  // (pernah dibeli, pernah dicari saat kuota habis) tetapi belum ada yang menanam —
  // persis kondisi yang seharusnya memunculkan rekomendasi.
  const RIWAYAT = [
    { komoditas: "Bayam", produk: "Bayam Hijau Pujon (musim lalu)", kgBox: 5, hargaBox: 42_000, tenant: "pujon", lahan: 1, panenBerapaMingguLalu: [2, 4, 6], boxPerPesanan: 40 },
    { komoditas: "Kangkung", produk: "Kangkung Darat Pujon (musim lalu)", kgBox: 6, hargaBox: 38_000, tenant: "pujon", lahan: 1, panenBerapaMingguLalu: [3, 5], boxPerPesanan: 35 },
  ] as const;

  let riwayatDibuat = 0;
  for (const r of RIWAYAT) {
    for (const mingguLalu of r.panenBerapaMingguLalu) {
      const panen = hariLalu(mingguLalu * 7);
      const produk = await prisma.product.create({
        data: {
          tenantId: tenantId.get(r.tenant)!,
          commodityId: komoditas.get(r.komoditas)!.id,
          name: `${r.produk} #${mingguLalu}`,
          grade: "A",
          pricePerBox: r.hargaBox,
          qtyKgPerBox: r.kgBox,
          estHarvestDate: panen,
        },
      });
      // HARVESTED, bukan GROWING: batch lampau tidak boleh ikut menghitung pasokan
      // masa depan, dan tidak boleh menahan kapasitas lahan Tenant.
      const batch = await prisma.batch.create({
        data: {
          productId: produk.id,
          landPlotId: lahanId.get(r.tenant)![r.lahan]!,
          claimedPlantDate: hariLalu(mingguLalu * 7 + komoditas.get(r.komoditas)!.growingDaysMin),
          claimedHarvestDate: panen,
          quotaBoxTotal: r.boxPerPesanan,
          quotaBoxSold: r.boxPerPesanan,
          quotaBoxFulfilled: r.boxPerPesanan,
          lockedPrice: r.hargaBox,
          productionStatus: "HARVESTED",
          verificationStatus: "TERVERIFIKASI",
        },
      });

      const subtotal = r.hargaBox * r.boxPerPesanan;
      // PAID, bukan CLOSED — agregasi permintaan hanya menghitung pesanan berstatus PAID.
      const order = await prisma.order.create({
        data: {
          buyerId: buyerId.get("katering")!,
          totalAmount: subtotal + 85_000,
          orderStatus: "PAID",
        },
      });
      const ship = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO shipments (order_id, zone_id, dest_point, recipient_name, recipient_phone,
                               receiving_hours, status, arrived_at, completed_at, received_mode)
        VALUES (
          ${order.id}::uuid, ${zonaMalang.id}::uuid,
          ST_SetSRID(ST_MakePoint(112.6304, -7.9666), 4326),
          'Bu Winarti (Kepala Dapur)', '081234500101',
          '08:00-16:00', 'SELESAI'::"ShipmentStatus",
          ${panen}, ${panen}, 'BUYER_CONFIRM'::"ReceivedMode"
        )
        RETURNING id::text
      `;
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          shipmentId: ship[0]!.id,
          batchId: batch.id,
          qtyBox: r.boxPerPesanan,
          qtyBoxFulfilled: r.boxPerPesanan,
          unitPriceLocked: r.hargaBox,
          subtotal,
        },
      });
      riwayatDibuat++;
    }
  }

  // Sinyal permintaan gagal: pembeli yang datang tapi pulang dengan tangan kosong.
  // KUOTA_HABIS membawa jumlah kg, jadi ikut menaikkan proyeksi; CARI_KOSONG hanya
  // menaikkan keyakinan (confidence), tidak menambah kg.
  const SINYAL = [
    { komoditas: "Bayam", jenis: "KUOTA_HABIS" as const, kg: 260 },
    { komoditas: "Bayam", jenis: "CARI_KOSONG" as const, kg: null },
    { komoditas: "Kangkung", jenis: "KUOTA_HABIS" as const, kg: 180 },
    { komoditas: "Kangkung", jenis: "CARI_KOSONG" as const, kg: null },
    { komoditas: "Bayam", jenis: "KUOTA_HABIS" as const, kg: 140 },
  ];
  for (const s of SINYAL) {
    await prisma.demandSignal.create({
      data: {
        zoneId: zonaMalang.id,
        commodityId: komoditas.get(s.komoditas)!.id,
        buyerId: buyerId.get("katering")!,
        signalType: s.jenis,
        qtyKgWanted: s.kg,
        searchTerm: s.jenis === "CARI_KOSONG" ? s.komoditas.toLowerCase() : null,
      },
    });
  }
  console.log(`✔ ${riwayatDibuat} batch riwayat + ${SINYAL.length} sinyal permintaan`);

  console.log("\nSelesai. Masuk sebagai salah satu nomor berikut (OTP tercetak di log API):");
  for (const t of TENANTS) console.log(`  Tenant  ${t.telepon}  ${t.nama}`);
  for (const b of BUYERS) console.log(`  Pembeli ${b.telepon}  ${b.nama}`);
  console.log(`  Operator ${OPERATOR_PHONE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
