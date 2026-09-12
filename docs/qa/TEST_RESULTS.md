# Bukti pengujian AgroUs — 11 September 2026, frontend diperbarui 12 September 2026

**Target 100% coverage seluruh proyek belum tercapai.** Hasil ini memakai seluruh sumber runtime setiap paket, bukan hanya daftar service yang telah diuji. Ada **838 kasus**, bertambah **793** dari baseline 45 kasus (29 API + 16 worker). Dalam mode acceptance: **812 lulus dan 26 gagal**. Cacat yang gagal belum diperbaiki dalam perubahan QA 11 September; tiga di antaranya ditutup oleh perbaikan P1 frontend 12 September (lihat bagian berikutnya). Angka API, shared dan worker tidak diukur ulang pada 12 September.

## Hasil eksekusi lokal

| Paket | Kasus | Lulus acceptance | Cacat gagal | Perilaku suite normal |
|---|---:|---:|---:|---|
| API | 585 | 579 | 6 | Diukur ulang 12 Sep sesudah perbaikan sembilan cacat P1 backend; Vitest normal menampilkan 585 passed, termasuk 6 `it.fails` yang tersisa (BE-03, 06, 09, 10, 13, 14) |
| Frontend | 161 | 154 | 7 | Vitest menampilkan 161 passed, termasuk 7 `it.fails` — lihat pembaruan 12 September di bawah |
| Shared | 5 | 5 | 0 | Lima test pemetaan status→badge lulus |
| Worker satelit | 119 | 119 | 0 | 119 passed; SAT-01..04 diperbaiki 12 Sep 2026, `xfail` dihapus |
| **Total** | **838** | **812** | **26** | **Suite normal bukan gate seluruh requirement sudah benar** |

**Baris total di atas belum menjumlahkan ulang angka API 12 September.** Coverage API yang diukur ulang pada tanggal itu: statement/baris 62,89% (4.079/6.485), fungsi 83,16% (247/297), cabang 94,57% (1.237/1.308).

API memiliki 35 file test, web 16, shared 1. Test baru meliputi unit service, adapter dan domain murni, serta komponen/interaksi React; ini bukan 838 skenario browser end-to-end. Terdapat lebih banyak temuan inspeksi sumber daripada 26 regresi otomatis, dan satu temuan dapat mencakup beberapa gejala. Jangan menjumlahkan baris laporan FE/BE/worker sebagai jumlah bug unik.

`it.fails`/`xfail(strict=True)` dipakai untuk menyimpan acceptance yang gagal sebagai bukti yang dapat diulang (worker satelit sudah tidak memakainya sejak SAT-01..04 diperbaiki). Test tidak di-skip dan tetap mengeksekusi kode. Bila perilaku diperbaiki, unexpected pass menggagalkan suite normal supaya anotasi tersebut dihapus. `pnpm test:regressions` mengaktifkan `QA_ENFORCE_REGRESSIONS=1` pada semua paket dan menampilkan cacat sebagai kegagalan biasa. Workflow QA juga menjalankan gate ini tanpa `continue-on-error`.

## Pembaruan 12 September 2026 — perbaikan P1 frontend

Angka API, shared dan worker di halaman ini tetap hasil pengukuran 11 September; hanya baris Frontend yang berubah. Perbaikan FE-01 s.d. FE-04 (lihat [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md)) **mengubah implementasi produksi**, tidak hanya test — jadi kalimat "tidak mengubah implementasi produksi" di bawah berlaku untuk pekerjaan QA 11 September, bukan untuk perubahan ini.

| Ukuran frontend | 11 September | 12 September |
|---|---:|---:|
| Kasus / file | 137 / 14 | 161 / 16 |
| Expected failure (`it.fails`) | 10 | 7 |
| Baris & statements | 17,21% — 2.163/12.568 | 18,83% — 2.417/12.830 |
| Fungsi | 67,88% — 186/274 | 69,09% — 199/288 |
| Cabang | 91,35% — 507/555 | 91,90% — 579/630 |

FE-REG-07 (rute tenant baru) dan FE-REG-08 (logout pembeli & operator, dua parameter) berhenti menjadi cacat dan kini test biasa. Yang masih expected failure: FE-REG-01 s.d. FE-REG-05 (validasi storage, kuantitas negatif, HTTP 205, keranjang antar-akun) serta FE-REG-06 (pengosongan digit OTP). FE-REG-09 (penyegaran lencana keranjang) ikut berhenti menjadi cacat pada 12 September: lencana kini membaca ulang pada event `keranjang:ubah`, bukan hanya saat `pathname` berubah — perlu, karena katalog menambah barang tanpa bernavigasi. `pnpm --filter @agro-os/web test`, `type-check` dan `build` lulus pada 12 September; angka paket lain belum diukur ulang, sehingga total 814/785/29 di tabel atas kini kedaluwarsa untuk kolom frontend.

## Coverage seluruh sumber

| Paket / cakupan | Baris | Statements | Fungsi | Cabang |
|---|---:|---:|---:|---:|
| API — `apps/api/src/**/*.ts` | **61,26%** — 3.805/6.211 | **61,26%** — 3.805/6.211 | **82,45%** — 235/285 | **94,63%** — 1.146/1.211 |
| Web — `apps/web/src/**/*.{ts,tsx}` (12 Sep) | **18,83%** — 2.417/12.830 | **18,83%** — 2.417/12.830 | **69,09%** — 199/288 | **91,90%** — 579/630 |
| Shared — `packages/shared/src/**/*.ts` | **100%** — 191/191 | **100%** — 191/191 | **100%** — 1/1 | **100%** — 5/5 |
| Worker — `apps/satellite-worker/src` | **100%** — 552/552 statements Python | **100%** — 552/552 | Tidak diukur terpisah oleh coverage.py | **100%** — 118/118 |

API/web/shared memakai Vitest 3.2.7 + V8; Python memakai pytest-cov dengan branch coverage. Persentase tidak dirata-ratakan menjadi satu “coverage aplikasi”, karena instrumentasi serta denominator berbeda. V8 menghitung kode hasil transformasi dan file belum terimpor secara berbeda; jumlah cabang/fungsi yang terlihat dapat berubah ketika file mulai dieksekusi. Angka branch yang tinggi tidak berarti semua controller/halaman sudah diuji.

Test/helper test, deklarasi tipe, dependency, generated Prisma client, build output, migration SQL dan tooling infrastruktur tidak dihitung sebagai runtime `src` aplikasi. File sumber yang belum diimpor tetap dimasukkan. Tidak menambahkan ignore komentar atau mengurangi cakupan ke file yang hijau. Shared terdiri terutama atas tipe yang dihapus compiler dan konstanta; 100% shared menguji satu fungsi pemetaan, bukan seluruh kontrak JSON saat runtime.

Contoh modul yang kini mencapai 100% keempat metrik: payment, escrow, claim, settlement, courier, PoD, QR, claim-window, harvest, timeline, yield-assessment, catalog, product, batch, profil buyer/tenant, legalitas, subscription, jobs, notification, anchor, hash serta adapter storage. Beberapa modul tersebut tetap mempunyai defect acceptance; coverage dan kebenaran perilaku adalah dua ukuran berbeda.

Di FE, halaman checkout, payment, pemilihan wilayah, `lib/rute-masuk.ts` dan komponen PenilaianPanen mencapai 100% empat metrik pada pengukuran khusus; halaman onboarding pembeli yang baru berada di 99,25% baris dan 85,18% cabang. PetaLahan mencapai 100% baris/statements/fungsi dan 98,48% cabang; sisa satu guard `<3 titik` tidak terjangkau lewat tombol yang sudah disabled. Test tidak memanggil handler privat atau memanipulasi internal React untuk menaikkan angka. Halaman besar seperti detail pesanan/produk, dashboard operator dan banyak form masih belum cukup diuji.

Worker mencapai 100% tanpa bergantung pada test yang sengaja gagal: pada 10 September angka itu sudah tercapai oleh 105 test lulus saja, dan sejak SAT-01..04 diperbaiki seluruh 119 test lulus. Pengujian raster memakai TIFF asli di memori; layanan HTTP dan database diganti fixture. Angka itu tidak membuktikan akurasi agronomi.

## Status perintah

| Perintah | Hasil terakhir | Makna |
|---|---|---|
| `pnpm test:coverage` | Exit 0; 705 kasus TypeScript, semua suite normal lulus | Termasuk 25 expected failure; hasil coverage tiga paket dicatat di atas |
| `pnpm test:worker` | Exit 0; 119 passed, 0 xfailed; coverage 100% | Empat peringatan deprecation Rasterio/NumPy tetap terlihat |
| `pnpm test:regressions` | Exit 1; 812 passed,26 failed lintas empat paket (frontend 12 Sep, paket lain 11 Sep) | Acceptance belum lulus; kegagalan tersebut adalah defect terbuka |
| `pnpm type-check` | Exit 0; empat task termasuk build shared | API/web/shared diperiksa; shared tests memakai tsconfig.test, test API dikecualikan hanya dari build deployment |
| `pnpm build` | Exit 0; tiga task berhasil | Build tidak membuktikan layanan DB/payment/SMS berjalan |
| `pnpm lint` | Exit 1 | Web memakai `next lint` yang dihapus Next16; API hanya echo placeholder |
| `pnpm --filter @agro-os/api test:coverage:100` | Exit 1 | Target seluruh sumber100% belum terpenuhi |
| `pnpm --filter @agro-os/web test:coverage:100` | Exit 1 | Target seluruh sumber100% belum terpenuhi |
| `pnpm --filter @agro-os/shared test:coverage:100` | Threshold100% juga aktif pada test:coverage yang lulus | Cakupan shared terpenuhi |

Build awal pada sandbox gagal mengunduh empat keluarga font Google dari `next/font`; setelah diulang dengan izin jaringan pada 11 September, build berhasil dalam 22,09 detik (satu task cache, dua dieksekusi). Peringatan opsi `eslint` usang di `next.config.mjs` tetap ada. Pemeriksaan lint yang gagal telah didokumentasikan, bukan diganti echo sukses.

Workflow `.github/workflows/qa.yml` baru berisi type-check, build, target coverage100% semua paket TS, suite worker100%, artifact coverage dan gate acceptance terpisah. **Workflow tersebut belum dijalankan pada GitHub dan akan merah pada kode saat ini**, baik karena coverage API/web belum100% maupun cacat acceptance. Tidak ada klaim CI jarak jauh sudah hijau.

## Menjalankan ulang

Node 22 dan pnpm 10.30.3 digunakan pada audit. Gunakan lingkungan development/test milik sendiri. Perintah test di bawah mengganti I/O eksternal; tidak memerlukan database produksi.

```powershell
pnpm install --frozen-lockfile
pnpm --filter @agro-os/shared build
pnpm test:coverage
pnpm type-check
pnpm build
```

Worker memerlukan Python 3.12 dan dependensi terpisah:

```powershell
py -3.12 -m venv apps/satellite-worker/.venv
apps/satellite-worker/.venv/Scripts/python.exe -m pip install -r apps/satellite-worker/requirements-dev.txt
pnpm test:worker
pnpm test:regressions
pnpm test:coverage:100
```

Di Linux, gunakan `python3.12 -m venv` dan `.venv/bin/python`; runner `scripts/qa.mjs` memilih path berdasarkan OS. `QA_PYTHON` dapat menunjuk executable Python lain. `pnpm test` dan `pnpm test:coverage` hanya mengorkestrasi tiga paket pnpm; worker selalu melalui perintah `test:worker`. `test:regressions` menjalankan keempat paket dan tetap melanjutkan paket lain setelah menemukan kegagalan.

## Artifact dan batas pembuktian

- [Snapshot ringkasan angka](coverage-summary.json) menyimpan denominator tanpa path absolut mesin; sumber aslinya `apps/api/coverage/coverage-summary.json`, `apps/web/coverage/coverage-summary.json`, `packages/shared/coverage/coverage-summary.json`, dan `apps/satellite-worker/coverage.xml`.
- Laporan HTML tersedia lokal di masing-masing folder `coverage/index.html` dan worker `htmlcov/index.html`. Keluaran coverage/log diabaikan Git; source test dan snapshot ringkasan disimpan.
- Log lokal: `qa-typescript-coverage.log`, `qa-worker.log`, `qa-regressions.log`, `qa-typecheck.log`, `qa-build.log`, `qa-lint.log`, serta strict coverage logs. Jangan menjadikan hasil eksekusi parsial sewaktu file test masih ditulis sebagai angka final.
- Belum diuji: PostgreSQL/PostGIS nyata, migration/trigger dan isolation concurrency; integrasi gateway, refund/disbursement, SMS/WA; hak akses cloud dan backup restore; e2e seluruh route; UAT pengguna dan Android/GPS/offline; akurasi satelit terhadap ground truth lintas komoditas/musim.
- Pekerjaan QA 11 September tidak mengubah implementasi produksi untuk menutupi temuan: perubahannya meliputi test, dependensi/config pengujian, runner, CI, dokumentasi dan pengecualian test dari build API. Perbaikan P1 frontend 12 September memang mengubah kode produksi, dan test-nya ditulis sebagai acceptance biasa, bukan sebagai penutup temuan. Cacat bisnis tetap menjadi pekerjaan perbaikan berikutnya; permintaan100% seluruh proyek masih terbuka.
