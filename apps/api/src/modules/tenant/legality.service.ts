import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { DecideLegalityBody, LegalityQueueItem } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";

/**
 * Peninjauan legalitas Tenant oleh operator (FR-1.7, OP-01/OP-02).
 *
 * Sebelumnya hanya ada sisi Tenant: `PUT /tenant/legality` untuk MENGUNGGAH dokumen.
 * Tidak ada jalan bagi operator menyetujui maupun menolaknya, sehingga setiap Tenant
 * baru terjebak selamanya di status PENDING kecuali diubah manual lewat SQL.
 */
@Injectable()
export class LegalityService {
  private readonly log = new Logger(LegalityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notif: NotificationService,
  ) {}

  async queue(status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"): Promise<LegalityQueueItem[]> {
    const rows = await this.prisma.tenant.findMany({
      where: { legalityStatus: status },
      select: {
        id: true,
        companyName: true,
        legalityStatus: true,
        legalityDocUrl: true,
        user: { select: { createdAt: true } },
        tenantZones: { select: { zone: { select: { name: true } } } },
        _count: { select: { landPlots: true } },
      },
      orderBy: { companyName: "asc" },
    });

    return rows.map((t) => ({
      tenantId: t.id,
      companyName: t.companyName,
      legalityStatus: t.legalityStatus,
      legalityDocUrl: t.legalityDocUrl,
      submittedAt: t.user.createdAt.toISOString(),
      zoneNames: t.tenantZones.map((z) => z.zone.name),
      landPlotCount: t._count.landPlots,
    }));
  }

  async decide(operatorUserId: string, tenantId: string, dto: DecideLegalityBody) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true, legalityStatus: true, legalityDocUrl: true, userId: true },
    });
    if (!tenant) throw new NotFoundException("Tenant tidak ditemukan");

    if (tenant.legalityStatus !== "PENDING") {
      throw new BadRequestException({
        code: "ALREADY_DECIDED",
        message: `Legalitas Tenant ini sudah diputus (${tenant.legalityStatus}).`,
      });
    }
    // Menyetujui tanpa dokumen berarti badge legalitas tidak berdasar apa pun —
    // dan badge itulah yang dilihat pembeli saat memutuskan membayar di muka.
    if (dto.approve && !tenant.legalityDocUrl) {
      throw new BadRequestException({
        code: "NO_DOCUMENT",
        message: "Tenant belum mengunggah dokumen legalitas. Tidak bisa disetujui.",
      });
    }
    if (!dto.approve && !dto.note?.trim()) {
      throw new BadRequestException({
        code: "NOTE_REQUIRED",
        message: "Alasan penolakan wajib diisi — Tenant perlu tahu apa yang harus diperbaiki.",
      });
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { legalityStatus: dto.approve ? "APPROVED" : "REJECTED", reviewedById: operatorUserId },
    });

    void this.notif.kirim(
      tenant.userId,
      "LEGALITAS_DIPUTUS",
      dto.approve ? "Legalitas Anda disetujui" : "Legalitas Anda ditolak",
      dto.approve
        ? "Akun Anda sudah terverifikasi. Anda bisa mulai membuka kuota Pre-Order."
        : `Dokumen legalitas ditolak. Catatan operator: ${dto.note}`,
    );

    this.log.log(`Legalitas ${tenant.companyName} → ${dto.approve ? "APPROVED" : "REJECTED"}`);
    return { tenantId, legalityStatus: dto.approve ? "APPROVED" : "REJECTED" };
  }
}
