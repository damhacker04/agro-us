import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { sha256 } from "../timeline/hash.util";

export interface StoredObject {
  url: string;
  sha256: string;
  bytes: number;
}

/**
 * Bentuk URL berkas unggahan yang sah.
 *
 * Menerima URL absolut (bila kelak dipindah ke S3/R2) DAN path relatif `/uploads/...`
 * yang dikembalikan `POST /uploads` hari ini. Divalidasi dengan pola ini, bukan dengan
 * `@IsUrl()`: validator itu mewajibkan host ber-TLD sehingga menolak persis keluaran
 * endpoint unggah kita sendiri — DTO yang memakainya jadi mustahil dipenuhi dari UI.
 *
 * Dipakai bersama oleh DTO PoD, klaim mutu, legalitas, dan logo Tenant supaya semuanya
 * tidak pernah lagi berbeda pendapat tentang apa itu "URL berkas yang sah".
 */
export const UPLOADED_FILE_URL = /^(https?:\/\/\S+|\/uploads\/\S+\.(jpe?g|png|webp))$/i;

/**
 * Port penyimpanan objek untuk foto bukti (PRD §6.4).
 * Implementasi produksi (S3/R2/GCS) tinggal menggantikan binding di modulnya.
 */
export abstract class StorageService {
  abstract put(buffer: Buffer, filename: string, mime: string): Promise<StoredObject>;
}

/**
 * Format gambar yang boleh disimpan, beserta tanda tangan byte awalnya.
 *
 * Ekstensi diambil dari SINI, bukan dari nama berkas kiriman klien. Berkas di
 * `uploads/` disajikan statis oleh Express, yang menentukan Content-Type dari
 * ekstensinya — jadi nama kiriman `sesuatu.html` akan tersaji sebagai text/html
 * dari origin API dan menjadi XSS tersimpan. Nama berkas klien tidak pernah
 * dipercaya untuk apa pun selain catatan.
 */
const FORMAT = [
  { ext: ".jpg", mime: "image/jpeg", cocok: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: ".png",
    mime: "image/png",
    cocok: (b: Buffer) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: ".webp",
    mime: "image/webp",
    cocok: (b: Buffer) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
] as const;

/**
 * Kenali format dari ISI berkas, bukan dari header Content-Type kiriman.
 * Keduanya sama-sama dikendalikan klien, tapi isi berkas jauh lebih sulit dipalsukan
 * sambil tetap menjadi gambar yang bisa ditampilkan.
 *
 * Mengembalikan null bila bukan salah satu format yang diizinkan.
 */
export function kenaliGambar(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;
  const f = FORMAT.find((x) => x.cocok(buffer));
  return f ? { ext: f.ext, mime: f.mime } : null;
}

/**
 * ⚠️ DEV SAJA — simpan ke disk lokal `apps/api/uploads/`.
 *
 * JANGAN dipakai di produksi: filesystem container Railway/Render bersifat **ephemeral**,
 * seluruh foto bukti hilang setiap redeploy. Padahal foto adalah bagian dari rantai bukti
 * yang di-hash (§5.4.1) — kehilangannya membuat Verified Timeline tidak bisa diaudit.
 *
 * Sebelum produksi: ganti binding di `StorageModule` ke implementasi object storage
 * (S3 / Cloudflare R2 / GCS). Antarmuka `StorageService` sengaja dibuat supaya penggantian
 * ini cukup satu baris dan tidak menyentuh logika timeline.
 */
@Injectable()
export class LocalDiskStorageService extends StorageService {
  private readonly logger = new Logger("Storage(local)");
  private readonly root = join(process.cwd(), "uploads");

  async put(buffer: Buffer, filename: string, mime: string): Promise<StoredObject> {
    const digest = sha256(buffer);
    // Ekstensi ditentukan isi berkas; kalau tidak dikenali, disimpan tanpa ekstensi
    // sehingga tersaji sebagai application/octet-stream — diunduh, bukan dijalankan.
    const dikenali = kenaliGambar(buffer);
    if (!dikenali) {
      this.logger.warn(
        `berkas "${filename}" (Content-Type ${mime}) bukan JPEG/PNG/WebP — disimpan tanpa ekstensi.`,
      );
    }
    const ext = dikenali?.ext ?? "";
    const dir = join(this.root, digest.slice(0, 2));
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${digest}${ext}`);
    await writeFile(path, buffer);
    this.logger.log(`simpan ${digest.slice(0, 12)}… (${buffer.length} B)`);
    return { url: `/uploads/${digest.slice(0, 2)}/${digest}${ext}`, sha256: digest, bytes: buffer.length };
  }
}
