"""Job harian verifikasi satelit (FR-4.4, FR-4.5, PRD §6.2).

Alur per batch aktif:
  1. Tentukan rentang tanggal amatan dari klaim Tenant.
  2. Ambil scene Sentinel-2 untuk poligon lahan.
  3. Buang piksel awan (SCL), buang scene bertutupan awan > 40%.
  4. Hitung NDVI/NDMI → simpan ke satellite_observations.
  5. Deteksi tanggal tanam/panen dari deret, bandingkan dengan klaim.
  6. Perbarui verification_status batch.

Dijalankan terjadwal, BUKAN sinkron dengan request (PRD §6.4).

    python -m src.main                 # verifikasi semua batch aktif
    SYNTHETIC_SCENES=1 python -m src.main   # mode pengembangan tanpa kredensial
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import date, timedelta

import requests
from dotenv import load_dotenv

from .indices import MAX_CLOUD_PCT
from .phenology import Observation, classify
from .providers import SceneProvider, SyntheticProvider, summarize
from .stac_provider import StacCogProvider
from .repository import ActiveBatch, Repository

# Lahan < 0,1 ha ditandai TERBATAS saat onboarding (FR-1.6) — di bawah resolusi
# andal Sentinel-2 (10 m), jadi jangan pura-pura bisa memverifikasi.
TIER_TOO_SMALL = "TERBATAS"

# Jendela amatan di sekitar klaim. Cukup lebar untuk menangkap tanah terbuka
# sebelum tanam dan kembalinya ke tanah terbuka setelah panen.
LOOKBACK_DAYS = 45
LOOKAHEAD_DAYS = 30

# FR-9.2 — badge yang SUDAH TERBIT adalah fakta historis: buktinya sudah ter-anchor
# dan pembeli sudah membayar premium atasnya. Job yang tidak melihat citra apa pun
# (langganan lapse, lahan di bawah resolusi) tidak membawa bukti baru, jadi tidak
# berhak mencabutnya. Hanya siklus verifikasi yang benar-benar membaca citra yang
# boleh menurunkan atau mengubah nilai-nilai ini.
ISSUED_BADGES = frozenset({"TERVERIFIKASI", "PERLU_DITINJAU", "TIDAK_SESUAI"})

# Nilai balik process_batch yang berarti "tidak ada verifikasi yang dijalankan".
# Dipisahkan dari status verifikasi supaya rekap job tidak terbaca seperti vonis.
SKIPPED = "SKIPPED"
FAILED = "GAGAL"

log = logging.getLogger("satellite-worker")


def build_provider(batch: ActiveBatch) -> SceneProvider:
    """Pilih sumber citra. Default: citra Sentinel-2 NYATA lewat STAC + COG."""
    if os.getenv("SYNTHETIC_SCENES") == "1":
        # Kurva tiruan dibangun dari KLAIM Tenant supaya alur end-to-end bisa diuji.
        # Ini artinya mode sintetis SELALU cenderung "terverifikasi" — berguna untuk
        # menguji pipeline, TIDAK berguna untuk menguji kejujuran Tenant.
        plant = batch.claimed_plant_date or (batch.claimed_harvest_date - timedelta(days=90))
        return SyntheticProvider(plant_date=plant, harvest_date=batch.claimed_harvest_date)
    return StacCogProvider()


def observation_window(batch: ActiveBatch) -> tuple[date, date]:
    start = (batch.claimed_plant_date or batch.claimed_harvest_date - timedelta(days=90)) - timedelta(
        days=LOOKBACK_DAYS
    )
    end = min(batch.claimed_harvest_date + timedelta(days=LOOKAHEAD_DAYS), date.today())
    return start, end


def record_without_imagery(repo: Repository, batch: ActiveBatch, status: str) -> str:
    """Catat status yang ditetapkan TANPA membaca citra, tanpa melanggar FR-9.2.

    Dua penjagaan:
      1. Badge yang sudah terbit tidak ditimpa — status lama dikembalikan apa adanya.
      2. Status yang tidak berubah tidak ditulis ulang, supaya job harian tidak
         menghasilkan penulisan kosong ke tabel batch.
    """
    if batch.verification_status in ISSUED_BADGES:
        return batch.verification_status
    if status != batch.verification_status:
        repo.update_batch_verification(batch.batch_id, status, None, None)
    return status


def process_batch(repo: Repository, batch: ActiveBatch) -> str:
    """Verifikasi satu batch. Mengembalikan status akhir untuk keperluan log."""
    # FR-1.6 — lahan terlalu kecil untuk resolusi Sentinel-2.
    if batch.verification_tier == TIER_TOO_SMALL:
        status = record_without_imagery(repo, batch, "TIDAK_DAPAT")
        log.info("  %s: %s (lahan < 0,1 ha)", batch.batch_id[:8], status)
        return status

    # FR-9.1 — verifikasi satelit adalah fitur berlangganan. Batch dengan PO terjual
    # dikecualikan di repository (FR-9.3), jadi di sini cukup cek hasil efektifnya.
    if not batch.subscription_active:
        status = record_without_imagery(
            repo, batch, "FOTO_SAJA" if batch.has_photo_evidence else "TIDAK_DAPAT"
        )
        log.info("  %s: %s (langganan tidak aktif)", batch.batch_id[:8], status)
        return status

    # Jendela milik BATCH INI, dipegang utuh. `start` di bawah boleh maju karena
    # inkremental, tetapi penilaian tetap dibatasi jendela penuh batch — bukan
    # seluruh riwayat lahan, yang bisa memuat musim tanam sebelumnya.
    window_start, window_end = observation_window(batch)
    start = window_start

    # Inkremental: hanya tarik scene yang BELUM tersimpan. Riwayat dalam jendela ini
    # tetap dipakai untuk analisis (dibaca dari DB di bawah), jadi tidak ada yang hilang.
    last_seen = repo.last_observation_date(batch.land_plot_id)
    if last_seen is not None and os.getenv("SYNTHETIC_SCENES") != "1":
        start = max(start, last_seen + timedelta(days=1))
        if start > window_end:
            log.info("  %s: tidak ada citra baru sejak %s", batch.batch_id[:8], last_seen)

    provider = build_provider(batch)

    try:
        scenes = provider.fetch(batch.polygon_geojson, start, window_end) if start <= window_end else []
    except (NotImplementedError, RuntimeError, requests.RequestException) as e:
        # Sumber citra belum siap ATAU katalog sedang gagal — JANGAN menebak, jangan
        # menurunkan status batch yang sebelumnya sudah terverifikasi, dan jangan
        # menghentikan batch lain: gagalnya satu lahan bukan gagalnya job harian.
        log.warning("  %s: sumber citra tidak tersedia (%s)", batch.batch_id[:8], e)
        return SKIPPED

    # Satu tanggal bisa punya lebih dari satu scene (tile/orbit berbeda). Simpan yang
    # tutupan awannya paling rendah — bukan yang kebetulan terakhir diproses, karena
    # upsert memakai kunci (land_plot_id, scene_date).
    best: dict = {}
    for s in scenes:
        stats = summarize(s, MAX_CLOUD_PCT)
        prev = best.get(stats.scene_date)
        if prev is None or stats.cloud_pct < prev.cloud_pct:
            best[stats.scene_date] = stats

    kept = 0
    for stats in sorted(best.values(), key=lambda x: x.scene_date):
        repo.upsert_observation(
            batch.land_plot_id, stats.scene_date, stats.cloud_pct, stats.ndvi_mean, stats.ndmi_mean, stats.usable
        )
        kept += int(stats.usable)

    rows = repo.load_observations(batch.land_plot_id, window_start, window_end)
    observations = [
        Observation(
            scene_date=r["scene_date"],
            ndvi_mean=r["ndvi_mean"] if r["ndvi_mean"] is not None else 0.0,
            ndmi_mean=r["ndmi_mean"],
            cloud_pct=r["cloud_pct"],
            usable=bool(r["usable"]) and r["ndvi_mean"] is not None,
        )
        for r in rows
        # Penjagaan di batas keputusan, bukan pengulangan filter SQL: apa pun yang
        # dikembalikan penyimpanan, vonis batch ini hanya boleh bersandar pada
        # jendelanya sendiri. Satu baris dari musim lalu sudah cukup membuat detektor
        # mengunci tajuk siklus yang salah.
        if window_start <= r["scene_date"] <= window_end
    ]

    verdict = classify(
        observations,
        batch.claimed_plant_date,
        batch.claimed_harvest_date,
        has_photo_evidence=batch.has_photo_evidence,
    )
    repo.update_batch_verification(
        batch.batch_id,
        verdict.status,
        verdict.detected_plant_date,
        verdict.detected_harvest_date,
        verdict.peak_ndvi,
    )

    log.info(
        "  %s (%s): %s — %s [%d/%d citra layak, puncak %s]",
        batch.batch_id[:8],
        batch.commodity_name,
        verdict.status,
        verdict.reason,
        kept,
        len(scenes),
        f"NDVI {verdict.peak_ndvi:.2f}" if verdict.peak_ndvi is not None else "puncak tak terukur",
    )
    return verdict.status


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()

    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        log.error("DATABASE_URL belum diset — salin apps/api/.env atau set manual.")
        return 1

    if os.getenv("SYNTHETIC_SCENES") == "1":
        log.warning("MODE SINTETIS AKTIF — citra dibangkitkan lokal, bukan Sentinel-2 asli.")

    repo = Repository(dsn)
    batches = repo.fetch_active_batches()
    log.info("Memverifikasi %d batch aktif", len(batches))

    tally: dict[str, int] = {}
    for b in batches:
        try:
            status = process_batch(repo, b)
        except Exception:  # noqa: BLE001
            # Isolasi per batch, sengaja seluas mungkin: satu lahan bermasalah tidak
            # boleh membuat lahan lain kehilangan verifikasi hari itu. Jejaknya tetap
            # lengkap di log, dan hitungannya ikut menentukan kode keluar.
            log.exception("  %s: gagal diproses", b.batch_id[:8])
            status = FAILED
        tally[status] = tally.get(status, 0) + 1

    log.info("Selesai: %s", ", ".join(f"{k}={v}" for k, v in sorted(tally.items())) or "tidak ada batch")

    # Bedakan sukses penuh dari sebagian gagal. Job yang menyelesaikan 3 dari 200 batch
    # tidak boleh keluar hijau — status hijau palsu persis yang membuat scheduler tampak
    # sehat sementara verifikasi berhenti diam-diam.
    if tally.get(FAILED):
        log.error("%d batch gagal diproses — hasil job PARSIAL", tally[FAILED])
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
