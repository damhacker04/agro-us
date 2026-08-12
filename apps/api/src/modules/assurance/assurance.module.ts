import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import { NotificationModule } from "../notification/notification.module";
import {
  AssuranceController,
  OrderCancellationController,
  TenantAllocationController,
} from "./assurance.controller";
import { AllocationService } from "./allocation.service";
import { AssuranceService } from "./assurance.service";
import { YieldAssessmentService } from "./yield-assessment.service";

@Module({
  imports: [TenantModule, NotificationModule],
  controllers: [AssuranceController, OrderCancellationController, TenantAllocationController],
  providers: [AllocationService, AssuranceService, YieldAssessmentService],
  // TimelineModule memakai keduanya pada alur panen dua langkah (HarvestService).
  exports: [AllocationService, YieldAssessmentService],
})
export class AssuranceModule {}
