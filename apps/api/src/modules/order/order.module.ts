import { Module } from "@nestjs/common";
import { BuyerService } from "../buyer/buyer.service";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { BuyerController, OrderController, PaymentController } from "./order.controller";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { EscrowService } from "./escrow.service";

@Module({
  // IntelligenceModule: mencatat kuota yang tak terlayani sebagai sinyal permintaan (FR-8.1).
  imports: [IntelligenceModule],
  controllers: [BuyerController, OrderController, PaymentController],
  providers: [BuyerService, OrderService, PaymentService, EscrowService],
  exports: [EscrowService, BuyerService],
})
export class OrderModule {}
