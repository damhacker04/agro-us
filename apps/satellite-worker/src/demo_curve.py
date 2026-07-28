"""Peragaan "Momen 1" (PRD §12.1): kurva NDVI NYATA dari orbit untuk satu poligon.

Menarik citra Sentinel-2 sungguhan, menghitung deret NDVI, lalu menjalankan deteksi
tanam/panen — tanpa menyentuh basis data. Dipakai untuk demo dan untuk mengalibrasi
ambang terhadap lahan yang tanggal tanamnya sudah diketahui.

    python -m src.demo_curve --start 2025-01-01 --end 2025-08-31
    python -m src.demo_curve --lng 112.6305 --lat -7.9803 --claim-plant 2025-02-10
"""

from __future__ import annotations

import argparse
import logging
from datetime import date, datetime

from .indices import MAX_CLOUD_PCT
from .phenology import Observation, classify, detect_phenology
from .providers import summarize
from .stac_provider import StacCogProvider


def square_polygon(lng: float, lat: float, size_deg: float) -> dict:
    """Poligon persegi sederhana di sekitar satu titik (untuk peragaan cepat)."""
    h = size_deg / 2
    return {
        "type": "Polygon",
        "coordinates": [[
            [lng - h, lat - h], [lng + h, lat - h],
            [lng + h, lat + h], [lng - h, lat + h],
            [lng - h, lat - h],
        ]],
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Kurva NDVI nyata dari Sentinel-2")
    p.add_argument("--lng", type=float, default=112.6305, help="bujur pusat lahan")
    p.add_argument("--lat", type=float, default=-7.9803, help="lintang pusat lahan")
    p.add_argument("--size", type=float, default=0.004, help="sisi persegi dalam derajat (~440 m)")
    p.add_argument("--start", type=str, required=True)
    p.add_argument("--end", type=str, required=True)
    p.add_argument("--max-scenes", type=int, default=30)
    p.add_argument("--claim-plant", type=str, default=None, help="klaim tanggal tanam (opsional)")
    p.add_argument("--claim-harvest", type=str, default=None, help="klaim tanggal panen (opsional)")
    a = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    poly = square_polygon(a.lng, a.lat, a.size)
    start = datetime.strptime(a.start, "%Y-%m-%d").date()
    end = datetime.strptime(a.end, "%Y-%m-%d").date()

    print(f"Poligon  : {a.lat:.4f}, {a.lng:.4f} (sisi ~{a.size * 111000:.0f} m)")
    print(f"Periode  : {start} .. {end}\n")

    scenes = StacCogProvider(max_scenes=a.max_scenes).fetch(poly, start, end)

    # Satu tanggal bisa punya beberapa scene — ambil yang paling sedikit awannya.
    best: dict[date, object] = {}
    for s in scenes:
        st = summarize(s, MAX_CLOUD_PCT)
        prev = best.get(st.scene_date)
        if prev is None or st.cloud_pct < prev.cloud_pct:  # type: ignore[attr-defined]
            best[st.scene_date] = st

    stats = sorted(best.values(), key=lambda x: x.scene_date)  # type: ignore[attr-defined]
    obs = [
        Observation(s.scene_date, s.ndvi_mean or 0.0, s.ndmi_mean, s.cloud_pct,
                    s.usable and s.ndvi_mean is not None)
        for s in stats
    ]

    print(f"\n{'tanggal':12s} {'awan%':>7s} {'NDVI':>7s}  kurva")
    print("-" * 46)
    for s in stats:
        nd = f"{s.ndvi_mean:.3f}" if s.ndvi_mean is not None else "  --  "
        fill = "#" * int(max(s.ndvi_mean or 0, 0) * 25)
        print(f"{str(s.scene_date):12s} {s.cloud_pct:>6.1f}% {nd:>7s}  {fill}")

    layak = sum(1 for o in obs if o.usable)
    print(f"\nCitra layak: {layak}/{len(obs)}")

    ph = detect_phenology(obs)
    print(f"Deteksi    : tanam {ph.detected_plant_date} | panen {ph.detected_harvest_date}")
    print(f"Alasan     : {ph.reason}")

    if a.claim_plant or a.claim_harvest:
        cp = datetime.strptime(a.claim_plant, "%Y-%m-%d").date() if a.claim_plant else None
        ch = datetime.strptime(a.claim_harvest, "%Y-%m-%d").date() if a.claim_harvest else None
        v = classify(obs, cp, ch)
        print(f"\nKlaim Tenant: tanam {cp} | panen {ch}")
        print(f"VONIS       : {v.status}")
        print(f"              selisih tanam {v.plant_diff_days} hari, panen {v.harvest_diff_days} hari")
        print(f"              {v.reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
