// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LandPlotResponse } from "@agro-os/shared";
import { GalatApi } from "@/lib/api";
import { PetaLahan } from "./PetaLahan";

const state = vi.hoisted(() => ({ save: vi.fn(), gps: vi.fn(), afterSave: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...await original<typeof import("@/lib/api")>(), buatLahan: state.save,
}));
const created: LandPlotResponse = {
  id: "plot-from-server", areaHa: 61.82, captureMethod: "GAMBAR_PETA", verificationTier: "NORMAL",
  polygon: { type: "Polygon", coordinates: [[[112, -7], [112.01, -7], [112.01, -6.99], [112, -7]]] },
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: state.gps } });
  vi.clearAllMocks();
  state.save.mockResolvedValue(created);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render() { await act(async () => root.render(<PetaLahan setelahSimpan={state.afterSave} />)); }
function button(text: string) {
  const result = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes(text));
  expect(result, text).toBeDefined();
  return result!;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function mode(value: "GAMBAR_PETA" | "WALK_AROUND") {
  await act(async () => host.querySelector<HTMLInputElement>(`input[value="${value}"]`)!.click());
}
async function change(label: string, value: string) {
  const labelElement = [...host.querySelectorAll("label")].find((item) => item.textContent === label)!;
  const input = document.getElementById(labelElement.htmlFor) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function add(lat: string, lng: string) {
  await change("Lintang", lat);
  await change("Bujur", lng);
  await click("Tambah titik");
}
async function triangle() {
  await mode("GAMBAR_PETA");
  await add("-7", "112");
  await add("-7", "112.01");
  await add("-6.99", "112.01");
}

describe("tenant land polygon capture", () => {
  it("starts in walking mode and does not submit an empty or incomplete polygon", async () => {
    await render();
    expect(host.querySelector<HTMLInputElement>('input[value="WALK_AROUND"]')!.checked).toBe(true);
    expect(host.textContent).toContain("Belum ada titik");
    expect(button("Simpan petak lahan").disabled).toBe(true);
    await click("Simpan petak lahan");
    await mode("GAMBAR_PETA");
    await add("-7", "112");
    expect(host.querySelector('svg[role="img"]')).toBeNull();
    await add("-7", "112.01");
    expect(host.querySelector('[aria-label="Bentuk petak dari 2 titik sudut"]')).not.toBeNull();
    expect(button("Simpan petak lahan").disabled).toBe(true);
    await click("Simpan petak lahan");
    expect(state.save).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("Luas perkiraan");
  });

  it.each([
    ["", "112"], ["-7", ""], ["tidak sah", "112"], ["-7", "bukan angka"],
  ])("rejects a missing or nonnumeric coordinate: %s, %s", async (lat, lng) => {
    await render();
    await mode("GAMBAR_PETA");
    await add(lat, lng);
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Koordinat tidak sah");
    expect(host.textContent).toContain("Belum ada titik");
    await add("-7", "112");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect([...host.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')].map((item) => item.value)).toEqual(["", ""]);
  });

  it("serializes a closed GeoJSON longitude-latitude ring and forwards the actual created plot", async () => {
    await render();
    await triangle();
    expect(host.textContent).toContain("Luas perkiraan");
    expect(host.textContent).toContain("Angka pastinya dihitung ulang server");
    expect(host.querySelectorAll("circle")).toHaveLength(3);
    expect(host.querySelector("polygon")?.getAttribute("points")).not.toMatch(/NaN|Infinity/);
    await click("Simpan petak lahan");
    expect(state.save).toHaveBeenCalledExactlyOnceWith({ polygon: created.polygon, captureMethod: "GAMBAR_PETA" });
    expect(state.afterSave).toHaveBeenCalledExactlyOnceWith(created);
  });

  it("allows a small valid plot while explaining its satellite eligibility restriction", async () => {
    await render();
    await mode("GAMBAR_PETA");
    await add("-7", "112");
    await add("-7", "112.00001");
    await add("-6.99999", "112.00001");
    expect(host.textContent).toContain("terlalu kecil untuk dipisahkan");
    expect(host.textContent).toContain("Petak ini tetap bisa disimpan");
    expect(button("Simpan petak lahan").disabled).toBe(false);
    await click("Simpan petak lahan");
    expect(state.save).toHaveBeenCalledOnce();
  });

  it("keeps a finite preview when two identical GPS positions are captured", async () => {
    state.gps.mockImplementation((success: PositionCallback) => success({ coords: { latitude: -7, longitude: 112 } } as GeolocationPosition));
    await render();
    await click("Tandai sudut");
    await click("Tandai sudut");
    expect(host.querySelector("polygon")!.getAttribute("points")).toBe("50.00,50.00 50.00,50.00");
    expect(button("Simpan petak lahan").disabled).toBe(true);
  });

  it("undoes only the last point and can clear every point without saving", async () => {
    await render();
    await triangle();
    await click("Batal satu");
    expect(host.querySelectorAll("ol li")).toHaveLength(2);
    expect(host.textContent).not.toContain("-6.990000");
    expect(button("Simpan petak lahan").disabled).toBe(true);
    await click("Hapus semua");
    expect(host.textContent).toContain("Belum ada titik");
    expect([...host.querySelectorAll("button")].some((item) => item.textContent?.includes("Batal satu"))).toBe(false);
    expect(state.save).not.toHaveBeenCalled();
  });

  it("captures fresh high-accuracy positions and preserves walking provenance on save", async () => {
    const points = [[-7, 112], [-7, 112.01], [-6.99, 112.01]];
    state.gps.mockImplementation((success: PositionCallback) => {
      const [latitude, longitude] = points.shift()!;
      success({ coords: { latitude, longitude } } as GeolocationPosition);
    });
    await render();
    await mode("GAMBAR_PETA");
    await mode("WALK_AROUND");
    for (let i = 0; i < 3; i++) await click("Tandai sudut");
    expect(state.gps).toHaveBeenCalledTimes(3);
    expect(state.gps).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 15000 });
    await click("Simpan petak lahan");
    expect(state.save).toHaveBeenCalledWith({ polygon: created.polygon, captureMethod: "WALK_AROUND" });
  });

  it("offers manual capture when the browser has no geolocation support", async () => {
    vi.stubGlobal("navigator", {});
    await render();
    await click("Tandai sudut");
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Peramban ini tidak bisa membaca lokasi");
    expect(state.gps).not.toHaveBeenCalled();
  });

  it.each([
    [1, "Izin lokasi ditolak"], [2, "Lokasi belum terbaca"],
  ])("explains the geolocation failure without adding a made-up point (code %s)", async (code, message) => {
    state.gps.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => error({ code, PERMISSION_DENIED: 1 } as GeolocationPositionError));
    await render();
    await click("Tandai sudut");
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(message);
    expect(host.textContent).toContain("Belum ada titik");
    expect(button("Simpan petak lahan").disabled).toBe(true);
  });

  it.each([
    [new GalatApi(422, "INVALID_POLYGON", "Poligon berpotongan."), "Poligon berpotongan."],
    [new Error("connection reset"), "Petak gagal disimpan."],
  ])("retains coordinates and permits retry after a save error: %s", async (error, message) => {
    state.save.mockRejectedValueOnce(error);
    await render();
    await triangle();
    await click("Simpan petak lahan");
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(message);
    expect(host.querySelectorAll("ol li")).toHaveLength(3);
    expect(state.afterSave).not.toHaveBeenCalled();
    expect(button("Simpan petak lahan").disabled).toBe(false);
    await click("Simpan petak lahan");
    expect(state.save).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(state.afterSave).toHaveBeenCalledWith(created);
  });

  it("blocks repeated save clicks while the server determines the authoritative area", async () => {
    let finish!: (plot: LandPlotResponse) => void;
    state.save.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await render();
    await triangle();
    await click("Simpan petak lahan");
    expect(button("Menyimpan").disabled).toBe(true);
    await click("Menyimpan");
    expect(state.save).toHaveBeenCalledOnce();
    expect(state.afterSave).not.toHaveBeenCalled();
    await act(async () => finish(created));
    expect(state.afterSave).toHaveBeenCalledExactlyOnceWith(created);
  });
});
