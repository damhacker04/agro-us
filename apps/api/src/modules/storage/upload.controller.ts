import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/auth.guard";
import { kunciObjekDariPath } from "./object-key";
import { StorageService, kenaliGambar, type StoredObject } from "./storage.service";

/** Sama dengan batas unggahan timeline — foto ponsel tanpa kompresi ulang. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Unggah foto umum (`POST /uploads`).
 *
 * Ada karena beberapa alur mewajibkan foto tapi menerimanya sebagai URL, bukan berkas:
 * konfirmasi terima pembeli (`ConfirmReceiptDto.photoUrl`) adalah Sinyal-2 yang melepas
 * escrow, dan tanpa endpoint ini tidak ada cara sah menghasilkan URL tersebut dari UI.
 *
 * Berbeda dari unggahan timeline, berkas di sini TIDAK masuk rantai hash mana pun —
 * kaitannya dibuat oleh endpoint yang memakai URL-nya. Maka satu-satunya jaminan yang
 * diberikan: berkasnya benar gambar, dan namanya tidak bisa dipilih pengunggah.
 *
 * Terbuka untuk semua peran yang sudah masuk (pembeli, Tenant, operator). Tidak dibuka
 * anonim: unggahan tanpa identitas berarti siapa pun bisa menitipkan berkas sembarang
 * di origin API.
 */
@Controller("uploads")
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Sajikan foto bukti lewat domain API sendiri.
   *
   * Ada karena domain publik R2 (`*.r2.dev`) diblokir di Indonesia: DNS-nya diarahkan ke
   * `aduankonten.id` dan yang menjawab adalah sertifikat `internetpositif.id`. Foto aman
   * tersimpan di bucket, tetapi tak seorang pun di pasar yang kita tuju bisa membukanya.
   *
   * TANPA otentikasi, dan itu disengaja: Verified Timeline harus bisa diperiksa siapa pun
   * tanpa mempercayai AgroUs (§6.1). Nama berkasnya digest SHA-256 isinya, jadi tidak bisa
   * ditebak. ⚠️ Foto PoD dan klaim mutu ikut tersaji dengan aturan yang sama — sekarang
   * keduanya melewati jalur ini, sehingga membedakannya kelak cukup di satu tempat.
   */
  @Get(":prefix/:berkas")
  async sajikan(
    @Param("prefix") prefix: string,
    @Param("berkas") berkas: string,
    @Res() res: Response,
  ) {
    const kunci = kunciObjekDariPath(prefix, berkas);
    if (!kunci) throw new NotFoundException("Berkas tidak ditemukan");

    const objek = await this.storage.baca(kunci);
    if (!objek) throw new NotFoundException("Berkas tidak ditemukan");

    // Header yang sama persis dengan yang dipasang penyajian statis di main.ts. Isi folder
    // ini berasal dari unggahan pengguna: `nosniff` menahan peramban menebak tipe isinya,
    // dan CSP sandbox memastikan berkas yang entah bagaimana lolos sebagai HTML tetap tidak
    // bisa menjalankan skrip atau membaca origin API.
    res.setHeader("Content-Type", objek.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Content-Disposition", "inline");
    // Isi objek = digest namanya, jadi berkas ini tidak akan pernah berubah.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (objek.bytes) res.setHeader("Content-Length", String(objek.bytes));

    objek.stream.on("error", () => res.destroy());
    objek.stream.pipe(res);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BYTES } }))
  async unggah(@UploadedFile() file?: Express.Multer.File): Promise<StoredObject> {
    if (!file) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "Tidak ada berkas. Kirim sebagai multipart dengan nama field 'file'.",
      });
    }

    // Diperiksa dari ISI berkas, bukan dari Content-Type kiriman: keduanya dikendalikan
    // klien, tapi header bisa diketik apa saja sementara byte awal tidak.
    if (!kenaliGambar(file.buffer)) {
      throw new BadRequestException({
        code: "NOT_AN_IMAGE",
        message: "Berkas harus berupa gambar JPEG, PNG, atau WebP.",
      });
    }

    return this.storage.put(file.buffer, file.originalname, file.mimetype);
  }
}
