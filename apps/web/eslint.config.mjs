/**
 * Lint sisi web.
 *
 * Sebelumnya script-nya `next lint`, dan perintah itu SUDAH DIHAPUS di Next 16 — yang
 * terjadi adalah "lint" dibaca sebagai nama direktori proyek, lalu turbo melaporkan
 * `@agro-os/web#lint` gagal. Selama itu berlangsung tidak ada satu baris pun yang
 * benar-benar dilint, sementara pipeline terlihat seperti punya tahap lint.
 *
 * Jadi ESLint dipanggil langsung dengan flat config. `core-web-vitals` dipilih, bukan
 * `next` saja: aturan yang ia tambahkan (gambar, script, font) adalah yang paling sering
 * jadi temuan nyata di aplikasi Next, dan kami lebih memilih melihatnya sekarang daripada
 * saat demo.
 */
import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "eslint.config.mjs",
    ],
  },
  ...next,
  ...nextTs,
  {
    /**
     * `set-state-in-effect` (aturan baru di eslint-plugin-react-hooks 6, ikut Next 16)
     * menyala 12 kali di sini, semuanya pada pola yang SAMA dan disengaja: state yang
     * hanya ada di peramban — `localStorage`, `sessionStorage`, geolokasi — dibaca di
     * `useEffect` lalu di-set, justru supaya tidak dibaca saat render dan tidak
     * menghasilkan ketidakcocokan hidrasi.
     *
     * Diturunkan ke peringatan, BUKAN dimatikan: angkanya tetap tercetak setiap kali
     * lint jalan, jadi utangnya kelihatan dan bisa dihitung. Menaikkannya kembali ke
     * error berarti memindahkan pemuatan data ini ke Server Component — pekerjaan yang
     * nyata, tapi bukan pekerjaan yang boleh dititipkan pada perbaikan konfigurasi lint.
     */
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    // Tes memakai `any` untuk membentuk respons palsu dan variabel yang sengaja tak
    // dipakai; menuntut ketegasan yang sama seperti kode produksi hanya akan membuat
    // orang menulis lebih sedikit tes.
    files: ["src/**/*.spec.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
