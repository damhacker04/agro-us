import { IsIn, IsOptional, IsString, Matches } from "class-validator";

/** Nomor Indonesia: menerima 08…, 62…, +62… (dinormalisasi service ke +62). */
const PHONE_RE = /^(\+62|62|0)8\d{7,11}$/;

export class RequestOtpDto {
  @IsString()
  @Matches(PHONE_RE, { message: "Nomor telepon tidak valid (contoh: 081234567890)" })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(PHONE_RE, { message: "Nomor telepon tidak valid" })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: "Kode OTP harus 6 digit angka" })
  code!: string;

  /** Wajib hanya saat registrasi (nomor baru). OPERATOR sengaja tidak bisa lewat sini. */
  @IsOptional()
  @IsIn(["TENANT", "BUYER"], { message: "role harus TENANT atau BUYER" })
  role?: "TENANT" | "BUYER";
}
