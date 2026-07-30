import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import {
  CourierController,
  LogisticsJobsController,
  ShipmentController,
  TenantLogisticsController,
} from "./logistics.controller";
import { ClaimWindowService } from "./claim-window.service";
import { QrService } from "./qr.service";
import { CourierService } from "./courier.service";
import { PodService } from "./pod.service";
import { TrackingGateway } from "./tracking.gateway";

@Module({
  imports: [TenantModule], // requireTenant: userId → tenantId
  controllers: [TenantLogisticsController, CourierController, ShipmentController, LogisticsJobsController],
  providers: [QrService, CourierService, PodService, TrackingGateway, ClaimWindowService],
  exports: [PodService],
})
export class LogisticsModule {}
