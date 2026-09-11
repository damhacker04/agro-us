import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { MIN_BENCHMARK_SAMPLE } from "@agro-os/shared";
import { YieldAssessmentService } from "./yield-assessment.service";

// Isolate business cases from operator-specific environment tuning.
vi.mock("./thresholds", () => ({ LEBAR_PITA: 0.4, BATAS_TIDAK_WAJAR: 0.65, DEVIASI_ZONA_SIGMA: 1.5, SLA_TINJAUAN_JAM: 24 }));
const now = new Date("2026-09-10T12:00:00Z");
const batchRow = (overrides: Record<string, unknown> = {}) => ({ quota_box_sold: 100, qty_kg_per_box: "10", avg_yield_kg_per_ha: "1000", effective_area_ha: "1", peak_ndvi: "0.75", commodity_id: "tomato", claimed_harvest_date: now, zone_id: null, ...overrides });
function fixture(overrides: Record<string, unknown> = {}) {
  const batch = batchRow(overrides);
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([batch]), $executeRawUnsafe: vi.fn(),
    commoditySeasonBaseline: { findUnique: vi.fn().mockResolvedValue({ ndviPeakReference: 0.75, vigorCurveParams: {} }) },
    yieldAssessment: { create: vi.fn().mockResolvedValue({ id: "assessment" }), count: vi.fn().mockResolvedValue(3), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue({ id: "assessment" }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue({ id: "assessment", batchId: "batch" }) },
    batch: { update: vi.fn(), findFirst: vi.fn().mockResolvedValue({ id: "batch" }) },
    satelliteObservation: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { batch, prisma, service: new YieldAssessmentService(prisma as never) };
}
const historyRow = (overrides: Record<string, unknown> = {}) => ({ id: "assessment", assessedAt: now, reportedBox: 50, expectedYieldMin: "60", expectedYieldMax: "140", peakNdviUsed: "0.75", basis: "PITA_SAJA", verdict: "PERLU_DITINJAU", finalVerdict: null, confirmedAt: null, slaDueAt: now, ...overrides });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("YieldAssessmentService persisted preview and uncertainty", () => {
  it("persists the preview evidence and caches its verdict without confirming harvest", async () => {
    const { service, prisma } = fixture();
    expect(await service.nilai("batch", 100)).toMatchObject({ assessmentId: "assessment", reportedBox: 100, verdict: "WAJAR", expectedMinBox: 60, expectedMaxBox: 140, peakNdvi: 0.75, basis: "PITA_SAJA", zoneBenchmarkRatio: null, zoneSampleCount: 0 });
    expect(prisma.yieldAssessment.create).toHaveBeenCalledWith({ data: { batchId: "batch", reportedBox: 100, expectedYieldMin: 60, expectedYieldMax: 140, peakNdviUsed: 0.75, zoneBenchmarkRatio: null, basis: "PITA_SAJA", verdict: "WAJAR", slaDueAt: null }, select: { id: true } });
    expect(prisma.batch.update).toHaveBeenCalledWith({ where: { id: "batch" }, data: { plausibilityCached: "WAJAR" } });
  });
  it.each([
    { changes: { peak_ndvi: null }, text: "Puncak kehijauan" },
    { changes: { effective_area_ha: null }, text: "Luas efektif" },
  ])("reports missing evidence honestly ($text)", async ({ changes, text }) => {
    const { service, prisma } = fixture(changes);
    expect(await service.nilai("batch", 20)).toMatchObject({ verdict: "TIDAK_DAPAT_DINILAI", basis: "TIDAK_ADA_DASAR", expectedMinBox: null, expectedMaxBox: null, peakNdvi: null, zoneBenchmarkRatio: null, zoneSampleCount: 0, reason: expect.stringContaining(text) });
    expect(prisma.commoditySeasonBaseline.findUnique).not.toHaveBeenCalled();
    // The history must retain what the tenant actually reported, even when evidence is absent.
    expect(prisma.yieldAssessment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reportedBox: 20 }) }));
  });
  it("returns an explicit unknown-batch reason when the data query yields no row", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.nilai("missing", 10)).toMatchObject({ verdict: "TIDAK_DAPAT_DINILAI", reason: "Batch tidak ditemukan" });
  });
  it.each([
    ["2026-01-01", "MUSIM_HUJAN", "musim hujan"],
    ["2026-04-30", "MUSIM_HUJAN", "musim hujan"],
    ["2026-05-01", "MUSIM_KEMARAU", "musim kemarau"],
    ["2026-10-31", "MUSIM_KEMARAU", "musim kemarau"],
    ["2026-11-01", "MUSIM_HUJAN", "musim hujan"],
  ])("selects the seasonal baseline at %s", async (date, season, label) => {
    const { service, prisma } = fixture({ claimed_harvest_date: new Date(`${date}T00:00:00Z`) }); prisma.commoditySeasonBaseline.findUnique.mockResolvedValue(null);
    expect(await service.nilai("batch", 20)).toMatchObject({ verdict: "TIDAK_DAPAT_DINILAI", reason: expect.stringContaining(label) });
    expect(prisma.commoditySeasonBaseline.findUnique).toHaveBeenCalledWith({ where: { commodityId_season: { commodityId: "tomato", season } }, select: { ndviPeakReference: true, vigorCurveParams: true } });
  });
  it.each([
    [1000, "WAJAR"], [60, "WAJAR"], [59, "PERLU_DITINJAU"], [39, "PERLU_DITINJAU"], [38, "TIDAK_WAJAR"], [0, "TIDAK_WAJAR"],
  ])("classifies %i reported boxes against the 60–140 box band as %s", async (reported, verdict) => {
    const { service, prisma } = fixture();
    const result = await service.nilai("batch", reported);
    expect(result).toMatchObject({ reportedBox: reported, verdict });
    expect(result.reason).toContain("60–140 box");
    const saved = prisma.yieldAssessment.create.mock.calls[0]![0].data;
    expect(saved.slaDueAt).toEqual(verdict === "PERLU_DITINJAU" ? new Date(now.getTime() + 86_400_000) : null);
    expect(saved).not.toHaveProperty("threshold");
  });
  it.each([["0.0", 27, 63], ["0.35", 27, 63], ["0.55", 44, 102], ["2.0", 75, 175]])("clamps vigor from NDVI %s to a defensible band %i–%i", async (peak, min, max) => {
    const { service } = fixture({ peak_ndvi: peak });
    expect(await service.nilai("batch", 100)).toMatchObject({ expectedMinBox: min, expectedMaxBox: max });
  });
  it("uses explicit curve parameters and safely handles an inverted curve domain", async () => {
    const { service, prisma } = fixture();
    prisma.commoditySeasonBaseline.findUnique.mockResolvedValue({ vigorCurveParams: { ndviFloor: 0.8, ndviPeak: 0.5, vigorAtFloor: 0.2, vigorAtPeak: 0.9, vigorMax: 1.1 } });
    expect(await service.nilai("batch", 100)).toMatchObject({ expectedMinBox: 54, expectedMaxBox: 126 });
  });
  it("uses a unit divisor when box weight is zero instead of producing Infinity", async () => {
    const { service } = fixture({ qty_kg_per_box: "0" });
    expect(await service.nilai("batch", 1000)).toMatchObject({ expectedMinBox: 600, expectedMaxBox: 1400 });
  });
  it("does not update the cached verdict if persisting the assessment fails", async () => {
    const { service, prisma } = fixture(); prisma.yieldAssessment.create.mockRejectedValue(new Error("DB unavailable"));
    await expect(service.nilai("batch", 100)).rejects.toThrow("DB unavailable"); expect(prisma.batch.update).not.toHaveBeenCalled();
  });
});

describe("YieldAssessmentService zone comparison and operative verdict", () => {
  it.each([
    { benchmark: [], name: "absent" },
    { benchmark: [{ n: MIN_BENCHMARK_SAMPLE - 1, avg: "0.9", stddev: "0.1" }], name: "too small" },
    { benchmark: [{ n: MIN_BENCHMARK_SAMPLE, avg: null, stddev: "0.1" }], name: "unknown mean" },
  ])("falls back to the physical band for a $name benchmark", async ({ benchmark }) => {
    const { service, prisma } = fixture({ zone_id: "zone" }); prisma.$queryRaw.mockResolvedValueOnce([batchRow({ zone_id: "zone" })]).mockResolvedValueOnce(benchmark);
    expect(await service.nilai("batch", 100)).toMatchObject({ basis: "PITA_SAJA", zoneSampleCount: 0 });
  });
  it.each([
    [70, "0.1", 100, "PERLU_DITINJAU"],
    [90, "0.1", 100, "WAJAR"],
    [70, null, 100, "WAJAR"],
    [70, "0", 100, "WAJAR"],
    [70, "0.1", 0, "WAJAR"],
  ])("handles ratio %i with standard deviation %s and sold=%i as %s", async (reported, stddev, sold, verdict) => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([batchRow({ zone_id: "zone", quota_box_sold: sold })]).mockResolvedValueOnce([{ n: MIN_BENCHMARK_SAMPLE, avg: "0.9", stddev }]);
    expect(await service.nilai("batch", reported)).toMatchObject({ verdict, basis: "PITA_PLUS_BENCHMARK", zoneBenchmarkRatio: 0.9, zoneSampleCount: MIN_BENCHMARK_SAMPLE, reason: expect.stringContaining("Tenant lain") });
  });
  it.each([[null, null], [{ verdict: "PERLU_DITINJAU", finalVerdict: "WAJAR" }, "WAJAR"], [{ verdict: "TIDAK_WAJAR", finalVerdict: null }, "TIDAK_WAJAR"]])("operator verdict has precedence when an assessment exists (%j)", async (row, expected) => {
    const { service, prisma } = fixture(); prisma.yieldAssessment.findFirst.mockResolvedValue(row);
    expect(await service.verdictBerlaku("batch")).toBe(expected);
    expect(prisma.yieldAssessment.findFirst).toHaveBeenCalledWith({ where: { batchId: "batch" }, orderBy: { assessedAt: "desc" }, select: { verdict: true, finalVerdict: true } });
  });
  it("reads the operative verdict through the caller's transaction when provided", async () => {
    const { service, prisma } = fixture(); const tx = { yieldAssessment: { findFirst: vi.fn().mockResolvedValue({ verdict: "WAJAR", finalVerdict: null }) } };
    expect(await service.verdictBerlaku("batch", tx as never)).toBe("WAJAR"); expect(prisma.yieldAssessment.findFirst).not.toHaveBeenCalled();
  });
  it("counts all preview attempts, including those never confirmed", async () => {
    const { service, prisma } = fixture(); expect(await service.jumlahPercobaan("batch")).toBe(3);
    expect(prisma.yieldAssessment.count).toHaveBeenCalledWith({ where: { batchId: "batch" } });
  });
  it("refreshes the benchmark without blocking readers", async () => {
    const { service, prisma } = fixture(); expect(await service.refreshBenchmark()).toBe(true);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('REFRESH MATERIALIZED VIEW CONCURRENTLY "zone_yield_benchmark"');
  });
  it("records a failed refresh and returns false instead of losing the harvest", async () => {
    const { service, prisma } = fixture(); const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    prisma.$executeRawUnsafe.mockRejectedValue(new Error("view lock unavailable"));
    expect(await service.refreshBenchmark()).toBe(false); expect(warn).toHaveBeenCalledWith(expect.stringContaining("view lock unavailable"));
  });
  it("returns unknown position without querying when no batch IDs are provided", async () => {
    const { service, prisma } = fixture(); expect(await service.posisiZona([])).toEqual({ posisiPct: null, menyimpang: 0 }); expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it("keeps an insufficient zone sample distinct from a zero-percent position", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.posisiZona(["batch"])).toEqual({ posisiPct: null, menyimpang: 0 });
  });
  it("excludes the tenant's own harvest from the comparison mean and rounds the relative position", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([{ rasio: "0.5", avg: "0.8", stddev: "0.2", n: 5 }]);
    expect(await service.posisiZona(["batch"])).toEqual({ posisiPct: -42.86, menyimpang: 1 });
  });
  it("handles a zero mean, one-row defense and absent deviation without false violations", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([{ rasio: "0", avg: "0", stddev: null, n: 1 }, { rasio: "1", avg: "0.8", stddev: "0.2", n: 5 }]);
    expect(await service.posisiZona(["b1", "b2"])).toEqual({ posisiPct: 16.67, menyimpang: 0 });
  });
});

describe("YieldAssessmentService tenant history and operator review", () => {
  it("allows the owning tenant and filters by both tenant and batch IDs", async () => {
    const { service, prisma } = fixture(); await expect(service.pastikanMilikTenant("tenant", "batch")).resolves.toBeUndefined();
    expect(prisma.batch.findFirst).toHaveBeenCalledWith({ where: { id: "batch", product: { tenantId: "tenant" } }, select: { id: true } });
  });
  it("hides assessments from a foreign tenant", async () => {
    const { service, prisma } = fixture(); prisma.batch.findFirst.mockResolvedValue(null);
    await expect(service.pastikanMilikTenant("foreign", "batch")).rejects.toMatchObject({ status: 404 });
  });
  it("serializes nullable historical evidence without turning missing values into zero", async () => {
    const { service, prisma } = fixture(); prisma.yieldAssessment.findMany.mockResolvedValue([historyRow(), historyRow({ id: "older", expectedYieldMin: null, expectedYieldMax: null, peakNdviUsed: null, confirmedAt: now, finalVerdict: "WAJAR" })]);
    expect(await service.riwayat("batch")).toEqual([
      { assessmentId: "assessment", assessedAt: now.toISOString(), reportedBox: 50, expectedMinBox: 60, expectedMaxBox: 140, peakNdvi: 0.75, basis: "PITA_SAJA", verdict: "PERLU_DITINJAU", finalVerdict: null, confirmed: false },
      { assessmentId: "older", assessedAt: now.toISOString(), reportedBox: 50, expectedMinBox: null, expectedMaxBox: null, peakNdvi: null, basis: "PITA_SAJA", verdict: "PERLU_DITINJAU", finalVerdict: "WAJAR", confirmed: true },
    ]);
    expect(prisma.yieldAssessment.findMany).toHaveBeenCalledWith({ where: { batchId: "batch" }, orderBy: { assessedAt: "desc" } });
  });
  it("returns an empty review queue without querying ancillary datasets", async () => {
    const { service, prisma } = fixture(); expect(await service.antreanTinjauan()).toEqual([]); expect(prisma.satelliteObservation.findMany).not.toHaveBeenCalled();
  });
  it("provides operators with history, deadline, field curve and peer context", async () => {
    const { service, prisma } = fixture();
    const batch = { id: "batch", quotaBoxSold: 100, landPlotId: "plot", claimedHarvestDate: now, product: { name: "Tomat organik", commodityId: "tomato", commodity: { name: "Tomat" }, tenant: { id: "tenant", companyName: "Kebun Sehat" } } };
    prisma.yieldAssessment.findMany.mockResolvedValue([historyRow({ batch }), historyRow({ id: "unknown", batch, slaDueAt: null, expectedYieldMin: null, expectedYieldMax: null, peakNdviUsed: null })]);
    prisma.satelliteObservation.findMany.mockResolvedValue([{ sceneDate: now, ndviMean: "0.75", ndmiMean: "0.3", cloudPct: "5", usable: true }, { sceneDate: now, ndviMean: null, ndmiMean: null, cloudPct: "90", usable: false }]);
    prisma.$queryRaw.mockResolvedValue([{ tenantName: "Kebun Tetangga", fulfillmentRatio: 0.9 }]);
    const queue = await service.antreanTinjauan();
    expect(queue[0]).toMatchObject({ assessmentId: "assessment", batchId: "batch", productName: "Tomat organik", tenantName: "Kebun Sehat", commodityName: "Tomat", assessedAt: now.toISOString(), slaDueAt: now.toISOString(), quotaBoxSold: 100, expectedMinBox: 60, expectedMaxBox: 140, peakNdvi: 0.75, attemptCount: 3, ndviSeries: [{ date: "2026-09-10", ndvi: 0.75, ndmi: 0.3, cloudPct: 5, usable: true }, { date: "2026-09-10", ndvi: null, ndmi: null, cloudPct: 90, usable: false }], zonePeers: [{ tenantName: "Kebun Tetangga", fulfillmentRatio: 0.9 }] });
    expect(queue[1]).toMatchObject({ slaDueAt: null, expectedMinBox: null, expectedMaxBox: null, peakNdvi: null });
    expect(prisma.yieldAssessment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { verdict: "PERLU_DITINJAU", finalVerdict: null }, orderBy: [{ slaDueAt: "asc" }, { assessedAt: "asc" }] }));
    const peerArguments = prisma.$queryRaw.mock.calls[0]!;
    expect(peerArguments).toContain("tomato"); expect(peerArguments).toContain("tenant"); expect(peerArguments).toContain("batch"); expect(peerArguments).toContain(now);
  });
  it("rejects an unknown review before attempting a verdict write", async () => {
    const { service, prisma } = fixture(); prisma.yieldAssessment.findUnique.mockResolvedValue(null);
    await expect(service.putuskanTinjauan("missing", "WAJAR", "operator")).rejects.toMatchObject({ status: 404 }); expect(prisma.yieldAssessment.update).not.toHaveBeenCalled();
  });
  it("records operator identity and updates the cached verdict", async () => {
    const { service, prisma } = fixture();
    expect(await service.putuskanTinjauan("assessment", "WAJAR", "operator")).toEqual({ assessmentId: "assessment", batchId: "batch", finalVerdict: "WAJAR" });
    expect(prisma.yieldAssessment.update).toHaveBeenCalledWith({ where: { id: "assessment" }, data: { finalVerdict: "WAJAR", reviewedById: "operator" }, select: { id: true, batchId: true } });
    expect(prisma.batch.update).toHaveBeenCalledWith({ where: { id: "batch" }, data: { plausibilityCached: "WAJAR" } });
  });
  it("has neutral fallback wording for the unknown-evidence verdict", () => {
    const { service } = fixture();
    // This policy helper accepts all YieldPlausibility values; normal previews use tanpaDasar directly.
    const wording = service as unknown as { alasan(verdict: string, reported: number, min: number, max: number, basis: string): string };
    expect(wording.alasan("TIDAK_DAPAT_DINILAI", 10, 0, 0, "TIDAK_ADA_DASAR")).toBe("Tidak ada dasar penilaian pada siklus ini.");
  });
});
