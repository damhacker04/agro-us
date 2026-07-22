# @agro-os/web

Frontend Next.js 15 (App Router) — portal tenant admin + portal publik pembeli (white-label).
Deploy: **Vercel**.

> **Status: placeholder.** Scaffold Next.js dikerjakan di Sprint 1 (walking skeleton).

## Scaffold (nanti, saat Sprint 1)

```bash
# dari root repo
pnpm create next-app@latest apps/web --typescript --tailwind --app --eslint
```

Lalu wire dependency ke `@agro-os/shared` (sudah terdaftar di package.json) untuk kontrak API.

## Struktur target (lihat docs/ARCHITECTURE_PLAN.md §4)

```
src/app/(tenant)/     # dashboard perusahaan
src/app/(public)/[tenantSlug]/   # portal publik pembeli
src/app/scan/[qrToken]/          # halaman kurir scan QR
src/features/         # per-fitur: components + hooks + api-client
```
