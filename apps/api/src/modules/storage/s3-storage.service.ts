import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { sha256 } from "../timeline/hash.util";
import { StorageService, kenaliGambar, type StoredObject } from "./storage.service";

/**
 * Penyimpanan objek S3-kompatibel — Cloudflare R2, AWS S3, MinIO, atau Backblaze B2.
 *
 * Menggantikan penyimpanan disk lokal yang TIDAK boleh dipakai di produksi: filesystem
 * kontainer Render/Railway bersifat ephemeral, sehingga seluruh foto bukti hilang setiap
 * redeploy. Foto adalah bagian dari rantai bukti yang ikut di-hash (§5.4.1) — kehilangannya
 * membuat Verified Timeline tidak lagi bisa diaudit, yaitu klaim inti produk ini.
 *
 * R2 dipilih sebagai acuan karena tidak menagih biaya keluar data (egress), sedangkan foto
 * timeline memang dirancang untuk dilihat publik tanpa login (§6.1).
 */
@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger("Storage(s3)");
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    super();
    const endpoint = process.env["S3_ENDPOINT"];
    this.bucket = process.env["S3_BUCKET"]!;
    // URL publik dipisah dari endpoint API-nya: pada R2, unggahan lewat
    // <account>.r2.cloudflarestorage.com sedangkan pembacaan lewat domain publik
    // bucket. Menyamakan keduanya membuat setiap foto memerlukan kredensial untuk
    // dibaca — padahal timeline memang publik by design.
    this.publicBaseUrl = (process.env["S3_PUBLIC_URL"] ?? "").replace(/\/+$/, "");

    this.client = new S3Client({
      region: process.env["S3_REGION"] ?? "auto",
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: process.env["S3_ACCESS_KEY_ID"]!,
        secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"]!,
      },
    });
    this.logger.log(`bucket ${this.bucket}${endpoint ? ` @ ${endpoint}` : ""}`);
  }

  /**
   * Kunci objek memakai skema yang SAMA dengan penyimpanan lokal
   * (`uploads/<2 huruf pertama digest>/<digest><ext>`).
   *
   * Bukan kebetulan: baris basis data yang sudah menyimpan URL relatif tetap menunjuk
   * berkas yang sama begitu isinya dipindahkan, dan berkas identik yang diunggah dua kali
   * tetap menempati satu objek — dedup gratis, tanpa tabel indeks tersendiri.
   */
  async put(buffer: Buffer, filename: string, mime: string): Promise<StoredObject> {
    const digest = sha256(buffer);
    const dikenali = kenaliGambar(buffer);
    if (!dikenali) {
      this.logger.warn(
        `berkas "${filename}" (Content-Type ${mime}) bukan JPEG/PNG/WebP — disimpan tanpa ekstensi.`,
      );
    }
    const key = `uploads/${digest.slice(0, 2)}/${digest}${dikenali?.ext ?? ""}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        // ContentType diambil dari hasil pengenalan ISI berkas, bukan dari header
        // kiriman klien — sama alasannya seperti pada penyimpanan lokal: header bisa
        // diketik apa saja, dan objek yang tersaji sebagai text/html adalah XSS.
        ContentType: dikenali?.mime ?? "application/octet-stream",
        ContentDisposition: "inline",
        // Isi objek = digest namanya, jadi objek ini tidak akan pernah berubah.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    this.logger.log(`simpan ${digest.slice(0, 12)}… (${buffer.length} B)`);
    return {
      url: this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : `/${key}`,
      sha256: digest,
      bytes: buffer.length,
    };
  }
}
