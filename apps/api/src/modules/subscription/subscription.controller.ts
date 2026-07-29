import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { SubscriptionService } from "./subscription.service";

export class ActivateSubscriptionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number;
}

/** TN-30 — Langganan Paket Verified (FR-9.1). */
@Controller("tenant/langganan")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class SubscriptionController {
  constructor(
    private readonly tenant: TenantService,
    private readonly subs: SubscriptionService,
  ) {}

  @Get()
  async status(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    const s = await this.subs.status(t.id);
    return {
      active: s.active,
      status: s.status,
      periodEnd: s.sub?.periodEnd?.toISOString().slice(0, 10) ?? null,
      graceUntil: s.sub?.graceUntil?.toISOString().slice(0, 10) ?? null,
      priceMonth: s.sub?.priceMonth ?? 199_000,
    };
  }

  /** ⚠ Simulasi — belum ada pembayaran nyata. */
  @Post("aktifkan")
  @HttpCode(200)
  async activate(@CurrentUser() u: JwtPayload, @Body() dto: ActivateSubscriptionDto) {
    const t = await this.tenant.requireTenant(u.sub);
    const sub = await this.subs.activate(t.id, dto.months ?? 1);
    return {
      status: "ACTIVE",
      periodEnd: sub.periodEnd.toISOString().slice(0, 10),
      graceUntil: sub.graceUntil?.toISOString().slice(0, 10) ?? null,
      message: "Paket Verified aktif. Pembayaran masih disimulasikan.",
    };
  }
}
