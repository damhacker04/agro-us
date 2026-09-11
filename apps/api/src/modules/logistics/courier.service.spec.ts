import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COURIER_PIN_MAX_ATTEMPTS, POSITION_INTERVAL_MS, POD_TIMEOUT_MS } from "@agro-os/shared";
import { CourierService, haversineM } from "./courier.service";
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;
const now = new Date("2026-09-09T00:00:00Z");
function fixture() {
  const shipment = { id: "s1", courierPinHash: "valid-hash", pinAttempts: 0, destRadiusM: 100, zone: { name: "Malang" } };
  const token = { id: "qr1", consumedAt: null, orderItem: { shipment, batch: { product: { tenant: { companyName: "Kebun" } } } } };
  const tx = { boxQrToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, trackingSession: { create: vi.fn().mockResolvedValue({ id: "session1" }) }, shipment: { update: vi.fn() } };
  const prisma = {
    boxQrToken: { findUnique: vi.fn().mockResolvedValue(token) }, shipment: { update: vi.fn().mockResolvedValue({ pinAttempts: 1 }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    trackingSession: { findUnique: vi.fn().mockResolvedValue({ id: "session1", shipmentId: "s1", endedAt: null }), update: vi.fn() },
    $transaction: vi.fn(async work => work(tx)), $queryRaw: vi.fn().mockResolvedValue([{ lat: -7.98, lng: 112.63 }]),
  };
  const qr = { hashCode: vi.fn().mockReturnValue("valid-hash") };
  const gateway = { emitStatus: vi.fn(), emitPosition: vi.fn() };
  const notif = { kirimKePembeliPengiriman: vi.fn() };
  return { shipment, token, prisma, tx, qr, gateway, notif, service: new CourierService(prisma as never, qr as never, gateway as never, notif as never) };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe("CourierService one-time QR activation", () => {
  it("inspects without consuming a QR token", async () => {
    const { service, tx } = fixture();
    expect(await service.inspectToken("secret")).toEqual({ valid: true, tenantName: "Kebun", destinationLabel: "Malang", remainingAttempts: COURIER_PIN_MAX_ATTEMPTS });
    expect(tx.boxQrToken.updateMany).not.toHaveBeenCalled();
  });
  it.each(["unknown", "consumed", "locked"])("returns a safe invalid result for %s token", async state => {
    const { service, token, shipment, prisma } = fixture();
    if (state === "unknown") prisma.boxQrToken.findUnique.mockResolvedValue(null);
    if (state === "consumed") token.consumedAt = now as never;
    if (state === "locked") shipment.pinAttempts = COURIER_PIN_MAX_ATTEMPTS;
    expect(await service.inspectToken("secret")).toMatchObject({ valid: false, code: `TOKEN_${state.toUpperCase()}` });
  });
  it.each(["unknown", "consumed", "unissued", "locked"])("rejects activation for %s credentials", async state => {
    const { service, token, shipment, prisma, tx } = fixture();
    if (state === "unknown") prisma.boxQrToken.findUnique.mockResolvedValue(null);
    if (state === "consumed") token.consumedAt = now as never;
    if (state === "unissued") shipment.courierPinHash = null as never;
    if (state === "locked") shipment.pinAttempts = COURIER_PIN_MAX_ATTEMPTS;
    await expect(service.verifyCode("secret", "1234")).rejects.toMatchObject({ response: { code: state === "unissued" ? "QR_NOT_ISSUED" : `TOKEN_${state.toUpperCase()}` } });
    expect(tx.trackingSession.create).not.toHaveBeenCalled();
  });
  it.each([1, COURIER_PIN_MAX_ATTEMPTS])("records wrong PIN attempt %i without consuming a QR", async attempts => {
    const { service, prisma, qr, tx } = fixture();
    qr.hashCode.mockReturnValue("incorrect"); prisma.shipment.update.mockResolvedValue({ pinAttempts: attempts });
    await expect(service.verifyCode("secret", "0000")).rejects.toMatchObject({ response: { code: "CODE_WRONG", remainingAttempts: COURIER_PIN_MAX_ATTEMPTS - attempts } });
    expect(tx.boxQrToken.updateMany).not.toHaveBeenCalled();
  });
  it("rejects a concurrent token reuse before creating a session", async () => {
    const { service, tx } = fixture(); tx.boxQrToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verifyCode("secret", "1234")).rejects.toMatchObject({ response: { code: "TOKEN_CONSUMED" } });
    expect(tx.trackingSession.create).not.toHaveBeenCalled();
  });
  it("starts tracking after PIN verification and emits dispatch without a premature receipt countdown", async () => {
    const { service, tx, gateway, notif } = fixture();
    expect(await service.verifyCode("secret", "1234")).toEqual({ sessionId: "session1", shipmentId: "s1", destination: { lat: -7.98, lng: 112.63 }, destRadiusM: 100, positionIntervalMs: POSITION_INTERVAL_MS });
    expect(tx.boxQrToken.updateMany).toHaveBeenCalledWith({ where: { id: "qr1", consumedAt: null }, data: { consumedAt: now } });
    expect(gateway.emitStatus).toHaveBeenCalledWith("s1", "DIKIRIM");
    expect(notif.kirimKePembeliPengiriman.mock.calls[0]).toHaveLength(4);
  });
  it("supports explicitly denied GPS without inventing a position", async () => {
    const { service, prisma, gateway } = fixture();
    expect(await service.flagNoGps("session1")).toEqual({ noGpsMode: true });
    expect(prisma.trackingSession.update).toHaveBeenCalledWith({ where: { id: "session1" }, data: { noGpsMode: true } });
    expect(gateway.emitPosition).not.toHaveBeenCalled();
  });
  it.each(["unknown", "ended"])("rejects %s tracking sessions", async state => {
    const { service, prisma } = fixture();
    prisma.trackingSession.findUnique.mockResolvedValue(state === "unknown" ? null : { id: "session1", endedAt: now });
    await expect(service.flagNoGps("session1")).rejects.toMatchObject({ response: { code: state === "unknown" ? "SESSION_UNKNOWN" : "SESSION_ENDED" } });
  });
});

describe("CourierService GPS plausibility and staged notifications", () => {
  it("haversine has correct identity, symmetry and known one-degree equatorial distance", () => {
    expect(haversineM(0, 0, 0, 0)).toBe(0);
    expect(haversineM(0, 0, 0, 1)).toBeCloseTo(111_194.93, 2);
    expect(haversineM(-7, 112, -8, 113)).toBeCloseTo(haversineM(-8, 113, -7, 112), 6);
  });
  it("stores an implausible jump for audit without triggering arrival", async () => {
    const { service, prisma, gateway, notif } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([{ lat: -7.98, lng: 112.63, device_ts: new Date(now.getTime() - 10_000) }]).mockResolvedValueOnce([{ dist: 5 }]);
    const result = await service.reportPosition("session1", -8.1, 112.63, now);
    expect(result).toEqual({ accepted: true, plausible: false, distanceToDestM: 5, arrived: false });
    expect(prisma.$queryRaw.mock.calls[1]!.slice(1)).toContain(false);
    expect(gateway.emitStatus).not.toHaveBeenCalled();
    expect(notif.kirimKePembeliPengiriman).not.toHaveBeenCalled();
  });
  it("permits a stationary position with a backwards device clock without dividing by zero", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([{ lat: -7.98, lng: 112.63, device_ts: new Date(now.getTime() + 10_000) }]).mockResolvedValueOnce([{ dist: 5000 }]);
    expect(await service.reportPosition("session1", -7.98, 112.63, now)).toMatchObject({ plausible: true, arrived: false });
  });
  it("starts the one-hour receipt countdown only after a plausible geofence arrival", async () => {
    const { service, prisma, gateway, notif } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ dist: 50 }]);
    expect(await service.reportPosition("session1", -7.98, 112.63, now)).toMatchObject({ arrived: true, plausible: true });
    expect(gateway.emitStatus).toHaveBeenCalledWith("s1", "TIBA_DI_LOKASI");
    expect(notif.kirimKePembeliPengiriman.mock.calls[0]![4]).toEqual({ countdownEndsAt: new Date(now.getTime() + POD_TIMEOUT_MS).toISOString() });
  });
  it("does not repeat arrival notification after the shipment state has already changed", async () => {
    const { service, prisma, notif } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ dist: 50 }]);
    prisma.shipment.updateMany.mockResolvedValue({ count: 0 });
    await service.reportPosition("session1", -7.98, 112.63, now);
    expect(notif.kirimKePembeliPengiriman).not.toHaveBeenCalled();
  });
  it.each([0, 1])("sends pre-arrival notification only for the process claiming notified1kmAt (count %i)", async count => {
    const { service, prisma, gateway, notif } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ dist: 900 }]);
    prisma.shipment.updateMany.mockResolvedValue({ count });
    expect(await service.reportPosition("session1", -7.98, 112.63, now)).toMatchObject({ arrived: false });
    expect(gateway.emitStatus).toHaveBeenCalledWith("s1", "MENDEKAT");
    expect(notif.kirimKePembeliPengiriman).toHaveBeenCalledTimes(count);
  });
  it("does not infer arrival if distance computation has no result", async () => {
    const { service, prisma, gateway } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.reportPosition("session1", -7.98, 112.63, now)).toMatchObject({ distanceToDestM: Infinity, arrived: false });
    expect(gateway.emitStatus).not.toHaveBeenCalled();
  });
  regression("BUG-BE-06: an implausible GPS jump must not be broadcast to the buyer's live map", async () => {
    const { service, prisma, gateway } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([{ lat: -7.98, lng: 112.63, device_ts: new Date(now.getTime() - 10_000) }]).mockResolvedValueOnce([{ dist: 5 }]);
    await service.reportPosition("session1", -8.1, 112.63, now);
    expect(gateway.emitPosition).not.toHaveBeenCalled();
  });
});
