import { Module } from "@nestjs/common";
import { SubscriptionModule } from "../subscription/subscription.module";
import { TenantModule } from "../tenant/tenant.module";
import { DemandController, RecommendationController } from "./intelligence.controller";
import { DemandService } from "./demand.service";
import { DemandSignalService } from "./demand-signal.service";
import { RecommendationService } from "./recommendation.service";

@Module({
  imports: [TenantModule, SubscriptionModule],
  controllers: [RecommendationController, DemandController],
  providers: [DemandService, DemandSignalService, RecommendationService],
  // Katalog & order merekam sinyal permintaan yang gagal dilayani (FR-8.1).
  exports: [DemandSignalService],
})
export class IntelligenceModule {}
