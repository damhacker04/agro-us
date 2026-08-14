import type { Config } from "tailwindcss";

/**
 * Dunia visual: Label Sertifikasi.
 *
 * Empat warna adalah warna label sertifikasi benih Indonesia — putih (penjenis), ungu
 * (dasar), biru (pokok), merah jambu (sebar). Bukan palet yang dipilih karena enak
 * dipandang: itu sistem penandaan mutu yang sudah dipakai negara ini untuk menyatakan
 * kualitas yang tidak bisa dilihat mata, menempel di karung benih. Produk ini melakukan
 * hal yang sama untuk panen yang belum ada.
 *
 * Warna menguasai REGION penuh, bukan jadi aksen yang ditabur di atas ground netral.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Kertas sekuriti — dingin, bukan krem. Krem adalah ground bawaan yang dihindari. */
        kertas: {
          DEFAULT: "#EDEFE8",
          terang: "#F6F7F2",
          garis: "#D3D8CB",
        },
        /** Tinta intaglio: biru-hitam dalam, warna cetak pengaman. */
        tinta: {
          DEFAULT: "#141A2E",
          lembut: "#3A4259",
          /* Digelapkan dari #6E7690: rasio kontrasnya hanya 3,84:1 di atas kertas —
             di bawah 4.5:1 yang dituntut teks kecil. Sekarang 4,63:1. */
          samar: "#5C6478",
        },
        /* `muda` dicerahkan dari #8B6FC4: hash 12px di atas ground tinta hanya 4,25:1. Kini 5,1:1. */
        ungu: { DEFAULT: "#5B3E96", tua: "#3B2668", muda: "#9A80CE" },
        biru: { DEFAULT: "#1B63A8", tua: "#0E3F70", muda: "#5B9AD6" },
        /* Digelapkan dari #C24E6C: teks putih 15px di atasnya hanya 4,24:1. Sekarang 5,3:1. */
        jambu: { DEFAULT: "#A63A55", tua: "#7A2439", muda: "#D97F97" },
        /** Cap verifikasi. Satu-satunya merah di sistem, dan hanya untuk stempel. */
        stempel: "#C8321E",
        /**
         * Teks sekunder DI ATAS ground berwarna, ditarik dari hue ground-nya sendiri.
         * Abu-abu di atas ungu terbaca kotor dan gagal kontras; tint dari hue yang sama
         * tetap terbaca sebagai bagian dari dokumen yang sama.
         */
        kabut: { ungu: "#CDBFE8", biru: "#DCE9F7", jambu: "#F7DEE5" },
      },
      fontFamily: {
        /**
         * Poppins DIPERTAHANKAN sebagai `sans` karena 56 halaman lain memakainya. Brief
         * membatasi lingkup ke rute `/` saja; menukar `sans` di sini akan diam-diam
         * mengubah tipografi seluruh aplikasi yang belum ditinjau.
         */
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        fredoka: ["var(--font-fredoka)"],
        /**
         * Dunia baru. Satu keluarga grotesk untuk seluruh struktur, dari label formulir
         * 10px sampai judul sertifikat: karakter display-nya datang dari LEBAR dan bobot
         * (Archivo punya sumbu wdth), bukan dari serif kontras tinggi. Dokumen sekuriti
         * sungguhan memang memakai huruf resmi yang datar dan membiarkan guilloche bicara.
         */
        sertifikat: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        /** Hanya untuk data terukur: nomor seri, hash, koordinat, tanggal akuisisi, NDVI. */
        mono: ["var(--font-chivo-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: { sertifikat: "0.18em", cap: "0.26em" },
      keyframes: {
        gores: { from: { strokeDashoffset: "var(--panjang)" }, to: { strokeDashoffset: "0" } },
        naik: {
          from: { opacity: "0", transform: "translateY(0.75rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        /** Satu gerak berwibawa: pola pengaman menggores dirinya sendiri, sekali. */
        gores: "gores 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        naik: "naik 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
