import { describe, expect, it, vi } from "vitest";
import { EscrowService } from "./escrow.service";

describe("EscrowService tenant/shipment accounting", () => {
  it("writes one successful HOLD per tenant and shipment from database item subtotals", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([
        { tenant_id: "t1", shipment_id: "s1", amount: 500_000n },
        { tenant_id: "t2", shipment_id: "s1", amount: 200_000n },
        { tenant_id: "t1", shipment_id: "s2", amount: 100_000n },
      ]),
      escrowLedgerEntry: { create: vi.fn() },
    };
    expect(await new EscrowService({} as never).holdForOrder(tx as never, "o1", "gateway-1")).toBe(3);
    const entries = tx.escrowLedgerEntry.create.mock.calls.map(([arg]) => arg.data);
    expect(entries).toEqual([
      { orderId: "o1", shipmentId: "s1", tenantId: "t1", entryType: "HOLD", settlementStatus: "SUCCESS", amount: 500_000, gatewayRef: "gateway-1" },
      { orderId: "o1", shipmentId: "s1", tenantId: "t2", entryType: "HOLD", settlementStatus: "SUCCESS", amount: 200_000, gatewayRef: "gateway-1" },
      { orderId: "o1", shipmentId: "s2", tenantId: "t1", entryType: "HOLD", settlementStatus: "SUCCESS", amount: 100_000, gatewayRef: "gateway-1" },
    ]);
    expect(entries.reduce((sum, e) => sum + e.amount, 0)).toBe(800_000);
  });
  it("creates no ledger entries for an empty order", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), escrowLedgerEntry: { create: vi.fn() } };
    expect(await new EscrowService({} as never).holdForOrder(tx as never, "o1", "gateway-1")).toBe(0);
    expect(tx.escrowLedgerEntry.create).not.toHaveBeenCalled();
  });
});
