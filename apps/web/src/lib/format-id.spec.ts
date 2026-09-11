import { describe, expect, it } from "vitest";
import { angka, desimal, jamWib, rupiah, tanggalPanjang, tanggalPendek } from "./format-id";

describe("deterministic Indonesian certificate formatting", () => {
  it.each(["2026-08-05", "2026-08-05T23:59:00.000Z"])("accepts dates and timestamps: %s", (iso) => {
    expect(tanggalPanjang(iso)).toBe("5 Agustus 2026");
    expect(tanggalPendek(iso)).toBe("5 Agu");
  });
  it("retains month/year endpoints", () => {
    expect(tanggalPanjang("2026-01-01")).toBe("1 Januari 2026");
    expect(tanggalPendek("2026-12-31")).toBe("31 Des");
  });
  it("formats WIB independently of host timezone, including a UTC date rollover", () => {
    expect(jamWib("2026-08-05T07:12:00Z")).toBe("14.12");
    expect(jamWib("2026-08-05T20:03:00Z")).toBe("03.03");
    expect(jamWib("2026-08-05T07:12:00+07:00")).toBe("07.12");
  });
  it.each([[0, "0"], [999, "999"], [145000, "145.000"], [-6600000, "-6.600.000"], [1234.99, "1.234"]])("formats %s as %s", (value, expected) => {
    expect(angka(value as number)).toBe(expected);
  });
  it("places negative currency signs before Rp and supports zero", () => {
    expect(rupiah(-6600000)).toBe("-Rp6.600.000");
    expect(rupiah(145000)).toBe("Rp145.000");
    expect(rupiah(0)).toBe("Rp0");
  });
  it("formats indicative decimal measurements with selected precision", () => {
    expect(desimal(0.81)).toBe("0,81");
    expect(desimal(2.749, 1)).toBe("2,7");
    expect(desimal(-1.25, 2)).toBe("-1,25");
  });
});
