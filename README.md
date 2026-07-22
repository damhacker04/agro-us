# AgroOS

B2B Agro-Logistics SaaS (white-label) — marketplace khusus sayur & buah dengan
linimasa produksi immutable, PO sebelum panen, bulk QR per box, dan live map tracking kurir.

> Arsitektur & rencana lengkap: [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md)

## Struktur (pnpm + Turborepo monorepo)

```
apps/
  web/       # Next.js — portal tenant admin + portal publik pembeli (deploy: Vercel)
  api/       # NestJS — REST + Socket.IO gateway (deploy: Railway/Render)
packages/
  shared/    # Types + Zod schemas (kontrak FE↔BE, contract-first)
```

## Tech stack

Next.js 15 · NestJS · PostgreSQL + Prisma · Socket.IO · Leaflet · shadcn/ui · TypeScript

## Getting started

```bash
pnpm install
pnpm dev          # jalankan semua app (turbo)
pnpm type-check   # cek tipe seluruh workspace
```

> Catatan: `apps/web` & `apps/api` masih placeholder. Scaffold Next.js/NestJS dikerjakan
> di sprint masing-masing (lihat §10 pada dokumen arsitektur).

## Workflow git

Trunk-based: `main` selalu deploy-able, feature branch pendek (`feat/…`) → PR → `main`.
Commit pakai Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
