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

## ⚠️ Belum selesai

1. **`CopernicusProvider` belum mengunduh raster.** Kerangka auth & katalog ada; pengunduhan
   band + clipping poligon (rasterio windowed read) masih TODO. Sampai itu selesai, **tidak ada
   verifikasi satelit sungguhan** — yang jalan baru pipeline dan aturan keputusannya.
2. **Mode sintetis membangun kurva DARI klaim Tenant**, sehingga selalu cenderung
   "terverifikasi". Berguna menguji pipeline, **tidak berguna menguji kejujuran Tenant**.
3. **Belum dijadwalkan** — pasang cron harian.
4. **Ambang NDVI & lag masih generik** — kalibrasi per komoditas & musim belum ada.
