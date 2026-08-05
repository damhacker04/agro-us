import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength, ValidateNested } from "class-validator";

export class CreateTenantProfileDto {
  @IsString()
  @MinLength(3, { message: "Nama perusahaan minimal 3 karakter" })
  @MaxLength(120)
  companyName!: string;

  @IsOptional()
  @IsUrl({}, { message: "logoUrl harus berupa URL" })
  logoUrl?: string;

  @IsArray()
  @ArrayNotEmpty({ message: "Pilih minimal satu zona layanan" })
  @IsUUID("4", { each: true, message: "zoneIds harus berisi UUID" })
  zoneIds!: string[];
}

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsUrl({}, { message: "logoUrl harus berupa URL" })
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  zoneIds?: string[];
}

export class SubmitLegalityDto {
  @IsUrl({}, { message: "documentUrl harus berupa URL dokumen NIB/KTP" })
  documentUrl!: string;
}

/** GeoJSON Polygon. Validasi bentuk di sini; validasi geometri sungguhan di PostGIS. */
export class GeoJsonPolygonDto {
  @IsIn(["Polygon"], { message: 'type harus "Polygon"' })
  type!: "Polygon";

  /**
   * [ring][titik][lng, lat]. Batas 1..50 ring & maks 10.000 titik/ring mencegah
   * payload raksasa membanjiri PostGIS (walk-around GPS bisa menghasilkan ribuan titik).
   */
  @IsArray()
  @ArrayMinSize(1, { message: "Poligon minimal punya satu ring" })
  @ArrayMaxSize(50)
  coordinates!: [number, number][][];
}

export class CreateLandPlotDto {
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  polygon!: GeoJsonPolygonDto;

  @IsIn(["GAMBAR_PETA", "WALK_AROUND"], { message: "captureMethod harus GAMBAR_PETA atau WALK_AROUND" })
  captureMethod!: "GAMBAR_PETA" | "WALK_AROUND";
}


/** POST /operator/legality/:tenantId/decide — FR-1.7. */
export class DecideLegalityDto {
  @IsBoolean()
  approve!: boolean;

  /** Wajib saat menolak; divalidasi di service supaya pesannya bisa menjelaskan alasannya. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
