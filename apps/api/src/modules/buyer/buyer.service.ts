import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { BuyerProfileResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BuyerService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, companyName: string, activeZoneId: string) {
    const existing = await this.prisma.buyer.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException({ code: "BUYER_EXISTS", message: "Profil pembeli sudah dibuat." });
    }
    await this.assertZone(activeZoneId);
    await this.prisma.buyer.create({ data: { userId, companyName, activeZoneId } });
    return this.getProfile(userId);
  }

  async getProfile(userId: string): Promise<BuyerProfileResponse> {
    const buyer = await this.prisma.buyer.findUnique({ where: { userId }, include: { activeZone: true } });
    if (!buyer) {
      throw new NotFoundException({ code: "BUYER_NOT_FOUND", message: "Profil pembeli belum dibuat." });
    }
    return {
      id: buyer.id,
      companyName: buyer.companyName,
      activeZone: buyer.activeZone
        ? {
            id: buyer.activeZone.id,
            name: buyer.activeZone.name,
            city: buyer.activeZone.city,
            minOrderValue: buyer.activeZone.minOrderValue,
          }
        : null,
    };
  }

  /** Ganti kota layanan (FR-2.1) — memengaruhi katalog yang tampil. */
  async updateProfile(userId: string, data: { companyName?: string; activeZoneId?: string }) {
    const buyer = await this.requireBuyer(userId);
    if (data.activeZoneId) await this.assertZone(data.activeZoneId);
    await this.prisma.buyer.update({
      where: { id: buyer.id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.activeZoneId !== undefined && { activeZoneId: data.activeZoneId }),
      },
    });
    return this.getProfile(userId);
  }

  async requireBuyer(userId: string) {
    const buyer = await this.prisma.buyer.findUnique({ where: { userId } });
    if (!buyer) {
      throw new NotFoundException({
        code: "BUYER_NOT_FOUND",
        message: "Profil pembeli belum dibuat — lengkapi dulu sebelum memesan.",
      });
    }
    return buyer;
  }

  private async assertZone(zoneId: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId }, select: { id: true } });
    if (!zone) throw new BadRequestException({ code: "ZONE_UNKNOWN", message: "Zona tidak dikenal." });
  }
}
