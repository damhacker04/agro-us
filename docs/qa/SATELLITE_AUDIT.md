# Audit worker satelit — 10 September 2026, perbaikan 12 September 2026

Audit kode, requirement, dan pengujian lokal; tidak memanggil katalog satelit daring atau menulis database. Semua `apps/satellite-worker/src` dibaca. Skrip pembuat aset `scripts/ambil_citra_landing.py` diperiksa sebagai alat persiapan demo, di luar cakupan coverage runtime `src`.

> **Status per 12 September 2026.** Keempat defect P1 (SAT-01..SAT-04) sudah diperbaiki dan penanda `xfail(strict=True)` dihapus; acceptance-nya kini test biasa yang harus tetap hijau. Bagian "Empat bug" di bawah dipertahankan sebagai catatan apa yang salah dan bagaimana diperbaiki, bukan sebagai daftar cacat terbuka. **Gap requirement, bukti ilmiah, dan operasional di bawahnya belum berubah** — perbaikan ini tidak menambah satu pun bukti lapangan.

## Hasil pengujian yang benar-benar dijalankan

Python 3.12.2, pytest 9.1.1, pytest-cov 7.1.0, coverage.py 7.16.0 pada Windows.

Suite awal berisi 16 test fenologi. Pada audit 10 September: 105 test lulus dan 4 acceptance test tercatat `xfail(strict=True)` karena bug yang masih ada; audit itu sendiri tidak mengubah perilaku produksi. Setelah perbaikan 12 September: **119 test lulus, nol xfail, nol skip**, dan perilaku produksi memang berubah — lihat "Perbaikan yang diterapkan".

Coverage setelah perbaikan (angka 10 September dalam kurung bila berbeda):

| Modul `src` | Statement terjangkau | Branch terjangkau | Coverage |
|---|---:|---:|---:|
| `demo_curve.py` | 59/59 | 10/10 | 100% |
| `indices.py` | 30/30 (27) | 4/4 | 100% |
| `main.py` | 99/99 (82) | 30/30 (24) | 100% |
| `phenology.py` | 92/92 | 30/30 | 100% |
| `providers.py` | 79/79 (78) | 14/14 | 100% |
| `repository.py` | 61/61 (60) | 2/2 | 100% |
| `stac_provider.py` | 132/132 (114) | 28/28 (24) | 100% |
| **Total** | **552/552** (512) | **118/118** (108) | **100,00%** |

`__init__.py` kosong. Tidak ada `omit` atau `pragma: no cover` yang ditambahkan. Jalur minimum kenaikan NDVI yang tidak terpicu oleh ambang generik saat ini diuji dengan konfigurasi ambang lebih ketat melalui monkeypatch, untuk memeriksa perilaku ketika kalibrasi komoditas berubah. CLI guard juga dijalankan secara offline.

Verifikasi tambahan pada audit 10 September: menjalankan hanya 105 test yang lulus, tanpa empat regression test, tetap menghasilkan **100%** — jadi coverage tidak pernah bergantung pada eksekusi test yang sengaja gagal. Empat peringatan deprecation berasal dari kombinasi pembacaan Rasterio 1.5.0 dengan NumPy 2.5.1; tidak disembunyikan dan masih muncul setelah perbaikan.

Coverage mengukur keterjangkauan kode; **bukan** bukti akurasi prediksi tanaman, kelulusan seluruh requirement, keberhasilan SQL pada PostgreSQL/PostGIS produksi, atau integrasi API. HTTP dan koneksi database dimock; pembacaan/resampling raster juga diuji memakai TIFF sungguhan di memori. Fixture menolak koneksi HTTP/database yang tidak sengaja dibuat dan tidak memuat `.env` asli.

## Empat bug yang dapat direproduksi — **sudah diperbaiki 12 September 2026**

Kolom "Bukti kode" menunjuk baris **sebelum** perbaikan (commit 254ffa3); nomor baris terkini ada di tabel "Perbaikan yang diterapkan".

| ID | Prioritas | Bukti kode (pra-perbaikan) | Dampak / hasil acceptance test saat ditemukan |
|---|---|---|---|
| SAT-01 | P1 | `apps/satellite-worker/src/main.py:116`, `repository.py:155`, `phenology.py:105` | Observasi dibaca berdasarkan lahan tanpa batas tanggal batch; detektor memilih tajuk pertama dalam seluruh riwayat. Fixture musim 2024 + klaim benar musim 2025 menghasilkan `TIDAK_SESUAI`, padahal seharusnya memeriksa musim 2025. Puncak NDVI untuk pita kewajaran juga dapat berasal dari siklus yang salah. |
| SAT-02 | P1 | `apps/satellite-worker/src/main.py:73`, `repository.py:32`, PRD `docs/PRD.md:315` | Ketika langganan tidak aktif dan PO tidak terjual, worker menimpa badge historis menjadi `FOTO_SAJA` atau `TIDAK_DAPAT`; tidak ada status sebelumnya dalam `ActiveBatch`. Acceptance test menunjukkan `TERVERIFIKASI` berubah menjadi `FOTO_SAJA`, melanggar permanensi badge FR-9.2. |
| SAT-03 | P1 | `apps/satellite-worker/src/stac_provider.py:208`, `indices.py:22`, `providers.py:41` | Piksel di luar poligon diberi SCL 0 lalu ikut penyebut/pembilang fraksi awan. Contoh lahan cerah yang mengisi separuh bounding box mendapat cloud 50% dan ditolak. Harus membedakan domain poligon dengan piksel tidak valid di dalam poligon. |
| SAT-04 | P1 | `apps/satellite-worker/src/stac_provider.py:116`, `main.py:93`, `main.py:172` | HTTPError dari pencarian STAC tidak termasuk exception yang ditangani `process_batch`. Satu kegagalan katalog dapat menghentikan loop batch harian, bukan menghasilkan `SKIPPED` lalu meneruskan batch lain. |

Reproduksi tetap berada di `apps/satellite-worker/tests/test_known_regressions.py`. Pada audit 10 September file itu mencatat empat `xfailed` di mode biasa dan **4 failed** di mode acceptance ketat. Sejak 12 September keempatnya adalah test biasa yang lulus di kedua mode; penanda `xfail(strict=True)` dan sakelar `QA_ENFORCE_REGRESSIONS` dihapus dari file ini supaya tidak ada `XPASS` yang menyesatkan.

### Perbaikan yang diterapkan

| ID | Perubahan | Berkas |
|---|---|---|
| SAT-01 | `load_observations` menerima jendela batch dan menyaringnya di SQL (`scene_date BETWEEN`); `process_batch` memegang `window_start`/`window_end` utuh — `start` boleh maju karena inkremental, penilaian tidak — dan menyaring ulang baris di batas keputusan sebelum `classify`. | `repository.py:162`, `main.py:111`, `main.py:150` |
| SAT-02 | `ActiveBatch` membawa `verification_status` yang sedang tersimpan (dari SQL). Jalur "tanpa citra" lewat `record_without_imagery`: badge dalam `ISSUED_BADGES` (`TERVERIFIKASI`/`PERLU_DITINJAU`/`TIDAK_SESUAI`) tidak pernah ditimpa, dan status yang tidak berubah tidak ditulis ulang. Berlaku untuk langganan lapse **dan** lahan `TERBATAS`. | `repository.py:49`, `main.py:47`, `main.py:76` |
| SAT-03 | Domain poligon dibawa terpisah sebagai `SceneBands.inside`, bukan dilebur menjadi SCL 0. `cloud_fraction`/`valid_mask` menerima mask itu, sehingga padding bounding box keluar dari pembilang maupun penyebut; jendela yang meleset dari poligon tetap menghasilkan 100%. | `stac_provider.py:231`, `providers.py:46`, `indices.py:22` |
| SAT-04 | `requests.RequestException` masuk exception yang ditangani `process_batch` → `SKIPPED`. Loop `main()` mengisolasi tiap batch, mencatat `GAGAL`, dan mengembalikan kode keluar **2** untuk hasil parsial agar scheduler tidak hijau semu. `search()` mengulang paling banyak 3 kali dengan backoff, hanya untuk gangguan sementara — 4xx tidak diulang karena itu bug konfigurasi kita sendiri. | `main.py:126`, `main.py:200`, `stac_provider.py:70` |

Batas perbaikan ini: semuanya diuji offline dengan HTTP dan database dimock. Tidak ada satu pun yang diverifikasi terhadap katalog Sentinel-2 daring, PostgreSQL/PostGIS produksi, atau lahan nyata. Perbaikan SAT-01 dan SAT-02 mengubah kontrak `Repository`, jadi jalankan sekali terhadap salinan database sungguhan sebelum diandalkan — `b.verification_status` kini ikut diseleksi dan `load_observations` punya dua parameter baru.

## Gap requirement, bukti ilmiah, dan operasional

- **Ambang tujuh hari tidak konsisten.** `docs/PRD.md:351` menetapkan `< 7` sebagai terverifikasi dan `7–21` ditinjau; `phenology.py:51` dan klasifikasi `:212` menggunakan `<= 7`, sesuai README serta test lama. Tetapkan satu keputusan produk sebelum mengubah implementasi/test boundary.
- **Baseline generik.** `phenology.py:19` dan `phenology.py:45` memakai ambang vegetasi serta lag tumbuh 14 hari yang sama; tidak ada pemilihan kalibrasi per komoditas/musim di detektor. PRD `docs/PRD.md:359` mensyaratkan validasi baseline dengan penyuluh/BPS. Ini tidak dapat diselesaikan dengan menaikkan code coverage.
- **NDVI/NDMI adalah analitik indeks dan detektor ambang berbasis aturan.** Worker ini tidak berisi model ML terlatih, training, dataset label, atau evaluasi model. Untuk rubrik lomba yang menilai AI, jelaskan penggunaan AI dalam proses pengembangan secara terpisah dari analitik satelit produk; jangan menyebut worker sebagai AI terlatih tanpa implementasi/bukti tambahan.
- **Provenance demo belum konsisten.** README worker `:124` menyatakan belum ada siklus lengkap pada data nyata, tetapi `scripts/ambil_citra_landing.py:6` mengklaim 17 observasi layak dan kurva Pujon lengkap. `apps/web/public/satelit/sumber.json` memuat identitas dua scene dan aset citra; ini bukti aset yang mencatat sumber, bukan laporan akurasi tanggal tanam/panen yang diverifikasi lapangan. `apps/api/prisma/seed-demo.ts:283` mengisi badge secara langsung dan `:340` menyiapkan deret NDVI demo. Jangan memakai badge/kurva hasil seed sebagai pembuktian validasi independen. Satukan dokumentasi dengan dataset ground truth bertanggal, log sumber scene, error tanggal deteksi, dan hasil target Fase 0 minimal dua dari tiga lahan (`docs/PRD.md:443`). Audit ini tidak memeriksa katalog atau database produksi secara langsung.
- **Scheduler ada, aktivasi produksi belum terbukti.** `.github/workflows/satellite-verify.yml:22` sudah menjadwalkan 19:00 UTC / 02:00 WIB. Jika secret database kosong, cabang terjadwal keluar hijau tanpa verifikasi (`:77`); status hijau sendiri tidak membuktikan job memproses data. README yang sebelumnya menyebut belum dijadwalkan sudah dikoreksi pada audit ini. Periksa log eksekusi, jumlah batch/observasi, last-success, dan alert keterlambatan; status secret aktual tidak diaudit.
- **Batch selesai lama tidak benar-benar dipangkas.** Docstring `repository.py:55` menyatakan batch yang lama selesai dilewati, tetapi SQL `:88` memilih semua `HARVESTED` tanpa batas umur. Tambahkan definisi selesai/retensi dan beban kerja terukur agar biaya scan tidak terus bertambah.
- **Inkremental per lahan dapat melewati backfill.** `main.py:83` menggunakan MAX tanggal seluruh lahan. Batch baru dengan jendela lebih tua atau scene lama yang sebelumnya gagal baca tidak otomatis diambil ulang jika sudah ada observasi lebih baru. Dibutuhkan strategi backfill/periode kelengkapan dan kebijakan retry, bukan hanya tanggal maksimum.
- **Akses CDSE belum setara penuh.** Default runtime adalah `StacCogProvider` Earth Search; `CopernicusProvider.fetch` di `providers.py:80` masih eksplisit `NotImplementedError`. Itu bukan kegagalan default runtime, tetapi README/diagram harus menyebut sumber nyata yang digunakan dan migrasi endpoint CDSE perlu integration test pagination/assets/auth.
- **Dependensi belum terkunci penuh.** `requirements.txt` memakai batas minimum versi. Hasil audit menunjukkan warning kompatibilitas; untuk demo yang dapat direproduksi, gunakan constraints/lock yang diuji di Linux CI dan Windows, tanpa menganggap test lokal membuktikan semua versi masa depan.

## Penilaian struktur kode

Pemisahan `indices` (matematika), `phenology` (aturan keputusan), provider (akses citra), repository (SQL), dan `main` (orkestrasi) sudah jelas dan memungkinkan unit test tanpa layanan eksternal. Dataclass serta `SceneProvider` memberi kontrak yang mudah dibaca. Inkremental, pemilihan scene paling cerah per hari, resampling kategori nearest, query SQL berparameter, dan upsert idempoten adalah fondasi yang baik.

Namun orkestrasi masih memilih provider melalui environment/global factory, logika langganan terbelah antara SQL dan worker, dan status verifikasi ditulis langsung lintas batas layanan API. Belum ada provenance hasil/verdict yang cukup untuk menjamin badge permanen dan membedakan data sintetis dari data nyata. Struktur ini layak dilanjutkan, tetapi belum layak dinyatakan sepenuhnya memenuhi SOLID atau semua diagram.

## Menjalankan ulang

Dari `apps/satellite-worker` pada PowerShell:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest -q          # 119 lulus, 100% coverage

# Regression guard SAT-01..SAT-04 saja.
.venv/Scripts/python.exe -m pytest tests/test_known_regressions.py --no-cov -q
```

`QA_ENFORCE_REGRESSIONS=1` tetap dipakai paket lain di repo ini, tetapi sudah tidak mengubah hasil worker satelit karena tidak ada lagi defect yang ditandai di sini.

Konfigurasi `pytest.ini` mengukur semua `src`, branch coverage, dan `fail-under=100`; menghasilkan `coverage.xml` dan `htmlcov/index.html`. Workflow `satellite-verify.yml` memasang `requirements-dev.txt` dan mencache kedua file requirement. Audit 10 September tidak mengubah perilaku produksi; perbaikan 12 September **mengubahnya secara sengaja dan tercatat di tabel atas** — tidak ada defect yang ditutup tanpa perubahan kode.
