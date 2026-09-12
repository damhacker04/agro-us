import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

/**
 * Penjaga rute di sisi server. Yang diuji: rute mana yang dicegat, ke mana orang
 * dialihkan, dan rute mana yang SENGAJA dilewati.
 *
 * Tidak diuji di sini — karena memang bukan yang dijanjikan middleware ini — bahwa
 * cookie-nya tidak bisa dipalsukan. Ia memang bisa; batas otorisasinya ada di API.
 */
function permintaan(pathname: string, peran?: string) {
  const url = new URL(`https://agro.example${pathname}`);
  return {
    nextUrl: Object.assign(url, { clone: () => new URL(url.toString()) }),
    cookies: { get: (nama: string) => (peran && nama === "agrous.peran" ? { value: peran } : undefined) },
  } as never;
}

const tujuan = (hasil: ReturnType<typeof proxy>) => {
  const lokasi = hasil.headers.get("location");
  return lokasi ? new URL(lokasi) : null;
};

describe("proxy rute peran", () => {
  it("melepas rute publik tanpa campur tangan", () => {
    for (const jalur of ["/", "/scan/abc", "/courier/tracking", "/auth/buyer"]) {
      expect(tujuan(proxy(permintaan(jalur)))).toBeNull();
    }
  });

  it("mengalihkan tamu ke halaman masuk peran yang ia tuju, bukan ke beranda umum", () => {
    expect(tujuan(proxy(permintaan("/tenant/batches")))?.pathname).toBe("/auth/tenant");
    expect(tujuan(proxy(permintaan("/operator/legality")))?.pathname).toBe("/auth/operator/login");
    expect(tujuan(proxy(permintaan("/buyer/catalog")))?.pathname).toBe("/auth/buyer");
  });

  it("membawa tujuan asal supaya orang mendarat di tempat yang ia klik", () => {
    const ke = tujuan(proxy(permintaan("/tenant/batch/new")));
    expect(ke?.searchParams.get("lanjut")).toBe("/tenant/batch/new");
  });

  it("meloloskan peran yang cocok dengan wilayahnya", () => {
    expect(tujuan(proxy(permintaan("/tenant/batches", "TENANT")))).toBeNull();
    expect(tujuan(proxy(permintaan("/operator", "OPERATOR")))).toBeNull();
    expect(tujuan(proxy(permintaan("/buyer/cart", "BUYER")))).toBeNull();
  });

  it("mengalihkan peran yang salah pintu ke berandanya sendiri, bukan memberi 403", () => {
    expect(tujuan(proxy(permintaan("/operator/zone", "BUYER")))?.pathname).toBe("/buyer/region");
    expect(tujuan(proxy(permintaan("/tenant", "BUYER")))?.pathname).toBe("/buyer/region");
    expect(tujuan(proxy(permintaan("/buyer/catalog", "TENANT")))?.pathname).toBe("/tenant");
    expect(tujuan(proxy(permintaan("/buyer/catalog", "OPERATOR")))?.pathname).toBe("/operator");
  });

  it("membuang query saat mengalihkan peran yang salah pintu", () => {
    // `?zoneId=` milik katalog pembeli tidak punya arti di dasbor Tenant, dan meneruskannya
    // hanya membuat halaman tujuan menafsirkan parameter yang bukan miliknya.
    const ke = tujuan(proxy(permintaan("/buyer/catalog?zoneId=z1", "TENANT")));
    expect(ke?.search).toBe("");
  });

  it("tidak mencegat onboarding, tempat peran sudah ada tetapi profilnya belum", () => {
    expect(tujuan(proxy(permintaan("/tenant/onboarding/profile", "TENANT")))).toBeNull();
    expect(tujuan(proxy(permintaan("/buyer/onboarding/profile")))).toBeNull();
    // Termasuk saat perannya keliru: yang memutuskan tujuan onboarding adalah keadaan
    // profil di `rute-masuk.ts`, bukan tabel wilayah di sini.
    expect(tujuan(proxy(permintaan("/tenant/onboarding/mapping", "BUYER")))).toBeNull();
  });

  it("tidak tertipu awalan yang hanya mirip", () => {
    // `/tenantX` bukan wilayah Tenant. Pencocokan `startsWith` tanpa pembatas garis miring
    // akan menganggapnya begitu, dan rute publik apa pun yang namanya berawalan sama ikut
    // tercegat.
    expect(tujuan(proxy(permintaan("/tenantx-public")))).toBeNull();
  });
});
