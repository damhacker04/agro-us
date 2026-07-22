# @agro-os/api

Backend NestJS — REST API + Socket.IO gateway (live GPS). ORM Prisma + PostgreSQL.
Deploy: **Railway / Render** (server long-running — tidak di Vercel, lihat ARCHITECTURE_PLAN §8).

> **Status: placeholder.** Scaffold NestJS dikerjakan di Sprint 1.

## Scaffold (nanti, saat Sprint 1)

```bash
# dari root repo
pnpm dlx @nestjs/cli new apps/api --skip-git --package-manager pnpm
pnpm add -D prisma --filter @agro-os/api
pnpm add @prisma/client socket.io --filter @agro-os/api
```

## Struktur target (lihat docs/ARCHITECTURE_PLAN.md §3)

Bentuk ramping default per modul: `*.domain.ts`, `*.service.ts`, `*.repository.ts`,
`*.controller.ts`, `*.dto.ts`. Modul: `tenant, catalog, timeline, order, shipment, auth`.
Naik ke 4 layer penuh hanya saat modul kompleks (mis. `shipment`).
