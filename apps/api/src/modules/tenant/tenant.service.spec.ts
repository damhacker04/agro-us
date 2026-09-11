import { describe, expect, it, vi } from "vitest";
import { TenantService } from "./tenant.service";

const zone = { id: "z1", name: "Malang", city: "Malang", minOrderValue: 100_000 };
const tenant = { id: "t1", userId: "u1", companyName: "Kebun QA", logoUrl: null, legalityStatus: "PENDING", claimRatioCached: null, yieldPositionCached: null, cleanCyclesStreak: 2, quotaMultiplier: "0.80", tenantZones: [{ zone }], _count: { landPlots: 2 } };
function fixture() {
  const prisma = {
    tenant: { findUnique: vi.fn().mockResolvedValue(tenant), create: vi.fn().mockResolvedValue(tenant), update: vi.fn() },
    zone: { findMany: vi.fn().mockResolvedValue([{ id: "z1" }]) },
    tenantZone: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return { prisma, service: new TenantService(prisma as never) };
}

describe("TenantService profile lifecycle", () => {
  it.each([undefined, "https://uploads.example.test/logo.jpg"])("creates profile and zone links with logo %s", async (logoUrl) => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValueOnce(null as never);
    await expect(service.createProfile("u1", "Kebun QA", ["z1"], logoUrl)).resolves.toMatchObject({ id: "t1", zones: [zone], landPlotCount: 2, quotaMultiplier: 0.8 });
    expect(prisma.tenant.create).toHaveBeenCalledWith({ data: { userId: "u1", companyName: "Kebun QA", logoUrl: logoUrl ?? null, tenantZones: { create: [{ zoneId: "z1" }] } } });
    expect(prisma.tenant.findUnique.mock.lastCall?.[0].where).toEqual({ id: "t1" });
  });
  it("rejects duplicate onboarding before changing the profile", async () => {
    const { prisma, service } = fixture();
    await expect(service.createProfile("u1", "Kebun QA", ["z1"])).rejects.toMatchObject({ response: { code: "TENANT_EXISTS" } });
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });
  it("identifies unknown zones and does not create a partial profile", async () => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValueOnce(null as never);
    await expect(service.createProfile("u1", "Kebun QA", ["z1", "missing"])).rejects.toMatchObject({ response: { code: "ZONE_UNKNOWN", message: "Zona tidak dikenal: missing" } });
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });
  it("serializes Prisma-like decimal values and preserves absence of benchmarks", async () => {
    const { prisma, service } = fixture();
    await expect(service.getProfile("u1")).resolves.toMatchObject({ claimRatioCached: null, yieldPosition: null, quotaMultiplier: 0.8 });
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, claimRatioCached: { valueOf: () => 0 }, yieldPositionCached: { valueOf: () => -0.25 } } as never);
    await expect(service.getProfile("u1")).resolves.toMatchObject({ claimRatioCached: 0, yieldPosition: -0.25 });
    expect(prisma.tenant.findUnique.mock.lastCall?.[0].where).toEqual({ userId: "u1" });
  });
  it.each(["getProfile", "requireTenant"] as const)("%s reports an incomplete onboarding", async (method) => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue(null as never);
    await expect(service[method]("u1")).rejects.toMatchObject({ response: { code: "TENANT_NOT_FOUND" } });
  });
  it("updates only supplied scalar fields", async () => {
    const { prisma, service } = fixture();
    await service.updateProfile("u1", { companyName: "Nama baru", logoUrl: "https://uploads.example.test/new.jpg" });
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { companyName: "Nama baru", logoUrl: "https://uploads.example.test/new.jpg" } });
    expect(prisma.tenantZone.deleteMany).not.toHaveBeenCalled();
  });
  it("replaces zones only after checking every requested zone", async () => {
    const { prisma, service } = fixture();
    prisma.zone.findMany.mockResolvedValue([{ id: "z2" }] as never);
    await service.updateProfile("u1", { zoneIds: ["z2"] });
    expect(prisma.tenantZone.deleteMany).toHaveBeenCalledWith({ where: { tenantId: "t1" } });
    expect(prisma.tenantZone.createMany).toHaveBeenCalledWith({ data: [{ tenantId: "t1", zoneId: "z2" }] });
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: {} });
  });
  it("keeps existing zone links when validation fails", async () => {
    const { prisma, service } = fixture();
    prisma.zone.findMany.mockResolvedValue([]);
    await expect(service.updateProfile("u1", { zoneIds: ["missing"] })).rejects.toMatchObject({ response: { code: "ZONE_UNKNOWN" } });
    expect(prisma.tenantZone.deleteMany).not.toHaveBeenCalled();
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it("resubmits a rejected document to the operator queue and clears the reviewer", async () => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, legalityStatus: "REJECTED" } as never);
    await service.submitLegality("u1", "https://uploads.example.test/doc.jpg");
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { legalityDocUrl: "https://uploads.example.test/doc.jpg", legalityStatus: "PENDING", reviewedById: null } });
  });
  it("does not overwrite a document already approved", async () => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, legalityStatus: "APPROVED" } as never);
    await expect(service.submitLegality("u1", "new-url")).rejects.toMatchObject({ response: { code: "LEGALITY_APPROVED" } });
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it("returns public service zones in stable name order", async () => {
    const { prisma, service } = fixture();
    prisma.zone.findMany.mockResolvedValue([zone]);
    await expect(service.listZones()).resolves.toEqual([zone]);
    expect(prisma.zone.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true, minOrderValue: true } });
  });
});
