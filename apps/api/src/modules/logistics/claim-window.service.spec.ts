import { afterEach, describe, expect, it, vi } from "vitest";
import { CLAIM_WINDOW_FALLBACK_MS, CLAIM_WINDOW_MS } from "@agro-os/shared";
import { ClaimWindowService } from "./claim-window.service";

afterEach(() => vi.unstubAllEnvs());

describe("ClaimWindowService buyer protection", () => {
  it("uses shared 2-hour and 24-hour windows by default", () => {
    vi.stubEnv("CLAIM_WINDOW_MINUTES", "");
    vi.stubEnv("CLAIM_WINDOW_FALLBACK_MINUTES", "");
    const service = new ClaimWindowService();
    expect(service.normalMs).toBe(CLAIM_WINDOW_MS);
    expect(service.fallbackMs).toBe(CLAIM_WINDOW_FALLBACK_MS);
    expect(service.normalLabel).toBe("2 jam");
  });
  it("ignores both overrides in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLAIM_WINDOW_MINUTES", "1");
    vi.stubEnv("CLAIM_WINDOW_FALLBACK_MINUTES", "2");
    const service = new ClaimWindowService();
    expect(service.normalMs).toBe(CLAIM_WINDOW_MS);
    expect(service.fallbackMs).toBe(CLAIM_WINDOW_FALLBACK_MS);
  });
  it.each(["0", "-1", "NaN", "Infinity", " "])("rejects invalid demo duration %s", (value) => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CLAIM_WINDOW_MINUTES", value);
    expect(new ClaimWindowService().normalMs).toBe(CLAIM_WINDOW_MS);
  });
  it("allows explicit demo minutes and formats minute/fractional-hour labels", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CLAIM_WINDOW_MINUTES", "3");
    vi.stubEnv("CLAIM_WINDOW_FALLBACK_MINUTES", "90");
    const service = new ClaimWindowService();
    expect(service.normalMs).toBe(180_000);
    expect(service.normalLabel).toBe("3 menit");
    expect(ClaimWindowService.humanize(service.fallbackMs)).toBe("1.5 jam");
  });
});
