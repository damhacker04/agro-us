import { Type } from "class-transformer";
import type { YieldPlausibility } from "@agro-os/shared";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { VerificationStatus } from "@agro-os/shared";

const STATUS = Object.values(VerificationStatus);

export class DecideSatelliteDto {
  @IsIn(STATUS, { message: `verificationStatus harus salah satu dari: ${STATUS.join(", ")}` })
  verificationStatus!: (typeof STATUS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpsertZoneDto {
  @IsString()
  @MinLength(3, { message: "Nama zona minimal 3 karakter" })
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  city!: string;

  /** Gerbang unit economics: di bawah nilai ini satu perjalanan kurir merugi. */
  @Type(() => Number)
  @IsInt({ message: "minOrderValue harus bilangan bulat rupiah" })
  @Min(0)
  minOrderValue!: number;
}

export class UpsertCommodityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsIn(["DAUN", "BUAH_UMBI"], { message: "category harus DAUN atau BUAH_UMBI" })
  category!: "DAUN" | "BUAH_UMBI";

  /** Toleransi susut alami saat klaim mutu (FR-5.2). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shrinkTolerancePct!: number;

  /** Basis pembatas kuota PO (FR-3.3) — salah di sini berarti kuota seluruh Tenant salah. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: "avgYieldKgPerHa harus lebih dari 0" })
  avgYieldKgPerHa!: number;

  /** Umur tanam minimal — dasar pagar kewajaran tanggal panen (FR-4.8). */
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: "growingDaysMin harus lebih dari 0" })
  growingDaysMin!: number;

  @IsOptional()
  gradeStandards?: unknown;
}

/**
 * POST /operator/kewajaran/:assessmentId/decide — putusan tinjauan kewajaran (OP-13).
 *
 * `TIDAK_DAPAT_DINILAI` sengaja ikut diizinkan: setelah melihat kurva NDVI dan pembanding
 * zona, Operator bisa menyimpulkan bahwa memang tidak ada dasar menilai. Memaksanya memilih
 * antara WAJAR dan TIDAK_WAJAR akan membuatnya menebak, dan tebakan itu menempel pada cap
 * 10% seseorang.
 */
export class DecidePlausibilityDto {
  @IsIn(["WAJAR", "PERLU_DITINJAU", "TIDAK_WAJAR", "TIDAK_DAPAT_DINILAI"])
  finalVerdict!: YieldPlausibility;

  @IsOptional()
  @IsString()
  note?: string;
}
