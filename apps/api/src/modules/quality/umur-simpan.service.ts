import { Injectable } from "@nestjs/common";
import type { AntreanUmurSimpan, ShipmentStatus, UmurSimpan } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/** Satu baris mentah dari kueri; tanggal sudah dinormalkan ke `Date | null`. */
type BarisUmur = {
  shelf_life_days: number | null;
  harvested_at: Date | null;
  settled_at: Date | null;
};

const HARI_MS = 86_400_000;

/**
 * Umur simpan — FR-5.8, FR-5.9, FR-5.10.
 *
 * Yang v2.4 tambahkan BUKAN fasilitas penyimpanan, melainkan satu perhitungan: berapa lama
 * komoditas ini bertahan, dan sudah berapa lama sejak dipanen. Tidak ada gudang, lokasi
 * simpan, sensor, atau rantai dingin — model asset-light PRD §11.2 tidak dibatalkan.
 *
 * ⚠️ DUA aturan yang menentukan apakah angka ini berarti atau tidak:
 *
 * 1. Jamnya mulai dari `server_ts` node PANEN, bukan dari `claimed_harvest_date`. Tanggal
 *    yang diketik Tenant adalah klaim; stempel server adalah kejadian. Memakai yang pertama
 *    membuat "kesegaran" cuma jadi klaim lain dengan tampilan lebih rapi — dan seluruh
 *    produk ini dibangun justru untuk berhenti mempercayai klaim.
 *
 * 2. Komoditas tanpa `shelf_life_days` menghasilkan `null`, BUKAN angka bawaan. Menebaknya
 *    berarti menyampaikan tebakan sebagai fakta kesegaran kepada orang yang akan memakan
 *    barangnya. Itu kesalahan yang sama dengan yang FR-7.12e ada untuk mencegah.
 */
@Injectable()
export class UmurSimpanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hitung dari bahan mentah. Dipisah dari kueri supaya bisa diuji tanpa basis data —
   * aritmetika tanggal adalah tempat kesalahan diam-diam paling sering bersembunyi.
   */
  static hitung(baris: BarisUmur, sekarang = new Date()): UmurSimpan {
    const { shelf_life_days: umur, harvested_at: panen, settled_at: tiba } = baris;

    if (!panen) {
      return { shelfLifeDays: umur, harvestedAt: null, ageDays: null, remainingDays: null, settled: false };
    }

    // Jam berhenti saat barang tiba; sebelum itu ia masih berjalan. Membekukannya di
    // kedatangan penting karena setelah diterima, umurnya adalah fakta historis pesanan
    // itu — bukan angka yang terus menua di layar riwayat pembeli.
    const akhir = tiba ?? sekarang;
    const usia = Math.max(Math.floor((akhir.getTime() - panen.getTime()) / HARI_MS), 0);

    return {
      shelfLifeDays: umur,
      harvestedAt: panen.toISOString(),
      ageDays: usia,
      remainingDays: umur === null ? null : umur - usia,
      settled: tiba !== null,
    };
  }

  /** Umur simpan per order item untuk satu pesanan (BY-12b). */
  async untukOrder(orderId: string): Promise<Map<string, UmurSimpan>> {
    const rows = await this.prisma.$queryRaw<Array<BarisUmur & { order_item_id: string }>>`
      SELECT oi.id::text AS order_item_id,
             c.shelf_life_days,
             panen.server_ts AS harvested_at,
             -- Jam berhenti di kedatangan, bukan di penyelesaian escrow: yang diukur
             -- adalah usia barang saat sampai ke tangan pembeli.
             s.arrived_at    AS settled_at
      FROM order_items oi
      JOIN shipments s   ON s.id = oi.shipment_id
      JOIN batches b     ON b.id = oi.batch_id
      JOIN products p    ON p.id = b.product_id
      JOIN commodities c ON c.id = p.commodity_id
      LEFT JOIN LATERAL (
        SELECT tn.server_ts FROM timeline_nodes tn
        WHERE tn.batch_id = b.id AND tn.activity_type = 'PANEN'
        ORDER BY tn.server_ts DESC LIMIT 1
      ) panen ON TRUE
      WHERE oi.order_id = ${orderId}::uuid
    `;
    return new Map(rows.map((r) => [r.order_item_id, UmurSimpanService.hitung(r)]));
  }

  /**
   * Antrean pantau Operator (OP-14, FR-5.10).
   *
   * Sengaja TIDAK memfilter dengan ambang. Ambang di produk ini punya doktrinnya sendiri,
   * dan angka umur simpannya sendiri masih estimasi; menyaring dengannya berarti
   * menyembunyikan batch berdasarkan tebakan. Operator melihat semua yang sedang menunggu
   * kirim, terurut dari yang paling tipis, dan memutuskan sendiri.
   */
  async antrean(): Promise<AntreanUmurSimpan[]> {
    const rows = await this.prisma.$queryRaw<
      Array<
        BarisUmur & {
          batch_id: string;
          product_name: string;
          commodity_name: string;
          tenant_name: string;
          shipment_id: string;
          shipment_status: string;
          qty_box: number;
        }
      >
    >`
      SELECT b.id::text        AS batch_id,
             p.name            AS product_name,
             c.name            AS commodity_name,
             t.company_name    AS tenant_name,
             s.id::text        AS shipment_id,
             s.status::text    AS shipment_status,
             oi.qty_box,
             c.shelf_life_days,
             panen.server_ts   AS harvested_at,
             NULL::timestamptz AS settled_at
      FROM order_items oi
      JOIN shipments s   ON s.id = oi.shipment_id
      JOIN batches b     ON b.id = oi.batch_id
      JOIN products p    ON p.id = b.product_id
      JOIN commodities c ON c.id = p.commodity_id
      JOIN tenants t     ON t.id = p.tenant_id
      JOIN LATERAL (
        SELECT tn.server_ts FROM timeline_nodes tn
        WHERE tn.batch_id = b.id AND tn.activity_type = 'PANEN'
        ORDER BY tn.server_ts DESC LIMIT 1
      ) panen ON TRUE
      -- Sudah dipanen tetapi belum sampai: hanya di jendela inilah umur simpan masih
      -- bisa ditindaklanjuti seseorang.
      WHERE s.status IN ('PANEN', 'DIKIRIM')
      ORDER BY c.shelf_life_days IS NULL, (c.shelf_life_days - EXTRACT(EPOCH FROM (now() - panen.server_ts)) / 86400) ASC
    `;

    return rows.map((r) => ({
      batchId: r.batch_id,
      productName: r.product_name,
      commodityName: r.commodity_name,
      tenantName: r.tenant_name,
      shipmentId: r.shipment_id,
      shipmentStatus: r.shipment_status as ShipmentStatus,
      qtyBox: r.qty_box,
      umurSimpan: UmurSimpanService.hitung(r),
    }));
  }
}
