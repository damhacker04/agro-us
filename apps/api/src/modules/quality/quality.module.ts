import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import {
  BuyerClaimController,
  OperatorClaimController,
  QualityJobsController,
  TenantEscrowController,
} from "./quality.controller";
import { ClaimService } from "./claim.service";
import { SettlementService } from "./settlement.service";

@Module({
  imports: [TenantModule],
  controllers: [BuyerClaimController, OperatorClaimController, TenantEscrowController, QualityJobsController],
  providers: [ClaimService, SettlementService],
  exports: [SettlementService],
})
export class QualityModule {}
