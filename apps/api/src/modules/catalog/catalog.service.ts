import { Injectable, NotFoundException } from "@nestjs/common";
import { VerificationBadge, type CatalogItem } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import type { CatalogQueryDto } from "./catalog.dto";
import type { VerificationStatus } from "../../../generated/prisma/enums";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-2.6 — tiga badge yang tampil ke pembeli.
   * PERLU_DITINJAU / TIDAK_SESUAI TIDAK disembunyikan: badge-nya memang
   * "Belum Terverifikasi", tetapi `verificationStatus` mentah ikut dikirim agar FE
   * bisa menampilkan ketidaksesuaiannya secara terbuka (FR-4.6).
   */
  private toBadge(status: VerificationStatus): VerificationBadge {
    if (status === "TERVERIFIKASI") return VerificationBadge.TERVERIFIKASI_SATELIT;
    if (status === "FOTO_SAJA") return VerificationBadge.BUKTI_FOTO_SAJA;
    return VerificationBadge.BELUM_TERVERIFIKASI;
  }

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

    return batches
      .filter((b) => b.quotaBoxTotal - b.quotaBoxSold > 0) // kuota habis → tidak tampil
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
        badge: this.toBadge(b.verificationStatus),
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
            tenant: { select: { id: true, companyName: true, logoUrl: true, claimRatioCached: true, shortfallRatioCached: true } },
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
      badge: this.toBadge(b.verificationStatus),
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
        shortfallRatioCached: b.product.tenant.shortfallRatioCached
          ? Number(b.product.tenant.shortfallRatioCached)
          : null,
      },
      landPlot: { areaHa: Number(b.landPlot.areaHa), verificationTier: b.landPlot.verificationTier },
    };
  }
}
