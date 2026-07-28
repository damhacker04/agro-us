import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { TenantProfileResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-1.4 — dipanggil sekali setelah registrasi TENANT. */
  async createProfile(userId: string, companyName: string, zoneIds: string[], logoUrl?: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException({ code: "TENANT_EXISTS", message: "Profil tenant sudah dibuat." });
    }

    // Tolak zona yang tidak dikenal — kalau tidak, tenant "melayani" zona hantu
    // dan produknya tidak akan pernah muncul di katalog pembeli mana pun.
    const zones = await this.prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true } });
    if (zones.length !== zoneIds.length) {
      const known = new Set(zones.map((z) => z.id));
      throw new BadRequestException({
        code: "ZONE_UNKNOWN",
        message: `Zona tidak dikenal: ${zoneIds.filter((z) => !known.has(z)).join(", ")}`,
      });
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        userId,
        companyName,
        logoUrl: logoUrl ?? null,
        tenantZones: { create: zoneIds.map((zoneId) => ({ zoneId })) },
      },
    });
    return this.getProfile(userId, tenant.id);
  }

  async getProfile(userId: string, tenantId?: string): Promise<TenantProfileResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: tenantId ? { id: tenantId } : { userId },
      include: {
        tenantZones: { include: { zone: true } },
        _count: { select: { landPlots: true } },
      },
    });
    if (!tenant) {
      throw new NotFoundException({ code: "TENANT_NOT_FOUND", message: "Profil tenant belum dibuat." });
    }

    return {
      id: tenant.id,
      companyName: tenant.companyName,
      logoUrl: tenant.logoUrl,
      legalityStatus: tenant.legalityStatus,
      claimRatioCached: tenant.claimRatioCached ? Number(tenant.claimRatioCached) : null,
      shortfallRatioCached: tenant.shortfallRatioCached ? Number(tenant.shortfallRatioCached) : null,
      quotaMultiplier: Number(tenant.quotaMultiplier),
      zones: tenant.tenantZones.map(({ zone }) => ({
        id: zone.id,
        name: zone.name,
        city: zone.city,
        minOrderValue: zone.minOrderValue,
      })),
      landPlotCount: tenant._count.landPlots,
    };
  }

  async updateProfile(userId: string, data: { companyName?: string; logoUrl?: string; zoneIds?: string[] }) {
    const tenant = await this.requireTenant(userId);

    if (data.zoneIds) {
      const zones = await this.prisma.zone.findMany({ where: { id: { in: data.zoneIds } }, select: { id: true } });
      if (zones.length !== data.zoneIds.length) {
        throw new BadRequestException({ code: "ZONE_UNKNOWN", message: "Ada zona yang tidak dikenal." });
      }
      await this.prisma.tenantZone.deleteMany({ where: { tenantId: tenant.id } });
      await this.prisma.tenantZone.createMany({
        data: data.zoneIds.map((zoneId) => ({ tenantId: tenant.id, zoneId })),
      });
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
    });
    return this.getProfile(userId);
  }

  /** FR-1.7 — unggah NIB/KTP, masuk antrean tinjauan operator (UC-12). */
  async submitLegality(userId: string, documentUrl: string) {
    const tenant = await this.requireTenant(userId);
    if (tenant.legalityStatus === "APPROVED") {
      throw new ConflictException({ code: "LEGALITY_APPROVED", message: "Legalitas sudah disetujui." });
    }
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      // Kirim ulang setelah ditolak mengembalikan status ke PENDING.
      data: { legalityDocUrl: documentUrl, legalityStatus: "PENDING", reviewedById: null },
    });
    return this.getProfile(userId);
  }

  /** Dipakai controller lain untuk memetakan userId (dari JWT) → tenantId. */
  async requireTenant(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) {
      throw new NotFoundException({
        code: "TENANT_NOT_FOUND",
        message: "Profil tenant belum dibuat — selesaikan onboarding dulu.",
      });
    }
    return tenant;
  }

  /** FR-2.1 — daftar zona layanan, dipakai saat onboarding & pilih kota pembeli. */
  listZones() {
    return this.prisma.zone.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, minOrderValue: true },
    });
  }
}
