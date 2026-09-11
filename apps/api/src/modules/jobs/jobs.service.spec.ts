import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { JobsService } from "./jobs.service";

function fixture() {
  const prisma = { tenant: { findMany: vi.fn().mockResolvedValue([]), findUniqueOrThrow: vi.fn() } };
  const pod = { autoAcceptStale: vi.fn().mockResolvedValue({ accepted: 0 }) };
  const settlement = { settleExpiredClaimWindows: vi.fn().mockResolvedValue({ settled: 0 }) };
  const payments = { expireStale: vi.fn().mockResolvedValue({ expired: 0 }) };
  const anchors = { anchorAll: vi.fn().mockResolvedValue({ created: 0 }) };
  const allocation = { applyShortfallPenalty: vi.fn().mockResolvedValue(undefined) };
  const service = new JobsService(prisma as never, pod as never, settlement as never, payments as never, anchors as never, allocation as never);
  return { service, prisma, pod, settlement, payments, anchors, allocation };
}

describe("scheduled business jobs", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_ENABLED", "true");
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each(["false", "FALSE"])("disables all scheduled mutations when CRON_ENABLED=%s", async (value) => {
    vi.stubEnv("CRON_ENABLED", value);
    const f = fixture();
    await Promise.all([f.service.autoTerima(), f.service.cairkanEscrow(), f.service.lepasTagihanKedaluwarsa(), f.service.jangkarHashHarian(), f.service.hitungUlangPenaltiKuota()]);
    for (const spy of [f.pod.autoAcceptStale, f.settlement.settleExpiredClaimWindows, f.payments.expireStale, f.anchors.anchorAll, f.prisma.tenant.findMany]) expect(spy).not.toHaveBeenCalled();
  });

  it("enables jobs by default and invokes every business operation", async () => {
    vi.stubEnv("CRON_ENABLED", undefined);
    const f = fixture();
    await Promise.all([f.service.autoTerima(), f.service.cairkanEscrow(), f.service.lepasTagihanKedaluwarsa(), f.service.jangkarHashHarian()]);
    for (const spy of [f.pod.autoAcceptStale, f.settlement.settleExpiredClaimWindows, f.payments.expireStale, f.anchors.anchorAll]) expect(spy).toHaveBeenCalledTimes(1);
  });

  it("prevents overlapping executions of the same job while other jobs proceed", async () => {
    const f = fixture();
    let finish!: (result: { accepted: number }) => void;
    f.pod.autoAcceptStale.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const pending = f.service.autoTerima();
    await f.service.autoTerima();
    await f.service.cairkanEscrow();
    expect(f.pod.autoAcceptStale).toHaveBeenCalledTimes(1);
    expect(f.settlement.settleExpiredClaimWindows).toHaveBeenCalledTimes(1);
    finish({ accepted: 1 });
    await pending;
    f.pod.autoAcceptStale.mockResolvedValue({ accepted: 0 });
    await f.service.autoTerima();
    expect(f.pod.autoAcceptStale).toHaveBeenCalledTimes(2);
  });

  it("releases the overlap lock after failure so the next run can recover", async () => {
    const f = fixture();
    f.payments.expireStale.mockRejectedValueOnce(new Error("database temporarily down"));
    await expect(f.service.lepasTagihanKedaluwarsa()).resolves.toBeUndefined();
    await f.service.lepasTagihanKedaluwarsa();
    expect(f.payments.expireStale).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining("database temporarily down"));
  });

  it.each([null, {}, { created: 0 }, { status: "idle", enabled: true }])("keeps zero-work results quiet: %j", async (result) => {
    const f = fixture();
    vi.mocked(Logger.prototype.log).mockClear();
    f.anchors.anchorAll.mockResolvedValue(result as never);
    await f.service.jangkarHashHarian();
    expect(Logger.prototype.log).not.toHaveBeenCalled();
  });

  it("logs actual work and counts changed tenant multipliers", async () => {
    const f = fixture();
    f.prisma.tenant.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }] as never);
    const unchanged = { equals: vi.fn().mockReturnValue(true) };
    const changed = { equals: vi.fn().mockReturnValue(false) };
    f.prisma.tenant.findUniqueOrThrow
      .mockResolvedValueOnce({ quotaMultiplier: unchanged }).mockResolvedValueOnce({ quotaMultiplier: 0.7 })
      .mockResolvedValueOnce({ quotaMultiplier: changed }).mockResolvedValueOnce({ quotaMultiplier: 0.5 });
    await f.service.hitungUlangPenaltiKuota();
    expect(f.allocation.applyShortfallPenalty.mock.calls).toEqual([["a"], ["b"]]);
    expect(unchanged.equals).toHaveBeenCalledWith(0.7);
    expect(changed.equals).toHaveBeenCalledWith(0.5);
    expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('"multiplierBerubah":1'));
  });
});
