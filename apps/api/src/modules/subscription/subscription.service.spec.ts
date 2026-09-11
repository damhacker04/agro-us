import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_GRACE_DAYS } from "@agro-os/shared";
import { SubscriptionService } from "./subscription.service";

const now = new Date("2026-09-10T00:00:00Z");
const day = 86_400_000;
function fixture() {
  const prisma = { subscription: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(async ({ data }) => ({ id: "s1", ...data })) } };
  return { prisma, service: new SubscriptionService(prisma as never) };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe("SubscriptionService access boundary", () => {
  it("returns an explicit unsubscribed state and queries the latest period", async () => {
    const { prisma, service } = fixture();
    await expect(service.status("t1")).resolves.toEqual({ active: false, status: "TIDAK_BERLANGGANAN", sub: null });
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({ where: { tenantId: "t1" }, orderBy: { periodEnd: "desc" } });
  });
  it.each([
    [0, "ACTIVE", true],
    [-1, "GRACE", true],
    [-SUBSCRIPTION_GRACE_DAYS * day, "GRACE", true],
    [-SUBSCRIPTION_GRACE_DAYS * day - 1, "EXPIRED", false],
  ])("classifies period end offset %s at millisecond boundaries", async (offset, status, active) => {
    const { prisma, service } = fixture();
    const sub = { periodEnd: new Date(now.getTime() + Number(offset)), graceUntil: null, status: "EXPIRED" };
    prisma.subscription.findFirst.mockResolvedValue(sub);
    await expect(service.status("t1", now)).resolves.toEqual({ active, status, sub });
  });
  it("uses an explicit grace end rather than recalculating it", async () => {
    const { prisma, service } = fixture();
    prisma.subscription.findFirst.mockResolvedValue({ periodEnd: new Date(now.getTime() - 1), graceUntil: new Date(now.getTime() - 1) });
    await expect(service.status("t1")).resolves.toMatchObject({ active: false, status: "EXPIRED" });
  });
  it("allows a feature through grace and keeps the subscription object", async () => {
    const { prisma, service } = fixture();
    const sub = { periodEnd: new Date(now.getTime() - 1), graceUntil: now };
    prisma.subscription.findFirst.mockResolvedValue(sub);
    await expect(service.requireActive("t1", "Rekomendasi")).resolves.toEqual({ active: true, status: "GRACE", sub });
  });
  it("rejects a paid feature without changing existing batch entitlements", async () => {
    const { prisma, service } = fixture();
    await expect(service.requireActive("t1", "Rekomendasi")).rejects.toMatchObject({ response: { code: "SUBSCRIPTION_REQUIRED", status: "TIDAK_BERLANGGANAN", message: expect.stringContaining("Rekomendasi") } });
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });
  it.each([undefined, 3])("creates a clearly simulated period with months=%s and a grace deadline", async (months) => {
    const { prisma, service } = fixture();
    const end = new Date("2026-09-10T00:00:00Z");
    end.setUTCMonth(end.getUTCMonth() + (months ?? 1));
    const result = months === undefined ? await service.activate("tenant-qa") : await service.activate("tenant-qa", months, now);
    expect(result).toEqual({ id: "s1", tenantId: "tenant-qa", plan: "VERIFIED", periodStart: now, periodEnd: end, graceUntil: new Date(end.getTime() + SUBSCRIPTION_GRACE_DAYS * day), status: "ACTIVE" });
    expect(prisma.subscription.create).toHaveBeenCalledOnce();
    expect(now.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });
});
