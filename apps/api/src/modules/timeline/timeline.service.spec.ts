import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import exifr from "exifr";
import { TimelineService, type UploadedPhoto } from "./timeline.service";
import { computeNodeHash, computeRootHash, sha256 } from "./hash.util";
import type { CreateNodeDto } from "./timeline.dto";

vi.mock("exifr", () => ({ default: { parse: vi.fn() } }));
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;
const now = new Date("2026-09-10T12:00:00Z");
const photo: UploadedPhoto = { buffer: Buffer.from("camera proof"), originalname: "proof.jpg", mimetype: "image/jpeg", size: 12 };
const input = (overrides: Partial<CreateNodeDto> = {}): CreateNodeDto => ({ activityType: "PENGAIRAN", description: "Menyiram tanaman", lat: -7.9, lng: 112.6, deviceTs: now.toISOString(), captureSource: "IN_APP_CAMERA", ...overrides });
const nodeRow = (overrides: Record<string, unknown> = {}) => ({ id: "node", seq: 1, activity_type: "PENGAIRAN", description: "Menyiram tanaman", lat: -7.9, lng: 112.6, device_ts: now, server_ts: now, prev_hash: null, node_hash: "hash", ralat_of: null, outside_polygon_reason: null, ...overrides });

function fixture() {
  const batch = { id: "batch", productionStatus: "GROWING", quotaBoxSold: 10, product: { tenantId: "tenant", commodity: { growingDaysMin: 30, name: "Tomat" } }, landPlot: { id: "plot" } };
  const tx = { $queryRaw: vi.fn().mockResolvedValue([{ id: "node" }]), nodePhoto: { create: vi.fn() }, batch: { update: vi.fn() } };
  const prisma = {
    batch: { findFirst: vi.fn().mockResolvedValue(batch) },
    timelineNode: { findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => where.activityType ? { deviceTs: new Date("2026-08-01T00:00:00Z") } : null) },
    $queryRaw: vi.fn().mockImplementation(async (sql: TemplateStringsArray) => sql.join("").includes("ST_Contains") ? [{ inside: true }] : [nodeRow()]),
    $transaction: vi.fn().mockImplementation(async (work: (db: typeof tx) => Promise<unknown>) => work(tx)),
    nodePhoto: { findMany: vi.fn().mockResolvedValue([]) },
    orderItem: { findMany: vi.fn().mockResolvedValue([]) },
    hashAnchor: { findFirst: vi.fn().mockResolvedValue(null) },
  };
  const storage = { put: vi.fn().mockResolvedValue({ url: "/proof", sha256: "photo-hash" }) };
  const allocation = { apply: vi.fn(), applyShortfallPenalty: vi.fn() };
  const assessment = { refreshBenchmark: vi.fn() };
  const notification = { kirim: vi.fn() };
  const service = new TimelineService(prisma as never, storage as never, allocation as never, assessment as never, notification as never);
  return { service, prisma, batch, tx, storage, allocation, assessment, notification };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.mocked(exifr.parse).mockReset().mockResolvedValue(null); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("TimelineService evidence and activity validation", () => {
  it("requires evidence before reading or mutating a batch", async () => {
    const { service, prisma } = fixture();
    await expect(service.appendNode("tenant", "batch", input(), [])).rejects.toMatchObject({ response: { code: "PHOTO_REQUIRED" } });
    expect(prisma.batch.findFirst).not.toHaveBeenCalled();
  });
  it("hides absent or foreign batches through the ownership query", async () => {
    const { service, prisma, storage } = fixture();
    prisma.batch.findFirst.mockResolvedValue(null);
    await expect(service.appendNode("other", "batch", input(), [photo])).rejects.toMatchObject({ status: 404 });
    expect(prisma.batch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "batch", product: { tenantId: "other" } } }));
    expect(storage.put).not.toHaveBeenCalled();
  });
  it.each(["HARVESTED", "FAILED"])("rejects closed %s batches", async (status) => {
    const { service, batch, tx } = fixture(); batch.productionStatus = status;
    await expect(service.appendNode("tenant", "batch", input(), [photo])).rejects.toMatchObject({ response: { code: "BATCH_CLOSED" } });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it("rejects timestamps beyond the 24-hour clock allowance", async () => {
    const { service, storage } = fixture();
    await expect(service.appendNode("tenant", "batch", input({ deviceTs: new Date(now.getTime() + 86_400_001).toISOString() }), [photo])).rejects.toMatchObject({ response: { code: "DEVICE_TS_IN_FUTURE" } });
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("accepts the exact device clock boundary", async () => {
    const { service } = fixture();
    await expect(service.appendNode("tenant", "batch", input({ deviceTs: new Date(now.getTime() + 86_400_000).toISOString() }), [photo])).resolves.toMatchObject({ id: "node" });
  });
  it("requires planting before harvest", async () => {
    const { service, prisma } = fixture(); prisma.timelineNode.findFirst.mockResolvedValue(null);
    await expect(service.appendNode("tenant", "batch", input({ activityType: "PANEN" }), [photo])).rejects.toMatchObject({ response: { code: "HARVEST_WITHOUT_PLANTING" } });
  });
  it("rejects one millisecond short of the minimum crop age", async () => {
    const { service, prisma } = fixture();
    prisma.timelineNode.findFirst.mockResolvedValue({ deviceTs: new Date(now.getTime() - 30 * 86_400_000 + 1) });
    await expect(service.appendNode("tenant", "batch", input({ activityType: "PANEN" }), [photo])).rejects.toMatchObject({ response: { code: "HARVEST_TOO_EARLY", minDays: 30, actualDays: 29 } });
  });
  it.each([{ rows: [{ inside: false }] }, { rows: [] }])("requires an explanation when containment is false or the plot has vanished ($rows)", async ({ rows }) => {
    const { service, prisma, storage } = fixture(); prisma.$queryRaw.mockResolvedValueOnce(rows);
    await expect(service.appendNode("tenant", "batch", input(), [photo])).rejects.toMatchObject({ response: { code: "GPS_OUTSIDE_POLYGON" } });
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("rejects a correction whose target is not in the same batch", async () => {
    const { service, prisma } = fixture();
    await expect(service.appendNode("tenant", "batch", input({ ralatOfId: "foreign-node" }), [photo])).rejects.toMatchObject({ response: { code: "RALAT_TARGET_INVALID" } });
    expect(prisma.timelineNode.findFirst).toHaveBeenCalledWith({ where: { id: "foreign-node", batchId: "batch" }, select: { id: true } });
  });
  it("stores the correction and outside explanation in the immutable insert", async () => {
    const { service, prisma, tx } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([{ inside: false }]);
    prisma.timelineNode.findFirst.mockResolvedValueOnce({ id: "old" }).mockResolvedValueOnce({ seq: 4, nodeHash: "previous" });
    const dto = input({ ralatOfId: "old", outsidePolygonReason: "GPS tertutup pepohonan", photoType: "NOTA_INPUT", activityType: "PEMUPUKAN", captureSource: "GALLERY" });
    await service.appendNode("tenant", "batch", dto, [photo]);
    const args = tx.$queryRaw.mock.calls[0]!;
    expect(args).toContain(5); expect(args).toContain("previous"); expect(args).toContain("old"); expect(args).toContain(dto.outsidePolygonReason);
    const expected = computeNodeHash({ batchId: "batch", seq: 5, activityType: dto.activityType, description: dto.description, lng: dto.lng, lat: dto.lat, deviceTs: now, photoHashes: ["photo-hash"], ralatOfId: "old" }, "previous");
    expect(args).toContain(expected);
    expect(tx.nodePhoto.create).toHaveBeenCalledWith({ data: expect.objectContaining({ photoType: "NOTA_INPUT", captureSource: "GALLERY" }) });
  });
});

describe("TimelineService writes and harvest side effects", () => {
  it("hashes uploaded evidence and inserts both node and original metadata in one transaction", async () => {
    const { service, storage, prisma, tx, allocation } = fixture();
    const originalDate = new Date("2026-09-10T11:59:00Z");
    vi.mocked(exifr.parse).mockResolvedValue({ latitude: -7.9, longitude: 112.6, DateTimeOriginal: originalDate });
    const result = await service.appendNode("tenant", "batch", input(), [photo]);
    expect(result).toMatchObject({ id: "node", activityType: "PENGAIRAN" });
    expect(exifr.parse).toHaveBeenCalledWith(photo.buffer, { gps: true, exif: true });
    expect(storage.put).toHaveBeenCalledWith(photo.buffer, photo.originalname, photo.mimetype);
    expect(storage.put.mock.invocationCallOrder[0]).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]!);
    expect(tx.nodePhoto.create).toHaveBeenCalledWith({ data: { nodeId: "node", objectUrl: "/proof", photoType: "KEGIATAN", captureSource: "IN_APP_CAMERA", exifLat: -7.9, exifLng: 112.6, exifTs: originalDate, sha256: "photo-hash" } });
    expect(tx.batch.update).not.toHaveBeenCalled(); expect(allocation.apply).not.toHaveBeenCalled();
  });
  it.each([null, { latitude: "-7.9", longitude: "112", DateTimeOriginal: "invalid" }, {}])("stores missing or nonnumeric EXIF as explicit nulls (%j)", async (metadata) => {
    const { service, tx } = fixture(); vi.mocked(exifr.parse).mockResolvedValue(metadata);
    await service.appendNode("tenant", "batch", input(), [photo]);
    expect(tx.nodePhoto.create).toHaveBeenCalledWith({ data: expect.objectContaining({ exifLat: null, exifLng: null, exifTs: null }) });
  });
  it("uses CreateDate when original EXIF timestamp is absent", async () => {
    const { service, tx } = fixture(); vi.mocked(exifr.parse).mockResolvedValue({ CreateDate: now });
    await service.appendNode("tenant", "batch", input(), [photo]);
    expect(tx.nodePhoto.create).toHaveBeenCalledWith({ data: expect.objectContaining({ exifTs: now }) });
  });
  it("accepts evidence even if EXIF parsing fails", async () => {
    const { service, tx } = fixture(); vi.mocked(exifr.parse).mockRejectedValue(new Error("No EXIF segment"));
    await service.appendNode("tenant", "batch", input(), [photo]);
    expect(tx.nodePhoto.create).toHaveBeenCalledWith({ data: expect.objectContaining({ exifTs: null }) });
  });
  it("does not insert a node when object storage rejects evidence", async () => {
    const { service, storage, prisma } = fixture(); storage.put.mockRejectedValue(new Error("storage offline"));
    await expect(service.appendNode("tenant", "batch", input(), [photo])).rejects.toThrow("storage offline");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([["PLANNING", true], ["GROWING", false]])("planting updates the crop stage only from %s", async (status, changes) => {
    const { service, batch, tx } = fixture(); batch.productionStatus = status as string;
    await service.appendNode("tenant", "batch", input({ activityType: "PENANAMAN" }), [photo]);
    if (changes) expect(tx.batch.update).toHaveBeenCalledWith({ where: { id: "batch" }, data: { productionStatus: "GROWING", claimedPlantDate: now } });
    else expect(tx.batch.update).not.toHaveBeenCalled();
  });
  it.each([[undefined, 10], [20, 10], [4, 4], [0, 0]])("harvest quantity %s allocates %i sold boxes within the node transaction", async (fulfilledBox, expected) => {
    const { service, tx, allocation, assessment } = fixture();
    await service.appendNode("tenant", "batch", input({ activityType: "PANEN", fulfilledBox }), [photo]);
    expect(tx.batch.update).toHaveBeenCalledWith({ where: { id: "batch" }, data: { productionStatus: "HARVESTED", quotaBoxFulfilled: expected } });
    expect(allocation.apply).toHaveBeenCalledWith(tx, "batch", expected);
    expect(assessment.refreshBenchmark.mock.invocationCallOrder[0]).toBeLessThan(allocation.applyShortfallPenalty.mock.invocationCallOrder[0]!);
    expect(allocation.applyShortfallPenalty).toHaveBeenCalledWith("tenant");
  });
  it("failed harvest writes zero fulfillment and allocates the full shortfall", async () => {
    const { service, tx, allocation } = fixture();
    await service.appendNode("tenant", "batch", input({ activityType: "GAGAL_PANEN" }), [photo]);
    expect(tx.batch.update).toHaveBeenCalledWith({ where: { id: "batch" }, data: { productionStatus: "FAILED", quotaBoxFulfilled: 0 } });
    expect(allocation.apply).toHaveBeenCalledWith(tx, "batch", 0);
  });
  it.each(["PANEN", "GAGAL_PANEN"] as const)("%s notifies only affected buyers, including an unset fulfillment", async (activityType) => {
    const { service, prisma, notification } = fixture();
    prisma.orderItem.findMany.mockResolvedValue([10, 3, null].map((qtyBoxFulfilled, i) => ({ qtyBox: 10, qtyBoxFulfilled, shipmentId: `shipment-${i}`, order: { buyer: { userId: `buyer-${i}` } } })));
    await service.appendNode("tenant", "batch", input({ activityType }), [photo]);
    await Promise.resolve();
    expect(notification.kirim).toHaveBeenCalledTimes(2);
    expect(notification.kirim).toHaveBeenCalledWith("buyer-1", "GAGAL_PANEN", activityType === "PANEN" ? "Panen tidak mencukupi pesanan Anda" : "Panen gagal — pesanan Anda terdampak", expect.stringContaining("kurang 7 box"), { batchId: "batch", shipmentId: "shipment-1" });
    expect(notification.kirim).toHaveBeenCalledWith("buyer-2", "GAGAL_PANEN", expect.any(String), expect.stringContaining("kurang 10 box"), expect.any(Object));
  });
});

describe("TimelineService public evidence and chain verification", () => {
  it("returns an empty timeline without fetching photos", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.listNodes("batch")).toEqual([]); expect(prisma.nodePhoto.findMany).not.toHaveBeenCalled();
  });
  it("groups multiple photos, converts decimals and preserves correction context", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([nodeRow({ ralat_of: "older", outside_polygon_reason: "GPS terhalang" }), nodeRow({ id: "empty", seq: 2 })]);
    prisma.nodePhoto.findMany.mockResolvedValue([
      { nodeId: "node", objectUrl: "/a", photoType: "KEGIATAN", captureSource: "IN_APP_CAMERA", exifLat: "-7.9", exifLng: "112.6", exifTs: now, sha256: "a" },
      { nodeId: "node", objectUrl: "/b", photoType: "NOTA_INPUT", captureSource: "GALLERY", exifLat: null, exifLng: null, exifTs: null, sha256: "b" },
    ]);
    const nodes = await service.listNodes("batch");
    expect(nodes[0]).toMatchObject({ ralatOfId: "older", outsidePolygonReason: "GPS terhalang", deviceTs: now.toISOString(), photos: [{ url: "/a", exif: { lat: -7.9, lng: 112.6, ts: now.toISOString() } }, { url: "/b", exif: { lat: null, lng: null, ts: null } }] });
    expect(nodes[1]!.photos).toEqual([]);
  });
  it("accepts an empty chain and explicitly reports no external anchor", async () => {
    const { service, prisma } = fixture(); prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.verifyChain("batch")).toEqual({ batchId: "batch", nodeCount: 0, intact: true, rootHash: computeRootHash([]), broken: [], anchor: null });
  });
  it.each([true, false])("independently compares a valid chain against an anchor (matching=%s)", async (matching) => {
    const { service, prisma } = fixture();
    const hash = computeNodeHash({ batchId: "batch", seq: 1, activityType: "PENGAIRAN", description: "Menyiram tanaman", lng: 112.6, lat: -7.9, deviceTs: now, photoHashes: ["a", "b"], ralatOfId: null }, null);
    prisma.$queryRaw.mockResolvedValue([nodeRow({ node_hash: hash })]);
    prisma.nodePhoto.findMany.mockResolvedValue([{ id: "1", nodeId: "node", sha256: "a" }, { id: "2", nodeId: "node", sha256: "b" }]);
    const root = computeRootHash([hash]);
    prisma.hashAnchor.findFirst.mockResolvedValue({ anchorDate: now, rootHash: matching ? root : "other-root", externalRef: "write-once://anchor" });
    expect(await service.verifyChain("batch")).toMatchObject({ intact: true, rootHash: root, anchor: { anchorDate: "2026-09-10", matchesAnchor: matching, externalRef: "write-once://anchor" } });
  });
  it("detects altered content and broken links and derives the root from recomputed hashes", async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValue([nodeRow({ description: "tampered" }), nodeRow({ id: "n2", seq: 2, prev_hash: "hash" })]);
    const result = await service.verifyChain("batch");
    expect(result.intact).toBe(false);
    expect(result.broken.map(b => b.seq)).toEqual([1, 2, 2]);
    expect(result.rootHash).not.toBe(computeRootHash(["hash", "hash"]));
  });
  regression("BUG-BE-TIMELINE-01: uploaded photo order must survive verification even when UUID order differs", async () => {
    const { service, prisma } = fixture();
    // INSERT hashes upload order [A, B], while verification explicitly sorts random photo UUIDs.
    const hash = computeNodeHash({ batchId: "batch", seq: 1, activityType: "PENGAIRAN", description: "Menyiram tanaman", lng: 112.6, lat: -7.9, deviceTs: now, photoHashes: ["A", "B"], ralatOfId: null }, null);
    prisma.$queryRaw.mockResolvedValue([nodeRow({ node_hash: hash })]);
    prisma.nodePhoto.findMany.mockResolvedValue([{ id: "0001", nodeId: "node", sha256: "B" }, { id: "9999", nodeId: "node", sha256: "A" }]);
    const result = await service.verifyChain("batch");
    expect(result.intact).toBe(true);
    expect(result.rootHash).toBe(computeRootHash([hash]));
  });
  it.each([["PEMUPUKAN", true], ["PENGENDALIAN_HAMA", true], ["PANEN", false]])("input receipts are relevant for %s = %s", (activity, allowed) => {
    expect(TimelineService.allowsInputReceipt(activity as string)).toBe(allowed);
    expect(TimelineService.hashOf("proof")).toBe(sha256("proof"));
  });
});
