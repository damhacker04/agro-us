import { describe, expect, it, vi } from "vitest";
import { HarvestService } from "./harvest.service";
const regression = process.env["QA_ENFORCE_REGRESSIONS"] === "1" ? it : it.fails;

function fixture() {
  const prisma = { batch: { findFirst: vi.fn().mockResolvedValue({ id: "b1", quotaBoxSold: 10, productionStatus: "GROWING" }) }, yieldAssessment: { findFirst: vi.fn().mockResolvedValue({ reportedBox: 8 }), update: vi.fn() } };
  const assessment = { nilai: vi.fn().mockResolvedValue({ verdict: "WAJAR" }) };
  const allocation = { preview: vi.fn().mockResolvedValue({ fullyFulfilled: [] }) };
  const timeline = { appendNode: vi.fn().mockResolvedValue({ nodeId: "node1" }) };
  return { prisma, assessment, allocation, timeline, service: new HarvestService(prisma as never, assessment as never, allocation as never, timeline as never) };
}
describe("HarvestService two-step confirmation", () => {
  it.each([[8, 8], [20, 10], [0, 0]])("previews %i reported boxes capped at sold quota (%i) without committing a harvest", async (reported, allocatable) => {
    const { service, allocation, timeline } = fixture();
    expect(await service.declare("t1", "b1", reported)).toMatchObject({ allocatableBox: allocatable, capWillBeWaived: false });
    expect(allocation.preview).toHaveBeenCalledWith("b1", allocatable);
    expect(timeline.appendNode).not.toHaveBeenCalled();
  });
  it("warns that protection is waived before confirming an unreasonable yield", async () => {
    const { service, assessment } = fixture();
    assessment.nilai.mockResolvedValue({ verdict: "TIDAK_WAJAR" });
    expect(await service.declare("t1", "b1", 2)).toMatchObject({ capWillBeWaived: true });
  });
  it.each(["HARVESTED", "FAILED"])("rejects a closed %s batch", async (productionStatus) => {
    const { service, prisma, assessment } = fixture();
    prisma.batch.findFirst.mockResolvedValue({ productionStatus });
    await expect(service.declare("t1", "b1", 8)).rejects.toMatchObject({ response: { code: "BATCH_CLOSED" } });
    expect(assessment.nilai).not.toHaveBeenCalled();
  });
  it("scopes batch ownership to the tenant and hides a foreign batch", async () => {
    const { service, prisma } = fixture();
    prisma.batch.findFirst.mockResolvedValue(null);
    await expect(service.declare("foreign", "b1", 8)).rejects.toMatchObject({ status: 404 });
    expect(prisma.batch.findFirst.mock.calls[0]![0].where).toEqual({ id: "b1", product: { tenantId: "foreign" } });
  });
  it("rejects non-harvest activity", async () => {
    const { service } = fixture();
    await expect(service.confirm("t1", "b1", { activityType: "PENANAMAN" } as never, [])).rejects.toMatchObject({ response: { code: "ACTIVITY_NOT_HARVEST" } });
  });
  it("requires a preview identifier for normal harvest", async () => {
    const { service, timeline } = fixture();
    await expect(service.confirm("t1", "b1", { activityType: "PANEN" } as never, [])).rejects.toMatchObject({ response: { code: "ASSESSMENT_REQUIRED" } });
    expect(timeline.appendNode).not.toHaveBeenCalled();
  });
  it("rejects an assessment absent from this batch", async () => {
    const { service, prisma } = fixture();
    prisma.yieldAssessment.findFirst.mockResolvedValue(null);
    await expect(service.confirm("t1", "b1", { activityType: "PANEN", assessmentId: "a1" } as never, [])).rejects.toMatchObject({ response: { code: "ASSESSMENT_NOT_FOUND" } });
  });
  it.each([9, undefined])("rejects changed or missing quantity after preview (%s)", async (fulfilledBox) => {
    const { service, timeline } = fixture();
    await expect(service.confirm("t1", "b1", { activityType: "PANEN", assessmentId: "a1", fulfilledBox } as never, [])).rejects.toMatchObject({ response: { code: "ASSESSMENT_BOX_MISMATCH" } });
    expect(timeline.appendNode).not.toHaveBeenCalled();
  });
  it("commits exactly the previewed quantity and forwards the original evidence", async () => {
    const { service, prisma, timeline } = fixture();
    const dto = { activityType: "PANEN", assessmentId: "a1", fulfilledBox: 8 };
    const photos = [{ buffer: Buffer.from("proof"), originalname: "proof.jpg", mimetype: "image/jpeg", size: 5 }];
    expect(await service.confirm("t1", "b1", dto as never, photos)).toEqual({ nodeId: "node1" });
    expect(prisma.yieldAssessment.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { confirmedAt: expect.any(Date) } });
    expect(timeline.appendNode).toHaveBeenCalledWith("t1", "b1", dto, photos);
  });
  it("allows failed harvest without a prior yield assessment", async () => {
    const { service, prisma, timeline } = fixture();
    const dto = { activityType: "GAGAL_PANEN" };
    await service.confirm("t1", "b1", dto as never, []);
    expect(prisma.yieldAssessment.findFirst).not.toHaveBeenCalled();
    expect(timeline.appendNode).toHaveBeenCalledWith("t1", "b1", dto, []);
  });
  regression("BUG-BE-02: failed evidence validation must not permanently mark the assessment confirmed", async () => {
    const { service, prisma, timeline } = fixture();
    timeline.appendNode.mockRejectedValue(new Error("GPS outside parcel"));
    await expect(service.confirm("t1", "b1", { activityType: "PANEN", assessmentId: "a1", fulfilledBox: 8 } as never, [])).rejects.toThrow("GPS outside parcel");
    expect(prisma.yieldAssessment.update).not.toHaveBeenCalled();
  });
});
