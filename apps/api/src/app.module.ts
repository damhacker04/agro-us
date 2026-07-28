import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { TimelineModule } from "./modules/timeline/timeline.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // baca .env
    PrismaModule,
    AuthModule,
    TenantModule,
    CatalogModule,
    TimelineModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
