import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  PAYMENT_EXPIRY_MS,
  SHIPPING_COST_PER_PLAN,
  type CheckoutResponse,
  type OrderSummary,
  type PreviewOrderResponse,
  type ShipmentPlan,
  type ShipmentPlanLine,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { BuyerService } from "../buyer/buyer.service";
import { PaymentService } from "./payment.service";
import type { CartLineDto, CheckoutDto } from "./order.dto";

/** Batch yang masih boleh dijual. */
const SELLABLE = ["PLANNING", "GROWING"] as const;

interface ResolvedLine extends ShipmentPlanLine {
  tenantId: string;
  harvestWeek: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buyers: BuyerService,
    private readonly payments: PaymentService,
  ) {}

  /** Senin dari minggu panen — kunci pengelompokan Rencana Pengiriman (FR-2.4). */
  private harvestWeekOf(d: Date): string {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = (x.getUTCDay() + 6) % 7; // Senin = 0
    x.setUTCDate(x.getUTCDate() - dow);
    return x.toISOString().slice(0, 10);
  }

  /**
   * Ubah baris keranjang menjadi baris terverifikasi: batch ada, masih dijual,
   * Tenant melayani zona pembeli, dan kuota mencukupi.
   *
   * Harga diambil dari `lockedPrice` BATCH, bukan dari klien maupun harga katalog
   * produk — inilah yang membuat "harga terkunci" (FR-3.3) benar-benar mengikat.
   */
  private async resolveLines(lines: CartLineDto[], zoneId: string): Promise<ResolvedLine[]> {
    const ids = [...new Set(lines.map((l) => l.batchId))];
    if (ids.length !== lines.length) {
      throw new BadRequestException({
        code: "CART_DUPLICATE_BATCH",
        message: "Ada batch yang muncul lebih dari sekali di keranjang. Gabungkan jumlahnya.",
      });
    }

    const batches = await this.prisma.batch.findMany({
      where: { id: { in: ids } },
      include: {
        product: {
          include: {
            tenant: { select: { id: true, companyName: true, tenantZones: { select: { zoneId: true } } } },
          },
        },
      },
    });
    const byId = new Map(batches.map((b) => [b.id, b]));

    return lines.map((line) => {
      const b = byId.get(line.batchId);
      if (!b) throw new NotFoundException({ code: "BATCH_NOT_FOUND", message: `Produk tidak ditemukan: ${line.batchId}` });

      if (!SELLABLE.includes(b.productionStatus as (typeof SELLABLE)[number])) {
        throw new ConflictException({
          code: "BATCH_NOT_SELLABLE",
          message: `"${b.product.name}" sudah tidak dijual (status ${b.productionStatus}).`,
        });
      }
      if (!b.product.tenant.tenantZones.some((z) => z.zoneId === zoneId)) {
        throw new BadRequestException({
          code: "TENANT_OUT_OF_ZONE",
          message: `"${b.product.name}" tidak melayani kota Anda.`,
        });
      }
      const available = b.quotaBoxTotal - b.quotaBoxSold;
      if (line.qtyBox > available) {
        throw new ConflictException({
          code: "QUOTA_INSUFFICIENT",
          message: `Kuota "${b.product.name}" tinggal ${available} box, diminta ${line.qtyBox}.`,
          available,
        });
      }

      return {
        batchId: b.id,
        productName: b.product.name,
        tenantName: b.product.tenant.companyName,
        tenantId: b.product.tenant.id,
        grade: b.product.grade,
        qtyBox: line.qtyBox,
        unitPriceLocked: b.lockedPrice,
        subtotal: b.lockedPrice * line.qtyBox,
        qtyKgPerBox: Number(b.product.qtyKgPerBox),
        claimedHarvestDate: b.claimedHarvestDate.toISOString().slice(0, 10),
        harvestWeek: this.harvestWeekOf(b.claimedHarvestDate),
      };
    });
  }

  /**
   * Kelompokkan jadi Rencana Pengiriman per minggu panen (FR-2.4).
   *
   * Minimum order dicek PER RENCANA, bukan per total order — karena ongkir juga
   * timbul per pengiriman. Kalau dicek per total, order Rp3jt yang pecah jadi
   * 3 pengiriman @Rp1jt tetap lolos padahal tiap pengirimannya merugi (Risiko 3).
   */
  private buildPlans(lines: ResolvedLine[], minOrderValue: number): ShipmentPlan[] {
    const groups = new Map<string, ResolvedLine[]>();
    for (const l of lines) {
      const g = groups.get(l.harvestWeek) ?? [];
      g.push(l);
      groups.set(l.harvestWeek, g);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([harvestWeek, gl]) => {
        const subtotal = gl.reduce((s, l) => s + l.subtotal, 0);
        return {
          harvestWeek,
          // Pengiriman menunggu item yang panen paling lambat dalam grup.
          readyDate: gl.map((l) => l.claimedHarvestDate).sort().at(-1)!,
          lines: gl.map(({ tenantId: _t, harvestWeek: _w, ...rest }) => rest),
          subtotal,
          shippingCost: SHIPPING_COST_PER_PLAN,
          minOrderValue,
          meetsMinimum: subtotal >= minOrderValue,
          shortfallToMinimum: Math.max(minOrderValue - subtotal, 0),
        };
      });
  }

  /** POST /orders/preview — activity A1→D1 tanpa menyimpan apa pun. */
  async preview(userId: string, lines: CartLineDto[]): Promise<PreviewOrderResponse> {
    const buyer = await this.buyers.requireBuyer(userId);
    if (!buyer.activeZoneId) {
      throw new BadRequestException({ code: "ZONE_NOT_SELECTED", message: "Pilih kota layanan dulu." });
    }
    const zone = await this.prisma.zone.findUniqueOrThrow({ where: { id: buyer.activeZoneId } });
    const resolved = await this.resolveLines(lines, zone.id);
    const plans = this.buildPlans(resolved, zone.minOrderValue);

    const itemsTotal = plans.reduce((s, p) => s + p.subtotal, 0);
    const shippingTotal = plans.reduce((s, p) => s + p.shippingCost, 0);
    return {
      plans,
      itemsTotal,
      shippingTotal,
      grandTotal: itemsTotal + shippingTotal,
      canCheckout: plans.every((p) => p.meetsMinimum),
    };
  }

  /** POST /orders/checkout — activity A3 (reservasi kuota) → A4 (terbitkan tagihan). */
  async checkout(userId: string, dto: CheckoutDto): Promise<CheckoutResponse> {
    // Lepas dulu reservasi tagihan yang sudah kedaluwarsa (activity A5) supaya
    // kuota yang tertahan sia-sia bisa dipakai pembeli ini.
    await this.payments.expireStale();

    const buyer = await this.buyers.requireBuyer(userId);
    if (!buyer.activeZoneId) {
      throw new BadRequestException({ code: "ZONE_NOT_SELECTED", message: "Pilih kota layanan dulu." });
    }
    const zone = await this.prisma.zone.findUniqueOrThrow({ where: { id: buyer.activeZoneId } });
    const resolved = await this.resolveLines(dto.lines, zone.id);
    const plans = this.buildPlans(resolved, zone.minOrderValue);

    const failing = plans.filter((p) => !p.meetsMinimum);
    if (failing.length) {
      throw new BadRequestException({
        code: "MIN_ORDER_NOT_MET",
        message:
          `Ada ${failing.length} rencana pengiriman di bawah minimum ${zone.name} ` +
          `(Rp${zone.minOrderValue.toLocaleString("id-ID")}). Tambah item agar ongkir efisien.`,
        plans: failing.map((p) => ({ harvestWeek: p.harvestWeek, subtotal: p.subtotal, shortfall: p.shortfallToMinimum })),
      });
    }

    const itemsTotal = plans.reduce((s, p) => s + p.subtotal, 0);
    const shippingTotal = plans.reduce((s, p) => s + p.shippingCost, 0);
    const reportFee = dto.includeTraceabilityReport ? 25_000 : 0; // FR-2.10, dibundel di tagihan
    const totalAmount = itemsTotal + shippingTotal + reportFee;

    const { orderId, shipmentIds } = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { buyerId: buyer.id, totalAmount, orderStatus: "DRAFT" },
      });

      const shipmentIds: string[] = [];
      for (const plan of plans) {
        // Shipment punya kolom geometry → harus lewat raw SQL.
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO shipments (order_id, zone_id, dest_point, receiving_hours, status)
          VALUES (
            ${order.id}::uuid,
            ${zone.id}::uuid,
            ST_SetSRID(ST_MakePoint(${dto.delivery.point.lng}, ${dto.delivery.point.lat}), 4326),
            ${dto.delivery.receivingHours},
            'MENUNGGU_PANEN'::"ShipmentStatus"
          )
          RETURNING id::text
        `;
        const shipmentId = rows[0]!.id;
        shipmentIds.push(shipmentId);

        for (const line of plan.lines) {
          // Reservasi kuota ATOMIK. Syarat `sold + qty <= total` ikut di WHERE supaya
          // dua pembeli yang checkout bersamaan tidak bisa sama-sama menang.
          // CHECK di level DB jadi jaring pengaman terakhir.
          const reserved = await tx.$executeRaw`
            UPDATE batches
            SET quota_box_sold = quota_box_sold + ${line.qtyBox}
            WHERE id = ${line.batchId}::uuid
              AND quota_box_sold + ${line.qtyBox} <= quota_box_total
          `;
          if (reserved !== 1) {
            throw new ConflictException({
              code: "QUOTA_RACE_LOST",
              message: `Kuota "${line.productName}" keburu habis. Kurangi jumlah atau pilih produk lain.`,
            });
          }

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              shipmentId,
              batchId: line.batchId,
              qtyBox: line.qtyBox,
              unitPriceLocked: line.unitPriceLocked,
              subtotal: line.subtotal,
            },
          });
        }
      }

      if (dto.includeTraceabilityReport) {
        await tx.traceabilityReport.create({
          data: { buyerId: buyer.id, shipmentId: shipmentIds[0]!, price: reportFee },
        });
      }

      return { orderId: order.id, shipmentIds };
    });

    const payment = await this.payments.createInvoice(orderId, dto.paymentMethod, totalAmount);
    return { orderId, totalAmount, payment, shipmentIds };
  }

  async listOrders(userId: string): Promise<OrderSummary[]> {
    const buyer = await this.buyers.requireBuyer(userId);
    const orders = await this.prisma.order.findMany({
      where: { buyerId: buyer.id },
      include: {
        payments: { orderBy: { expiresAt: "desc" }, take: 1 },
        shipments: { include: { _count: { select: { items: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      orders.map(async (o) => ({
        id: o.id,
        orderStatus: o.orderStatus,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt.toISOString(),
        payment: o.payments[0]
          ? {
              status: o.payments[0].status,
              method: o.payments[0].method,
              expiresAt: o.payments[0].expiresAt.toISOString(),
            }
          : null,
        shipments: await Promise.all(
          o.shipments.map(async (s) => ({
            id: s.id,
            status: s.status,
            readyDate: await this.readyDateOf(s.id),
            itemCount: s._count.items,
          })),
        ),
      })),
    );
  }

  private async readyDateOf(shipmentId: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ d: Date | null }>>`
      SELECT MAX(b.claimed_harvest_date) AS d
      FROM order_items oi JOIN batches b ON b.id = oi.batch_id
      WHERE oi.shipment_id = ${shipmentId}::uuid
    `;
    return rows[0]?.d ? rows[0].d.toISOString().slice(0, 10) : "";
  }

  /** Nomor tagihan yang mudah dibaca manusia saat rekonsiliasi. */
  static newInvoiceRef(): string {
    const d = new Date();
    const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
    return `AGR-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}
