import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  CLAIM_AUTO_SETTLE_MAX_PCT,
  CLAIM_REVIEW_SLA_HOURS,
  ClaimFinalStatus,
  type ClaimResponse,
  type ClaimRoute,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";

/** Klien di dalam $transaction — tipe resmi Prisma, bukan bentuk struktural buatan sendiri. */
type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * Modul Mutu, Susut & Klaim (§5.5).
 *
 * PRD menyebut modul ini "penyebab kegagalan paling umum pada platform sejenis":
 * komoditas segar tidak pernah datang seragam, dan seluruh hubungan dagang B2B
 * pada akhirnya bergantung pada bagaimana selisih itu diselesaikan.
 */
@Injectable()
export class ClaimService {
  private readonly log = new Logger(ClaimService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-5.4 — ajukan klaim. Seluruh angka dihitung SERVER dari berat timbang;
   * pembeli tidak pernah mengirim nilai klaim, agar tidak bisa mengarang kerugian.
   */
  async file(
    userId: string,
    shipmentId: string,
    dto: { orderItemId: string; actualWeightKg: number; photoUrl: string; description: string },
  ): Promise<ClaimResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, order: { buyer: { userId } } },
      select: { id: true, status: true, claimWindowEndsAt: true, orderId: true },
    });
    if (!shipment) throw new NotFoundException("Pengiriman tidak ditemukan");

    if (shipment.status !== "DITERIMA") {
      throw new ConflictException({
        code: "NOT_RECEIVED",
        message:
          shipment.status === "SELESAI"
            ? "Pesanan sudah selesai — jendela klaim telah berakhir."
            : "Klaim hanya bisa diajukan setelah pesanan dikonfirmasi diterima.",
      });
    }
    // FR-5.3 — lewat jendela, pesanan dianggap diterima sepenuhnya.
    if (!shipment.claimWindowEndsAt || shipment.claimWindowEndsAt < new Date()) {
      throw new ConflictException({
        code: "CLAIM_WINDOW_CLOSED",
        message: "Jendela klaim sudah berakhir. Pesanan dianggap diterima sepenuhnya.",
      });
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: dto.orderItemId, shipmentId },
      include: {
        batch: { include: { product: { include: { commodity: true, tenant: { select: { id: true } } } } } },
        order: { select: { totalAmount: true } },
      },
    });
    if (!item) {
      throw new BadRequestException({ code: "ITEM_NOT_IN_SHIPMENT", message: "Item tidak ada di pengiriman ini." });
    }

    const existing = await this.prisma.claim.findFirst({
      where: { orderItemId: dto.orderItemId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({ code: "CLAIM_EXISTS", message: "Item ini sudah pernah diklaim." });
    }

    // Jumlah yang benar-benar dikirim — bisa lebih kecil dari yang dipesan
    // bila terjadi panen sebagian (FR-7.10).
    const boxes = item.qtyBoxFulfilled ?? item.qtyBox;
    const kgPerBox = Number(item.batch.product.qtyKgPerBox);
    const expectedKg = boxes * kgPerBox;

    if (dto.actualWeightKg > expectedKg) {
      throw new BadRequestException({
        code: "WEIGHT_EXCEEDS_EXPECTED",
        message: `Berat timbang (${dto.actualWeightKg} kg) melebihi yang seharusnya dikirim (${expectedKg} kg).`,
      });
    }

    const tolerancePct = Number(item.batch.product.commodity.shrinkTolerancePct);
    const shortfallKg = round2(expectedKg - dto.actualWeightKg);
    const toleratedKg = round2((expectedKg * tolerancePct) / 100);
    // FR-5.2 — selisih DI DALAM toleransi tidak dapat diklaim. Susut adalah
    // kewajaran komoditas segar, bukan kesalahan Tenant.
    const claimableKg = round2(Math.max(shortfallKg - toleratedKg, 0));

    const pricePerKg = item.unitPriceLocked / kgPerBox;
    const claimValue = Math.round(claimableKg * pricePerKg);
    const pctOfOrder = round2((claimValue / item.order.totalAmount) * 100);

    let route: ClaimRoute;
    let finalStatus: ClaimFinalStatus;
    let slaDueAt: Date | null = null;

    if (claimableKg <= 0) {
      route = "TOLAK_TOLERANSI";
      finalStatus = ClaimFinalStatus.DITOLAK_TOLERANSI;
    } else if (pctOfOrder <= CLAIM_AUTO_SETTLE_MAX_PCT) {
      // FR-5.5 — selesai otomatis demi menjaga kecepatan operasional.
      route = "AUTO_SETTLE";
      finalStatus = ClaimFinalStatus.DISETUJUI_OTOMATIS;
    } else {
      route = "OPERATOR";
      finalStatus = ClaimFinalStatus.MENUNGGU_OPERATOR;
      slaDueAt = new Date(Date.now() + CLAIM_REVIEW_SLA_HOURS * 3600_000);
    }

    const claim = await this.prisma.$transaction(async (tx) => {
      const c = await tx.claim.create({
        data: {
          shipmentId,
          orderItemId: dto.orderItemId,
          description: dto.description,
          photoUrl: dto.photoUrl,
          actualWeightKg: dto.actualWeightKg,
          claimableKg,
          claimValue,
          pctOfOrder,
          route,
          finalStatus,
          slaDueAt,
          settledValue: route === "AUTO_SETTLE" ? claimValue : 0,
          resolvedAt: route === "OPERATOR" ? null : new Date(),
        },
      });

      if (route === "AUTO_SETTLE") {
        await this.deductEscrow(tx, shipment.orderId, shipmentId, item.batch.product.tenant.id, claimValue, c.id);
      }
      return c;
    });

    if (route !== "OPERATOR") await this.refreshClaimRatio(item.batch.product.tenant.id);

    this.log.log(
      `Klaim ${claim.id.slice(0, 8)}: ${claimableKg} kg (${pctOfOrder}%) → ${route}`,
    );
    return this.toResponse(claim.id);
  }

  /** FR-5.6 — putusan operator. Nilai disetujui boleh lebih kecil dari klaim. */
  async decide(operatorUserId: string, claimId: string, approvedValue: number, note: string): Promise<ClaimResponse> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        shipment: { select: { orderId: true } },
        orderItem: { include: { batch: { include: { product: { select: { tenantId: true } } } } } },
      },
    });
    if (!claim) throw new NotFoundException("Klaim tidak ditemukan");
    if (claim.route !== "OPERATOR") {
      throw new ConflictException({ code: "NOT_FOR_REVIEW", message: "Klaim ini tidak masuk antrean operator." });
    }
    if (claim.finalStatus !== ClaimFinalStatus.MENUNGGU_OPERATOR) {
      throw new ConflictException({ code: "ALREADY_DECIDED", message: "Klaim sudah diputus." });
    }
    if (approvedValue < 0 || approvedValue > claim.claimValue) {
      throw new BadRequestException({
        code: "APPROVED_OUT_OF_RANGE",
        message: `Nilai disetujui harus antara 0 dan ${claim.claimValue}.`,
      });
    }

    const tenantId = claim.orderItem?.batch.product.tenantId;
    if (!tenantId) throw new ConflictException({ code: "ITEM_MISSING", message: "Item klaim tidak lengkap." });

    await this.prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claimId },
        data: {
          reviewedById: operatorUserId,
          settledValue: approvedValue,
          reviewNote: note,
          finalStatus:
            approvedValue > 0 ? ClaimFinalStatus.DISETUJUI_OPERATOR : ClaimFinalStatus.DITOLAK_OPERATOR,
          resolvedAt: new Date(),
        },
      });
      if (approvedValue > 0) {
        await this.deductEscrow(tx, claim.shipment.orderId, claim.shipmentId, tenantId, approvedValue, claimId);
      }
    });

    await this.refreshClaimRatio(tenantId);
    this.log.log(`Klaim ${claimId.slice(0, 8)} diputus operator: Rp${approvedValue.toLocaleString("id-ID")}`);
    return this.toResponse(claimId);
  }

  /** Potongan escrow. Ledger append-only — koreksi selalu entri baru (§6.1). */
  private async deductEscrow(
    tx: Tx,
    orderId: string,
    shipmentId: string,
    tenantId: string,
    amount: number,
    claimId: string,
  ) {
    await tx.escrowLedgerEntry.create({
      data: { orderId, shipmentId, tenantId, entryType: "POTONG_KLAIM", amount, gatewayRef: `claim:${claimId}` },
    });
  }

  /** FR-5.7 — rasio klaim ditampilkan publik di profil Tenant sebagai mekanisme reputasi. */
  private async refreshClaimRatio(tenantId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ ratio: number | null }>>`
      WITH pengiriman AS (
        SELECT DISTINCT oi.shipment_id
        FROM order_items oi
        JOIN batches b  ON b.id = oi.batch_id
        JOIN products p ON p.id = b.product_id
        WHERE p.tenant_id = ${tenantId}::uuid
      ),
      diklaim AS (
        SELECT DISTINCT c.shipment_id
        FROM claims c
        WHERE c.shipment_id IN (SELECT shipment_id FROM pengiriman)
          -- Klaim yang ditolak karena masih dalam toleransi TIDAK dihitung:
          -- susut wajar bukan kesalahan Tenant (FR-5.2).
          AND c.final_status <> 'DITOLAK_TOLERANSI'
      )
      SELECT CASE WHEN (SELECT count(*) FROM pengiriman) = 0 THEN NULL
                  ELSE ROUND((SELECT count(*) FROM diklaim)::numeric * 100
                             / (SELECT count(*) FROM pengiriman), 2) END AS ratio
    `;
    const ratio = rows[0]?.ratio;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { claimRatioCached: ratio === null ? null : Number(ratio) },
    });
  }

  // ---------------- baca ----------------

  async listForBuyer(userId: string, shipmentId: string) {
    const ok = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, order: { buyer: { userId } } },
      select: { id: true },
    });
    if (!ok) throw new NotFoundException("Pengiriman tidak ditemukan");
    const rows = await this.prisma.claim.findMany({ where: { shipmentId }, orderBy: { createdAt: "desc" } });
    return Promise.all(rows.map((r) => this.toResponse(r.id)));
  }

  /** Antrean operator, paling mendesak (SLA terdekat) di atas. */
  async operatorQueue() {
    const rows = await this.prisma.claim.findMany({
      where: { route: "OPERATOR", finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR },
      orderBy: { slaDueAt: "asc" },
    });
    return Promise.all(
      rows.map(async (r) => ({
        ...(await this.toResponse(r.id)),
        overdue: r.slaDueAt ? r.slaDueAt < new Date() : false,
      })),
    );
  }

  private async toResponse(claimId: string): Promise<ClaimResponse> {
    const c = await this.prisma.claim.findUniqueOrThrow({
      where: { id: claimId },
      include: {
        orderItem: {
          include: { batch: { include: { product: { include: { commodity: true } } } } },
        },
      },
    });
    const item = c.orderItem!;
    const boxes = item.qtyBoxFulfilled ?? item.qtyBox;
    const kgPerBox = Number(item.batch.product.qtyKgPerBox);
    const expectedKg = round2(boxes * kgPerBox);
    const tolerancePct = Number(item.batch.product.commodity.shrinkTolerancePct);

    return {
      id: c.id,
      shipmentId: c.shipmentId,
      orderItemId: c.orderItemId!,
      productName: item.batch.product.name,
      expectedKg,
      actualWeightKg: Number(c.actualWeightKg),
      shortfallKg: round2(expectedKg - Number(c.actualWeightKg)),
      shrinkTolerancePct: tolerancePct,
      toleratedKg: round2((expectedKg * tolerancePct) / 100),
      claimableKg: Number(c.claimableKg),
      claimValue: c.claimValue,
      pctOfOrder: Number(c.pctOfOrder),
      route: c.route,
      finalStatus: c.finalStatus as ClaimResponse["finalStatus"],
      settledValue: c.settledValue ?? 0,
      slaDueAt: c.slaDueAt?.toISOString() ?? null,
      reviewNote: c.reviewNote,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
