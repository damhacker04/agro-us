import { describe, expect, it, vi } from "vitest";
import { HEADER_SESI_PELACAKAN, bolehPantauPengiriman } from "./watch-authz";

/**
 * Aturan ini menjaga satu hal: posisi kurir hanya terlihat oleh orang yang berhubungan
 * dengan pengirimannya. Sebelumnya aturan yang sama ditulis dua kali — di kanal WebSocket
 * dan (tidak ada sama sekali) di endpoint REST — dan versi REST-lah yang bocor.
 */
function prismaPalsu(over: Partial<{ shipment: unknown; trackingSession: unknown }> = {}) {
  return {
    shipment: { findFirst: vi.fn().mockResolvedValue(null) },
    trackingSession: { findFirst: vi.fn().mockResolvedValue(null) },
    ...over,
  } as never;
}

describe("bolehPantauPengiriman", () => {
  it("meloloskan Operator tanpa memeriksa kepemilikan", async () => {
    const prisma = prismaPalsu();
    expect(await bolehPantauPengiriman(prisma, "s1", { user: { sub: "u1", role: "OPERATOR" } as never })).toBe(true);
    expect((prisma as unknown as { shipment: { findFirst: ReturnType<typeof vi.fn> } }).shipment.findFirst).not.toHaveBeenCalled();
  });

  it("meloloskan pembeli atau tenant yang terbukti berhubungan dengan pengirimannya", async () => {
    const prisma = prismaPalsu({ shipment: { findFirst: vi.fn().mockResolvedValue({ id: "s1" }) } });
    expect(await bolehPantauPengiriman(prisma, "s1", { user: { sub: "u1", role: "BUYER" } as never })).toBe(true);
  });

  it("menolak pengguna terautentikasi yang tidak berhubungan dengan pengiriman itu", async () => {
    const prisma = prismaPalsu();
    expect(await bolehPantauPengiriman(prisma, "s1", { user: { sub: "u9", role: "BUYER" } as never })).toBe(false);
  });

  it("menolak tamu tanpa kredensial apa pun", async () => {
    expect(await bolehPantauPengiriman(prismaPalsu(), "s1", {})).toBe(false);
  });

  it("meloloskan kurir lewat sesi yang masih terbuka untuk pengiriman itu", async () => {
    const cari = vi.fn().mockResolvedValue({ id: "sess-1" });
    const prisma = prismaPalsu({ trackingSession: { findFirst: cari } });
    expect(await bolehPantauPengiriman(prisma, "s1", { sessionId: "sess-1" })).toBe(true);
    // shipmentId WAJIB ikut disyaratkan: sesi satu pengiriman tidak boleh membuka
    // pengiriman lain yang id-nya kebetulan disebutkan pemanggil.
    expect(cari).toHaveBeenCalledWith({ where: { id: "sess-1", shipmentId: "s1", endedAt: null }, select: { id: true } });
  });

  it("menolak sesi yang sudah ditutup atau milik pengiriman lain", async () => {
    const prisma = prismaPalsu({ trackingSession: { findFirst: vi.fn().mockResolvedValue(null) } });
    expect(await bolehPantauPengiriman(prisma, "s1", { sessionId: "sess-lain" })).toBe(false);
  });

  it("memakai nama header yang sama dengan yang dikirim klien web", () => {
    // Header HTTP tidak peka huruf besar-kecil, tetapi nilainya dipakai sebagai kunci
    // pencarian di `@Headers()` — jadi ia harus huruf kecil dan tetap begitu.
    expect(HEADER_SESI_PELACAKAN).toBe("x-tracking-session");
  });
});
