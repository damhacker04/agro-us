# AgroOS — Rencana Arsitektur & Setup Repo

> B2B Agro-Logistics SaaS (White-Label) — "Shopee khusus sayur & buah" dengan:
> linimasa produksi immutable, progress tracker PO (bisa pesan sebelum panen),
> bulk QR code per box, dan live map tracking kurir secara real-time.
>
> Status: **RENCANA (belum ada kode)** — dokumen ini acuan sebelum scaffolding.
>
> **Konteks tim:** 3 orang (FE · BE · PM), metode **Agile**. Scope MVP masih bisa
> berubah/bertambah → arsitektur sengaja dibuat **ramping dulu, naik kelas saat perlu.**

---

## 1. Tech Stack Final

| Layer | Teknologi | Alasan |
|---|---|---|
| **Monorepo** | pnpm workspaces + **Turborepo** | 1 repo, share types antara FE & BE, build cepat |
| **Frontend** | **Next.js 15 (App Router)** + TypeScript | SSR untuk portal publik tenant (SEO katalog) |
| **UI** | TailwindCSS + **shadcn/ui** + lucide-react | Cepat, konsisten, white-label friendly (theming per tenant) |
| **State/Data FE** | TanStack Query + Zustand | Server-state cache + client-state ringan |
| **Backend** | **NestJS** (modular, DI) | Struktur paling pas untuk Clean/Hexagonal Architecture |
| **Real-time** | **Socket.IO** (gateway NestJS) | Live GPS kurir → pembeli |
| **Database** | **PostgreSQL** | Relasional, cocok multi-tenant + append-only timeline |
| **ORM** | **Prisma** | Type-safe, migrations, cocok dengan TS monorepo |
| **Auth** | JWT (tenant admin) — kurir & pembeli-scan **tanpa login** | Sesuai use-case dokumen |
| **Map** | **Leaflet + OpenStreetMap** (gratis) / opsi Mapbox | Live tracking |
| **QR Code** | `qrcode` (generate) + `html5-qrcode` (scan di browser kurir) | Bulk generate + scan tanpa app native |
| **Validation** | Zod (shared) + class-validator (Nest DTO) | Validasi konsisten FE/BE |
| **Payment** | **Mock service** (klik bayar → langsung `PAID`) | Sesuai permintaan (belum integrasi real) |
| **Deploy (nanti)** | FE: Vercel · BE+DB: Railway/Render/VPS | — |

---

## 2. Struktur Monorepo

```
agro-os/
├── apps/
│   ├── web/                  # Next.js — portal tenant admin + portal publik pembeli
│   └── api/                  # NestJS — REST + WebSocket gateway
├── packages/
│   ├── shared/               # Types, Zod schemas, enums (dipakai FE & BE)
│   ├── ui/                   # Komponen shadcn/ui reusable (opsional)
│   └── config/               # eslint, tsconfig, tailwind preset bersama
├── docs/
│   └── ARCHITECTURE_PLAN.md  # dokumen ini
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. Clean Architecture — Backend (`apps/api`) — *Pragmatic, bukan dogmatic*

Prinsipnya tetap **Hexagonal / Onion** (dependency mengarah ke dalam, domain tidak tahu soal DB/HTTP),
tapi untuk tim agile kecil kita **mulai ramping** dan **naik ke 4 layer penuh hanya saat modul benar-benar kompleks**.
Refactor ke arah clean architecture itu murah asal boundary-nya sudah benar sejak awal.

### 3a. Bentuk DEFAULT (ramping) — dipakai untuk mayoritas modul

```
apps/api/src/
├── modules/
│   ├── tenant/               # Perusahaan penyewa OS (white-label)
│   ├── catalog/              # Produk komoditas
│   ├── timeline/             # Linimasa produksi (IMMUTABLE / append-only)
│   ├── order/                # PO, progress tracker, pembayaran mock
│   ├── shipment/             # Box, QR code, kurir, live tracking
│   └── auth/                 # JWT tenant admin
│
│   └── <module>/             # bentuk ramping default:
│       ├── order.domain.ts       # entity + aturan bisnis (murni TS)
│       ├── order.service.ts      # use-cases (CreatePO, ...)
│       ├── order.repository.ts   # interface + impl Prisma (pisah kalau sudah ramai)
│       ├── order.controller.ts   # REST
│       └── order.dto.ts          # DTO + validasi
├── shared/                   # exceptions, guards, interceptors
├── prisma/                   # schema.prisma + migrations
└── main.ts
```

### 3b. Bentuk PENUH (4 layer) — hanya saat modul kompleks (mis. `shipment`)

Kalau sebuah modul mulai ribet (banyak use-case, banyak adapter — contoh: `shipment` = QR + GPS + tracking),
**baru** pecah ke Hexagonal penuh:

```
modules/shipment/
├── domain/              # entities, value-objects (GpsCoordinate, QrToken), interface repository
├── application/         # use-cases (ScanQr, RecordGpsPing, ...) + dto
├── infrastructure/      # Prisma repo impl + services (QrGenerator, GpsGateway)
└── presentation/        # http/ (controller) + ws/ (socket gateway)
```

**Aturan emas (berlaku di kedua bentuk):**
- `domain`/logika bisnis **tidak boleh** import Prisma / NestJS / Express.
- Akses DB hanya lewat **interface repository** yang diimplementasi di layer infrastructure.
- **Immutable timeline**: `TimelineEntry` hanya punya use-case `AppendTimelineEntry` — **tidak ada** `UpdateTimelineEntry` / `DeleteTimelineEntry`. DB pakai kolom `created_at` + tanpa endpoint edit. (Opsional: koreksi via row baru berstatus `CORRECTION`, bukan mengubah row lama.)

> **Pedoman naik-kelas:** mulai dari 3a. Pindah ke 3b **hanya** jika satu modul sudah punya
> >5 use-case ATAU >1 adapter eksternal. Jangan pecah preventif — itu boilerplate sia-sia untuk MVP.

---

## 4. Struktur Frontend (`apps/web`)

```
apps/web/src/
├── app/
│   ├── (tenant)/             # Dashboard perusahaan penyewa OS
│   │   ├── dashboard/            # Evaluasi kinerja ekspedisi
│   │   ├── products/            # CRUD katalog + tambah linimasa
│   │   ├── orders/              # Kelola PO masuk, update progress
│   │   └── qr/                  # Bulk generate QR per box
│   ├── (public)/             # Portal publik pembeli (white-label per tenant)
│   │   └── [tenantSlug]/         # agroos.id/pt-sayur
│   │       ├── page.tsx             # Katalog produk tenant
│   │       ├── product/[id]/        # Detail + timeline produksi
│   │       └── orders/              # "Pesanan Saya" + progress + live map
│   ├── scan/[qrToken]/       # Halaman kurir: scan QR → kirim GPS pasif
│   └── api/                  # (kalau ada BFF ringan; utama tetap di NestJS)
├── features/                 # Per-fitur: components + hooks + api-client
│   ├── catalog/
│   ├── orders/
│   ├── timeline/
│   └── live-tracking/           # Leaflet map + socket listener
├── lib/                      # api client, socket client, utils
└── components/ui/            # shadcn/ui
```

---

## 5. Data Model Inti (highlight Prisma)

Fokus pada 3 hal unik: **multi-tenant**, **immutable timeline**, **live tracking**.

```prisma
model Tenant {              // Perusahaan penyewa OS
  id        String  @id @default(cuid())
  slug      String  @unique   // "pt-sayur" → agroos.id/pt-sayur
  name      String
  logoUrl   String?           // white-label
  products  Product[]
}

model Product {
  id        String  @id @default(cuid())
  tenantId  String
  name      String
  unit      String            // skala "box", bukan satuan
  price     Int               // dalam rupiah (integer, hindari float)
  timeline  TimelineEntry[]
}

model TimelineEntry {        // APPEND-ONLY, tak bisa diedit setelah save
  id         String   @id @default(cuid())
  productId  String
  orderId    String?          // bisa spesifik per PO
  label      String           // "Sedang ditanam", "Panen", "Packing"...
  createdAt  DateTime @default(now())
  // sengaja TIDAK ada updatedAt / kolom yang mendorong edit
}

model Order {                // PO — bisa sebelum panen
  id         String   @id @default(cuid())
  buyerName  String
  productId  String
  qty        Int
  status     OrderStatus @default(PENDING_PAYMENT)
  payment    Payment?
  shipment   Shipment?
}

enum OrderStatus { PENDING_PAYMENT PAID IN_PRODUCTION HARVESTED PACKED SHIPPING DELIVERED }

model Payment {              // MOCK — langsung success
  id        String  @id @default(cuid())
  orderId   String  @unique
  status    String  @default("SUCCESS")
  paidAt    DateTime @default(now())
}

model Shipment {
  id         String   @id @default(cuid())
  orderId    String   @unique
  qrToken    String   @unique   // dicetak di box, discan kurir tanpa login
  status     String   @default("READY")
  gpsPings   GpsPing[]
}

model GpsPing {              // live tracking
  id          String   @id @default(cuid())
  shipmentId  String
  lat         Float
  lng         Float
  at          DateTime @default(now())
}
```

---

## 6. Alur End-to-End (ringkas)

1. **Tenant** buat produk + tambah entri linimasa (immutable saat save).
2. **Pembeli** buka `agroos.id/[slug]` → lihat katalog + timeline → buat **PO** (walau belum panen).
3. **Pembeli** klik "Bayar Sekarang" → `PaymentMock` set `SUCCESS` → redirect ke **Pesanan Saya**.
4. **Tenant** update linimasa seiring progress (Tanam → Panen → Packing). Pembeli lihat progress real-time.
5. Saat **Packed**: tenant **bulk generate QR** → cetak → tempel di box.
6. **Kurir** scan QR → buka `/scan/[qrToken]` → browser kirim **GPS pasif** via Socket.IO.
7. **Pembeli** di "Pesanan Saya" lihat **live map** posisi kurir (Leaflet + socket).

---

## 7. Strategi Branch Git (Trunk-Based — cocok tim kecil)

Untuk 3 orang, `main` + `develop` + 10 long-lived branch itu **kelebihan** dan bikin konflik merge.
Kita pakai **trunk-based**: satu batang `main` yang selalu deploy-able, dengan feature branch **pendek** (< 2–3 hari).

```
main                    → selalu deploy-able (protected, merge HANYA via PR)
├── feat/monorepo-setup     # branch pendek, langsung PR ke main
├── feat/catalog
├── feat/order-po
├── fix/timeline-validation
└── ...                     # branch mati setelah di-merge, jangan dibiarkan hidup lama
```

**Kenapa buang `develop`?** Di tim kecil, branch yang hidup berminggu-minggu = neraka konflik.
Merge sering & kecil jauh lebih aman. Rilis cukup ditandai **git tag** (`v0.1.0`) di `main`.

**Konvensi:**
- Branch: `feat/…`, `fix/…`, `chore/…`, `docs/…` — **umur pendek**, hapus setelah merge.
- Commit: **Conventional Commits** (`feat:`, `fix:`, `chore:`) → enak untuk changelog otomatis.
- PR: semua branch → **`main`**, wajib **1 reviewer** (BE review FE, FE review BE; PM cek fungsional).
- **Branch protection** di `main`: wajib PR + minimal 1 approval + CI hijau. Direct push dilarang.
- Rilis: `git tag vX.Y.Z` di `main` (tidak perlu branch `develop`/`release`).

> Urutan pengerjaan **tidak lagi per-modul**, tapi **per vertical slice / sprint** — lihat §10.

---

## 8. CI/CD & Deployment (rencana, `.github/workflows/`)

- `ci.yml`: lint + type-check + build (turbo) di setiap PR.
- **Deploy (2 target, sengaja):**
  - **FE** (`apps/web`) → **Vercel** (SSR portal publik, gratis, otomatis dari git).
  - **BE** (`apps/api`) → **Railway / Render / VPS** — server long-running.

> **Kenapa BE tidak ikut Vercel?** Vercel serverless tidak bisa menjalankan server nonstop
> (`node main.js`) maupun memegang **koneksi WebSocket Socket.IO** yang selalu terbuka untuk
> live GPS kurir. Karena itu NestJS + Socket.IO wajib di host yang mendukung proses long-running.
> Ini keputusan sadar demi kontrol penuh atas realtime — konsekuensinya ada 2 target deploy.

---

## 9. Langkah Selanjutnya (setelah dokumen ini di-ACC)

1. Init monorepo (pnpm + turborepo) di branch `feat/monorepo-setup`.
2. Scaffold `apps/web` (Next.js) & `apps/api` (NestJS) + `packages/shared`.
3. Buat `prisma/schema.prisma` sesuai §5, jalankan migration awal.
4. Set **branch protection `main`** di GitHub + siapkan PR/issue template & GitHub Projects (board).
5. Mulai implementasi **per vertical slice / sprint** sesuai §10 (bukan per-modul).

---

## 10. Agile Working Model (tim 3: FE · BE · PM)

### 10a. Prinsip: kerja per **vertical slice**, bukan per layer
Tiap sprint hasilkan **1 fitur utuh yang bisa didemo** (FE↔BE↔DB nyambung), bukan "BE bikin semua API dulu".
Fitur berisiko/tak pasti (timeline, live-map) ditaruh **belakang** setelah fondasi stabil.

| Sprint | Vertical slice (target demo) | Cakupan |
|---|---|---|
| **0** | Setup | Monorepo, CI, prisma schema, branch protection, board |
| **1** | **Walking skeleton** | Login tenant → tambah 1 produk → pembeli lihat katalog publik |
| **2** | PO + bayar | Buat PO (sebelum panen) → mock payment `SUCCESS` → "Pesanan Saya" |
| **3** | Timeline + progress | Tenant append linimasa (immutable) → pembeli lihat progress |
| **4** | QR + kurir | Bulk generate QR → cetak → kurir scan `/scan/[token]` |
| **5** | Live tracking | Socket GPS ping → Leaflet live map di "Pesanan Saya" |
| **6+** | Polish / fitur baru | Dashboard evaluasi ekspedisi, white-label theming, dst (dari backlog) |

> Scope bisa bertambah — fitur baru **masuk backlog dulu** (dikelola PM), bukan langsung dikerjakan.

### 10b. Contract-first — kunci FE & BE jalan paralel
Tiap awal fitur, **definisikan kontrak API di `packages/shared` DULUAN** (types + Zod schema).
- FE langsung kerja pakai **mock** dari types itu — tidak perlu nunggu API BE jadi.
- Kalau kontrak berubah (pasti, namanya agile) → TypeScript teriak di FE **dan** BE. Tidak ada miskomunikasi nama field.

### 10c. Pembagian peran
| Role | Fokus |
|---|---|
| **BE** (kamu) | `apps/api` (NestJS), `prisma/`, kontrak di `packages/shared`, socket GPS |
| **FE** | `apps/web` (Next.js), UI shadcn, konsumsi kontrak `packages/shared` |
| **PM** | Backlog (GitHub Projects), prioritas sprint, definisi "done", cek fungsional saat review PR |

### 10d. Ritual ringan (jangan berat)
- **Sprint** 1–2 minggu. Planning singkat di awal, demo + retro di akhir.
- **Daily** cukup async (update singkat di chat / board).
- **Board** GitHub Projects: kolom `Backlog → Todo → In Progress → Review → Done`.
- **Definition of Done:** merged ke `main` + CI hijau + fitur bisa didemo.

### 10e. Yang wajib benar sejak awal (walau agile suka refactor)
- **Timeline immutable** (append-only) — desain benar dari awal supaya data historis tak pernah rusak.
- **Kontrak `packages/shared`** — jadi sumber kebenaran FE↔BE.
- **Harga = integer rupiah** — hindari bug pembulatan float.
