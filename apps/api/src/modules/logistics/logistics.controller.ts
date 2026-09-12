import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QrService } from "./qr.service";
import { CourierService } from "./courier.service";
import { PodService } from "./pod.service";
import { ConfirmReceiptDto, ReportPositionDto, VerifyCourierCodeDto } from "./logistics.dto";
import { HEADER_SESI_PELACAKAN, bolehPantauPengiriman } from "./watch-authz";

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
 * Sisi Kurir — TANPA akun (§5.6.2). Kredensialnya token QR lalu `sessionId`.
 *
 * `sessionId` DIBAWA DI HEADER, bukan di path. Sebelumnya ia bagian dari URL
 * (`/scan/session/:sessionId/position`), dan URL tercatat utuh di access log, log proxy,
 * dan header `Referer` — satu-satunya kredensial yang dimiliki kurir ikut tersimpan di
 * setiap tempat yang mencatat lalu lintas. Berkas `ws-auth.ts` di modul auth sudah
 * menolak alasan yang sama untuk kanal WebSocket ("token yang bocor ke log sama saja
 * dengan kata sandi yang bocor ke log"); tidak ada alasan jalur HTTP diperlakukan lebih
 * longgar untuk kredensial yang sama.
 */
@Controller("scan")
export class CourierController {
  constructor(private readonly courier: CourierService) {}

  /** Kredensial sesi dari header, ditolak tegas kalau tidak ada. */
  private sesi(header: string | undefined): string {
    const id = header?.trim();
    if (!id) {
      throw new BadRequestException({
        code: "SESSION_HEADER_MISSING",
        message: `Sesi pelacakan wajib dikirim di header ${HEADER_SESI_PELACAKAN}.`,
      });
    }
    return id;
  }

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

  @Post("session/position")
  @HttpCode(200)
  position(@Headers(HEADER_SESI_PELACAKAN) sesi: string | undefined, @Body() dto: ReportPositionDto) {
    return this.courier.reportPosition(this.sesi(sesi), dto.lat, dto.lng, new Date(dto.deviceTs));
  }

  @Post("session/no-gps")
  @HttpCode(200)
  noGps(@Headers(HEADER_SESI_PELACAKAN) sesi: string | undefined) {
    return this.courier.flagNoGps(this.sesi(sesi));
  }
}

/** Sisi Pembeli — Sinyal-2 PoD & data peta. */
@Controller("shipments")
export class ShipmentController {
  constructor(
    private readonly pod: PodService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
   * Posisi kurir untuk peta (BY-10a).
   *
   * DIOTORISASI dengan aturan yang sama seperti room WebSocket-nya — lihat
   * `watch-authz.ts`. Sebelumnya endpoint ini terbuka, dengan alasan "shipmentId berupa
   * UUID acak yang tidak bisa ditebak"; padahal id itu beredar di tautan pesanan,
   * tangkapan layar, dan percakapan dukungan, dan kanal WS di modul yang sama sudah
   * berhenti mempercayai alasan tersebut. Selama jalur REST masih terbuka, memperketat
   * kanal WS tidak menutup apa pun: posisi yang sama tinggal diambil lewat sini.
   *
   * `JwtAuthGuard` TIDAK dipakai karena kurir memang tidak punya akun: guard akan menolak
   * pemanggil yang sah sebelum aturannya sempat dijalankan. Jadi identitas diperiksa di
   * dalam handler — dari token, atau dari sesi pelacakan yang masih terbuka.
   */
  @Get(":id/track")
  async track(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization: string | undefined,
    @Headers(HEADER_SESI_PELACAKAN) sesi: string | undefined,
  ) {
    const boleh = await bolehPantauPengiriman(this.prisma, id, {
      user: await this.identitas(authorization),
      sessionId: sesi?.trim() || undefined,
    });
    // Pesan sengaja sama untuk "pengiriman tidak ada" dan "bukan milik Anda": membedakan
    // keduanya menjadikan endpoint ini alat memeriksa keberadaan pesanan orang lain.
    if (!boleh) throw new ForbiddenException({ code: "AKSES_DITOLAK", message: "Pengiriman tidak dapat diakses." });
    return this.pod.snapshot(id);
  }

  /** `null` untuk tamu maupun token rusak — keduanya bukan identitas. */
  private async identitas(authorization: string | undefined): Promise<JwtPayload | null> {
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      return await this.jwt.verifyAsync<JwtPayload>(authorization.slice(7));
    } catch {
      return null;
    }
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

  // Penutupan jendela klaim + pencairan escrow pindah ke POST /quality/jobs/settle.
  // Keduanya HARUS satu langkah: kalau status jadi Selesai tanpa pencairan, dana
  // Tenant menggantung tanpa ada proses yang akan mengambilnya.
}
