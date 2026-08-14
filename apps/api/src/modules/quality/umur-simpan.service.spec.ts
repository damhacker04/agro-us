import { describe, expect, it } from "vitest";
import { UmurSimpanService } from "./umur-simpan.service";

const hitung = UmurSimpanService.hitung;
const T = (s: string) => new Date(s);

describe("UmurSimpanService.hitung", () => {
  it("menghitung umur dari panen sampai tiba, lalu membekukannya", () => {
    const h = hitung(
      { shelf_life_days: 14, harvested_at: T("2026-08-01T02:00:00Z"), settled_at: T("2026-08-04T02:00:00Z") },
      T("2026-08-30T02:00:00Z"),
    );
    expect(h.ageDays).toBe(3);
    expect(h.remainingDays).toBe(11);
    // Sudah tiba, jadi "sekarang" tidak boleh menggeser apa pun: umurnya sudah jadi fakta
    // historis pesanan itu, bukan angka yang terus menua di layar riwayat pembeli.
    expect(h.settled).toBe(true);
  });

  it("jam masih berjalan selama barang belum tiba", () => {
    const h = hitung(
      { shelf_life_days: 10, harvested_at: T("2026-08-01T00:00:00Z"), settled_at: null },
      T("2026-08-06T00:00:00Z"),
    );
    expect(h).toMatchObject({ ageDays: 5, remainingDays: 5, settled: false });
  });

  it("sisa umur boleh negatif — kedaluwarsa dinyatakan, bukan dijepit ke nol", () => {
    const h = hitung(
      { shelf_life_days: 2, harvested_at: T("2026-08-01T00:00:00Z"), settled_at: T("2026-08-06T00:00:00Z") },
      T("2026-08-06T00:00:00Z"),
    );
    expect(h.remainingDays).toBe(-3);
  });

  // Inti aturan FR-5.8: komoditas tanpa angka kalibrasi TIDAK boleh diberi nilai bawaan.
  // Menebaknya berarti menyampaikan tebakan sebagai fakta kesegaran kepada orang yang
  // akan memakan barangnya.
  it("mengembalikan null saat komoditas belum punya umur simpan", () => {
    const h = hitung(
      { shelf_life_days: null, harvested_at: T("2026-08-01T00:00:00Z"), settled_at: null },
      T("2026-08-05T00:00:00Z"),
    );
    expect(h.shelfLifeDays).toBeNull();
    expect(h.remainingDays).toBeNull();
    // Umurnya tetap dihitung: "dipanen 4 hari lalu" benar tanpa perlu tahu batas simpannya.
    expect(h.ageDays).toBe(4);
  });

  it("belum dipanen berarti belum ada jam yang berjalan", () => {
    const h = hitung({ shelf_life_days: 14, harvested_at: null, settled_at: null }, T("2026-08-05T00:00:00Z"));
    expect(h).toMatchObject({ harvestedAt: null, ageDays: null, remainingDays: null, settled: false });
    expect(h.shelfLifeDays).toBe(14);
  });

  it("tidak pernah menghasilkan umur negatif dari selisih jam yang belum genap sehari", () => {
    const h = hitung(
      { shelf_life_days: 14, harvested_at: T("2026-08-01T23:00:00Z"), settled_at: T("2026-08-02T01:00:00Z") },
      T("2026-08-02T01:00:00Z"),
    );
    expect(h.ageDays).toBe(0);
    expect(h.remainingDays).toBe(14);
  });
});
