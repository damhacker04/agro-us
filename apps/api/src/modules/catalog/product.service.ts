import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CommoditySummary, ProductResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateProductDto, UpdateProductDto } from "./catalog.dto";

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listCommodities(): Promise<CommoditySummary[]> {
    const rows = await this.prisma.commodity.findMany({ orderBy: { name: "asc" } });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      shrinkTolerancePct: Number(c.shrinkTolerancePct),
      avgYieldKgPerHa: Number(c.avgYieldKgPerHa),
      gradeStandards: c.gradeStandards,
    }));
  }

  async create(tenantId: string, dto: CreateProductDto): Promise<ProductResponse> {
    const commodity = await this.prisma.commodity.findUnique({ where: { id: dto.commodityId } });
    if (!commodity) {
      throw new BadRequestException({ code: "COMMODITY_UNKNOWN", message: "Komoditas tidak dikenal." });
    }
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        commodityId: dto.commodityId,
        name: dto.name,
        grade: dto.grade,
        pricePerBox: dto.pricePerBox,
        qtyKgPerBox: dto.qtyKgPerBox,
        stockBox: dto.stockBox ?? 0,
        estHarvestDate: new Date(dto.estHarvestDate),
        description: dto.description ?? null,
      },
    });
    return this.findOne(tenantId, product.id);
  }

  async findAll(tenantId: string): Promise<ProductResponse[]> {
    const rows = await this.prisma.product.findMany({
      where: { tenantId },
      include: { commodity: true },
      orderBy: { estHarvestDate: "asc" },
    });
    return rows.map((p) => this.toResponse(p));
  }

  async findOne(tenantId: string, id: string): Promise<ProductResponse> {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId }, include: { commodity: true } });
    if (!p) throw new NotFoundException("Produk tidak ditemukan");
    return this.toResponse(p);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    await this.findOne(tenantId, id); // memastikan milik tenant ini
    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.pricePerBox !== undefined && { pricePerBox: dto.pricePerBox }),
        ...(dto.qtyKgPerBox !== undefined && { qtyKgPerBox: dto.qtyKgPerBox }),
        ...(dto.stockBox !== undefined && { stockBox: dto.stockBox }),
        ...(dto.estHarvestDate !== undefined && { estHarvestDate: new Date(dto.estHarvestDate) }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
    return this.findOne(tenantId, id);
  }

  private toResponse(p: {
    id: string;
    name: string;
    grade: ProductResponse["grade"];
    pricePerBox: number;
    qtyKgPerBox: unknown;
    stockBox: number;
    estHarvestDate: Date;
    description: string | null;
    commodity: {
      id: string;
      name: string;
      category: CommoditySummary["category"];
      shrinkTolerancePct: unknown;
      avgYieldKgPerHa: unknown;
      gradeStandards: unknown;
    };
  }): ProductResponse {
    return {
      id: p.id,
      name: p.name,
      grade: p.grade,
      pricePerBox: p.pricePerBox,
      qtyKgPerBox: Number(p.qtyKgPerBox),
      stockBox: p.stockBox,
      estHarvestDate: p.estHarvestDate.toISOString().slice(0, 10),
      description: p.description,
      commodity: {
        id: p.commodity.id,
        name: p.commodity.name,
        category: p.commodity.category,
        shrinkTolerancePct: Number(p.commodity.shrinkTolerancePct),
        avgYieldKgPerHa: Number(p.commodity.avgYieldKgPerHa),
        gradeStandards: p.commodity.gradeStandards,
      },
    };
  }
}
