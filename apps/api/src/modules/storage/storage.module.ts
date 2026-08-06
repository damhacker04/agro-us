import { Module } from "@nestjs/common";
import { LocalDiskStorageService, StorageService } from "./storage.service";
import { UploadController } from "./upload.controller";

/**
 * Penyimpanan objek dipakai lebih dari satu modul: timeline Tenant meng-hash fotonya
 * ke dalam rantai bukti, sedangkan pembeli mengunggah foto kondisi barang saat
 * konfirmasi terima. Bindingnya dikumpulkan di sini supaya penggantian ke S3/R2
 * cukup satu baris dan berlaku untuk semua pemakainya sekaligus.
 */
@Module({
  controllers: [UploadController],
  providers: [
    // ⚠️ Ganti ke implementasi object storage (S3/R2/GCS) sebelum produksi —
    // disk container bersifat ephemeral, lihat storage.service.ts.
    { provide: StorageService, useClass: LocalDiskStorageService },
  ],
  exports: [StorageService],
})
export class StorageModule {}
