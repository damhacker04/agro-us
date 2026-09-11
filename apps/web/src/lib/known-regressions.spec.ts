import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "@agro-os/shared";
import { ambilZona } from "./api";
import { ambilUser, hapusSesi, simpanSesi } from "./auth";
import { bacaKeranjang, jumlahItem, tambahKeKeranjang } from "./keranjang";
import { installBrowser } from "../test/browser";

/**
 * Executable defect reproductions, NOT passing acceptance criteria. `it.fails` must
 * become ordinary `it` when fixed; an unexpected pass deliberately fails the suite.
 */
const regression = process.env.QA_ENFORCE_REGRESSIONS === "1" ? it : it.fails;

describe("open defects (expected failures unless QA_ENFORCE_REGRESSIONS=1; see FRONTEND_AUDIT.md)", () => {
  beforeEach(() => { installBrowser(); });

  regression("FE-REG-01: valid JSON with wrong cart shape must recover to []", () => {
    localStorage.setItem("agrous.keranjang", '{"oldVersion":1}');
    expect(bacaKeranjang()).toEqual([]);
    expect(jumlahItem()).toBe(0);
  });

  regression("FE-REG-02: adding a negative quantity must not create negative stock in a cart", () => {
    const item = { batchId: "batch-test", quotaBoxAvailable: 5, tenant: { companyName: "Test" } } as CatalogItem;
    tambahKeKeranjang(item, "zone-test", -2);
    expect(bacaKeranjang().every((line) => Number.isInteger(line.qtyBox) && line.qtyBox > 0)).toBe(true);
  });

  regression("FE-REG-03: valid JSON with wrong user shape must be treated as unauthenticated", () => {
    localStorage.setItem("agrous.user", '"not-a-user"');
    expect(ambilUser()).toBeNull();
  });

  regression("FE-REG-04: HTTP 205 is a successful response with no JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 205 })));
    await expect(ambilZona()).resolves.toBeUndefined();
  });

  regression("FE-REG-05: another buyer on a shared device must not inherit the previous buyer's cart", () => {
    simpanSesi("token-a", { id: "buyer-a", phone: "+628111111111", role: "BUYER" });
    tambahKeKeranjang({ batchId: "batch-a", productName: "Pesanan usaha A", quotaBoxAvailable: 2, tenant: { companyName: "Test" } } as CatalogItem, "zone-a", 2);
    hapusSesi();
    simpanSesi("token-b", { id: "buyer-b", phone: "+628222222222", role: "BUYER" });
    expect(bacaKeranjang()).toEqual([]);
  });
});
