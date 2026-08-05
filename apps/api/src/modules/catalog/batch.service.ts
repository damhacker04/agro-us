import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { BatchResponse, LandPlotCapacityResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import type { OpenQuotaDto } from "./catalog.dto";

/** Batch yang masih "hidup" — menahan kapasitas lahan dan masih boleh dijual. */
const ACTIVE_PRODUCTION = ["PLANNING", "GROWING"] as const;

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batas kuota PO (FR-3.3):
   *
   *   maxBox = floor( areaHa × avgYieldKgPerHa ÷ qtyKgPerBox × quotaMultiplier )
   *
   * `quotaMultiplier` merangkap dua peran: bantalan 70% terhadap gagal panen (Risiko 2)
   * DAN penalti shortfall yang menurunkannya ke 0,50 (FR-7.12).
   *
   * Kapasitas dihitung dari luas poligon hasil ukur PostGIS — bukan angka kiriman Tenant.
   */
  async getCapacity(
    tenantId: string,
    landPlotId: string,
    commodityId: string,
    qtyKgPerBox: number,
  ): Promise<LandPlotCapacityResponse> {
    const [plot, commodity, tenant] = await Promise.all([
      this.prisma.landPlot.findFirst({ where: { id: landPlotId, tenantId }, select: { id: true, areaHa: true } }),
      this.prisma.commodity.findUnique({ where: { id: commodityId }, select: { avgYieldKgPerHa: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { quotaMultiplier: true } }),
    ]);
    if (!plot) throw new NotFoundException("Lahan tidak ditemukan");
    if (!commodity) throw new BadRequestException({ code: "COMMODITY_UNKNOWN", message: "Komoditas tidak dikenal." });
    if (qtyKgPerBox <= 0) throw new BadRequestException({ code: "BOX_SIZE_INVALID", message: "Isi per box harus > 0." });

    const areaHa = Number(plot.areaHa);
    const avgYieldKgPerHa = Number(commodity.avgYieldKgPerHa);
    const quotaMultiplier = Number(tenant!.quotaMultiplier);
    const maxQuotaBox = Math.floor((areaHa * avgYieldKgPerHa * quotaMultiplier) / qtyKgPerBox);

    // Satu lahan hanya boleh menampung SATU batch aktif. Tanpa aturan ini, Tenant
    // bisa membuka 10 batch di atas lahan 1 ha yang sama dan menjual 10× kapasitas.
    // Butuh menanam beberapa komoditas sekaligus? Petakan poligon terpisah (FR-1.5).
    const blocking = await this.prisma.batch.findFirst({
      where: { landPlotId, productionStatus: { in: [...ACTIVE_PRODUCTION] } },
      select: { id: true },
    });

    return {
      landPlotId: plot.id,
      areaHa,
      avgYieldKgPerHa,
      qtyKgPerBox,
      quotaMultiplier,
      maxQuotaBox,
      available: !blocking,
      ...(blocking && { blockingBatchId: blocking.id }),
    };
  }

  async openQuota(tenantId: string, productId: string, dto: OpenQuotaDto): Promise<BatchResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, commodityId: true, qtyKgPerBox: true },
    });
    if (!product) throw new NotFoundException("Produk tidak ditemukan");

    const cap = await this.getCapacity(
      tenantId,
      dto.landPlotId,
      product.commodityId,
      Number(product.qtyKgPerBox),
    );

    if (!cap.available) {
      throw new ConflictException({
        code: "LAND_PLOT_BUSY",
        message: "Lahan ini masih dipakai batch yang berjalan. Selesaikan panennya dulu, atau pilih lahan lain.",
        blockingBatchId: cap.blockingBatchId,
      });
    }
    if (dto.quotaBoxTotal > cap.maxQuotaBox) {
      throw new BadRequestException({
        code: "QUOTA_EXCEEDS_CAPACITY",
        message:
          `Kuota melebihi kapasitas lahan. Maksimal ${cap.maxQuotaBox} box ` +
          `(luas ${cap.areaHa} ha × rendemen ${cap.avgYieldKgPerHa} kg/ha ÷ ${cap.qtyKgPerBox} kg per box, ` +
          `dibatasi ${Math.round(cap.quotaMultiplier * 100)}% sebagai cadangan gagal panen).`,
        maxQuotaBox: cap.maxQuotaBox,
      });
    }

    const plantDate = dto.claimedPlantDate ? new Date(dto.claimedPlantDate) : null;
    const harvestDate = new Date(dto.claimedHarvestDate);
    if (plantDate && plantDate >= harvestDate) {
      throw new BadRequestException({
        code: "DATE_ORDER_INVALID",
        message: "Tanggal panen harus setelah tanggal tanam.",
      });
    }

    const batch = await this.prisma.batch.create({
      data: {
        productId: product.id,
        landPlotId: dto.landPlotId,
        quotaBoxTotal: dto.quotaBoxTotal,
        lockedPrice: dto.lockedPrice,
        claimedPlantDate: plantDate,
        claimedHarvestDate: harvestDate,
        productionStatus: plantDate ? "GROWING" : "PLANNING",
      },
    });
    return this.toResponse(batch);
  }

  /**
   * TN-14 wajib menampilkan produk & poligon lahannya, bukan sekadar id. Tanpa nama di
   * sini FE terpaksa menembak /tenant/products dan /tenant/land-plots untuk tiap baris
   * hanya demi mengisi dua kolom teks.
   */
  async findAll(tenantId: string): Promise<BatchResponse[]> {
    const rows = await this.prisma.batch.findMany({
      where: { product: { tenantId } },
      orderBy: { claimedHarvestDate: "asc" },
      include: {
        product: { select: { name: true, grade: true, qtyKgPerBox: true } },
        landPlot: { select: { areaHa: true, verificationTier: true } },
      },
    });
    return rows.map((b) => ({
      ...this.toResponse(b),
      productName: b.product.name,
      grade: b.product.grade,
      qtyKgPerBox: Number(b.product.qtyKgPerBox),
      landPlotAreaHa: Number(b.landPlot.areaHa),
      landPlotTier: b.landPlot.verificationTier,
    }));
  }

  async findOne(tenantId: string, id: string): Promise<BatchResponse> {
    const b = await this.prisma.batch.findFirst({ where: { id, product: { tenantId } } });
    if (!b) throw new NotFoundException("Batch tidak ditemukan");
    return this.toResponse(b);
  }

  private toResponse(b: {
    id: string;
    productId: string;
    landPlotId: string;
    quotaBoxTotal: number;
    quotaBoxSold: number;
    quotaBoxFulfilled: number | null;
    lockedPrice: number;
    claimedPlantDate: Date | null;
    claimedHarvestDate: Date;
    productionStatus: BatchResponse["productionStatus"];
    verificationStatus: BatchResponse["verificationStatus"];
    detectedPlantDate: Date | null;
    detectedHarvestDate: Date | null;
  }): BatchResponse {
    const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);
    return {
      id: b.id,
      productId: b.productId,
      landPlotId: b.landPlotId,
      quotaBoxTotal: b.quotaBoxTotal,
      quotaBoxSold: b.quotaBoxSold,
      quotaBoxFulfilled: b.quotaBoxFulfilled,
      lockedPrice: b.lockedPrice,
      claimedPlantDate: d(b.claimedPlantDate),
      claimedHarvestDate: d(b.claimedHarvestDate)!,
      productionStatus: b.productionStatus,
      verificationStatus: b.verificationStatus,
      detectedPlantDate: d(b.detectedPlantDate),
      detectedHarvestDate: d(b.detectedHarvestDate),
    };
  }
}
