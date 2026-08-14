import { Module } from "@nestjs/common";
import { QualityModule } from "../quality/quality.module";
import { BuyerService } from "../buyer/buyer.service";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { TenantModule } from "../tenant/tenant.module";
import { TenantOrderService } from "./tenant-order.service";
import { BuyerController, OrderController, PaymentController, TenantOrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { EscrowService } from "./escrow.service";

@Module({
  // IntelligenceModule: mencatat kuota yang tak terlayani sebagai sinyal permintaan (FR-8.1).
  imports: [IntelligenceModule, TenantModule, QualityModule],
  controllers: [BuyerController, OrderController, PaymentController, TenantOrderController],
  providers: [BuyerService, OrderService, PaymentService, EscrowService, TenantOrderService],
  exports: [EscrowService, BuyerService, PaymentService],
})
export class OrderModule {}
