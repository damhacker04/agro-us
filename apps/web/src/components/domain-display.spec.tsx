import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommodityCategory, EscrowEntryType, ShipmentStatus, TimelineActivity, VerificationBadge, VerificationStatus, type CommoditySummary } from "@agro-os/shared";
import { bacaKomoditas, KATEGORI } from "./komoditas";
import { entriEscrow } from "./entri-escrow";
import { KEGIATAN } from "./kegiatan";
import { nadaTahap, PilTahap, TAHAP } from "./tahap-pengiriman";
import { PilStatusMentah, PilVerifikasi, STATUS_MENTAH, STATUS_VERIFIKASI } from "./tanda-verifikasi";

describe("domain values shown to buyers and operators", () => {
  it("normalizes decimal JSON strings and preserves optional calibration fields", () => {
    const raw = { id: "cabai", name: "Cabai", category: "BUAH_UMBI", shrinkTolerancePct: "3", avgYieldKgPerHa: "15000", growingDaysMin: "60", shelfLifeDays: "7", ambientStable: true, gradeStandards: { A: { maxDefectPct: 2 } } };
    expect(bacaKomoditas(raw as unknown as CommoditySummary)).toEqual({ ...raw, shrinkTolerancePct: 3, avgYieldKgPerHa: 15000, growingDaysMin: 60, shelfLifeDays: 7 });
  });
  it.each([null, undefined, "", "unknown", Infinity])("does not show invalid measurements as NaN: %s", (invalid) => {
    const result = bacaKomoditas({ shrinkTolerancePct: invalid, avgYieldKgPerHa: invalid, growingDaysMin: invalid, shelfLifeDays: invalid } as unknown as CommoditySummary);
    expect(result.shrinkTolerancePct).toBe(0);
    expect(result.avgYieldKgPerHa).toBe(0);
    expect(result.growingDaysMin).toBeNull();
    expect(result.shelfLifeDays).toBeNull();
    expect(result.ambientStable).toBeNull();
  });
  it("preserves meaningful zero and false calibration values", () => {
    expect(bacaKomoditas({ growingDaysMin: 0, shelfLifeDays: 0, ambientStable: false } as unknown as CommoditySummary)).toMatchObject({ growingDaysMin: 0, shelfLifeDays: 0, ambientStable: false });
  });
  it("has a readable label for each shared commodity and timeline enum", () => {
    for (const value of Object.values(CommodityCategory)) expect(KATEGORI[value]).toBeTruthy();
    for (const value of Object.values(TimelineActivity)) expect(KEGIATAN[value]).toBeTruthy();
  });
  it("keeps all escrow entries visible including a future server-side type", () => {
    for (const value of Object.values(EscrowEntryType)) expect(entriEscrow(value).label).toBeTruthy();
    expect(entriEscrow("FUTURE_ADJUSTMENT")).toMatchObject({ label: "FUTURE_ADJUSTMENT" });
    expect(entriEscrow("HOLD").arah).toBe("masuk");
    expect(entriEscrow("REFUND").arah).toBe("keluar");
  });
  it("uses the same seven shipment labels for both sides while highlighting the actor who must act", () => {
    for (const value of Object.values(ShipmentStatus)) {
      expect(renderToStaticMarkup(<PilTahap status={value} />)).toContain(TAHAP[value]);
      expect(renderToStaticMarkup(<PilTahap status={value} peran="tenant" />)).toContain(TAHAP[value]);
    }
    expect(nadaTahap("TIBA_DI_LOKASI")).toBe("awas");
    expect(nadaTahap("PANEN", "tenant")).toBe("awas");
    expect(nadaTahap("PANEN", "pembeli")).not.toBe("awas");
  });
  it("shows every verification state in text, including inconclusive and adverse evidence", () => {
    for (const value of Object.values(VerificationBadge)) expect(renderToStaticMarkup(<PilVerifikasi badge={value} />)).toContain(STATUS_VERIFIKASI[value].teks);
    for (const value of Object.values(VerificationStatus)) expect(renderToStaticMarkup(<PilStatusMentah status={value} />)).toContain(STATUS_MENTAH[value].teks);
    expect(STATUS_MENTAH.TIDAK_DAPAT.teks).not.toBe(STATUS_MENTAH.TIDAK_SESUAI.teks);
  });
});
