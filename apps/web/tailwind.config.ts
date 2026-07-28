import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Ini memberi tahu Tailwind untuk membaca semua file di dalam folder src
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Menghubungkan variabel font dari layout.tsx ke Tailwind
        sans: ['var(--font-poppins)'],
        fredoka: ['var(--font-fredoka)'],
      },
    },
  },
  plugins: [],
};
export default config;