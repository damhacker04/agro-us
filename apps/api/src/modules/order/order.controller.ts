import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
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
import { verifikasiTandaTangan } from "./webhook-signature";

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
  private readonly log = new Logger(PaymentController.name);

  constructor(private readonly payments: PaymentService) {}

  /**
   * Callback mitra pembayaran — SERVER KE SERVER, ditandatangani HMAC.
   *
   * Sebelumnya endpoint ini terbuka: siapa pun yang tahu nomor tagihan bisa mengirim
   * `{"status":"PAID"}` dan mendapat barang gratis — kuota terkunci, escrow mencatat HOLD,
   * alokasi berjalan atas uang yang tidak pernah masuk.
   *
   * GAGAL TERTUTUP. Tanpa `PAYMENT_WEBHOOK_SECRET`, endpoint ini menolak semuanya alih-alih
   * melayani tanpa pemeriksaan. Jalur "lolos kalau secret belum diisi" adalah persis
   * konfigurasi yang terbawa ke produksi tanpa ada yang sadar.
   *
   * Tombol "sudah bayar" milik peragaan TIDAK lagi memakai endpoint ini — ia pindah ke
   * `POST /payments/:invoiceRef/tandai-lunas` yang menuntut login pembeli pemilik pesanan.
   * Peramban tidak pernah punya urusan memanggil callback mitra.
   */
  @Post("webhook")
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>, @Body() dto: PaymentWebhookDto) {
    const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
    if (!secret) {
      this.log.error("PAYMENT_WEBHOOK_SECRET belum diset — callback pembayaran ditolak.");
      throw new ServiceUnavailableException({
        code: "WEBHOOK_SECRET_MISSING",
        message: "Verifikasi callback pembayaran belum dikonfigurasi.",
      });
    }

    const hasil = verifikasiTandaTangan(
      req.rawBody,
      req.headers["x-agro-signature"] as string | undefined,
      secret,
    );
    if (!hasil.sah) {
      // Alasannya dicatat ke log, TIDAK dikirim ke pemanggil: memberi tahu apakah yang
      // salah stempel waktu atau tanda tangannya sama saja dengan memberi umpan balik
      // untuk menebak. Yang menerima cukup tahu bahwa ia ditolak.
      this.log.warn(`Callback pembayaran ditolak: ${hasil.alasan}`);
      throw new UnauthorizedException({
        code: "WEBHOOK_SIGNATURE_INVALID",
        message: "Tanda tangan callback tidak sah.",
      });
    }

    return this.payments.handleWebhook(dto.invoiceRef, dto.status);
  }

  /**
   * Peragaan: tandai tagihan LUNAS tanpa mitra pembayaran sungguhan.
   *
   * Menggantikan tombol demo yang dulu memanggil `/payments/webhook` langsung dari peramban.
   * Bedanya besar: endpoint ini menuntut LOGIN, dan hanya melayani tagihan milik pesanan
   * pembeli yang sedang login. Kalaupun jalur ini disalahgunakan, batas kerusakannya adalah
   * pesanan orang itu sendiri — bukan tagihan siapa pun di seluruh sistem.
   *
   * Dikunci di balik `DEMO_EXPOSE_OTP`. Sengaja menumpang saklar yang sudah ada, bukan
   * membuat saklar baru: keduanya berarti hal yang sama — "penempatan ini peragaan dengan
   * data karangan". Menyatukannya membuat mustahil mematikan yang satu dan lupa yang lain.
   */
  @Post(":invoiceRef/tandai-lunas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("BUYER")
  @HttpCode(200)
  tandaiLunasDemo(@CurrentUser() u: JwtPayload, @Param("invoiceRef") invoiceRef: string) {
    if (process.env["DEMO_EXPOSE_OTP"] !== "true") {
      throw new ForbiddenException({
        code: "DEMO_PAYMENT_DISABLED",
        message: "Pembayaran simulasi tidak aktif pada penempatan ini.",
      });
    }
    return this.payments.tandaiLunasDemo(u.sub, invoiceRef);
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
