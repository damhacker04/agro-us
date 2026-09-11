import { describe, expect, it } from "vitest";
import { toVerificationBadge, type VerificationStatus } from "../src/index";

describe("buyer trust badge contract (FR-2.6, FR-4.6)", () => {
  it("shows satellite verification only for a verified verdict", () => {
    expect(toVerificationBadge("TERVERIFIKASI")).toBe("TERVERIFIKASI_SATELIT");
  });
  it("keeps photo-only evidence distinct from satellite verification", () => {
    expect(toVerificationBadge("FOTO_SAJA")).toBe("BUKTI_FOTO_SAJA");
  });
  it.each(["TIDAK_DAPAT", "TIDAK_SESUAI", "PERLU_DITINJAU"] satisfies VerificationStatus[])("does not award a verification badge for %s", status => {
    expect(toVerificationBadge(status)).toBe("BELUM_TERVERIFIKASI");
  });
});
