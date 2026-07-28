import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthService, type JwtPayload } from "./auth.service";
import { RequestOtpDto, VerifyOtpDto } from "./auth.dto";
import { CurrentUser, JwtAuthGuard } from "./auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** FR-1.3 — kirim OTP. 429 saat cooldown 60 dtk (ER-19). */
  @Post("otp/request")
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  /** Verifikasi OTP → JWT. Nomor baru wajib sertakan role (registrasi). */
  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.role);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}
