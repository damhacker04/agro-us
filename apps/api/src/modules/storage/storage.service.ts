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
 * Port penyimpanan objek untuk foto bukti (PRD §6.4).
 * Implementasi produksi (S3/R2/GCS) tinggal menggantikan binding di modulnya.
 */
export abstract class StorageService {
  abstract put(buffer: Buffer, filename: string, mime: string): Promise<StoredObject>;
}

/**
 * ⚠️ DEV SAJA — simpan ke disk lokal `apps/api/uploads/`.
 *
 * JANGAN dipakai di produksi: filesystem container Railway/Render bersifat **ephemeral**,
 * seluruh foto bukti hilang setiap redeploy. Padahal foto adalah bagian dari rantai bukti
 * yang di-hash (§5.4.1) — kehilangannya membuat Verified Timeline tidak bisa diaudit.
 *
 * Sebelum produksi: ganti binding di `TimelineModule` ke implementasi object storage
 * (S3 / Cloudflare R2 / GCS). Antarmuka `StorageService` sengaja dibuat supaya penggantian
 * ini cukup satu baris dan tidak menyentuh logika timeline.
 */
@Injectable()
export class LocalDiskStorageService extends StorageService {
  private readonly logger = new Logger("Storage(local)");
  private readonly root = join(process.cwd(), "uploads");

  async put(buffer: Buffer, filename: string, _mime: string): Promise<StoredObject> {
    const digest = sha256(buffer);
    // Nama file = digest → dedup otomatis dan nama tidak bisa ditebak.
    const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
    const dir = join(this.root, digest.slice(0, 2));
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${digest}${ext}`);
    await writeFile(path, buffer);
    this.logger.log(`simpan ${digest.slice(0, 12)}… (${buffer.length} B)`);
    return { url: `/uploads/${digest.slice(0, 2)}/${digest}${ext}`, sha256: digest, bytes: buffer.length };
  }
}
