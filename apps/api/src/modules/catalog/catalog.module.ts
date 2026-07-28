import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import {
  CatalogController,
  CommodityController,
  TenantCatalogController,
} from "./catalog.controller";
import { ProductService } from "./product.service";
import { BatchService } from "./batch.service";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [TenantModule], // butuh TenantService.requireTenant (userId → tenantId)
  controllers: [CommodityController, TenantCatalogController, CatalogController],
  providers: [ProductService, BatchService, CatalogService],
  exports: [BatchService],
})
export class CatalogModule {}
