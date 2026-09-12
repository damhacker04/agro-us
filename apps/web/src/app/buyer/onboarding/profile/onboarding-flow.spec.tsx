// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuyerOnboardingProfilePage from "./page";
import { GalatApi } from "@/lib/api";
import type { ZoneSummary } from "@agro-os/shared";

const state = vi.hoisted(() => ({
  zones: vi.fn(),
  profile: vi.fn(),
  createProfile: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ambilZona: state.zones,
  ambilProfilPembeli: state.profile,
  buatProfilPembeli: state.createProfile,
}));
// Identitas router harus STABIL antar render, persis seperti `useRouter()` Next: efek
// yang bergantung padanya akan berjalan ulang tanpa henti bila objeknya dibuat baru
// setiap render, dan halaman jadi terlihat rusak karena tiruannya, bukan karena kodenya.
const router = { push: state.push, replace: state.replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

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
  state.profile.mockRejectedValue(new GalatApi(404, "BUYER_NOT_FOUND", "Profil pembeli belum dibuat."));
  state.createProfile.mockResolvedValue({ id: "buyer-1", companyName: "Kafe QA", activeZone: zones[1] });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function render() {
  await act(async () => root.render(<BuyerOnboardingProfilePage />));
}
async function isiNama(nilai: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, nilai);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function pilihZona(index: number) {
  const radios = [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  await act(async () => radios[index].click());
}
async function kirim() {
  await act(async () => {
    host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("buyer business-profile onboarding", () => {
  it("creates the profile with its service zone and opens that zone's catalog", async () => {
    await render();
    await isiNama("Kafe QA");
    await pilihZona(1);
    await kirim();
    expect(state.createProfile).toHaveBeenCalledWith({ companyName: "Kafe QA", activeZoneId: "zone-2" });
    expect(state.push).toHaveBeenCalledWith("/buyer/catalog?zoneId=zone-2&city=Batu%20%26%20Sekitarnya");
  });

  it("presents every zone with the order minimum that will apply to this buyer", async () => {
    await render();
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    for (const zone of zones) {
      expect(host.textContent).toContain(zone.name);
    }
    expect(host.textContent).toContain("Rp150.000");
  });

  it("refuses to submit without a zone and says what a missing zone costs", async () => {
    await render();
    await isiNama("Kafe QA");
    await kirim();
    expect(state.createProfile).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Pilih satu zona layanan");
    expect(state.push).not.toHaveBeenCalled();
  });

  it("keeps the typed profile visible when the server rejects it", async () => {
    state.createProfile.mockRejectedValueOnce(new GalatApi(400, "ZONE_UNKNOWN", "Zona tidak dikenal."));
    await render();
    await isiNama("Kafe QA");
    await pilihZona(0);
    await kirim();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Zona tidak dikenal.");
    expect(host.querySelector<HTMLInputElement>("input")!.value).toBe("Kafe QA");
    expect(state.push).not.toHaveBeenCalled();
  });

  it("does not ask a buyer who already has a profile to create a second one", async () => {
    state.profile.mockResolvedValueOnce({ id: "buyer-1", companyName: "Kafe QA", activeZone: zones[0] });
    await render();
    expect(state.replace).toHaveBeenCalledWith("/buyer/region");
    expect(state.createProfile).not.toHaveBeenCalled();
  });

  it("reports a zone list that failed to load instead of offering an empty choice", async () => {
    state.zones.mockRejectedValueOnce(new GalatApi(503, null, "Zona gagal dimuat"));
    await render();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Zona gagal dimuat");
    expect(host.querySelector("button[type=submit]")!.hasAttribute("disabled")).toBe(true);
  });
});
