import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { QrService } from "./qr.service";
import { CourierService } from "./courier.service";
import { PodService } from "./pod.service";
import { ConfirmReceiptDto, ReportPositionDto, VerifyCourierCodeDto } from "./logistics.dto";

/** Sisi Tenant — cetak QR box & kelola Kode Antar (FR-3.6, FR-6.1/6.3). */
@Controller("tenant/shipments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantLogisticsController {
  constructor(
    private readonly tenant: TenantService,
    private readonly qr: QrService,
  ) {}

  /** Terbitkan QR + Kode Antar. Kode hanya ditampilkan di respons ini. */
  @Post(":id/qr")
  async generate(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.qr.generate(t.id, id);
  }

  /** Lembar cetak ulang. TIDAK menyertakan Kode Antar. */
  @Get(":id/qr")
  async list(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.qr.list(t.id, id);
  }

  /** Terbitkan kode baru setelah token terkunci (FR-6.3). QR lama tetap berlaku. */
  @Post(":id/courier-code/reissue")
  @HttpCode(200)
  async reissue(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.qr.reissueCode(t.id, id);
  }
}

/**
 * Sisi Kurir — TANPA autentikasi, TANPA akun (§5.6.2).
 * Kredensialnya adalah token QR lalu `sessionId`; keduanya acak dan tidak bisa ditebak.
 */
@Controller("scan")
export class CourierController {
  constructor(private readonly courier: CourierService) {}

  /** Halaman pertama setelah scan. TIDAK mengonsumsi token (FR-6.2). */
  @Get(":token")
  inspect(@Param("token") token: string) {
    return this.courier.inspectToken(token);
  }

  /** Verifikasi Kode Antar → token terpakai, sesi terbuka, status jadi Dikirim. */
  @Post(":token/verify")
  @HttpCode(200)
  verify(@Param("token") token: string, @Body() dto: VerifyCourierCodeDto) {
    return this.courier.verifyCode(token, dto.code);
  }

  @Post("session/:sessionId/position")
  @HttpCode(200)
  position(@Param("sessionId", ParseUUIDPipe) sessionId: string, @Body() dto: ReportPositionDto) {
    return this.courier.reportPosition(sessionId, dto.lat, dto.lng, new Date(dto.deviceTs));
  }

  @Post("session/:sessionId/no-gps")
  @HttpCode(200)
  noGps(@Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return this.courier.flagNoGps(sessionId);
  }
}

/** Sisi Pembeli — Sinyal-2 PoD & data peta. */
@Controller("shipments")
export class ShipmentController {
  constructor(private readonly pod: PodService) {}

  @Post(":id/receive")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("BUYER")
  receive(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReceiptDto,
  ) {
    return this.pod.confirmReceipt(u.sub, id, dto.photoUrl);
  }

  /**
   * Posisi kurir untuk peta (BY-10a). Tanpa guard — sama seperti pelacakan resi
   * kurir pada umumnya, dan shipmentId berupa UUID acak yang tidak bisa ditebak.
   */
  @Get(":id/track")
  track(@Param("id", ParseUUIDPipe) id: string) {
    return this.pod.snapshot(id);
  }
}

/** Pekerjaan terjadwal — target cron. */
@Controller("logistics/jobs")
export class LogisticsJobsController {
  constructor(private readonly pod: PodService) {}

  /** Fallback 60 menit → Diterima Otomatis + jendela klaim 24 jam (§5.6.4). */
  @Post("auto-accept")
  @HttpCode(200)
  autoAccept() {
    return this.pod.autoAcceptStale();
  }

  /** Jendela klaim habis → Selesai (§5.6.1 status 6). */
  @Post("close-claim-windows")
  @HttpCode(200)
  closeWindows() {
    return this.pod.closeExpiredClaimWindows();
  }
}
