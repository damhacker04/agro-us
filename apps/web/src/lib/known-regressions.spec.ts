import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "@agro-os/shared";
import { ambilZona } from "./api";
import { ambilUser, hapusSesi, simpanSesi } from "./auth";
import { bacaKeranjang, jumlahItem, tambahKeKeranjang } from "./keranjang";
import { installBrowser } from "../test/browser";

/**
 * Dulu berisi lima `it.fails` — reproduksi defect yang SENGAJA gagal. Kelimanya sudah
 * diperbaiki, jadi sesuai aturan file ini sendiri semuanya menjadi `it` biasa: penanda
 * `it.fails` yang dibiarkan setelah perbaikan akan berbalik menjadi kegagalan "lulus
 * padahal seharusnya gagal", dan itu justru menyembunyikan keadaan sebenarnya.
 *
 * Yang diuji di sini punya satu kesamaan: SEMUA masukannya datang dari luar program —
 * `localStorage` yang bisa ditulis siapa pun di perangkat itu, dan respons HTTP. Karena
 * itu berkasnya tetap dipertahankan sebagai satu kumpulan, bukan dibubarkan ke modulnya
 * masing-masing.
 */
describe("masukan tak terpercaya dari peramban dan jaringan (dulu FE-REG-01..05)", () => {
  beforeEach(() => {
    installBrowser();
  });

  it("mengembalikan keranjang kosong untuk JSON sah yang bentuknya bukan keranjang (FE-REG-01)", () => {
    localStorage.setItem("agrous.keranjang", '{"oldVersion":1}');
    expect(bacaKeranjang()).toEqual([]);
    expect(jumlahItem()).toBe(0);
  });

  it("membuang hanya baris yang rusak dan mempertahankan yang utuh (FE-REG-01)", () => {
    localStorage.setItem(
      "agrous.keranjang",
      JSON.stringify([{ batchId: "utuh", qtyBox: 3 }, { batchId: "tanpa-qty" }, { qtyBox: 2 }, { batchId: "nol", qtyBox: 0 }]),
    );
    expect(bacaKeranjang().map((b) => b.batchId)).toEqual(["utuh"]);
    expect(jumlahItem()).toBe(3);
  });

  it("menolak jumlah negatif alih-alih menyimpannya sebagai stok negatif (FE-REG-02)", () => {
    const item = { batchId: "batch-test", quotaBoxAvailable: 5, tenant: { companyName: "Test" } } as CatalogItem;
    tambahKeKeranjang(item, "zone-test", -2);
    expect(bacaKeranjang()).toEqual([]);
  });

  it("menolak jumlah pecahan dan nol, dan tetap menerima jumlah sah (FE-REG-02)", () => {
    const item = { batchId: "batch-test", quotaBoxAvailable: 5, tenant: { companyName: "Test" } } as CatalogItem;
    tambahKeKeranjang(item, "zone-test", 0);
    tambahKeKeranjang(item, "zone-test", 0.5);
    expect(bacaKeranjang()).toEqual([]);
    tambahKeKeranjang(item, "zone-test", 2);
    expect(bacaKeranjang().map((b) => b.qtyBox)).toEqual([2]);
  });

  it("memperlakukan JSON sah yang bentuknya bukan pengguna sebagai belum masuk (FE-REG-03)", () => {
    localStorage.setItem("agrous.user", '"not-a-user"');
    expect(ambilUser()).toBeNull();
  });

  it("menolak pengguna tanpa peran yang dikenali (FE-REG-03)", () => {
    localStorage.setItem("agrous.user", JSON.stringify({ id: "x", phone: "+628", role: "SUPERADMIN" }));
    expect(ambilUser()).toBeNull();
    localStorage.setItem("agrous.user", JSON.stringify({ id: "x", phone: "+628", role: "BUYER" }));
    expect(ambilUser()).toEqual({ id: "x", phone: "+628", role: "BUYER" });
  });

  it("memperlakukan HTTP 205 sebagai sukses tanpa badan respons (FE-REG-04)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 205 })));
    await expect(ambilZona()).resolves.toBeUndefined();
  });

  it("tidak mewariskan keranjang pembeli sebelumnya pada perangkat bersama (FE-REG-05)", () => {
    simpanSesi("token-a", { id: "buyer-a", phone: "+628111111111", role: "BUYER" });
    tambahKeKeranjang({ batchId: "batch-a", productName: "Pesanan usaha A", quotaBoxAvailable: 2, tenant: { companyName: "Test" } } as CatalogItem, "zone-a", 2);
    hapusSesi();
    simpanSesi("token-b", { id: "buyer-b", phone: "+628222222222", role: "BUYER" });
    expect(bacaKeranjang()).toEqual([]);
  });

  it("tidak membuang keranjang saat pembeli yang SAMA masuk kembali (FE-REG-05)", () => {
    const a = { id: "buyer-a", phone: "+628111111111", role: "BUYER" } as const;
    simpanSesi("token-a", a);
    tambahKeKeranjang({ batchId: "batch-a", productName: "Pesanan usaha A", quotaBoxAvailable: 2, tenant: { companyName: "Test" } } as CatalogItem, "zone-a", 2);
    hapusSesi();
    // Sesi habis lalu masuk lagi adalah kejadian biasa; pesanan yang sudah disusun
    // tidak boleh hilang hanya karena tokennya diperbarui.
    simpanSesi("token-a2", a);
    expect(bacaKeranjang().map((b) => b.batchId)).toEqual(["batch-a"]);
  });
});
