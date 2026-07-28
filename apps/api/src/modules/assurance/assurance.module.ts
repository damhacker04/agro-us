import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import {
  AssuranceController,
  OrderCancellationController,
  TenantAllocationController,
} from "./assurance.controller";
import { AllocationService } from "./allocation.service";
import { AssuranceService } from "./assurance.service";

@Module({
  imports: [TenantModule],
  controllers: [AssuranceController, OrderCancellationController, TenantAllocationController],
  providers: [AllocationService, AssuranceService],
  // TimelineModule memakai AllocationService saat node PANEN disimpan.
  exports: [AllocationService],
})
export class AssuranceModule {}
