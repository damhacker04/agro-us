# AgroUs

B2B Agro-Logistics **PWA** — supply chain berbasis permintaan yang *terverifikasi*.
Bukan sekadar marketplace: **permintaan pembeli menentukan apa yang ditanam** (pull, bukan push),
dan setiap klaim budidaya diverifikasi independen dengan citra satelit.

> **Tagline:** *Kami tidak percaya klaim petani. Kami memverifikasinya.*
>
> 📄 PRD lengkap: [`docs/PRD.md`](docs/PRD.md) · 🏗️ Arsitektur: [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md)
> · 📊 Diagram: [`docs/diagrams/`](docs/diagrams)

---

# 🔎 Panduan Demo untuk Juri

**Aplikasi: https://agro-us.vercel.app** — tidak perlu instal apa pun, buka di peramban mana saja.

## Cara masuk

Tidak ada kata sandi. Autentikasi memakai **nomor telepon + kode OTP**, karena penggunanya
petani dan pemilik warung yang lebih terbiasa menerima kode lewat pesan daripada mengingat
kata sandi.

1. Buka https://agro-us.vercel.app
2. Pilih peran, masukkan salah satu nomor di bawah
3. **Kodenya terisi otomatis** — tekan **Masuk**

> Kode terisi sendiri karena mode peragaan aktif (`DEMO_EXPOSE_OTP`). Di layanan sungguhan
> kode hanya dikirim lewat WhatsApp/SMS dan tidak pernah ikut di respons API.

## Akun demo

| Peran | Nomor | Nama | Untuk melihat |
| --- | --- | --- | --- |
| **Tenant** | `081100000101` | Tani Makmur Pujon | Paling lengkap — batch, timeline, escrow, pesanan masuk |
| Tenant | `081100000102` | Kebun Lestari Batu | Tenant pengganti pada skenario substitusi |
| Tenant | `081100000103` | Gapoktan Ngantang Sejahtera | Tenant dengan satu komoditas |
| Tenant | `081100000104` | Tani Muda Wajak | Baru daftar, **menunggu verifikasi legalitas** |
| **Pembeli** | `081100000201` | Katering Sehat Nusantara | Punya pesanan yang masih menunggu panen |
| Pembeli | `081100000202` | Resto Padi Emas | Punya pesanan yang sedang **dikirim** |
| Pembeli | `081100000203` | Dapur Kolektif Batu | Pembeli baru, keranjang kosong |
| **Operator** | `081100000030` | — | Konsol tinjauan: klaim, legalitas, satelit, escrow |

Kurir **tidak punya akun** — itu memang rancangannya (§5.6.2). Kurir cukup memindai QR di box.

---

## Lima fitur inti dan cara mencobanya

### 1. Verified Timeline — bukti yang bisa diaudit sendiri

> Inilah pembeda utama produk ini. Riwayat budidaya dirantai dengan hash SHA-256, dan
> siapa pun bisa memverifikasinya **tanpa perlu mempercayai kata AgroUs**.

Masuk sebagai pembeli `081100000201` → **Eksplorasi Katalog** → pilih **Wortel Pujon Grade A**.

Yang perlu diperhatikan:
- Lima catatan budidaya berurutan, tiap catatan berfoto dan berkoordinat GPS
- Badge **Rantai utuh (5)** — server menghitung ULANG rantai dari isi catatan, bukan membaca
  kolom hash tersimpan. Kalau ada satu huruf pun berubah, badge ini berubah jadi merah
- Grafik NDVI dari citra Sentinel-2, termasuk pengamatan yang **dibuang karena tertutup awan** —
  lubang datanya sengaja ditampilkan, bukan disembunyikan
- Catatan bertanda **RALAT** tetap menampilkan catatan lamanya. Tidak ada yang bisa dihapus

### 2. Pre-Order + escrow — uang ditahan sampai barang diterima

Sebagai pembeli `081100000201`:

1. **Eksplorasi Katalog** → pilih produk → **Tambah ke Keranjang**
2. **Keranjang** → **Checkout**. Kalau nilainya di bawah minimum zona, checkout ditolak —
   itu gerbang unit economics, bukan bug
3. Di halaman pembayaran tekan **Saya Sudah Bayar** (meniru panggilan balik payment gateway)
4. **Pesanan Saya** → buka pesanannya

Lalu masuk sebagai Tenant `081100000101` → **Keuangan & Escrow**: uang tadi tercatat sebagai
`HOLD`, **belum** jadi milik Tenant. Pencairan baru berjalan setelah barang diterima dan
jendela klaim mutu berakhir.

### 3. Rantai logistik — Tenant cetak QR, kurir antar tanpa instal aplikasi

Sebagai Tenant `081100000101` → **Manajemen Pesanan** → pilih pesanan berstatus **Dikirim**
(Kubis Krop Padat Pujon, pembeli Resto Padi Emas) → **Terbitkan QR & Kode Antar**.

- Muncul **satu QR unik per box** — 30 box, 30 QR berbeda
- **Kode Antar 4 digit ditampilkan sekali saja**. Catat kodenya

Sekarang jadi kurir: buka salah satu QR (klik kanan gambar → salin alamat, atau pindai
dengan kamera ponsel). Halaman kurir terbuka **tanpa login**.

- Nama Tenant dan tujuan tampil **sebelum** kode diminta, supaya kurir bisa memastikan
  box-nya benar tanpa mengorbankan percobaan
- Salah kode → sisa percobaan berkurang. Habis 5 kali, QR terkunci
- Kode benar → pelacakan mulai, posisi dikirim tiap 10 detik

> Perpindahan yang mustahil ditolak server. Melompat 6 km dalam 1 detik ditandai tidak wajar
> dan **tidak** dianggap tiba — jadi kedatangan tidak bisa dipalsukan dari peramban.

### 4. Harvest Assurance — apa yang terjadi kalau panen gagal

> Bagian tersulit dari model Pre-Order: pembeli sudah bayar, tapi alam tidak bisa dijanjikan.

Sebagai Tenant `081100000101` → **Manajemen Batch** → **Wortel Pujon Grade A** → **Catat
Kegiatan** → pilih **Panen**, isi **Jumlah box hasil panen aktual** lebih kecil dari kuota
terjual (mis. `10` dari 24), lampirkan foto apa pun, isi koordinat, simpan.

Lalu masuk sebagai pembeli `081100000201` → **Pesanan Saya** → pesanan Wortel →
**Pilih penyelesaian**. Empat opsi muncul dengan **konsekuensi uangnya masing-masing**:

| Opsi | Artinya |
| --- | --- |
| **Substitusi** | Diganti Wortel dari Kebun Lestari Batu. **Selisih harga ditanggung Tenant yang gagal**, bukan pembeli |
| **Jadwal Ulang** | Dana tetap ditahan, digeser ke siklus panen berikutnya |
| **Terima Sebagian** | Ambil yang tersedia, sisanya dikembalikan |
| **Tolak Seluruhnya** | Batalkan semua, termasuk porsi yang sebenarnya ada |

Opsi yang tidak sah **dikunci beserta alasannya** — mis. "Terima Sebagian" mati kalau porsinya
di bawah nilai minimum zona.

Sesudah memilih, cek **Keuangan & Escrow** kedua Tenant: uangnya benar-benar berpindah.

### 5. Rekomendasi Tanam — permintaan menentukan apa yang ditanam

Sebagai Tenant `081100000101` → **Rekomendasi Tanam** → **Aktifkan Paket Verified**.

Muncul kartu per komoditas dengan kalimat yang dirakit server:

> *"Zona Kota Malang membutuhkan tambahan 125 kg Bayam pada minggu panen 28 September–4
> Oktober 2026. Belum ada Tenant yang membuka kuota…"*

Yang perlu diperhatikan:
- **Tingkat keyakinan ditampilkan bersama angkanya.** Proyeksi bersandar 2 minggu data
  diberi label *Keyakinan rendah* — Tenant mengeluarkan uang sungguhan untuk menanam
- **Sisa waktu tanam** dihitung dari umur tanam komoditas. Saran yang mustahil dikejar
  tidak ditampilkan sama sekali
- Angka antar minggu **tidak dijumlahkan** — permintaan 125 kg di lima minggu berbeda bukan
  permintaan 625 kg

---

## Konsol Operator

Masuk sebagai `081100000030`:

| Menu | Cobalah |
| --- | --- |
| **Antrean Legalitas** | Tani Muda Wajak menunggu. Coba **Tolak tanpa alasan** — ditahan sistem, karena Tenant tidak akan tahu apa yang harus diperbaiki |
| **Antrean Klaim** | Klaim >10% nilai pesanan. Foto & keluhan pembeli tampil **sebelum** angka timbangan — itu dasar putusannya |
| **Verifikasi Satelit** | Batch yang klaimnya tidak cocok dengan citra. Keputusan di sini langsung mengubah badge yang dilihat pembeli |
| **Escrow** | Posisi dana seluruh Tenant. Ledger **append-only** — angkanya hasil penjumlahan entri, tidak bisa disunting |
| **Audit Hash Anchor** | Rantai dihitung ulang lalu dibandingkan dengan jangkar harian. Kolom **Cocok/TIDAK cocok** adalah hasil hitung ulang, bukan perbandingan hash tersimpan |

Untuk membuat klaim mutu muncul di antrean operator: sebagai pembeli, buka pesanan berstatus
**Diterima** → **Ajukan klaim** → isi berat timbang jauh di bawah semestinya. Toleransi susut
alami dipotong otomatis sesuai komoditas.

---

## Yang jujur belum selesai

Kami mencantumkannya supaya penilaian berdasarkan keadaan sebenarnya:

| Hal | Keadaan |
| --- | --- |
| **Payment gateway** | Belum tersambung ke mitra sungguhan. Callback `POST /payments/webhook` **sudah** menuntut tanda tangan HMAC dan gagal-tertutup tanpa `PAYMENT_WEBHOOK_SECRET`. Tombol "Saya Sudah Bayar" tidak lagi memanggil webhook itu: ia memakai jalur ber-otentikasi yang hanya bisa melunasi tagihan milik pembeli yang sedang login, dan ikut mati begitu `DEMO_EXPOSE_OTP` dimatikan |
| **Escrow** | Ledger dan aturan dananya berjalan penuh, tapi belum ada mitra escrow berlisensi |
| **Login mode peragaan** | `DEMO_EXPOSE_OTP` aktif — siapa pun yang tahu nomor bisa masuk. Aman karena seluruh data karangan, **wajib dimatikan** sebelum ada data sungguhan |
| **Penyimpanan foto** | **Sudah pindah ke Cloudflare R2** — tahan redeploy. Foto disajikan lewat domain API sendiri (`GET /uploads/...`), bukan dari domain publik bucket: `*.r2.dev` **diblokir di Indonesia** (DNS-nya diarahkan ke `aduankonten.id`), sehingga membacanya langsung dari CDN membuat foto gagal tampil untuk seluruh pengguna di pasar yang kita tuju. Pindah ke CDN langsung cukup mengisi `S3_PUBLIC_URL` setelah bucket punya custom domain. Cek yang aktif lewat `GET /operator/penyimpanan`. Catatan: foto dari demo **sebelum** migrasi ini sudah hilang permanen |
| **Citra satelit** | Pipeline Sentinel-2 lengkap dan kini **terjadwal harian** ([`satellite-verify.yml`](.github/workflows/satellite-verify.yml)), tetapi belum menyala: secret `DATABASE_URL` sengaja belum disetel, jadi data NDVI pada demo ini masih data contoh, bukan hasil tarikan langsung |
| **Peta** | Pemetaan lahan memakai GPS perangkat tanpa peta latar. Peta hiasan dengan koordinat karangan justru menyesatkan, jadi sengaja tidak dipakai |
| **Uji otomatis** | Aturan keputusan fenologi satelit (`apps/satellite-worker/tests`, 16 uji) dan pagar keamanan sisi API — tanda tangan callback pembayaran, validasi URL bukti, kunci objek penyimpanan (`apps/api`, 23 uji — `pnpm --filter @agro-os/api test`). Selebihnya belum: alur yang menyentuh PostGIS masih diuji ujung ke ujung secara manual |

### Dua pekerjaan terjadwal

| Workflow | Jadwal | Butuh secret? |
| --- | --- | --- |
| [`keep-alive`](.github/workflows/keep-alive.yml) | tiap 10 menit | Tidak — langsung aktif |
| [`satellite-verify`](.github/workflows/satellite-verify.yml) | harian 02:00 WIB | Ya, `DATABASE_URL`. Tanpa itu jalannya dilewati, bukan digagalkan |

`keep-alive` ada karena Render free tier menidurkan instance setelah ~15 menit
menganggur, dan permintaan pertama sesudahnya butuh 50+ detik — jeda yang dibaca
pengunjung baru sebagai aplikasi rusak, bukan sebagai aplikasi yang sedang bangun.

> GitHub menonaktifkan workflow terjadwal setelah 60 hari repo tidak ada aktivitas.
> Kalau nanti tampak berhenti sendiri, aktifkan lagi dari tab **Actions**.

---

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
pnpm install      # sekaligus menyiapkan Prisma Client (lewat postinstall di apps/api)
pnpm dev          # turbo membangun packages/shared dulu, lalu menyalakan web + api
pnpm type-check
```

### Kalau kamu hanya mengerjakan FE

`pnpm dev` menyalakan **api juga**, dan api butuh PostgreSQL + PostGIS serta `apps/api/.env`.
Untuk kerja di `apps/web` saja, jalankan web-nya sendirian:

```bash
pnpm --filter @agro-os/web dev
```

Butuh data sungguhan? Minta salah satu anggota tim menjalankan api di komputernya, lalu
arahkan `NEXT_PUBLIC_API_URL` ke alamat itu. Kontrak tipe di `packages/shared` sudah stabil,
jadi mock pun tidak akan sia-sia.

### Dua hal yang TIDAK ada di git — dan penyebab error "modul tidak ditemukan"

Keduanya hasil olahan, jadi sengaja tidak di-commit (lihat `.gitignore`) dan dibuat ulang di
tiap komputer. Kalau salah satu belum ada, TypeScript melaporkan **ratusan** error yang
sebenarnya berasal dari satu sebab:

| Yang belum ada | Gejalanya | Dibuat oleh |
| --- | --- | --- |
| `apps/api/generated/prisma` | `Property 'batch' does not exist on type 'PrismaService'` (dan puluhan tabel lain) | `postinstall` → `prisma generate` |
| `packages/shared/dist` | `Cannot find module '@agro-os/shared'` | task `build`, dipicu `dependsOn: ["^build"]` |

Sekarang keduanya otomatis. Kalau tetap muncul, jalankan pemulihan manualnya:

```bash
pnpm install && pnpm --filter @agro-os/shared build
```

### Menjalankan api penuh (butuh database)

```bash
cp apps/api/.env.example apps/api/.env    # lalu isi JWT_SECRET & OTP_PEPPER
```

API **menolak boot** tanpa `JWT_SECRET` — itu disengaja, secret cadangan hardcoded sudah
dihapus. Cara tercepat menyiapkan databasenya ada di `apps/api/.env.example`.

Di Windows, kalau Docker Desktop gagal start dengan pesan *"remove …/dockerInference: The
file cannot be accessed by the system"*, jalankan `scripts/fix-docker.ps1` — penyebabnya
socket sisa dari proses yang mati tidak wajar, dijelaskan di dalam skripnya.

## Workflow git

Trunk-based: `main` selalu deploy-able, feature branch pendek (`feat/…`) → PR → `main`.
Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
