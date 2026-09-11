import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "@agro-os/shared";
import { bacaKeranjang, hapusDariKeranjang, jumlahItem, kosongkanKeranjang, tambahKeKeranjang, ubahJumlah } from "./keranjang";
import { installBrowser } from "../test/browser";

const item = (batchId = "batch-1", quotaBoxAvailable = 8): CatalogItem => ({
  batchId, quotaBoxAvailable, productName: "Cabai Grade A", lockedPrice: 150000,
  qtyKgPerBox: 5, claimedHarvestDate: "2026-10-01",
  tenant: { companyName: "Kebun pengujian" },
} as CatalogItem);

describe("local cart", () => {
  beforeEach(() => { installBrowser(); });

  it("can be read on the server and without any stored cart", () => {
    expect(bacaKeranjang()).toEqual([]);
    vi.stubGlobal("window", undefined);
    expect(bacaKeranjang()).toEqual([]);
  });

  it("recovers from malformed JSON and storage read failures", () => {
    localStorage.setItem("agrous.keranjang", "{");
    expect(bacaKeranjang()).toEqual([]);
    vi.mocked(localStorage.getItem).mockImplementationOnce(() => { throw new Error("blocked"); });
    expect(bacaKeranjang()).toEqual([]);
  });

  it("captures the display data and notifies other components", () => {
    tambahKeKeranjang(item(), "zone-1");
    expect(bacaKeranjang()).toEqual([{
      batchId: "batch-1", qtyBox: 1, productName: "Cabai Grade A", tenantName: "Kebun pengujian",
      unitPriceLocked: 150000, qtyKgPerBox: 5, claimedHarvestDate: "2026-10-01", zoneId: "zone-1",
    }]);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "keranjang:ubah" }));
  });

  it("merges the same batch and caps additions at the displayed available quota", () => {
    tambahKeKeranjang(item(), "zone-1", 3);
    tambahKeKeranjang(item(), "zone-1", 10);
    expect(bacaKeranjang()).toHaveLength(1);
    expect(jumlahItem()).toBe(8);
  });

  it("caps a first addition and supports distinct batches from different tenants", () => {
    tambahKeKeranjang(item(), "zone-1", 100);
    tambahKeKeranjang({ ...item("batch-2"), tenant: { companyName: "Petani kedua" } } as CatalogItem, "zone-1", 2);
    expect(jumlahItem()).toBe(10);
    expect(bacaKeranjang().map((b) => b.tenantName)).toEqual(["Kebun pengujian", "Petani kedua"]);
  });

  it("updates a quantity and removes zero or negative quantities", () => {
    tambahKeKeranjang(item(), "zone-1");
    ubahJumlah("batch-1", 3);
    expect(jumlahItem()).toBe(3);
    ubahJumlah("batch-1", 0);
    expect(bacaKeranjang()).toEqual([]);
    tambahKeKeranjang(item(), "zone-1");
    ubahJumlah("batch-1", -1);
    expect(bacaKeranjang()).toEqual([]);
  });

  it("does nothing for an unknown quantity target and deletes only the requested batch", () => {
    tambahKeKeranjang(item(), "zone-1");
    tambahKeKeranjang(item("batch-2"), "zone-1");
    vi.mocked(window.dispatchEvent).mockClear();
    ubahJumlah("missing", 2);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    hapusDariKeranjang("batch-1");
    expect(bacaKeranjang().map((b) => b.batchId)).toEqual(["batch-2"]);
    kosongkanKeranjang();
    expect(jumlahItem()).toBe(0);
  });
});
