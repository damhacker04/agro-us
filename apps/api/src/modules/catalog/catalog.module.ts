import { Module } from "@nestjs/common";
import { IntelligenceModule } from "../intelligence/intelligence.module";
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
  // IntelligenceModule: merekam pencarian nihil sebagai sinyal permintaan (FR-8.1).
  imports: [TenantModule, IntelligenceModule],
  controllers: [CommodityController, TenantCatalogController, CatalogController],
  providers: [ProductService, BatchService, CatalogService],
  exports: [BatchService],
})
export class CatalogModule {}
