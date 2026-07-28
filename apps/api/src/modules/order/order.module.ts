import { Module } from "@nestjs/common";
import { BuyerService } from "../buyer/buyer.service";
import { BuyerController, OrderController, PaymentController } from "./order.controller";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { EscrowService } from "./escrow.service";

@Module({
  controllers: [BuyerController, OrderController, PaymentController],
  providers: [BuyerService, OrderService, PaymentService, EscrowService],
  exports: [EscrowService, BuyerService],
})
export class OrderModule {}
