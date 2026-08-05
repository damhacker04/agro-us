import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { TenantController, ZoneController , OperatorLegalityController} from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { LegalityService } from "./legality.service";
import { LandPlotService } from "./land-plot.service";

@Module({
  imports: [NotificationModule],
  controllers: [TenantController, ZoneController, OperatorLegalityController],
  providers: [TenantService, LandPlotService, LegalityService],
  exports: [TenantService],
})
export class TenantModule {}
