import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { BuyerService } from "../buyer/buyer.service";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment.service";
import { TenantOrderService } from "./tenant-order.service";
import { TenantService } from "../tenant/tenant.service";
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

  /** FR-7.13 / BY-11d — Tenant mana saja yang akan memprioritaskan pesanan pembeli ini. */
  @Get("seniority")
  seniority(@CurrentUser() u: JwtPayload) {
    return this.buyers.listSeniority(u.sub);
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

  /**
   * BY-10 — detail satu pesanan.
   *
   * Didaftarkan SETELAH rute statis di atas: `@Get(":id")` yang ditaruh lebih awal akan
   * ikut menangkap "/preview" dan "/checkout" sebagai id.
   */
  @Get(":id")
  detail(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    return this.orders.getOrder(u.sub, id);
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


/** TN-21 & TN-22 — pesanan masuk dari sisi Tenant. */
@Controller("tenant/orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantOrderController {
  constructor(
    private readonly tenant: TenantService,
    private readonly tenantOrders: TenantOrderService,
  ) {}

  @Get()
  async list(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.tenantOrders.list(t.id);
  }

  /** `:id` adalah shipmentId — satuan kerja Tenant memang pengiriman, bukan pesanan. */
  @Get(":id")
  async detail(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.tenantOrders.detail(t.id, id);
  }
}
