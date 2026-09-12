import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PAYMENT_EXPIRY_MS, type PaymentInstruction, type PaymentMethod } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { EscrowService } from "./escrow.service";

/**
 * Pembayaran (FR-2.8) + pelepasan reservasi kuota saat tagihan kedaluwarsa (activity D3→A5).
 *
 * ⚠️ GATEWAY MASIH SIMULASI. Payload QRIS/VA/E-Wallet dibuat lokal, jadi belum ada mitra
 * yang benar-benar menerima uang. Escrow pun wajib memakai fitur penahanan dana mitra
 * berizin sebelum produksi (FR-7.1, §5.7.1).
 *
 * Yang SUDAH ditutup: `POST /payments/webhook` kini menuntut tanda tangan HMAC dan gagal
 * tertutup tanpa `PAYMENT_WEBHOOK_SECRET` (lihat webhook-signature.ts). Tombol peragaan
 * pindah ke `tandaiLunasDemo`, yang menuntut login dan hanya melayani tagihan milik
 * pemanggilnya sendiri.
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
   * Peragaan: tandai LUNAS tagihan milik pesanan pembeli yang sedang login.
   *
   * Kepemilikan diperiksa di dalam KUERI, bukan sesudahnya. Membaca tagihan lebih dulu
   * lalu membandingkan pemiliknya di TypeScript menyisakan celah yang gampang hilang saat
   * kode dirapikan; syarat di `where` tidak bisa ikut terhapus tanpa kuerinya berubah arti.
   *
   * Pesan galatnya sengaja sama untuk "tagihan tidak ada" dan "tagihan bukan milik Anda":
   * membedakan keduanya mengubah endpoint ini menjadi alat menebak nomor tagihan orang lain.
   */
  async tandaiLunasDemo(userId: string, invoiceRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { invoiceRef, order: { buyer: { userId } } },
      select: { invoiceRef: true },
    });
    if (!payment) {
      throw new NotFoundException({ code: "INVOICE_NOT_FOUND", message: "Tagihan tidak ditemukan." });
    }
    this.logger.warn(`Pembayaran SIMULASI untuk ${invoiceRef} oleh pengguna ${userId.slice(0, 8)}`);
    return this.handleWebhook(invoiceRef, "PAID");
  }

  /**
   * Callback gateway. Saat LUNAS: order → PAID dan dana masuk escrow (HOLD, FR-7.1).
   * Status pengiriman tetap MENUNGGU_PANEN sampai Tenant menandai panen (§5.6.1 status 1→2).
   */
  async handleWebhook(invoiceRef: string, status: "PAID" | "FAILED") {
    const payment = await this.prisma.payment.findUnique({
      where: { invoiceRef },
      select: { id: true, orderId: true, invoiceRef: true, status: true },
    });
    if (!payment) throw new NotFoundException({ code: "INVOICE_NOT_FOUND", message: "Tagihan tidak ditemukan." });

    // Penolakan cepat untuk callback berulang yang lazim dikirim gateway. Ini HANYA
    // penghematan; yang benar-benar menjaga adalah klaim bersyarat di dalam transaksi
    // di bawah — pemeriksaan di sini terjadi sebelum transaksi dan karenanya tidak
    // dapat menghalangi dua callback yang tiba bersamaan.
    if (payment.status !== "PENDING") {
      return { invoiceRef, status: payment.status, alreadyProcessed: true };
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      // KLAIM STATUS DULU, baru kerjakan akibatnya. `updateMany` dengan syarat
      // `status: PENDING` adalah satu pernyataan UPDATE … WHERE: pemenangnya
      // mendapat count 1, callback kembar mendapat 0 dan tidak mengerjakan apa pun.
      // Membaca status lalu menulisnya tanpa syarat — bentuk sebelumnya — membuat dua
      // callback sama-sama lolos dan menerbitkan DUA entri HOLD untuk satu tagihan.
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: status === "PAID" ? { status: "PAID", paidAt: new Date() } : { status: "FAILED" },
      });
      if (count !== 1) return false;

      if (status === "FAILED") {
        await this.releaseQuota(tx, payment.orderId);
        await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: "CLOSED" } });
        return true;
      }
      await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: "PAID" } });
      await this.escrow.holdForOrder(tx, payment.orderId, payment.invoiceRef);
      return true;
    });

    if (!claimed) {
      // Kalah balapan: tagihan sudah diproses panggilan lain. Jawaban tetap sukses —
      // gateway yang mengulang callback tidak sedang melakukan kesalahan — tetapi
      // statusnya dibaca ulang supaya yang dilaporkan adalah yang benar-benar tersimpan.
      const current = await this.prisma.payment.findUnique({ where: { invoiceRef }, select: { status: true } });
      return { invoiceRef, status: current?.status ?? payment.status, alreadyProcessed: true };
    }

    if (status === "FAILED") return { invoiceRef, status: "FAILED" as const, alreadyProcessed: false };
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

    let expired = 0;
    for (const p of stale) {
      // Sama seperti callback: kedaluwarsa harus KALAH dari pembayaran yang tiba
      // sedetik sebelumnya. Tanpa syarat `status: PENDING`, cron ini bisa menimpa
      // tagihan yang baru saja LUNAS — melepas kuota yang sudah terjual dan menutup
      // pesanan yang uangnya sudah masuk escrow.
      const released = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.payment.updateMany({
          where: { id: p.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        if (count !== 1) return false;
        await this.releaseQuota(tx, p.orderId);
        await tx.order.update({ where: { id: p.orderId }, data: { orderStatus: "CLOSED" } });
        return true;
      });
      if (!released) continue;
      expired += 1;
      this.logger.log(`Tagihan ${p.invoiceRef} kedaluwarsa — kuota dilepas`);
    }
    return { expired };
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
