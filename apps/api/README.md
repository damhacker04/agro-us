# @agro-os/api

Backend **NestJS** — REST + WebSocket (Socket.IO). ORM Prisma + **PostgreSQL + PostGIS**.
Deploy: **Railway / Render** (server long-running — tidak di Vercel, lihat ARCHITECTURE_PLAN §7).

> **Status: placeholder.** Scaffold NestJS dikerjakan di Sprint 1.

## Scaffold (nanti, Sprint 1)

```bash
pnpm dlx @nestjs/cli new apps/api --skip-git --package-manager pnpm
pnpm add -D prisma --filter @agro-os/api
pnpm add @prisma/client socket.io --filter @agro-os/api
# PostGIS: aktifkan extension di migration → CREATE EXTENSION postgis;
```

## Modul v2.0 (lihat ARCHITECTURE_PLAN §3b)
`auth` (OTP) · `tenant` (poligon PostGIS) · `catalog` · `batch` · `timeline` (INSERT-ONLY + hash chain) ·
`verification` (Sentinel-2) · `order` (cross-tenant) · `payment` (Midtrans/Xendit) ·
`escrow` (ledger append-only) · `logistics` (QR + geofence + Dual-Signal PoD) · `quality` (klaim) · `demand`.

## WAJIB benar sejak awal (integritas — PRD §6.1)
- **Timeline & escrow ledger INSERT-ONLY**: hapus endpoint UPDATE/DELETE, batasi hak akses DB (INSERT/SELECT),
  trigger DB tolak UPDATE/DELETE, + publikasi root hash harian ke storage write-once eksternal.
- **Geofence**: `ST_DWithin(posisi, dest_point, 100)` via PostGIS.
- **Escrow**: dana di rekening mitra berizin, bukan rekening operasional (kepatuhan PRD §5.7.1).
