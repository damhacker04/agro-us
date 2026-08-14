import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import * as QRCode from "qrcode";
import { COURIER_PIN_LENGTH, type GenerateQrResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Cetak QR box + Kode Antar (FR-3.6, FR-6.1).
 *
 * Kode Antar disimpan HASH, tidak pernah plaintext (FR-6.3) — sama alasannya dengan OTP:
 * ruang kodenya hanya 10^4, jadi kalau tabel bocor dan pepper diketahui, seluruh kode
 * bisa dihitung habis seketika.
 */
@Injectable()
export class QrService {
  private readonly log = new Logger(QrService.name);

  constructor(private readonly prisma: PrismaService) {}

  private pepper(): string {
    const p = process.env.COURIER_PIN_PEPPER ?? process.env.OTP_PEPPER;
    if (!p || p.length < 16) {
      throw new Error("COURIER_PIN_PEPPER (atau OTP_PEPPER) wajib diset, minimal 16 karakter.");
    }
    return p;
  }

  hashCode(shipmentId: string, code: string): string {
    return createHash("sha256").update(`${this.pepper()}|${shipmentId}|${code}`).digest("hex");
  }

  private baseUrl(): string {
    // URL yang dipindai kurir harus mengarah ke halaman PWA, bukan ke API.
    const dari = process.env["SCAN_BASE_URL"];
    if (dari) return dari.replace(/\/+$/, "");

    // Tanpa nilai ini, QR yang TERCETAK dan tertempel di box menunjuk localhost. Kurir
    // yang memindainya tidak sampai ke mana pun, dan kegagalannya baru ketahuan di
    // lapangan — setelah barangnya berangkat. Nilai bawaan diam-diam adalah pilihan yang
    // salah di sini: ia menghasilkan artefak fisik yang rusak, bukan sekadar respons yang
    // rusak, dan artefak fisik tidak bisa ditarik kembali dengan satu deploy.
    if (process.env["NODE_ENV"] === "production") {
      this.log.error("SCAN_BASE_URL belum diset — penerbitan QR ditolak.");
      throw new ServiceUnavailableException({
        code: "SCAN_BASE_URL_MISSING",
        message: "Alamat halaman pindai belum dikonfigurasi, sehingga QR tidak dapat diterbitkan.",
      });
    }
    this.log.warn("SCAN_BASE_URL belum diset — memakai localhost. Hanya untuk pengembangan.");
    return "http://localhost:3000/scan";
  }

  /**
   * Terbitkan QR untuk setiap box + satu Kode Antar per pengiriman.
   * Hanya boleh setelah batch dipanen (FR-3.6) — QR sebelum panen tidak ada gunanya
   * dan membuka celah token beredar sebelum barang ada.
   */
  async generate(tenantId: string, shipmentId: string): Promise<GenerateQrResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, items: { some: { batch: { product: { tenantId } } } } },
      include: {
        items: { include: { batch: { select: { id: true, productionStatus: true } } } },
        zone: { select: { name: true } },
      },
    });
    if (!shipment) throw new NotFoundException("Pengiriman tidak ditemukan");

    const notHarvested = shipment.items.filter((i) => i.batch.productionStatus !== "HARVESTED");
    if (notHarvested.length) {
      throw new ConflictException({
        code: "NOT_HARVESTED",
        message: "QR baru bisa dicetak setelah seluruh batch dalam pengiriman ini berstatus Panen.",
      });
    }

    const existing = await this.prisma.boxQrToken.findFirst({
      where: { orderItem: { shipmentId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: "QR_ALREADY_ISSUED",
        message: "QR sudah pernah dicetak. Gunakan GET untuk mencetak ulang lembarnya.",
      });
    }

    // Satu QR per BOX, bukan per pesanan — tiap box fisik ditempeli QR unik (FR-3.6).
    const code = randomInt(0, 10 ** COURIER_PIN_LENGTH)
      .toString()
      .padStart(COURIER_PIN_LENGTH, "0");

    await this.prisma.$transaction(async (tx) => {
      for (const item of shipment.items) {
        for (let i = 0; i < item.qtyBox; i++) {
          await tx.boxQrToken.create({
            data: {
              orderItemId: item.id,
              // 32 byte acak: tidak bisa ditebak, dan tidak membocorkan urutan/jumlah box.
              token: randomBytes(24).toString("base64url"),
              printedAt: new Date(),
            },
          });
        }
      }
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { courierPinHash: this.hashCode(shipmentId, code), pinAttempts: 0 },
      });
    });

    return { ...(await this.list(tenantId, shipmentId)), courierCode: code };
  }

  /** Lembar cetak. Kode Antar TIDAK ikut di sini — hanya muncul saat diterbitkan/diterbitkan ulang. */
  async list(tenantId: string, shipmentId: string): Promise<Omit<GenerateQrResponse, "courierCode">> {
    const tokens = await this.prisma.boxQrToken.findMany({
      where: { orderItem: { shipmentId, batch: { product: { tenantId } } } },
      orderBy: { printedAt: "asc" },
    });
    if (!tokens.length) {
      throw new NotFoundException({ code: "QR_NOT_ISSUED", message: "QR belum diterbitkan untuk pengiriman ini." });
    }

    const boxes = await Promise.all(
      tokens.map(async (t) => {
        const scanUrl = `${this.baseUrl()}/${t.token}`;
        return {
          tokenId: t.id,
          scanUrl,
          // Margin kecil & koreksi galat M: QR akan dicetak lalu ditempel di box yang
          // mungkin kotor/tergores — masih terbaca meski sebagian rusak.
          qrDataUrl: await QRCode.toDataURL(scanUrl, { errorCorrectionLevel: "M", margin: 1, width: 256 }),
          consumedAt: t.consumedAt?.toISOString() ?? null,
        };
      }),
    );
    return { shipmentId, boxes };
  }

  /**
   * Terbitkan ulang Kode Antar setelah token terkunci karena 5x salah (FR-6.3).
   * Token QR yang sudah tercetak tetap berlaku — yang diganti hanya kodenya,
   * jadi Tenant tidak perlu mencetak & menempel ulang seluruh box.
   */
  async reissueCode(tenantId: string, shipmentId: string): Promise<{ courierCode: string }> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, items: { some: { batch: { product: { tenantId } } } } },
      select: { id: true, status: true, courierPinHash: true },
    });
    if (!shipment) throw new NotFoundException("Pengiriman tidak ditemukan");
    if (!shipment.courierPinHash) {
      throw new BadRequestException({ code: "QR_NOT_ISSUED", message: "Terbitkan QR dulu sebelum meminta kode baru." });
    }
    if (shipment.status !== "PANEN" && shipment.status !== "MENUNGGU_PANEN") {
      throw new ConflictException({
        code: "ALREADY_DISPATCHED",
        message: "Pengiriman sudah berjalan — kode tidak bisa diganti.",
      });
    }

    const code = randomInt(0, 10 ** COURIER_PIN_LENGTH)
      .toString()
      .padStart(COURIER_PIN_LENGTH, "0");
    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { courierPinHash: this.hashCode(shipmentId, code), pinAttempts: 0 },
    });
    return { courierCode: code };
  }
}
