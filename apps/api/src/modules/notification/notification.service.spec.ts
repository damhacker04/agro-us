import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import { NOTIF_EVENTS } from "@agro-os/shared";

function fixture() {
  const prisma = { user: { findUnique: vi.fn().mockResolvedValue({ phone: "+62000000000" }) }, shipment: { findUnique: vi.fn() } };
  const gateway = { push: vi.fn() };
  const sms = { send: vi.fn().mockResolvedValue(undefined) };
  return { prisma, gateway, sms, service: new NotificationService(prisma as never, gateway as never, sms as never) };
}

describe("notification routing with offline adapters", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it.each(["PENGIRIMAN_DIMULAI", "KURIR_MENDEKAT"] as const)("sends ordinary event %s only in app", async (kind) => {
    const f = fixture();
    const result = await f.service.kirim("u1", kind, "Title", "Body");
    expect(result).toMatchObject({ kind, severity: "BIASA", createdAt: "2026-09-09T12:00:00.000Z" });
    expect(f.gateway.push).toHaveBeenCalledWith("u1", result);
    expect(f.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(f.sms.send).not.toHaveBeenCalled();
  });
  it.each(["KURIR_TIBA", "GAGAL_PANEN", "KLAIM_DIPUTUS", "ESCROW_CAIR", "LEGALITAS_DIPUTUS", "KUOTA_DITURUNKAN"] as const)("escalates critical event %s through the messaging port", async (kind) => {
    const f = fixture();
    const result = await f.service.kirim("u1", kind, "Title", "Body", { shipmentId: "s1" });
    expect(result.severity).toBe("KRITIS");
    expect(result.shipmentId).toBe("s1");
    expect(f.sms.send).toHaveBeenCalledWith("+62000000000", "Title — Body");
  });
  it.each([null, { phone: null }])("handles missing recipient phone %j", async (user) => {
    const f = fixture(); f.prisma.user.findUnique.mockResolvedValue(user as never);
    await f.service.kirim("u1", "KURIR_TIBA", "Arrived", "Inspect");
    expect(f.sms.send).not.toHaveBeenCalled();
  });
  it("does not fail committed business work when the messaging provider fails", async () => {
    const f = fixture(); f.sms.send.mockRejectedValue(new Error("provider offline"));
    await expect(f.service.kirim("u1", "ESCROW_CAIR", "Settlement", "Pending")).resolves.toMatchObject({ kind: "ESCROW_CAIR" });
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining("provider offline"));
  });
  it("resolves the actual buyer from the shipment relationship", async () => {
    const f = fixture();
    f.prisma.shipment.findUnique.mockResolvedValue({ orderId: "o1", order: { buyer: { userId: "actual-owner" } } });
    await f.service.kirimKePembeliPengiriman("s1", "KURIR_MENDEKAT", "Near", "Prepare");
    expect(f.gateway.push).toHaveBeenCalledWith("actual-owner", expect.objectContaining({ orderId: "o1", shipmentId: "s1" }));
  });
  it("does not emit notifications for an unknown shipment", async () => {
    const f = fixture(); f.prisma.shipment.findUnique.mockResolvedValue(null);
    expect(await f.service.kirimKePembeliPengiriman("missing", "KURIR_TIBA", "Arrived", "Inspect")).toBeNull();
    expect(f.gateway.push).not.toHaveBeenCalled();
  });
});


describe("notification gateway payload delivery", () => {
  const jwt = (payload: unknown) => ({ verifyAsync: vi.fn().mockResolvedValue(payload) });
  const rejectingJwt = () => ({ verifyAsync: vi.fn().mockRejectedValue(new Error("invalid signature")) });
  const socket = (token?: string) => ({ id: "client", join: vi.fn(), handshake: { auth: token ? { token } : {}, headers: {} } });

  it("tolerates a disconnected adapter without breaking the caller", () => {
    expect(() => new NotificationGateway(jwt(null) as never).push("u1", {} as never)).not.toThrow();
  });
  it("delivers to the intended per-user room only", () => {
    const gateway = new NotificationGateway(jwt(null) as never); const emit = vi.fn(); const to = vi.fn().mockReturnValue({ emit });
    gateway.server = { to } as never;
    const notification = { kind: "KURIR_TIBA", body: "Example" };
    gateway.push("u1", notification as never);
    expect(to).toHaveBeenCalledWith("user:u1");
    expect(emit).toHaveBeenCalledWith(NOTIF_EVENTS.PUSH, notification);
  });
  it("subscribes an authenticated client to its own room without trusting the payload", async () => {
    const gateway = new NotificationGateway(jwt({ sub: "u1", role: "BUYER" }) as never);
    const client = socket("valid-token");
    expect(await gateway.onSubscribe({}, client as never)).toEqual({ ok: true, room: "user:u1" });
    expect(client.join).toHaveBeenCalledWith("user:u1");
  });
  it.each([undefined, "", "not-a-bearer"])("refuses to open a room without a verifiable token %j", async (token) => {
    const client = socket(token as string | undefined);
    const gateway = new NotificationGateway(rejectingJwt() as never);
    expect(await gateway.onSubscribe({ userId: "u1" }, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
  // The identity comes from the signed token; the payload may only name the caller itself.
  it("rejects subscribing to another user's notifications", async () => {
    const gateway = new NotificationGateway(jwt({ sub: "u1", role: "BUYER" }) as never);
    const client = socket("valid-token");
    expect(await gateway.onSubscribe({ userId: "another-user" }, client as never)).toMatchObject({ ok: false, error: "AKSES_DITOLAK" });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("rejects an anonymous client even when it knows a real user id", async () => {
    const gateway = new NotificationGateway(jwt({ sub: "u1", role: "BUYER" }) as never);
    const client = { id: "anonymous", join: vi.fn(), handshake: { auth: {}, headers: {} } };
    expect(await gateway.onSubscribe({ userId: "u1" }, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
});
