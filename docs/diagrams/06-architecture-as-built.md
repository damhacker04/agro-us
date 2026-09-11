# Arsitektur AgroUs yang terimplementasi — audit 9–11 September 2026

Diagram mengikuti impor, pemanggilan jaringan, repository dan konfigurasi dalam kode. Nama hosting berasal dari README; konfigurasi akun cloud, kapasitas database, backup, dan secret produksi belum diperiksa langsung. API adalah **modular monolith**, bukan 15 microservice yang di-deploy sendiri-sendiri. Tidak ditemukan API gateway terpisah, message broker, Redis, atau sistem antrean persisten dalam implementasi runtime.

```mermaid
flowchart LR
  buyer["Pembeli: restoran, cafe, distributor"]
  tenant["Tenant: petani atau pengelola lahan"]
  courier["Kurir: QR dan PIN tanpa akun"]
  operator["Operator internal"]

  subgraph frontend ["apps/web - satu aplikasi Next.js 16 / React 19; Vercel menurut README"]
    web["Halaman publik dan dashboard per peran"]
    client["lib/api.ts: REST dan polling; lib/auth.ts + keranjang.ts: localStorage"]
  end

  subgraph backend ["apps/api - satu proses NestJS; Render menurut README"]
    http["Controller REST, DTO ValidationPipe, JWT dan RolesGuard"]
    domain["Service: tenant, catalog, order, assurance, timeline, quality, logistics, subscription, intelligence, operator"]
    ws["Socket.IO: tracking dan notifications; otorisasi room belum ada"]
    cron["JobsService: pembayaran kedaluwarsa, auto-terima, settlement, anchor, penalti"]
    prisma["PrismaService dan SQL PostGIS"]
    storage["StorageService: adapter lokal atau S3"]
  end

  subgraph data ["Penyimpanan"]
    db[("PostgreSQL + PostGIS; 30 model, trigger integritas dan materialized view")]
    blobs[("S3-compatible / Cloudflare R2; disk lokal sebagai fallback")]
  end

  subgraph satellite ["apps/satellite-worker - Python; job terpisah"]
    schedule["GitHub Actions: harian 02.00 WIB; perlu DATABASE_URL"]
    worker["main + repository + STAC provider + NDVI/NDMI + detektor fenologi berbasis aturan"]
  end

  scenes["Earth Search STAC / Sentinel-2 L2A COG"]
  payments["Payment, refund, disbursement mitra: belum terintegrasi"]
  messages["SMS / WhatsApp nyata: belum terintegrasi; ConsoleSmsService"]
  anchor["Jangkar hash eksternal write-once: belum terintegrasi"]

  buyer --> web
  tenant --> web
  courier --> web
  operator --> web
  web --> client
  client -->|"HTTP dan Bearer JWT"| http
  http --> domain
  cron --> domain
  domain --> prisma
  domain --> storage
  domain -->|"event"| ws
  prisma --> db
  storage --> blobs
  schedule --> worker
  worker -->|"ambil citra"| scenes
  worker -->|"baca batch, tulis observasi dan verdict"| db
  domain -.->|"simulasi / belum tersedia"| payments
  domain -.->|"saat ini log console"| messages
  cron -.->|"externalRef masih null"| anchor
```

Garis putus-putus menunjukkan integrasi yang belum selesai. Server WebSocket ada, tetapi halaman pembeli yang diperiksa memakai REST polling; diagram sengaja tidak menggambar client WebSocket aktif. Worker langsung membaca/menulis database yang sama, sehingga perubahan status/baseline harus diselaraskan dengan API dan migration.

## Alur data utama

```mermaid
flowchart TD
  registration["OTP menjadi JWT dan User"] --> profile["Profil Tenant / Buyer; routing akun baru masih terputus"]
  profile --> listing["Legalitas, lahan, produk, batch dan kuota PO"]
  listing --> order["Buyer: katalog, keranjang, checkout dan reservasi kuota"]
  order --> invoice["Invoice simulasi; webhook HMAC atau pelunasan demo"]
  invoice --> hold["PAID dan ledger HOLD; race callback belum aman"]
  hold --> cultivation["Timeline foto, EXIF, GPS dan hash; verifikasi satelit asinkron"]
  cultivation --> preview["Preview kewajaran dan alokasi sebelum konfirmasi panen"]
  preview --> harvest["PANEN / GAGAL_PANEN dan alokasi senioritas + FIFO"]
  harvest --> shortfall{"Ada kekurangan?"}
  shortfall -->|"Ya"| assurance["Substitusi / refund / parsial; jadwal ulang belum memindahkan alokasi"]
  shortfall -->|"Tidak / porsi terpenuhi"| delivery["QR per box + PIN; kurir melaporkan GPS"]
  assurance -->|"barang dialokasikan"| delivery
  delivery --> receipt["Penerimaan pembeli; auto-terima 60 menit setelah TIBA_DI_LOKASI / geofence"]
  receipt --> claims["Jendela klaim dan keputusan mutu"]
  claims --> settlement["Status SELESAI; RELEASE bila sisa dana > 0; transfer mitra masih PENDING"]
```

## Sumber dan keputusan penting

- `apps/api/src/app.module.ts` dan `src/modules/*/*.module.ts`: satu aplikasi dengan dependency injection antar-modul.
- `apps/api/src/main.ts`: raw body webhook, validasi global, CORS dan file serving. `health.controller.ts` hanya liveness, tidak menguji kesiapan database/storage.
- `apps/api/src/prisma/prisma.service.ts`: PrismaPg dengan koneksi lazy; keberhasilan `/health` tidak membuktikan query database berhasil.
- `apps/api/src/modules/storage/storage.module.ts`: konfigurasi S3 separuh lengkap menggagalkan startup; tidak ada kredensial sama sekali kembali ke disk lokal dengan warning.
- `apps/api/src/modules/jobs/jobs.service.ts`: cron dalam proses API dengan lock di memori; kebutuhan koordinasi antar-replika belum diselesaikan secara terpusat.
- `apps/api/src/modules/timeline/anchor.service.ts`: hash root disimpan internal; `externalRef` dan `publishedAt` null.
- `apps/web/src/lib/api.ts`: default origin menuju API demo Render bila environment frontend tidak diisi. Ini perlu diganti dengan konfigurasi eksplisit untuk menghindari dev menyentuh demo/produksi.
- `apps/satellite-worker/src/main.py`, `repository.py`, `stac_provider.py` serta `.github/workflows/satellite-verify.yml`: sumber Earth Search dan penjadwalan terpisah. Secret cloud aktual belum diverifikasi.

Rencana di `ARCHITECTURE_PLAN.md` masih berguna sebagai tujuan, tetapi menyebut Next.js 15, Mapbox, shadcn dan lapisan repository/domain backend yang belum sama dengan kode sekarang. Perbarui dokumen berdasarkan keputusan akhir; tidak perlu menambah microservice hanya agar terlihat lebih canggih.
