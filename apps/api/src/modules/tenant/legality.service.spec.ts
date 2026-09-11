import { describe, expect, it, vi } from "vitest";
import { LegalityService } from "./legality.service";

const tenant = { id: "t1", userId: "u1", companyName: "Kebun QA", legalityStatus: "PENDING", legalityDocUrl: "https://uploads.example.test/doc.jpg" };
function fixture() {
  const prisma = { tenant: { findUnique: vi.fn().mockResolvedValue(tenant), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() } };
  const notif = { kirim: vi.fn().mockResolvedValue(undefined) };
  return { prisma, notif, service: new LegalityService(prisma as never, notif as never) };
}

describe("LegalityService operator decisions", () => {
  it("maps the pending queue, including multiple service zones and missing documents", async () => {
    const { prisma, service } = fixture();
    prisma.tenant.findMany.mockResolvedValue([{ ...tenant, legalityDocUrl: null, user: { createdAt: new Date("2026-09-10T00:00:00Z") }, tenantZones: [{ zone: { name: "Malang" } }, { zone: { name: "Batu" } }], _count: { landPlots: 2 } }] as never);
    await expect(service.queue()).resolves.toEqual([{ tenantId: "t1", companyName: "Kebun QA", legalityStatus: "PENDING", legalityDocUrl: null, submittedAt: "2026-09-10T00:00:00.000Z", zoneNames: ["Malang", "Batu"], landPlotCount: 2 }]);
    expect(prisma.tenant.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { legalityStatus: "PENDING" }, orderBy: { companyName: "asc" } });
  });
  it("filters an explicitly selected decided status", async () => {
    const { prisma, service } = fixture();
    await expect(service.queue("REJECTED")).resolves.toEqual([]);
    expect(prisma.tenant.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { legalityStatus: "REJECTED" } });
  });
  it("does not write when tenant is missing", async () => {
    const { prisma, notif, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue(null as never);
    await expect(service.decide("op1", "missing", { approve: true })).rejects.toThrow("Tenant tidak ditemukan");
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(notif.kirim).not.toHaveBeenCalled();
  });
  it.each(["APPROVED", "REJECTED"])("rejects a second decision for %s", async (legalityStatus) => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, legalityStatus });
    await expect(service.decide("op1", "t1", { approve: true })).rejects.toMatchObject({ response: { code: "ALREADY_DECIDED" } });
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it("never approves a tenant with no uploaded document", async () => {
    const { prisma, service } = fixture();
    prisma.tenant.findUnique.mockResolvedValue({ ...tenant, legalityDocUrl: null } as never);
    await expect(service.decide("op1", "t1", { approve: true })).rejects.toMatchObject({ response: { code: "NO_DOCUMENT" } });
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "   "])("requires an actionable rejection note (%s)", async (note) => {
    const { prisma, service } = fixture();
    await expect(service.decide("op1", "t1", { approve: false, note })).rejects.toMatchObject({ response: { code: "NOTE_REQUIRED" } });
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });
  it.each([true, false])("persists reviewer and notifies the tenant for approve=%s", async (approve) => {
    const { prisma, notif, service } = fixture();
    const status = approve ? "APPROVED" : "REJECTED";
    await expect(service.decide("op1", "t1", { approve, note: "Dokumen tidak terbaca" })).resolves.toEqual({ tenantId: "t1", legalityStatus: status });
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { legalityStatus: status, reviewedById: "op1" } });
    expect(notif.kirim).toHaveBeenCalledWith("u1", "LEGALITAS_DIPUTUS", approve ? "Legalitas Anda disetujui" : "Legalitas Anda ditolak", expect.stringContaining(approve ? "terverifikasi" : "Dokumen tidak terbaca"));
  });
  it("does not send a success notification when persistence fails", async () => {
    const { prisma, notif, service } = fixture();
    prisma.tenant.update.mockRejectedValue(new Error("database unavailable"));
    await expect(service.decide("op1", "t1", { approve: true })).rejects.toThrow("database unavailable");
    expect(notif.kirim).not.toHaveBeenCalled();
  });
});
