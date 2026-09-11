// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentPage from "./page";
import { GalatApi } from "@/lib/api";
import { rupiah } from "@/lib/format-id";

const state = vi.hoisted(() => ({ push: vi.fn(), search: new URLSearchParams(), pay: vi.fn(), copy: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => state, useSearchParams: () => state.search }));
vi.mock("@/lib/api", async (original) => ({ ...await original<typeof import("@/lib/api")>(), bayarSimulasi: state.pay }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  vi.useFakeTimers();
  state.search = new URLSearchParams({ invoice: "INV-test", metode: "QRIS", jumlah: "230000", payload: "TEST-QR-CODE", pesanan: "order-test", kedaluwarsa: "2026-10-31T03:00:00Z" });
  state.pay.mockResolvedValue({ status: "PAID" });
  state.copy.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: state.copy } });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.clearAllTimers();
  vi.useRealTimers();
  host.remove();
});
async function render() { await act(async () => root.render(<PaymentPage />)); }
function button(text: string) { return [...host.querySelectorAll("button")].find((item) => item.textContent?.includes(text))!; }
async function click(text: string) { await act(async () => button(text).click()); }

describe("buyer payment interactions", () => {
  it.each([["QRIS", "Kode QRIS"], ["VA", "Nomor virtual account"], ["EWALLET", "Tautan e-wallet"]])("labels %s instructions and visibly identifies the simulated payment", async (method, label) => {
    state.search.set("metode", method);
    await render();
    expect(host.textContent).toContain(label);
    expect(host.textContent).toContain(rupiah(230000));
    expect(host.textContent).toContain("Berlaku sampai");
    expect(host.textContent).toContain("Mode peragaan");
    expect(host.querySelector("code")!.textContent).toBe("TEST-QR-CODE");
  });

  it("disables payment without an invoice and handles missing query fields", async () => {
    state.search = new URLSearchParams();
    await render();
    expect(host.textContent).toContain("Kode QRIS");
    expect(host.textContent).toContain(rupiah(0));
    expect(host.textContent).not.toContain("Berlaku sampai");
    expect(button("Saya sudah bayar").disabled).toBe(true);
    await click("Saya sudah bayar");
    expect(state.pay).not.toHaveBeenCalled();
  });

  it.each([true, false])("marks only the invoice in the URL and redirects with order context when present: %s", async (hasOrder) => {
    if (!hasOrder) state.search.delete("pesanan");
    await render();
    await click("Saya sudah bayar");
    expect(state.pay).toHaveBeenCalledExactlyOnceWith("INV-test");
    expect(state.push).toHaveBeenCalledWith(`/buyer/payment-success${hasOrder ? "?pesanan=order-test" : ""}`);
  });

  it.each([
    [new GalatApi(410, "INVOICE_EXPIRED", "Tagihan telah kedaluwarsa."), "Tagihan telah kedaluwarsa."],
    [new Error("offline"), "Gagal menandai pembayaran."],
  ])("keeps rejected payment open and allows a successful retry: %s", async (error, message) => {
    state.pay.mockRejectedValueOnce(error);
    await render();
    await click("Saya sudah bayar");
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(message);
    expect(state.push).not.toHaveBeenCalled();
    expect(button("Saya sudah bayar").disabled).toBe(false);
    await click("Saya sudah bayar");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(state.pay).toHaveBeenCalledTimes(2);
  });

  it("does not send a second payment request while awaiting the first", async () => {
    let finish!: () => void;
    state.pay.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    await render();
    await click("Saya sudah bayar");
    expect(button("Memproses").disabled).toBe(true);
    await click("Memproses");
    expect(state.pay).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(state.push).toHaveBeenCalledWith("/buyer/payment-success?pesanan=order-test");
  });

  it("copies payment instructions and restores the copy label after two seconds", async () => {
    await render();
    await click("Salin");
    expect(state.copy).toHaveBeenCalledExactlyOnceWith("TEST-QR-CODE");
    expect(button("Tersalin")).toBeDefined();
    await act(async () => vi.advanceTimersByTime(2000));
    expect(button("Salin")).toBeDefined();
    expect(button("Tersalin")).toBeUndefined();
  });

  it("keeps the payload available for manual copying after clipboard permission denial", async () => {
    state.copy.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await render();
    await click("Salin");
    expect(button("Tersalin")).toBeUndefined();
    expect(host.querySelector("code")!.textContent).toBe("TEST-QR-CODE");
    expect(button("Saya sudah bayar").disabled).toBe(false);
  });
});
