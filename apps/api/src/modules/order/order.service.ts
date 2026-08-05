import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  toVerificationBadge,
  type BuyerOrderDetail,
  PAYMENT_EXPIRY_MS,
  SHIPPING_COST_PER_PLAN,
  type CheckoutResponse,
  type OrderSummary,
  type PreviewOrderResponse,
  type ShipmentPlan,
  type ShipmentPlanLine,
} from "@agro-os/shared";
import { DemandSignalService } from "../intelligence/demand-signal.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BuyerService } from "../buyer/buyer.service";
import { PaymentService } from "./payment.service";
import type { CartLineDto, CheckoutDto } from "./order.dto";

/** Batch yang masih boleh dijual. */
const SELLABLE = ["PLANNING", "GROWING"] as const;

interface ResolvedLine extends ShipmentPlanLine {
  tenantId: string;
  harvestWeek: string;
  /** Dibawa sampai checkout supaya kekalahan rebutan kuota bisa dicatat (FR-8.1). */
  commodityId: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buyers: BuyerService,
    private readonly payments: PaymentService,
    private readonly signals: DemandSignalService,
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
        // Permintaan yang tidak terlayani — dicatat sebagai sinyal sebelum ditolak,
        // karena inilah bukti paling langsung bahwa pasokan zona ini kurang (FR-8.1).
        void this.signals.recordQuotaRaceLost(
          zoneId,
          b.product.commodityId,
          (line.qtyBox - available) * Number(b.product.qtyKgPerBox),
        );
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
        commodityId: b.product.commodityId,
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
          lines: gl.map(({ tenantId: _t, harvestWeek: _w, commodityId: _c, ...rest }) => rest),
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
    // `plan.lines` sengaja bersih dari field internal (kontrak FE), jadi komoditas
    // dicari balik lewat batchId saat perlu mencatat sinyal permintaan.
    const commodityByBatch = new Map(resolved.map((r) => [r.batchId, r.commodityId]));

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
          INSERT INTO shipments (order_id, zone_id, dest_point, recipient_name, recipient_phone,
                                 landmark, receiving_hours, status)
          VALUES (
            ${order.id}::uuid,
            ${zone.id}::uuid,
            ST_SetSRID(ST_MakePoint(${dto.delivery.point.lng}, ${dto.delivery.point.lat}), 4326),
            ${dto.delivery.recipientName},
            ${dto.delivery.phone},
            ${dto.delivery.landmark ?? null},
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
            // Dicatat di luar transaksi (koneksi Prisma tersendiri) supaya sinyalnya
            // tetap tersimpan meski checkout ini rollback.
            const commodityId = commodityByBatch.get(line.batchId);
            if (commodityId) {
              void this.signals.recordQuotaRaceLost(
                zone.id,
                commodityId,
                line.qtyBox * line.qtyKgPerBox,
                buyer.id,
              );
            }
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
        shipments: {
          include: {
            _count: { select: { items: true } },
            // BY-09 hanya bisa menulis "3 item" tanpa ini — pembeli tidak tahu
            // pesanan mana yang mana.
            items: {
              select: {
                batch: { select: { product: { select: { name: true, tenant: { select: { companyName: true } } } } } },
              },
            },
          },
        },
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
            productNames: [...new Set(s.items.map((i) => i.batch.product.name))],
            tenantNames: [...new Set(s.items.map((i) => i.batch.product.tenant.companyName))],
          })),
        ),
      })),
    );
  }

  /**
   * BY-10 — detail satu pesanan milik pembeli ini.
   *
   * Daftar pesanan (`GET /orders`) sengaja ringkas; layar detail butuh nama produk,
   * nama Tenant, badge verifikasi, dan identitas penerima — semuanya tidak ada di
   * daftar, dan tanpa endpoint ini FE terpaksa menembak beberapa endpoint lain lalu
   * menyusunnya sendiri.
   */
  async getOrder(userId: string, orderId: string): Promise<BuyerOrderDetail> {
    const buyer = await this.buyers.requireBuyer(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: buyer.id },
      include: { payments: { orderBy: { expiresAt: "desc" }, take: 1 }, shipments: true },
    });
    if (!order) throw new NotFoundException("Pesanan tidak ditemukan");

    const shipments = await Promise.all(
      order.shipments.map(async (s) => {
        const geo = await this.prisma.$queryRaw<
          Array<{ lat: number; lng: number; recipient_name: string; recipient_phone: string; landmark: string | null; receiving_hours: string }>
        >`
          SELECT ST_Y(dest_point) AS lat, ST_X(dest_point) AS lng,
                 recipient_name, recipient_phone, landmark, receiving_hours
          FROM shipments WHERE id = ${s.id}::uuid
        `;
        const g = geo[0]!;

        const items = await this.prisma.orderItem.findMany({
          where: { shipmentId: s.id },
          select: {
            id: true,
            batchId: true,
            qtyBox: true,
            qtyBoxFulfilled: true,
            unitPriceLocked: true,
            subtotal: true,
            batch: {
              select: {
                verificationStatus: true,
                product: { select: { name: true, grade: true, tenant: { select: { companyName: true } } } },
              },
            },
          },
        });

        return {
          shipmentId: s.id,
          status: s.status,
          readyDate: await this.readyDateOf(s.id),
          recipient: {
            name: g.recipient_name,
            phone: g.recipient_phone,
            landmark: g.landmark,
            receivingHours: g.receiving_hours,
          },
          destination: { lat: Number(g.lat), lng: Number(g.lng) },
          arrivedAt: s.arrivedAt?.toISOString() ?? null,
          claimWindowEndsAt: s.claimWindowEndsAt?.toISOString() ?? null,
          lines: items.map((i) => ({
            orderItemId: i.id,
            batchId: i.batchId,
            productName: i.batch.product.name,
            tenantName: i.batch.product.tenant.companyName,
            grade: i.batch.product.grade,
            qtyBox: i.qtyBox,
            qtyBoxFulfilled: i.qtyBoxFulfilled,
            unitPriceLocked: i.unitPriceLocked,
            subtotal: i.subtotal,
            badge: toVerificationBadge(i.batch.verificationStatus),
          })),
        };
      }),
    );

    return {
      orderId: order.id,
      orderStatus: order.orderStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
      payment: order.payments[0]
        ? {
            status: order.payments[0].status,
            method: order.payments[0].method,
            expiresAt: order.payments[0].expiresAt.toISOString(),
          }
        : null,
      shipments,
    };
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
