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
pnpm install
pnpm dev          # jalankan app JS (turbo) — satellite-worker dijalankan terpisah (Python)
pnpm type-check
```

> `apps/web` & `apps/api` masih placeholder; scaffold penuh dikerjakan per sprint (lihat ARCHITECTURE_PLAN §8).

## Workflow git

Trunk-based: `main` selalu deploy-able, feature branch pendek (`feat/…`) → PR → `main`.
Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
