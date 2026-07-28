import { Module } from "@nestjs/common";
import { TenantController, ZoneController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { LandPlotService } from "./land-plot.service";

@Module({
  controllers: [TenantController, ZoneController],
  providers: [TenantService, LandPlotService],
  exports: [TenantService],
})
export class TenantModule {}
