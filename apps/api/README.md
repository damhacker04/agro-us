# @agro-os/api

Backend NestJS — REST + WebSocket (Socket.IO). ORM **Prisma 7** + **PostgreSQL + PostGIS**.
Deploy: **Railway / Render** (server long-running — tidak di Vercel, lihat ARCHITECTURE_PLAN §7).

> **Status:** skema DB + migration + seed ✅ (branch `feat/db-schema-postgis`).
> Scaffold NestJS menyusul di sprint berikutnya.

## Setup database (sekali per developer)

XAMPP **tidak** punya PostgreSQL. Pilih salah satu:

```bash
# Opsi A — Docker (tercepat)
docker run -d --name agrous-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=agrous -p 5432:5432 postgis/postgis:16-3.4
```

- **Opsi B — Supabase** (tanpa Docker): buat project gratis, aktifkan extension `postgis`,
  pakai connection string **Direct** (bukan pooler) di `.env`.
  ⚠️ `prisma migrate dev` butuh hak buat *shadow database* — di Supabase pakai `prisma migrate deploy` saja.

Lalu:

```bash
cp .env.example .env          # sesuaikan DATABASE_URL
pnpm --filter @agro-os/api run db:migrate   # apply migration 0_init + auto-seed
```

> ⚠️ Migration `0_init` **belum pernah diuji terhadap DB nyata** (mesin dev pertama tanpa
> Docker/Postgres). Developer pertama yang menjalankan `db:migrate`: kalau ada error SQL,
> laporkan — kandidat tersangka ada di bagian footer (trigger/MV), bukan bagian generated.

## Yang ada di `prisma/`

| File | Isi |
|---|---|
| `schema.prisma` | 25 model + 20 enum sesuai [ERD v2.2](../../docs/diagrams/05-erd.md). Geometry via `Unsupported` |
| `migrations/0_init/` | SQL generated + **handcrafted**: `CREATE EXTENSION postgis`, GiST index, CHECK constraints, **trigger append-only**, MV `demand_aggregates` |
| `seed.ts` | 3 zona Malang Raya + 12 komoditas (grade standards, toleransi susut, rendemen) |
| `../prisma.config.ts` | Konfigurasi Prisma 7 (schema path, seed command, DATABASE_URL via dotenv) |
| `../generated/prisma/` | Client hasil `db:generate` — **di-gitignore**, jalankan generate setelah clone |

## Perintah

```bash
pnpm --filter @agro-os/api run db:generate   # generate Prisma Client (wajib setelah clone/ubah schema)
pnpm --filter @agro-os/api run db:migrate    # prisma migrate dev
pnpm --filter @agro-os/api run db:seed       # seed ulang (idempotent)
pnpm --filter @agro-os/api run db:studio     # GUI browse data
```

## Aturan yang DIJAGA DATABASE (bukan cuma aplikasi)

- **Append-only**: `timeline_nodes`, `node_photos`, `escrow_ledger`, `hash_anchors` — trigger
  menolak UPDATE/DELETE bahkan dari koneksi admin (PRD §6.1). Koreksi = baris baru (node Ralat).
- **CHECK**: `quota_box_sold ≤ quota_box_total`, `quota_box_fulfilled ≤ quota_box_sold`,
  `FAILED ⟹ fulfilled = 0`, `pin_attempts ≤ 5`, `quota_multiplier ≤ 0.70`.
- **Geometry** (`land_plots.polygon`, `timeline_nodes.gps_point`, `shipments.dest_point`,
  `tracking_positions.point`): tulis via `$executeRaw` + `ST_GeomFromGeoJSON`; geofence via
  `ST_DWithin(...::geography, 100)`.

## Invariant modul (WAJIB saat implementasi NestJS — ARCHITECTURE_PLAN §3c)

- Alokasi FIFO pakai **`payments.paid_at`**, bukan `orders.created_at` (FR-7.9) — dan transaksional.
- Token QR `consumed_at` diisi **setelah Kode Antar benar**, bukan saat scan (FR-6.2).
- PIN Kode Antar disimpan **hash**; salah 5× = token terkunci (FR-6.3).
- ⚠️ **Rendemen di seed = INDIKATIF.** Validasi ke penyuluh/BPS sebelum produksi (menentukan batas kuota 70%).

## Modul v2.2 (lihat ARCHITECTURE_PLAN §3b)

`auth` (OTP) · `tenant` (poligon PostGIS) · `catalog` · `batch` · `timeline` (INSERT-ONLY + hash chain) ·
`verification` (Sentinel-2) · `order` (cross-tenant) · `payment` (Midtrans/Xendit) ·
`escrow` (ledger append-only) · `logistics` (QR + Kode Antar + geofence + Dual-Signal PoD) ·
`quality` (klaim) · `demand`.
