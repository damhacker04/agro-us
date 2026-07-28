import { Injectable, Logger } from "@nestjs/common";

/**
 * Port pengiriman SMS/WhatsApp OTP. Implementasi nyata (Zenziva/Twilio/WA Business)
 * menyusul — tinggal tulis provider baru & tukar binding di auth.module.ts.
 */
export abstract class SmsService {
  abstract send(phone: string, message: string): Promise<void>;
}

/** Dev/demo: OTP dicetak ke log server, tidak ada SMS keluar. */
@Injectable()
export class ConsoleSmsService extends SmsService {
  private readonly logger = new Logger("SMS(console)");

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`→ ${phone}: ${message}`);
  }
}
