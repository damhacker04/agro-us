import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("design system class composition", () => {
  it("drops absent conditional classes", () => {
    expect(cn(false, undefined, null, "", "p-3")).toBe("p-3");
    expect(cn()).toBe("");
  });
  it("lets a caller override text color without losing size or focus styling", () => {
    expect(cn("text-tinta-samar text-sm focus:outline-ungu", "text-jambu")).toBe("text-sm focus:outline-ungu text-jambu");
  });
  it("preserves responsive scope while resolving conflicting spacing", () => {
    expect(cn("p-3 md:p-6", "p-4")).toBe("md:p-6 p-4");
  });
});
