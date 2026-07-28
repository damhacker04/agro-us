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

  /** Saldo tertahan per Tenant — dipakai dashboard Tenant (FR-3.5). */
  async balanceForTenant(tenantId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ entry_type: string; total: bigint }>>`
      SELECT entry_type::text, SUM(amount)::bigint AS total
      FROM escrow_ledger WHERE tenant_id = ${tenantId}::uuid
      GROUP BY entry_type
    `;
    const by = Object.fromEntries(rows.map((r) => [r.entry_type, Number(r.total)]));
    const held = by.HOLD ?? 0;
    const out = (by.RELEASE ?? 0) + (by.RELEASE30 ?? 0) + (by.POTONG_KLAIM ?? 0) + (by.REFUND ?? 0);
    return { held, released: out, balance: held - out, breakdown: by };
  }
}
