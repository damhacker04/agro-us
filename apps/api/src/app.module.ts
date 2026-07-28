import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantModule } from "./modules/tenant/tenant.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // baca .env
    PrismaModule,
    AuthModule,
    TenantModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
