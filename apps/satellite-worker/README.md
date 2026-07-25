# satellite-worker (Python)

Job **harian** verifikasi satelit (PRD §6.2). Bukan paket pnpm (tanpa `package.json`) — diabaikan workspace JS.
Dijalankan sebagai scheduled/cron job, **bukan** sinkron dengan request.

## Tugas
1. Tarik scene **Sentinel-2 Level-2A** (Copernicus Data Space) untuk tiap poligon lahan aktif.
2. Clip ke poligon (GeoJSON), buang piksel awan via Scene Classification Layer; scene tutupan awan > 40% dibuang.
3. Hitung deret waktu **NDVI/NDMI** per poligon per tanggal → simpan ke `SATELLITE_OBSERVATIONS`.
4. Deteksi titik tanam (kenaikan tajam) & panen (penurunan tajam), bandingkan vs klaim Tenant.
5. Set `verification_status` batch:
   - selisih < 7 hari → **TERVERIFIKASI**
   - 7–21 hari → **PERLU_DITINJAU**
   - > 21 hari → **TIDAK_SESUAI**
   - awan berlebih / lahan < 0,1 ha → **TIDAK_DAPAT**

## Stack
Python 3.11+ · rasterio · numpy · shapely · requests (Copernicus API) · psycopg (tulis ke PostgreSQL/PostGIS).

## Status: placeholder
Scaffold & pipeline dikerjakan di Sprint 7–9 (`feat/satellite-verification`).

```bash
python -m venv .venv && source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
python -m src.main   # TODO
```

## Kalibrasi = moat (PRD §6.2)
Baseline kurva vegetasi per komoditas & musim disusun dari data historis — aset teknis yang butuh waktu, sulit ditiru.
