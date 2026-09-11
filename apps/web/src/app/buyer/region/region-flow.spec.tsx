// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerRegionPage from "./page";
import type { ZoneSummary } from "@agro-os/shared";
import { rupiah } from "@/lib/format-id";

const state = vi.hoisted(() => ({ zones: vi.fn() }));
vi.mock("@/lib/api", () => ({ ambilZona: state.zones }));
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
  state.zones.mockResolvedValue(zones);
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
});
