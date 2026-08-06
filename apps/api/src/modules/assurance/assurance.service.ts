import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  CANCELLATION_FEE_PCT,
  SUBSTITUTION_PRICE_GAP_CAP_PCT,
  type CancelOrderResponse,
  type PendingAssurance,
  type ResolveAssuranceResponse,
  type SubstituteOption,
} from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AllocationService } from "./allocation.service";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/**
 * Harvest Assurance (FR-7.4 s.d. FR-7.11).
 *
 * Gagal panen adalah kejadian NORMAL dalam agrikultur, bukan pengecualian. Tanpa
 * mekanisme ini tidak ada pembeli institusional yang mau membayar di muka — dan
 * seluruh model pra-panen runtuh.
 */
@Injectable()
export class AssuranceService {
  private readonly log = new Logger(AssuranceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly allocation: AllocationService,
  ) {}

  /** Item milik pembeli yang menunggu keputusan (layar BY-11). */
  async pendingForBuyer(userId: string): Promise<PendingAssurance[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { buyer: { userId } },
        qtyBoxFulfilled: { not: null },
        assuranceResolution: null,
      },
      include: {
        shipment: { select: { id: true, zoneId: true, zone: { select: { minOrderValue: true } } } },
        batch: {
          include: {
            product: {
              include: { commodity: { select: { id: true } }, tenant: { select: { id: true, companyName: true } } },
            },
          },
        },
      },
    });

    const pending = items.filter((i) => (i.qtyBoxFulfilled ?? 0) < i.qtyBox);
    return Promise.all(pending.map((i) => this.toPending(i)));
  }

  private async toPending(item: {
    id: string;
    qtyBox: number;
    qtyBoxFulfilled: number | null;
    unitPriceLocked: number;
    shipmentId: string;
    shipment: { zoneId: string; zone: { minOrderValue: number } };
    batch: {
      id: string;
      verificationStatus: string;
      product: {
        name: string;
        commodityId: string;
        tenant: { id: string; companyName: string };
      };
    };
  }): Promise<PendingAssurance> {
    const allocated = item.qtyBoxFulfilled ?? 0;
    const shortfallBox = item.qtyBox - allocated;
    const shortfallValue = shortfallBox * item.unitPriceLocked;

    // FR-7.10 — bila porsi yang terpenuhi jatuh di bawah minimum zona, pengiriman
    // itu sendiri merugi. Tawarkan tolak-semua lebih dulu, jangan paksa parsial.
    const partialMeetsMinimum = allocated * item.unitPriceLocked >= item.shipment.zone.minOrderValue;

    const { substitutes, blockedReason } = await this.findSubstitutes(
      item.batch,
      item.shipment.zoneId,
      shortfallBox,
      item.unitPriceLocked,
    );

    return {
      orderItemId: item.id,
      shipmentId: item.shipmentId,
      productName: item.batch.product.name,
      tenantName: item.batch.product.tenant.companyName,
      qtyBox: item.qtyBox,
      allocatedBox: allocated,
      shortfallBox,
      unitPriceLocked: item.unitPriceLocked,
      shortfallValue,
      partialMeetsMinimum,
      substitutes,
      ...(blockedReason ? { substitutionBlockedReason: blockedReason } : {}),
    };
  }

  /**
   * Cari batch pengganti di zona yang sama, komoditas sama (FR-7.4).
   *
   * FR-7.11 — selisih harga ditanggung Tenant yang gagal, maksimal 10% nilai PO gagal.
   * Bila gagal panen TERVERIFIKASI satelit dan selisihnya melampaui cap, opsi substitusi
   * TIDAK ditawarkan sama sekali: lebih jujur daripada menjanjikan pengganti yang tidak
   * ada yang sanggup membiayainya. Bila gagal panen TIDAK terverifikasi (indikasi
   * side-selling), cap gugur dan Tenant menanggung selisih penuh.
   */
  private async findSubstitutes(
    failedBatch: { id: string; verificationStatus: string; product: { commodityId: string; tenant: { id: string } } },
    zoneId: string,
    shortfallBox: number,
    originalPrice: number,
  ): Promise<{ substitutes: SubstituteOption[]; blockedReason?: string }> {
    const candidates = await this.prisma.batch.findMany({
      where: {
        id: { not: failedBatch.id },
        productionStatus: { in: ["PLANNING", "GROWING"] },
        product: {
          commodityId: failedBatch.product.commodityId,
          tenantId: { not: failedBatch.product.tenant.id },
          tenant: { tenantZones: { some: { zoneId } } },
        },
      },
      include: { product: { include: { tenant: { select: { id: true, companyName: true } } } } },
      orderBy: { lockedPrice: "asc" },
      take: 10,
    });

    const failedValue = shortfallBox * originalPrice;
    const cap = Math.round((failedValue * SUBSTITUTION_PRICE_GAP_CAP_PCT) / 100);
    const verified = failedBatch.verificationStatus === "TERVERIFIKASI";

    const usable: SubstituteOption[] = [];
    let anyTooExpensive = false;

    for (const c of candidates) {
      const available = c.quotaBoxTotal - c.quotaBoxSold;
      if (available < shortfallBox) continue;

      const gap = Math.max((c.lockedPrice - originalPrice) * shortfallBox, 0);
      if (verified && gap > cap) {
        anyTooExpensive = true;
        continue;
      }
      usable.push({
        batchId: c.id,
        productName: c.product.name,
        tenantId: c.product.tenant.id,
        tenantName: c.product.tenant.companyName,
        lockedPrice: c.lockedPrice,
        availableBox: available,
        claimedHarvestDate: c.claimedHarvestDate.toISOString().slice(0, 10),
        priceGapBorneByTenant: gap,
      });
    }

    if (usable.length) return { substitutes: usable };
    if (anyTooExpensive) {
      return {
        substitutes: [],
        blockedReason:
          `Harga pengganti melampaui batas tanggungan Tenant (${SUBSTITUTION_PRICE_GAP_CAP_PCT}% = ` +
          `Rp${cap.toLocaleString("id-ID")}). Silakan pilih penjadwalan ulang atau pengembalian dana.`,
      };
    }
    return {
      substitutes: [],
      blockedReason: "Belum ada Tenant lain di zona Anda yang membuka kuota untuk komoditas ini.",
    };
  }

  /** FR-7.4 / FR-7.10 — pembeli memilih. */
  async resolve(
    userId: string,
    orderItemId: string,
    option: "SUBSTITUSI" | "JADWAL_ULANG" | "REFUND" | "TERIMA_SEBAGIAN",
    replacementBatchId?: string,
  ): Promise<ResolveAssuranceResponse> {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { buyer: { userId } } },
      include: {
        assuranceResolution: true,
        shipment: { select: { id: true, zoneId: true } },
        batch: {
          include: {
            product: {
              include: {
                tenant: { select: { id: true, companyName: true } },
                commodity: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException("Item pesanan tidak ditemukan");
    if (item.assuranceResolution) {
      throw new ConflictException({ code: "ALREADY_RESOLVED", message: "Pilihan sudah pernah dikirim." });
    }

    const allocated = item.qtyBoxFulfilled ?? 0;
    const shortfallBox = item.qtyBox - allocated;
    if (item.qtyBoxFulfilled === null || shortfallBox <= 0) {
      throw new BadRequestException({
        code: "NO_SHORTFALL",
        message: "Item ini terpenuhi seluruhnya — tidak ada yang perlu diputuskan.",
      });
    }
    if (option === "TERIMA_SEBAGIAN" && allocated === 0) {
      throw new BadRequestException({
        code: "NOTHING_ALLOCATED",
        message: "Tidak ada porsi yang bisa diterima — pilih substitusi, jadwal ulang, atau refund.",
      });
    }

    const tenantId = item.batch.product.tenant.id;
    let refunded = 0;
    let priceGap = 0;

    await this.prisma.$transaction(async (tx) => {
      switch (option) {
        case "TERIMA_SEBAGIAN":
          // Terima porsi tersedia, sisanya dikembalikan.
          refunded = shortfallBox * item.unitPriceLocked;
          await this.refund(tx, item.orderId, item.shipmentId, tenantId, refunded, orderItemId);
          break;

        case "REFUND":
          // Tolak seluruhnya — termasuk porsi yang sempat dialokasikan.
          refunded = item.qtyBox * item.unitPriceLocked;
          await tx.orderItem.update({ where: { id: orderItemId }, data: { qtyBoxFulfilled: 0 } });
          await this.refund(tx, item.orderId, item.shipmentId, tenantId, refunded, orderItemId);
          break;

        case "JADWAL_ULANG":
          // Dana TETAP ditahan di escrow untuk siklus berikutnya — tidak ada
          // pergerakan uang, jadi tidak ada entri ledger.
          break;

        case "SUBSTITUSI": {
          if (!replacementBatchId) {
            throw new BadRequestException({ code: "REPLACEMENT_REQUIRED", message: "Pilih batch pengganti." });
          }
          const { substitutes, blockedReason } = await this.findSubstitutes(
            item.batch,
            item.shipment.zoneId,
            shortfallBox,
            item.unitPriceLocked,
          );
          const chosen = substitutes.find((s) => s.batchId === replacementBatchId);
          if (!chosen) {
            throw new BadRequestException({
              code: "REPLACEMENT_UNAVAILABLE",
              message: blockedReason ?? "Batch pengganti tidak tersedia.",
            });
          }
          priceGap = chosen.priceGapBorneByTenant;

          // Kuota pengganti direservasi ATOMIK, sama seperti checkout — kalau tidak,
          // dua pembeli yang gagal panen bisa merebut kuota pengganti yang sama.
          const reserved = await tx.$executeRaw`
            UPDATE batches SET quota_box_sold = quota_box_sold + ${shortfallBox}
            WHERE id = ${replacementBatchId}::uuid
              AND quota_box_sold + ${shortfallBox} <= quota_box_total
          `;
          if (reserved !== 1) {
            throw new ConflictException({
              code: "REPLACEMENT_QUOTA_GONE",
              message: "Kuota pengganti keburu habis. Pilih opsi lain.",
            });
          }

          // Mengunci kuota saja TIDAK cukup: tanpa item pesanan pada batch pengganti,
          // alokasi FIFO di panen berikutnya tidak menemukan siapa pun sebagai pemilik
          // kuota itu, dan pembeli yang sudah membayar tidak pernah menerima barang.
          // Identitas penerima IKUT disalin. Barangnya berganti Tenant, tetapi tujuannya
          // tidak berubah — dan `recipient_name`/`recipient_phone` NOT NULL, jadi
          // melewatkannya membuat seluruh opsi substitusi gagal dengan galat 500.
          const ship = await tx.$queryRaw<Array<{ id: string }>>`
            INSERT INTO shipments (order_id, zone_id, dest_point, dest_radius_m,
                                   recipient_name, recipient_phone, landmark,
                                   receiving_hours, status)
            SELECT order_id, zone_id, dest_point, dest_radius_m,
                   recipient_name, recipient_phone, landmark,
                   receiving_hours, 'MENUNGGU_PANEN'::"ShipmentStatus"
            FROM shipments WHERE id = ${item.shipmentId}::uuid
            RETURNING id::text
          `;
          const newShipmentId = ship[0]!.id;

          // Harga TETAP harga kunci semula — selisihnya urusan Tenant yang gagal,
          // bukan urusan pembeli (FR-7.11).
          await tx.orderItem.create({
            data: {
              orderId: item.orderId,
              shipmentId: newShipmentId,
              batchId: replacementBatchId,
              qtyBox: shortfallBox,
              unitPriceLocked: item.unitPriceLocked,
              subtotal: shortfallBox * item.unitPriceLocked,
            },
          });

          // Uang ikut pindah. Tenant gagal melepas tahanan atas porsi yang tidak ia
          // kirim, DAN menanggung selisih harganya; Tenant pengganti menahan nilai
          // penuh barangnya. Tanpa ini, yang gagal tetap dibayar dan yang mengirim
          // tidak dibayar sama sekali.
          const nilaiSemula = shortfallBox * item.unitPriceLocked;
          await tx.escrowLedgerEntry.create({
            data: {
              orderId: item.orderId,
              shipmentId: item.shipmentId,
              tenantId,
              entryType: "ALIH_SUBSTITUSI",
              amount: nilaiSemula,
              gatewayRef: `substitusi:${orderItemId}`,
            },
          });
          if (priceGap > 0) {
            await tx.escrowLedgerEntry.create({
              data: {
                orderId: item.orderId,
                shipmentId: item.shipmentId,
                tenantId,
                entryType: "POTONG_KLAIM",
                amount: priceGap,
                gatewayRef: `substitusi:${orderItemId}`,
              },
            });
          }
          await tx.escrowLedgerEntry.create({
            data: {
              orderId: item.orderId,
              shipmentId: newShipmentId,
              tenantId: chosen.tenantId,
              entryType: "HOLD",
              amount: nilaiSemula + priceGap,
              gatewayRef: `substitusi:${orderItemId}`,
            },
          });
          break;
        }
      }

      await tx.assuranceResolution.create({
        data: {
          orderItemId,
          failedBatchId: item.batchId,
          chosenOption: option,
          shortfallBox,
          priceGapBorneByTenant: priceGap,
          replacementBatchId: option === "SUBSTITUSI" ? replacementBatchId! : null,
        },
      });
    });

    this.log.log(`Assurance ${orderItemId.slice(0, 8)}: ${option}, refund Rp${refunded.toLocaleString("id-ID")}`);
    return {
      orderItemId,
      option,
      shortfallBox,
      refundedValue: refunded,
      priceGapBorneByTenant: priceGap,
      message: MESSAGES[option],
    };
  }

  /**
   * FR-7.5 — pembatalan sepihak pembeli, HANYA selama Menunggu Panen.
   * Biaya 10% diteruskan penuh ke Tenant sebagai kompensasi biaya input yang
   * sudah terlanjur dikeluarkan.
   */
  async cancelOrder(userId: string, orderId: string): Promise<CancelOrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyer: { userId } },
      include: { shipments: { select: { id: true, status: true } }, items: true },
    });
    if (!order) throw new NotFoundException("Pesanan tidak ditemukan");
    if (order.orderStatus !== "PAID") {
      throw new ConflictException({ code: "NOT_CANCELLABLE", message: "Pesanan belum dibayar atau sudah ditutup." });
    }

    const sudahJalan = order.shipments.filter((s) => s.status !== "MENUNGGU_PANEN");
    if (sudahJalan.length) {
      // FR-7.6 — setelah Panen pesanan mengikat; sengketa lewat jalur klaim mutu.
      throw new ConflictException({
        code: "ALREADY_HARVESTED",
        message: "Pesanan sudah melewati tahap panen dan tidak dapat dibatalkan. Gunakan jalur klaim mutu.",
      });
    }

    // Dasar denda adalah nilai BARANG saja, bukan `totalAmount`.
    // Ongkir belum menjadi biaya siapa pun — kurir belum berangkat — jadi ongkir
    // dikembalikan utuh; kalau ikut didenda, Tenant justru kebagian uang kurir.
    const nilaiBarang = order.items.reduce((s, i) => s + i.subtotal, 0);
    const fee = Math.round((nilaiBarang * CANCELLATION_FEE_PCT) / 100);
    const refunded = order.totalAmount - fee;

    await this.prisma.$transaction(async (tx) => {
      // Lepas kuota yang sempat direservasi supaya bisa dijual lagi.
      await tx.$executeRaw`
        UPDATE batches b SET quota_box_sold = GREATEST(b.quota_box_sold - agg.qty, 0)
        FROM (SELECT batch_id, SUM(qty_box)::int AS qty FROM order_items WHERE order_id = ${orderId}::uuid GROUP BY batch_id) agg
        WHERE b.id = agg.batch_id
      `;

      // Biaya batal diteruskan ke Tenant, dibagi menurut porsi nilainya.
      const perTenant = await tx.$queryRaw<Array<{ tenant_id: string; subtotal: bigint }>>`
        SELECT p.tenant_id::text, SUM(oi.subtotal)::bigint AS subtotal
        FROM order_items oi
        JOIN batches b ON b.id = oi.batch_id
        JOIN products p ON p.id = b.product_id
        WHERE oi.order_id = ${orderId}::uuid GROUP BY p.tenant_id
      `;
      const totalItem = perTenant.reduce((s, r) => s + Number(r.subtotal), 0) || 1;

      for (const r of perTenant) {
        const bagian = Math.round((fee * Number(r.subtotal)) / totalItem);
        await tx.escrowLedgerEntry.create({
          data: {
            orderId,
            tenantId: r.tenant_id,
            entryType: "BIAYA_BATAL10",
            amount: bagian,
            gatewayRef: `batal:${orderId}`,
          },
        });
        // Sisa tahanan milik Tenant ini kembali ke pembeli. TANPA baris ini,
        // ledger masih mencatat dana tertahan untuk pesanan yang sudah batal —
        // dan karena ledger append-only, salahnya tidak bisa dibetulkan belakangan.
        await tx.escrowLedgerEntry.create({
          data: {
            orderId,
            tenantId: r.tenant_id,
            entryType: "REFUND",
            amount: Number(r.subtotal) - bagian,
            gatewayRef: `batal:${orderId}`,
          },
        });
      }

      // Ongkir tidak ditahan atas nama Tenant mana pun, jadi tidak ada barisnya
      // di ledger; nilainya tetap ikut dihitung pada `refunded` di bawah.

      await tx.shipment.updateMany({ where: { orderId }, data: { status: "DIBATALKAN" } });
      await tx.order.update({ where: { id: orderId }, data: { orderStatus: "CLOSED" } });
    });

    this.log.log(`Order ${orderId.slice(0, 8)} dibatalkan — biaya Rp${fee.toLocaleString("id-ID")} ke Tenant`);
    return {
      orderId,
      refundedValue: refunded,
      cancellationFee: fee,
      goodsValue: nilaiBarang,
      message: `Pesanan dibatalkan. Biaya pembatalan ${CANCELLATION_FEE_PCT}% dari nilai barang ditahan; ongkir dikembalikan penuh.`,
    };
  }

  private async refund(
    tx: Tx,
    orderId: string,
    shipmentId: string,
    tenantId: string,
    amount: number,
    ref: string,
  ) {
    if (amount <= 0) return;
    await tx.escrowLedgerEntry.create({
      data: { orderId, shipmentId, tenantId, entryType: "REFUND", amount, gatewayRef: `assurance:${ref}` },
    });
  }
}

const MESSAGES: Record<string, string> = {
  TERIMA_SEBAGIAN: "Porsi yang tersedia tetap dikirim; sisanya dikembalikan ke rekening Anda.",
  REFUND: "Seluruh nilai item dikembalikan ke rekening Anda.",
  JADWAL_ULANG: "Pesanan dijadwalkan ke siklus panen berikutnya. Dana tetap aman di escrow.",
  SUBSTITUSI: "Pengganti telah dikunci dengan harga yang sama seperti pesanan semula.",
};
