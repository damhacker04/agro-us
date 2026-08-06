import { Type } from "class-transformer";
import { IsDateString, IsLatitude, IsLongitude, IsString, Matches } from "class-validator";
import { COURIER_PIN_LENGTH } from "@agro-os/shared";
import { EVIDENCE_PHOTO_URL } from "../storage/storage.service";

export class VerifyCourierCodeDto {
  @IsString()
  @Matches(new RegExp(`^\\d{${COURIER_PIN_LENGTH}}$`), {
    message: `Kode Antar harus ${COURIER_PIN_LENGTH} digit angka`,
  })
  code!: string;
}

export class ReportPositionDto {
  @Type(() => Number)
  @IsLatitude({ message: "lat tidak valid" })
  lat!: number;

  @Type(() => Number)
  @IsLongitude({ message: "lng tidak valid" })
  lng!: number;

  /** Stempel waktu perangkat — dasar perhitungan kewajaran kecepatan (§6.3 Batasan 4). */
  @IsDateString({}, { message: "deviceTs harus ISO datetime" })
  deviceTs!: string;
}

export class ConfirmReceiptDto {
  /** Foto kondisi barang = Sinyal-2. Tanpa ini konfirmasi tidak membuktikan apa pun. */
  @Matches(EVIDENCE_PHOTO_URL, {
    message: "photoUrl harus URL http(s) atau path unggahan /uploads/...",
  })
  photoUrl!: string;
}
