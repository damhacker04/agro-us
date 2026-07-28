import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MIN_LAND_PLOT_HA, type GeoJsonPolygon, type LandPlotResponse } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Poligon lahan (FR-1.5/1.6). Kolom `polygon` bertipe PostGIS `geometry` yang tidak
 * didukung Prisma Client, jadi seluruh baca/tulis di sini lewat $queryRaw.
 *
 * PRINSIP: luas TIDAK PERNAH dipercaya dari klien — selalu dihitung server dengan
 * ST_Area(::geography). Angka ini yang nantinya membatasi kuota PO 70% (FR-3.3),
 * jadi kalau bisa dikirim klien, Tenant bisa mengarang kapasitas lahannya.
 */
@Injectable()
export class LandPlotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Terjemahkan alasan teknis PostGIS jadi kalimat yang bisa dipahami Tenant di kebun.
   * PRD §9: hindari istilah teknis di antarmuka Tenant — jangan bocorkan teks exception mentah.
   */
  private humanizeReason(reason: string | null): { code: string; message: string } {
    const r = reason ?? "";
    if (/closed linestring|not closed/i.test(r)) {
      return {
        code: "POLYGON_NOT_CLOSED",
        message: "Batas lahan belum tersambung. Pastikan titik terakhir kembali ke titik awal.",
      };
    }
    if (/self-?intersection/i.test(r)) {
      return {
        code: "POLYGON_SELF_INTERSECT",
        message: "Garis batas lahan saling berpotongan. Gambar ulang tanpa menyilang.",
      };
    }
    if (/too few points|must have at least/i.test(r)) {
      return {
        code: "POLYGON_TOO_FEW_POINTS",
        message: "Titik batas terlalu sedikit. Butuh minimal 3 sudut lahan.",
      };
    }
    return { code: "POLYGON_INVALID", message: "Bentuk batas lahan tidak wajar. Silakan gambar ulang." };
  }

  /** Validasi geometri + hitung luas dalam satu perjalanan ke PostGIS. */
  private async inspectPolygon(polygon: GeoJsonPolygon) {
    // Cek murah dulu di aplikasi supaya pesannya pasti ramah, tanpa menunggu PostGIS.
    const ring = polygon.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new BadRequestException({
        code: "POLYGON_TOO_FEW_POINTS",
        message: "Titik batas terlalu sedikit. Butuh minimal 3 sudut lahan.",
      });
    }
    const [first, last] = [ring[0]!, ring[ring.length - 1]!];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new BadRequestException({
        code: "POLYGON_NOT_CLOSED",
        message: "Batas lahan belum tersambung. Pastikan titik terakhir kembali ke titik awal.",
      });
    }

    const geojson = JSON.stringify(polygon);

    let rows: Array<{ valid: boolean; reason: string | null; gtype: string; area_ha: string }>;
    try {
      rows = await this.prisma.$queryRaw`
        SELECT
          ST_IsValid(g)            AS valid,
          ST_IsValidReason(g)      AS reason,
          ST_GeometryType(g)       AS gtype,
          (ST_Area(g::geography) / 10000.0)::numeric(12,4) AS area_ha
        FROM ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) AS g
      `;
    } catch {
      // ST_GeomFromGeoJSON melempar kalau strukturnya bukan GeoJSON yang dikenali.
      throw new BadRequestException({
        code: "POLYGON_MALFORMED",
        message: "Format GeoJSON poligon tidak dikenali.",
      });
    }

    const row = rows[0];
    if (!row) {
      throw new BadRequestException({ code: "POLYGON_MALFORMED", message: "Poligon tidak dapat dibaca." });
    }
    if (row.gtype !== "ST_Polygon") {
      throw new BadRequestException({
        code: "POLYGON_WRONG_TYPE",
        message: `Geometri harus Polygon, diterima ${row.gtype.replace("ST_", "")}.`,
      });
    }
    if (!row.valid) {
      // Paling sering: ring saling potong (Tenant menggambar bentuk angka 8).
      throw new BadRequestException(this.humanizeReason(row.reason));
    }

    const areaHa = Number(row.area_ha);
    if (!Number.isFinite(areaHa) || areaHa <= 0) {
      throw new BadRequestException({ code: "POLYGON_ZERO_AREA", message: "Luas poligon nol." });
    }
    return { areaHa };
  }

  async create(tenantId: string, polygon: GeoJsonPolygon, captureMethod: "GAMBAR_PETA" | "WALK_AROUND") {
    const { areaHa } = await this.inspectPolygon(polygon);

    // FR-1.6 — di bawah 0,1 ha resolusi Sentinel-2 tidak andal. Lahan tetap boleh
    // didaftarkan, tapi ditandai TERBATAS dan ditampilkan apa adanya ke pembeli.
    const verificationTier = areaHa < MIN_LAND_PLOT_HA ? "TERBATAS" : "NORMAL";
    const geojson = JSON.stringify(polygon);

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO land_plots (tenant_id, polygon, area_ha, capture_method, verification_tier)
      VALUES (
        ${tenantId}::uuid,
        ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
        ${areaHa},
        ${captureMethod}::"CaptureMethod",
        ${verificationTier}::"VerificationTier"
      )
      RETURNING id::text
    `;
    return this.findOne(tenantId, rows[0]!.id);
  }

  async findAll(tenantId: string): Promise<LandPlotResponse[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; polygon: string; area_ha: string; capture_method: string; verification_tier: string }>
    >`
      SELECT id::text, ST_AsGeoJSON(polygon) AS polygon, area_ha,
             capture_method::text, verification_tier::text
      FROM land_plots
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY area_ha DESC
    `;
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(tenantId: string, id: string): Promise<LandPlotResponse> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; polygon: string; area_ha: string; capture_method: string; verification_tier: string }>
    >`
      SELECT id::text, ST_AsGeoJSON(polygon) AS polygon, area_ha,
             capture_method::text, verification_tier::text
      FROM land_plots
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    const row = rows[0];
    if (!row) throw new NotFoundException("Lahan tidak ditemukan");
    return this.toResponse(row);
  }

  private toResponse(r: {
    id: string;
    polygon: string;
    area_ha: string;
    capture_method: string;
    verification_tier: string;
  }): LandPlotResponse {
    return {
      id: r.id,
      polygon: JSON.parse(r.polygon) as GeoJsonPolygon,
      areaHa: Number(r.area_ha),
      captureMethod: r.capture_method as LandPlotResponse["captureMethod"],
      verificationTier: r.verification_tier as LandPlotResponse["verificationTier"],
    };
  }
}
