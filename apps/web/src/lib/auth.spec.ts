import { beforeEach, describe, expect, it, vi } from "vitest";
import { ambilToken, ambilUser, berandaPeran, hapusSesi, simpanSesi } from "./auth";
import { installBrowser } from "../test/browser";

describe("browser session boundary", () => {
  beforeEach(() => { installBrowser(); });

  it("returns no credentials during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
  });

  it("round trips the authenticated user and clears both credentials on logout", () => {
    const user = { id: "user-1", phone: "+628123456789", role: "BUYER" as const };
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
    simpanSesi("test-token", user);
    expect(ambilToken()).toBe("test-token");
    expect(ambilUser()).toEqual(user);
    hapusSesi();
    expect(ambilToken()).toBeNull();
    expect(ambilUser()).toBeNull();
  });

  it("treats malformed persisted JSON as no user", () => {
    localStorage.setItem("agrous.user", "broken-json");
    expect(ambilUser()).toBeNull();
  });

  it.each([
    ["TENANT", "/tenant"], ["BUYER", "/buyer/region"], ["OPERATOR", "/operator"],
  ] as const)("routes authenticated %s to %s", (role, route) => {
    expect(berandaPeran(role)).toBe(route);
  });
});
