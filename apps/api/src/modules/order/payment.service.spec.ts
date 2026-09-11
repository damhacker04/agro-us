import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAYMENT_EXPIRY_MS } from "@agro-os/shared";
import { PaymentService } from "./payment.service";
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;

function fixture() {
  const tx = { payment: { update: vi.fn() }, order: { update: vi.fn() }, $executeRaw: vi.fn() };
  const prisma = { payment: { create: vi.fn(({ data }) => Promise.resolve({ id: "p1", ...data })), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) }, $transaction: vi.fn(async (work) => work(tx)) };
  const escrow = { holdForOrder: vi.fn() };
  return { prisma, tx, escrow, service: new PaymentService(prisma as never, escrow as never) };
}
const pending = { id: "p1", orderId: "o1", invoiceRef: "INV-1", status: "PENDING", order: { items: [] } };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T00:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("PaymentService invoice and accounting boundaries", () => {
  it.each(["QRIS", "VA", "EWALLET"] as const)("creates explicit simulated %s instructions with expiry", async (method) => {
    const { service, prisma } = fixture();
    const invoice = await service.createInvoice("o1", method, 500_000);
    expect(invoice).toMatchObject({ id: "p1", method, status: "PENDING", amount: 500_000, expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS).toISOString() });
    expect(prisma.payment.create.mock.calls[0]![0].data.orderId).toBe("o1");
    if (method === "QRIS") expect(invoice.payload).toContain(`SIMULASI-QRIS|${invoice.invoiceRef}|500000`);
    if (method === "VA") expect(invoice.payload).toMatch(/^8808\d{10}$/);
    if (method === "EWALLET") expect(invoice.payload).toBe(`https://simulasi-ewallet.local/pay/${invoice.invoiceRef}`);
  });
  it("uses the same unknown invoice response for absent or foreign demo payments", async () => {
    const { service, prisma } = fixture();
    prisma.payment.findFirst.mockResolvedValue(null);
    await expect(service.tandaiLunasDemo("u1", "INV-1")).rejects.toMatchObject({ response: { code: "INVOICE_NOT_FOUND" } });
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({ where: { invoiceRef: "INV-1", order: { buyer: { userId: "u1" } } }, select: { invoiceRef: true } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("allows the owning demo buyer through the normal paid accounting path", async () => {
    const { service, prisma, escrow } = fixture();
    prisma.payment.findFirst.mockResolvedValue({ invoiceRef: "INV-1" });
    prisma.payment.findUnique.mockResolvedValue(pending);
    expect(await service.tandaiLunasDemo("u1", "INV-1")).toMatchObject({ status: "PAID" });
    expect(escrow.holdForOrder).toHaveBeenCalledTimes(1);
  });
  it("rejects an unknown webhook invoice", async () => {
    const { service, prisma } = fixture();
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.handleWebhook("missing", "PAID")).rejects.toMatchObject({ response: { code: "INVOICE_NOT_FOUND" } });
  });
  it.each(["PAID", "FAILED", "EXPIRED"])("does not reprocess an already %s invoice", async (status) => {
    const { service, prisma, escrow } = fixture();
    prisma.payment.findUnique.mockResolvedValue({ ...pending, status });
    expect(await service.handleWebhook("INV-1", "PAID")).toEqual({ invoiceRef: "INV-1", status, alreadyProcessed: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(escrow.holdForOrder).not.toHaveBeenCalled();
  });
  it("moves a paid order and its tenant HOLD into one transaction without releasing inventory", async () => {
    const { service, prisma, tx, escrow } = fixture();
    prisma.payment.findUnique.mockResolvedValue(pending);
    expect(await service.handleWebhook("INV-1", "PAID")).toEqual({ invoiceRef: "INV-1", status: "PAID", alreadyProcessed: false });
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { orderStatus: "PAID" } });
    expect(escrow.holdForOrder).toHaveBeenCalledWith(tx, "o1", "INV-1");
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("releases reserved quota and closes failed payments without creating escrow", async () => {
    const { service, prisma, tx, escrow } = fixture();
    prisma.payment.findUnique.mockResolvedValue(pending);
    expect(await service.handleWebhook("INV-1", "FAILED")).toMatchObject({ status: "FAILED", alreadyProcessed: false });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls[0]!.slice(1)).toEqual(["o1"]);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { orderStatus: "CLOSED" } });
    expect(escrow.holdForOrder).not.toHaveBeenCalled();
  });
  it("does nothing when no invoices have expired", async () => {
    const { service, prisma } = fixture();
    expect(await service.expireStale()).toEqual({ expired: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("releases each expired reservation inside its own transaction", async () => {
    const { service, prisma, tx } = fixture();
    prisma.payment.findMany.mockResolvedValue([pending, { ...pending, id: "p2", orderId: "o2" }]);
    expect(await service.expireStale()).toEqual({ expired: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.payment.update).toHaveBeenNthCalledWith(2, { where: { id: "p2" }, data: { status: "EXPIRED" } });
    expect(tx.$executeRaw.mock.calls[1]!.slice(1)).toEqual(["o2"]);
  });
  it("propagates an escrow write failure rather than reporting a successful payment", async () => {
    const { service, prisma, escrow } = fixture();
    prisma.payment.findUnique.mockResolvedValue(pending);
    escrow.holdForOrder.mockRejectedValue(new Error("ledger unavailable"));
    await expect(service.handleWebhook("INV-1", "PAID")).rejects.toThrow("ledger unavailable");
  });

  // Expected failures document requirements currently violated. They turn into failures
  // if code is fixed, prompting conversion to ordinary regression tests; never skipped.
  regression("BUG-BE-01: simultaneous duplicate callbacks must create exactly one HOLD", async () => {
    const { service, prisma, escrow } = fixture();
    prisma.payment.findUnique.mockResolvedValue({ ...pending });
    await Promise.all([service.handleWebhook("INV-1", "PAID"), service.handleWebhook("INV-1", "PAID")]);
    expect(escrow.holdForOrder).toHaveBeenCalledTimes(1);
  });
});
