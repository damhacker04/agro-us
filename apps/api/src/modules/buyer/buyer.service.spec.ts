import { describe, expect, it, vi } from "vitest";
import { BuyerService } from "./buyer.service";

const buyer = { id: "b1", userId: "u1", companyName: "Cafe QA", activeZone: { id: "z1", name: "Malang", city: "Malang", minOrderValue: 100_000 } };
function fixture() {
  const prisma = {
    buyer: { findUnique: vi.fn().mockResolvedValue(buyer), create: vi.fn(), update: vi.fn() },
    zone: { findUnique: vi.fn().mockResolvedValue({ id: "z1" }) },
    shortfallSeniority: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma, service: new BuyerService(prisma as never) };
}

describe("BuyerService profile and active delivery zone", () => {
  it("creates a profile only after validating the active zone and returns server data", async () => {
    const { prisma, service } = fixture();
    prisma.buyer.findUnique.mockResolvedValueOnce(null as never);
    await expect(service.createProfile("u1", "Cafe QA", "z1")).resolves.toEqual({ id: "b1", companyName: "Cafe QA", activeZone: buyer.activeZone });
    expect(prisma.zone.findUnique).toHaveBeenCalledWith({ where: { id: "z1" }, select: { id: true } });
    expect(prisma.buyer.create).toHaveBeenCalledWith({ data: { userId: "u1", companyName: "Cafe QA", activeZoneId: "z1" } });
  });
  it("prevents a second profile for the same user", async () => {
    const { prisma, service } = fixture();
    await expect(service.createProfile("u1", "Cafe QA", "z1")).rejects.toMatchObject({ response: { code: "BUYER_EXISTS" } });
    expect(prisma.buyer.create).not.toHaveBeenCalled();
  });
  it("does not create a buyer with an unknown zone", async () => {
    const { prisma, service } = fixture();
    prisma.buyer.findUnique.mockResolvedValueOnce(null as never);
    prisma.zone.findUnique.mockResolvedValue(null as never);
    await expect(service.createProfile("u1", "Cafe QA", "missing")).rejects.toMatchObject({ response: { code: "ZONE_UNKNOWN" } });
    expect(prisma.buyer.create).not.toHaveBeenCalled();
  });
  it("returns a null activeZone explicitly for a profile without a relation", async () => {
    const { prisma, service } = fixture();
    prisma.buyer.findUnique.mockResolvedValue({ ...buyer, activeZone: null } as never);
    await expect(service.getProfile("u1")).resolves.toEqual({ id: "b1", companyName: "Cafe QA", activeZone: null });
  });
  it.each(["getProfile", "requireBuyer"] as const)("%s identifies missing onboarding", async (method) => {
    const { prisma, service } = fixture();
    prisma.buyer.findUnique.mockResolvedValue(null as never);
    await expect(service[method]("u1")).rejects.toMatchObject({ response: { code: "BUYER_NOT_FOUND" } });
  });
  it("updates company and delivery zone using the authenticated buyer id", async () => {
    const { prisma, service } = fixture();
    await service.updateProfile("u1", { companyName: "Cafe Baru", activeZoneId: "z2" });
    expect(prisma.zone.findUnique).toHaveBeenCalledWith({ where: { id: "z2" }, select: { id: true } });
    expect(prisma.buyer.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { companyName: "Cafe Baru", activeZoneId: "z2" } });
  });
  it("omits unspecified fields instead of clearing the zone", async () => {
    const { prisma, service } = fixture();
    await service.updateProfile("u1", {});
    expect(prisma.zone.findUnique).not.toHaveBeenCalled();
    expect(prisma.buyer.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: {} });
  });
  it("rejects an invalid zone before changing the profile", async () => {
    const { prisma, service } = fixture();
    prisma.zone.findUnique.mockResolvedValue(null as never);
    await expect(service.updateProfile("u1", { activeZoneId: "missing" })).rejects.toMatchObject({ response: { code: "ZONE_UNKNOWN" } });
    expect(prisma.buyer.update).not.toHaveBeenCalled();
  });
  it("lists only unconsumed seniority of this buyer and serializes the grant time", async () => {
    const { prisma, service } = fixture();
    prisma.shortfallSeniority.findMany.mockResolvedValue([{ tenant: { id: "t1", companyName: "Kebun QA" }, grantedAt: new Date("2026-09-10T00:00:00Z") }] as never);
    await expect(service.listSeniority("u1")).resolves.toEqual([{ tenantId: "t1", tenantName: "Kebun QA", grantedAt: "2026-09-10T00:00:00.000Z" }]);
    expect(prisma.shortfallSeniority.findMany).toHaveBeenCalledWith({ where: { buyerId: "b1", consumedAt: null }, orderBy: { grantedAt: "desc" }, include: { tenant: { select: { id: true, companyName: true } } } });
  });
});
