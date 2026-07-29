import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { SUBSCRIPTION_GRACE_DAYS } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

const HARI = 86_400_000;

/**
 * Paket Verified (FR-9.1 s.d. 9.4).
 *
 * RUANG LINGKUP saat ini sengaja sempit: gerbang akses + status + aktivasi simulasi.
 * Siklus penuh FR-9 (tagihan berulang, transisi ACTIVE→GRACE→EXPIRED terjadwal, dan
 * notifikasi sebelum penguncian) belum ada dan menunggu branch tersendiri.
 *
 * Yang TIDAK boleh ikut terkunci saat langganan lapse, karena itu kewajiban kepada
 * pembeli yang sudah membayar dan bukan benefit Tenant:
 *   - badge verifikasi yang sudah terbit tetap berlaku (FR-9.2)
 *   - batch yang PO-nya sudah terjual tetap diverifikasi sampai selesai (FR-9.3)
 * Gerbang ini karena itu hanya dipakai untuk fitur BARU seperti Rekomendasi Tanam.
 */
@Injectable()
export class SubscriptionService {
  private readonly log = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Langganan paling akhir milik Tenant, status dihitung terhadap tanggal hari ini. */
  async status(tenantId: string, now = new Date()) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { periodEnd: "desc" },
    });
    if (!sub) return { active: false, status: "TIDAK_BERLANGGANAN" as const, sub: null };

    const end = sub.periodEnd.getTime();
    const graceEnd = sub.graceUntil?.getTime() ?? end + SUBSCRIPTION_GRACE_DAYS * HARI;

    // Status dihitung dari tanggal, BUKAN dibaca mentah dari kolom `status`. Belum ada
    // penjadwal yang memutakhirkan kolom itu, jadi kolomnya bisa tertinggal — dan
    // gerbang yang mempercayai kolom basi akan membuka akses yang seharusnya terkunci.
    if (now.getTime() <= end) return { active: true, status: "ACTIVE" as const, sub };
    if (now.getTime() <= graceEnd) return { active: true, status: "GRACE" as const, sub };
    return { active: false, status: "EXPIRED" as const, sub };
  }

  /** Gerbang fitur berlangganan. GRACE masih lolos — itulah guna masa tenggang. */
  async requireActive(tenantId: string, fitur: string) {
    const s = await this.status(tenantId);
    if (s.active) return s;
    throw new ForbiddenException({
      code: "SUBSCRIPTION_REQUIRED",
      message:
        `${fitur} termasuk paket Verified. Aktifkan langganan untuk membukanya. ` +
        `Badge verifikasi lama Anda dan batch yang PO-nya sudah terjual tidak terpengaruh.`,
      status: s.status,
    });
  }

  /**
   * Aktivasi SIMULASI — belum tersambung ke payment gateway mana pun, sama seperti
   * pembayaran pesanan di modul order. Ada supaya gerbang di atas bisa diuji.
   */
  async activate(tenantId: string, months = 1, now = new Date()) {
    const start = new Date(now);
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + months);
    const grace = new Date(end.getTime() + SUBSCRIPTION_GRACE_DAYS * HARI);

    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        plan: "VERIFIED",
        periodStart: start,
        periodEnd: end,
        graceUntil: grace,
        status: "ACTIVE",
      },
    });
    this.log.warn(`Langganan ${tenantId.slice(0, 8)} diaktifkan TANPA pembayaran nyata (simulasi).`);
    return sub;
  }
}
