import { Type } from "class-transformer";
import { IsDateString, IsLatitude, IsLongitude, IsString, Matches } from "class-validator";
import { COURIER_PIN_LENGTH } from "@agro-os/shared";

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

/**
 * Menerima dua bentuk:
 *   - URL http(s) penuh, termasuk host tanpa TLD seperti `http://localhost:3001/...`
 *   - path relatif `/uploads/...` — bentuk yang DIKEMBALIKAN StorageService sendiri
 *
 * `@IsUrl` bawaan menolak keduanya (localhost tidak punya TLD, path relatif bukan URL),
 * sehingga alur paling wajar — unggah foto, terima URL-nya, kirim balik — selalu gagal
 * validasi di lingkungan lokal.
 */
const POD_PHOTO = /^(https?:\/\/\S+|\/uploads\/\S+\.(jpe?g|png|webp))$/i;

export class ConfirmReceiptDto {
  /** Foto kondisi barang = Sinyal-2. Tanpa ini konfirmasi tidak membuktikan apa pun. */
  @Matches(POD_PHOTO, {
    message: "photoUrl harus URL http(s) atau path unggahan /uploads/...",
  })
  photoUrl!: string;
}
