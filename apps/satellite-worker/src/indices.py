"""Perhitungan indeks vegetasi dari band Sentinel-2 (PRD §6.2 poin 3-4).

Band Level-2A yang dipakai (resolusi 10-20 m):
    B04 = Merah        B08 = NIR         B11 = SWIR-1
    SCL = Scene Classification Layer (klasifikasi per piksel)
"""

from __future__ import annotations

import numpy as np

# Kelas SCL yang HARUS dibuang sebelum menghitung indeks (PRD §6.2 poin 3).
# Referensi kelas Sentinel-2 L2A:
#   0 no-data · 1 saturated/defective · 3 cloud shadow
#   8 cloud medium prob · 9 cloud high prob · 10 thin cirrus
SCL_INVALID = (0, 1, 3, 8, 9, 10)

# Scene dengan tutupan awan melebihi ambang ini dibuang seluruhnya (PRD §6.2).
MAX_CLOUD_PCT = 40.0


def cloud_fraction(scl: np.ndarray) -> float:
    """Persentase piksel tak terpakai di dalam poligon (0-100)."""
    if scl.size == 0:
        return 100.0
    invalid = np.isin(scl, SCL_INVALID)
    return float(invalid.sum()) / float(scl.size) * 100.0


def valid_mask(scl: np.ndarray) -> np.ndarray:
    """True untuk piksel yang layak dipakai."""
    return ~np.isin(scl, SCL_INVALID)


def _safe_ratio(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """(a-b)/(a+b) dengan pembagian nol diamankan menjadi NaN."""
    num = a.astype(np.float64) - b.astype(np.float64)
    den = a.astype(np.float64) + b.astype(np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.where(den == 0, np.nan, num / den)
    return out


def ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """NDVI = (NIR - Merah) / (NIR + Merah). Rentang wajar -1..1."""
    return _safe_ratio(nir, red)


def ndmi(nir: np.ndarray, swir: np.ndarray) -> np.ndarray:
    """NDMI = (NIR - SWIR) / (NIR + SWIR) — proksi kelembapan tajuk."""
    return _safe_ratio(nir, swir)


def masked_mean(index: np.ndarray, mask: np.ndarray) -> float | None:
    """Rata-rata indeks hanya pada piksel valid. None bila tidak ada piksel tersisa."""
    sel = index[mask]
    sel = sel[np.isfinite(sel)]
    if sel.size == 0:
        return None
    return float(np.mean(sel))
