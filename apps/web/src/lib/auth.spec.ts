import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "@agro-os/shared";
import { akhiriSesi, ambilToken, ambilUser, berandaPeran, hapusSesi, simpanSesi } from "./auth";
import { bacaKeranjang, tambahKeKeranjang } from "./keranjang";
import { installBrowser } from "../test/browser";

describe("browser session boundary", () => {
  beforeEach(() => { installBrowser(); });

  it("returns no credentials during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
  });

  it("round trips the authenticated user and clears both credentials on logout", () => {
    const user = { id: "user-1", phone: "+628123456789", role: "BUYER" as const };
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
    simpanSesi("test-token", user);
    expect(ambilToken()).toBe("test-token");
    expect(ambilUser()).toEqual(user);
    hapusSesi();
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
  });

  it("treats malformed persisted JSON as no user", () => {
    localStorage.setItem("agrous.user", "broken-json");
    expect(ambilUser()).toBeNull();
  });

  it("leaves nothing of the previous person behind when a session ends", () => {
    simpanSesi("test-token", { id: "buyer-1", phone: "+628123456789", role: "BUYER" });
    tambahKeKeranjang(
      { batchId: "batch-1", productName: "Sawi", quotaBoxAvailable: 4, tenant: { companyName: "Kebun QA" } } as CatalogItem,
      "zone-1",
      2,
    );
    akhiriSesi();
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
    expect(bacaKeranjang()).toEqual([]);
  });

  it.each([
    ["TENANT", "/tenant"], ["BUYER", "/buyer/region"], ["OPERATOR", "/operator"],
  ] as const)("routes authenticated %s to %s", (role, route) => {
    expect(berandaPeran(role)).toBe(route);
  });
});

/**
 * Cookie peran adalah SATU-SATUNYA bagian sesi yang bisa dilihat `middleware.ts`. Kalau ia
 * tidak ditulis, penjagaan rute di sisi server tidak berjalan sama sekali; kalau ia tidak
 * dihapus saat keluar, rute dasbor tetap lolos lalu halamannya memuat dengan seluruh
 * datanya ditolak API — yang dilihat orang bukan "silakan masuk", tapi dasbor rusak.
 */
describe("cookie peran untuk penjaga rute", () => {
  it("menulis peran saat sesi dimulai", () => {
    const { cookies } = installBrowser();
    simpanSesi("t", { id: "u1", phone: "+628111", role: "TENANT" });
    expect(cookies.get("agrous.peran")).toBe("TENANT");
  });

  it("menghapus peran saat sesi diakhiri", () => {
    const { cookies } = installBrowser();
    simpanSesi("t", { id: "u1", phone: "+628111", role: "BUYER" });
    akhiriSesi();
    expect(cookies.has("agrous.peran")).toBe(false);
  });

  it("mengganti peran saat orang lain masuk di perangkat yang sama", () => {
    const { cookies } = installBrowser();
    simpanSesi("t", { id: "u1", phone: "+628111", role: "BUYER" });
    hapusSesi();
    simpanSesi("t2", { id: "u2", phone: "+628222", role: "OPERATOR" });
    expect(cookies.get("agrous.peran")).toBe("OPERATOR");
  });
});
