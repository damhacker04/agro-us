# Audit worker satelit — 10 September 2026

Audit kode, requirement, dan pengujian lokal; tidak memanggil katalog satelit daring atau menulis database. Semua `apps/satellite-worker/src` dibaca. Skrip pembuat aset `scripts/ambil_citra_landing.py` diperiksa sebagai alat persiapan demo, di luar cakupan coverage runtime `src`.

## Hasil pengujian yang benar-benar dijalankan

Python 3.12.2, pytest 9.1.1, pytest-cov 7.1.0, coverage.py 7.16.0 pada Windows. Suite awal berisi 16 test fenologi; kini 105 test lulus dan 4 acceptance test tercatat sebagai `xfail(strict=True)` karena bug yang masih ada. Tidak ada perubahan perilaku produksi pada audit ini.

| Modul `src` | Statement terjangkau | Branch terjangkau | Coverage |
|---|---:|---:|---:|
| `demo_curve.py` | 59/59 | 10/10 | 100% |
| `indices.py` | 27/27 | 4/4 | 100% |
| `main.py` | 82/82 | 24/24 | 100% |
| `phenology.py` | 92/92 | 30/30 | 100% |
| `providers.py` | 78/78 | 14/14 | 100% |
| `repository.py` | 60/60 | 2/2 | 100% |
| `stac_provider.py` | 114/114 | 24/24 | 100% |
| **Total** | **512/512** | **108/108** | **100,00%** |

`__init__.py` kosong. Tidak ada `omit` atau `pragma: no cover` yang ditambahkan. Jalur minimum kenaikan NDVI yang tidak terpicu oleh ambang generik saat ini diuji dengan konfigurasi ambang lebih ketat melalui monkeypatch, untuk memeriksa perilaku ketika kalibrasi komoditas berubah. CLI guard juga dijalankan secara offline.

Verifikasi tambahan: menjalankan hanya 105 test yang lulus, tanpa empat regression test, tetap menghasilkan **100%**. Jadi coverage tidak bergantung pada eksekusi test yang sengaja gagal. Empat peringatan deprecation berasal dari kombinasi pembacaan Rasterio 1.5.0 dengan NumPy 2.5.1; tidak disembunyikan.

Coverage mengukur keterjangkauan kode; **bukan** bukti akurasi prediksi tanaman, kelulusan seluruh requirement, keberhasilan SQL pada PostgreSQL/PostGIS produksi, atau integrasi API. HTTP dan koneksi database dimock; pembacaan/resampling raster juga diuji memakai TIFF sungguhan di memori. Fixture menolak koneksi HTTP/database yang tidak sengaja dibuat dan tidak memuat `.env` asli.

## Empat bug yang dapat direproduksi

| ID | Prioritas | Bukti kode | Dampak / hasil acceptance test |
|---|---|---|---|
| SAT-01 | P1 | `apps/satellite-worker/src/main.py:116`, `repository.py:155`, `phenology.py:105` | Observasi dibaca berdasarkan lahan tanpa batas tanggal batch; detektor memilih tajuk pertama dalam seluruh riwayat. Fixture musim 2024 + klaim benar musim 2025 menghasilkan `TIDAK_SESUAI`, padahal seharusnya memeriksa musim 2025. Puncak NDVI untuk pita kewajaran juga dapat berasal dari siklus yang salah. |
| SAT-02 | P1 | `apps/satellite-worker/src/main.py:73`, `repository.py:32`, PRD `docs/PRD.md:315` | Ketika langganan tidak aktif dan PO tidak terjual, worker menimpa badge historis menjadi `FOTO_SAJA` atau `TIDAK_DAPAT`; tidak ada status sebelumnya dalam `ActiveBatch`. Acceptance test menunjukkan `TERVERIFIKASI` berubah menjadi `FOTO_SAJA`, melanggar permanensi badge FR-9.2. |
| SAT-03 | P1 | `apps/satellite-worker/src/stac_provider.py:208`, `indices.py:22`, `providers.py:41` | Piksel di luar poligon diberi SCL 0 lalu ikut penyebut/pembilang fraksi awan. Contoh lahan cerah yang mengisi separuh bounding box mendapat cloud 50% dan ditolak. Harus membedakan domain poligon dengan piksel tidak valid di dalam poligon. |
| SAT-04 | P1 | `apps/satellite-worker/src/stac_provider.py:116`, `main.py:93`, `main.py:172` | HTTPError dari pencarian STAC tidak termasuk exception yang ditangani `process_batch`. Satu kegagalan katalog dapat menghentikan loop batch harian, bukan menghasilkan `SKIPPED` lalu meneruskan batch lain. |

Reproduksi tersedia di `apps/satellite-worker/tests/test_known_regressions.py`. Mode biasa secara eksplisit mencatat empat `xfailed`; mode acceptance ketat menghasilkan **4 failed**, bukan laporan sistem bebas bug.

Prioritas perbaikan: batasi observasi ke jendela setiap batch; simpan/proteksi status historis sesuai FR-9.2; bawa mask domain poligon secara terpisah; tambahkan isolasi kegagalan tiap batch, retry terbatas, dan hasil job yang membedakan sukses/parsial/gagal. Setelah diperbaiki, strict xfail akan menjadi kegagalan `XPASS` sehingga penanda bug wajib dibersihkan.

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
.venv/Scripts/python.exe -m pytest -q

# Acceptance ketat: saat audit ini empat test akan merah.
$env:QA_ENFORCE_REGRESSIONS = '1'
.venv/Scripts/python.exe -m pytest tests/test_known_regressions.py --no-cov -q
Remove-Item Env:QA_ENFORCE_REGRESSIONS
```

Konfigurasi `pytest.ini` mengukur semua `src`, branch coverage, dan `fail-under=100`; menghasilkan `coverage.xml` dan `htmlcov/index.html`. Workflow `satellite-verify.yml` diperbarui untuk memasang `requirements-dev.txt` dan mencache kedua file requirement. Semua test dan audit ini tidak mengubah hasil verifikasi produksi atau memperbaiki empat defect secara diam-diam.
