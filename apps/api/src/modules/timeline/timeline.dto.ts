import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const ACTIVITIES = [
  "PENYIAPAN_LAHAN",
  "PENANAMAN",
  "PEMUPUKAN",
  "PENGENDALIAN_HAMA",
  "PENGAIRAN",
  "PANEN",
  "GAGAL_PANEN",
] as const;

/**
 * Body dikirim sebagai multipart/form-data bersama file foto, sehingga semua
 * angka/boolean tiba sebagai string → butuh @Type untuk konversi.
 */
export class CreateNodeDto {
  @IsIn(ACTIVITIES, { message: `activityType harus salah satu dari: ${ACTIVITIES.join(", ")}` })
  activityType!: (typeof ACTIVITIES)[number];

  @IsString()
  @MinLength(3, { message: "Deskripsi terlalu pendek" })
  @MaxLength(280, { message: "Deskripsi maksimal 280 karakter" })
  description!: string;

  @Type(() => Number)
  @IsLatitude({ message: "lat tidak valid" })
  lat!: number;

  @Type(() => Number)
  @IsLongitude({ message: "lng tidak valid" })
  lng!: number;

  /** Stempel waktu perangkat — direkam otomatis oleh aplikasi, bukan diketik pengguna (§5.4.1). */
  @IsDateString({}, { message: "deviceTs harus ISO datetime" })
  deviceTs!: string;

  @IsIn(["IN_APP_CAMERA", "GALLERY"], { message: "captureSource harus IN_APP_CAMERA atau GALLERY" })
  captureSource!: "IN_APP_CAMERA" | "GALLERY";

  /** NOTA_INPUT hanya bermakna untuk PEMUPUKAN / PENGENDALIAN_HAMA (FR-4.7). */
  @IsOptional()
  @IsIn(["KEGIATAN", "NOTA_INPUT"])
  photoType?: "KEGIATAN" | "NOTA_INPUT";

  /** Wajib bila GPS di luar poligon — akan ditampilkan ke pembeli (FR-4.3). */
  @IsOptional()
  @IsString()
  @MinLength(10, { message: "Alasan minimal 10 karakter" })
  @MaxLength(280)
  outsidePolygonReason?: string;

  /** Node koreksi menunjuk node lama; node lama tetap tampil (FR-4.2). */
  @IsOptional()
  @IsUUID("4")
  ralatOfId?: string;

  /**
   * Hanya untuk PANEN — jumlah box hasil panen aktual, TOTAL dari lahan (FR-7.8).
   *
   * Ini angka panen seluruhnya, bukan "yang disisihkan untuk pesanan". Pita kewajaran
   * membandingkannya dengan kapasitas lahan, jadi kalau yang dikirim hanya porsi yang
   * terjual, Tenant yang jujur pun akan tampak kekurangan hasil. Yang masuk ke pesanan
   * adalah min(angka ini, kuota terjual) — dihitung server, bukan di sini.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fulfilledBox?: number;

  /**
   * Penilaian kewajaran yang sedang dikonfirmasi (FR-4.10) — wajib pada PANEN.
   *
   * Mengikat konfirmasi ke ANGKA YANG DINILAI. Tanpa ini, Tenant bisa meminta pratinjau
   * dengan angka aman lalu mengonfirmasi angka lain, dan seluruh layar peringatan
   * TN-19b menjadi hiasan.
   */
  @IsOptional()
  @IsUUID()
  assessmentId?: string;
}

/**
 * Langkah 1 alur panen — `POST /tenant/batches/:id/harvest` (sequence 04b baris 39).
 *
 * Hanya satu angka: TOTAL box hasil panen dari lahan ini. Tanpa foto, tanpa GPS —
 * langkah ini belum menulis apa pun ke timeline, jadi memintanya di sini berarti
 * membuat Tenant mengumpulkan bukti untuk sesuatu yang mungkin ia batalkan.
 */
export class DeclareHarvestDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualBox!: number;
}
