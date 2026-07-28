"""Provider citra Sentinel-2 L2A nyata lewat STAC + COG (PRD §6.2 poin 1-2).

CATATAN PENYIMPANGAN DARI PRD
-----------------------------
PRD §6.4 menyebut "Copernicus Data Space". Implementasi ini memakai katalog STAC
yang menyajikan **produk Sentinel-2 L2A ESA yang identik** dalam format COG
(Cloud-Optimized GeoTIFF), dengan default ke Earth Search (AWS Open Data).

Alasannya teknis, bukan preferensi:
  1. COG memungkinkan *windowed read* lewat HTTP range request — hanya piksel di
     dalam poligon yang diunduh. Terbukti: 8x8 piksel dari citra 121 MP.
     Produk SAFE di CDSE berbentuk arsip ~1 GB yang harus diunduh utuh.
  2. Earth Search tidak butuh kredensial, sehingga verifikasi bisa langsung jalan
     tanpa menunggu pendaftaran akun.
  3. Datanya sama-sama Sentinel-2 L2A dari ESA — hanya jalur aksesnya berbeda.

Set `STAC_URL` ke katalog CDSE bila kelak ingin memakai jalur resmi Copernicus.
"""

from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime
from typing import Any

import numpy as np
import rasterio
import requests
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.warp import transform_bounds, transform_geom
from rasterio.windows import from_bounds

from .providers import SceneBands, SceneProvider

log = logging.getLogger(__name__)

DEFAULT_STAC_URL = "https://earth-search.aws.element84.com/v1/search"
DEFAULT_COLLECTION = "sentinel-2-l2a"

# Nama aset di katalog Earth Search. CDSE STAC memakai penamaan band (B04/B08/B11/SCL),
# jadi disediakan alias agar keduanya bisa dipakai.
ASSET_ALIASES: dict[str, tuple[str, ...]] = {
    "red": ("red", "B04", "b04"),
    "nir": ("nir", "B08", "b08"),
    "swir": ("swir16", "B11", "b11"),
    "scl": ("scl", "SCL"),
}

# Pengaturan GDAL agar akses COG lewat HTTP efisien: jangan daftar isi direktori,
# dan hanya ambil ekstensi yang relevan.
GDAL_ENV = {
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.TIF",
    "GDAL_HTTP_MAX_RETRY": "3",
    "GDAL_HTTP_RETRY_DELAY": "1",
    # Bucket sentinel-cogs bersifat publik — matikan penandatanganan S3 supaya tidak
    # mencoba mencari kredensial (sekaligus menghilangkan peringatan boto3).
    "AWS_NO_SIGN_REQUEST": "YES",
}

# Pembacaan didominasi latensi jaringan, bukan CPU, sehingga thread jauh lebih
# efektif daripada proses. Satu scene = 4 band; paralel antar-scene memberi
# percepatan terbesar.
DEFAULT_WORKERS = 6


class StacCogProvider(SceneProvider):
    """Ambil band Sentinel-2 L2A untuk satu poligon lewat pencarian STAC + windowed COG read."""

    def __init__(
        self,
        stac_url: str | None = None,
        collection: str | None = None,
        max_cloud_cover: float = 60.0,
        max_scenes: int = 60,
        timeout: int = 60,
        workers: int | None = None,
    ) -> None:
        self.stac_url = stac_url or os.getenv("STAC_URL", DEFAULT_STAC_URL)
        self.collection = collection or os.getenv("STAC_COLLECTION", DEFAULT_COLLECTION)
        # Penyaringan kasar di tingkat katalog. Penyaringan sesungguhnya tetap
        # dilakukan per-piksel memakai SCL di dalam poligon (PRD §6.2 poin 3),
        # karena tutupan awan se-scene tidak mewakili kondisi di atas lahan.
        self.max_cloud_cover = max_cloud_cover
        self.max_scenes = max_scenes
        self.timeout = timeout
        self.workers = workers or int(os.getenv("STAC_WORKERS", DEFAULT_WORKERS))

    # ---------------- pencarian katalog ----------------

    def search(self, polygon_geojson: dict, start: date, end: date) -> list[dict[str, Any]]:
        """Cari scene, dengan PAGINASI dan urutan kronologis yang dijamin.

        ⚠️ Keduanya wajib, bukan penyempurnaan. Tanpa `sortby` + paginasi, `limit`
        memotong hasil menurut urutan bawaan server: permintaan Januari-Agustus bisa
        hanya mengembalikan Juni-Agustus. Deteksi lalu berjalan di atas potongan musim
        dan melaporkan "awal siklus tidak teramati" — vonis salah yang tampak masuk akal.
        """
        body: dict[str, Any] = {
            "collections": [self.collection],
            "intersects": polygon_geojson,
            "datetime": f"{start.isoformat()}T00:00:00Z/{end.isoformat()}T23:59:59Z",
            # Ukuran halaman, bukan total. Total dibatasi `max_scenes` di bawah.
            "limit": min(self.max_scenes, 100),
            "query": {"eo:cloud_cover": {"lt": self.max_cloud_cover}},
            "sortby": [{"field": "properties.datetime", "direction": "asc"}],
        }

        feats: list[dict[str, Any]] = []
        url, payload = self.stac_url, body
        while url and len(feats) < self.max_scenes:
            resp = requests.post(url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            page = resp.json()
            feats.extend(page.get("features", []))

            nxt = next((l for l in page.get("links", []) if l.get("rel") == "next"), None)
            if not nxt:
                break
            url = nxt.get("href", self.stac_url)
            # Earth Search mengirim badan permintaan halaman berikutnya di `body`.
            payload = {**body, **(nxt.get("body") or {})}

        if len(feats) > self.max_scenes:
            log.warning(
                "    hasil dipotong ke %d dari %d scene — perlebar max_scenes bila musim terpotong",
                self.max_scenes,
                len(feats),
            )
            feats = feats[: self.max_scenes]

        # Jaring pengaman: jangan bergantung pada server menghormati sortby.
        feats.sort(key=lambda f: f["properties"]["datetime"])
        return feats

    @staticmethod
    def _asset_href(feature: dict, key: str) -> str | None:
        assets = feature.get("assets", {})
        for name in ASSET_ALIASES[key]:
            if name in assets and assets[name].get("href"):
                return assets[name]["href"]
        return None

    # ---------------- pembacaan raster ----------------

    def _read_clipped(self, href: str, polygon_geojson: dict, out_shape: tuple[int, int] | None, categorical: bool):
        """Baca HANYA jendela poligon, lalu tutup piksel di luar batas poligon.

        `out_shape` menyamakan grid antar-band: B11/SCL beresolusi 20 m sedangkan
        B04/B08 10 m. Tanpa penyamaan ini bentuk array tidak cocok dan NDMI salah hitung.
        """
        with rasterio.open(href) as src:
            bounds = transform_bounds("EPSG:4326", src.crs, *_bbox(polygon_geojson))
            win = from_bounds(*bounds, transform=src.transform)

            kwargs: dict[str, Any] = {"window": win, "boundless": True, "fill_value": 0}
            if out_shape is not None:
                kwargs["out_shape"] = out_shape
                # Nearest untuk data kategorik (SCL) — interpolasi akan mengarang kelas
                # yang tidak pernah ada.
                kwargs["resampling"] = Resampling.nearest if categorical else Resampling.bilinear

            data = src.read(1, **kwargs)
            win_transform = src.window_transform(win)
            if out_shape is not None and data.shape != (0, 0):
                # Skala transform mengikuti out_shape agar mask poligon tetap presisi.
                sx = (win.width or 1) / max(data.shape[1], 1)
                sy = (win.height or 1) / max(data.shape[0], 1)
                win_transform = win_transform * rasterio.Affine.scale(sx, sy)

            geom = transform_geom("EPSG:4326", src.crs, polygon_geojson)
            try:
                outside = geometry_mask([geom], out_shape=data.shape, transform=win_transform, invert=False)
            except ValueError:
                # Poligon lebih kecil dari satu piksel — pakai seluruh jendela apa adanya.
                outside = np.zeros(data.shape, dtype=bool)

        return data, outside

    def _read_scene(self, feature: dict, polygon_geojson: dict) -> SceneBands | None:
        hrefs = {k: self._asset_href(feature, k) for k in ("red", "nir", "swir", "scl")}
        if not all(hrefs.values()):
            log.warning("    scene %s dilewati: band tidak lengkap", feature.get("id"))
            return None

        scene_date = datetime.fromisoformat(
            feature["properties"]["datetime"].replace("Z", "+00:00")
        ).date()

        try:
            # Band 10 m dibaca lebih dulu — bentuknya menjadi acuan grid band lain.
            red, outside = self._read_clipped(hrefs["red"], polygon_geojson, None, categorical=False)
            if red.size == 0:
                return None
            shape = red.shape
            nir, _ = self._read_clipped(hrefs["nir"], polygon_geojson, shape, categorical=False)
            swir, _ = self._read_clipped(hrefs["swir"], polygon_geojson, shape, categorical=False)
            scl, _ = self._read_clipped(hrefs["scl"], polygon_geojson, shape, categorical=True)
        except (rasterio.errors.RasterioIOError, requests.RequestException) as e:
            log.warning("    scene %s gagal dibaca: %s", feature.get("id"), e)
            return None

        # Piksel di luar poligon ditandai kelas 0 (no-data) agar ikut dibuang oleh
        # penyaring SCL — sekaligus memenuhi "clip ke poligon" PRD §6.2 poin 2.
        scl = np.where(outside, 0, scl)
        return SceneBands(scene_date, red, nir, swir, scl)

    def fetch(self, polygon_geojson: dict, start: date, end: date) -> list[SceneBands]:
        features = self.search(polygon_geojson, start, end)
        log.info("    STAC: %d scene dalam %s..%s", len(features), start, end)
        if not features:
            return []

        scenes: list[SceneBands] = []
        with rasterio.Env(**GDAL_ENV):
            with ThreadPoolExecutor(max_workers=self.workers) as pool:
                futures = {pool.submit(self._read_scene, f, polygon_geojson): f for f in features}
                for fut in as_completed(futures):
                    scene = fut.result()
                    if scene is not None:
                        scenes.append(scene)

        # Urutan kronologis wajib dipulihkan: hasil paralel datang tidak berurutan,
        # sedangkan deteksi fenologi membaca deret secara berurutan.
        scenes.sort(key=lambda s: s.scene_date)
        log.info("    terbaca: %d/%d scene", len(scenes), len(features))
        return scenes


def _bbox(geojson: dict) -> tuple[float, float, float, float]:
    """Bounding box poligon GeoJSON (lng/lat)."""
    coords = geojson["coordinates"][0]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return min(xs), min(ys), max(xs), max(ys)
