import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * Buku besar escrow — APPEND-ONLY (PRD §6.1, dijaga trigger DB).
 * Tidak ada UPDATE/DELETE: koreksi selalu berupa entri baru.
 *
 * ⚠️ Ini baru PEMBUKUAN internal. Penahanan dana sesungguhnya wajib memakai fitur
 * escrow mitra payment gateway berizin — dana TIDAK BOLEH mampir ke rekening
 * operasional AgroUs (FR-7.1, kepatuhan §5.7.1).
 */
@Injectable()
export class EscrowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catat HOLD saat pembayaran lunas. Satu entri PER TENANT, karena pencairan
   * nantinya juga per Tenant (order lintas-Tenant bisa punya beberapa penerima).
   * Ongkir & biaya laporan tidak masuk escrow Tenant — itu porsi platform.
   */
  async holdForOrder(tx: Tx, orderId: string, gatewayRef: string) {
    const rows = await tx.$queryRaw<Array<{ tenant_id: string; shipment_id: string; amount: bigint }>>`
      SELECT p.tenant_id::text, oi.shipment_id::text, SUM(oi.subtotal)::bigint AS amount
      FROM order_items oi
      JOIN batches  b ON b.id = oi.batch_id
      JOIN products p ON p.id = b.product_id
      WHERE oi.order_id = ${orderId}::uuid
      GROUP BY p.tenant_id, oi.shipment_id
    `;

    for (const r of rows) {
      await tx.escrowLedgerEntry.create({
        data: {
          orderId,
          shipmentId: r.shipment_id,
          tenantId: r.tenant_id,
          entryType: "HOLD",
          amount: Number(r.amount),
          gatewayRef,
        },
      });
    }
    return rows.length;
  }

}
