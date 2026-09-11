import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { toVerificationBadge } from "@agro-os/shared";
import { CatalogService } from "./catalog.service";

const decimal = (value: string) => ({ toString: () => value });

function batch() {
  return {
    id: "batch-1", quotaBoxTotal: 12, quotaBoxSold: 2, lockedPrice: 45_000,
    claimedPlantDate: new Date("2026-08-01T05:00:00Z"),
    claimedHarvestDate: new Date("2026-09-20T18:00:00Z"),
    detectedPlantDate: new Date("2026-08-03T00:00:00Z"),
    detectedHarvestDate: new Date("2026-09-19T00:00:00Z"),
    productionStatus: "GROWING", verificationStatus: "TERVERIFIKASI",
    product: {
      id: "product-1", name: "Tomat segar", grade: "A", description: "Panen pagi",
      pricePerBox: 99_000, qtyKgPerBox: decimal("5.25"),
      commodity: { id: "tomato", name: "Tomat", category: "BUAH_UMBI", shrinkTolerancePct: decimal("4.5"), gradeStandards: { A: "Utuh" } },
      tenant: { id: "tenant-1", companyName: "Kebun Pagi", logoUrl: null, claimRatioCached: decimal("0.10"), yieldPositionCached: decimal("1.20") },
    },
    landPlot: { areaHa: decimal("1.25"), verificationTier: "NORMAL" },
  };
}

function fixture() {
  const prisma = {
    zone: { findUnique: vi.fn().mockResolvedValue({ id: "zone-1" }) },
    batch: { findMany: vi.fn().mockResolvedValue([batch()]), findUnique: vi.fn().mockResolvedValue(batch()) },
  };
  const signals = { recordSearchMiss: vi.fn().mockResolvedValue(undefined) };
  return { prisma, signals, service: new CatalogService(prisma as never, signals as never) };
}

describe("CatalogService browsing", () => {
  it("rejects an unknown service zone before querying stock", async () => {
    const f = fixture(); f.prisma.zone.findUnique.mockResolvedValue(null);
    await expect(f.service.browse({ zoneId: "missing" })).rejects.toMatchObject({ response: { code: "ZONE_UNKNOWN" } });
    expect(f.prisma.batch.findMany).not.toHaveBeenCalled();
  });

  it("restricts browse to active production and tenants serving the selected zone", async () => {
    const f = fixture(); await f.service.browse({ zoneId: "zone-1" });
    expect(f.prisma.batch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { productionStatus: { in: ["PLANNING", "GROWING"] }, product: { tenant: { tenantZones: { some: { zoneId: "zone-1" } } } } },
      orderBy: { claimedHarvestDate: "asc" },
    }));
  });

  it("combines commodity, grade, case-insensitive name, and satellite filters", async () => {
    const f = fixture();
    await f.service.browse({ zoneId: "zone-1", commodityId: "tomato", grade: "B", search: "ToMat", verifiedOnly: true });
    expect(f.prisma.batch.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      productionStatus: { in: ["PLANNING", "GROWING"] }, verificationStatus: "TERVERIFIKASI",
      product: { commodityId: "tomato", grade: "B", name: { contains: "ToMat", mode: "insensitive" }, tenant: { tenantZones: { some: { zoneId: "zone-1" } } } },
    } }));
  });

  it("leaves verification unrestricted when verifiedOnly is explicitly false", async () => {
    const f = fixture(); await f.service.browse({ zoneId: "zone-1", verifiedOnly: false, search: "" });
    expect(f.prisma.batch.findMany.mock.calls[0][0].where).not.toHaveProperty("verificationStatus");
    expect(f.prisma.batch.findMany.mock.calls[0][0].where.product).not.toHaveProperty("name");
  });

  it("prices remaining boxes using the locked batch price and serializes dates and decimals", async () => {
    const f = fixture(); const row = batch(); f.prisma.batch.findMany.mockResolvedValue([row]);
    expect(await f.service.browse({ zoneId: "zone-1" })).toEqual([{
      batchId: "batch-1", productId: "product-1", productName: "Tomat segar", grade: "A",
      lockedPrice: 45_000, qtyKgPerBox: 5.25, quotaBoxAvailable: 10, claimedHarvestDate: "2026-09-20",
      commodity: row.product.commodity, tenant: row.product.tenant,
      badge: toVerificationBadge("TERVERIFIKASI"), verificationStatus: "TERVERIFIKASI",
    }]);
    expect(f.signals.recordSearchMiss).not.toHaveBeenCalled();
  });

  it("removes sold-out and oversold rows while retaining exactly one available box", async () => {
    const f = fixture();
    f.prisma.batch.findMany.mockResolvedValue([
      { ...batch(), id: "sold", quotaBoxSold: 12 }, { ...batch(), id: "over", quotaBoxSold: 13 }, { ...batch(), id: "last", quotaBoxSold: 11 },
    ]);
    expect(await f.service.browse({ zoneId: "zone-1" })).toEqual([expect.objectContaining({ batchId: "last", quotaBoxAvailable: 1 })]);
    expect(f.signals.recordSearchMiss).not.toHaveBeenCalled();
  });

  it.each([{ rows: [] }, { rows: [{ ...batch(), quotaBoxSold: 12 }] }])("records an unmet search after availability filtering", async ({ rows }) => {
    const f = fixture(); f.prisma.batch.findMany.mockResolvedValue(rows);
    expect(await f.service.browse({ zoneId: "zone-1", commodityId: "tomato", search: "tomat" })).toEqual([]);
    expect(f.signals.recordSearchMiss).toHaveBeenCalledExactlyOnceWith("zone-1", "tomato", "tomat");
  });

  it("does not block an empty catalog on a pending analytics write", async () => {
    const f = fixture(); f.prisma.batch.findMany.mockResolvedValue([]);
    f.signals.recordSearchMiss.mockReturnValue(new Promise(() => {}));
    expect(await f.service.browse({ zoneId: "zone-1" })).toEqual([]);
    expect(f.signals.recordSearchMiss).toHaveBeenCalledWith("zone-1", undefined, undefined);
  });

  it.each(["TERVERIFIKASI", "FOTO_SAJA", "TIDAK_DAPAT"] as const)("maps the %s verification status to the public badge", async (status) => {
    const f = fixture(); f.prisma.batch.findMany.mockResolvedValue([{ ...batch(), verificationStatus: status }]);
    expect((await f.service.browse({ zoneId: "zone-1" }))[0]).toMatchObject({ badge: toVerificationBadge(status), verificationStatus: status });
  });
});

describe("CatalogService batch details", () => {
  it("returns not found for an unknown batch", async () => {
    const f = fixture(); f.prisma.batch.findUnique.mockResolvedValue(null);
    await expect(f.service.detail("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("exposes actual batch prices, claimed and detected dates, and normalized transparency metrics", async () => {
    const f = fixture();
    expect(await f.service.detail("batch-1")).toEqual({
      batchId: "batch-1", productId: "product-1", productName: "Tomat segar", description: "Panen pagi", grade: "A",
      lockedPrice: 45_000, qtyKgPerBox: 5.25, quotaBoxTotal: 12, quotaBoxAvailable: 10,
      claimedPlantDate: "2026-08-01", claimedHarvestDate: "2026-09-20", productionStatus: "GROWING",
      badge: toVerificationBadge("TERVERIFIKASI"), verificationStatus: "TERVERIFIKASI",
      detectedPlantDate: "2026-08-03", detectedHarvestDate: "2026-09-19",
      commodity: { id: "tomato", name: "Tomat", category: "BUAH_UMBI", shrinkTolerancePct: 4.5, gradeStandards: { A: "Utuh" } },
      tenant: { id: "tenant-1", companyName: "Kebun Pagi", logoUrl: null, claimRatioCached: 0.1, yieldPosition: 1.2 },
      landPlot: { areaHa: 1.25, verificationTier: "NORMAL" },
    });
    expect(f.prisma.batch.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "batch-1" } }));
  });

  it("keeps unavailable dates and cached metrics null", async () => {
    const f = fixture(); const row = batch();
    f.prisma.batch.findUnique.mockResolvedValue({ ...row, claimedPlantDate: null, detectedPlantDate: null, detectedHarvestDate: null,
      product: { ...row.product, tenant: { ...row.product.tenant, claimRatioCached: null, yieldPositionCached: null } },
    } as never);
    expect(await f.service.detail("batch-1")).toMatchObject({ claimedPlantDate: null, detectedPlantDate: null, detectedHarvestDate: null,
      tenant: { claimRatioCached: null, yieldPosition: null } });
  });

  it("preserves real Decimal zero metrics instead of treating them as missing", async () => {
    const f = fixture(); const row = batch();
    f.prisma.batch.findUnique.mockResolvedValue({ ...row, product: { ...row.product, tenant: { ...row.product.tenant,
      claimRatioCached: decimal("0"), yieldPositionCached: decimal("0"),
    } } });
    expect(await f.service.detail("batch-1")).toMatchObject({ tenant: { claimRatioCached: 0, yieldPosition: 0 } });
  });
});
