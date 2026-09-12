// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerRegionPage from "./page";
import type { ZoneSummary } from "@agro-os/shared";
import { rupiah } from "@/lib/format-id";
import { GalatApi } from "@/lib/api";
import { bacaKeranjang, tambahKeKeranjang } from "@/lib/keranjang";
import type { CatalogItem } from "@agro-os/shared";

const state = vi.hoisted(() => ({ zones: vi.fn(), patchProfile: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  ambilZona: state.zones,
  ubahProfilPembeli: state.patchProfile,
}));
const router = { push: state.push, replace: state.replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
const zones: ZoneSummary[] = [
  { id: "zone-1", name: "Kota Malang", city: "Malang", minOrderValue: 150000 },
  { id: "zone-2", name: "Batu & Sekitarnya", city: "Batu", minOrderValue: 200000 },
];
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  localStorage.clear();
  state.zones.mockResolvedValue(zones);
  state.patchProfile.mockResolvedValue({ id: "buyer-1", companyName: "Kafe QA", activeZone: zones[0] });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render() { await act(async () => root.render(<BuyerRegionPage />)); }

describe("buyer service-region selection", () => {
  it("shows a loading state until service-zone data is available", async () => {
    let finish!: (value: ZoneSummary[]) => void;
    state.zones.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await render();
    expect(host.textContent).toContain("Memuat zona layanan");
    expect(host.textContent).not.toContain("Belum ada zona layanan yang dibuka");
    await act(async () => finish(zones));
    expect(host.textContent).not.toContain("Memuat zona layanan");
    expect(host.textContent).toContain("2 zona tersedia");
  });

  it("presents each zone minimum and a catalog destination preserving its name", async () => {
    await render();
    expect(state.zones).toHaveBeenCalledTimes(1);
    const links = [...host.querySelectorAll<HTMLAnchorElement>('a[href^="/buyer/catalog"]')];
    expect(links).toHaveLength(2);
    for (const [index, link] of links.entries()) {
      expect(link.textContent).toContain(zones[index].name);
      expect(link.textContent).toContain(rupiah(zones[index].minOrderValue));
      const url = new URL(link.href);
      expect(url.pathname).toBe("/buyer/catalog");
      expect(url.searchParams.get("zoneId")).toBe(zones[index].id);
      expect(url.searchParams.get("city")).toBe(zones[index].name);
    }
    expect(host.querySelector<HTMLAnchorElement>('a[href="/"]')!.textContent).toContain("Kembali ke beranda");
  });

  it("explains that ordering is unavailable when no service zones are active", async () => {
    state.zones.mockResolvedValueOnce([]);
    await render();
    expect(host.textContent).toContain("Belum ada zona layanan yang dibuka");
    expect(host.querySelector('a[href^="/buyer/catalog"]')).toBeNull();
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it.each([[new Error("Layanan sementara tidak tersedia"), "Layanan sementara tidak tersedia"], [null, "Gagal memuat zona layanan"]])("shows an actionable error without presenting failure as an empty catalog: %s", async (error, message) => {
    state.zones.mockRejectedValueOnce(error);
    await render();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(message);
    expect(host.textContent).toContain("Muat ulang halaman ini");
    expect(host.textContent).not.toContain("Belum ada zona layanan yang dibuka");
    expect(host.querySelector('a[href^="/buyer/catalog"]')).toBeNull();
  });

  async function chooseZone(index = 1) {
    const link = [...host.querySelectorAll<HTMLAnchorElement>('a[href^="/buyer/catalog"]')][index];
    await act(async () => { link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); });
    return link;
  }

  function fillCart(zoneId: string, qtyBox = 2) {
    tambahKeKeranjang(
      { batchId: `batch-${zoneId}`, productName: "Sawi", quotaBoxAvailable: 10, tenant: { companyName: "Kebun QA" } } as CatalogItem,
      zoneId,
      qtyBox,
    );
  }

  it("persists the chosen zone to the buyer profile before opening its catalog", async () => {
    await render();
    await chooseZone(1);
    expect(state.patchProfile).toHaveBeenCalledWith({ activeZoneId: "zone-2" });
    expect(state.push).toHaveBeenCalledWith("/buyer/catalog?zoneId=zone-2&city=Batu%20%26%20Sekitarnya");
  });

  it("does not open a catalog the order pipeline would price against the previous zone", async () => {
    state.patchProfile.mockRejectedValueOnce(new GalatApi(503, null, "Layanan sementara tidak tersedia"));
    await render();
    await chooseZone(1);
    expect(state.push).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Layanan sementara tidak tersedia");
  });

  it("sends a buyer without a business profile to onboarding instead of showing a stored-zone error", async () => {
    state.patchProfile.mockRejectedValueOnce(new GalatApi(404, "BUYER_NOT_FOUND", "Profil pembeli belum dibuat."));
    await render();
    await chooseZone(0);
    expect(state.push).toHaveBeenCalledWith("/buyer/onboarding/profile");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it("states the cart consequence before moving a buyer whose cart belongs to another zone", async () => {
    fillCart("zone-1");
    await render();
    await chooseZone(1);
    expect(state.patchProfile).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
    expect(host.textContent).toContain("akan mengosongkan keranjang");
    expect(host.textContent).toContain("2 box");
    expect(bacaKeranjang()).toHaveLength(1);
  });

  it("empties only a confirmed cross-zone cart once the new zone is stored", async () => {
    fillCart("zone-1");
    await render();
    await chooseZone(1);
    const konfirmasi = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Pindah dan kosongkan"))!;
    await act(async () => { konfirmasi.click(); });
    expect(state.patchProfile).toHaveBeenCalledWith({ activeZoneId: "zone-2" });
    expect(bacaKeranjang()).toEqual([]);
    expect(state.push).toHaveBeenCalledWith("/buyer/catalog?zoneId=zone-2&city=Batu%20%26%20Sekitarnya");
  });

  it("keeps a same-zone cart intact and asks nothing", async () => {
    fillCart("zone-2");
    await render();
    await chooseZone(1);
    expect(host.textContent).not.toContain("akan mengosongkan keranjang");
    expect(bacaKeranjang()).toHaveLength(1);
    expect(state.push).toHaveBeenCalledWith("/buyer/catalog?zoneId=zone-2&city=Batu%20%26%20Sekitarnya");
  });
});
