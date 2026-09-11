// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AllocationLine, HarvestPreviewResponse } from "@agro-os/shared";
import { SUBSTITUTION_PRICE_GAP_CAP_PCT } from "@agro-os/shared";
import { PenilaianPanen } from "./PenilaianPanen";

let host: HTMLDivElement;
let root: Root;
const cancel = vi.fn();
const confirm = vi.fn();

function preview(): HarvestPreviewResponse {
  return {
    assessment: { assessmentId: "assessment-1", verdict: "WAJAR", basis: "PITA_SAJA", reportedBox: 12, expectedMinBox: 10, expectedMaxBox: 15, peakNdvi: 0.8, zoneBenchmarkRatio: null, zoneSampleCount: 0, reason: "Hasil sesuai kondisi lahan." },
    allocation: { batchId: "batch-1", quotaBoxSold: 12, fulfilledBox: 12, fullyFulfilled: [], partial: [], unfulfilled: [] },
    capWillBeWaived: false,
    allocatableBox: 12,
  };
}
function line(orderItemId: string, buyerName: string, qtyBox: number, allocatedBox: number, senioritas = false): AllocationLine {
  return { orderItemId, buyerName, qtyBox, allocatedBox, shortfallBox: qtyBox - allocatedBox, senioritas, paidAt: "2026-10-01T00:00:00Z" };
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(data = preview(), memproses = false) {
  await act(async () => root.render(<PenilaianPanen data={data} memproses={memproses} onBatal={cancel} onLanjut={confirm} />));
}
function button(text: string) {
  const result = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes(text));
  expect(result, text).toBeDefined();
  return result!;
}

describe("tenant harvest preview and explicit confirmation", () => {
  it("shows empty allocation and lets the tenant edit without recording a harvest", async () => {
    const data = preview();
    data.allocatableBox = 0;
    await render(data);
    expect(host.textContent).toContain("Dari 12 box yang dipanen, 0 box masuk");
    expect(host.textContent).toContain("Belum ada pesanan terjual");
    expect(host.textContent).not.toContain("di luar perkiraan");
    await act(async () => button("Kembali").click());
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("shows each allocation category, quantity, and priority reason before confirmation", async () => {
    const data = preview();
    data.allocation.fullyFulfilled = [line("a", "Cafe Melati", 8, 8, true)];
    data.allocation.partial = [line("b", "Restoran Dahlia", 6, 4)];
    data.allocation.unfulfilled = [line("c", "Distributor Mawar", 5, 0)];
    await render(data);
    const rows = [...host.querySelectorAll("li")];
    expect(rows.map((row) => row.textContent)).toEqual(["Cafe Melati8/8 box", "Restoran Dahlia4/6 box", "Distributor Mawar0/5 box"]);
    expect(host.textContent).toContain("Seluruh 12 box dibagikan");
    expect(host.querySelector('[aria-label="Didahulukan karena shortfall siklus lalu"]')).not.toBeNull();
    expect(host.textContent).toContain("sebelum urutan waktu pembayaran");
    await act(async () => button("Konfirmasi").click());
    expect(confirm).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does not invent a priority explanation for ordinary FIFO allocation", async () => {
    const data = preview();
    data.allocation.fullyFulfilled = [line("ordinary", "Cafe A", 12, 12)];
    await render(data);
    expect(host.textContent).not.toContain("Pembeli bertanda bintang");
    expect(host.querySelector('[aria-label="Didahulukan karena shortfall siklus lalu"]')).toBeNull();
  });

  it.each([
    [10, 15, "10–15 box"],
    [null, 15, "—"],
    [10, null, "—"],
  ] as const)("shows an available yield band or a missing-band marker (%s, %s)", async (min, max, expected) => {
    const data = preview();
    Object.assign(data.assessment, { verdict: "TIDAK_WAJAR", expectedMinBox: min, expectedMaxBox: max, reason: "Perkiraan dan laporan berbeda." });
    await render(data);
    expect(host.querySelector("h2")?.textContent).toBe("Hasil ini di luar perkiraan untuk lahan Anda");
    expect([...host.querySelectorAll("dd")].map((item) => item.textContent)).toEqual(["12 box", expected]);
    expect(host.textContent).toContain("Perkiraan dan laporan berbeda.");
    expect(host.textContent).not.toContain("Bila Anda melanjutkan");
    expect(button("Saya paham").className).toContain("bg-jambu");
    await act(async () => button("Saya paham").click());
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("discloses the server's cap waiver before an explicit low-yield confirmation", async () => {
    const data = preview();
    data.assessment.verdict = "TIDAK_WAJAR";
    data.capWillBeWaived = true;
    await render(data);
    expect(host.textContent).toContain(`Batas tanggungan ${SUBSTITUTION_PRICE_GAP_CAP_PCT}%`);
    expect(host.textContent).toContain("tanggungan Anda sepenuhnya");
    expect(host.textContent).not.toMatch(/skor|persen di bawah|ambang/i);
  });

  it("explains unavailable assessment without accusing the tenant or announcing a penalty", async () => {
    const data = preview();
    Object.assign(data.assessment, { verdict: "TIDAK_DAPAT_DINILAI", expectedMinBox: null, expectedMaxBox: null, reason: "Citra tertutup awan." });
    await render(data);
    expect(host.textContent).toContain("Kami belum bisa menilai hasil panen siklus ini");
    expect(host.textContent).toContain("Citra tertutup awan.");
    expect(host.textContent).toContain("tidak berpengaruh pada kuota maupun reputasi");
    expect(host.textContent).not.toContain("Hasil ini di luar perkiraan");
    expect(button("Konfirmasi").className).toContain("bg-ungu");
  });

  it("distinguishes human review from an unavailable or implausible assessment", async () => {
    const data = preview();
    Object.assign(data.assessment, { verdict: "PERLU_DITINJAU", reason: "Tim akan memeriksa laporan ini." });
    await render(data);
    expect(host.textContent).toContain("Akan ditinjau tim kami");
    expect(host.textContent).toContain("Tim akan memeriksa laporan ini.");
    expect(host.textContent).not.toContain("Kami belum bisa menilai");
    expect(host.textContent).not.toContain("Bila Anda melanjutkan");
  });

  it("disables both editing and repeated confirmation while the parent saves", async () => {
    await render(preview(), true);
    expect(button("Kembali").disabled).toBe(true);
    expect(button("Menyimpan").disabled).toBe(true);
    expect(button("Menyimpan").getAttribute("aria-busy")).toBe("true");
    await act(async () => { button("Kembali").click(); button("Menyimpan").click(); });
    expect(cancel).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
