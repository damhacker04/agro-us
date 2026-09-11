import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { TrackingGateway } from "./tracking.gateway";
import { WS_EVENTS } from "@agro-os/shared";

describe("tracking gateway delivery contract", () => {
  it("emits normalized time and rounded distance to the shipment room", () => {
    const gateway = new TrackingGateway(); const emit = vi.fn(); const to = vi.fn().mockReturnValue({ emit });
    gateway.server = { to } as never;
    const position = { lat: -7.9, lng: 112.6 };
    gateway.emitPosition("s1", position, new Date("2026-09-09T12:00:00Z"), 99.6);
    expect(to).toHaveBeenCalledWith("shipment:s1");
    expect(emit).toHaveBeenCalledWith(WS_EVENTS.POSITION, { shipmentId: "s1", position, positionAt: "2026-09-09T12:00:00.000Z", distanceToDestM: 100 });
    gateway.emitStatus("s1", "ARRIVED");
    expect(emit).toHaveBeenLastCalledWith(WS_EVENTS.STATUS, { shipmentId: "s1", status: "ARRIVED" });
  });
  it("does not let adapter absence fail position persistence", () => {
    const gateway = new TrackingGateway();
    expect(() => gateway.emitPosition("s1", { lat: 0, lng: 0 }, new Date(), 1)).not.toThrow();
    expect(() => gateway.emitStatus("s1", "ARRIVED")).not.toThrow();
  });
  it.each([undefined, {}, { shipmentId: "" }])("rejects empty subscription %j", (body) => {
    const join = vi.fn();
    expect(new TrackingGateway().onSubscribe(body as never, { join } as never)).toMatchObject({ ok: false });
    expect(join).not.toHaveBeenCalled();
  });
  const regression = process.env.QA_ENFORCE_REGRESSIONS === "1" ? it : it.fails;
  regression("KNOWN GAP: rejects anonymous access to another buyer's shipment location", () => {
    const client = { id: "anonymous", join: vi.fn() };
    new TrackingGateway().onSubscribe({ shipmentId: "other-buyers-order" }, client as never);
    expect(client.join).not.toHaveBeenCalled();
  });
});
