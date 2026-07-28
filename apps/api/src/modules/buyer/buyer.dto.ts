import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateBuyerProfileDto {
  @IsString()
  @MinLength(3, { message: "Nama perusahaan minimal 3 karakter" })
  @MaxLength(120)
  companyName!: string;

  /** Kota layanan (FR-2.1) — menentukan katalog yang tampil. */
  @IsUUID("4", { message: "activeZoneId harus UUID zona" })
  activeZoneId!: string;
}

export class UpdateBuyerProfileDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120)
  companyName?: string;

  @IsOptional() @IsUUID("4")
  activeZoneId?: string;
}
