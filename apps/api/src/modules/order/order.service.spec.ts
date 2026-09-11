import { describe, expect, it, vi } from "vitest";
import { SHIPPING_COST_PER_PLAN, TRACEABILITY_REPORT_FEE } from "@agro-os/shared";
import { OrderService } from "./order.service";

function batch(id = "b1", date = "2026-09-09", lockedPrice = 100_000) {
  return { id, productionStatus: "GROWING", quotaBoxTotal: 20, quotaBoxSold: 2, lockedPrice, claimedHarvestDate: new Date(`${date}T00:00:00Z`), product: { name: `Cabai ${id}`, grade: "A", qtyKgPerBox: "5", commodityId: "c1", tenant: { id: `t-${id}`, companyName: `Kebun ${id}`, tenantZones: [{ zoneId: "z1" }] } } };
}
function fixture() {
  const tx = { order: { create: vi.fn().mockResolvedValue({ id: "o1" }) }, $queryRaw: vi.fn().mockResolvedValue([{ id: "s1" }]), $executeRaw: vi.fn().mockResolvedValue(1), orderItem: { create: vi.fn() }, traceabilityReport: { create: vi.fn() } };
  const prisma = { batch: { findMany: vi.fn().mockResolvedValue([batch()]) }, zone: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "z1", name: "Malang", minOrderValue: 500_000 }) }, order: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) }, $transaction: vi.fn(async work => work(tx)) };
  const buyers = { requireBuyer: vi.fn().mockResolvedValue({ id: "buyer1", activeZoneId: "z1" }) };
  const payments = { expireStale: vi.fn(), createInvoice: vi.fn().mockResolvedValue({ id: "p1" }) };
  const signals = { recordQuotaRaceLost: vi.fn() };
  const umur = { untukOrder: vi.fn() };
  return { tx, prisma, buyers, payments, signals, service: new OrderService(prisma as never, buyers as never, payments as never, signals as never, umur as never) };
}
const delivery = { recipientName: "Penerima", phone: "+6281234567890", point: { lat: -7.98, lng: 112.63 }, receivingHours: "08:00-16:00" };

describe("OrderService authoritative cart planning", () => {
  it("groups cross-tenant items by Monday harvest week, prices from batches, and charges shipping per plan", async () => {
    const { service, prisma } = fixture();
    prisma.batch.findMany.mockResolvedValue([batch("b1", "2026-09-09"), batch("b2", "2026-09-13", 200_000), batch("b3", "2026-09-14", 150_000)]);
    const preview = await service.preview("u1", [{ batchId: "b3", qtyBox: 4 }, { batchId: "b2", qtyBox: 2 }, { batchId: "b1", qtyBox: 1 }]);
    expect(preview.plans.map(p => [p.harvestWeek, p.readyDate, p.subtotal])).toEqual([["2026-09-07", "2026-09-13", 500_000], ["2026-09-14", "2026-09-14", 600_000]]);
    expect(preview).toMatchObject({ itemsTotal: 1_100_000, shippingTotal: SHIPPING_COST_PER_PLAN * 2, grandTotal: 1_100_000 + SHIPPING_COST_PER_PLAN * 2, canCheckout: true });
    expect(preview.plans[0]!.lines[0]).not.toHaveProperty("tenantId");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("checks minimum per shipment week even when the cart total exceeds it", async () => {
    const { service, prisma } = fixture();
    prisma.batch.findMany.mockResolvedValue([batch("b1", "2026-09-09"), batch("b2", "2026-09-14")]);
    const result = await service.preview("u1", [{ batchId: "b1", qtyBox: 4 }, { batchId: "b2", qtyBox: 4 }]);
    expect(result.canCheckout).toBe(false);
    expect(result.plans.map(p => p.shortfallToMinimum)).toEqual([100_000, 100_000]);
  });
  it("requires a persisted buyer zone rather than trusting a client catalog filter", async () => {
    const { service, buyers, prisma } = fixture();
    buyers.requireBuyer.mockResolvedValue({ id: "buyer1", activeZoneId: null });
    await expect(service.preview("u1", [{ batchId: "b1", qtyBox: 5 }])).rejects.toMatchObject({ response: { code: "ZONE_NOT_SELECTED" } });
    expect(prisma.batch.findMany).not.toHaveBeenCalled();
  });
  it("rejects duplicate batch rows before reading inventory", async () => {
    const { service, prisma } = fixture();
    await expect(service.preview("u1", [{ batchId: "b1", qtyBox: 5 }, { batchId: "b1", qtyBox: 5 }])).rejects.toMatchObject({ response: { code: "CART_DUPLICATE_BATCH" } });
    expect(prisma.batch.findMany).not.toHaveBeenCalled();
  });
  it("rejects a batch that no longer exists", async () => {
    const { service } = fixture();
    await expect(service.preview("u1", [{ batchId: "missing", qtyBox: 5 }])).rejects.toMatchObject({ response: { code: "BATCH_NOT_FOUND" } });
  });
  it.each(["HARVESTED", "FAILED"])("rejects %s stock", async (status) => {
    const { service, prisma } = fixture();
    prisma.batch.findMany.mockResolvedValue([{ ...batch(), productionStatus: status }]);
    await expect(service.preview("u1", [{ batchId: "b1", qtyBox: 5 }])).rejects.toMatchObject({ response: { code: "BATCH_NOT_SELLABLE" } });
  });
  it("rejects products outside the buyer's delivery zone", async () => {
    const { service, prisma } = fixture();
    const b = batch(); b.product.tenant.tenantZones = [];
    prisma.batch.findMany.mockResolvedValue([b]);
    await expect(service.preview("u1", [{ batchId: "b1", qtyBox: 5 }])).rejects.toMatchObject({ response: { code: "TENANT_OUT_OF_ZONE" } });
  });
  it("reports only unmet kilograms when preflight quota is insufficient", async () => {
    const { service, signals } = fixture();
    await expect(service.preview("u1", [{ batchId: "b1", qtyBox: 20 }])).rejects.toMatchObject({ response: { code: "QUOTA_INSUFFICIENT", available: 18 } });
    expect(signals.recordQuotaRaceLost).toHaveBeenCalledWith("z1", "c1", 10);
  });
});

describe("OrderService transactional checkout", () => {
  it.each([false, true])("locks server prices and includes traceability report=%s exactly once", async (includeTraceabilityReport) => {
    const { service, payments, tx } = fixture();
    const result = await service.checkout("u1", { lines: [{ batchId: "b1", qtyBox: 5 }], delivery, paymentMethod: "QRIS", includeTraceabilityReport });
    const total = 500_000 + SHIPPING_COST_PER_PLAN + (includeTraceabilityReport ? TRACEABILITY_REPORT_FEE : 0);
    expect(result).toEqual({ orderId: "o1", totalAmount: total, payment: { id: "p1" }, shipmentIds: ["s1"] });
    expect(tx.orderItem.create).toHaveBeenCalledWith({ data: { orderId: "o1", shipmentId: "s1", batchId: "b1", qtyBox: 5, unitPriceLocked: 100_000, subtotal: 500_000 } });
    expect(payments.createInvoice).toHaveBeenCalledWith("o1", "QRIS", total);
    expect(tx.traceabilityReport.create).toHaveBeenCalledTimes(includeTraceabilityReport ? 1 : 0);
  });
  it("rejects checkout without the selected zone", async () => {
    const { service, buyers, payments } = fixture();
    buyers.requireBuyer.mockResolvedValue({ id: "buyer1", activeZoneId: null });
    await expect(service.checkout("u1", { lines: [{ batchId: "b1", qtyBox: 5 }], delivery, paymentMethod: "VA" })).rejects.toMatchObject({ response: { code: "ZONE_NOT_SELECTED" } });
    expect(payments.createInvoice).not.toHaveBeenCalled();
  });
  it("does not reserve a cart that misses the shipment minimum", async () => {
    const { service, prisma } = fixture();
    await expect(service.checkout("u1", { lines: [{ batchId: "b1", qtyBox: 4 }], delivery, paymentMethod: "VA" })).rejects.toMatchObject({ response: { code: "MIN_ORDER_NOT_MET" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("refuses to create an invoice when another checkout won the last inventory", async () => {
    const { service, tx, signals, payments } = fixture();
    tx.$executeRaw.mockResolvedValue(0);
    await expect(service.checkout("u1", { lines: [{ batchId: "b1", qtyBox: 5 }], delivery: { ...delivery, landmark: "Pintu utara" }, paymentMethod: "VA" })).rejects.toMatchObject({ response: { code: "QUOTA_RACE_LOST" } });
    expect(signals.recordQuotaRaceLost).toHaveBeenCalledWith("z1", "c1", 25, "buyer1");
    expect(tx.orderItem.create).not.toHaveBeenCalled();
    expect(payments.createInvoice).not.toHaveBeenCalled();
  });
  it("lists no orders for a buyer without history", async () => {
    const { service } = fixture();
    expect(await service.listOrders("u1")).toEqual([]);
  });
  it("does not disclose an order belonging to another buyer", async () => {
    const { service, prisma } = fixture();
    await expect(service.getOrder("u1", "foreign-order")).rejects.toMatchObject({ status: 404 });
    expect(prisma.order.findFirst.mock.calls[0]![0].where).toEqual({ id: "foreign-order", buyerId: "buyer1" });
  });
  it("generates human-readable references with a random suffix", () => {
    const refs = Array.from({ length: 20 }, () => OrderService.newInvoiceRef());
    expect(refs.every(ref => /^AGR-\d{6}-[A-F0-9]{6}$/.test(ref))).toBe(true);
    expect(new Set(refs).size).toBe(20);
  });
});
