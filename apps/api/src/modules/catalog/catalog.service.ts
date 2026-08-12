import { Injectable, NotFoundException } from "@nestjs/common";
import { toVerificationBadge, type CatalogItem } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DemandSignalService } from "../intelligence/demand-signal.service";
import type { CatalogQueryDto } from "./catalog.dto";
import type { VerificationStatus } from "../../../generated/prisma/enums";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signals: DemandSignalService,
  ) {}

  /** Katalog terpadu lintas-Tenant dalam satu zona (FR-2.1, FR-2.2). */
  async browse(q: CatalogQueryDto): Promise<CatalogItem[]> {
    const zone = await this.prisma.zone.findUnique({ where: { id: q.zoneId }, select: { id: true } });
    if (!zone) throw new NotFoundException({ code: "ZONE_UNKNOWN", message: "Zona tidak dikenal." });

    const batches = await this.prisma.batch.findMany({
      where: {
        // Masih dijual: belum panen dan kuota belum habis.
        productionStatus: { in: ["PLANNING", "GROWING"] },
        product: {
          ...(q.commodityId && { commodityId: q.commodityId }),
          ...(q.grade && { grade: q.grade }),
          ...(q.search && { name: { contains: q.search, mode: "insensitive" } }),
          // Hanya Tenant yang melayani zona pilihan pembeli.
          tenant: { tenantZones: { some: { zoneId: q.zoneId } } },
        },
        ...(q.verifiedOnly && { verificationStatus: "TERVERIFIKASI" }),
      },
      include: {
        product: {
          include: {
            commodity: { select: { id: true, name: true, category: true } },
            tenant: { select: { id: true, companyName: true, logoUrl: true } },
          },
        },
      },
      orderBy: { claimedHarvestDate: "asc" },
    });

    const tersedia = batches.filter((b) => b.quotaBoxTotal - b.quotaBoxSold > 0); // kuota habis → tidak tampil

    // Pencarian yang nihil adalah permintaan yang gagal dilayani — satu-satunya jejak
    // bahwa pembeli menginginkan komoditas ini di zona ini (FR-8.1). Tidak di-await:
    // pencatatan analitik tidak boleh memperlambat atau menggagalkan katalog.
    if (!tersedia.length) {
      void this.signals.recordSearchMiss(q.zoneId, q.commodityId, q.search);
    }

    return tersedia
      .map((b) => ({
        batchId: b.id,
        productId: b.product.id,
        productName: b.product.name,
        grade: b.product.grade,
        // Harga TERKUNCI batch, bukan harga katalog produk — inilah yang dibayar pembeli.
        lockedPrice: b.lockedPrice,
        qtyKgPerBox: Number(b.product.qtyKgPerBox),
        quotaBoxAvailable: b.quotaBoxTotal - b.quotaBoxSold,
        claimedHarvestDate: b.claimedHarvestDate.toISOString().slice(0, 10),
        commodity: b.product.commodity,
        tenant: b.product.tenant,
        badge: toVerificationBadge(b.verificationStatus),
        verificationStatus: b.verificationStatus,
      }));
  }

  /** Detail satu batch untuk halaman produk pembeli (BY-03). */
  async detail(batchId: string) {
    const b = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: {
          include: {
            commodity: true,
            tenant: { select: { id: true, companyName: true, logoUrl: true, claimRatioCached: true, yieldPositionCached: true } },
          },
        },
        landPlot: { select: { areaHa: true, verificationTier: true } },
      },
    });
    if (!b) throw new NotFoundException("Produk tidak ditemukan");

    return {
      batchId: b.id,
      productId: b.product.id,
      productName: b.product.name,
      description: b.product.description,
      grade: b.product.grade,
      lockedPrice: b.lockedPrice,
      qtyKgPerBox: Number(b.product.qtyKgPerBox),
      quotaBoxTotal: b.quotaBoxTotal,
      quotaBoxAvailable: b.quotaBoxTotal - b.quotaBoxSold,
      claimedPlantDate: b.claimedPlantDate?.toISOString().slice(0, 10) ?? null,
      claimedHarvestDate: b.claimedHarvestDate.toISOString().slice(0, 10),
      productionStatus: b.productionStatus,
      badge: toVerificationBadge(b.verificationStatus),
      verificationStatus: b.verificationStatus,
      // Transparansi FR-4.6: selisih klaim vs deteksi satelit ikut dikirim.
      detectedPlantDate: b.detectedPlantDate?.toISOString().slice(0, 10) ?? null,
      detectedHarvestDate: b.detectedHarvestDate?.toISOString().slice(0, 10) ?? null,
      commodity: {
        id: b.product.commodity.id,
        name: b.product.commodity.name,
        category: b.product.commodity.category,
        shrinkTolerancePct: Number(b.product.commodity.shrinkTolerancePct),
        gradeStandards: b.product.commodity.gradeStandards,
      },
      tenant: {
        id: b.product.tenant.id,
        companyName: b.product.tenant.companyName,
        logoUrl: b.product.tenant.logoUrl,
        claimRatioCached: b.product.tenant.claimRatioCached ? Number(b.product.tenant.claimRatioCached) : null,
        // Posisi relatif terhadap rata-rata zona, bukan rasio mentah (FR-7.12f).
        yieldPosition: b.product.tenant.yieldPositionCached
          ? Number(b.product.tenant.yieldPositionCached)
          : null,
      },
      landPlot: { areaHa: Number(b.landPlot.areaHa), verificationTier: b.landPlot.verificationTier },
    };
  }
}
