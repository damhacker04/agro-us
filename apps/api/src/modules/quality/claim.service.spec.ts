import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaimFinalStatus, CLAIM_REVIEW_SLA_HOURS } from "@agro-os/shared";
import { ClaimService } from "./claim.service";

const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;
const now = new Date("2026-09-10T03:00:00Z");

function fixture() {
  const item = {
    id: "item-1", shipmentId: "shipment-1", qtyBox: 10, qtyBoxFulfilled: null as number | null,
    unitPriceLocked: 100_000, order: { totalAmount: 1_000_000 },
    batch: { product: { name: "Tomat", qtyKgPerBox: "10", tenant: { id: "tenant-1" },
      tenantId: "tenant-1", commodity: { shrinkTolerancePct: "5" } } },
  };
  const record = {
    id: "claim-1", shipmentId: "shipment-1", orderItemId: "item-1", orderItem: item,
    shipment: { orderId: "order-1" }, photoUrl: "/proof.jpg", description: "Berat kurang",
    actualWeightKg: 85, claimableKg: 10, claimValue: 100_000, pctOfOrder: 10,
    route: "OPERATOR", finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR as string,
    settledValue: null as number | null, slaDueAt: null as Date | null,
    reviewNote: null as string | null, createdAt: now, resolvedAt: null as Date | null,
  };
  const shipment = { id: "shipment-1", status: "DITERIMA", orderId: "order-1",
    claimWindowEndsAt: new Date(now.getTime() + 3_600_000) as Date | null };
  const tx = {
    claim: {
      create: vi.fn(async ({ data }) => { Object.assign(record, data); return record; }),
      update: vi.fn(async ({ data }) => { Object.assign(record, data); return record; }),
    },
    escrowLedgerEntry: { create: vi.fn().mockResolvedValue({ id: "ledger-1" }) },
  };
  const prisma = {
    shipment: { findFirst: vi.fn().mockResolvedValue(shipment) },
    orderItem: { findFirst: vi.fn().mockResolvedValue(item) },
    claim: {
      findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(record),
      findUniqueOrThrow: vi.fn().mockImplementation(async () => record),
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenant: { update: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn().mockResolvedValue([{ ratio: "12.50" }]),
    $transaction: vi.fn(async (work) => work(tx)),
  };
  const notif = { kirimKePembeliPengiriman: vi.fn().mockResolvedValue(undefined) };
  const dto = { orderItemId: "item-1", actualWeightKg: 85, photoUrl: "/proof.jpg", description: "Berat kurang" };
  return { item, record, shipment, tx, prisma, notif, dto, service: new ClaimService(prisma as never, notif as never) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("ClaimService file: ownership, timing and server-calculated amounts", () => {
  it("does not reveal another buyer's shipment", async () => {
    const { service, prisma, dto } = fixture();
    prisma.shipment.findFirst.mockResolvedValue(null);
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toMatchObject({ status: 404 });
    expect(prisma.shipment.findFirst).toHaveBeenCalledWith({
      where: { id: "shipment-1", order: { buyer: { userId: "buyer-1" } } },
      select: { id: true, status: true, claimWindowEndsAt: true, orderId: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["SELESAI", "DIKIRIM", "PANEN"])("rejects claims for status %s", async status => {
    const { service, shipment, prisma, dto } = fixture();
    shipment.status = status;
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toMatchObject({ response: { code: "NOT_RECEIVED" } });
    expect(prisma.orderItem.findFirst).not.toHaveBeenCalled();
  });

  it.each([null, new Date(now.getTime() - 1)])("rejects absent or expired claim window (%s)", async end => {
    const { service, shipment, prisma, dto } = fixture();
    shipment.claimWindowEndsAt = end;
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toMatchObject({ response: { code: "CLAIM_WINDOW_CLOSED" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an item outside the owned shipment", async () => {
    const { service, prisma, dto } = fixture();
    prisma.orderItem.findFirst.mockResolvedValue(null);
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toMatchObject({ response: { code: "ITEM_NOT_IN_SHIPMENT" } });
    expect(prisma.orderItem.findFirst.mock.calls[0]![0].where).toEqual({ id: "item-1", shipmentId: "shipment-1" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not accept a second claim for one order item", async () => {
    const { service, prisma, dto } = fixture();
    prisma.claim.findFirst.mockResolvedValue({ id: "old-claim" });
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toMatchObject({ response: { code: "CLAIM_EXISTS" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a measured weight above the amount actually delivered", async () => {
    const { service, item, prisma, dto } = fixture();
    item.qtyBoxFulfilled = 5;
    await expect(service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg: 50.01 })).rejects.toMatchObject({ response: { code: "WEIGHT_EXCEEDS_EXPECTED" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([100, 97, 95])("records but rejects normal shrinkage at %s kg without deducting escrow", async actualWeightKg => {
    const { service, tx, prisma, dto } = fixture();
    expect(await service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg })).toMatchObject({
      expectedKg: 100, actualWeightKg, shortfallKg: 100 - actualWeightKg,
      shrinkTolerancePct: 5, toleratedKg: 5, claimableKg: 0, claimValue: 0,
      route: "TOLAK_TOLERANSI", finalStatus: ClaimFinalStatus.DITOLAK_TOLERANSI,
      settledValue: 0, slaDueAt: null, resolvedAt: now.toISOString(),
    });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "tenant-1" }, data: { claimRatioCached: 12.5 } });
  });

  it("auto-settles at exactly ten percent using the locked price and appends a claim deduction", async () => {
    const { service, tx, dto } = fixture();
    expect(await service.file("buyer-1", "shipment-1", dto)).toMatchObject({
      route: "AUTO_SETTLE", finalStatus: ClaimFinalStatus.DISETUJUI_OTOMATIS,
      claimableKg: 10, claimValue: 100_000, pctOfOrder: 10, settledValue: 100_000,
    });
    expect(tx.escrowLedgerEntry.create).toHaveBeenCalledExactlyOnceWith({ data: {
      orderId: "order-1", shipmentId: "shipment-1", tenantId: "tenant-1",
      entryType: "POTONG_KLAIM", amount: 100_000, gatewayRef: "claim:claim-1",
    } });
    expect(tx.claim.create.mock.calls[0]![0].data).toMatchObject({ photoUrl: dto.photoUrl, description: dto.description });
  });

  it("escalates above the auto-settle threshold with a 24-hour review deadline and no deduction", async () => {
    const { service, tx, prisma, dto } = fixture();
    expect(await service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg: 84.99 })).toMatchObject({
      route: "OPERATOR", finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR,
      claimValue: 100_100, pctOfOrder: 10.01, settledValue: 0, resolvedAt: null,
      slaDueAt: new Date(now.getTime() + CLAIM_REVIEW_SLA_HOURS * 3_600_000).toISOString(),
    });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });

  it("calculates shrinkage from a partial delivery rather than the original order", async () => {
    const { service, item, dto } = fixture();
    item.qtyBoxFulfilled = 5;
    expect(await service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg: 45 })).toMatchObject({
      expectedKg: 50, toleratedKg: 2.5, shortfallKg: 5, claimableKg: 2.5, claimValue: 25_000, pctOfOrder: 2.5,
    });
  });

  it("respects an explicit zero fulfilled quantity", async () => {
    const { service, item, dto } = fixture();
    item.qtyBoxFulfilled = 0;
    expect(await service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg: 0 })).toMatchObject({ expectedKg: 0, claimableKg: 0, claimValue: 0 });
  });

  it("rounds fractional kilograms before applying the locked price", async () => {
    const { service, item, dto } = fixture();
    item.qtyBoxFulfilled = 3;
    item.batch.product.qtyKgPerBox = "1.125";
    item.unitPriceLocked = 11_250;
    expect(await service.file("buyer-1", "shipment-1", { ...dto, actualWeightKg: 3 })).toMatchObject({
      expectedKg: 3.38, toleratedKg: 0.17, claimableKg: 0.21, claimValue: 2_100,
    });
  });

  it("preserves the absence of a public claim ratio when SQL returns null", async () => {
    const { service, prisma, dto } = fixture();
    prisma.$queryRaw.mockResolvedValue([{ ratio: null }]);
    await service.file("buyer-1", "shipment-1", dto);
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "tenant-1" }, data: { claimRatioCached: null } });
  });

  it("does not publish reputation updates when a ledger write fails", async () => {
    const { service, prisma, tx, dto } = fixture();
    const failure = new Error("ledger unavailable");
    tx.escrowLedgerEntry.create.mockRejectedValue(failure);
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toBe(failure);
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(prisma.claim.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe("ClaimService operator decisions", () => {
  it("rejects an unknown claim", async () => {
    const { service, prisma } = fixture();
    prisma.claim.findUnique.mockResolvedValue(null);
    await expect(service.decide("operator-1", "claim-1", 0, "Tidak sesuai bukti")).rejects.toMatchObject({ status: 404 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not review an automatically resolved claim", async () => {
    const { service, record, prisma } = fixture();
    record.route = "AUTO_SETTLE";
    await expect(service.decide("operator-1", "claim-1", 0, "Catatan")).rejects.toMatchObject({ response: { code: "NOT_FOR_REVIEW" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not decide the same claim sequentially twice", async () => {
    const { service, tx } = fixture();
    await service.decide("operator-1", "claim-1", 50_000, "Bukti cukup");
    await expect(service.decide("operator-1", "claim-1", 50_000, "Ulang")).rejects.toMatchObject({ response: { code: "ALREADY_DECIDED" } });
    expect(tx.escrowLedgerEntry.create).toHaveBeenCalledTimes(1);
  });

  it.each([-1, 100_001])("rejects an approved value outside the claimed amount: %s", async amount => {
    const { service, prisma } = fixture();
    await expect(service.decide("operator-1", "claim-1", amount, "Catatan")).rejects.toMatchObject({ response: { code: "APPROVED_OUT_OF_RANGE" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["missing-item", "missing-tenant"])("refuses settlement with %s", async missing => {
    const { service, record, prisma } = fixture();
    if (missing === "missing-item") record.orderItem = null as never;
    else record.orderItem.batch.product.tenantId = "";
    await expect(service.decide("operator-1", "claim-1", 50_000, "Catatan")).rejects.toMatchObject({ response: { code: "ITEM_MISSING" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([50_000, 100_000])("records a permitted approval of Rp%s with audit identity and a deduction", async amount => {
    const { service, tx, notif } = fixture();
    expect(await service.decide("operator-1", "claim-1", amount, "Bukti timbang valid")).toMatchObject({
      finalStatus: ClaimFinalStatus.DISETUJUI_OPERATOR, settledValue: amount,
      reviewNote: "Bukti timbang valid", resolvedAt: now.toISOString(),
    });
    expect(tx.claim.update).toHaveBeenCalledWith({ where: { id: "claim-1" }, data: {
      reviewedById: "operator-1", settledValue: amount, reviewNote: "Bukti timbang valid",
      finalStatus: ClaimFinalStatus.DISETUJUI_OPERATOR, resolvedAt: now,
    } });
    expect(tx.escrowLedgerEntry.create.mock.calls[0]![0].data.amount).toBe(amount);
    expect(notif.kirimKePembeliPengiriman).toHaveBeenCalledWith("shipment-1", "KLAIM_DIPUTUS", "Klaim Anda disetujui", expect.stringContaining("Bukti timbang valid"));
  });

  it("records an operator rejection without moving escrow", async () => {
    const { service, tx, notif } = fixture();
    expect(await service.decide("operator-1", "claim-1", 0, "Bukti tidak sesuai")).toMatchObject({
      finalStatus: ClaimFinalStatus.DITOLAK_OPERATOR, settledValue: 0, resolvedAt: now.toISOString(),
    });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(notif.kirimKePembeliPengiriman).toHaveBeenCalledWith("shipment-1", "KLAIM_DIPUTUS", "Klaim Anda ditolak", "Klaim tidak disetujui. Catatan operator: Bukti tidak sesuai");
  });

  it("does not notify the buyer if the approval transaction fails", async () => {
    const { service, tx, notif, prisma } = fixture();
    tx.claim.update.mockRejectedValue(new Error("database offline"));
    await expect(service.decide("operator-1", "claim-1", 10_000, "Catatan")).rejects.toThrow("database offline");
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(notif.kirimKePembeliPengiriman).not.toHaveBeenCalled();
  });

  regression("BUG-CLAIM-01: concurrent reviews must deduct escrow only once", async () => {
    const { service, prisma, record, tx } = fixture();
    // Both requests observe the same pending row before either transaction updates it.
    prisma.claim.findUnique.mockImplementation(async () => ({ ...record, finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR }));
    const decisions = await Promise.allSettled([
      service.decide("operator-1", "claim-1", 50_000, "Setuju"),
      service.decide("operator-2", "claim-1", 50_000, "Setuju"),
    ]);
    expect(tx.escrowLedgerEntry.create).toHaveBeenCalledTimes(1);
    // A duplicate can return the same idempotent result or a conflict; either is
    // acceptable as long as at least one succeeds and the balance changes once.
    expect(decisions.some(result => result.status === "fulfilled")).toBe(true);
  });
});

describe("ClaimService buyer list and operator queue", () => {
  it("checks shipment ownership before listing claims", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue(null);
    await expect(service.listForBuyer("stranger", "shipment-1")).rejects.toMatchObject({ status: 404 });
    expect(prisma.claim.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty list for an owned shipment without claims", async () => {
    const { service, prisma } = fixture();
    expect(await service.listForBuyer("buyer-1", "shipment-1")).toEqual([]);
    expect(prisma.claim.findMany).toHaveBeenCalledWith({ where: { shipmentId: "shipment-1" }, orderBy: { createdAt: "desc" } });
  });

  it("serializes persisted decimal amounts and nullable decision fields", async () => {
    const { service, prisma, record } = fixture();
    prisma.claim.findMany.mockResolvedValue([{ id: "claim-1" }]);
    Object.assign(record, { actualWeightKg: "85", claimableKg: "10", pctOfOrder: "10.00" });
    expect(await service.listForBuyer("buyer-1", "shipment-1")).toEqual([{
      id: "claim-1", shipmentId: "shipment-1", orderItemId: "item-1", productName: "Tomat",
      photoUrl: "/proof.jpg", description: "Berat kurang", expectedKg: 100, actualWeightKg: 85,
      shortfallKg: 15, shrinkTolerancePct: 5, toleratedKg: 5, claimableKg: 10,
      claimValue: 100_000, pctOfOrder: 10, route: "OPERATOR", finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR,
      settledValue: 0, slaDueAt: null, reviewNote: null, createdAt: now.toISOString(), resolvedAt: null,
    }]);
  });

  it("returns an empty operator queue without fetching claim detail", async () => {
    const { service, prisma } = fixture();
    expect(await service.operatorQueue()).toEqual([]);
    expect(prisma.claim.findMany).toHaveBeenCalledWith({
      where: { route: "OPERATOR", finalStatus: ClaimFinalStatus.MENUNGGU_OPERATOR }, orderBy: { slaDueAt: "asc" },
    });
    expect(prisma.claim.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it.each([[-1, true], [0, false], [1, false], [null, false]] as const)("marks overdue precisely for SLA offset %s", async (offset, overdue) => {
    const { service, prisma, record } = fixture();
    record.slaDueAt = offset === null ? null : new Date(now.getTime() + offset);
    prisma.claim.findMany.mockResolvedValue([{ id: "claim-1", slaDueAt: record.slaDueAt }]);
    expect(await service.operatorQueue()).toEqual([expect.objectContaining({ id: "claim-1", overdue })]);
  });

  it("propagates a reputation persistence error when the aggregate adapter returns an invalid empty result", async () => {
    const { service, prisma, dto } = fixture();
    // The current aggregate SQL returns one row. This is a dependency fault injection,
    // not a claim that an empty result is reachable with that SQL in PostgreSQL.
    const failure = new Error("Invalid claimRatioCached argument");
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.tenant.update.mockRejectedValue(failure);
    await expect(service.file("buyer-1", "shipment-1", dto)).rejects.toBe(failure);
    expect(prisma.claim.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
