import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PAYMENT_EXPIRY_MS, type PaymentInstruction, type PaymentMethod } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { EscrowService } from "./escrow.service";

/**
 * Pembayaran (FR-2.8) + pelepasan reservasi kuota saat tagihan kedaluwarsa (activity D3→A5).
 *
 * ⚠️ GATEWAY MASIH SIMULASI. Payload QRIS/VA/E-Wallet dibuat lokal dan `POST /payments/webhook`
 * belum memverifikasi tanda tangan. Sebelum produksi WAJIB diganti Midtrans/Xendit sungguhan
 * DENGAN verifikasi signature — tanpa itu siapa pun bisa menandai tagihan LUNAS.
 * Escrow juga wajib memakai fitur penahanan dana mitra berizin (FR-7.1, §5.7.1).
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowService,
  ) {}

  private buildPayload(method: PaymentMethod, invoiceRef: string, amount: number): string {
    switch (method) {
      case "QRIS":
        return `00020101021126SIMULASI-QRIS|${invoiceRef}|${amount}`;
      case "VA":
        return `8808${invoiceRef.replace(/\D/g, "").slice(-10).padStart(10, "0")}`;
      case "EWALLET":
        return `https://simulasi-ewallet.local/pay/${invoiceRef}`;
    }
  }

  async createInvoice(orderId: string, method: PaymentMethod, amount: number): Promise<PaymentInstruction> {
    const invoiceRef = `AGR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

    const p = await this.prisma.payment.create({
      data: {
        orderId,
        gateway: "MIDTRANS", // placeholder sampai integrasi nyata
        method,
        invoiceRef,
        amount,
        status: "PENDING",
        expiresAt,
      },
    });

    return {
      id: p.id,
      method: p.method,
      status: p.status,
      amount: p.amount,
      invoiceRef: p.invoiceRef,
      expiresAt: p.expiresAt.toISOString(),
      payload: this.buildPayload(method, invoiceRef, amount),
    };
  }

  /**
   * Callback gateway. Saat LUNAS: order → PAID dan dana masuk escrow (HOLD, FR-7.1).
   * Status pengiriman tetap MENUNGGU_PANEN sampai Tenant menandai panen (§5.6.1 status 1→2).
   */
  async handleWebhook(invoiceRef: string, status: "PAID" | "FAILED") {
    const payment = await this.prisma.payment.findUnique({
      where: { invoiceRef },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new NotFoundException({ code: "INVOICE_NOT_FOUND", message: "Tagihan tidak ditemukan." });

    // Idempoten — gateway lazim mengirim callback berkali-kali.
    if (payment.status !== "PENDING") {
      return { invoiceRef, status: payment.status, alreadyProcessed: true };
    }

    if (status === "FAILED") {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        await this.releaseQuota(tx, payment.orderId);
        await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: "CLOSED" } });
      });
      return { invoiceRef, status: "FAILED" as const, alreadyProcessed: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date() } });
      await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: "PAID" } });
      await this.escrow.holdForOrder(tx, payment.orderId, payment.invoiceRef);
    });

    this.logger.log(`Tagihan ${invoiceRef} LUNAS — dana ditahan di escrow`);
    return { invoiceRef, status: "PAID" as const, alreadyProcessed: false };
  }

  /**
   * Activity A5 — tagihan lewat batas waktu: lepas reservasi kuota supaya batch bisa
   * dijual lagi. Dipanggil lazily saat checkout; jadwalkan juga sebagai cron harian.
   */
  async expireStale() {
    const stale = await this.prisma.payment.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      select: { id: true, orderId: true, invoiceRef: true },
    });
    if (!stale.length) return { expired: 0 };

    for (const p of stale) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: p.id }, data: { status: "EXPIRED" } });
        await this.releaseQuota(tx, p.orderId);
        await tx.order.update({ where: { id: p.orderId }, data: { orderStatus: "CLOSED" } });
      });
      this.logger.log(`Tagihan ${p.invoiceRef} kedaluwarsa — kuota dilepas`);
    }
    return { expired: stale.length };
  }

  /** Kembalikan kuota yang sempat direservasi order ini. */
  private async releaseQuota(tx: { $executeRaw: PrismaService["$executeRaw"] }, orderId: string) {
    await tx.$executeRaw`
      UPDATE batches b
      SET quota_box_sold = GREATEST(b.quota_box_sold - agg.qty, 0)
      FROM (
        SELECT batch_id, SUM(qty_box)::int AS qty
        FROM order_items WHERE order_id = ${orderId}::uuid
        GROUP BY batch_id
      ) agg
      WHERE b.id = agg.batch_id
    `;
  }
}
