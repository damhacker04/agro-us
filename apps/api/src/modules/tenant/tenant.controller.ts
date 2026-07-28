import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from "@nestjs/common";
import type { GeoJsonPolygon } from "@agro-os/shared";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "./tenant.service";
import { LandPlotService } from "./land-plot.service";
import {
  CreateLandPlotDto,
  CreateTenantProfileDto,
  SubmitLegalityDto,
  UpdateTenantProfileDto,
} from "./tenant.dto";

@Controller("tenant")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantController {
  constructor(
    private readonly tenant: TenantService,
    private readonly landPlots: LandPlotService,
  ) {}

  // ---------- Profil (FR-1.4) ----------

  @Post("profile")
  createProfile(@CurrentUser() u: JwtPayload, @Body() dto: CreateTenantProfileDto) {
    return this.tenant.createProfile(u.sub, dto.companyName, dto.zoneIds, dto.logoUrl);
  }

  @Get("profile")
  getProfile(@CurrentUser() u: JwtPayload) {
    return this.tenant.getProfile(u.sub);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() u: JwtPayload, @Body() dto: UpdateTenantProfileDto) {
    return this.tenant.updateProfile(u.sub, dto);
  }

  // ---------- Legalitas (FR-1.7) ----------

  @Put("legality")
  submitLegality(@CurrentUser() u: JwtPayload, @Body() dto: SubmitLegalityDto) {
    return this.tenant.submitLegality(u.sub, dto.documentUrl);
  }

  // ---------- Poligon lahan (FR-1.5 / FR-1.6) ----------

  @Post("land-plots")
  async createLandPlot(@CurrentUser() u: JwtPayload, @Body() dto: CreateLandPlotDto) {
    const tenant = await this.tenant.requireTenant(u.sub);
    return this.landPlots.create(tenant.id, dto.polygon as GeoJsonPolygon, dto.captureMethod);
  }

  @Get("land-plots")
  async listLandPlots(@CurrentUser() u: JwtPayload) {
    const tenant = await this.tenant.requireTenant(u.sub);
    return this.landPlots.findAll(tenant.id);
  }

  @Get("land-plots/:id")
  async getLandPlot(@CurrentUser() u: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenant.requireTenant(u.sub);
    return this.landPlots.findOne(tenant.id, id);
  }
}

/** Daftar zona bersifat publik — dibutuhkan onboarding Tenant DAN pilih kota pembeli (FR-2.1). */
@Controller("zones")
export class ZoneController {
  constructor(private readonly tenant: TenantService) {}

  @Get()
  list() {
    return this.tenant.listZones();
  }
}
