/**
 * Lint sisi API.
 *
 * Sebelumnya script `lint` di sini hanya `echo "[api] lint menyusul"` — perintah yang
 * SELALU berhasil, sehingga pipeline melaporkan tahap lint yang lulus untuk backend yang
 * tidak pernah dilint sama sekali. Itu lebih buruk daripada tidak punya lint: ia
 * menghasilkan keyakinan tanpa pemeriksaan.
 *
 * Dipakai `recommended` tanpa type-checking, bukan `recommendedTypeChecked`. Alasannya
 * bukan kecepatan: `tsc --noEmit` sudah dijalankan terpisah dan sudah menangkap kelas
 * kesalahan yang sama, jadi aturan bertipe di sini hanya akan menggandakan pekerjaan yang
 * sudah ada sambil menambah satu program TypeScript lagi untuk dirawat.
 */
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "coverage-*/**", "node_modules/**", "generated/**", "eslint.config.mjs"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Argumen berawalan `_` adalah cara menandai "parameter ini wajib ada karena
      // posisinya, bukan karena dipakai" — lazim di handler dan decorator Nest.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    rules: {
      // Test double dibentuk dengan `any`: memaksa tipe penuh pada Prisma palsu berarti
      // menulis ulang seluruh permukaan klien untuk setiap tes.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
