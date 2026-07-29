import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { IsOptional, IsUUID, Matches } from "class-validator";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { SubscriptionService } from "../subscription/subscription.service";
import { DemandService } from "./demand.service";
import { RecommendationService } from "./recommendation.service";

export class PrefillQueryDto {
  @IsUUID("4") zoneId!: string;
  @IsUUID("4") commodityId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "harvestWeekStart harus YYYY-MM-DD" })
  harvestWeekStart!: string;
}

export class DemandQueryDto {
  @IsOptional() @IsUUID("4") zoneId?: string;
}

/** TN-27 & TN-28 — Rekomendasi Tanam (FR-3.7, FR-8.2, FR-8.3, FR-8.4). */
@Controller("tenant/rekomendasi")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class RecommendationController {
  constructor(
    private readonly tenant: TenantService,
    private readonly subs: SubscriptionService,
    private readonly rec: RecommendationService,
  ) {}

  @Get()
  async list(@CurrentUser() u: JwtPayload) {
    const t = await this.tenant.requireTenant(u.sub);
    await this.subs.requireActive(t.id, "Rekomendasi Tanam");
    return this.rec.forTenant(t.id);
  }

  /** FR-8.3 — payload siap-isi untuk form Buka Kuota (TN-16). */
  @Get("prefill")
  async prefill(@CurrentUser() u: JwtPayload, @Query() q: PrefillQueryDto) {
    const t = await this.tenant.requireTenant(u.sub);
    await this.subs.requireActive(t.id, "Rekomendasi Tanam");
    return this.rec.prefill(t.id, q.zoneId, q.commodityId, q.harvestWeekStart);
  }
}

/**
 * FR-8.1 — agregat mentah, termasuk baris JENUH yang sengaja TIDAK muncul sebagai
 * rekomendasi. Tenant tetap berhak melihat kondisi pasar apa adanya, bukan hanya
 * bagian yang menguntungkan platform untuk ditanam.
 */
@Controller("tenant/permintaan")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class DemandController {
  constructor(
    private readonly tenant: TenantService,
    private readonly subs: SubscriptionService,
    private readonly demand: DemandService,
  ) {}

  @Get()
  async list(@CurrentUser() u: JwtPayload, @Query() q: DemandQueryDto) {
    const t = await this.tenant.requireTenant(u.sub);
    await this.subs.requireActive(t.id, "Intelijen Permintaan");
    // Zona disaring terhadap zona yang DILAYANI Tenant, bukan dipakai apa adanya —
    // kalau tidak, Tenant Malang bisa mengintip peta permintaan zona lain.
    const zones = await this.demand.zoneIdsOf(t.id);
    const scoped = q.zoneId ? zones.filter((z) => z === q.zoneId) : zones;
    return this.demand.aggregate(scoped);
  }
}
