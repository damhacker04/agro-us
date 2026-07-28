"""Sumber citra Sentinel-2 (PRD §6.2 poin 1-2).

Port `SceneProvider` memisahkan pengambilan citra dari analitik, sehingga logika
keputusan bisa diuji tanpa kredensial Copernicus dan tanpa jaringan.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from .indices import cloud_fraction, masked_mean, ndmi, ndvi, valid_mask


@dataclass(frozen=True)
class SceneBands:
    """Band yang sudah dipotong (clip) ke poligon lahan."""

    scene_date: date
    red: np.ndarray   # B04
    nir: np.ndarray   # B08
    swir: np.ndarray  # B11
    scl: np.ndarray   # Scene Classification Layer


@dataclass(frozen=True)
class SceneStats:
    scene_date: date
    ndvi_mean: float | None
    ndmi_mean: float | None
    cloud_pct: float
    usable: bool


def summarize(bands: SceneBands, max_cloud_pct: float) -> SceneStats:
    """Ubah band mentah menjadi statistik per-poligon (satu baris satellite_observations)."""
    cloud = cloud_fraction(bands.scl)
    mask = valid_mask(bands.scl)

    if cloud > max_cloud_pct:
        # Scene dibuang seluruhnya — tetap dicatat agar jejak "kenapa tidak ada data" ada.
        return SceneStats(bands.scene_date, None, None, cloud, usable=False)

    v = masked_mean(ndvi(bands.red, bands.nir), mask)
    m = masked_mean(ndmi(bands.nir, bands.swir), mask)
    return SceneStats(bands.scene_date, v, m, cloud, usable=v is not None)


class SceneProvider(ABC):
    """Sumber citra untuk satu poligon pada rentang tanggal."""

    @abstractmethod
    def fetch(self, polygon_geojson: dict, start: date, end: date) -> list[SceneBands]:
        ...


class CopernicusProvider(SceneProvider):
    """Implementasi nyata: Copernicus Data Space (Sentinel-2 L2A, gratis).

    ⚠️ BELUM SELESAI. Kerangka autentikasi & pencarian katalog sudah ada, tetapi
    pengunduhan + clipping raster (rasterio/windowed read) masih TODO. Butuh kredensial
    `COPERNICUS_USER` / `COPERNICUS_PASSWORD`.

    Alur yang direncanakan:
      1. OAuth2 token ke identity.dataspace.copernicus.eu
      2. Cari scene lewat OData/STAC: filter footprint poligon + rentang tanggal + cloud cover
      3. Unduh band B04/B08/B11/SCL (format COG) lalu baca HANYA jendela poligon
         supaya biaya komputasi & bandwidth ditekan (PRD §6.2 poin 2)
    """

    TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    CATALOG_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"

    def __init__(self, user: str | None = None, password: str | None = None) -> None:
        self.user = user or os.getenv("COPERNICUS_USER")
        self.password = password or os.getenv("COPERNICUS_PASSWORD")

    def fetch(self, polygon_geojson: dict, start: date, end: date) -> list[SceneBands]:
        if not self.user or not self.password:
            raise RuntimeError(
                "COPERNICUS_USER / COPERNICUS_PASSWORD belum diset — "
                "gunakan SYNTHETIC_SCENES=1 untuk mode pengembangan."
            )
        raise NotImplementedError(
            "Pengunduhan & clipping raster Copernicus belum diimplementasikan. "
            "Lihat docstring kelas ini untuk alur yang direncanakan."
        )


class SyntheticProvider(SceneProvider):
    """Citra tiruan untuk pengembangan & pengujian.

    Membangkitkan kurva NDVI berbentuk siklus tanam nyata: tanah terbuka → naik →
    puncak tajuk → turun tajam saat panen, plus tutupan awan acak yang realistis
    untuk iklim tropis. Dipakai agar seluruh pipeline & aturan keputusan bisa
    diuji tanpa kredensial. TIDAK untuk produksi.
    """

    def __init__(
        self,
        plant_date: date,
        harvest_date: date,
        revisit_days: int = 5,
        cloudy_ratio: float = 0.3,
        seed: int = 42,
        grid: int = 16,
    ) -> None:
        self.plant_date = plant_date
        self.harvest_date = harvest_date
        self.revisit_days = revisit_days
        self.cloudy_ratio = cloudy_ratio
        self.rng = np.random.default_rng(seed)
        self.grid = grid

    # Masa perkecambahan: benih sudah ditanam tetapi belum terlihat dari orbit.
    # Wajib dimodelkan — tanpa ini kurva tiruan tidak punya lag yang justru
    # dikoreksi `phenology.EMERGENCE_LAG_DAYS`, sehingga pengujian menyesatkan.
    EMERGENCE_DAYS = 14

    def _ndvi_at(self, d: date) -> float:
        """Kurva fenologi: tanah terbuka → perkecambahan datar → tajuk → jatuh saat panen."""
        if d < self.plant_date:
            return 0.15
        if d >= self.harvest_date:
            return 0.18
        days = (d - self.plant_date).days
        if days < self.EMERGENCE_DAYS:
            return 0.15 + 0.05 * (days / self.EMERGENCE_DAYS)
        t = (days - self.EMERGENCE_DAYS) / 30.0
        return 0.20 + 0.60 * min(t, 1.0)

    def fetch(self, polygon_geojson: dict, start: date, end: date) -> list[SceneBands]:
        scenes: list[SceneBands] = []
        d = start
        n = self.grid
        while d <= end:
            target = self._ndvi_at(d)
            # Susun band sedemikian rupa sehingga (nir-red)/(nir+red) ≈ target.
            red = np.full((n, n), 1000.0)
            nir = red * (1 + target) / (1 - target)
            swir = nir * 0.55  # NDMI ≈ 0.29, khas tajuk sehat
            red += self.rng.normal(0, 15, (n, n))
            nir += self.rng.normal(0, 15, (n, n))

            scl = np.full((n, n), 4, dtype=int)  # 4 = vegetasi
            if self.rng.random() < self.cloudy_ratio:
                # Scene berawan: sebagian besar piksel jadi awan tinggi (kelas 9).
                frac = self.rng.uniform(0.5, 0.95)
                idx = self.rng.random((n, n)) < frac
                scl[idx] = 9

            scenes.append(SceneBands(d, red, nir, swir, scl))
            d += timedelta(days=self.revisit_days)
        return scenes
