import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { OrderModule } from "./modules/order/order.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { LogisticsModule } from "./modules/logistics/logistics.module";
import { QualityModule } from "./modules/quality/quality.module";
import { IntelligenceModule } from "./modules/intelligence/intelligence.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { AssuranceModule } from "./modules/assurance/assurance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // baca .env
    PrismaModule,
    AuthModule,
    TenantModule,
    CatalogModule,
    OrderModule,
    TimelineModule,
    LogisticsModule,
    QualityModule,
    AssuranceModule,
    IntelligenceModule,
    SubscriptionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
