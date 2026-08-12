import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { CurrentUser, JwtAuthGuard } from "../auth/auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import type { JwtPayload } from "../auth/auth.service";
import { TenantService } from "../tenant/tenant.service";
import { TimelineService, type UploadedPhoto } from "./timeline.service";
import { AnchorService } from "./anchor.service";
import { NdviService } from "./ndvi.service";
import { CreateNodeDto, DeclareHarvestDto } from "./timeline.dto";
import { HarvestService } from "./harvest.service";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB — foto ponsel tanpa kompresi ulang

/** Multer menerima berkas apa pun; tipe gambar diperiksa di sini sebelum menyentuh disk. */
function bacaFoto(files: Express.Multer.File[]): UploadedPhoto[] {
  return files.map((f) => {
    if (!f.mimetype.startsWith("image/")) {
      throw new BadRequestException({
        code: "PHOTO_NOT_IMAGE",
        message: `Berkas "${f.originalname}" bukan gambar.`,
      });
    }
    return { buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype, size: f.size };
  });
}

/** Sisi Tenant: HANYA menambah node. Tidak ada endpoint ubah/hapus (FR-4.1). */
@Controller("tenant/batches/:batchId/timeline")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantTimelineController {
  constructor(
    private readonly tenant: TenantService,
    private readonly timeline: TimelineService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor("photos", MAX_PHOTOS, {
      limits: { fileSize: MAX_PHOTO_BYTES },
    }),
  )
  async append(
    @CurrentUser() u: JwtPayload,
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: CreateNodeDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const t = await this.tenant.requireTenant(u.sub);

    return this.timeline.appendNode(t.id, batchId, dto, bacaFoto(files));
  }

  @Get()
  async list(@CurrentUser() u: JwtPayload, @Param("batchId", ParseUUIDPipe) batchId: string) {
    await this.tenant.requireTenant(u.sub);
    return this.timeline.listNodes(batchId);
  }
}

/**
 * Alur panen dua langkah (sequence 04b) — TN-19 → TN-19b/19c → TN-19a.
 *
 * Terpisah dari controller node timeline di atas supaya jalur lama tetap utuh selama
 * jalur ini belum terverifikasi di produksi.
 */
@Controller("tenant/batches/:batchId/harvest")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT")
export class TenantHarvestController {
  constructor(
    private readonly tenant: TenantService,
    private readonly harvest: HarvestService,
  ) {}

  /** Langkah 1 — menilai dan memperagakan dampak. Tidak menulis timeline. */
  @Post()
  @HttpCode(200)
  async declare(
    @CurrentUser() u: JwtPayload,
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: DeclareHarvestDto,
  ) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.harvest.declare(t.id, batchId, dto.actualBox);
  }

  /** Langkah 2 — konfirmasi: node timeline + alokasi + penalti. */
  @Post("confirm")
  @UseInterceptors(FilesInterceptor("photos", MAX_PHOTOS, { limits: { fileSize: MAX_PHOTO_BYTES } }))
  async confirm(
    @CurrentUser() u: JwtPayload,
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: CreateNodeDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const t = await this.tenant.requireTenant(u.sub);
    return this.harvest.confirm(t.id, batchId, dto, bacaFoto(files));
  }
}

/**
 * Timeline & bukti integritas bersifat PUBLIK — pembeli (dan siapa pun) harus bisa
 * memverifikasi sendiri tanpa mempercayai kata AgroUs (§6.1).
 */
@Controller("batches/:batchId")
export class PublicTimelineController {
  constructor(
    private readonly timeline: TimelineService,
    private readonly anchorSvc: AnchorService,
    private readonly ndvi: NdviService,
  ) {}

  /** BY-03a — Verified Timeline yang dilihat pembeli. */
  @Get("timeline")
  list(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.timeline.listNodes(batchId);
  }

  /** Hitung ulang seluruh rantai hash dan laporkan apakah utuh. */
  @Get("timeline/verify")
  verify(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.timeline.verifyChain(batchId);
  }

  /** BY-03b & TN-15 — deret NDVI/NDMI beserta klaim vs deteksi (FR-4.6). */
  @Get("ndvi")
  ndviSeries(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.ndvi.forBatch(batchId);
  }

  /** Riwayat root hash harian (§6.1). */
  @Get("anchors")
  listAnchors(@Param("batchId", ParseUUIDPipe) batchId: string) {
    return this.anchorSvc.listForBatch(batchId);
  }
}

@Controller("anchors")
export class AnchorController {
  constructor(private readonly anchors: AnchorService) {}

  /** Target cron harian — hitung & simpan root hash tiap batch. */
  @Post("run")
  @HttpCode(200)
  run() {
    return this.anchors.anchorAll();
  }
}
