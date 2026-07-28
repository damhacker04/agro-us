import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { ClaimService } from "./claim.service";
import { SettlementService } from "./settlement.service";
import { DecideClaimDto, FileClaimDto } from "./quality.dto";

/** Sisi Pembeli — ajukan & pantau klaim mutu (BY-14, BY-15). */
@Controller("shipments/:shipmentId/claims")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("BUYER")
export class BuyerClaimController {
  constructor(private readonly claims: ClaimService) {}

  @Post()
  file(
    @CurrentUser() u: JwtPayload,
    @Param("shipmentId", ParseUUIDPipe) shipmentId: string,
    @Body() dto: FileClaimDto,
  ) {
    return this.claims.file(u.sub, shipmentId, dto);
  }

  @Get()
  list(@CurrentUser() u: JwtPayload, @Param("shipmentId", ParseUUIDPipe) shipmentId: string) {
    return this.claims.listForBuyer(u.sub, shipmentId);
  }
}

/** Sisi Operator — antrean klaim >10% dengan SLA 1 hari kerja (FR-5.6, OP-05/OP-06). */
@Controller("operator/claims")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OPERATOR")
export class OperatorClaimController {
  constructor(private readonly claims: ClaimService) {}

  @Get()
  queue() {
    return this.claims.operatorQueue();
  }

  @Post(":id/decide")
  @HttpCode(200)
  decide(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecideClaimDto,
  ) {
    return this.claims.decide(u.sub, id, dto.approvedValue, dto.note);
  }
}

/** Dashboard Tenant — saldo escrow & jadwal pencairan (FR-3.5). */
@Controller("tenant/escrow")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantEscrowController {
  constructor(
    private readonly tenant: TenantService,
    private readonly settlement: SettlementService,
  ) {}

  @Get()
  async balance(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.settlement.tenantBalance(t.id);
  }
}

@Controller("quality/jobs")
export class QualityJobsController {
  constructor(private readonly settlement: SettlementService) {}

  /**
   * Jendela klaim berakhir → Selesai → escrow dicairkan (activity G3→G9).
   * Menggantikan `/logistics/jobs/close-claim-windows`: penutupan jendela dan
   * pencairan harus satu langkah, kalau tidak status bisa Selesai tanpa dana cair.
   */
  @Post("settle")
  @HttpCode(200)
  settle() {
    return this.settlement.settleExpiredClaimWindows();
  }
}
