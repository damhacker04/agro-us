import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

@Module({
  imports: [TenantModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  // Dipakai IntelligenceModule sebagai gerbang Rekomendasi Tanam (FR-9.1).
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
