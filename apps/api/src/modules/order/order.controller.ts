import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { BuyerService } from "../buyer/buyer.service";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { CheckoutDto, PaymentWebhookDto, PreviewOrderDto } from "./order.dto";
import { CreateBuyerProfileDto, UpdateBuyerProfileDto } from "../buyer/buyer.dto";

@Controller("buyer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("BUYER")
export class BuyerController {
  constructor(private readonly buyers: BuyerService) {}

  @Post("profile")
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateBuyerProfileDto) {
    return this.buyers.createProfile(u.sub, dto.companyName, dto.activeZoneId);
  }

  @Get("profile")
  get(@CurrentUser() u: JwtPayload) {
    return this.buyers.getProfile(u.sub);
  }

  @Patch("profile")
  update(@CurrentUser() u: JwtPayload, @Body() dto: UpdateBuyerProfileDto) {
    return this.buyers.updateProfile(u.sub, dto);
  }
}

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("BUYER")
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  /** Hitung Rencana Pengiriman + cek minimum, tanpa menyimpan (BY-05). */
  @Post("preview")
  @HttpCode(200)
  preview(@CurrentUser() u: JwtPayload, @Body() dto: PreviewOrderDto) {
    return this.orders.preview(u.sub, dto.lines);
  }

  @Post("checkout")
  checkout(@CurrentUser() u: JwtPayload, @Body() dto: CheckoutDto) {
    return this.orders.checkout(u.sub, dto);
  }

  @Get()
  list(@CurrentUser() u: JwtPayload) {
    return this.orders.listOrders(u.sub);
  }
}

@Controller("payments")
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  /**
   * Callback gateway pembayaran.
   * ⚠️ BELUM memverifikasi signature — wajib ditambahkan saat integrasi Midtrans/Xendit
   * sungguhan, kalau tidak siapa pun bisa menandai tagihan LUNAS.
   */
  @Post("webhook")
  @HttpCode(200)
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(dto.invoiceRef, dto.status);
  }

  /** Lepas reservasi kuota dari tagihan kedaluwarsa (activity A5). Target cron harian. */
  @Post("expire-stale")
  @HttpCode(200)
  expireStale() {
    return this.payments.expireStale();
  }
}
