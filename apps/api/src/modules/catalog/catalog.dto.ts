import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const GRADES = ["A", "B", "C"] as const;

export class CreateProductDto {
  @IsUUID("4")
  commodityId!: string;

  @IsString()
  @MinLength(3, { message: "Nama produk minimal 3 karakter" })
  @MaxLength(120)
  name!: string;

  @IsIn(GRADES, { message: "grade harus A, B, atau C" })
  grade!: "A" | "B" | "C";

  /** Rupiah selalu integer — hindari bug pembulatan float. */
  @IsInt({ message: "pricePerBox harus bilangan bulat rupiah" })
  @IsPositive()
  pricePerBox!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: "qtyKgPerBox harus lebih dari 0" })
  qtyKgPerBox!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockBox?: number;

  @IsDateString({}, { message: "estHarvestDate harus tanggal ISO (YYYY-MM-DD)" })
  estHarvestDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) name?: string;
  @IsOptional() @IsIn(GRADES) grade?: "A" | "B" | "C";
  @IsOptional() @IsInt() @IsPositive() pricePerBox?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() qtyKgPerBox?: number;
  @IsOptional() @IsInt() @Min(0) stockBox?: number;
  @IsOptional() @IsDateString() estHarvestDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class OpenQuotaDto {
  @IsUUID("4")
  landPlotId!: string;

  @IsInt()
  @IsPositive({ message: "quotaBoxTotal harus lebih dari 0" })
  quotaBoxTotal!: number;

  @IsInt()
  @IsPositive({ message: "lockedPrice harus lebih dari 0" })
  lockedPrice!: number;

  @IsDateString({}, { message: "claimedHarvestDate harus tanggal ISO" })
  claimedHarvestDate!: string;

  @IsOptional()
  @IsDateString()
  claimedPlantDate?: string;
}

export class CapacityQueryDto {
  @IsUUID("4")
  commodityId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  qtyKgPerBox!: number;
}

export class CatalogQueryDto {
  /** Wajib — pembeli memilih kota layanan lebih dulu (FR-2.1). */
  @IsUUID("4", { message: "zoneId wajib diisi (pilih kota layanan dulu)" })
  zoneId!: string;

  @IsOptional() @IsUUID("4") commodityId?: string;
  @IsOptional() @IsIn(GRADES) grade?: "A" | "B" | "C";

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
