// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "./page";
import { GalatApi } from "@/lib/api";
import { bacaKeranjang, type BarisKeranjang } from "@/lib/keranjang";
import { TRACEABILITY_REPORT_FEE } from "@agro-os/shared";
import { rupiah } from "@/lib/format-id";

const state = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), checkout: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => state }));
vi.mock("@/lib/api", async (original) => ({
  ...await original<typeof import("@/lib/api")>(), checkout: state.checkout,
}));

const cart: BarisKeranjang[] = [
  { batchId: "tomato-batch", qtyBox: 2, productName: "Tomat", tenantName: "Kebun A", unitPriceLocked: 80000, qtyKgPerBox: 10, claimedHarvestDate: "2026-10-20", zoneId: "malang" },
  { batchId: "carrot-batch", qtyBox: 1, productName: "Wortel", tenantName: "Kebun B", unitPriceLocked: 50000, qtyKgPerBox: 5, claimedHarvestDate: "2026-10-21", zoneId: "malang" },
];
const response = {
  orderId: "order-123", payment: { invoiceRef: "INV A&1", method: "VA", amount: 230000, payload: "8800 001&2", expiresAt: "2026-10-01T12:00:00.000Z" },
};
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("agrous.keranjang", JSON.stringify(cart));
  state.checkout.mockResolvedValue(response);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render() { await act(async () => root.render(<CheckoutPage />)); }
function field(label: string): HTMLInputElement {
  const element = [...host.querySelectorAll("label")].find((item) => item.textContent?.startsWith(label))!;
  expect(element, `label ${label}`).toBeDefined();
  return document.getElementById(element.htmlFor) as HTMLInputElement;
}
async function change(label: string, value: string) {
  await act(async () => {
    const input = field(label);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function recipient() {
  await change("Nama penerima", "Sari Restoran");
  await change("Telepon penerima", "081234567890");
}
async function submit() {
  await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
}

describe("buyer checkout interactions", () => {
  it("redirects an empty persisted cart to the cart page", async () => {
    localStorage.clear();
    await render();
    expect(state.replace).toHaveBeenCalledWith("/buyer/cart");
    expect(state.checkout).not.toHaveBeenCalled();
  });

  it("shows the sum of every line and requires recipient data before submitting", async () => {
    await render();
    expect(host.textContent).toContain(rupiah(210000));
    expect(host.querySelector("form")!.checkValidity()).toBe(false);
    await submit();
    expect(state.checkout).not.toHaveBeenCalled();
    await recipient();
    expect(host.querySelector("form")!.checkValidity()).toBe(true);
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
  });

  it("submits all cart lines and recipient edits, then clears cart and uses the server invoice", async () => {
    await render();
    await recipient();
    await change("Patokan alamat", "Pagar hijau");
    await change("Mulai", "09:00");
    await change("Sampai", "12:00");
    await change("Lintang", "-7.95");
    await change("Bujur", "112.61");
    await act(async () => {
      host.querySelector<HTMLInputElement>('input[type="radio"][value="VA"]')!.click();
      host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    });
    const summary = [...host.querySelectorAll("dl")][0];
    expect(summary.textContent).toContain(rupiah(TRACEABILITY_REPORT_FEE));
    await submit();
    expect(state.checkout).toHaveBeenCalledExactlyOnceWith({
      lines: [{ batchId: "tomato-batch", qtyBox: 2 }, { batchId: "carrot-batch", qtyBox: 1 }],
      delivery: { recipientName: "Sari Restoran", phone: "081234567890", landmark: "Pagar hijau", receivingHours: "09:00-12:00", point: { lat: -7.95, lng: 112.61 } },
      paymentMethod: "VA", includeTraceabilityReport: true,
    });
    expect(bacaKeranjang()).toEqual([]);
    const url = new URL(state.push.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/buyer/payment");
    expect(Object.fromEntries(url.searchParams)).toEqual({ pesanan: "order-123", invoice: "INV A&1", metode: "VA", jumlah: "230000", payload: "8800 001&2", kedaluwarsa: response.payment.expiresAt });
  });

  it("keeps the report optional and omits an empty landmark", async () => {
    await render();
    await recipient();
    await submit();
    expect(state.checkout).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: "QRIS", includeTraceabilityReport: false,
      delivery: { recipientName: "Sari Restoran", phone: "081234567890", point: { lat: -7.9666, lng: 112.6304 }, receivingHours: "08:00-16:00" },
    }));
  });

  it.each([
    [new GalatApi(409, "QUOTA_RACE_LOST", "Kuota baru saja habis. Kurangi jumlah."), "Kuota baru saja habis. Kurangi jumlah."],
    [new Error("socket closed"), "Checkout gagal. Coba lagi."],
  ])("preserves the cart and allows retry when checkout fails: %s", async (error, message) => {
    state.checkout.mockRejectedValueOnce(error);
    await render();
    await recipient();
    await submit();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(message);
    expect(bacaKeranjang()).toEqual(cart);
    expect(state.push).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    await submit();
    expect(state.checkout).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(bacaKeranjang()).toEqual([]);
  });

  it("blocks an inverted receiving window and submits it as HH:MM-HH:MM once fixed", async () => {
    await render();
    await recipient();
    await change("Sampai", "07:00");
    const button = () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button().disabled).toBe(true);
    expect(host.textContent).toContain("jam selesai masih lebih awal dari jam mulai");
    await submit();
    expect(state.checkout).not.toHaveBeenCalled();
    await change("Sampai", "17:30");
    expect(button().disabled).toBe(false);
    await submit();
    expect(state.checkout.mock.calls[0][0].delivery.receivingHours).toBe("08:00-17:30");
  });

  it("prevents duplicate button submissions while reservation is pending", async () => {
    let finish!: (value: typeof response) => void;
    state.checkout.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await render();
    await recipient();
    await act(async () => host.querySelector<HTMLInputElement>('input[type="radio"][value="EWALLET"]')!.click());
    await submit();
    const button = host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Menerbitkan tagihan");
    expect(bacaKeranjang()).toEqual(cart);
    await submit();
    expect(state.checkout).toHaveBeenCalledTimes(1);
    expect(state.checkout.mock.calls[0][0].paymentMethod).toBe("EWALLET");
    await act(async () => finish(response));
    expect(bacaKeranjang()).toEqual([]);
  });
});
