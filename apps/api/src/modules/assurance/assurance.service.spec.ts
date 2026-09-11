import { describe, expect, it, vi } from "vitest";
import { AssuranceService } from "./assurance.service";
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;
function fixture() {
  const item = { id: "i1", orderId: "o1", shipmentId: "s1", batchId: "b1", qtyBox: 10, qtyBoxFulfilled: 4, unitPriceLocked: 100_000, assuranceResolution: null, shipment: { id: "s1", zoneId: "z1", zone: { minOrderValue: 500_000 } }, batch: { id: "b1", verificationStatus: "TERVERIFIKASI", yieldAssessments: [{ verdict: "WAJAR", finalVerdict: null }], product: { name: "Cabai", commodityId: "c1", tenant: { id: "t1", companyName: "Kebun" } } } };
  const tx = { orderItem: { update: vi.fn(), create: vi.fn() }, escrowLedgerEntry: { create: vi.fn() }, assuranceResolution: { create: vi.fn() }, $executeRaw: vi.fn().mockResolvedValue(1), $queryRaw: vi.fn().mockResolvedValue([{ id: "s2" }]), shipment: { updateMany: vi.fn() }, order: { update: vi.fn() } };
  const prisma = { orderItem: { findFirst: vi.fn().mockResolvedValue(item), findMany: vi.fn().mockResolvedValue([item]) }, batch: { findMany: vi.fn().mockResolvedValue([]) }, order: { findFirst: vi.fn().mockResolvedValue(null) }, $transaction: vi.fn(async work => work(tx)) };
  return { prisma, tx, item, service: new AssuranceService(prisma as never, {} as never) };
}
describe("AssuranceService compensation", () => {
  it("shows shortfall and a useful supply-gap reason", async () => {
    const { service } = fixture();
    expect(await service.pendingForBuyer("u1")).toEqual([expect.objectContaining({ allocatedBox: 4, shortfallBox: 6, shortfallValue: 600_000, partialMeetsMinimum: false, capWaived: false, substitutes: [], substitutionBlockedReason: expect.stringContaining("Belum ada Tenant lain") })]);
  });
  it("does not show fully fulfilled items as pending decisions", async () => {
    const { service, item } = fixture();
    item.qtyBoxFulfilled = 10;
    expect(await service.pendingForBuyer("u1")).toEqual([]);
  });
  it.each([["TERIMA_SEBAGIAN", 600_000], ["REFUND", 1_000_000]] as const)("refunds %s using original locked price", async (option, amount) => {
    const { service, tx } = fixture();
    expect(await service.resolve("u1", "i1", option)).toMatchObject({ option, shortfallBox: 6, refundedValue: amount });
    expect(tx.escrowLedgerEntry.create).toHaveBeenCalledWith({ data: { orderId: "o1", shipmentId: "s1", tenantId: "t1", entryType: "REFUND", amount, gatewayRef: "assurance:i1" } });
    if (option === "REFUND") expect(tx.orderItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { qtyBoxFulfilled: 0 } });
  });
  it.each([null, 10])("rejects unresolved allocation or absence of shortfall (%s)", async fulfilled => {
    const { service, item, tx } = fixture();
    item.qtyBoxFulfilled = fulfilled as never;
    await expect(service.resolve("u1", "i1", "REFUND")).rejects.toMatchObject({ response: { code: "NO_SHORTFALL" } });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
  });
  it("does not accept a zero allocation as partial delivery", async () => {
    const { service, item } = fixture(); item.qtyBoxFulfilled = 0;
    await expect(service.resolve("u1", "i1", "TERIMA_SEBAGIAN")).rejects.toMatchObject({ response: { code: "NOTHING_ALLOCATED" } });
  });
  it("rejects a foreign order item without exposing its details", async () => {
    const { service, prisma } = fixture(); prisma.orderItem.findFirst.mockResolvedValue(null);
    await expect(service.resolve("u1", "i1", "REFUND")).rejects.toMatchObject({ status: 404 });
    expect(prisma.orderItem.findFirst.mock.calls[0]![0].where).toEqual({ id: "i1", order: { buyer: { userId: "u1" } } });
  });
  it("rejects an already resolved item", async () => {
    const { service, item } = fixture(); item.assuranceResolution = { id: "resolved" } as never;
    await expect(service.resolve("u1", "i1", "REFUND")).rejects.toMatchObject({ response: { code: "ALREADY_RESOLVED" } });
  });
  it("requires a selected replacement", async () => {
    const { service } = fixture();
    await expect(service.resolve("u1", "i1", "SUBSTITUSI")).rejects.toMatchObject({ response: { code: "REPLACEMENT_REQUIRED" } });
  });
  it("rejects a replacement that cannot cover the shortfall", async () => {
    const { service } = fixture();
    await expect(service.resolve("u1", "i1", "SUBSTITUSI", "b2")).rejects.toMatchObject({ response: { code: "REPLACEMENT_UNAVAILABLE" } });
  });
  it("hides a replacement beyond the cap for a reasonable harvest", async () => {
    const { service, prisma } = fixture();
    prisma.batch.findMany.mockResolvedValue([{ id: "b2", quotaBoxTotal: 10, quotaBoxSold: 0, lockedPrice: 120_000 }]);
    expect((await service.pendingForBuyer("u1"))[0]).toMatchObject({ substitutes: [], capWaived: false, substitutionBlockedReason: expect.stringContaining("melampaui batas") });
  });
  it.each(["TIDAK_WAJAR", "TIDAK_SESUAI"])("waives the cap for %s and carries price gap to the failing tenant", async evidence => {
    const { service, prisma, item, tx } = fixture();
    if (evidence === "TIDAK_WAJAR") item.batch.yieldAssessments[0]!.verdict = evidence;
    else item.batch.verificationStatus = evidence;
    prisma.batch.findMany.mockResolvedValue([{ id: "b2", quotaBoxTotal: 10, quotaBoxSold: 0, lockedPrice: 120_000, claimedHarvestDate: new Date("2026-09-20"), product: { name: "Cabai pengganti", tenant: { id: "t2", companyName: "Kebun 2" } } }]);
    expect(await service.resolve("u1", "i1", "SUBSTITUSI", "b2")).toMatchObject({ refundedValue: 0, priceGapBorneByTenant: 120_000 });
    expect(tx.orderItem.create).toHaveBeenCalledWith({ data: { orderId: "o1", shipmentId: "s2", batchId: "b2", qtyBox: 6, unitPriceLocked: 100_000, subtotal: 600_000 } });
    expect(tx.escrowLedgerEntry.create.mock.calls.map(([arg]) => [arg.data.entryType, arg.data.amount, arg.data.tenantId])).toEqual([["ALIH_SUBSTITUSI", 600_000, "t1"], ["POTONG_KLAIM", 120_000, "t1"], ["HOLD", 720_000, "t2"]]);
  });
  it("records rescheduling without releasing escrow", async () => {
    const { service, tx } = fixture();
    expect(await service.resolve("u1", "i1", "JADWAL_ULANG")).toMatchObject({ refundedValue: 0 });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(tx.assuranceResolution.create).toHaveBeenCalledTimes(1);
  });
  regression("BUG-BE-05: rescheduling must create or move an order allocation into a next harvest cycle", async () => {
    const { service, tx } = fixture();
    await service.resolve("u1", "i1", "JADWAL_ULANG");
    expect(tx.orderItem.create.mock.calls.length + tx.orderItem.update.mock.calls.length).toBeGreaterThan(0);
  });
  it("rejects cancellation for an unknown order", async () => {
    const { service } = fixture();
    await expect(service.cancelOrder("u1", "o1")).rejects.toMatchObject({ status: 404 });
  });
  it("rejects cancellation before payment or after harvest", async () => {
    const { service, prisma } = fixture();
    prisma.order.findFirst.mockResolvedValue({ orderStatus: "DRAFT" });
    await expect(service.cancelOrder("u1", "o1")).rejects.toMatchObject({ response: { code: "NOT_CANCELLABLE" } });
    prisma.order.findFirst.mockResolvedValue({ orderStatus: "PAID", shipments: [{ status: "PANEN" }] });
    await expect(service.cancelOrder("u1", "o1")).rejects.toMatchObject({ response: { code: "ALREADY_HARVESTED" } });
  });
  it("charges cancellation only on goods and refunds the entire unused shipping component", async () => {
    const { service, prisma, tx } = fixture();
    prisma.order.findFirst.mockResolvedValue({ orderStatus: "PAID", totalAmount: 1_100_000, shipments: [{ id: "s1", status: "MENUNGGU_PANEN" }], items: [{ subtotal: 1_000_000 }] });
    tx.$queryRaw.mockResolvedValue([{ tenant_id: "t1", subtotal: 1_000_000n }]);
    expect(await service.cancelOrder("u1", "o1")).toMatchObject({ refundedValue: 1_000_000, cancellationFee: 100_000, goodsValue: 1_000_000 });
    expect(tx.escrowLedgerEntry.create.mock.calls.map(([arg]) => [arg.data.entryType, arg.data.amount])).toEqual([["BIAYA_BATAL10", 100_000], ["REFUND", 900_000]]);
    expect(tx.shipment.updateMany).toHaveBeenCalledWith({ where: { orderId: "o1" }, data: { status: "DIBATALKAN" } });
  });
});
