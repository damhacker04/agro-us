import { describe, expect, it, vi } from "vitest";
import { QUOTA_MULTIPLIER_NORMAL, QUOTA_MULTIPLIER_PENALTY } from "@agro-os/shared";
import { AllocationService } from "./allocation.service";

const queue = [
  { order_item_id: "i1", buyer_id: "b1", buyer_name: "Prioritas", paid_at: new Date("2026-08-02T00:00:00Z"), qty_box: 4, senioritas: true },
  { order_item_id: "i2", buyer_id: "b2", buyer_name: "FIFO pertama", paid_at: new Date("2026-08-01T00:00:00Z"), qty_box: 5, senioritas: false },
  { order_item_id: "i3", buyer_id: "b3", buyer_name: "FIFO kedua", paid_at: null, qty_box: 3, senioritas: false },
];
function fixture() {
  const prisma = { $queryRaw: vi.fn().mockResolvedValue(queue), tenant: { update: vi.fn(), findUnique: vi.fn().mockResolvedValue({ userId: "u1" }) } };
  const assessment = { posisiZona: vi.fn().mockResolvedValue({ posisiPct: null, menyimpang: 0 }) };
  const notif = { kirim: vi.fn() };
  return { prisma, assessment, notif, service: new AllocationService(prisma as never, assessment as never, notif as never) };
}
describe("AllocationService whole-order FIFO and seniority", () => {
  it("fills priority orders first, then one boundary partial order, then zero", async () => {
    const { service, prisma } = fixture();
    const plan = await service.preview("batch", 7);
    expect(plan).toMatchObject({ batchId: "batch", quotaBoxSold: 12, fulfilledBox: 7 });
    expect(plan.fullyFulfilled.map(l => [l.orderItemId, l.allocatedBox, l.shortfallBox])).toEqual([["i1", 4, 0]]);
    expect(plan.partial.map(l => [l.orderItemId, l.allocatedBox, l.shortfallBox])).toEqual([["i2", 3, 2]]);
    expect(plan.unfulfilled.map(l => [l.orderItemId, l.allocatedBox, l.shortfallBox, l.paidAt])).toEqual([["i3", 0, 3, ""]]);
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it.each([0, 1, 4, 7, 9, 12, 20])("conserves inventory for %i harvested boxes", async (boxes) => {
    const { service } = fixture();
    const plan = await service.preview("batch", boxes);
    const lines = [...plan.fullyFulfilled, ...plan.partial, ...plan.unfulfilled];
    expect(lines.reduce((n, l) => n + l.allocatedBox, 0)).toBe(Math.min(boxes, 12));
    expect(plan.partial.length).toBeLessThanOrEqual(1);
    for (const line of lines) expect(line.allocatedBox + line.shortfallBox).toBe(line.qtyBox);
  });
  it("handles a batch with no paid orders", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.preview("batch", 0)).toEqual({ batchId: "batch", quotaBoxSold: 0, fulfilledBox: 0, fullyFulfilled: [], partial: [], unfulfilled: [] });
  });
  it("locks, reads and writes within the supplied transaction and rotates seniority before granting it again", async () => {
    const { service, prisma } = fixture();
    const tx = {
      $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue(queue), orderItem: { update: vi.fn() },
      batch: { findUniqueOrThrow: vi.fn().mockResolvedValue({ product: { tenantId: "t1" } }) },
      shortfallSeniority: { updateMany: vi.fn(), createMany: vi.fn() },
    };
    const plan = await service.apply(tx as never, "batch", 2);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.$queryRaw.mock.invocationCallOrder[0]!);
    expect(tx.orderItem.update).toHaveBeenCalledTimes(3);
    expect(tx.orderItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { qtyBoxFulfilled: 2, seniorityApplied: true } });
    expect(tx.shortfallSeniority.updateMany).toHaveBeenCalledWith({ where: { tenantId: "t1", buyerId: "b1", consumedAt: null }, data: { consumedAt: expect.any(Date), consumedByOrderItemId: "i1" } });
    expect(tx.shortfallSeniority.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.shortfallSeniority.createMany.mock.invocationCallOrder[0]!);
    expect(tx.shortfallSeniority.createMany).toHaveBeenCalledWith({ data: [{ buyerId: "b1", tenantId: "t1", sourceOrderItemId: "i1" }], skipDuplicates: true });
    expect(plan.partial[0]!.senioritas).toBe(true);
  });
  it("does not grant shortfall priority for a fully fulfilled batch", async () => {
    const { service } = fixture();
    const tx = { $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue(queue), orderItem: { update: vi.fn() }, batch: { findUniqueOrThrow: vi.fn().mockResolvedValue({ product: { tenantId: "t1" } }) }, shortfallSeniority: { updateMany: vi.fn(), createMany: vi.fn() } };
    await service.apply(tx as never, "batch", 12);
    expect(tx.shortfallSeniority.createMany).not.toHaveBeenCalled();
  });
});

describe("AllocationService evidence-based quota penalties", () => {
  it("has no penalty or profile mutation when no completed cycles exist", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.applyShortfallPenalty("t1")).toEqual({ penalized: false, cabang: "PN0", posisiPct: null });
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it.each([
    [null, null, 0, "PN0", false],
    ["TIDAK_DAPAT_DINILAI", "TIDAK_ADA_DASAR", 0, "PN0", false],
    ["WAJAR", "PITA_SAJA", 0, "PNA", false],
    ["TIDAK_WAJAR", "PITA_SAJA", 0, "PNA", true],
    ["WAJAR", "PITA_PLUS_BENCHMARK", 0, "PNB", false],
    ["WAJAR", "PITA_PLUS_BENCHMARK", 2, "PNB", true],
    ["TIDAK_WAJAR", "PITA_PLUS_BENCHMARK", 0, "PNB", true],
  ])("handles verdict %s basis %s repeated=%i", async (verdict, basis, menyimpang, cabang, penalized) => {
    const { service, prisma, assessment } = fixture();
    prisma.$queryRaw.mockResolvedValue([{ batch_id: "batch", sold: 10n, fulfilled: 5n, verdict, basis }]);
    assessment.posisiZona.mockResolvedValue({ posisiPct: -20, menyimpang });
    expect(await service.applyShortfallPenalty("t1")).toEqual({ penalized, cabang, posisiPct: -20 });
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { quotaMultiplier: penalized ? QUOTA_MULTIPLIER_PENALTY : QUOTA_MULTIPLIER_NORMAL, cleanCyclesStreak: penalized ? 0 : { increment: 1 }, yieldPositionCached: -20 } });
  });
  it("does not crash when a penalty's tenant disappears before notification", async () => {
    const { service, prisma, notif } = fixture();
    prisma.$queryRaw.mockResolvedValue([{ batch_id: "batch", verdict: "TIDAK_WAJAR", basis: "PITA_PLUS_BENCHMARK" }]);
    prisma.tenant.findUnique.mockResolvedValue(null);
    await service.applyShortfallPenalty("t1");
    expect(notif.kirim).not.toHaveBeenCalled();
  });
  it("communicates benchmark-based penalties even when a percentage is unavailable", async () => {
    const { service, prisma, notif } = fixture();
    prisma.$queryRaw.mockResolvedValue([{ batch_id: "batch", verdict: "TIDAK_WAJAR", basis: "PITA_PLUS_BENCHMARK" }]);
    await service.applyShortfallPenalty("t1");
    expect(notif.kirim).toHaveBeenCalledWith("u1", "KUOTA_DITURUNKAN", "Kuota PO diturunkan", expect.stringContaining("menyimpang dari rata-rata"));
  });
});
