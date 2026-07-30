# AgroUs

B2B Agro-Logistics **PWA** — supply chain berbasis permintaan yang *terverifikasi*.
Bukan sekadar marketplace: **permintaan pembeli menentukan apa yang ditanam** (pull, bukan push),
dan setiap klaim budidaya diverifikasi independen dengan citra satelit.

> **Tagline:** *Kami tidak percaya klaim petani. Kami memverifikasinya.*
>
> 📄 PRD lengkap: [`docs/PRD.md`](docs/PRD.md) · 🏗️ Arsitektur: [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md)
> · 📊 Diagram: [`docs/diagrams/`](docs/diagrams)

## Tiga lapisan produk
1. **Transaksi** — Pre-Order pra-panen, escrow, konsolidasi pengiriman, tracking.
2. **Verifikasi** — Verified Timeline (hash chain + foto EXIF + cross-check satelit Sentinel-2).
3. **Intelijen** — agregasi permintaan → Rekomendasi Tanam (network effect).

## Struktur (pnpm + Turborepo monorepo)

```
apps/
  web/                # Next.js PWA — tenant dashboard, buyer storefront, halaman kurir (deploy: Vercel)
  api/                # NestJS — REST + WebSocket + escrow + hash-chain (deploy: Railway/Render)
  satellite-worker/   # Python — job harian Sentinel-2 NDVI/NDMI (deploy: cron host)
packages/
  shared/             # Types + enums (kontrak FE↔BE, contract-first)
```

## Tech stack (PRD §6.4)

Next.js 15 PWA · NestJS · PostgreSQL + **PostGIS** · Prisma · Socket.IO · **Mapbox GL JS** ·
**Midtrans/Xendit (escrow)** · **Sentinel-2 / Copernicus (Python)** · shadcn/ui · TypeScript

## Getting started

```bash
pnpm install      # sekaligus menyiapkan Prisma Client (lewat postinstall di apps/api)
pnpm dev          # turbo membangun packages/shared dulu, lalu menyalakan web + api
pnpm type-check
```

### Kalau kamu hanya mengerjakan FE

`pnpm dev` menyalakan **api juga**, dan api butuh PostgreSQL + PostGIS serta `apps/api/.env`.
Untuk kerja di `apps/web` saja, jalankan web-nya sendirian:

```bash
pnpm --filter @agro-os/web dev
```

Butuh data sungguhan? Minta salah satu anggota tim menjalankan api di komputernya, lalu
arahkan `NEXT_PUBLIC_API_URL` ke alamat itu. Kontrak tipe di `packages/shared` sudah stabil,
jadi mock pun tidak akan sia-sia.

### Dua hal yang TIDAK ada di git — dan penyebab error "modul tidak ditemukan"

Keduanya hasil olahan, jadi sengaja tidak di-commit (lihat `.gitignore`) dan dibuat ulang di
tiap komputer. Kalau salah satu belum ada, TypeScript melaporkan **ratusan** error yang
sebenarnya berasal dari satu sebab:

| Yang belum ada | Gejalanya | Dibuat oleh |
| --- | --- | --- |
| `apps/api/generated/prisma` | `Property 'batch' does not exist on type 'PrismaService'` (dan puluhan tabel lain) | `postinstall` → `prisma generate` |
| `packages/shared/dist` | `Cannot find module '@agro-os/shared'` | task `build`, dipicu `dependsOn: ["^build"]` |

Sekarang keduanya otomatis. Kalau tetap muncul, jalankan pemulihan manualnya:

```bash
pnpm install && pnpm --filter @agro-os/shared build
```

### Menjalankan api penuh (butuh database)

```bash
cp apps/api/.env.example apps/api/.env    # lalu isi JWT_SECRET & OTP_PEPPER
```

API **menolak boot** tanpa `JWT_SECRET` — itu disengaja, secret cadangan hardcoded sudah
dihapus. Cara tercepat menyiapkan databasenya ada di `apps/api/.env.example`.

Di Windows, kalau Docker Desktop gagal start dengan pesan *"remove …/dockerInference: The
file cannot be accessed by the system"*, jalankan `scripts/fix-docker.ps1` — penyebabnya
socket sisa dari proses yang mati tidak wajar, dijelaskan di dalam skripnya.

## Workflow git

Trunk-based: `main` selalu deploy-able, feature branch pendek (`feat/…`) → PR → `main`.
Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
