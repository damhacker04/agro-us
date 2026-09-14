# Instalasi AgroUs untuk penilaian

Panduan ini menyiapkan API, web, dan database **khusus demo pada komputer sendiri**. Data contoh disertakan dalam repositori; tidak perlu meminta akun database, layanan SMS, payment gateway, atau bucket milik pembuat.

Semua perintah dijalankan dari folder utama repositori yang berisi `package.json` dan `pnpm-lock.yaml`, kecuali jika disebutkan lain. Buka terminal di folder hasil clone atau ekstraksi ZIP.

## 1. Persiapan

| Alat | Versi / kebutuhan |
| --- | --- |
| [Node.js](https://nodejs.org/en/download) | 22.x, minimal 22.12; sejalan dengan Node 22 di workflow QA dan kebutuhan Prisma dalam proyek |
| [pnpm](https://pnpm.io/10.x/installation) | Tepat `10.30.3`, sesuai `packageManager` |
| [Docker](https://docs.docker.com/engine/install/) | Docker Desktop pada Windows/macOS atau Docker Engine pada Linux; daemon harus berjalan, memakai Linux containers |
| Browser | Browser modern; izinkan kamera/lokasi jika mencoba alur terkait |
| Internet | Untuk instalasi dependency, image Docker, dan pengambilan font Next.js; worker citra nyata juga memerlukan internet |

Pada Windows, buka Docker Desktop hingga engine siap. Instal pnpm jika belum tersedia:

```sh
npm install --global pnpm@10.30.3
```

Perintah npm di atas hanya untuk memasang alat pnpm. Dependency proyek diinstal dengan pnpm. Periksa dari terminal baru:

```sh
node --version
pnpm --version
docker version
```

Versi pnpm harus `10.30.3`. `docker version` harus menampilkan bagian **Server**, bukan hanya Client. Python tidak diperlukan untuk API dan web.

## 2. Jalankan database khusus demo

Perintah berikut berlaku di PowerShell maupun terminal macOS/Linux. Port `55432` dipilih agar terpisah dari PostgreSQL yang biasanya memakai `5432`. Password berikut adalah contoh lokal, bukan kredensial server daring. Binding `127.0.0.1` membatasi akses port database ke komputer ini, sesuai [panduan port Docker](https://docs.docker.com/engine/network/port-publishing/).

```sh
docker run --detach --name agrous-juri-db --publish 127.0.0.1:55432:5432 --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD=agrous_demo_local --env POSTGRES_DB=agrous_juri --volume agrous-juri-data:/var/lib/postgresql/data postgis/postgis:16-3.4
```

Tunggu database siap, lalu periksa:

```sh
docker exec agrous-juri-db pg_isready -U postgres -d agrous_juri
```

Lanjut jika hasilnya `accepting connections`. Jika belum, lihat `docker logs agrous-juri-db` dan ulangi pemeriksaan setelah proses inisialisasi selesai.

Jika container **dari panduan ini** sudah dibuat sebelumnya, gunakan `docker start agrous-juri-db`; jangan menjalankan `docker run` ulang. Volume menyimpan database saat container dihentikan. Mengganti nilai password pada perintah `docker run` tidak mengganti password database yang sudah terisi di volume.

Alternatif tanpa Docker: sediakan PostgreSQL 16 dengan ekstensi PostGIS tersedia, buat database kosong khusus demo, dan gunakan connection string-nya pada langkah 3. Pengguna database harus dapat menerapkan migration termasuk `CREATE EXTENSION postgis`. MySQL/MariaDB dari XAMPP tidak dapat menggantikan PostgreSQL untuk proyek ini.

## 3. Buat konfigurasi lokal

Pada salinan baru, buat dua berkas berikut. Jika berkas tujuan sudah ada, periksa dan edit isinya; jangan menimpanya tanpa memeriksa konfigurasi yang sedang dipakai.

**Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

**macOS/Linux:**

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Buka `apps/api/.env` di editor dan sesuaikan nilai berikut. Jalankan perintah pembuat nilai acak di bawah **dua kali**, kemudian tempel hasil pertama ke `JWT_SECRET` dan hasil kedua ke `OTP_PEPPER`.

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```dotenv
DATABASE_URL="postgresql://postgres:agrous_demo_local@127.0.0.1:55432/agrous_juri"
JWT_SECRET=GANTI_DENGAN_HASIL_ACAK_PERTAMA
OTP_PEPPER=GANTI_DENGAN_HASIL_ACAK_KEDUA
PORT=3001
CORS_ORIGIN=http://localhost:3000
DEMO_EXPOSE_OTP=true
SCAN_BASE_URL=http://localhost:3000/scan
```

Jangan memakai teks `GANTI_DENGAN_...` sebagai secret. JWT membutuhkan minimal 32 karakter dan OTP pepper minimal 16 karakter.

Untuk demo lokal, biarkan `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, dan `S3_PUBLIC_URL` kosong: foto disimpan di `apps/api/uploads/`. `PAYMENT_WEBHOOK_SECRET` boleh kosong karena tombol simulasi memakai endpoint khusus; webhook pembayaran nyata tetap ditolak tanpa secret tersebut.

`DEMO_EXPOSE_OTP=true` mengaktifkan OTP yang terisi otomatis dan simulasi pembayaran. Gunakan hanya pada data contoh. API tidak mengaktifkannya otomatis hanya karena berjalan di komputer lokal.

Pastikan `apps/web/.env.local` berisi:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Langkah ini wajib untuk demo lokal.** Tanpanya, kode frontend memiliki alamat cadangan API daring. Akibatnya akun/data lokal tidak muncul meskipun database lokal sudah diisi. Jangan menaruh secret API di berkas web; variabel `NEXT_PUBLIC_*` dapat dibaca browser.

## 4. Instal dependency dan siapkan paket

```sh
pnpm install --frozen-lockfile
pnpm --filter @agro-os/api db:generate
pnpm --filter @agro-os/shared build
```

Jangan melanjutkan jika salah satu perintah gagal. Lockfile menjaga versi dependency sesuai source code. Jangan menghapus atau memperbarui lockfile untuk melewati error instalasi.

`db:generate` membuat Prisma Client yang tidak disimpan di Git; biasanya sudah dipanggil oleh `postinstall`, tetapi dicantumkan eksplisit agar langkahnya jelas. Build shared menghasilkan `packages/shared/dist`, yang dibutuhkan API dan web.

## 5. Terapkan migration dan isi data

Pastikan `DATABASE_URL` mengarah ke `127.0.0.1:55432/agrous_juri` milik demo ini. Variabel yang sebelumnya disetel pada terminal dapat mengalahkan isi `.env`. Gunakan terminal baru tanpa konfigurasi database server lain sebelum melanjutkan.

```sh
pnpm --filter @agro-os/api exec prisma migrate deploy
pnpm --filter @agro-os/api db:seed
```

Migration memasang struktur tabel, PostGIS, indeks, dan aturan integritas. `db:seed` mengisi zona serta komoditas; perintah tersebut belum membuat akun atau pesanan demo. Gunakan `migrate deploy` untuk menerapkan migration yang sudah disediakan. Jangan menggantinya dengan `db push` atau `migrate reset`.

**Langkah berikut menghapus data transaksi pada database tujuan sebelum membuat data contoh. Jalankan hanya pada database khusus demo, setelah alamatnya diperiksa.** Jangan menjalankannya terhadap database daring atau database yang berisi pekerjaan penting.

```sh
pnpm --filter @agro-os/api db:seed:demo
```

Seed mencetak sasaran database dengan password disamarkan, lalu membuat Tenant, pembeli, operator, katalog, foto contoh, timeline, observasi satelit contoh, dan pesanan. Skrip tidak berhenti meminta konfirmasi; periksa konfigurasi **sebelum** menjalankannya. Seed demo ditolak jika `NODE_ENV=production`.

## 6. Jalankan aplikasi

```sh
pnpm dev
```

Biarkan terminal tersebut terbuka. Turborepo membangun paket shared lalu menjalankan API dan web.

| Layanan | Alamat yang diharapkan |
| --- | --- |
| Aplikasi | [http://localhost:3000](http://localhost:3000) |
| API liveness | [http://localhost:3001/health](http://localhost:3001/health) |
| Data zona | [http://localhost:3001/zones](http://localhost:3001/zones) |

Jika port 3000 sudah dipakai dan Next.js memilih 3002, konfigurasi CORS/QR di atas tidak lagi cocok. Hentikan instance AgroUs lama atau ubah port dan semua alamat terkait secara konsisten.

Jika perlu memisahkan log, gunakan dua terminal di folder utama setelah langkah 4:

```sh
pnpm --filter @agro-os/api dev
```

```sh
pnpm --filter @agro-os/web dev
```

### Pemeriksaan setelah startup

1. Buka `/health`: respons JSON memiliki `status: "ok"`. Ini hanya membuktikan proses API hidup; koneksi database bersifat lazy.
2. Buka `/zones`: harus menampilkan tiga zona dari seed, termasuk **Kota Malang**. Ini juga menguji kueri ke database.
3. Buka web → masuk sebagai Pembeli `081100000201` → minta OTP → kode terisi → **Masuk**.
4. Katalog zona Kota Malang harus memuat **Wortel Pujon Grade A**. Buka detail dan periksa foto placeholder serta timeline.
5. Lanjutkan [panduan demo juri](DEMO_JURI.md). Gunakan profil browser terpisah untuk Tenant/pembeli/operator jika perlu mencoba beberapa peran bersamaan.

Jika langkah 1 berhasil tetapi langkah 2 gagal, jangan menganggap setup selesai: periksa database, connection string, dan migration. Jika `/zones` berhasil tetapi login gagal, periksa seed demo, OTP pepper, serta `DEMO_EXPOSE_OTP`.

## Menghentikan dan menjalankan lagi

Tekan `Ctrl+C` pada terminal aplikasi. Untuk menghentikan database tanpa menghapus data:

```sh
docker stop agrous-juri-db
```

Pada sesi berikutnya:

```sh
docker start agrous-juri-db
pnpm dev
```

Tidak perlu mengulangi instalasi atau seed setiap kali menjalankan aplikasi. Setelah source code diperbarui, instal ulang sesuai lockfile dan terapkan migration baru bila ada.

Untuk mengulang skenario dari data awal, hentikan API, periksa lagi database tujuan, lalu ulangi langkah seed demo pada bagian 5. Ini menghapus transaksi percobaan sebelumnya dan memperbarui tanggal contoh relatif terhadap waktu seed. Jalankan API lagi, keluar dari akun browser, lalu masuk ulang karena akun hasil seed memiliki ID baru.

## Mencoba kamera, GPS, dan QR di ponsel

Jalur localhost di atas ditujukan untuk browser pada komputer yang menjalankan aplikasi. `localhost` pada ponsel merujuk ke ponsel tersebut.

Untuk penilaian melalui ponsel, jalur paling praktis adalah demo daring melalui HTTPS. Jika memakai server lokal yang diekspos melalui HTTPS, sesuaikan `NEXT_PUBLIC_API_URL` ke API yang terjangkau dari ponsel, `CORS_ORIGIN` ke origin web tersebut, dan `SCAN_BASE_URL` ke alamat web yang diakhiri `/scan`. Restart API dan web; terbitkan QR baru setelah perubahan karena QR lama tetap menyimpan alamat sebelumnya.

Sekadar mengganti localhost dengan IP LAN melalui HTTP belum tentu memungkinkan kamera/GPS; browser membatasi fitur itu pada konteks aman. Khusus lokasi, kebutuhan HTTPS dan izin pengguna dijelaskan dalam [dokumentasi Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API). Izinkan lokasi/kamera ketika diminta. Jangan menjanjikan tracking lapangan jika hanya menguji dari komputer yang diam.

## Worker satelit dan pemeriksaan kode (opsional)

Worker satelit tidak dijalankan oleh `pnpm dev`. Grafik demo sudah memiliki observasi contoh dari seed. Jika penilai ingin meninjau pipeline Python, lihat [README worker](../apps/satellite-worker/README.md) dan `.env.example` di foldernya; worker memakai database yang sama dan dapat memperbarui status verifikasi. Gunakan database pengujian ketika menjalankannya.

Pemeriksaan TypeScript dari folder utama, setelah dependency dan konfigurasi disiapkan:

```sh
pnpm type-check
pnpm build
pnpm test
```

`pnpm build` memerlukan akses pengambilan font karena aplikasi memakai `next/font/google`. `pnpm test` menjalankan paket TypeScript, bukan worker Python maupun seluruh alur browser. Lihat [hasil QA bertanggal](qa/TEST_RESULTS.md) untuk cakupan dan gate regresi; status suite normal tidak boleh dianggap sebagai jaminan semua requirement sudah terpenuhi.

## Pemecahan masalah

| Gejala | Tindakan |
| --- | --- |
| `pnpm` tidak dikenali | Pasang pnpm 10.30.3 dan buka terminal baru; periksa `pnpm --version` |
| PowerShell menolak `pnpm.ps1` / `npm.ps1` | Gunakan `pnpm.cmd` / `npm.cmd` sebagai pengganti nama perintah di Windows |
| Prisma menolak versi Node | Gunakan Node 22.x minimal 22.12, lalu ulangi instalasi. Persyaratan root `>=20` saja belum cukup untuk Prisma yang dipakai |
| Docker tidak dapat tersambung ke daemon | Jalankan Docker Desktop/Engine dan periksa bagian Server pada `docker version` |
| Nama container sudah dipakai | Jika itu container yang dibuat panduan ini, jalankan `docker start agrous-juri-db`. Jangan hapus container yang belum dikenali |
| Port 55432 sudah dipakai | Pilih port host kosong pada `--publish`, lalu samakan port pada `DATABASE_URL` |
| Database tidak terjangkau / autentikasi gagal | Jalankan `pg_isready` seperti langkah 2; periksa host, port, nama database dan password, termasuk variabel terminal yang mengalahkan `.env` |
| Ekstensi `postgis` tidak tersedia | Gunakan image `postgis/postgis:16-3.4` atau pasang PostGIS pada PostgreSQL alternatif; periksa hak pengguna migration |
| Tabel tidak ditemukan / `/zones` kosong | Jalankan `prisma migrate deploy` lalu `db:seed` pada database yang digunakan API |
| Katalog kosong / akun masuk ke onboarding | Jalankan seed demo pada database khusus demo; periksa `NEXT_PUBLIC_API_URL` dan zona pembeli |
| `JWT_SECRET` / `OTP_PEPPER` belum diisi | Isi nilai acak pada `apps/api/.env`, kemudian restart API |
| OTP tidak terisi / `DEMO_PAYMENT_DISABLED` | Set `DEMO_EXPOSE_OTP=true` pada API demo, restart API, dan minta kode baru; tunggu cooldown jika ditampilkan |
| `Cannot find module '@agro-os/shared'` | Jalankan `pnpm --filter @agro-os/shared build` |
| Prisma Client / properti model tidak ditemukan | Jalankan `pnpm --filter @agro-os/api db:generate` |
| `Failed to fetch` / error CORS | Cocokkan alamat frontend di browser dengan `CORS_ORIGIN`, API dengan `NEXT_PUBLIC_API_URL`, lalu restart kedua proses |
| API masih mengarah ke server daring | Periksa `apps/web/.env.local`; restart dev server. Jika memakai hasil build, build ulang karena `NEXT_PUBLIC_*` ditanam saat build |
| Foto placeholder tidak tampil | Pastikan seed demo selesai dan folder `apps/api/uploads/` ada; URL foto dilayani oleh API. Biarkan kredensial S3 kosong untuk jalur lokal ini |
| `Konfigurasi S3 tidak lengkap` | Untuk lokal, kosongkan semua kredensial S3; jika memakai S3, isi bucket, access key dan secret key secara lengkap |
| Checkout ditolak minimum pengiriman | Ikuti contoh jumlah box di panduan demo; minimum dihitung per rencana pengiriman, bukan gabungan semua minggu |
| QR membuka localhost yang salah | Ponsel perlu alamat web yang terjangkau; ubah `SCAN_BASE_URL` dan terbitkan QR baru |
| Download paket, image, atau font gagal | Periksa internet/proxy/firewall dan ulangi perintah yang gagal; build lokal pertama belum merupakan paket offline |
| Login lama tidak berlaku setelah seed ulang | Keluar lalu masuk ulang dengan OTP baru; seed telah mengganti ID akun |

Jika masih gagal, kirim tahap yang gagal, sistem operasi, versi Node/pnpm, commit source code, dan pesan error kepada penanggung jawab tim. Jangan menyertakan `.env`, token, atau connection string dengan password.

## Status verifikasi panduan

Panduan disusun pada 14 September 2026 dengan mencocokkan perintah, variabel environment, seed, dan endpoint terhadap source code. Versi alat yang terbaca di mesin penyusun adalah Node 22.16.0 dan pnpm 10.30.3. **Instalasi penuh pada komputer bersih belum diuji dalam pembaruan dokumentasi ini.** Sebelum pengumpulan, lakukan uji dari salinan baru dan catat hasilnya; jangan memakai pemeriksaan kode sebagai pengganti bukti instalasi lintas perangkat.
