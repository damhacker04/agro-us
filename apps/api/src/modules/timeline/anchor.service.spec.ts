import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { AnchorService } from "./anchor.service";
import { computeRootHash } from "./hash.util";

function fixture() {
  const prisma = {
    batch: { findMany: vi.fn().mockResolvedValue([{ id: "batch-1" }]) },
    timelineNode: { findMany: vi.fn().mockResolvedValue([{ nodeHash: "abc" }, { nodeHash: "def" }]) },
    hashAnchor: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}), findMany: vi.fn() },
  };
  return { prisma, service: new AnchorService(prisma as never) };
}
describe("daily hash anchors", () => {
  beforeEach(() => { vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
  it("anchors the ordered chain on the UTC date without pretending external publication", async () => {
    const { service, prisma } = fixture();
    expect(await service.anchorAll(new Date("2026-09-09T23:30:00-07:00"))).toEqual({ anchorDate: "2026-09-10", created: 1, skipped: 0 });
    expect(prisma.timelineNode.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { seq: "asc" } }));
    expect(prisma.hashAnchor.create).toHaveBeenCalledWith({ data: {
      batchId: "batch-1", anchorDate: new Date("2026-09-10"), rootHash: computeRootHash(["abc", "def"]), externalRef: null, publishedAt: null,
    } });
  });
  it("skips existing daily anchors without overwriting evidence", async () => {
    const { service, prisma } = fixture();
    prisma.hashAnchor.findFirst.mockResolvedValue({ id: "existing" } as never);
    expect(await service.anchorAll(new Date("2026-09-09"))).toEqual({ anchorDate: "2026-09-09", created: 0, skipped: 1 });
    expect(prisma.hashAnchor.create).not.toHaveBeenCalled();
    expect(prisma.timelineNode.findMany).not.toHaveBeenCalled();
  });
  it("uses the current date by default and handles no eligible batches", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    const { service, prisma } = fixture();
    prisma.batch.findMany.mockResolvedValue([]);
    expect(await service.anchorAll()).toEqual({ anchorDate: "2026-09-09", created: 0, skipped: 0 });
  });
  it("preserves explicit external provenance and distinguishes unpublished records", async () => {
    const { service, prisma } = fixture();
    prisma.hashAnchor.findMany.mockResolvedValue([
      { anchorDate: new Date("2026-09-09"), rootHash: "a", externalRef: null, publishedAt: null },
      { anchorDate: new Date("2026-09-08"), rootHash: "b", externalRef: "worm://receipt", publishedAt: new Date("2026-09-08T01:00:00Z") },
    ]);
    expect(await service.listForBatch("batch-1")).toEqual([
      { anchorDate: "2026-09-09", rootHash: "a", externalRef: null, publishedAt: null },
      { anchorDate: "2026-09-08", rootHash: "b", externalRef: "worm://receipt", publishedAt: "2026-09-08T01:00:00.000Z" },
    ]);
  });
  it("surfaces storage errors rather than reporting a successful anchor", async () => {
    const { service, prisma } = fixture();
    prisma.hashAnchor.create.mockRejectedValue(new Error("write failed"));
    await expect(service.anchorAll()).rejects.toThrow("write failed");
  });
});
