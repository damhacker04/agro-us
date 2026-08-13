import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Readable } from "node:stream";
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
/**
 * @deprecated Dipakai `IsUrlUnggahan` di `uploaded-url.validator.ts`.
 *
 * Cabang `https?://\S+` menerima URL absolut APA PUN, artinya foto bukti boleh menunjuk
 * server milik pengirimnya sendiri — isinya bisa berubah setelah diperiksa, atau lenyap
 * tepat saat sengketa muncul. Dibiarkan berdiri hanya sebagai penanda; jangan dipakai lagi.
 */
export const UPLOADED_FILE_URL = /^(https?:\/\/\S+|\/uploads\/\S+\.(jpe?g|png|webp))$/i;

/**
 * Port penyimpanan objek untuk foto bukti (PRD §6.4).
 * Implementasi produksi (S3/R2/GCS) tinggal menggantikan binding di modulnya.
 */
/** Isi objek yang dibaca kembali, siap dialirkan ke respons. */
export interface BacaObjek {
  stream: Readable;
  contentType: string;
  bytes?: number;
}

export abstract class StorageService {
  abstract put(buffer: Buffer, filename: string, mime: string): Promise<StoredObject>;

  /**
   * Baca kembali satu objek untuk disajikan lewat API sendiri.
   *
   * Ada karena domain publik R2 (`*.r2.dev`) DIBLOKIR di Indonesia — DNS-nya diarahkan ke
   * `aduankonten.id` dan yang menjawab adalah sertifikat `internetpositif.id`, bukan
   * Cloudflare. Foto tersimpan aman di bucket, tetapi tidak ada pengguna Indonesia yang
   * bisa membukanya: bukan Tenant, bukan pembeli, bukan juri. Justru pasar yang dituju.
   *
   * Jadi objeknya disajikan lewat domain API yang jelas terjangkau. Penyimpanannya tetap
   * tahan-redeploy; yang berpindah hanya jalur bacanya.
   *
   * `null` berarti objeknya memang tidak ada — dibedakan dari galat, supaya pemanggil
   * bisa menjawab 404 alih-alih 500.
   */
  abstract baca(key: string): Promise<BacaObjek | null>;

  /**
   * Penyimpanan mana yang sedang aktif — dibaca Operator lewat `GET /operator/penyimpanan`.
   *
   * Ada karena perbedaan antara "sudah pindah ke S3" dan "masih disk ephemeral" hanya
   * terlihat di log boot, yang lewat begitu saja. Selama tidak terlihat dari luar, tidak
   * ada yang tahu bahwa satu redeploy diam-diam mengembalikannya ke disk lokal — dan yang
   * hilang bukan cache, melainkan foto bukti.
   */
  abstract info(): { jenis: "S3" | "DISK_LOKAL"; ephemeral: boolean; keterangan: string };
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

  async baca(key: string): Promise<BacaObjek | null> {
    const path = join(this.root, key.replace(/^uploads\//, ""));
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      return {
        stream: createReadStream(path),
        contentType: mimeDariEkstensi(path),
        bytes: info.size,
      };
    } catch {
      return null;
    }
  }

  info() {
    return {
      jenis: "DISK_LOKAL" as const,
      ephemeral: true,
      keterangan:
        "Foto disimpan di disk kontainer dan HILANG setiap redeploy. Hanya untuk pengembangan.",
    };
  }
}

/**
 * Content-Type dari ekstensi yang KITA sendiri tentukan saat menyimpan.
 *
 * Aman justru karena ekstensinya bukan berasal dari nama berkas kiriman klien — ia
 * diturunkan dari byte awal berkas oleh `kenaliGambar` (lihat FORMAT di atas).
 */
function mimeDariEkstensi(path: string): string {
  const cocok = FORMAT.find((f) => path.toLowerCase().endsWith(f.ext));
  return cocok?.mime ?? "application/octet-stream";
}
