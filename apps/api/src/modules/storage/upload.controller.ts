import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/auth.guard";
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
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @Post()
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
