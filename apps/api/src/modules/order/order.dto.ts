import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CartLineDto {
  @IsUUID("4")
  batchId!: string;

  @IsInt()
  @IsPositive({ message: "qtyBox harus lebih dari 0" })
  qtyBox!: number;
}

export class GpsCoordinateDto {
  @IsLatitude({ message: "lat harus koordinat lintang yang sah" })
  lat!: number;

  @IsLongitude({ message: "lng harus koordinat bujur yang sah" })
  lng!: number;
}

export class DeliveryDetailDto {
  @IsString() @MinLength(2) @MaxLength(120)
  recipientName!: string;

  @IsString()
  @Matches(/^(\+62|62|0)8\d{7,11}$/, { message: "Nomor telepon penerima tidak valid" })
  phone!: string;

  @ValidateNested()
  @Type(() => GpsCoordinateDto)
  point!: GpsCoordinateDto;

  @IsOptional() @IsString() @MaxLength(200)
  landmark?: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, { message: 'Jam terima harus format "08:00-16:00"' })
  receivingHours!: string;
}

export class PreviewOrderDto {
  @IsArray()
  @ArrayNotEmpty({ message: "Keranjang kosong" })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  lines!: CartLineDto[];
}

export class CheckoutDto extends PreviewOrderDto {
  @ValidateNested()
  @Type(() => DeliveryDetailDto)
  delivery!: DeliveryDetailDto;

  @IsIn(["QRIS", "VA", "EWALLET"], { message: "paymentMethod harus QRIS, VA, atau EWALLET" })
  paymentMethod!: "QRIS" | "VA" | "EWALLET";

  @IsOptional()
  @IsBoolean()
  includeTraceabilityReport?: boolean;
}

/** Callback gateway pembayaran (Midtrans/Xendit). Untuk MVP dipanggil manual/simulasi. */
export class PaymentWebhookDto {
  @IsString()
  invoiceRef!: string;

  @IsIn(["PAID", "FAILED"], { message: "status harus PAID atau FAILED" })
  status!: "PAID" | "FAILED";
}
