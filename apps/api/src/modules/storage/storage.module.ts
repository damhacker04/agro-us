import { Logger, Module } from "@nestjs/common";
import { LocalDiskStorageService, StorageService } from "./storage.service";
import { S3StorageService } from "./s3-storage.service";
import { UploadController } from "./upload.controller";

/** Variabel yang WAJIB lengkap sebelum jalur S3 boleh dipakai. */
const WAJIB_S3 = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

/**
 * Memilih implementasi penyimpanan berdasarkan kelengkapan env.
 *
 * Dijalankan sebagai `useFactory`, BUKAN dievaluasi langsung di argumen `@Module`.
 * Argumen dekorator dievaluasi saat modul diimpor — dan impor `StorageModule` di
 * `app.module.ts` terjadi SEBELUM `ConfigModule.forRoot()` sempat memuat `.env`.
 * Kalau pemilihannya di situ, `process.env` masih kosong secara lokal sehingga jalur
 * S3 tidak pernah terpilih, sementara di Render (env dari platform) justru terpilih:
 * dua lingkungan berperilaku berbeda tanpa ada yang menyadarinya.
 */
function pilihPenyimpanan(): StorageService {
  const log = new Logger("StorageModule");
  const terisi = WAJIB_S3.filter((k) => process.env[k]);

  if (terisi.length === WAJIB_S3.length) return new S3StorageService();

  // Konfigurasi separuh jalan MENGGAGALKAN boot, bukan diam-diam mundur ke disk lokal:
  // mundur diam-diam berarti foto bukti hilang di redeploy berikutnya tanpa seorang pun
  // tahu sampai auditnya gagal.
  if (terisi.length > 0) {
    const kurang = WAJIB_S3.filter((k) => !process.env[k]);
    throw new Error(
      `Konfigurasi S3 tidak lengkap — sudah ada ${terisi.join(", ")} tetapi ${kurang.join(", ")} belum disetel. ` +
        "Lengkapi, atau kosongkan semuanya untuk sengaja memakai disk lokal (hanya untuk pengembangan).",
    );
  }

  log.warn(
    "S3 tidak dikonfigurasi — memakai disk lokal. JANGAN dipakai di produksi: " +
      "filesystem kontainer ephemeral, foto bukti hilang tiap redeploy.",
  );
  return new LocalDiskStorageService();
}

/**
 * Penyimpanan objek dipakai lebih dari satu modul: timeline Tenant meng-hash fotonya ke
 * dalam rantai bukti, pembeli mengunggah foto kondisi barang saat konfirmasi terima, dan
 * klaim mutu melampirkan foto barangnya. Bindingnya dikumpulkan di sini supaya penggantian
 * implementasi berlaku untuk semua pemakainya sekaligus.
 *
 * Pemilihannya berdasarkan ADA-tidaknya kredensial, bukan `NODE_ENV`: label lingkungan
 * tidak menentukan apakah S3 bisa dipakai, dan memakai NODE_ENV berarti staging yang lupa
 * diberi kredensial akan diam-diam menulis ke disk ephemeral.
 */
@Module({
  controllers: [UploadController],
  providers: [{ provide: StorageService, useFactory: pilihPenyimpanan }],
  exports: [StorageService],
})
export class StorageModule {}
