// Konfigurasi Prisma v7 (menggantikan blok "prisma" di package.json).
// .env TIDAK dimuat otomatis oleh Prisma 7 — karena itu ada import dotenv di bawah.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Dijalankan oleh `prisma db seed` dan otomatis setelah `migrate dev`/`migrate reset`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
