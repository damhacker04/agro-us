import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { NotificationService } from "./notification.service";
import { ConsoleSmsService, SmsService } from "./sms.service";

/**
 * Saluran pemberitahuan ke pengguna (§5.10) — in-app lewat WebSocket, kejadian kritis
 * juga lewat SMS/WhatsApp.
 *
 * Sengaja TIDAK bergantung pada modul logistik/mutu/timeline, meski ketiganya memicu
 * notifikasi. Kalau arah ketergantungannya dibalik, muncul lingkaran: logistik butuh
 * notifikasi, notifikasi butuh gateway logistik.
 *
 * Mengganti ConsoleSmsService dengan penyedia sungguhan (WhatsApp Business / Zenziva /
 * Twilio) cukup menukar binding di bawah — tidak ada logika lain yang perlu berubah.
 */
@Module({
  providers: [
    NotificationGateway,
    NotificationService,
    { provide: SmsService, useClass: ConsoleSmsService },
  ],
  exports: [NotificationService, SmsService],
})
export class NotificationModule {}
