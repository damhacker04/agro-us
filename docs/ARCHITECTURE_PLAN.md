# AgroUs — Rencana Arsitektur & Setup Repo (v2.2)

> Selaras dengan [`PRD.md`](PRD.md) v2.2. **PRD adalah sumber kebenaran** untuk requirement;
> dokumen ini adalah keputusan teknis & workflow repo.
>
> Produk: B2B Agro-Logistics **PWA** — supply chain berbasis permintaan yang **terverifikasi**:
> Verified Timeline (hash chain + foto EXIF + cross-check satelit Sentinel-2), keranjang lintas-Tenant,
> escrow + Harvest Assurance, Dual-Signal PoD, dan Demand Intelligence.
>
> **Konteks tim:** 3 orang (FE · BE · PM), metode **Agile**. Arsitektur ramping dulu, naik kelas saat perlu.

---

## 1. Tech Stack Final (PRD §6.4)

| Layer | Teknologi | Catatan v2.0 |
|---|---|---|
| **Monorepo** | pnpm workspaces + Turborepo | share types FE↔BE |
| **Frontend** | Next.js 15 (App Router) **sebagai PWA** + Tailwind | 1 basis kode semua persona; halaman kurir < 150KB |
| **UI** | shadcn/ui + lucide-react | Font: **Fredoka** (heading) + **Poppins** (body) |
| **Backend** | **NestJS** (Node.js) | PRD: "Node.js atau Go" → pilih Node demi 1 bahasa dengan FE |
| **Database** | PostgreSQL + **PostGIS** | poligon lahan, geofence (`ST_DWithin`), titik GPS |
| **ORM** | Prisma (+ raw SQL untuk PostGIS/geometry) | Prisma belum first-class untuk `geometry` → pakai `Unsupported` + raw query |
| **Real-time** | **WebSocket** (Socket.IO), **SSE** cadangan | posisi kurir tiap 10 detik (hemat baterai) |
| **Peta** | **Mapbox GL JS** | render poligon lahan + live map |
| **Satelit** | **Python worker** (rasterio, numpy) + Copernicus Data Space | job harian NDVI/NDMI, **bukan** sinkron |
| **Pembayaran** | **Midtrans / Xendit** + penahanan dana (escrow mitra) | WAJIB escrow mitra, bukan mandiri |
| **Auth** | **OTP telepon** (semua persona); kurir & scan **tanpa login** | email opsional |
| **QR** | `qrcode` (generate) + kamera bawaan / Google Lens (scan) | token sekali pakai |
| **Storage** | Object storage foto bukti; **EXIF diekstrak & disimpan terpisah** | foto tidak dikompresi ulang sebelum ekstraksi |
| **Integritas** | rantai hash SHA-256 + **root hash write-once eksternal** harian | bukan blockchain (PRD §6.1) |
| **Deploy** | FE → Vercel · BE → Railway/Render · Satellite worker → cron host | 3 target (WebSocket & Python long-running tak muat Vercel) |

---

## 2. Struktur Monorepo

```
agro-os/
├── apps/
│   ├── web/                # Next.js PWA — tenant dashboard, buyer storefront, halaman kurir
│   ├── api/                # NestJS — REST + WebSocket + escrow + hash-chain
│   └── satellite-worker/   # Python — job harian Sentinel-2 NDVI/NDMI (BUKAN paket pnpm)
├── packages/
│   └── shared/             # Types + enums kontrak FE↔BE (contract-first)
├── docs/                   # PRD.md + diagrams/
├── turbo.json · pnpm-workspace.yaml · tsconfig.base.json
```

> `apps/satellite-worker` berbahasa Python (punya `requirements.txt`, tanpa `package.json`) sehingga
> otomatis diabaikan oleh pnpm workspace. Dijalankan sebagai cron/scheduled job terpisah.

---

## 3. Clean Architecture — Backend (`apps/api`)

Prinsip Hexagonal (domain murni, akses DB via interface). **Ramping dulu**, naik ke 4 layer penuh
hanya saat modul kompleks (kandidat: `timeline`, `escrow`, `logistics`).

### 3a. Bentuk ramping default per modul
```
modules/<module>/
├── <m>.domain.ts       # entity + aturan bisnis murni TS
├── <m>.service.ts      # use-cases
├── <m>.repository.ts   # interface + impl Prisma/raw-SQL
├── <m>.controller.ts   # REST
└── <m>.dto.ts          # DTO + validasi (Zod/class-validator)
```

### 3b. Peta modul v2.0 (dari PRD & Use Case)
| Modul | Cakupan (FR) | Immutability? |
|---|---|---|
| `auth` | OTP telepon, sesi (FR-1.3) | — |
| `tenant` | onboarding, legalitas, **poligon lahan PostGIS** (FR-1.4–1.7) | — |
| `catalog` | produk, grade, komoditas, **buka kuota PO** (FR-2.2, 3.2–3.3) | — |
| `batch` | batch ↔ poligon, status produksi & verifikasi (FR-3.4) | — |
| `timeline` | **Verified Timeline**: node append-only, hash chain, foto EXIF (FR-4.\*) | **INSERT-ONLY** |
| `verification` | konsumsi hasil satellite-worker, set badge (FR-4.4–4.6) | — |
| `order` | keranjang lintas-Tenant, rencana pengiriman terkonsolidasi (FR-2.3–2.4) | — |
| `payment` | Midtrans/Xendit, validasi otomatis (FR-2.8) | — |
| `escrow` | **ledger append-only** HOLD/RELEASE/REFUND, Harvest Assurance (FR-7.\*) | **append-only** |
| `logistics` | QR token sekali pakai, **Kode Antar 4 digit** (FR-6.\*), tracking session, geofence, **Dual-Signal PoD** (FR-3.6, 5.6) | — |
| `quality` | grade, toleransi susut, **jendela klaim**, routing operator (FR-5.\*) | — |
| `demand` | agregasi PO → Rekomendasi Tanam (materialized view) (FR-8.\*) | — |

### 3c. Tiga hal yang WAJIB benar sejak awal (integritas — PRD §6.1)
1. **Timeline INSERT-ONLY** — di 3 lapis: API (tanpa endpoint UPDATE/DELETE), DB (hak akses + trigger tolak UPDATE/DELETE), dan **root hash harian ke storage write-once eksternal**.
2. **Escrow ledger append-only** — tiap mutasi = row baru (`entry_type`), tidak ada edit.
3. **Foto EXIF** — ekstrak metadata **sebelum** kompresi apa pun; simpan terpisah dari file.
4. **Kode Antar (v2.1)** — PIN disimpan **hash** (bukan plaintext), maks 5 percobaan lalu token terkunci,
   dan `consumed_at` token QR diisi **setelah PIN benar** — bukan saat scan (FR-6.2). Salah urutan di sini
   = celah yang justru mau ditutup v2.1.
5. **Alokasi FIFO (v2.2)** — urutkan berdasarkan **`PAYMENTS.paid_at`**, bukan `ORDERS.created_at`.
   Salah kolom = celah *gaming* (booking duluan, bayar belakangan). Alokasi harus **transaksional**
   agar tidak ada double-allocation saat panen dideklarasikan bersamaan (FR-7.9).
6. **Panen sebagian diturunkan, bukan disimpan ganda** — `quota_box_fulfilled < quota_box_sold`
   adalah satu-satunya penanda shortfall. **Jangan** menambah nilai `production_status` baru;
   dua sumber kebenaran akan tidak sinkron (§5.7.2).

### 3d. Seed data yang WAJIB ada sebelum Fase 1 selesai

`COMMODITIES` (grade standards, toleransi susut, **rendemen rata-rata**) dan `ZONES` (nilai minimum pesanan)
**memblokir** FR-3.2, FR-3.3, FR-5.1, dan FR-5.2 — tanpa keduanya produk tidak bisa punya grade dan kuota
tidak bisa dibatasi. Cukup **file seed di migration**; konsol CRUD operator (OP-09/OP-10) baru perlu Fase 4.

> ⚠️ **`avg_yield_kg_per_ha` langsung menentukan batas kuota 70%.** Angka yang salah membuat Tenant
> bisa menjual melebihi kapasitas lahannya. **Wajib divalidasi ke penyuluh pertanian / data BPS**
> sebelum produksi — jangan pakai angka perkiraan untuk komitmen bisnis.

---

## 4. Struktur Frontend (`apps/web`, PWA)

```
src/app/
├── (tenant)/          # Desktop/Tablet — dashboard, katalog, batch, pesanan, rekomendasi tanam
├── (buyer)/           # Mobile — pilih kota, katalog terpadu, keranjang lintas-tenant,
│   │                  #   checkout, Pesanan Saya (timeline + NDVI + live map + Harvest Assurance)
│   └── ...
├── scan/[qrToken]/    # Halaman kurir ZERO-INSTALL — < 150KB, tanpa font kustom/framework berat
└── manifest / sw      # konfigurasi PWA
src/features/          # per-fitur: components + hooks + api-client (konsumsi packages/shared)
```

> Halaman kurir dibuat sebagai route paling ringan (target < 150KB, buka cepat di 3G). Pertimbangkan
> route group terpisah tanpa dependency berat / Mapbox penuh.

---

## 5. Data Model → lihat ERD

Skema lengkap ada di [`diagrams/05-erd.md`](diagrams/05-erd.md) (25+ entitas, PostgreSQL + PostGIS).
Highlight kolom `geometry` (PostGIS): `LAND_PLOTS.polygon`, `TIMELINE_NODES.gps_point`,
`SHIPMENTS.dest_point`, `TRACKING_POSITIONS.point`. Entitas append-only: `TIMELINE_NODES`,
`ESCROW_LEDGER`, `HASH_ANCHORS`.

---

## 6. Strategi Branch Git (Trunk-Based)

`main` selalu deploy-able; feature branch **pendek** (< 2-3 hari) → PR → `main` (1 reviewer). Rilis = git tag.

**Branch v2.0** (selaras 5 fase roadmap PRD §11.1):

| Fase PRD | Branch |
|---|---|
| Fase 1 — Fondasi | `feat/db-schema-postgis` · `feat/auth-otp` · `feat/tenant-onboarding` · `feat/catalog-crosstenant` |
| Fase 2 — Transaksi | `feat/cart-checkout-escrow` |
| Fase 3 — Verifikasi | `feat/verified-timeline` · `feat/satellite-verification` |
| Fase 4 — Logistik | `feat/logistics-tracking-pod` · `feat/quality-claims` · `feat/harvest-assurance` |
| Fase 5 — Intelijen | `feat/demand-intelligence` |

Konvensi commit: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

---

## 7. CI/CD & Deployment (3 target)

- `ci.yml`: lint + type-check + build (turbo) tiap PR; untuk `satellite-worker` tambah lint Python (ruff) + test.
- **FE** (`apps/web`) → Vercel. **BE** (`apps/api`) → Railway/Render (WebSocket long-running).
  **Satellite worker** → scheduled/cron host (job harian), bukan Vercel serverless.

---

## 8. Agile Working Model (tim 3: FE · BE · PM)

### 8a. Vertical slice per sprint (peta ke fase PRD §11.1)
| Sprint | Target demo | Branch utama |
|---|---|---|
| 0 | Setup: monorepo, CI, PostGIS, branch protection, board | (main) |
| 1-3 (Fase 1) | Auth OTP → onboarding + poligon lahan → katalog + buka kuota PO | `feat/auth-otp`, `feat/tenant-onboarding`, `feat/catalog-crosstenant`, `feat/db-schema-postgis` |
| 4-6 (Fase 2) | Keranjang lintas-tenant → checkout → payment gateway → escrow HOLD | `feat/cart-checkout-escrow` |
| 7-9 (Fase 3) | Verified Timeline (hash chain + foto) → pipeline Sentinel-2 → badge | `feat/verified-timeline`, `feat/satellite-verification` |
| 10-11 (Fase 4) | QR + tracking + geofence + Dual-Signal PoD + klaim mutu + Harvest Assurance | `feat/logistics-tracking-pod`, `feat/quality-claims`, `feat/harvest-assurance` |
| 12 (Fase 5) | Agregasi permintaan + Rekomendasi Tanam | `feat/demand-intelligence` |

### 8b. Contract-first
Definisikan kontrak API di `packages/shared` (types + enums + Zod) **sebelum** implementasi tiap fitur → FE kerja pakai mock, perubahan kontrak langsung ketahuan di kedua sisi.

### 8c. Pembagian peran
- **BE** (kamu): `apps/api` (NestJS, PostGIS, escrow, hash-chain), koordinasi `apps/satellite-worker`.
- **FE**: `apps/web` (PWA, Mapbox, shadcn), konsumsi `packages/shared`.
- **PM**: backlog (GitHub Projects), prioritas sprint, definisi "done", cek fungsional saat review PR.

### 8d. Ritual ringan
Sprint 1-2 minggu; daily async; board `Backlog → Todo → In Progress → Review → Done`;
DoD = merged ke `main` + CI hijau + bisa didemo.

---

## 9. Catatan Kepatuhan (PRD §5.7.1) — jangan dilanggar saat implementasi
- Dana **selalu** di rekening escrow mitra berizin, **tidak pernah** masuk rekening operasional AgroUs.
- Tidak ada janji imbal hasil; pembeli = badan usaha (bukan investor).
- AgroUs **tidak** membangun unit pembiayaan sendiri.

---

## 10. Langkah Selanjutnya
1. `feat/db-schema-postgis` — Prisma schema + PostGIS + migration + trigger tolak UPDATE/DELETE pada timeline & ledger.
2. `feat/auth-otp` — OTP telepon.
3. Set branch protection `main` + GitHub Projects board (via web).
4. Lanjut per sprint sesuai §8a.
