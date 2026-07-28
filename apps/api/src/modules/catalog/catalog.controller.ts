import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { ProductService } from "./product.service";
import { BatchService } from "./batch.service";
import { CatalogService } from "./catalog.service";
import {
  CapacityQueryDto,
  CatalogQueryDto,
  CreateProductDto,
  OpenQuotaDto,
  UpdateProductDto,
} from "./catalog.dto";

/** Daftar komoditas — publik: dipakai Tenant saat membuat produk & Pembeli untuk filter. */
@Controller("commodities")
export class CommodityController {
  constructor(private readonly products: ProductService) {}

  @Get()
  list() {
    return this.products.listCommodities();
  }
}

/** Sisi Tenant: kelola produk & buka kuota PO (FR-3.2, FR-3.3). */
@Controller("tenant")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantCatalogController {
  constructor(
    private readonly tenant: TenantService,
    private readonly products: ProductService,
    private readonly batches: BatchService,
  ) {}

  @Post("products")
  async createProduct(@CurrentUser() u: JwtPayload, @Body() dto: CreateProductDto) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.products.create(t.id, dto);
  }

  @Get("products")
  async listProducts(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.products.findAll(t.id);
  }

  @Get("products/:id")
  async getProduct(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.products.findOne(t.id, id);
  }

  @Patch("products/:id")
  async updateProduct(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.products.update(t.id, id, dto);
  }

  /** Pratinjau batas kuota sebelum Tenant mengetik angka (layar TN-16). */
  @Get("land-plots/:id/capacity")
  async capacity(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() q: CapacityQueryDto,
  ) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.batches.getCapacity(t.id, id, q.commodityId, q.qtyKgPerBox);
  }

  @Post("products/:id/batches")
  async openQuota(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OpenQuotaDto,
  ) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.batches.openQuota(t.id, id, dto);
  }

  @Get("batches")
  async listBatches(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.batches.findAll(t.id);
  }

  @Get("batches/:id")
  async getBatch(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.batches.findOne(t.id, id);
  }
}

/**
 * Sisi Pembeli: katalog terpadu lintas-Tenant (FR-2.2).
 * Sengaja TIDAK di-guard — katalog bisa ditelusuri sebelum login, seperti marketplace umum.
 */
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  browse(@Query() q: CatalogQueryDto) {
    return this.catalog.browse(q);
  }

  @Get(":batchId")
  detail(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.catalog.detail(batchId);
  }
}
