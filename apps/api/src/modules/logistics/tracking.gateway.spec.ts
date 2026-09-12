import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { TrackingGateway } from "./tracking.gateway";
import { WS_EVENTS } from "@agro-os/shared";

/**
 * Room pelacakan adalah data lokasi manusia yang sedang membawa barang ke alamat
 * pembeli. Uji di bawah menguji dua hal sekaligus: bentuk paket yang dipancarkan, dan
 * siapa yang boleh berada di dalam room untuk menerimanya.
 */
const jwt = (payload: unknown) => ({ verifyAsync: vi.fn().mockResolvedValue(payload) });
const rejectingJwt = () => ({ verifyAsync: vi.fn().mockRejectedValue(new Error("invalid signature")) });
const prismaStub = (shipment: unknown = null, session: unknown = null) => ({
  shipment: { findFirst: vi.fn().mockResolvedValue(shipment) },
  trackingSession: { findFirst: vi.fn().mockResolvedValue(session) },
});
const socket = (token?: string) => ({ id: "client", join: vi.fn(), handshake: { auth: token ? { token } : {}, headers: {} } });
const gateway = (jwtStub: unknown = jwt(null), prisma: unknown = prismaStub()) =>
  new TrackingGateway(jwtStub as never, prisma as never);

describe("tracking gateway delivery contract", () => {
  it("emits normalized time and rounded distance to the shipment room", () => {
    const g = gateway(); const emit = vi.fn(); const to = vi.fn().mockReturnValue({ emit });
    g.server = { to } as never;
    const position = { lat: -7.9, lng: 112.6 };
    g.emitPosition("s1", position, new Date("2026-09-09T12:00:00Z"), 99.6);
    expect(to).toHaveBeenCalledWith("shipment:s1");
    expect(emit).toHaveBeenCalledWith(WS_EVENTS.POSITION, { shipmentId: "s1", position, positionAt: "2026-09-09T12:00:00.000Z", distanceToDestM: 100 });
    g.emitStatus("s1", "ARRIVED");
    expect(emit).toHaveBeenLastCalledWith(WS_EVENTS.STATUS, { shipmentId: "s1", status: "ARRIVED" });
  });
  it("does not let adapter absence fail position persistence", () => {
    const g = gateway();
    expect(() => g.emitPosition("s1", { lat: 0, lng: 0 }, new Date(), 1)).not.toThrow();
    expect(() => g.emitStatus("s1", "ARRIVED")).not.toThrow();
  });
  it.each([undefined, {}, { shipmentId: "" }])("rejects empty subscription %j", async (body) => {
    const client = socket("valid-token");
    expect(await gateway().onSubscribe(body as never, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
});

describe("tracking gateway room authorization", () => {
  it("admits the buyer who owns the order behind the shipment", async () => {
    const prisma = prismaStub({ id: "s1" });
    const client = socket("valid-token");
    const g = gateway(jwt({ sub: "u1", role: "BUYER" }), prisma);
    expect(await g.onSubscribe({ shipmentId: "s1" }, client as never)).toEqual({ ok: true, room: "shipment:s1" });
    expect(client.join).toHaveBeenCalledWith("shipment:s1");
    // Kepemilikan diperiksa DI DALAM kueri, bukan dibandingkan sesudahnya.
    expect(prisma.shipment.findFirst.mock.calls[0]![0].where).toEqual({
      id: "s1",
      OR: [
        { order: { buyer: { userId: "u1" } } },
        { items: { some: { batch: { product: { tenant: { userId: "u1" } } } } } },
      ],
    });
  });
  it("admits an operator without an ownership lookup", async () => {
    const prisma = prismaStub();
    const client = socket("valid-token");
    const g = gateway(jwt({ sub: "op", role: "OPERATOR" }), prisma);
    expect(await g.onSubscribe({ shipmentId: "s1" }, client as never)).toMatchObject({ ok: true });
    expect(prisma.shipment.findFirst).not.toHaveBeenCalled();
  });
  it("rejects an authenticated user with no relationship to the shipment", async () => {
    const client = socket("valid-token");
    const g = gateway(jwt({ sub: "stranger", role: "BUYER" }), prismaStub(null));
    expect(await g.onSubscribe({ shipmentId: "someone-elses" }, client as never)).toMatchObject({ ok: false, error: "AKSES_DITOLAK" });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("rejects anonymous access to another buyer's shipment location", async () => {
    const client = { id: "anonymous", join: vi.fn(), handshake: { auth: {}, headers: {} } };
    const g = gateway(rejectingJwt(), prismaStub({ id: "s1" }));
    expect(await g.onSubscribe({ shipmentId: "other-buyers-order" }, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("rejects a token that does not verify", async () => {
    const client = socket("forged-token");
    const g = gateway(rejectingJwt(), prismaStub({ id: "s1" }));
    expect(await g.onSubscribe({ shipmentId: "s1" }, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("admits an accountless courier through an open tracking session for that shipment", async () => {
    const prisma = prismaStub(null, { id: "sess-1" });
    const client = { id: "kurir", join: vi.fn(), handshake: { auth: {}, headers: {} } };
    const g = gateway(jwt(null), prisma);
    expect(await g.onSubscribe({ shipmentId: "s1", sessionId: "sess-1" }, client as never)).toMatchObject({ ok: true });
    expect(prisma.trackingSession.findFirst.mock.calls[0]![0].where).toEqual({ id: "sess-1", shipmentId: "s1", endedAt: null });
  });
  it("rejects a courier session that is closed or belongs to another shipment", async () => {
    const client = { id: "kurir", join: vi.fn(), handshake: { auth: {}, headers: {} } };
    const g = gateway(jwt(null), prismaStub(null, null));
    expect(await g.onSubscribe({ shipmentId: "s1", sessionId: "sess-lain" }, client as never)).toMatchObject({ ok: false });
    expect(client.join).not.toHaveBeenCalled();
  });
});
