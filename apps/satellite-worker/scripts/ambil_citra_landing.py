"""Tarik citra Sentinel-2 NYATA di atas lahan produksi untuk landing page.

Dijalankan sekali saat menyiapkan aset, BUKAN saat runtime — hasilnya berkas statis di
`apps/web/public/satelit/`. Landing page tidak boleh bergantung pada panggilan jaringan
ke AWS saat pengunjung membukanya.

Lahan acuan: poligon Tani Makmur Pujon (f24ebc69) — lahan yang punya 17 amatan layak dan
kurva NDVI lengkap dari tanah terbuka sampai senesens.

Sumber: STAC earth-search AWS Open Data. Tanpa kredensial, dan memang begitu adanya —
itu salah satu alasan verifikasi ini bisa dijanjikan tanpa biaya lisensi citra.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import zlib
import struct

import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")

STAC = "https://earth-search.aws.element84.com/v1/search"

# Poligon lahan, dari produksi.
PLOT = [112.4701, -7.8412, 112.4716, -7.8397]
# Kotak konteks ~5 km supaya lahannya terbaca sebagai bidang di dalam bentang Pujon,
# bukan sebagai petak abstrak tanpa sekitarnya.
PAD = 0.0225
BBOX = [PLOT[0] - PAD, PLOT[1] - PAD, PLOT[2] + PAD, PLOT[3] + PAD]

KELUARAN = sys.argv[1] if len(sys.argv) > 1 else "../web/public/satelit"


def cari_scene(tanggal: str, awan_maks: int = 25) -> dict | None:
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": BBOX,
        "datetime": tanggal,
        "query": {"eo:cloud_cover": {"lt": awan_maks}},
        "limit": 12,
    }
    req = urllib.request.Request(
        STAC, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        feats = json.load(r).get("features", [])
    if not feats:
        return None
    # Paling sedikit awannya, bukan paling baru: satu scene cerah lebih berharga daripada
    # scene terbaru yang setengah tertutup.
    return min(feats, key=lambda f: f["properties"].get("eo:cloud_cover", 100))


def baca_jendela(href: str, bands: int = 3) -> tuple[np.ndarray, dict]:
    with rasterio.open(href) as src:
        kiri, bawah, kanan, atas = transform_bounds("EPSG:4326", src.crs, *BBOX, densify_pts=21)
        win = from_bounds(kiri, bawah, kanan, atas, src.transform)
        data = src.read(list(range(1, bands + 1)), window=win)
        meta = {
            "crs": str(src.crs),
            "shape": [int(data.shape[1]), int(data.shape[2])],
            "bounds_4326": BBOX,
        }
    return data, meta


def tulis_png(path: str, rgb: np.ndarray) -> None:
    """PNG 8-bit tanpa PIL. rgb: (3, H, W) uint8."""
    _, h, w = rgb.shape
    baris = b"".join(
        b"\x00" + rgb[:, y, :].T.tobytes() for y in range(h)
    )

    def chunk(tipe: bytes, data: bytes) -> bytes:
        c = tipe + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(baris, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    print(f"  tulis {path} ({w}x{h}, {len(png) / 1024:.0f} KB)")


def regangkan(band: np.ndarray, lo: float = 2, hi: float = 98) -> np.ndarray:
    """Regangan persentil — citra L2A mentah selalu gelap tanpa ini."""
    v = band.astype(np.float32)
    a, b = np.percentile(v[v > 0], [lo, hi]) if (v > 0).any() else (0, 1)
    if b <= a:
        b = a + 1
    return np.clip((v - a) / (b - a), 0, 1)


def main() -> int:
    os.makedirs(KELUARAN, exist_ok=True)
    catatan: list[dict] = []

    # Puncak tajuk (NDVI 0,81) dan menjelang panen (0,31) — dua ujung kurva yang sama.
    for label, jendela in (
        ("puncak", "2026-06-15T00:00:00Z/2026-07-05T00:00:00Z"),
        ("panen", "2026-07-25T00:00:00Z/2026-08-13T00:00:00Z"),
    ):
        scene = cari_scene(jendela)
        if not scene:
            print(f"  {label}: tidak ada scene di bawah ambang awan — dilewati")
            continue
        p = scene["properties"]
        print(f"{label}: {scene['id']} | {p['datetime'][:10]} | awan {p.get('eo:cloud_cover', -1):.1f}%")

        vis, meta = baca_jendela(scene["assets"]["visual"]["href"], 3)
        rgb = np.stack([regangkan(vis[i]) for i in range(3)])
        tulis_png(f"{KELUARAN}/pujon-{label}.png", (rgb * 255).astype(np.uint8))

        # NDVI dihitung dari band aslinya, bukan diambil dari basis data — supaya angka di
        # halaman benar-benar berasal dari citra yang ditampilkan di sebelahnya.
        red, _ = baca_jendela(scene["assets"]["red"]["href"], 1)
        nir, _ = baca_jendela(scene["assets"]["nir"]["href"], 1)
        r = red[0].astype(np.float32)
        n = nir[0].astype(np.float32)
        ndvi = np.where((n + r) > 0, (n - r) / (n + r + 1e-6), 0)

        catatan.append(
            {
                "label": label,
                "sceneId": scene["id"],
                "tanggal": p["datetime"][:10],
                "awanPct": round(float(p.get("eo:cloud_cover", 0)), 1),
                "platform": p.get("platform", ""),
                "ndviRerataKotak": round(float(np.mean(ndvi)), 4),
                "ukuran": meta["shape"],
                "bbox4326": [round(x, 6) for x in BBOX],
                "plot4326": PLOT,
            }
        )

    with open(f"{KELUARAN}/sumber.json", "w", encoding="utf-8") as f:
        json.dump({"sumber": "Sentinel-2 L2A via earth-search AWS Open Data", "scene": catatan}, f,
                  indent=2, ensure_ascii=False)
    print(f"  tulis {KELUARAN}/sumber.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
