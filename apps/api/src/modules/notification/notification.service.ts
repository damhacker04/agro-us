import { Injectable, Logger } from "@nestjs/common";
import { NOTIF_KINDS, type AppNotification, type NotifKind, type NotifSeverity } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationGateway } from "./notification.gateway";
import { SmsService } from "./sms.service";

/** Kejadian mana yang layak mengganggu orang di luar aplikasi (FR-10.1 vs FR-10.3). */
const SEVERITY: Record<NotifKind, NotifSeverity> = {
  PENGIRIMAN_DIMULAI: "BIASA",
  KURIR_MENDEKAT: "BIASA",
  KURIR_TIBA: "KRITIS",
  GAGAL_PANEN: "KRITIS",
  KLAIM_DIPUTUS: "KRITIS",
  ESCROW_CAIR: "KRITIS",
  // Kritis: selama belum diputus, Tenant tidak bisa berjualan sama sekali.
  LEGALITAS_DIPUTUS: "KRITIS",
  // Kritis: memengaruhi berapa banyak yang boleh dijual siklus berikutnya, dan Tenant
  // berhak tahu sebelum ia menyusun rencana tanam — bukan saat kuotanya ditolak sistem.
  KUOTA_DITURUNKAN: "KRITIS",
};

/**
 * Penyalur notifikasi (§5.10).
 *
 *   in-app  → WebSocket, semua tingkat (FR-10.3)
 *   luar    → SmsService, HANYA yang KRITIS (FR-10.1)
 *
 * Pembagian itu bukan soal rapi-rapi. Mengirim tiap pembaruan timeline ke WhatsApp akan
 * membuat penerimanya membisukan nomor AgroUs dalam sepekan — dan saat kurir benar-benar
 * tiba, pesan yang paling penting justru ikut tidak terbaca.
 *
 * ⚠️ SmsService masih ConsoleSmsService: pesan "terkirim" hanya tercetak ke log server.
 * Penyaluran nyata (WhatsApp Business / Zenziva / Twilio) tinggal menukar binding di
 * NotificationModule — logika di berkas ini tidak perlu berubah.
 */
@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
    private readonly sms: SmsService,
  ) {}

  /**
   * Kirim ke satu pengguna. TIDAK PERNAH melempar error: notifikasi adalah efek samping,
   * dan kegagalan mengirimnya tidak boleh membatalkan panen, klaim, atau pencairan yang
   * sudah sah terjadi.
   */
  async kirim(
    userId: string,
    kind: NotifKind,
    title: string,
    body: string,
    extra: Partial<Pick<AppNotification, "shipmentId" | "orderId" | "batchId" | "countdownEndsAt">> = {},
  ) {
    const notif: AppNotification = {
      kind,
      severity: SEVERITY[kind],
      title,
      body,
      ...extra,
      createdAt: new Date().toISOString(),
    };

    try {
      this.gateway.push(userId, notif);
      if (notif.severity === "KRITIS") await this.kirimLuar(userId, notif);
    } catch (e) {
      this.log.warn(`Notifikasi ${kind} gagal dikirim: ${(e as Error).message}`);
    }
    return notif;
  }

  /** Cari pemilik pengiriman lalu kirim — dipakai modul yang hanya memegang shipmentId. */
  async kirimKePembeliPengiriman(
    shipmentId: string,
    kind: NotifKind,
    title: string,
    body: string,
    extra: Partial<AppNotification> = {},
  ) {
    const s = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { orderId: true, order: { select: { buyer: { select: { userId: true } } } } },
    });
    if (!s) return null;
    return this.kirim(s.order.buyer.userId, kind, title, body, {
      shipmentId,
      orderId: s.orderId,
      ...extra,
    });
  }

  private async kirimLuar(userId: string, notif: AppNotification) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) return;
    await this.sms.send(user.phone, `${notif.title} — ${notif.body}`);
  }
}
