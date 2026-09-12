import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { BatchService } from "./batch.service";
import type { OpenQuotaDto } from "./catalog.dto";

const decimal = (value: string) => ({ toString: () => value });
function batch() {
  return {
    id: "batch-1", productId: "product-1", landPlotId: "plot-1", quotaBoxTotal: 100, quotaBoxSold: 20, quotaBoxFulfilled: null,
    lockedPrice: 45_000, claimedPlantDate: new Date("2026-08-01"), claimedHarvestDate: new Date("2026-09-20"),
    productionStatus: "GROWING", verificationStatus: "TERVERIFIKASI", detectedPlantDate: new Date("2026-08-03"), detectedHarvestDate: new Date("2026-09-19"),
    product: { name: "Tomat segar", grade: "A", qtyKgPerBox: decimal("5.25") },
    landPlot: { areaHa: decimal("1.25"), verificationTier: "NORMAL" },
  };
}
const quotaDto: OpenQuotaDto = { landPlotId: "plot-1", quotaBoxTotal: 100, lockedPrice: 45_000, claimedHarvestDate: "2026-09-20" };

function fixture() {
  const prisma = {
    landPlot: { findFirst: vi.fn().mockResolvedValue({ id: "plot-1", areaHa: decimal("2"), effectiveAreaHa: decimal("1.25") }) },
    commodity: { findUnique: vi.fn().mockResolvedValue({ avgYieldKgPerHa: decimal("8000") }) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ quotaMultiplier: decimal("0.70") }) },
    product: { findFirst: vi.fn().mockResolvedValue({ id: "product-1", commodityId: "tomato", qtyKgPerBox: decimal("5.25") }) },
    batch: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([batch()]),
      create: vi.fn().mockImplementation(async ({ data }) => ({ ...batch(), ...data, quotaBoxSold: 0, quotaBoxFulfilled: null, detectedPlantDate: null, detectedHarvestDate: null, verificationStatus: "FOTO_SAJA" })) },
  };
  return { prisma, service: new BatchService(prisma as never) };
}

describe("BatchService capacity invariants", () => {
  it("uses measured effective area, applies the safety factor once, and rounds down whole boxes", async () => {
    const f = fixture();
    expect(await f.service.getCapacity("tenant-1", "plot-1", "tomato", 5.25)).toEqual({
      landPlotId: "plot-1", areaHa: 1.25, avgYieldKgPerHa: 8000, qtyKgPerBox: 5.25, quotaMultiplier: 0.7, maxQuotaBox: 1333, available: true,
    });
    expect(f.prisma.landPlot.findFirst).toHaveBeenCalledWith({ where: { id: "plot-1", tenantId: "tenant-1" }, select: { id: true, areaHa: true, effectiveAreaHa: true } });
    expect(f.prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { id: "tenant-1" }, select: { quotaMultiplier: true } });
    expect(f.prisma.commodity.findUnique).toHaveBeenCalledWith({ where: { id: "tomato" }, select: { avgYieldKgPerHa: true } });
  });

  it.each([null, undefined])("uses nominal area only when effective area is absent (%s)", async (effectiveAreaHa) => {
    const f = fixture(); f.prisma.landPlot.findFirst.mockResolvedValue({ id: "plot-1", areaHa: decimal("2"), effectiveAreaHa });
    expect(await f.service.getCapacity("tenant-1", "plot-1", "tomato", 5)).toMatchObject({ areaHa: 2, maxQuotaBox: 2240 });
  });

  it("does not turn a measured zero effective area into usable nominal capacity", async () => {
    const f = fixture(); f.prisma.landPlot.findFirst.mockResolvedValue({ id: "plot-1", areaHa: decimal("2"), effectiveAreaHa: decimal("0") });
    expect(await f.service.getCapacity("tenant-1", "plot-1", "tomato", 5)).toMatchObject({ areaHa: 0, maxQuotaBox: 0 });
  });

  it("applies the reduced tenant quota multiplier after a shortfall penalty", async () => {
    const f = fixture(); f.prisma.tenant.findUnique.mockResolvedValue({ quotaMultiplier: decimal("0.50") });
    expect(await f.service.getCapacity("tenant-1", "plot-1", "tomato", 5)).toMatchObject({ quotaMultiplier: 0.5, maxQuotaBox: 1000 });
  });

  it("reports the active batch occupying a plot", async () => {
    const f = fixture(); f.prisma.batch.findFirst.mockResolvedValue({ id: "already-growing" });
    expect(await f.service.getCapacity("tenant-1", "plot-1", "tomato", 5)).toMatchObject({ available: false, blockingBatchId: "already-growing" });
    expect(f.prisma.batch.findFirst).toHaveBeenCalledWith({ where: { landPlotId: "plot-1", productionStatus: { in: ["PLANNING", "GROWING"] } }, select: { id: true } });
  });

  it("rejects a missing or foreign-owned plot before checking active batches", async () => {
    const f = fixture(); f.prisma.landPlot.findFirst.mockResolvedValue(null);
    await expect(f.service.getCapacity("tenant-2", "plot-1", "tomato", 5)).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.batch.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an unknown commodity", async () => {
    const f = fixture(); f.prisma.commodity.findUnique.mockResolvedValue(null);
    await expect(f.service.getCapacity("tenant-1", "plot-1", "missing", 5)).rejects.toMatchObject({ response: { code: "COMMODITY_UNKNOWN" } });
    expect(f.prisma.batch.findFirst).not.toHaveBeenCalled();
  });

  it.each([0, -0.5])("rejects invalid box weight %s before computing capacity", async (weight) => {
    const f = fixture();
    await expect(f.service.getCapacity("tenant-1", "plot-1", "tomato", weight)).rejects.toMatchObject({ response: { code: "BOX_SIZE_INVALID" } });
    expect(f.prisma.batch.findFirst).not.toHaveBeenCalled();
  });
});

describe("BatchService opening a quota", () => {
  it("rejects another tenant's product before resolving any plot capacity", async () => {
    const f = fixture(); f.prisma.product.findFirst.mockResolvedValue(null);
    await expect(f.service.openQuota("tenant-2", "product-1", quotaDto)).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.product.findFirst).toHaveBeenCalledWith({ where: { id: "product-1", tenantId: "tenant-2" }, select: { id: true, commodityId: true, qtyKgPerBox: true } });
    expect(f.prisma.landPlot.findFirst).not.toHaveBeenCalled();
    expect(f.prisma.batch.create).not.toHaveBeenCalled();
  });

  it("rejects a quota when another active batch already occupies the plot", async () => {
    const f = fixture(); f.prisma.batch.findFirst.mockResolvedValue({ id: "busy-batch" });
    await expect(f.service.openQuota("tenant-1", "product-1", quotaDto)).rejects.toMatchObject({ response: { code: "LAND_PLOT_BUSY", blockingBatchId: "busy-batch" } });
    expect(f.prisma.batch.create).not.toHaveBeenCalled();
  });

  it("rejects one box above capacity and explains the exact limit", async () => {
    const f = fixture();
    await expect(f.service.openQuota("tenant-1", "product-1", { ...quotaDto, quotaBoxTotal: 1334 })).rejects.toMatchObject({ response: {
      code: "QUOTA_EXCEEDS_CAPACITY", maxQuotaBox: 1333, message: expect.stringContaining("70%"),
    } });
    expect(f.prisma.batch.create).not.toHaveBeenCalled();
  });

  it("accepts exactly the capacity limit, locks the supplied price, and starts PLANNING without a plant date", async () => {
    const f = fixture();
    expect(await f.service.openQuota("tenant-1", "product-1", { ...quotaDto, quotaBoxTotal: 1333 })).toEqual({
      id: "batch-1", productId: "product-1", landPlotId: "plot-1", quotaBoxTotal: 1333, quotaBoxSold: 0, quotaBoxFulfilled: null,
      lockedPrice: 45_000, claimedPlantDate: null, claimedHarvestDate: "2026-09-20", productionStatus: "PLANNING",
      verificationStatus: "FOTO_SAJA", detectedPlantDate: null, detectedHarvestDate: null,
    });
    expect(f.prisma.batch.create).toHaveBeenCalledWith({ data: { productId: "product-1", landPlotId: "plot-1", quotaBoxTotal: 1333,
      lockedPrice: 45_000, claimedPlantDate: null, claimedHarvestDate: new Date("2026-09-20"), productionStatus: "PLANNING" } });
  });

  it("starts GROWING when planting precedes the harvest date", async () => {
    const f = fixture();
    expect(await f.service.openQuota("tenant-1", "product-1", { ...quotaDto, claimedPlantDate: "2026-08-01" })).toMatchObject({
      claimedPlantDate: "2026-08-01", productionStatus: "GROWING",
    });
    expect(f.prisma.batch.create).toHaveBeenCalledWith({ data: expect.objectContaining({ claimedPlantDate: new Date("2026-08-01"), productionStatus: "GROWING" }) });
  });

  it.each(["2026-09-20", "2026-09-21"])("rejects planting on or after the harvest date (%s)", async (claimedPlantDate) => {
    const f = fixture();
    await expect(f.service.openQuota("tenant-1", "product-1", { ...quotaDto, claimedPlantDate })).rejects.toMatchObject({ response: { code: "DATE_ORDER_INVALID" } });
    expect(f.prisma.batch.create).not.toHaveBeenCalled();
  });

  it("propagates a capacity database error without reserving a batch", async () => {
    const f = fixture(); const failure = new Error("capacity unavailable"); f.prisma.landPlot.findFirst.mockRejectedValue(failure);
    await expect(f.service.openQuota("tenant-1", "product-1", quotaDto)).rejects.toBe(failure);
    expect(f.prisma.batch.create).not.toHaveBeenCalled();
  });

  // Pemeriksaan ketersediaan terjadi sebelum insert yang terpisah, jadi dua pemanggil
  // bersamaan sama-sama melihat petak kosong. Yang menutup celahnya adalah partial unique
  // index `batches_land_plot_aktif_uniq`; di sini database-nya diwakili test double yang
  // menolak insert kedua persis seperti Postgres (P2002).
  function withActivePlotConstraint(f: ReturnType<typeof fixture>) {
    const taken = new Set<string>();
    const create = f.prisma.batch.create.getMockImplementation()!;
    f.prisma.batch.create.mockImplementation(async (args: { data: { landPlotId: string } }) => {
      if (taken.has(args.data.landPlotId)) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002", meta: { target: "batches_land_plot_aktif_uniq" } });
      taken.add(args.data.landPlotId);
      return create(args);
    });
  }

  it("does not open two active batches on the same plot when requests race (BE-15)", async () => {
    const f = fixture();
    withActivePlotConstraint(f);
    let completedChecks = 0;
    let releaseChecks!: () => void;
    const bothChecked = new Promise<void>((resolve) => { releaseChecks = resolve; });
    f.prisma.batch.findFirst.mockImplementation(async () => {
      completedChecks += 1;
      if (completedChecks === 2) releaseChecks();
      await bothChecked;
      return null;
    });
    const opened = await Promise.allSettled([
      f.service.openQuota("tenant-1", "product-1", quotaDto),
      f.service.openQuota("tenant-1", "product-1", quotaDto),
    ]);
    expect(opened.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("answers a lost race with the same LAND_PLOT_BUSY conflict as the pre-check (BE-15)", async () => {
    const f = fixture();
    f.prisma.batch.create.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    f.prisma.batch.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ id: "batch-pemenang" });
    await expect(f.service.openQuota("tenant-1", "product-1", quotaDto)).rejects.toMatchObject({
      response: { code: "LAND_PLOT_BUSY", blockingBatchId: "batch-pemenang" },
    });
  });

  it("does not disguise an unrelated database failure as a busy plot", async () => {
    const f = fixture();
    const failure = Object.assign(new Error("connection reset"), { code: "P1001" });
    f.prisma.batch.create.mockRejectedValue(failure);
    await expect(f.service.openQuota("tenant-1", "product-1", quotaDto)).rejects.toBe(failure);
  });
});

describe("BatchService tenant batch reads", () => {
  it("lists only the tenant's batches with product and plot display values", async () => {
    const f = fixture();
    expect(await f.service.findAll("tenant-1")).toEqual([{
      id: "batch-1", productId: "product-1", landPlotId: "plot-1", quotaBoxTotal: 100, quotaBoxSold: 20, quotaBoxFulfilled: null,
      lockedPrice: 45_000, claimedPlantDate: "2026-08-01", claimedHarvestDate: "2026-09-20", productionStatus: "GROWING", verificationStatus: "TERVERIFIKASI",
      detectedPlantDate: "2026-08-03", detectedHarvestDate: "2026-09-19", productName: "Tomat segar", grade: "A", qtyKgPerBox: 5.25, landPlotAreaHa: 1.25, landPlotTier: "NORMAL",
    }]);
    expect(f.prisma.batch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { product: { tenantId: "tenant-1" } }, orderBy: [{ productionStatus: "asc" }, { claimedHarvestDate: "asc" }],
      include: { product: { select: { name: true, grade: true, qtyKgPerBox: true } }, landPlot: { select: { areaHa: true, verificationTier: true } } },
    }));
  });

  it("returns an empty list for a tenant without batches", async () => {
    const f = fixture(); f.prisma.batch.findMany.mockResolvedValue([]);
    expect(await f.service.findAll("tenant-2")).toEqual([]);
  });

  it("conceals unknown or foreign-owned batches with not found", async () => {
    const f = fixture();
    await expect(f.service.findOne("tenant-2", "batch-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.batch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "batch-1", product: { tenantId: "tenant-2" } } }));
  });

  it("returns matching enriched data for a single tenant batch", async () => {
    const f = fixture(); f.prisma.batch.findFirst.mockResolvedValue(batch());
    expect(await f.service.findOne("tenant-1", "batch-1")).toEqual((await f.service.findAll("tenant-1"))[0]);
  });

  it("preserves null detected dates and explicit zero fulfillment", async () => {
    const f = fixture(); f.prisma.batch.findFirst.mockResolvedValue({ ...batch(), claimedPlantDate: null, detectedPlantDate: null, detectedHarvestDate: null, quotaBoxFulfilled: 0 });
    expect(await f.service.findOne("tenant-1", "batch-1")).toMatchObject({ claimedPlantDate: null, detectedPlantDate: null, detectedHarvestDate: null, quotaBoxFulfilled: 0 });
  });
});
