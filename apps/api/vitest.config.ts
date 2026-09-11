import { defineConfig } from "vitest/config";

/**
 * Uji unit sisi API.
 *
 * Sengaja HANYA menjalankan berkas `*.spec.ts` di dalam `src/` dan tidak menyalakan apa
 * pun yang menyentuh basis data: yang diuji di sini adalah logika murni yang salahnya
 * mahal — verifikasi tanda tangan callback pembayaran adalah yang pertama, karena ia satu-
 * satunya pagar antara "tahu nomor tagihan" dan "dapat barang gratis".
 *
 * Basis data, SMS dan payment provider diganti test doubles. Suite ini tidak
 * membuktikan SQL/PostGIS atau integrasi provider; pengujian itu memerlukan lingkungan
 * integrasi tersendiri. Coverage selalu memakai seluruh src, termasuk file yang belum
 * diimpor oleh tes, supaya persentasenya tidak menyembunyikan fitur belum diuji.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.d.ts"],
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: process.env["QA_STRICT_COVERAGE"] === "true"
        ? { statements: 100, branches: 100, functions: 100, lines: 100 }
        : undefined,
    },
  },
});
