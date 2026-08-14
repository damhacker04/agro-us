import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { TenantModule } from "../tenant/tenant.module";
import {
  BuyerClaimController,
  OperatorClaimController,
  QualityJobsController,
  TenantEscrowController,
} from "./quality.controller";
import { ClaimService } from "./claim.service";
import { SettlementService } from "./settlement.service";
import { UmurSimpanService } from "./umur-simpan.service";

@Module({
  imports: [TenantModule, NotificationModule],
  controllers: [BuyerClaimController, OperatorClaimController, TenantEscrowController, QualityJobsController],
  providers: [ClaimService, SettlementService, UmurSimpanService],
  exports: [SettlementService, UmurSimpanService],
})
export class QualityModule {}
