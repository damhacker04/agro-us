# AgroUs

AgroUs adalah aplikasi logistik pertanian B2B yang menghubungkan Tenant (pengelola usaha tani), pembeli, dan kurir. Pembeli dapat memesan hasil panen lebih awal, meninjau bukti budidaya melalui Verified Timeline, dan mengikuti pemenuhan pesanannya. Tenant mengelola kuota panen, pengiriman, serta pencatatan dana escrow.

Repositori ini berisi **prototipe untuk demonstrasi dan penilaian**. Pembayaran dan data contoh dijelaskan secara terbuka di bawah.

## Mulai di sini untuk tim penilai

| Kebutuhan | Petunjuk |
| --- | --- |
| Langsung mencoba tanpa instalasi | Buka [demo AgroUs](https://agro-us.vercel.app), lalu gunakan akun di bawah |
| Mengetahui fitur yang perlu dicoba | [Panduan demo juri: alur 5–10 menit](docs/DEMO_JURI.md) |
| Menjalankan source code di komputer sendiri | [Panduan instalasi lengkap](docs/INSTALLATION.md), termasuk database dan data demo |
| Instalasi atau login bermasalah | [Pemecahan masalah](docs/INSTALLATION.md#pemecahan-masalah) |
| Memeriksa rancangan dan pengujian | [PRD](docs/PRD.md), [arsitektur implementasi](docs/diagrams/06-architecture-as-built.md), [hasil QA](docs/qa/TEST_RESULTS.md) |

Demo daring membutuhkan internet dan ketersediaan server. Jika halaman terbuka tetapi data belum muncul, tunggu sekitar satu menit dan muat ulang; API dapat memerlukan waktu untuk aktif kembali. Jika tetap gagal, gunakan panduan instalasi lokal. Alamat demo di atas adalah alamat yang dicantumkan proyek; keberhasilan akses perlu diperiksa kembali menjelang pengumpulan.

### Akun demo

Tidak ada kata sandi tetap. Buka halaman masuk sesuai peran, masukkan nomor, minta OTP, lalu tekan **Masuk** setelah kode terisi. Pengisian otomatis memerlukan `DEMO_EXPOSE_OTP=true` di API; panduan lokal menjelaskan pengaturannya. Tidak perlu menerima SMS sungguhan pada mode ini.

| Peran | Nomor demo | Nama / kegunaan |
| --- | --- | --- |
| Tenant | `081100000101` | Tani Makmur Pujon — batch unggulan, timeline, pesanan, escrow |
| Tenant | `081100000102` | Kebun Lestari Batu — pembanding dan calon pemasok substitusi |
| Tenant | `081100000103` | Gapoktan Ngantang Sejahtera |
| Tenant | `081100000104` | Tani Muda Wajak — menunggu tinjauan legalitas |
| Pembeli | `081100000201` | Katering Sehat Nusantara — pesanan contoh Wortel |
| Pembeli | `081100000202` | Resto Padi Emas — pesanan contoh berstatus Dikirim |
| Pembeli | `081100000203` | Dapur Kolektif Batu |
| Operator | `081100000030` | Antrean legalitas, klaim, verifikasi, dan escrow |

Halaman masuk: [Tenant](https://agro-us.vercel.app/auth/tenant), [Pembeli](https://agro-us.vercel.app/auth/buyer), [Operator](https://agro-us.vercel.app/auth/operator/login). Kurir masuk lewat QR box dan Kode Antar, tanpa akun.

Semua nama, transaksi, foto placeholder, dan observasi satelit pada seed demo merupakan **data contoh**. Akun lokal baru tersedia sesudah seed demo dijalankan. Pada demo daring bersama, tindakan pengunjung lain dapat mengubah kondisi akun; gunakan database lokal khusus demo untuk mengulang skenario dari awal.

## Fitur yang bisa dinilai

- **Verified Timeline:** catatan budidaya, foto, koordinat, pemeriksaan rantai hash, dan grafik observasi satelit.
- **Pre-order dan pencatatan escrow:** kuota per batch, minimum nilai pengiriman, checkout, simulasi pembayaran, dan ledger dana.
- **Logistik:** QR per box, Kode Antar kurir, tracking GPS, dan konfirmasi penerimaan pembeli.
- **Harvest Assurance:** pilihan penyelesaian saat hasil panen kurang, sesuai kelayakan yang dihitung server.
- **Konsol operator dan rekomendasi tanam:** tinjauan legalitas/klaim serta ringkasan kebutuhan komoditas.

Langkah, hasil yang diharapkan, dan prasyarat setiap skenario ada di [panduan demo](docs/DEMO_JURI.md). Mulailah dari peninjauan data, kemudian coba transaksi yang mengubah keadaan aplikasi.

## Menjalankan secara lokal

Gunakan **Node.js 22.x minimal 22.12**, **pnpm 10.30.3**, serta **PostgreSQL 16 + PostGIS 3.4**. Jalur instalasi yang didokumentasikan memakai Docker untuk database dan Node.js untuk API/web. Python hanya diperlukan jika ingin menjalankan worker satelit terpisah.

Ikuti [panduan instalasi](docs/INSTALLATION.md) dari awal. Urutannya:

1. Siapkan alat dan database lokal khusus demo.
2. Buat `apps/api/.env` dan `apps/web/.env.local` dari berkas contoh.
3. Instal dependency sesuai lockfile dan bangun paket shared.
4. Terapkan migration, isi data referensi, lalu isi data demo.
5. Jalankan `pnpm dev` dan buka [aplikasi lokal](http://localhost:3000).
6. Periksa koneksi database dan login menggunakan [pemeriksaan setelah startup](docs/INSTALLATION.md#pemeriksaan-setelah-startup).

**Perhatian:** `db:seed:demo` menghapus data transaksi pada database tujuan sebelum mengisinya kembali. Jalankan hanya pada database khusus demo. Lokasi folder di dalam `htdocs` tidak berarti aplikasi dijalankan melalui Apache; aplikasi ini memerlukan proses Node.js dan PostgreSQL + PostGIS.

## Teknologi dan struktur

Versi mayor berikut mengikuti dependency dalam repositori; versi paket yang terpasang dikunci oleh `pnpm-lock.yaml`.

| Bagian | Teknologi |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API | NestJS 11, Prisma 7, Socket.IO |
| Database | PostgreSQL dengan ekstensi PostGIS |
| Worker satelit | Python, pembacaan Sentinel-2 melalui STAC/COG |
| Workspace | pnpm + Turborepo |

```text
apps/
  web/                Antarmuka Tenant, pembeli, operator, dan kurir
  api/                REST API, autentikasi, aturan transaksi, dan penyimpanan
  satellite-worker/   Job satelit terpisah; opsional untuk demo dasar
packages/
  shared/             Tipe dan enum bersama API/web
docs/
  INSTALLATION.md     Instalasi, pemeriksaan, dan pemecahan masalah
  DEMO_JURI.md        Akun dan skenario penilaian
  qa/                Hasil audit dan pengujian bertanggal
```

## Integrasi dan batasan demonstrasi

| Bagian | Keadaan untuk penilaian |
| --- | --- |
| OTP | Provider saat ini mencatat pesan ke log. Mode demo mengembalikan OTP ke frontend; bukan pengiriman WhatsApp/SMS nyata |
| Pembayaran | Tombol **Saya Sudah Bayar** menyimulasikan pelunasan invoice milik pembeli yang login. Tidak memindahkan uang sungguhan |
| Escrow | Pembukuan dan aturan dana internal; belum merupakan layanan penitipan dana melalui mitra pembayaran nyata |
| Foto | Instalasi lokal menyimpan unggahan di `apps/api/uploads/`; S3/R2 opsional untuk penyimpanan eksternal |
| Satelit | Grafik dari seed memakai observasi contoh. Menjalankan pipeline citra nyata memerlukan worker dan koneksi internet; tidak wajib untuk demo dasar |
| GPS dan peta | Pemetaan lahan dan tracking memakai lokasi perangkat. Peta dasar/navigasi tidak disediakan; GPS ponsel memerlukan origin yang diizinkan browser, umumnya HTTPS |
| Ketahanan tanpa internet | Instalasi mengunduh dependency, image database, dan font. Alur transaksi membutuhkan API; jangan mengasumsikan seluruh aplikasi bekerja offline |
| Pengujian | Laporan QA mencatat hasil pada tanggalnya dan defect yang ditemukan. Test unit yang lulus bukan bukti seluruh alur atau integrasi eksternal telah lulus |

`DEMO_EXPOSE_OTP` hanya boleh diaktifkan pada lingkungan berisi data contoh, karena siapa pun yang mengetahui nomor akun dapat masuk. Kredensial deployment asli tidak diperlukan untuk mengikuti instalasi demo lokal.

## Berkas pendamping pengumpulan

Sesuaikan paket akhir dengan ketentuan resmi perlombaan. Untuk membantu penilaian, siapkan:

- Tautan demo yang sudah dicoba melalui browser/perangkat lain, akun demo, serta README ini.
- Source code pada commit/tag pengumpulan yang jelas, termasuk lockfile, migration, seed, dan berkas `.env.example`.
- Video demo singkat yang menunjukkan masalah, alur utama, dan hasil; sertakan tautannya dalam berkas pengumpulan ketika sudah tersedia.
- Proposal atau ringkasan fitur, arsitektur, dan batasan simulasi sesuai format panitia.
- Kontak penanggung jawab untuk kendala teknis, dicantumkan di formulir/berkas pengumpulan sesuai aturan panitia.

Sebelum dikirim, minta satu orang menjalankan source code dari salinan baru **hanya dengan panduan instalasi**, lalu catat sistem operasi, versi alat, commit, dan hasilnya. Jangan sertakan `.env` asli, token, data pribadi, `node_modules`, atau hasil build sementara dalam ZIP source code. Foto contoh yang diperlukan sudah disertakan di `apps/api/prisma/demo-assets/`.

## Dokumentasi lanjutan

- [Kebutuhan produk / PRD](docs/PRD.md)
- [Rencana arsitektur](docs/ARCHITECTURE_PLAN.md) dan [arsitektur implementasi](docs/diagrams/06-architecture-as-built.md)
- [Diagram sistem](docs/diagrams/)
- [Hasil pengujian](docs/qa/TEST_RESULTS.md) dan [audit QA](docs/qa/AUDIT_TCC_2026.md)
- [Worker satelit](apps/satellite-worker/README.md)
- [Riwayat perubahan](docs/CHANGELOG.md)

Dokumen perencanaan dan audit menggambarkan kondisi pada waktu penulisannya. Untuk instalasi dan demonstrasi saat ini, gunakan `INSTALLATION.md` dan `DEMO_JURI.md` di atas.
