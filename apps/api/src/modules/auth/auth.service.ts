import { createHash, randomInt } from "node:crypto";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type RequestOtpResponse,
  type VerifyOtpResponse,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { SmsService } from "./sms.service";
import type { UserRole } from "../../../generated/prisma/enums";

export interface JwtPayload {
  sub: string; // user id
  phone: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
  ) {}

  /** 08… / 62… / +62… → +62… */
  private normalizePhone(raw: string): string {
    const p = raw.replace(/[\s-]/g, "");
    if (p.startsWith("+62")) return p;
    if (p.startsWith("62")) return `+${p}`;
    if (p.startsWith("0")) return `+62${p.slice(1)}`;
    throw new BadRequestException("Nomor telepon tidak valid");
  }

  /**
   * Kode TIDAK pernah disimpan plaintext — sha256(pepper|phone|kode).
   *
   * Pepper WAJIB dari environment, tanpa nilai cadangan. Pepper yang diketahui publik
   * membuat hash OTP bisa ditebak habis-habisan: ruang kodenya hanya 10^6, jadi
   * penyerang yang membaca tabel tinggal menghitung semua kemungkinan dalam hitungan detik.
   */
  private hashCode(phone: string, code: string): string {
    const pepper = process.env.OTP_PEPPER;
    if (!pepper || pepper.length < 16) {
      throw new Error("OTP_PEPPER wajib diset dan minimal 16 karakter.");
    }
    return createHash("sha256").update(`${pepper}|${phone}|${code}`).digest("hex");
  }

  async requestOtp(rawPhone: string): Promise<RequestOtpResponse> {
    const phone = this.normalizePhone(rawPhone);
    const now = Date.now();

    // Cooldown kirim ulang (ER-19)
    const active = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date(now) } },
      orderBy: { sentAt: "desc" },
    });
    if (active) {
      const elapsed = now - active.sentAt.getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException(
          { code: "OTP_COOLDOWN", message: `Tunggu ${retryAfterSec} detik untuk kirim ulang`, retryAfterSec },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Kode lama hangus; hanya satu kode aktif per nomor.
    await this.prisma.otpRequest.deleteMany({ where: { phone, consumedAt: null } });

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.otpRequest.create({
      data: {
        phone,
        codeHash: this.hashCode(phone, code),
        expiresAt: new Date(now + OTP_TTL_MS),
      },
    });
    await this.sms.send(phone, `Kode masuk AgroUs: ${code}. Berlaku 5 menit. Jangan bagikan.`);

    const isProd = process.env.NODE_ENV === "production";
    return {
      expiresInSec: OTP_TTL_MS / 1000,
      resendAfterSec: OTP_RESEND_COOLDOWN_MS / 1000,
      ...(isProd ? {} : { devOtp: code }), // memudahkan dev/demo saat SMS = console
    };
  }

  async verifyOtp(rawPhone: string, code: string, role?: "TENANT" | "BUYER"): Promise<VerifyOtpResponse> {
    const phone = this.normalizePhone(rawPhone);

    const row = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { sentAt: "desc" },
    });
    if (!row) {
      throw new BadRequestException({ code: "OTP_EXPIRED", message: "Kode kedaluwarsa atau belum diminta. Minta kode baru." });
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException({ code: "OTP_LOCKED", message: "Terlalu banyak percobaan. Minta kode baru." });
    }

    if (row.codeHash !== this.hashCode(phone, code)) {
      const updated = await this.prisma.otpRequest.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = Math.max(OTP_MAX_ATTEMPTS - updated.attempts, 0);
      throw new UnauthorizedException({
        code: "OTP_WRONG",
        message: remaining > 0 ? `Kode salah. Sisa ${remaining} percobaan.` : "Kode salah. Minta kode baru.",
        remainingAttempts: remaining,
      });
    }

    // Kode BENAR. Cek kelengkapan registrasi SEBELUM menghanguskan kode —
    // kalau ROLE_REQUIRED dilempar setelah consume, user kehilangan kode yang
    // sebenarnya valid dan terpaksa menunggu cooldown 60 dtk tanpa salah apa pun.
    let user = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user && !role) {
      // FE tampilkan pilihan peran, lalu kirim ulang verify dengan kode yang sama.
      throw new BadRequestException({
        code: "ROLE_REQUIRED",
        message: "Nomor belum terdaftar — sertakan role (TENANT/BUYER).",
      });
    }

    // Tandai terpakai — guard double-submit: hanya menang kalau masih belum consumed.
    const consumed = await this.prisma.otpRequest.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException({ code: "OTP_EXPIRED", message: "Kode sudah terpakai. Minta kode baru." });
    }

    if (!user) {
      user = await this.prisma.user.create({ data: { phone, role: role! } });
    }

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      isNewUser,
      user: { id: user.id, phone: user.phone, role: user.role },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { id: true, companyName: true, legalityStatus: true } }, buyer: { select: { id: true, companyName: true, activeZoneId: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const { id, phone, role, tenant, buyer } = user;
    return { id, phone, role, tenant, buyer };
  }
}
