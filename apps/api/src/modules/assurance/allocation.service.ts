import { Injectable, Logger } from "@nestjs/common";
import {
  SHORTFALL_PENALTY_THRESHOLD_PCT,
  QUOTA_MULTIPLIER_NORMAL,
  QUOTA_MULTIPLIER_PENALTY,
  SHORTFALL_PENALTY_ROLLING_CYCLES,
  type AllocationLine,
  type AllocationPreview,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * Alokasi hasil panen ke pesanan (FR-7.8/7.9, §5.7.2).
 *
 * KEBIJAKAN: FIFO, pesanan dipenuhi UTUH secara berurutan sampai stok habis —
 * bukan pro-rata.
 *
 * Alasannya bukan sekadar "adil": seluruh tesis produk ini adalah mengunci permintaan
 * sebelum tanam. Kalau komitmen lebih awal tidak memberi keuntungan apa pun saat pasokan
 * kurang, insentif untuk memesan lebih dulu ikut hilang. Pro-rata juga membuat SEMUA
 * pembeli kekurangan sedikit-sedikit — dan bagi restoran, 70% pesanan sering sama tidak
 * bergunanya dengan 0% karena menunya tetap tidak bisa jalan.
 *
 * URUTANNYA memakai `payments.paid_at`, BUKAN `orders.created_at`: kalau memakai waktu
 * order dibuat, siapa pun bisa memesan lebih dulu lalu membayar belakangan dan tetap
 * menang antrean.
 */
@Injectable()
export class AllocationService {
  private readonly log = new Logger(AllocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Hitung alokasi TANPA menyimpan — dipakai pratinjau di layar Tandai Panen (TN-19a). */
  async preview(batchId: string, fulfilledBox: number): Promise<AllocationPreview> {
    const rows = await this.loadOrderedItems(batchId);

    const fullyFulfilled: AllocationLine[] = [];
    const partial: AllocationLine[] = [];
    const unfulfilled: AllocationLine[] = [];

    let remaining = fulfilledBox;
    for (const r of rows) {
      const line: AllocationLine = {
        orderItemId: r.order_item_id,
        buyerName: r.buyer_name,
        paidAt: r.paid_at?.toISOString() ?? "",
        qtyBox: r.qty_box,
        allocatedBox: 0,
        shortfallBox: r.qty_box,
      };

      if (remaining >= r.qty_box) {
        line.allocatedBox = r.qty_box;
        line.shortfallBox = 0;
        remaining -= r.qty_box;
        fullyFulfilled.push(line);
      } else if (remaining > 0) {
        // Pesanan di perbatasan — kebagian sebagian. Pembeli yang memutuskan
        // apakah menerimanya atau menolak seluruhnya (FR-7.10).
        line.allocatedBox = remaining;
        line.shortfallBox = r.qty_box - remaining;
        remaining = 0;
        partial.push(line);
      } else {
        unfulfilled.push(line);
      }
    }

    const sold = rows.reduce((s, r) => s + r.qty_box, 0);
    return { batchId, quotaBoxSold: sold, fulfilledBox, fullyFulfilled, partial, unfulfilled };
  }

  /**
   * Terapkan alokasi saat Tenant menandai panen. Transaksional supaya dua panen
   * yang dideklarasikan bersamaan tidak saling menimpa hasil alokasinya.
   */
  async apply(tx: Tx, batchId: string, fulfilledBox: number): Promise<AllocationPreview> {
    const plan = await this.preview(batchId, fulfilledBox);

    for (const line of [...plan.fullyFulfilled, ...plan.partial, ...plan.unfulfilled]) {
      await tx.orderItem.update({
        where: { id: line.orderItemId },
        data: { qtyBoxFulfilled: line.allocatedBox },
      });
    }

    const kurang = plan.partial.length + plan.unfulfilled.length;
    if (kurang > 0) {
      this.log.warn(
        `Batch ${batchId.slice(0, 8)}: ${plan.fullyFulfilled.length} pesanan penuh, ` +
          `${kurang} perlu Harvest Assurance`,
      );
    }
    return plan;
  }

  /**
   * Penalti kuota (FR-7.12).
   *
   * Ambang 15% dipilih karena kuota sudah dibatasi 70% kapasitas lahan — Tenant punya
   * bantalan 30%. Kalau dengan bantalan itu ia masih gagal mengirim lebih dari 15% kuota
   * terjual, realisasi panennya meleset 40%+ dari estimasi: itu bukan cuaca lagi.
   *
   * Shortfall yang TIDAK terverifikasi satelit dihukum langsung tanpa ambang — itulah
   * yang memberi mitigasi side-selling gigi finansial, bukan sekadar penalti reputasi.
   */
  async applyShortfallPenalty(tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ sold: bigint; fulfilled: bigint; verified: boolean }>
    >`
      SELECT b.quota_box_sold::bigint AS sold,
             COALESCE(b.quota_box_fulfilled, 0)::bigint AS fulfilled,
             (b.verification_status = 'TERVERIFIKASI') AS verified
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE p.tenant_id = ${tenantId}::uuid
        AND b.production_status IN ('HARVESTED', 'FAILED')
        AND b.quota_box_sold > 0
      ORDER BY b.claimed_harvest_date DESC
      LIMIT ${SHORTFALL_PENALTY_ROLLING_CYCLES}
    `;
    if (!rows.length) return { ratio: null, penalized: false };

    const sold = rows.reduce((s, r) => s + Number(r.sold), 0);
    const fulfilled = rows.reduce((s, r) => s + Number(r.fulfilled), 0);
    const ratio = sold === 0 ? 0 : ((sold - fulfilled) / sold) * 100;

    // Cukup SATU siklus tak terverifikasi untuk menggugurkan perlindungan ambang.
    const anyUnverified = rows.some((r) => !r.verified && Number(r.fulfilled) < Number(r.sold));
    const penalized = anyUnverified || ratio > SHORTFALL_PENALTY_THRESHOLD_PCT;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        shortfallRatioCached: Math.round(ratio * 100) / 100,
        quotaMultiplier: penalized ? QUOTA_MULTIPLIER_PENALTY : QUOTA_MULTIPLIER_NORMAL,
      },
    });

    if (penalized) {
      this.log.warn(
        `Tenant ${tenantId.slice(0, 8)}: shortfall ${ratio.toFixed(1)}%` +
          `${anyUnverified ? " (ada siklus TIDAK terverifikasi)" : ""} → kuota turun ke ${QUOTA_MULTIPLIER_PENALTY}`,
      );
    }
    return { ratio: Math.round(ratio * 100) / 100, penalized, unverified: anyUnverified };
  }

  /** Item batch ini, DIURUTKAN menurut waktu pembayaran masuk escrow (FR-7.9). */
  private loadOrderedItems(batchId: string) {
    return this.prisma.$queryRaw<
      Array<{ order_item_id: string; buyer_name: string; paid_at: Date | null; qty_box: number }>
    >`
      SELECT oi.id::text AS order_item_id,
             bu.company_name AS buyer_name,
             pay.paid_at,
             oi.qty_box
      FROM order_items oi
      JOIN orders o  ON o.id = oi.order_id
      JOIN buyers bu ON bu.id = o.buyer_id
      -- Pembayaran LUNAS milik order ini. Order yang belum lunas tidak ikut
      -- antrean alokasi sama sekali.
      JOIN payments pay ON pay.order_id = o.id AND pay.status = 'PAID'
      WHERE oi.batch_id = ${batchId}::uuid
      ORDER BY pay.paid_at ASC, oi.id ASC
    `;
  }
}
