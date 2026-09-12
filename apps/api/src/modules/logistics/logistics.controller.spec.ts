import { describe, expect, it, vi } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CourierController, ShipmentController } from "./logistics.controller";

/**
 * Yang diuji di sini adalah PINTUNYA, bukan isinya: siapa yang boleh masuk, dan di mana
 * kredensialnya dibawa. Dua hal itu dulu tidak diuji sama sekali pada jalur REST —
 * `GET /shipments/:id/track` terbuka untuk siapa pun yang menyebut satu UUID, dan sesi
 * kurir dibawa di dalam path URL.
 */
describe("ShipmentController — otorisasi snapshot pelacakan", () => {
  function buat(over: { milik?: boolean; sesi?: boolean; token?: "valid" | "rusak" } = {}) {
    const pod = { snapshot: vi.fn().mockResolvedValue({ status: "DIKIRIM", position: null }) };
    const jwt = {
      verifyAsync: vi.fn(async () => {
        if (over.token === "rusak") throw new Error("token tidak valid");
        return { sub: "u1", role: "BUYER" };
      }),
    };
    const prisma = {
      shipment: { findFirst: vi.fn().mockResolvedValue(over.milik ? { id: "s1" } : null) },
      trackingSession: { findFirst: vi.fn().mockResolvedValue(over.sesi ? { id: "sess-1" } : null) },
    };
    return { pod, prisma, controller: new ShipmentController(pod as never, jwt as never, prisma as never) };
  }

  it("menolak tamu tanpa token dan tanpa sesi", async () => {
    const { controller, pod } = buat();
    await expect(controller.track("s1", undefined, undefined)).rejects.toThrow(ForbiddenException);
    // Yang terpenting: datanya tidak pernah dibaca, bukan hanya tidak dikembalikan.
    expect(pod.snapshot).not.toHaveBeenCalled();
  });

  it("menolak pembeli yang bukan pemilik pesanan", async () => {
    const { controller, pod } = buat({ milik: false });
    await expect(controller.track("s1", "Bearer t", undefined)).rejects.toThrow(ForbiddenException);
    expect(pod.snapshot).not.toHaveBeenCalled();
  });

  it("meloloskan pembeli pemilik pesanan", async () => {
    const { controller, pod } = buat({ milik: true });
    await expect(controller.track("s1", "Bearer t", undefined)).resolves.toMatchObject({ status: "DIKIRIM" });
    expect(pod.snapshot).toHaveBeenCalledWith("s1");
  });

  it("meloloskan kurir lewat header sesi, tanpa token sama sekali", async () => {
    const { controller, pod } = buat({ sesi: true });
    await expect(controller.track("s1", undefined, "sess-1")).resolves.toMatchObject({ status: "DIKIRIM" });
    expect(pod.snapshot).toHaveBeenCalledWith("s1");
  });

  it("memperlakukan token rusak sebagai tamu, bukan sebagai galat 500", async () => {
    const { controller } = buat({ token: "rusak", milik: true });
    await expect(controller.track("s1", "Bearer busuk", undefined)).rejects.toThrow(ForbiddenException);
  });

  it("mengabaikan header sesi yang hanya berisi spasi", async () => {
    const { controller, prisma } = buat();
    await expect(controller.track("s1", undefined, "   ")).rejects.toThrow(ForbiddenException);
    expect(prisma.trackingSession.findFirst).not.toHaveBeenCalled();
  });

  it("memakai pesan yang sama untuk 'tidak ada' dan 'bukan milik Anda'", async () => {
    const { controller } = buat({ milik: false });
    // Pesan yang berbeda menjadikan endpoint ini alat memeriksa keberadaan pesanan orang.
    await expect(controller.track("s1", "Bearer t", undefined)).rejects.toMatchObject({
      response: { code: "AKSES_DITOLAK", message: "Pengiriman tidak dapat diakses." },
    });
  });
});

describe("CourierController — kredensial sesi di header", () => {
  function buat() {
    const courier = {
      reportPosition: vi.fn().mockResolvedValue({ accepted: true }),
      flagNoGps: vi.fn().mockResolvedValue({ noGpsMode: true }),
    };
    return { courier, controller: new CourierController(courier as never) };
  }

  const posisi = { lat: -7.98, lng: 112.63, deviceTs: "2026-09-12T00:00:00.000Z" } as never;

  it("meneruskan sesi dari header ke service", async () => {
    const { controller, courier } = buat();
    await controller.position("sess-1", posisi);
    expect(courier.reportPosition).toHaveBeenCalledWith("sess-1", -7.98, 112.63, new Date("2026-09-12T00:00:00.000Z"));
  });

  it("menolak laporan posisi tanpa header sesi", () => {
    const { controller, courier } = buat();
    expect(() => controller.position(undefined, posisi)).toThrow(BadRequestException);
    expect(courier.reportPosition).not.toHaveBeenCalled();
  });

  it("menolak penanda tanpa-GPS tanpa header sesi", () => {
    const { controller, courier } = buat();
    expect(() => controller.noGps("  ")).toThrow(BadRequestException);
    expect(courier.flagNoGps).not.toHaveBeenCalled();
  });

  it("menyebut nama header di pesan galatnya, supaya klien tahu apa yang kurang", () => {
    const { controller } = buat();
    expect(() => controller.noGps(undefined)).toThrow(/x-tracking-session/);
  });
});
