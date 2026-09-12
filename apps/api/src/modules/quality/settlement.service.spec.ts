import { describe, expect, it, vi } from "vitest";
import { SettlementService } from "./settlement.service";

function fixture() {
  const tx = { shipment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, escrowLedgerEntry: { create: vi.fn() } };
  const prisma = {
    shipment: { findMany: vi.fn().mockResolvedValue([{ id: "s1", orderId: "o1" }]) }, claim: { count: vi.fn().mockResolvedValue(0) },
    $queryRaw: vi.fn().mockResolvedValue([{ tenant_id: "t1", sisa: 300_000n }]), $transaction: vi.fn(async work => work(tx)),
    tenant: { findUnique: vi.fn().mockResolvedValue({ userId: "u1" }) }, escrowLedgerEntry: { update: vi.fn() },
  };
  const notif = { kirim: vi.fn() };
  return { prisma, tx, notif, service: new SettlementService(prisma as never, notif as never) };
}
describe("SettlementService escrow safety", () => {
  it("holds money while an operator claim is pending", async () => {
    const { service, prisma, tx, notif } = fixture();
    prisma.claim.count.mockResolvedValue(1);
    expect(await service.settleExpiredClaimWindows()).toEqual({ settled: 0, totalAmount: 0, heldByPendingClaims: 1 });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(notif.kirim).not.toHaveBeenCalled();
  });
  it("atomically claims the shipment before writing a per-tenant RELEASE and then notifies", async () => {
    const { service, tx, notif } = fixture();
    expect(await service.settleExpiredClaimWindows()).toEqual({ settled: 1, totalAmount: 300_000, heldByPendingClaims: 0 });
    expect(tx.shipment.updateMany).toHaveBeenCalledWith({ where: { id: "s1", status: "DITERIMA" }, data: { status: "SELESAI", completedAt: expect.any(Date) } });
    expect(tx.shipment.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.escrowLedgerEntry.create.mock.invocationCallOrder[0]!);
    expect(tx.escrowLedgerEntry.create).toHaveBeenCalledWith({ data: { orderId: "o1", shipmentId: "s1", tenantId: "t1", entryType: "RELEASE", amount: 300_000, gatewayRef: "settle:s1" } });
    expect(notif.kirim).toHaveBeenCalledWith("u1", "ESCROW_CAIR", "Dana pesanan dicairkan", expect.any(String), { orderId: "o1", shipmentId: "s1" });
  });
  it("does not release twice when a competing worker won the shipment", async () => {
    const { service, tx, notif } = fixture();
    tx.shipment.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.settleExpiredClaimWindows()).toMatchObject({ settled: 0, totalAmount: 0 });
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
    expect(notif.kirim).not.toHaveBeenCalled();
  });
  it("finishes settlement even when notification recipient is no longer present", async () => {
    const { service, prisma, notif } = fixture();
    prisma.tenant.findUnique.mockResolvedValue(null);
    expect(await service.settleExpiredClaimWindows()).toMatchObject({ settled: 1 });
    expect(notif.kirim).not.toHaveBeenCalled();
  });
  it("returns an empty summary when nothing is due", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findMany.mockResolvedValue([]);
    expect(await service.settleExpiredClaimWindows()).toEqual({ settled: 0, totalAmount: 0, heldByPendingClaims: 0 });
  });
  it("reports pending transfers with serializable values", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([{ id: "e1", tenant: "Kebun", entry_type: "RELEASE", amount: 50n, status: "RETRY", created_at: new Date("2026-09-01T00:00:00Z") }]);
    expect(await service.pendingSettlements()).toEqual([{ entryId: "e1", tenantName: "Kebun", entryType: "RELEASE", amount: 50, settlementStatus: "RETRY", createdAt: "2026-09-01T00:00:00.000Z" }]);
  });
  it.each([[true, "SUCCESS"], [false, "RETRY"]] as const)("records gateway success=%s without altering immutable money fields", async (success, status) => {
    const { service, prisma } = fixture();
    expect(await service.tandaiPenyaluran("e1", success)).toEqual({ entryId: "e1", settlementStatus: status });
    expect(prisma.escrowLedgerEntry.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { settlementStatus: status } });
  });
  it("subtracts every outgoing ledger type including cancellation and substitution", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([
      { entry_type: "HOLD", total: 1_000n }, { entry_type: "RELEASE", total: 100n }, { entry_type: "RELEASE30", total: 200n },
      { entry_type: "POTONG_KLAIM", total: 50n }, { entry_type: "REFUND", total: 100n },
      { entry_type: "BIAYA_BATAL10", total: 10n }, { entry_type: "ALIH_SUBSTITUSI", total: 40n },
    ]).mockResolvedValueOnce([{ total: 200n }]);
    expect(await service.tenantBalance("t1")).toMatchObject({ tertahan: 500, totalDitahan: 1_000, totalDicairkan: 300, menungguPenyaluran: 200, totalPotonganKlaim: 50, totalRefund: 100, totalBiayaBatal: 10, totalAlihSubstitusi: 40 });
  });
  it("reports zero balances for a tenant without ledger entries", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.tenantBalance("t1")).toEqual({ tertahan: 0, totalDitahan: 0, totalDicairkan: 0, menungguPenyaluran: 0, totalPotonganKlaim: 0, totalRefund: 0, totalBiayaBatal: 0, totalAlihSubstitusi: 0, rincian: {} });
  });
  it("settles a fully refunded shipment instead of reporting it held by a nonexistent claim (BE-03)", async () => {
    const { service, prisma, tx } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.settleExpiredClaimWindows()).toEqual({ settled: 1, totalAmount: 0, heldByPendingClaims: 0 });
    // Ditutup, tetapi TANPA entri RELEASE: tidak ada sisa yang boleh dicairkan.
    expect(tx.shipment.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
  });

  it("separates a shipment lost to a competing worker from one held by a claim (BE-03)", async () => {
    const { service, tx } = fixture();
    tx.shipment.updateMany.mockResolvedValue({ count: 0 });
    // Kalah balapan bukan "ditahan klaim": tidak ada klaim, dan tidak ada yang perlu
    // ditindaklanjuti operator.
    expect(await service.settleExpiredClaimWindows()).toEqual({ settled: 0, totalAmount: 0, heldByPendingClaims: 0 });
  });
});
