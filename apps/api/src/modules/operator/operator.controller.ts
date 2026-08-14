import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import type { JwtPayload } from "../auth/auth.service";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { OperatorService } from "./operator.service";
import { YieldAssessmentService } from "../assurance/yield-assessment.service";
import { SettlementService } from "../quality/settlement.service";
import { UmurSimpanService } from "../quality/umur-simpan.service";
import { StorageService } from "../storage/storage.service";
import {
  DecidePlausibilityDto,
  DecideSatelliteDto,
  UpsertCommodityDto,
  UpsertZoneDto,
} from "./operator.dto";

/**
 * Konsol operator (OP-04, OP-07, OP-08 + tata kelola zona & komoditas).
 *
 * Antrean klaim dan legalitas TIDAK di sini — keduanya sudah punya rumah di modul
 * quality dan tenant, dan memindahkannya hanya akan memisahkan endpoint dari logika
 * yang dilayaninya.
 */
@Controller("operator")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OPERATOR")
export class OperatorController {
  constructor(
    private readonly operator: OperatorService,
    private readonly kewajaran: YieldAssessmentService,
    private readonly settlement: SettlementService,
    private readonly storage: StorageService,
    private readonly umur: UmurSimpanService,
  ) {}

  /** Posisi dana seluruh Tenant. */
  @Get("escrow")
  escrow() {
    return this.operator.escrow();
  }

  /** Audit jangkar hash — rantai dihitung ULANG, bukan dibaca dari kolom hash. */
  @Get("anchors")
  anchors(@Query("limit") limit?: string) {
    const n = Number(limit);
    return this.operator.anchors(Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 50);
  }

  @Get("satellite")
  satellite() {
    return this.operator.satelliteQueue();
  }

  @Post("satellite/:batchId/decide")
  @HttpCode(200)
  decideSatellite(
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: DecideSatelliteDto,
  ) {
    return this.operator.decideSatellite(batchId, dto.verificationStatus);
  }

  /**
   * OP-14 — antrean pantau umur simpan (FR-5.10).
   *
   * TIDAK memfilter dengan ambang, dan itu disengaja: angka umur simpannya sendiri masih
   * estimasi yang belum divalidasi lapangan, jadi menyaring dengannya berarti
   * menyembunyikan batch berdasarkan tebakan. Operator melihat semua yang sedang menunggu
   * kirim, terurut dari yang paling tipis, lalu memutuskan sendiri.
   */
  @Get("umur-simpan")
  umurSimpan() {
    return this.umur.antrean();
  }

  /**
   * Penyimpanan foto bukti mana yang sedang aktif.
   *
   * Perbedaan antara S3 dan disk ephemeral hanya tercetak sekali saat boot, lalu lewat.
   * Selama tidak terlihat dari luar, satu redeploy bisa diam-diam mengembalikannya ke disk
   * lokal tanpa ada yang tahu — dan yang hilang bukan cache, melainkan foto bukti yang
   * hash-nya sudah terikat ke Verified Timeline.
   */
  @Get("penyimpanan")
  penyimpanan() {
    return this.storage.info();
  }

  /**
   * Instruksi penyaluran yang belum sukses. Bukan antrean kerja Operator, melainkan
   * jendela kejujuran: selama mitra pembayaran belum tersambung, angka ini seharusnya
   * memuat SETIAP pencairan yang pernah dibukukan.
   */
  @Get("penyaluran-tertunda")
  penyaluranTertunda() {
    return this.settlement.pendingSettlements();
  }

  /** OP-13 — antrean tinjauan kewajaran hasil panen. */
  @Get("kewajaran")
  kewajaranQueue() {
    return this.kewajaran.antreanTinjauan();
  }

  /**
   * Putusan Operator atas satu penilaian. Menggantikan verdict otomatis dan menentukan
   * apakah cap 10% berlaku untuk shortfall batch ini (FR-7.11).
   */
  @Post("kewajaran/:assessmentId/decide")
  @HttpCode(200)
  decideKewajaran(
    @Param("assessmentId", ParseUUIDPipe) assessmentId: string,
    @Body() dto: DecidePlausibilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kewajaran.putuskanTinjauan(assessmentId, dto.finalVerdict, user.sub);
  }

  @Get("zones")
  zones() {
    return this.operator.listZones();
  }

  @Post("zones")
  createZone(@Body() dto: UpsertZoneDto) {
    return this.operator.createZone(dto);
  }

  @Patch("zones/:id")
  updateZone(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpsertZoneDto) {
    return this.operator.updateZone(id, dto);
  }

  @Get("commodities")
  commodities() {
    return this.operator.listCommodities();
  }

  @Post("commodities")
  createCommodity(@Body() dto: UpsertCommodityDto) {
    return this.operator.createCommodity(dto);
  }

  @Patch("commodities/:id")
  updateCommodity(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpsertCommodityDto) {
    return this.operator.updateCommodity(id, dto);
  }
}
