# Bukti pengujian AgroUs — 11 September 2026

**Target 100% coverage seluruh proyek belum tercapai.** Hasil ini memakai seluruh sumber runtime setiap paket, bukan hanya daftar service yang telah diuji. Ada **814 kasus**, bertambah **769** dari baseline 45 kasus (29 API + 16 worker). Dalam mode acceptance: **785 lulus dan 29 gagal**. Cacat yang gagal belum diperbaiki dalam perubahan QA ini.

## Hasil eksekusi lokal

| Paket | Kasus | Lulus acceptance | Cacat gagal | Perilaku suite normal |
|---|---:|---:|---:|---|
| API | 563 | 548 | 15 | Vitest menampilkan 563 passed, termasuk 15 `it.fails` |
| Frontend | 137 | 127 | 10 | Vitest menampilkan 137 passed, termasuk 10 `it.fails` |
| Shared | 5 | 5 | 0 | Lima test pemetaan status→badge lulus |
| Worker satelit | 109 | 105 | 4 | 105 passed + 4 `xfail(strict=True)` |
| **Total** | **814** | **785** | **29** | **Suite normal bukan gate seluruh requirement sudah benar** |

API memiliki 35 file test, web 14, shared 1. Test baru meliputi unit service, adapter dan domain murni, serta komponen/interaksi React; ini bukan 814 skenario browser end-to-end. Terdapat lebih banyak temuan inspeksi sumber daripada 29 regresi otomatis, dan satu temuan dapat mencakup beberapa gejala. Jangan menjumlahkan baris laporan FE/BE/worker sebagai jumlah bug unik.

`it.fails`/`xfail(strict=True)` dipakai untuk menyimpan acceptance yang gagal sebagai bukti yang dapat diulang. Test tidak di-skip dan tetap mengeksekusi kode. Bila perilaku diperbaiki, unexpected pass menggagalkan suite normal supaya anotasi tersebut dihapus. `pnpm test:regressions` mengaktifkan `QA_ENFORCE_REGRESSIONS=1` pada semua paket dan menampilkan cacat sebagai kegagalan biasa. Workflow QA juga menjalankan gate ini tanpa `continue-on-error`.

## Coverage seluruh sumber

| Paket / cakupan | Baris | Statements | Fungsi | Cabang |
|---|---:|---:|---:|---:|
| API — `apps/api/src/**/*.ts` | **61,26%** — 3.805/6.211 | **61,26%** — 3.805/6.211 | **82,45%** — 235/285 | **94,63%** — 1.146/1.211 |
| Web — `apps/web/src/**/*.{ts,tsx}` | **17,21%** — 2.163/12.568 | **17,21%** — 2.163/12.568 | **67,88%** — 186/274 | **91,35%** — 507/555 |
| Shared — `packages/shared/src/**/*.ts` | **100%** — 191/191 | **100%** — 191/191 | **100%** — 1/1 | **100%** — 5/5 |
| Worker — `apps/satellite-worker/src` | **100%** — 512/512 statements Python | **100%** — 512/512 | Tidak diukur terpisah oleh coverage.py | **100%** — 108/108 |

API/web/shared memakai Vitest 3.2.7 + V8; Python memakai pytest-cov dengan branch coverage. Persentase tidak dirata-ratakan menjadi satu “coverage aplikasi”, karena instrumentasi serta denominator berbeda. V8 menghitung kode hasil transformasi dan file belum terimpor secara berbeda; jumlah cabang/fungsi yang terlihat dapat berubah ketika file mulai dieksekusi. Angka branch yang tinggi tidak berarti semua controller/halaman sudah diuji.

Test/helper test, deklarasi tipe, dependency, generated Prisma client, build output, migration SQL dan tooling infrastruktur tidak dihitung sebagai runtime `src` aplikasi. File sumber yang belum diimpor tetap dimasukkan. Tidak menambahkan ignore komentar atau mengurangi cakupan ke file yang hijau. Shared terdiri terutama atas tipe yang dihapus compiler dan konstanta; 100% shared menguji satu fungsi pemetaan, bukan seluruh kontrak JSON saat runtime.

Contoh modul yang kini mencapai 100% keempat metrik: payment, escrow, claim, settlement, courier, PoD, QR, claim-window, harvest, timeline, yield-assessment, catalog, product, batch, profil buyer/tenant, legalitas, subscription, jobs, notification, anchor, hash serta adapter storage. Beberapa modul tersebut tetap mempunyai defect acceptance; coverage dan kebenaran perilaku adalah dua ukuran berbeda.

Di FE, halaman checkout, payment, pemilihan wilayah dan komponen PenilaianPanen mencapai 100% empat metrik pada pengukuran khusus. PetaLahan mencapai 100% baris/statements/fungsi dan 98,48% cabang; sisa satu guard `<3 titik` tidak terjangkau lewat tombol yang sudah disabled. Test tidak memanggil handler privat atau memanipulasi internal React untuk menaikkan angka. Halaman besar seperti detail pesanan/produk, dashboard operator dan banyak form masih belum cukup diuji.

Worker tetap mencapai 100% saat hanya 105 test lulus dijalankan, tanpa empat regresi. Pengujian raster memakai TIFF asli di memori; layanan HTTP dan database diganti fixture. Angka itu tidak membuktikan akurasi agronomi.

## Status perintah

| Perintah | Hasil terakhir | Makna |
|---|---|---|
| `pnpm test:coverage` | Exit 0; 705 kasus TypeScript, semua suite normal lulus | Termasuk 25 expected failure; hasil coverage tiga paket dicatat di atas |
| `pnpm test:worker` | Exit 0; 105 passed + 4 xfailed; coverage100% | Empat peringatan deprecation Rasterio/NumPy tetap terlihat |
| `pnpm test:regressions` | Exit 1; 785 passed,29 failed lintas empat paket | Acceptance belum lulus; kegagalan tersebut adalah defect terbuka |
| `pnpm type-check` | Exit 0; empat task termasuk build shared | API/web/shared diperiksa; shared tests memakai tsconfig.test, test API dikecualikan hanya dari build deployment |
| `pnpm build` | Exit 0; tiga task berhasil | Build tidak membuktikan layanan DB/payment/SMS berjalan |
| `pnpm lint` | Exit 1 | Web memakai `next lint` yang dihapus Next16; API hanya echo placeholder |
| `pnpm --filter @agro-os/api test:coverage:100` | Exit 1 | Target seluruh sumber100% belum terpenuhi |
| `pnpm --filter @agro-os/web test:coverage:100` | Exit 1 | Target seluruh sumber100% belum terpenuhi |
| `pnpm --filter @agro-os/shared test:coverage:100` | Threshold100% juga aktif pada test:coverage yang lulus | Cakupan shared terpenuhi |

Build awal pada sandbox gagal mengunduh empat keluarga font Google dari `next/font`; setelah diulang dengan izin jaringan pada 11 September, build berhasil dalam22,09detik (satu task cache, dua dieksekusi). Peringatan opsi `eslint` usang di `next.config.mjs` tetap ada. Pemeriksaan lint yang gagal telah didokumentasikan, bukan diganti echo sukses.

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
- Tidak mengubah implementasi produksi untuk menutupi temuan. Perubahan meliputi test, dependensi/config pengujian, runner, CI, dokumentasi dan pengecualian test dari build API. Cacat bisnis tetap menjadi pekerjaan perbaikan berikutnya; permintaan100% seluruh proyek masih terbuka.
