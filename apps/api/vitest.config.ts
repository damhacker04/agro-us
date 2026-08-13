import { defineConfig } from "vitest/config";

/**
 * Uji unit sisi API.
 *
 * Sengaja HANYA menjalankan berkas `*.spec.ts` di dalam `src/` dan tidak menyalakan apa
 * pun yang menyentuh basis data: yang diuji di sini adalah logika murni yang salahnya
 * mahal — verifikasi tanda tangan callback pembayaran adalah yang pertama, karena ia satu-
 * satunya pagar antara "tahu nomor tagihan" dan "dapat barang gratis".
 *
 * Alur yang butuh Postgres + PostGIS masih diuji ujung ke ujung terhadap produksi. Itu
 * bukan pengganti, dan tidak berpura-pura menjadi pengganti.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
