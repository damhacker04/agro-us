import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@agro-os/shared";
import { GalatApi } from "./api";
import { tujuanSetelahMasuk } from "./rute-masuk";
import { installBrowser } from "../test/browser";

const state = vi.hoisted(() => ({ tenantProfile: vi.fn(), buyerProfile: vi.fn() }));
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  ambilProfilTenant: state.tenantProfile,
  ambilProfilPembeli: state.buyerProfile,
}));

const user = (role: AuthUser["role"]): AuthUser => ({ id: `user-${role}`, phone: "+628123456789", role });
const belumAda = (kode: string) => new GalatApi(404, kode, "Profil belum dibuat.");

describe("post-login destination", () => {
  beforeEach(() => {
    installBrowser();
    state.tenantProfile.mockResolvedValue({ companyName: "Kebun QA", landPlotCount: 3 });
    state.buyerProfile.mockResolvedValue({ id: "buyer-1", companyName: "Kafe QA", activeZone: null });
  });

  it("sends a tenant without a business profile to onboarding, not to the dashboard", async () => {
    state.tenantProfile.mockRejectedValueOnce(belumAda("TENANT_NOT_FOUND"));
    await expect(tujuanSetelahMasuk(user("TENANT"))).resolves.toBe("/tenant/onboarding/profile");
  });

  it("resumes an unfinished tenant onboarding at the step that is actually missing", async () => {
    state.tenantProfile.mockResolvedValueOnce({ companyName: "Kebun QA", landPlotCount: 0 });
    await expect(tujuanSetelahMasuk(user("TENANT"))).resolves.toBe("/tenant/onboarding/mapping");
  });

  it("takes a fully onboarded tenant to the dashboard", async () => {
    await expect(tujuanSetelahMasuk(user("TENANT"))).resolves.toBe("/tenant");
  });

  it("sends a buyer without a business profile to buyer onboarding", async () => {
    state.buyerProfile.mockRejectedValueOnce(belumAda("BUYER_NOT_FOUND"));
    await expect(tujuanSetelahMasuk(user("BUYER"))).resolves.toBe("/buyer/onboarding/profile");
  });

  it("takes a buyer with a profile to the service-zone chooser", async () => {
    await expect(tujuanSetelahMasuk(user("BUYER"))).resolves.toBe("/buyer/region");
  });

  it.each([
    ["a network failure", new Error("network failed")],
    ["a server fault", new GalatApi(503, null, "Layanan sementara tidak tersedia")],
  ])("does not mistake %s for a missing profile", async (_label, error) => {
    state.buyerProfile.mockRejectedValueOnce(error);
    state.tenantProfile.mockRejectedValueOnce(error);
    await expect(tujuanSetelahMasuk(user("BUYER"))).resolves.toBe("/buyer/region");
    await expect(tujuanSetelahMasuk(user("TENANT"))).resolves.toBe("/tenant");
  });

  it("does not ask the profile endpoints anything about an operator", async () => {
    await expect(tujuanSetelahMasuk(user("OPERATOR"))).resolves.toBe("/operator");
    expect(state.tenantProfile).not.toHaveBeenCalled();
    expect(state.buyerProfile).not.toHaveBeenCalled();
  });
});
