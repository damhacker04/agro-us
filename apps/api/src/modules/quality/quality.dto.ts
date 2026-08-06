import { Type } from "class-transformer";
import { IsInt, IsNumber, IsPositive, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from "class-validator";
import { UPLOADED_FILE_URL } from "../storage/storage.service";

export class FileClaimDto {
  /** Klaim menunjuk satu item — tiap komoditas punya toleransi susut berbeda (FR-5.2). */
  @IsUUID("4")
  orderItemId!: string;

  /** Berat aktual hasil timbang, kg (FR-5.4). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: "Berat timbang harus lebih dari 0" })
  actualWeightKg!: number;

  /** Foto kondisi barang — wajib, tanpa ini klaim tidak membuktikan apa pun. */
  @Matches(UPLOADED_FILE_URL, {
    message: "photoUrl harus URL http(s) atau path unggahan /uploads/...",
  })
  photoUrl!: string;

  @IsString()
  @MinLength(10, { message: "Jelaskan keluhannya minimal 10 karakter" })
  @MaxLength(500)
  description!: string;
}

export class DecideClaimDto {
  /** 0 = klaim ditolak. Tidak boleh melebihi nilai klaim yang dihitung sistem. */
  @Type(() => Number)
  @IsInt({ message: "approvedValue harus bilangan bulat rupiah" })
  @Min(0)
  approvedValue!: number;

  @IsString()
  @MinLength(10, { message: "Alasan putusan minimal 10 karakter" })
  @MaxLength(500)
  note!: string;
}
