import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { AllocationService } from "./allocation.service";
import { AssuranceService } from "./assurance.service";

export class ResolveAssuranceDto {
  @IsIn(["SUBSTITUSI", "JADWAL_ULANG", "REFUND", "TERIMA_SEBAGIAN"], {
    message: "option harus SUBSTITUSI, JADWAL_ULANG, REFUND, atau TERIMA_SEBAGIAN",
  })
  option!: "SUBSTITUSI" | "JADWAL_ULANG" | "REFUND" | "TERIMA_SEBAGIAN";

  @IsOptional()
  @IsUUID("4")
  replacementBatchId?: string;
}

export class PreviewQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fulfilledBox!: number;
}

/** Sisi Pembeli — layar Harvest Assurance (BY-11). */
@Controller("assurance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("BUYER")
export class AssuranceController {
  constructor(private readonly assurance: AssuranceService) {}

  /** Item yang menunggu keputusan. */
  @Get("pending")
  pending(@CurrentUser() u: JwtPayload) {
    return this.assurance.pendingForBuyer(u.sub);
  }

  @Post(":orderItemId/resolve")
  @HttpCode(200)
  resolve(
    @CurrentUser() u: JwtPayload,
    @Param("orderItemId", ParseUUIDPipe) orderItemId: string,
    @Body() dto: ResolveAssuranceDto,
  ) {
    return this.assurance.resolve(u.sub, orderItemId, dto.option, dto.replacementBatchId);
  }
}

/** FR-7.5 — pembatalan sepihak pembeli selama Menunggu Panen. */
@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("BUYER")
export class OrderCancellationController {
  constructor(private readonly assurance: AssuranceService) {}

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    return this.assurance.cancelOrder(u.sub, id);
  }
}

/** Sisi Tenant — pratinjau dampak sebelum menandai panen (TN-19a). */
@Controller("tenant/batches")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantAllocationController {
  constructor(
    private readonly tenant: TenantService,
    private readonly allocation: AllocationService,
  ) {}

  /**
   * "6 dari 10 pesanan terpenuhi penuh, 4 akan ditawari Harvest Assurance" —
   * Tenant harus melihat konsekuensinya SEBELUM menekan (FR-7.8).
   */
  @Get(":id/allocation-preview")
  async preview(
    @CurrentUser() u: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() q: PreviewQueryDto,
  ) {
    await this.tenant.requireTenant(u.sub);
    return this.allocation.preview(id, q.fulfilledBox);
  }
}
