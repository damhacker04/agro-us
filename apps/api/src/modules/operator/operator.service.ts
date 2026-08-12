import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AnchorAuditItem,
  OperatorEscrowSummary,
  SatelliteReviewItem,
  UpsertCommodityBody,
  UpsertZoneBody,
  VerificationStatus,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { TimelineService } from "../timeline/timeline.service";

/**
 * Layanan konsol operator — tinjauan & tata kelola lintas-Tenant.
 *
 * Semua yang di sini SENGAJA read-heavy kecuali empat aksi: memutuskan status
 * verifikasi satelit, dan mengelola zona & komoditas. Operator tidak diberi jalan
 * mengubah angka transaksi: ledger escrow append-only, dan koreksinya berupa entri
 * baru lewat alur klaim, bukan lewat sunting di konsol.
 */
@Injectable()
export class OperatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Posisi escrow seluruh Tenant (OP-07).
   *
   * "Tertahan" dihitung dengan aturan yang sama seperti dashboard Tenant: HOLD masuk,
   * SEMUA jenis lain keluar. Memakai daftar-putih jenis-yang-keluar pernah membuat
   * angkanya menggelembung setiap ada jenis entri baru yang lupa didaftarkan.
   */
  async escrow(): Promise<OperatorEscrowSummary> {
    const rows = await this.prisma.$queryRaw<
      Array<{ tenant_id: string; company_name: string; entry_type: string; total: number }>
    >`
      SELECT e.tenant_id::text, t.company_name, e.entry_type::text, SUM(e.amount)::float8 AS total
      FROM escrow_ledger e
      JOIN tenants t ON t.id = e.tenant_id
      GROUP BY 1, 2, 3
    `;

    const jumlah = (jenis: string) =>
      rows.filter((r) => r.entry_type === jenis).reduce((s, r) => s + Number(r.total), 0);

    // Berapa banyak yang sudah dibukukan cair tetapi instruksinya BELUM sukses.
    // Selama mitra pembayaran belum tersambung (§5.7.1), angka ini seharusnya sama dengan
    // seluruh pencairan — dan itulah yang ingin terlihat, bukan disembunyikan.
    const tertunda = await this.prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(amount), 0)::float8 AS total
      FROM escrow_ledger
      WHERE entry_type IN ('RELEASE', 'RELEASE30') AND settlement_status <> 'SUCCESS'
    `;

    const totalDitahan = jumlah("HOLD");
    const keluar = rows
      .filter((r) => r.entry_type !== "HOLD")
      .reduce((s, r) => s + Number(r.total), 0);

    const perTenantMap = new Map<
      string,
      { tenantId: string; companyName: string; ditahan: number; keluar: number; dicairkan: number }
    >();
    for (const r of rows) {
      const cur =
        perTenantMap.get(r.tenant_id) ??
        {
          tenantId: r.tenant_id,
          companyName: r.company_name,
          ditahan: 0,
          keluar: 0,
          dicairkan: 0,
        };
      if (r.entry_type === "HOLD") cur.ditahan += Number(r.total);
      else {
        cur.keluar += Number(r.total);
        if (r.entry_type === "RELEASE" || r.entry_type === "RELEASE30") {
          cur.dicairkan += Number(r.total);
        }
      }
      perTenantMap.set(r.tenant_id, cur);
    }

    return {
      tertahan: Math.round(totalDitahan - keluar),
      totalDitahan: Math.round(totalDitahan),
      totalDicairkan: Math.round(jumlah("RELEASE") + jumlah("RELEASE30")),
      menungguPenyaluran: Math.round(Number(tertunda[0]?.total ?? 0)),
      totalPotonganKlaim: Math.round(jumlah("POTONG_KLAIM")),
      totalRefund: Math.round(jumlah("REFUND")),
      totalBiayaBatal: Math.round(jumlah("BIAYA_BATAL10")),
      totalAlihSubstitusi: Math.round(jumlah("ALIH_SUBSTITUSI")),
      perTenant: [...perTenantMap.values()]
        .map((t) => ({
          tenantId: t.tenantId,
          companyName: t.companyName,
          tertahan: Math.round(t.ditahan - t.keluar),
          ditahan: Math.round(t.ditahan),
          dicairkan: Math.round(t.dicairkan),
        }))
        .sort((a, b) => b.tertahan - a.tertahan),
    };
  }

  /**
   * Audit jangkar hash (OP-08).
   *
   * `matchesCurrent` dihitung dengan MENGHITUNG ULANG rantai dari isi node saat ini dan
   * membandingkannya dengan root yang dijangkarkan — bukan dengan membaca kolom hash
   * tersimpan. Membandingkan hash tersimpan dengan hash tersimpan tidak membuktikan apa
   * pun: keduanya akan tetap cocok meski isinya sudah diubah.
   */
  async anchors(limit = 50): Promise<AnchorAuditItem[]> {
    const rows = await this.prisma.hashAnchor.findMany({
      orderBy: { anchorDate: "desc" },
      take: limit,
      include: {
        batch: {
          include: { product: { include: { tenant: { select: { companyName: true } } } } },
        },
      },
    });

    return Promise.all(
      rows.map(async (a) => {
        const v = await this.timeline.verifyChain(a.batchId);
        return {
          batchId: a.batchId,
          productName: a.batch.product.name,
          tenantName: a.batch.product.tenant.companyName,
          anchorDate: a.anchorDate.toISOString().slice(0, 10),
          rootHash: a.rootHash,
          externalRef: a.externalRef,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          matchesCurrent: v.intact && v.rootHash === a.rootHash,
          nodeCount: v.nodeCount,
        };
      }),
    );
  }

  /**
   * Batch yang menunggu tinjauan manusia (OP-04).
   *
   * PERLU_DITINJAU dan TIDAK_SESUAI muncul saat pipeline satelit menemukan
   * ketidaksesuaian antara klaim Tenant dan citra — keduanya berdampak langsung pada
   * badge yang dilihat pembeli, jadi tidak boleh menggantung tanpa diputus.
   */
  async satelliteQueue(): Promise<SatelliteReviewItem[]> {
    const rows = await this.prisma.batch.findMany({
      where: { verificationStatus: { in: ["PERLU_DITINJAU", "TIDAK_SESUAI"] } },
      orderBy: { claimedHarvestDate: "asc" },
      include: {
        landPlot: { select: { id: true, areaHa: true } },
        product: { include: { tenant: { select: { companyName: true } } } },
      },
    });

    return Promise.all(
      rows.map(async (b) => {
        const obs = await this.prisma.satelliteObservation.groupBy({
          by: ["usable"],
          where: { landPlotId: b.landPlotId },
          _count: { _all: true },
        });
        const total = obs.reduce((s, o) => s + o._count._all, 0);
        const terpakai = obs.find((o) => o.usable)?._count._all ?? 0;
        const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);

        return {
          batchId: b.id,
          productName: b.product.name,
          tenantName: b.product.tenant.companyName,
          landPlotId: b.landPlot.id,
          landPlotAreaHa: Number(b.landPlot.areaHa),
          verificationStatus: b.verificationStatus,
          claimedHarvestDate: d(b.claimedHarvestDate)!,
          claimedPlantDate: d(b.claimedPlantDate),
          detectedPlantDate: d(b.detectedPlantDate),
          detectedHarvestDate: d(b.detectedHarvestDate),
          observationCount: total,
          usableObservationCount: terpakai,
        };
      }),
    );
  }

  async decideSatellite(batchId: string, status: VerificationStatus) {
    const ada = await this.prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!ada) throw new NotFoundException("Batch tidak ditemukan");

    const b = await this.prisma.batch.update({
      where: { id: batchId },
      data: { verificationStatus: status },
      select: { id: true, verificationStatus: true },
    });
    return { batchId: b.id, verificationStatus: b.verificationStatus };
  }

  // ---------- Zona & komoditas ----------

  listZones() {
    return this.prisma.zone.findMany({ orderBy: { name: "asc" } });
  }

  createZone(dto: UpsertZoneBody) {
    return this.prisma.zone.create({ data: dto });
  }

  async updateZone(id: string, dto: Partial<UpsertZoneBody>) {
    const ada = await this.prisma.zone.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException("Zona tidak ditemukan");
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  listCommodities() {
    return this.prisma.commodity.findMany({ orderBy: { name: "asc" } });
  }

  createCommodity(dto: UpsertCommodityBody) {
    return this.prisma.commodity.create({
      data: { ...dto, gradeStandards: (dto.gradeStandards ?? {}) as object },
    });
  }

  async updateCommodity(id: string, dto: Partial<UpsertCommodityBody>) {
    const ada = await this.prisma.commodity.findUnique({ where: { id }, select: { id: true } });
    if (!ada) throw new NotFoundException("Komoditas tidak ditemukan");
    const { gradeStandards, ...sisa } = dto;
    return this.prisma.commodity.update({
      where: { id },
      data: { ...sisa, ...(gradeStandards !== undefined && { gradeStandards: gradeStandards as object }) },
    });
  }
}
