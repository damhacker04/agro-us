// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerifyPage from "./page";
import BuyerDashboardLayout from "../../buyer/(dashboard)/layout";
import OperatorDashboardLayout from "../../operator/(dashboard)/layout";
import { ambilToken, simpanSesi } from "../../../lib/auth";
import { tambahKeKeranjang } from "../../../lib/keranjang";
import type { CatalogItem } from "@agro-os/shared";

const state = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), back: vi.fn(),
  verify: vi.fn(), request: vi.fn(),
  search: new URLSearchParams(), pathname: "/buyer/catalog",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => state,
  useSearchParams: () => state.search,
  usePathname: () => state.pathname,
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../lib/api")>(),
  verifikasiOtp: state.verify,
  mintaOtp: state.request,
}));

const regression = process.env.QA_ENFORCE_REGRESSIONS === "1" ? it : it.fails;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  vi.clearAllMocks();
  state.pathname = "/buyer/catalog";
  state.search = new URLSearchParams({ phone: "08123456789", peran: "BUYER", kode: "123456" });
  state.verify.mockResolvedValue({ accessToken: "test-access", isNewUser: false, user: { id: "buyer-test", phone: "+628123456789", role: "BUYER" } });
  state.request.mockResolvedValue({ resendAfterSec: 60 });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
});

async function render(node: React.ReactNode) {
  await act(async () => { root.render(node); });
}
async function change(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("OTP form interactions", () => {
  it("submits all six digits and follows the authenticated server role", async () => {
    await render(<VerifyPage />);
    expect([...container.querySelectorAll("input")].map((el) => el.value).join("")).toBe("123456");
    await submit();
    expect(state.verify).toHaveBeenCalledWith({ phone: "08123456789", code: "123456", role: "BUYER" });
    expect(ambilToken()).toBe("test-access");
    expect(state.push).toHaveBeenCalledWith("/buyer/region");
  });

  it("supports pasted codes and replacement of a mistaken digit", async () => {
    state.search.delete("kode");
    await render(<VerifyPage />);
    const inputs = container.querySelectorAll("input");
    await change(inputs[0], "765432");
    expect([...inputs].map((el) => el.value).join("")).toBe("765432");
    await change(inputs[2], "9");
    expect(inputs[2].value).toBe("9");
  });

  it("does not mint operator registration through an operator login form", async () => {
    state.search.set("peran", "OPERATOR");
    await render(<VerifyPage />);
    await submit();
    expect(state.verify).toHaveBeenCalledWith({ phone: "08123456789", code: "123456" });
  });

  it("keeps a rejected code visible for correction and does not create a session", async () => {
    state.verify.mockRejectedValueOnce(new Error("network failed"));
    await render(<VerifyPage />);
    await submit();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(state.push).not.toHaveBeenCalled();
    expect(ambilToken()).toBeNull();
  });

  regression("FE-REG-06: deleting an existing OTP digit must clear the controlled input", async () => {
    await render(<VerifyPage />);
    const input = container.querySelector("input")!;
    expect(input.value).toBe("1");
    await change(input, "");
    expect(input.value).toBe("");
  });

  regression("FE-REG-07: a newly registered tenant must proceed to profile onboarding", async () => {
    state.search.set("peran", "TENANT");
    state.verify.mockResolvedValueOnce({ accessToken: "tenant-token", isNewUser: true, user: { id: "new-tenant", phone: "+628123456789", role: "TENANT" } });
    await render(<VerifyPage />);
    await submit();
    expect(state.push).toHaveBeenCalledWith("/tenant/onboarding/profile");
  });
});

describe("authenticated shell interactions", () => {
  regression.each([
    ["BUYER", BuyerDashboardLayout, "/auth/buyer/login"],
    ["OPERATOR", OperatorDashboardLayout, "/auth/operator/login"],
  ] as const)("FE-REG-08: %s logout must remove credentials before redirect", async (role, Layout, destination) => {
    simpanSesi("private-token", { id: "user-test", phone: "+628123456789", role });
    await render(<Layout><p>Dashboard</p></Layout>);
    const logout = [...container.querySelectorAll("button")].find((el) => el.textContent?.includes("Keluar"))!;
    expect(logout).toBeDefined();
    await act(async () => { logout.click(); });
    expect(state.push).toHaveBeenCalledWith(destination);
    expect(ambilToken()).toBeNull();
  });

  regression("FE-REG-09: cart badge must refresh after adding an item without navigating", async () => {
    await render(<BuyerDashboardLayout><p>Katalog</p></BuyerDashboardLayout>);
    await act(async () => {
      tambahKeKeranjang({ batchId: "batch-test", quotaBoxAvailable: 5, tenant: { companyName: "Test" } } as CatalogItem, "zone-test", 2);
    });
    expect(container.textContent).toContain("2 box");
  });
});
