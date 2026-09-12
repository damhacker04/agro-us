import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as QRCode from "qrcode";
import { COURIER_PIN_LENGTH } from "@agro-os/shared";
import { QrService } from "./qr.service";

vi.mock("qrcode", () => ({ toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${url}`) }));

const now = new Date("2026-09-10T03:00:00Z");
const pepper = "courier-test-pepper-32-characters";

function fixture() {
  const shipment = { id: "shipment-1", status: "PANEN", courierPinHash: "previous-hash" as string | null,
    items: [
      { id: "item-1", qtyBox: 2, qtyBoxFulfilled: null as number | null, batch: { id: "batch-1", productionStatus: "HARVESTED" } },
      { id: "item-2", qtyBox: 1, qtyBoxFulfilled: null as number | null, batch: { id: "batch-2", productionStatus: "HARVESTED" } },
    ], zone: { name: "Malang" } };
  const tokens = [
    { id: "qr-1", token: "random-token-1", printedAt: now, consumedAt: null as Date | null },
    { id: "qr-2", token: "random-token-2", printedAt: now, consumedAt: now as Date | null },
  ];
  const tx = { boxQrToken: { create: vi.fn().mockResolvedValue({}) }, shipment: { update: vi.fn().mockResolvedValue({}) } };
  const prisma = {
    shipment: { findFirst: vi.fn().mockResolvedValue(shipment), update: vi.fn().mockResolvedValue({}) },
    boxQrToken: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue(tokens) },
    $transaction: vi.fn(async work => work(tx)),
  };
  return { shipment, tokens, tx, prisma, service: new QrService(prisma as never) };
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks();
  vi.stubEnv("COURIER_PIN_PEPPER", pepper);
  vi.stubEnv("OTP_PEPPER", undefined);
  vi.stubEnv("SCAN_BASE_URL", "https://agro.test/scan");
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("QrService code hashing", () => {
  it("binds a PIN to both its shipment and server pepper", () => {
    const { service } = fixture();
    expect(service.hashCode("shipment-1", "0042")).toBe(createHash("sha256").update(`${pepper}|shipment-1|0042`).digest("hex"));
    expect(service.hashCode("shipment-1", "0042")).not.toBe(service.hashCode("shipment-2", "0042"));
    expect(service.hashCode("shipment-1", "0042")).not.toContain("0042");
  });

  it("falls back to OTP pepper only when courier pepper is absent", () => {
    const { service } = fixture();
    vi.stubEnv("COURIER_PIN_PEPPER", undefined);
    vi.stubEnv("OTP_PEPPER", "otp-pepper-16-characters");
    expect(service.hashCode("s", "0000")).toBe(createHash("sha256").update("otp-pepper-16-characters|s|0000").digest("hex"));
  });

  it.each([undefined, "", "too-short"])("fails closed when the effective pepper is %s", effective => {
    const { service } = fixture();
    vi.stubEnv("COURIER_PIN_PEPPER", effective);
    expect(() => service.hashCode("s", "1234")).toThrow("minimal 16 karakter");
  });

  it("accepts the documented minimum pepper length", () => {
    const { service } = fixture();
    vi.stubEnv("COURIER_PIN_PEPPER", "p".repeat(16));
    expect(service.hashCode("s", "1234")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("QrService generation", () => {
  it("limits generation to a shipment containing the tenant's goods", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue(null);
    await expect(service.generate("tenant-1", "shipment-1")).rejects.toMatchObject({ status: 404 });
    expect(prisma.shipment.findFirst.mock.calls[0]![0].where).toEqual({ id: "shipment-1", items: { some: { batch: { product: { tenantId: "tenant-1" } } } } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["GROWING", "FAILED"])("refuses to issue any boxes if one batch is %s", async status => {
    const { service, shipment, prisma } = fixture();
    shipment.items[1]!.batch.productionStatus = status;
    await expect(service.generate("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "NOT_HARVESTED" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires using the existing sheet instead of issuing a second token set", async () => {
    const { service, prisma } = fixture();
    prisma.boxQrToken.findFirst.mockResolvedValue({ id: "existing-token" });
    await expect(service.generate("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "QR_ALREADY_ISSUED" } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates one unpredictable token per ordered box and stores only a shipment-bound code hash", async () => {
    const { service, tx } = fixture();
    const result = await service.generate("tenant-1", "shipment-1");
    expect(result.courierCode).toMatch(new RegExp(`^\\d{${COURIER_PIN_LENGTH}}$`));
    expect(tx.boxQrToken.create).toHaveBeenCalledTimes(3);
    const entries = tx.boxQrToken.create.mock.calls.map(call => call[0].data);
    expect(entries.map(entry => entry.orderItemId)).toEqual(["item-1", "item-1", "item-2"]);
    expect(new Set(entries.map(entry => entry.token)).size).toBe(3);
    for (const entry of entries) {
      expect(entry.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(entry.printedAt).toEqual(now);
    }
    expect(tx.shipment.update).toHaveBeenCalledWith({ where: { id: "shipment-1" }, data: {
      courierPinHash: service.hashCode("shipment-1", result.courierCode), pinAttempts: 0,
    } });
    expect(tx.shipment.update.mock.calls[0]![0].data).not.toHaveProperty("courierCode");
    expect(result.boxes).toHaveLength(2);
  });

  it("propagates a token persistence failure without issuing a PIN or rendering a sheet", async () => {
    const { service, tx, prisma } = fixture();
    tx.boxQrToken.create.mockRejectedValue(new Error("storage write failed"));
    await expect(service.generate("tenant-1", "shipment-1")).rejects.toThrow("storage write failed");
    expect(tx.shipment.update).not.toHaveBeenCalled();
    expect(prisma.boxQrToken.findMany).not.toHaveBeenCalled();
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("creates labels only for boxes actually shipped when harvest falls short (QR-01)", async () => {
    const { service, shipment, tx } = fixture();
    shipment.items[0]!.qtyBoxFulfilled = 1;
    shipment.items[1]!.qtyBoxFulfilled = 0;
    await service.generate("tenant-1", "shipment-1");
    expect(tx.boxQrToken.create).toHaveBeenCalledTimes(1);
    // Item yang gagal panen seluruhnya tidak menyumbang satu label pun.
    expect(tx.boxQrToken.create).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderItemId: "item-2" }) }));
  });

  it("treats an unset fulfilled count as a full order (QR-01)", async () => {
    const { service, tx } = fixture();
    // `null` bukan nol: belum ada penyesuaian panen berarti pesanannya utuh — 2 + 1 box.
    await service.generate("tenant-1", "shipment-1");
    expect(tx.boxQrToken.create).toHaveBeenCalledTimes(3);
  });

  it("creates no labels at all when nothing could be fulfilled (QR-01)", async () => {
    const { service, shipment, tx } = fixture();
    shipment.items[0]!.qtyBoxFulfilled = 0;
    shipment.items[1]!.qtyBoxFulfilled = 0;
    await service.generate("tenant-1", "shipment-1");
    expect(tx.boxQrToken.create).not.toHaveBeenCalled();
  });

  it("validates the production scan URL before persisting tokens that cannot be returned (QR-02)", async () => {
    const { service, tx } = fixture();
    vi.stubEnv("SCAN_BASE_URL", undefined);
    vi.stubEnv("NODE_ENV", "production");
    await expect(service.generate("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "SCAN_BASE_URL_MISSING" } });
    // Tidak ada token DAN tidak ada Kode Antar yang tersimpan: kegagalannya tidak
    // meninggalkan pengiriman yang terkunci oleh QR_ALREADY_ISSUED.
    expect(tx.boxQrToken.create).not.toHaveBeenCalled();
    expect(tx.shipment.update).not.toHaveBeenCalled();
  });
});

describe("QrService printable sheet", () => {
  it("isolates token lookup to the tenant and does not reveal a courier code on reprint", async () => {
    const { service, prisma } = fixture();
    expect(await service.list("tenant-1", "shipment-1")).toEqual({ shipmentId: "shipment-1", boxes: [
      { tokenId: "qr-1", scanUrl: "https://agro.test/scan/random-token-1", qrDataUrl: "data:image/png;base64,https://agro.test/scan/random-token-1", consumedAt: null },
      { tokenId: "qr-2", scanUrl: "https://agro.test/scan/random-token-2", qrDataUrl: "data:image/png;base64,https://agro.test/scan/random-token-2", consumedAt: now.toISOString() },
    ] });
    expect(prisma.boxQrToken.findMany).toHaveBeenCalledWith({ where: { orderItem: { shipmentId: "shipment-1", batch: { product: { tenantId: "tenant-1" } } } }, orderBy: { printedAt: "asc" } });
    expect(QRCode.toDataURL).toHaveBeenCalledWith("https://agro.test/scan/random-token-1", { errorCorrectionLevel: "M", margin: 1, width: 256 });
  });

  it("returns not found when the tenant has no issued tokens", async () => {
    const { service, prisma } = fixture();
    prisma.boxQrToken.findMany.mockResolvedValue([]);
    await expect(service.list("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "QR_NOT_ISSUED" } });
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("removes trailing slashes before appending a token", async () => {
    const { service } = fixture();
    vi.stubEnv("SCAN_BASE_URL", "https://agro.test/scan///");
    expect((await service.list("tenant-1", "shipment-1")).boxes[0]!.scanUrl).toBe("https://agro.test/scan/random-token-1");
  });

  it("permits the development-only local scan URL", async () => {
    const { service } = fixture();
    vi.stubEnv("SCAN_BASE_URL", undefined);
    expect((await service.list("tenant-1", "shipment-1")).boxes[0]!.scanUrl).toBe("http://localhost:3000/scan/random-token-1");
  });

  it("refuses a localhost fallback in production", async () => {
    const { service } = fixture();
    vi.stubEnv("SCAN_BASE_URL", undefined);
    vi.stubEnv("NODE_ENV", "production");
    await expect(service.list("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "SCAN_BASE_URL_MISSING" } });
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("propagates QR rendering failures instead of returning incomplete printable labels", async () => {
    const { service } = fixture();
    vi.mocked(QRCode.toDataURL).mockRejectedValueOnce(new Error("QR encoding failed") as never);
    await expect(service.list("tenant-1", "shipment-1")).rejects.toThrow("QR encoding failed");
  });
});

describe("QrService replacement courier codes", () => {
  it("requires ownership before code replacement", async () => {
    const { service, prisma } = fixture();
    prisma.shipment.findFirst.mockResolvedValue(null);
    await expect(service.reissueCode("tenant-1", "shipment-1")).rejects.toMatchObject({ status: 404 });
    expect(prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("requires previously issued QR tokens", async () => {
    const { service, shipment, prisma } = fixture();
    shipment.courierPinHash = null;
    await expect(service.reissueCode("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "QR_NOT_ISSUED" } });
    expect(prisma.shipment.update).not.toHaveBeenCalled();
  });

  it.each(["PANEN", "MENUNGGU_PANEN"])("resets attempts for %s while preserving printed tokens", async status => {
    const { service, shipment, prisma, tx } = fixture();
    shipment.status = status;
    const result = await service.reissueCode("tenant-1", "shipment-1");
    expect(result.courierCode).toMatch(new RegExp(`^\\d{${COURIER_PIN_LENGTH}}$`));
    expect(prisma.shipment.update).toHaveBeenCalledWith({ where: { id: "shipment-1" }, data: {
      courierPinHash: service.hashCode("shipment-1", result.courierCode), pinAttempts: 0,
    } });
    expect(tx.boxQrToken.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["DIKIRIM", "TIBA_DI_LOKASI", "DITERIMA", "SELESAI"])("cannot invalidate an active courier code in status %s", async status => {
    const { service, shipment, prisma } = fixture();
    shipment.status = status;
    await expect(service.reissueCode("tenant-1", "shipment-1")).rejects.toMatchObject({ response: { code: "ALREADY_DISPATCHED" } });
    expect(prisma.shipment.update).not.toHaveBeenCalled();
  });
});
