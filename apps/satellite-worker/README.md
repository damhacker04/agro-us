# satellite-worker

Job **harian** verifikasi satelit (PRD §6.2, FR-4.4/4.5). Bukan paket pnpm — dijalankan
sebagai scheduled job terpisah, **tidak sinkron** dengan request API.

```bash
python -m venv .venv && .venv/Scripts/activate      # Windows
pip install -r requirements.txt
cp .env.example .env                                 # samakan DATABASE_URL dgn apps/api

SYNTHETIC_SCENES=1 python -m src.main                # mode pengembangan (tanpa kredensial)
python -m src.main                                   # mode nyata (butuh Copernicus)
pytest                                               # 12 uji aturan keputusan
```

## Alur

```
batch aktif → jendela amatan dari klaim → ambil scene Sentinel-2
  → buang piksel awan (SCL) & scene tutupan awan >40%
  → NDVI/NDMI → satellite_observations
  → deteksi tanam/panen → bandingkan klaim → batches.verification_status
```

## Struktur

| Berkas | Isi |
|---|---|
| `indices.py` | NDVI/NDMI, penyaringan SCL, fraksi awan |
| `phenology.py` | **Deteksi tanam/panen + aturan keputusan** — bagian paling kritis |
| `providers.py` | Port `SceneProvider`: `CopernicusProvider` (nyata) & `SyntheticProvider` (dev) |
| `repository.py` | Baca poligon, tulis observasi & status verifikasi |
| `main.py` | Orkestrasi job harian |

## Dua koreksi yang TIDAK ada di PRD — dan penting

**1. Lag perkecambahan (`EMERGENCE_LAG_DAYS`).**
PRD §6.2 menulis *"titik tanam dideteksi dari kenaikan tajam indeks vegetasi"*. Masalahnya,
**satelit tidak bisa melihat benih** — NDVI tetap setara tanah terbuka selama ~2 minggu
sampai tanaman muncul. Tanpa koreksi, Tenant **jujur** pun terhitung meleset ~15 hari dan
jatuh ke `PERLU_DITINJAU`: menuduh yang benar sekaligus membanjiri antrean operator.
Nilai 14 hari masih generik; kalibrasi per komoditas (§6.2 poin 6) adalah moat teknis
yang sesungguhnya — kangkung jauh lebih cepat muncul daripada cabai atau apel.

**2. Deteksi memakai PERLINTASAN AMBANG, bukan lonjakan antar-citra.**
Syarat "kenaikan ≥0,15 antar pengamatan" tidak akan pernah terpicu pada data nyata:
revisit Sentinel-2 ~5 hari sementara sayuran butuh ~30 hari mencapai tajuk, jadi lonjakan
antar-citra hanya ~0,10.

## Aturan keputusan (FR-4.5)

| Kondisi | Status |
|---|---|
| Selisih klaim vs deteksi ≤ 7 hari | `TERVERIFIKASI` |
| 8–21 hari | `PERLU_DITINJAU` |
| > 21 hari | `TIDAK_SESUAI` |
| Citra layak < 4 (awan tebal) atau lahan < 0,1 ha | `TIDAK_DAPAT` |
| Langganan tidak aktif, ada bukti foto | `FOTO_SAJA` |

Status ditentukan **selisih TERBURUK** — tanggal tanam tepat tapi panen meleset jauh tetap
menurunkan derajat.

Dua hal yang sengaja **tidak** dilakukan:
- **Tidak menebak** saat data kurang → `TIDAK_DAPAT` (PRD §5.4.3: jujur atas keraguan sendiri).
- **Tidak menuduh** tanaman muda sebagai "lahan tidak ditanami" — dibedakan dari lahan yang
  benar-benar kosong sepanjang siklus. Status ini tampil ke pembeli (FR-4.6), salah kata
  merusak reputasi Tenant yang tidak bersalah.

## Langganan (FR-9.1/9.3)

Verifikasi satelit adalah fitur berlangganan. Namun batch yang **PO-nya sudah terjual tetap
diverifikasi** meski langganan lapse — itu kewajiban kepada pembeli yang sudah membayar,
bukan benefit Tenant.

## Sumber citra: STAC + COG (sudah berjalan dengan data NYATA)

`StacCogProvider` menarik Sentinel-2 L2A sungguhan lewat katalog STAC, lalu membaca
**hanya jendela poligon** dari Cloud-Optimized GeoTIFF via HTTP range request.

Terbukti pada citra nyata Malang:

| | |
|---|---|
| Windowed read | **8x8 piksel** diambil dari citra **121 megapiksel** |
| Contoh scene | `S2B_49MFM_20260726`, tutupan awan 3,6% |
| CRS scene | EPSG:32749 (UTM 49S) — ditransformasi dari poligon EPSG:4326 |
| Citra layak (tropis) | **44-52%** sisanya tertutup awan — sesuai kekhawatiran PRD §5.4.3 |
| Waktu baca | ~9 detik/scene (4 band), paralel 6 thread |

Resolusi band disamakan otomatis: **B11/SCL 20 m** di-resample ke grid **B04/B08 10 m**
(`nearest` untuk SCL karena kategorik, `bilinear` untuk reflektansi). Tanpa penyamaan ini
bentuk array tidak cocok dan NDMI salah hitung.

Job bersifat **inkremental** — hanya menarik scene yang belum tersimpan. Tanpa itu,
seluruh riwayat dibaca ulang tiap hari dan job jadi tidak terpakai begitu lahan bertambah.

### Penyimpangan sadar dari PRD

PRD §6.4 menyebut "Copernicus Data Space". Implementasi memakai katalog STAC yang
menyajikan **produk Sentinel-2 L2A ESA yang identik** dalam format COG, default ke
Earth Search (AWS Open Data). Alasannya: produk SAFE di CDSE berbentuk arsip ~1 GB yang
harus diunduh utuh, sedangkan COG memungkinkan windowed read; dan Earth Search tidak
butuh kredensial sehingga verifikasi bisa langsung jalan. Set `STAC_URL` ke katalog CDSE
bila ingin memakai jalur resmi Copernicus.

### Peragaan kurva (PRD §12.1 "Momen 1")

```bash
python -m src.demo_curve --lng 112.585 --lat -8.045 --start 2025-02-01 --end 2025-08-31   --claim-plant 2025-03-01 --claim-harvest 2025-06-15
```

Mencetak kurva NDVI nyata + vonis terhadap klaim, tanpa menyentuh basis data. Dipakai
untuk demo **dan** untuk mengalibrasi ambang terhadap lahan yang tanggalnya sudah diketahui.

## ⚠️ Belum selesai

1. **Belum ada siklus lengkap yang terdeteksi pada data nyata.** Dua percobaan pada lahan
   Malang mengembalikan *"lahan sudah bervegetasi sejak citra pertama"* — vonis yang **benar**
   (satu lokasi ternyata vegetasi permanen, satu lagi jendelanya dimulai setelah tanam).
   Yang kurang bukan kode, melainkan **ground truth**: poligon lahan dengan tanggal tanam
   yang diketahui. Itu pekerjaan lapangan, bukan pemrograman.
2. **Ambang NDVI & `EMERGENCE_LAG_DAYS` masih generik.** Kalibrasi per komoditas & musim
   (PRD §6.2 poin 6) adalah moat teknis sesungguhnya. Jalan pintasnya: arsip Sentinel-2
   terbuka sejak 2015 — kumpulkan poligon + tanggal tanam musim lalu dari 10-20 petani,
   tarik kurva historisnya, lalu kalibrasi. Tidak perlu menunggu 2-3 musim sendiri.
3. **Mode sintetis membangun kurva DARI klaim Tenant**, sehingga selalu cenderung
   "terverifikasi". Berguna menguji pipeline, **tidak berguna menguji kejujuran Tenant**.
4. **Belum dijadwalkan** — pasang cron harian.
