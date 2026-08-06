import { Injectable, NotFoundException } from "@nestjs/common";
import type { TenantOrderDetail, TenantOrderSummary } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Pesanan dilihat dari sisi Tenant (TN-21, TN-22).
 *
 * GRAINNYA PENGIRIMAN, bukan pesanan. Yang dikerjakan Tenant adalah mengemas satu
 * pengiriman, mencetak QR box-nya, dan menyerahkannya ke kurir — dan QR maupun Kode
 * Antar memang melekat pada pengiriman, bukan pada pesanan.
 *
 * PENTING: pesanan bisa lintas-Tenant. Satu pengiriman dapat memuat item milik beberapa
 * Tenant sekaligus, jadi `lines` disaring HANYA ke item milik Tenant yang meminta —
 * Tenant tidak berhak melihat apa yang dijual pesaingnya dalam pesanan yang sama.
 */
@Injectable()
export class TenantOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<TenantOrderSummary[]> {
    const shipmentIds = await this.shipmentIdsOf(tenantId);
    if (!shipmentIds.length) return [];
    return Promise.all(shipmentIds.map((id) => this.buildSummary(tenantId, id)));
  }

  async detail(tenantId: string, shipmentId: string): Promise<TenantOrderDetail> {
    const milik = await this.prisma.orderItem.findFirst({
      where: { shipmentId, batch: { product: { tenantId } } },
      select: { id: true },
    });
    // Dicek lewat kepemilikan ITEM, bukan sekadar keberadaan pengiriman: tanpa ini
    // Tenant mana pun bisa membaca detail pengiriman Tenant lain hanya dengan menebak id.
    if (!milik) throw new NotFoundException("Pesanan tidak ditemukan");

    const ringkas = await this.buildSummary(tenantId, shipmentId);
    const rows = await this.prisma.$queryRaw<
      Array<{
        recipient_name: string;
        recipient_phone: string;
        landmark: string | null;
        receiving_hours: string;
        lat: number;
        lng: number;
        arrived_at: Date | null;
        claim_window_ends_at: Date | null;
        completed_at: Date | null;
      }>
    >`
      SELECT recipient_name, recipient_phone, landmark, receiving_hours,
             ST_Y(dest_point) AS lat, ST_X(dest_point) AS lng,
             arrived_at, claim_window_ends_at, completed_at
      FROM shipments WHERE id = ${shipmentId}::uuid
    `;
    const s = rows[0]!;
    return {
      ...ringkas,
      recipient: {
        name: s.recipient_name,
        phone: s.recipient_phone,
        landmark: s.landmark,
        receivingHours: s.receiving_hours,
      },
      destination: { lat: Number(s.lat), lng: Number(s.lng) },
      arrivedAt: s.arrived_at?.toISOString() ?? null,
      claimWindowEndsAt: s.claim_window_ends_at?.toISOString() ?? null,
      completedAt: s.completed_at?.toISOString() ?? null,
    };
  }

  private async shipmentIdsOf(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT s.id::text, s.urgensi, s.created_at_proxy
      FROM (
        SELECT sh.id,
               o.created_at AS created_at_proxy,
               -- Ini daftar PEKERJAAN, bukan arsip. Yang menunggu tindakan Tenant naik
               -- ke atas; yang sudah selesai turun, sebanyak apa pun riwayatnya.
               CASE sh.status
                 WHEN 'PANEN'          THEN 0  -- siap dikemas & dicetak QR-nya
                 WHEN 'MENUNGGU_PANEN' THEN 1  -- menunggu panen dicatat
                 WHEN 'DIKIRIM'        THEN 2
                 WHEN 'TIBA_DI_LOKASI' THEN 3
                 WHEN 'DITERIMA'       THEN 4
                 WHEN 'SELESAI'        THEN 5
                 ELSE 6                        -- DIBATALKAN
               END AS urgensi
        FROM shipments sh
        JOIN orders o ON o.id = sh.order_id
        JOIN order_items oi ON oi.shipment_id = sh.id
        JOIN batches b  ON b.id = oi.batch_id
        JOIN products p ON p.id = b.product_id
        -- Pesanan yang belum dibayar belum jadi kewajiban Tenant, jadi tidak
        -- ditampilkan sebagai pekerjaan.
        WHERE p.tenant_id = ${tenantId}::uuid AND o.order_status <> 'DRAFT'
      ) s
      ORDER BY s.urgensi ASC, s.created_at_proxy DESC
    `;
    return rows.map((r) => r.id);
  }

  private async buildSummary(tenantId: string, shipmentId: string): Promise<TenantOrderSummary> {
    const shipment = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      select: {
        id: true,
        orderId: true,
        status: true,
        zone: { select: { name: true } },
        order: { select: { createdAt: true, buyer: { select: { companyName: true } } } },
      },
    });

    const items = await this.prisma.orderItem.findMany({
      where: { shipmentId, batch: { product: { tenantId } } },
      select: {
        id: true,
        batchId: true,
        qtyBox: true,
        qtyBoxFulfilled: true,
        unitPriceLocked: true,
        subtotal: true,
        batch: {
          select: { claimedHarvestDate: true, product: { select: { name: true, grade: true } } },
        },
      },
    });

    // QR melekat pada ITEM pesanan (satu token per box), bukan langsung pada pengiriman —
    // jadi ditelusuri lewat item. Cukup satu token: penerbitan dilakukan sekaligus untuk
    // seluruh box dalam pengiriman.
    const qr = await this.prisma.boxQrToken.findFirst({
      where: { orderItem: { shipmentId } },
      select: { id: true },
    });

    return {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      buyerName: shipment.order.buyer.companyName,
      zoneName: shipment.zone.name,
      createdAt: shipment.order.createdAt.toISOString(),
      // Pengiriman menunggu item yang panennya PALING LAMBAT — bukan yang paling cepat.
      readyDate: items
        .map((i) => i.batch.claimedHarvestDate.toISOString().slice(0, 10))
        .sort()
        .at(-1)!,
      lines: items.map((i) => ({
        orderItemId: i.id,
        batchId: i.batchId,
        productName: i.batch.product.name,
        grade: i.batch.product.grade,
        qtyBox: i.qtyBox,
        qtyBoxFulfilled: i.qtyBoxFulfilled,
        unitPriceLocked: i.unitPriceLocked,
        subtotal: i.subtotal,
      })),
      subtotal: items.reduce((s, i) => s + i.subtotal, 0),
      qrIssued: qr !== null,
    };
  }
}
