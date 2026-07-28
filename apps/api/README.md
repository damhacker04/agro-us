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

---

## Modul Auth OTP (FR-1.3) — `feat/auth-otp`

Endpoint (base `http://localhost:3001`):

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/auth/otp/request` | — | Kirim OTP 6 digit (TTL 5 mnt, cooldown kirim ulang 60 dtk) |
| `POST` | `/auth/otp/verify` | — | Verifikasi → JWT (exp 7 hari). Nomor baru wajib sertakan `role` |
| `GET` | `/auth/me` | Bearer JWT | Profil user + relasi tenant/buyer |

**Kode error** (dipakai FE untuk menentukan layar — lihat PAGE_INVENTORY SH-03 & ER-19):

| Kode | HTTP | Arti |
|---|---|---|
| `OTP_COOLDOWN` | 429 | Kirim ulang terlalu cepat; ada `retryAfterSec` |
| `OTP_WRONG` | 401 | Kode salah; ada `remainingAttempts` |
| `OTP_LOCKED` | 400 | Salah 3× — wajib minta kode baru |
| `OTP_EXPIRED` | 400 | Kedaluwarsa / sudah terpakai |
| `ROLE_REQUIRED` | 400 | Nomor belum terdaftar → FE tampilkan pilihan TENANT/BUYER |

**Keamanan yang sudah diterapkan:**
- Kode OTP **tidak pernah disimpan plaintext** — `sha256(OTP_PEPPER \| phone \| kode)`.
- Kode dibuat dengan `crypto.randomInt` (CSPRNG), bukan `Math.random`.
- Satu kode aktif per nomor; kode lama dihapus saat minta baru.
- Anti double-submit: `updateMany(where consumedAt: null)` — hanya satu request yang menang.
- Nomor dinormalisasi ke `+62` sebelum hash/simpan, jadi `08…`/`62…`/`+62…` diperlakukan sama.

**Provider SMS:** `SmsService` abstract + `ConsoleSmsService` (OTP dicetak ke log).
Ganti binding di `auth.module.ts` saat provider asli (WhatsApp/SMS) siap — lihat FR-10.1.

> Di non-production, response `POST /auth/otp/request` menyertakan field **`devOtp`**
> supaya FE/demo tidak perlu membaca log server. Field ini otomatis hilang saat `NODE_ENV=production`.

### Coba cepat (butuh DB nyala)

```bash
curl -X POST http://localhost:3001/auth/otp/request -H "Content-Type: application/json" -d "{\"phone\":\"081234567890\"}"
```

---

## Modul Tenant Onboarding (FR-1.4 s.d. FR-1.7) — `feat/tenant-onboarding`

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `GET` | `/zones` | — | Daftar zona layanan (dipakai onboarding Tenant & pilih kota Pembeli, FR-2.1) |
| `POST` | `/tenant/profile` | TENANT | Buat profil: nama perusahaan, logo, zona layanan (FR-1.4) |
| `GET` | `/tenant/profile` | TENANT | Profil + zona + jumlah lahan + rasio reputasi |
| `PATCH` | `/tenant/profile` | TENANT | Ubah nama/logo/zona |
| `PUT` | `/tenant/legality` | TENANT | Unggah NIB/KTP → antrean operator (FR-1.7) |
| `POST` | `/tenant/land-plots` | TENANT | Daftarkan poligon lahan (FR-1.5) |
| `GET` | `/tenant/land-plots` | TENANT | Daftar lahan milik sendiri |
| `GET` | `/tenant/land-plots/:id` | TENANT | Detail satu lahan |

### Aturan penting

**Luas lahan TIDAK PERNAH dikirim klien.** Server menghitungnya sendiri dengan
`ST_Area(polygon::geography) / 10000`. Angka ini yang membatasi kuota PO 70% (FR-3.3) —
kalau klien boleh mengirim, Tenant bisa mengarang kapasitas lahannya.

**Tier verifikasi otomatis (FR-1.6):** `areaHa < 0,1` → `TERBATAS` (di bawah resolusi andal
Sentinel-2). Lahan tetap boleh didaftarkan, tapi ditandai apa adanya.

**Validasi poligon** dilakukan PostGIS (`ST_IsValid`), lalu alasannya **diterjemahkan ke bahasa
manusia** — jangan pernah membocorkan teks exception mentah ke Tenant (PRD §9):

| Kode | Pesan ke Tenant |
|---|---|
| `POLYGON_NOT_CLOSED` | Batas lahan belum tersambung. Pastikan titik terakhir kembali ke titik awal. |
| `POLYGON_SELF_INTERSECT` | Garis batas lahan saling berpotongan. Gambar ulang tanpa menyilang. |
| `POLYGON_TOO_FEW_POINTS` | Titik batas terlalu sedikit. Butuh minimal 3 sudut lahan. |
| `POLYGON_INVALID` | Bentuk batas lahan tidak wajar. Silakan gambar ulang. |
| `ZONE_UNKNOWN` | Zona tidak dikenal (mencegah tenant "melayani" zona hantu) |
| `TENANT_EXISTS` / `TENANT_NOT_FOUND` | Guard onboarding ganda / belum onboarding |
| `ROLE_FORBIDDEN` | Peran salah (RolesGuard) |

> **Koordinat GeoJSON adalah `[lng, lat]`, bukan `[lat, lng]`.** Salah urutan → lahan Malang
> mendarat di Samudra Hindia dan luasnya kacau. Mapbox GL JS sudah memakai urutan ini.

### Isolasi data

Semua query lahan difilter `tenant_id` dari JWT — Tenant lain mengakses lahan bukan miliknya
mendapat **404**, bukan 403 (tidak membocorkan keberadaan resource).

---

## Modul Katalog & Kuota PO (FR-2.1, 2.2, 2.5, 2.6, 3.2, 3.3, 3.4) — `feat/catalog-crosstenant`

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `GET` | `/commodities` | — | Daftar komoditas + rendemen + standar grade |
| `POST/GET/PATCH` | `/tenant/products[/:id]` | TENANT | Kelola katalog produk (FR-3.2) |
| `GET` | `/tenant/land-plots/:id/capacity` | TENANT | **Pratinjau batas kuota** sebelum Tenant mengetik (layar TN-16) |
| `POST` | `/tenant/products/:id/batches` | TENANT | Buka kuota PO (FR-3.3, FR-3.4) |
| `GET` | `/tenant/batches[/:id]` | TENANT | Batch milik sendiri |
| `GET` | `/catalog?zoneId=…` | — | **Katalog terpadu lintas-Tenant** (FR-2.2) |
| `GET` | `/catalog/:batchId` | — | Detail produk pembeli (BY-03) |

### Rumus batas kuota (FR-3.3)

```
maxQuotaBox = floor( areaHa × avgYieldKgPerHa ÷ qtyKgPerBox × quotaMultiplier )
```

Contoh nyata: `0,6 ha × 7.000 kg/ha × 0,70 ÷ 10 kg = 294 box`.

`quotaMultiplier` merangkap **dua peran**: bantalan 70% terhadap gagal panen (Risiko 2)
sekaligus penalti shortfall yang menurunkannya ke 0,50 (FR-7.12). Tidak perlu konstanta terpisah.

`areaHa` berasal dari hasil ukur PostGIS, **bukan angka kiriman Tenant** — lihat catatan di modul
tenant onboarding.

### Satu lahan, satu batch aktif

Batch berstatus `PLANNING`/`GROWING` **mengunci** poligonnya. Tanpa aturan ini Tenant bisa
membuka 10 batch di atas lahan 1 ha yang sama dan menjual 10× kapasitas — pembatas 70% jadi
tidak ada artinya. Ingin menanam beberapa komoditas sekaligus? Petakan poligon terpisah (FR-1.5).

### Badge verifikasi (FR-2.6) & transparansi (FR-4.6)

| `verificationStatus` (mentah) | `badge` yang tampil |
|---|---|
| `TERVERIFIKASI` | `TERVERIFIKASI_SATELIT` |
| `FOTO_SAJA` | `BUKTI_FOTO_SAJA` |
| `PERLU_DITINJAU` · `TIDAK_DAPAT` · `TIDAK_SESUAI` | `BELUM_TERVERIFIKASI` |

Respons **selalu mengirim keduanya**. Badge menyederhanakan untuk daftar katalog, sementara
`verificationStatus` mentah memungkinkan FE menampilkan ketidaksesuaian secara terbuka —
PRD §5.4.2 FR-4.6 mewajibkan ketidaksesuaian ditampilkan, bukan disembunyikan.
Endpoint detail juga mengirim `detectedPlantDate`/`detectedHarvestDate` agar FE bisa
menyandingkan klaim Tenant dengan hasil satelit.

### Kode error

| Kode | Arti |
|---|---|
| `QUOTA_EXCEEDS_CAPACITY` | Kuota > kapasitas lahan; menyertakan `maxQuotaBox` + rincian perhitungan |
| `LAND_PLOT_BUSY` | Lahan masih dipakai batch aktif; menyertakan `blockingBatchId` |
| `DATE_ORDER_INVALID` | Tanggal panen tidak setelah tanggal tanam |
| `COMMODITY_UNKNOWN` / `ZONE_UNKNOWN` | Referensi tidak dikenal |

> `/catalog` **sengaja tanpa guard** — pembeli boleh menelusuri sebelum login (seperti marketplace
> umum). `zoneId` wajib karena FR-2.1 mengharuskan pilih kota layanan lebih dulu.

---

## Modul Keranjang · Checkout · Escrow (Fase 2) — `feat/cart-checkout-escrow`

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `POST/GET/PATCH` | `/buyer/profile` | BUYER | Profil pembeli + kota layanan (FR-2.1) |
| `POST` | `/orders/preview` | BUYER | Hitung Rencana Pengiriman + cek minimum, **tanpa menyimpan** (BY-05) |
| `POST` | `/orders/checkout` | BUYER | Reservasi kuota + terbitkan tagihan (FR-2.3, 2.4, 2.7, 2.8) |
| `GET` | `/orders` | BUYER | Pesanan Saya (BY-09) |
| `POST` | `/payments/webhook` | — | Callback gateway → escrow HOLD (FR-7.1) |
| `POST` | `/payments/expire-stale` | — | Lepas reservasi kuota kedaluwarsa (activity A5) — **target cron** |

### Keranjang tidak disimpan di server

Keranjang hidup di sisi klien; server hanya menerima `lines[]`. Alasannya `ORDER_ITEMS.shipment_id`
bersifat NOT NULL — sedangkan rencana pengiriman baru terbentuk saat checkout. Order tercipta
pertama kali justru pada saat checkout, bukan saat "tambah ke keranjang".

### Rencana Pengiriman dikelompokkan per MINGGU panen (FR-2.4)

Batch yang panen di minggu berbeda mustahil dikirim bersamaan. Pengelompokan memakai minggu
(bukan tanggal persis) supaya konsolidasi maksimal — sejalan dengan `demand_aggregates` yang
juga memakai `date_trunc('week', …)`. `readyDate` = tanggal panen **terlambat** dalam grup.

### Minimum order dicek PER RENCANA, bukan per order

Ongkir timbul per pengiriman. Kalau minimum dicek dari total order, pesanan Rp3jt yang pecah
jadi 3 pengiriman @Rp1jt tetap lolos padahal tiap pengirimannya merugi (Risiko 3, PRD §8.2:
marjin negatif di bawah Rp2,2jt). Error `MIN_ORDER_NOT_MET` menyebutkan rencana mana yang kurang.

### Reservasi kuota bersifat atomik

```sql
UPDATE batches SET quota_box_sold = quota_box_sold + $qty
WHERE id = $id AND quota_box_sold + $qty <= quota_box_total
```

Syarat kapasitas ikut di `WHERE`, sehingga dua pembeli yang checkout **bersamaan** tidak bisa
sama-sama menang; yang kalah menerima `QUOTA_RACE_LOST`. CHECK di level DB jadi jaring pengaman
terakhir. *Teruji: 2 checkout paralel @200 box atas stok 230 → tepat 1 berhasil, sisa 30 (tidak minus).*

### Escrow

Saat webhook `PAID`: order → `PAID`, lalu **satu entri `HOLD` per Tenant** (order lintas-Tenant
punya beberapa penerima pencairan). Ongkir dan biaya laporan **tidak** masuk escrow Tenant —
itu porsi platform. Ledger append-only; koreksi = entri baru.

Webhook bersifat **idempoten** (gateway lazim mengirim callback berulang).

### ⚠️ Yang masih simulasi — WAJIB diganti sebelum produksi

1. **Payment gateway.** Payload QRIS/VA/E-Wallet dibuat lokal; `POST /payments/webhook`
   **belum memverifikasi signature**. Tanpa itu siapa pun bisa menandai tagihan LUNAS.
2. **Escrow.** Yang ada baru pembukuan internal. Penahanan dana sesungguhnya wajib memakai
   fitur escrow mitra berizin — dana tidak boleh mampir ke rekening operasional AgroUs
   (FR-7.1, kepatuhan §5.7.1).
3. **Ongkir** `SHIPPING_COST_PER_PLAN` = Rp85.000 flat (PRD §8.2). Ganti dengan rate card nyata.
4. **`expire-stale`** belum dijadwalkan — pasang cron harian, jangan hanya mengandalkan
   pemanggilan lazy saat checkout.

---

## Modul Verified Timeline (FR-4.1 s.d. 4.9, §5.4, §6.1) — `feat/verified-timeline`

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `POST` | `/tenant/batches/:batchId/timeline` | TENANT | **Tambah node** (multipart + foto). Satu-satunya cara menulis |
| `GET` | `/tenant/batches/:batchId/timeline` | TENANT | Timeline milik sendiri |
| `GET` | `/batches/:batchId/timeline` | — | **Publik** — Verified Timeline yang dilihat pembeli (BY-03a) |
| `GET` | `/batches/:batchId/timeline/verify` | — | **Hitung ulang rantai** + bandingkan dgn jangkar |
| `GET` | `/batches/:batchId/anchors` | — | Riwayat root hash harian |
| `POST` | `/anchors/run` | — | Hitung & simpan jangkar harian — **target cron** |

**Tidak ada endpoint UPDATE/DELETE — sesuai FR-4.1.** Koreksi memakai node `Ralat` (FR-4.2);
node asli tetap tampil.

### Rantai hash

```
nodeHash = SHA-256( batchId|seq|activityType|description|lng|lat|deviceTs|photoHashes|ralatOf + "|" + prevHash )
rootHash = SHA-256( gabungan seluruh nodeHash terurut )
```

SHA-256 tiap foto **ikut di-hash**, sehingga foto bukti tidak bisa ditukar tanpa memutus rantai.
Format kanonik (`hash.util.ts`) **wajib stabil selamanya** — mengubahnya membatalkan seluruh
rantai tersimpan.

> ⚠️ **Pelajaran desain:** `verifyChain` menghitung root dari hash **hasil hitung ulang**,
> bukan dari kolom `node_hash`. Versi pertama memakai nilai tersimpan — akibatnya penyerang
> yang mengubah isi baris tapi membiarkan kolom hash menghasilkan root yang **sama**, sehingga
> jangkar eksternal terlihat cocok padahal data sudah dipalsukan. Jangan dikembalikan.

### Terbukti tamper-evident

Diuji dengan mematikan trigger lalu mengubah `description` node seq 1 langsung lewat SQL
(mensimulasikan orang dalam ber-superuser, skenario yang diakui PRD §6.1):

| | Sebelum dipalsukan | Setelah dipalsukan |
|---|---|---|
| `intact` | `true` | **`false`** |
| `matchesAnchor` | `true` | **`false`** |
| node rusak | 0 | **9** (efek beruntun seq 1→5) |

Satu perubahan merusak seluruh node sesudahnya — persis sifat yang dijanjikan §6.1.

### Aturan yang ditegakkan

| Kode | Aturan |
|---|---|
| `PHOTO_REQUIRED` | Minimal 1 foto bukti (§5.4.1) |
| `GPS_OUTSIDE_POLYGON` | GPS di luar poligon → wajib alasan tertulis, **ditampilkan ke pembeli** (FR-4.3) |
| `HARVEST_WITHOUT_PLANTING` | PANEN wajib didahului node PENANAMAN (FR-4.8) |
| `HARVEST_TOO_EARLY` | Jarak tanam→panen < `commodities.growing_days_min` (FR-4.8) |
| `RALAT_TARGET_INVALID` | Node ralat menunjuk node yang tidak ada |
| `BATCH_CLOSED` | Batch sudah HARVESTED/FAILED → timeline ditutup |

`captureSource` `GALLERY` disimpan apa adanya — menurunkan tingkat kepercayaan node (§5.4.1).
EXIF diekstrak server-side dari buffer **asli sebelum kompresi** (§6.4); foto tanpa EXIF tetap
diterima tapi tercatat kosong (itu sendiri informasi).

### ⚠️ Belum selesai

1. **`externalRef` masih null** — publikasi root hash ke penyimpanan write-once eksternal
   BELUM terpasang. Tanpa itu jangkar baru catatan internal, dan klaim §6.1 belum bisa
   dipertahankan pada pemeriksaan teknis. Kandidat: OpenTimestamps / S3 Object Lock.
2. **Storage masih disk lokal** — ephemeral, hilang tiap redeploy. Ganti ke S3/R2/GCS
   (antarmuka `StorageService` sudah disiapkan untuk itu).
3. **`/anchors/run` belum dijadwalkan** — pasang cron harian.
4. **`growing_days_min` di seed masih INDIKATIF** — validasi ke penyuluh sebelum produksi.
5. **Alokasi FIFO panen sebagian** (FR-7.9/7.10) belum ada di sini — node `PANEN` baru
   mencatat `quotaBoxFulfilled`; pembagian ke pesanan menyusul di `feat/harvest-assurance`.

---

## Modul Logistik Zero-Install & Dual-Signal PoD (Fase 4) — `feat/logistics-tracking-pod`

| Method | Route | Guard | Fungsi |
|---|---|---|---|
| `POST` | `/tenant/shipments/:id/qr` | TENANT | Terbitkan QR per box + Kode Antar (FR-3.6, FR-6.1) |
| `GET` | `/tenant/shipments/:id/qr` | TENANT | Lembar cetak ulang — **tanpa** Kode Antar |
| `POST` | `/tenant/shipments/:id/courier-code/reissue` | TENANT | Kode baru setelah terkunci (FR-6.3) |
| `GET` | `/scan/:token` | — | Halaman pertama kurir. **Tidak mengonsumsi token** |
| `POST` | `/scan/:token/verify` | — | Verifikasi Kode Antar → sesi aktif, status Dikirim |
| `POST` | `/scan/session/:id/position` | — | Kirim posisi tiap 10 detik |
| `POST` | `/scan/session/:id/no-gps` | — | Izin lokasi ditolak → mode tanpa peta |
| `POST` | `/shipments/:id/receive` | BUYER | **Sinyal-2** PoD: 1 ketuk + foto |
| `GET` | `/shipments/:id/track` | — | Data peta pembeli (BY-10a) |
| `POST` | `/logistics/jobs/auto-accept` | — | Fallback 60 menit — **cron** |
| `POST` | `/logistics/jobs/close-claim-windows` | — | Jendela klaim habis → Selesai — **cron** |

WebSocket: namespace `/tracking`, room per pengiriman. Event `shipment:position` &
`shipment:status` (nama event ada di `WS_EVENTS` pada `@agro-os/shared`).

### Token QR baru terpakai SETELAH kode benar (FR-6.2)

Ini inti perubahan v2.1. `GET /scan/:token` sengaja **tidak** mengonsumsi apa pun —
pemindaian iseng oleh orang lewat tidak boleh menghanguskan QR sebelum kurir tiba.
Token ditandai `consumed_at` hanya di dalam transaksi verifikasi kode.

Kode Antar disimpan **hash** (`COURIER_PIN_PEPPER`), maksimal 5 percobaan lalu terkunci.
Menerbitkan ulang kode **tidak membatalkan QR yang sudah tercetak** — Tenant tidak perlu
menempel ulang seluruh box.

### Anti-spoof: pembanding adalah posisi WAJAR terakhir

Kewajaran dihitung terhadap posisi wajar terakhir, **bukan** posisi terakhir apa pun.

> Versi pertama memakai posisi terakhir apa pun. Akibatnya satu bacaan buruk meracuni
> seluruh rantai sesudahnya: posisi asli berikutnya ikut dinilai "melompat" dari titik
> palsu itu, sehingga **geofence tidak pernah menyala walau kurir sudah sampai**.
> Ini bukan sekadar kasus serangan — gangguan GPS biasa (terowongan, pantulan gedung)
> menghasilkan lompatan serupa. Terbukti saat uji: lompat ke Jakarta lalu kembali ke
> tujuan; sebelum diperbaiki `arrived` tetap `false` di jarak 8 m.

Posisi tidak wajar **tetap disimpan** (`is_plausible = false`) — jejaknya justru bukti
saat sengketa. Yang ditolak hanyalah perannya sebagai pemicu geofence dan sebagai pembanding.

### Dual-Signal PoD (§5.6.4)

| Sinyal | Membuktikan |
|---|---|
| 1 — geofence 100 m | kargo tiba **di lokasi** |
| 2 — konfirmasi pembeli + foto | **siapa** menerima, **kapan**, **kondisi apa** |

Geofence hanya mengubah status & memicu notifikasi; ia **tidak** menyelesaikan transaksi.
Beban konfirmasi ada di pembeli karena dialah yang punya insentif — konfirmasi itu yang
membuka jendela klaim mutunya.

**Fallback:** tak ada respons 60 menit → `AUTO_60MIN`, dan jendela klaim **diperpanjang
jadi 24 jam** sebagai kompensasi (pembeli kehilangan kesempatan memeriksa saat serah terima).

### Notifikasi bertahap (FR-10.2)

`DIKIRIM` → `MENDEKAT` (±1 km) → `TIBA_DI_LOKASI` (100 m). **Jam 60 menit baru mulai di
tahap terakhir**, sehingga pembeli sudah bersiap sebelum hitungan berjalan.

### ⚠️ Belum selesai

1. **Room WebSocket belum diautentikasi** — siapa pun yang tahu `shipmentId` bisa ikut
   memantau. ID-nya UUID acak, tetapi sebelum produksi perlu verifikasi JWT saat handshake.
2. **Dua job cron belum dijadwalkan** (`auto-accept`, `close-claim-windows`). Tanpa itu
   fallback 60 menit tidak pernah jalan dan pesanan tidak pernah berstatus Selesai.
3. **Foto PoD masih berupa URL** — unggahan berkas memakai `StorageService` seperti
   bukti timeline belum disambungkan.
4. **Pencairan escrow saat Selesai** belum disambungkan (menyusul di modul klaim mutu).
