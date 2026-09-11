import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLAIM_WINDOW_FALLBACK_MS, CLAIM_WINDOW_MS, POD_TIMEOUT_MS, SIGNAL_LOST_AFTER_MS } from "@agro-os/shared";
import { PodService } from "./pod.service";
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;
const now = new Date("2026-09-09T00:00:00Z");
function fixture() {
  const tx = { shipment: { update: vi.fn() }, trackingSession: { updateMany: vi.fn() } };
  const prisma = { shipment: { findFirst: vi.fn().mockResolvedValue({ id: "s1", status: "TIBA_DI_LOKASI" }), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ id: "s1", status: "DIKIRIM", arrivedAt: null }) }, $transaction: vi.fn(async work => work(tx)), $queryRaw: vi.fn().mockResolvedValue([]), trackingSession: { findFirst: vi.fn().mockResolvedValue(null) } };
  const gateway = { emitStatus: vi.fn() };
  const window = { normalMs: CLAIM_WINDOW_MS, fallbackMs: CLAIM_WINDOW_FALLBACK_MS, normalLabel: "2 jam" };
  return { prisma, tx, gateway, service: new PodService(prisma as never, gateway as never, window as never) };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe("PodService dual-signal receipt", () => {
  it.each(["TIBA_DI_LOKASI", "DIKIRIM"])("allows buyer confirmation from %s and starts the standard claim window", async status => {
    const { service, prisma, tx, gateway } = fixture();
    prisma.shipment.findFirst.mockResolvedValue({ id: "s1", status });
    expect(await service.confirmReceipt("u1", "s1", "/proof.jpg")).toEqual({ shipmentId: "s1", status: "DITERIMA", receivedMode: "BUYER_CONFIRM", claimWindowEndsAt: new Date(now.getTime() + CLAIM_WINDOW_MS).toISOString() });
    expect(prisma.shipment.findFirst.mock.calls[0]![0].where).toEqual({ id: "s1", order: { buyer: { userId: "u1" } } });
    expect(tx.shipment.update.mock.calls[0]![0].data).toMatchObject({ podPhotoUrl: "/proof.jpg", receivedMode: "BUYER_CONFIRM" });
    expect(tx.trackingSession.updateMany).toHaveBeenCalledWith({ where: { shipmentId: "s1", endedAt: null }, data: { endedAt: now, endedReason: "BUYER_CONFIRM" } });
    expect(gateway.emitStatus).toHaveBeenCalledWith("s1", "DITERIMA");
  });
  it.each(["DITERIMA", "SELESAI"])("rejects already %s shipments", async status => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue({ id: "s1", status });
    await expect(service.confirmReceipt("u1", "s1", "/proof.jpg")).rejects.toMatchObject({ response: { code: "ALREADY_RECEIVED" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("rejects receipt before dispatch", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue({ id: "s1", status: "PANEN" });
    await expect(service.confirmReceipt("u1", "s1", "/proof.jpg")).rejects.toMatchObject({ response: { code: "NOT_IN_TRANSIT" } });
  });
  it("hides a foreign shipment", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue(null);
    await expect(service.confirmReceipt("u1", "s1", "/proof.jpg")).rejects.toMatchObject({ status: 404 });
  });
  it("auto-accepts only geofence arrivals older than one hour with a 24-hour claim window", async () => {
    const { service, prisma, tx } = fixture();
    prisma.shipment.findMany.mockResolvedValue([{ id: "s1" }]);
    expect(await service.autoAcceptStale()).toEqual({ autoAccepted: 1 });
    expect(prisma.shipment.findMany.mock.calls[0]![0].where).toEqual({ status: "TIBA_DI_LOKASI", arrivedAt: { lt: new Date(now.getTime() - POD_TIMEOUT_MS) } });
    expect(tx.shipment.update.mock.calls[0]![0].data).toEqual({ status: "DITERIMA", receivedMode: "AUTO_60MIN", claimWindowEndsAt: new Date(now.getTime() + CLAIM_WINDOW_FALLBACK_MS) });
    expect(tx.trackingSession.updateMany.mock.calls[0]![0].data.endedReason).toBe("EXPIRED");
  });
  it("makes no changes when no fallback is due", async () => {
    const { service, prisma } = fixture();
    expect(await service.autoAcceptStale()).toEqual({ autoAccepted: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("reports absent location honestly and preserves the no-GPS flag", async () => {
    const { service, prisma } = fixture();
    prisma.trackingSession.findFirst.mockResolvedValue({ noGpsMode: true });
    expect(await service.snapshot("s1")).toEqual({ shipmentId: "s1", status: "DIKIRIM", position: null, positionAt: null, signalLost: false, distanceToDestM: null, arrivedAt: null, noGpsMode: true });
  });
  it.each([0, SIGNAL_LOST_AFTER_MS, SIGNAL_LOST_AFTER_MS + 1])("uses server age to identify lost signals (%i ms)", async age => {
    const { service, prisma } = fixture();
    const positionAt = new Date(now.getTime() - age);
    prisma.$queryRaw.mockResolvedValue([{ lat: -7.9, lng: 112.6, server_ts: positionAt, dist: 123.6 }]);
    prisma.shipment.findUnique.mockResolvedValue({ id: "s1", status: "TIBA_DI_LOKASI", arrivedAt: now });
    expect(await service.snapshot("s1")).toMatchObject({ position: { lat: -7.9, lng: 112.6 }, positionAt: positionAt.toISOString(), signalLost: age > SIGNAL_LOST_AFTER_MS, distanceToDestM: 124, arrivedAt: now.toISOString() });
  });
  it("rejects an unknown tracking shipment", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findUnique.mockResolvedValue(null);
    await expect(service.snapshot("s1")).rejects.toMatchObject({ status: 404 });
  });
  regression("BUG-BE-04: simultaneous buyer confirmations must commit and emit only once", async () => {
    const { service, gateway } = fixture();
    await Promise.all([service.confirmReceipt("u1", "s1", "/proof.jpg"), service.confirmReceipt("u1", "s1", "/proof.jpg")]);
    expect(gateway.emitStatus).toHaveBeenCalledTimes(1);
  });
});
