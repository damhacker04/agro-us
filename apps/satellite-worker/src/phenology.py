"""Deteksi tanggal tanam & panen dari deret waktu NDVI, lalu bandingkan dengan
klaim Tenant (PRD §6.2 poin 4-5, FR-4.4/4.5).

Prinsip yang dipakai:
  - Tanam  = kenaikan TAJAM NDVI dari tanah terbuka menuju vegetasi.
  - Panen  = penurunan TAJAM NDVI kembali ke tanah terbuka.

Yang SENGAJA tidak dilakukan: menebak saat data tidak memadai. Bila deret terlalu
jarang atau tertutup awan, hasilnya `TIDAK_DAPAT` — PRD §5.4.3 menegaskan sistem
harus jujur soal keraguannya sendiri, bukan mengarang.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

# Ambang NDVI. Kalibrasi per komoditas & musim menyusul (PRD §6.2 poin 6) —
# angka di sini generik untuk sayuran dataran tinggi.
BARE_SOIL_MAX = 0.25   # di bawah ini dianggap tanah terbuka
VEGETATION_MIN = 0.45  # di atas ini dianggap tajuk tertutup
HARVEST_MARGIN = 0.10  # toleransi saat NDVI turun kembali ke arah tanah terbuka

# Kenaikan TOTAL minimal dari tanah terbuka ke tajuk agar transisi dianggap nyata
# (bukan derau). Sengaja diukur sebagai selisih total, BUKAN per-pengamatan:
# revisit Sentinel-2 ~5 hari sementara sayuran butuh ~30 hari mencapai tajuk penuh,
# sehingga lonjakan antar-citra hanya ~0,10 — syarat per-pengamatan tidak akan pernah
# terpicu pada data nyata.
MIN_TOTAL_RISE = 0.20

# ⚠️ KOREKSI LAG PERTUMBUHAN — penting dan tidak disebut eksplisit di PRD §6.2.
#
# Satelit TIDAK BISA melihat benih. Setelah tanam, NDVI tetap setara tanah terbuka
# selama masa perkecambahan dan pertumbuhan awal; kenaikan baru terlihat ~2-3 minggu
# kemudian. Artinya "kenaikan tajam NDVI" adalah tanggal MUNCUL TANAMAN, bukan tanggal
# tanam — selalu tertinggal secara sistematis.
#
# Tanpa koreksi ini, Tenant yang jujur pun dinilai meleset belasan hari dan jatuh ke
# PERLU_DITINJAU: menuduh orang yang benar sekaligus membanjiri antrean operator.
#
# Angka 14 hari bersifat GENERIK. Kalibrasi per komoditas & musim (PRD §6.2 poin 6)
# adalah pekerjaan yang justru menjadi moat teknis — kangkung jauh lebih cepat muncul
# daripada cabai atau apel.
EMERGENCE_LAG_DAYS = 14

# Minimal jumlah observasi layak sebelum berani menyimpulkan apa pun.
MIN_USABLE_OBSERVATIONS = 4

# Ambang keputusan selisih hari (PRD §6.2 poin 5).
VERIFIED_MAX_DIFF_DAYS = 7
REVIEW_MAX_DIFF_DAYS = 21

VerificationStatus = Literal[
    "TERVERIFIKASI", "PERLU_DITINJAU", "TIDAK_DAPAT", "TIDAK_SESUAI", "FOTO_SAJA"
]


@dataclass(frozen=True)
class Observation:
    scene_date: date
    ndvi_mean: float
    ndmi_mean: float | None
    cloud_pct: float
    usable: bool


@dataclass(frozen=True)
class Phenology:
    detected_plant_date: date | None
    detected_harvest_date: date | None
    reason: str
    # Puncak NDVI sepanjang siklus — masukan pita kewajaran hasil (FR-4.10).
    # None berarti siklusnya tidak pernah teramati cukup untuk menyebut ada puncak;
    # itu bukan "puncaknya rendah", melainkan "tidak tahu", dan bedanya menentukan
    # apakah Tenant boleh dinilai sama sekali.
    peak_ndvi: float | None = None


@dataclass(frozen=True)
class Verdict:
    status: VerificationStatus
    detected_plant_date: date | None
    detected_harvest_date: date | None
    plant_diff_days: int | None
    harvest_diff_days: int | None
    reason: str
    peak_ndvi: float | None = None


def detect_phenology(observations: list[Observation], expected_harvest: date | None = None) -> Phenology:
    """Cari titik tanam & panen dari deret NDVI yang sudah difilter awan.

    Memakai PERLINTASAN AMBANG, bukan lonjakan antar-citra:
      1. Cari pengamatan pertama yang mencapai tutupan tajuk (NDVI ≥ VEGETATION_MIN).
      2. Tanam  = pengamatan tanah terbuka TERAKHIR sebelum tajuk itu — tanam terjadi
         sebelum tajuk terlihat dari orbit, jadi batas bawahnya yang diambil.
      3. Panen  = pengamatan pertama SETELAH tajuk yang kembali ke tanah terbuka.
    """
    usable = sorted([o for o in observations if o.usable], key=lambda o: o.scene_date)

    if len(usable) < MIN_USABLE_OBSERVATIONS:
        return Phenology(None, None, f"Observasi layak hanya {len(usable)}, minimal {MIN_USABLE_OBSERVATIONS}")

    canopy_idx = next((i for i, o in enumerate(usable) if o.ndvi_mean >= VEGETATION_MIN), None)
    if canopy_idx is None:
        # Bedakan "belum selesai tumbuh" dari "memang tidak ditanami".
        # Menuduh Tenant tidak menanam padahal tanamannya baru 3 minggu adalah
        # kesalahan yang mahal: statusnya tampil ke pembeli (FR-4.6).
        last_seen = usable[-1].scene_date
        if expected_harvest is not None and last_seen < expected_harvest:
            return Phenology(
                None,
                None,
                f"Siklus tanam belum selesai — pengamatan terakhir {last_seen.isoformat()}, "
                f"perkiraan panen {expected_harvest.isoformat()}",
            )
        return Phenology(None, None, "Vegetasi tidak pernah mencapai tutupan tajuk — lahan tampak tidak ditanami")

    # Mundur dari titik tajuk untuk menemukan tanah terbuka terakhir = saat tanaman
    # MULAI TERLIHAT (green-up), bukan saat ditanam.
    greenup: date | None = None
    plant_ndvi: float | None = None
    for o in reversed(usable[:canopy_idx]):
        if o.ndvi_mean <= BARE_SOIL_MAX:
            greenup, plant_ndvi = o.scene_date, o.ndvi_mean
            break

    if greenup is None:
        # Lahan sudah bervegetasi sejak citra pertama — awal siklus tak teramati.
        return Phenology(
            None, None, "Awal siklus tidak teramati: lahan sudah bervegetasi sejak citra pertama"
        )

    rise = usable[canopy_idx].ndvi_mean - (plant_ndvi or 0.0)
    if rise < MIN_TOTAL_RISE:
        return Phenology(None, None, f"Kenaikan vegetasi terlalu kecil ({rise:.2f}) untuk disebut penanaman")

    # Mundurkan dari green-up ke perkiraan tanggal tanam (lihat EMERGENCE_LAG_DAYS).
    plant = greenup - timedelta(days=EMERGENCE_LAG_DAYS)

    # Panen: kembali ke arah tanah terbuka setelah tajuk terbentuk.
    harvest: date | None = None
    for o in usable[canopy_idx:]:
        if o.ndvi_mean <= BARE_SOIL_MAX + HARVEST_MARGIN:
            harvest = o.scene_date
            break

    # Puncak NDVI diukur dari SAAT TAJUK MULAI TERBENTUK sampai panen — bukan dari
    # seluruh deret. Di luar rentang itu yang terekam adalah tanaman siklus sebelumnya
    # atau gulma pascapanen, dan keduanya akan menaikkan pita untuk tanaman yang salah.
    akhir = next((i for i, o in enumerate(usable) if harvest and o.scene_date > harvest), len(usable))
    siklus = usable[canopy_idx:akhir]
    peak = max((o.ndvi_mean for o in siklus), default=None)

    if harvest is None:
        return Phenology(plant, None, "Penanaman terdeteksi, panen belum terlihat", peak)
    return Phenology(plant, harvest, "Penanaman dan panen terdeteksi", peak)


def _diff_days(a: date | None, b: date | None) -> int | None:
    if a is None or b is None:
        return None
    return abs((a - b).days)


def classify(
    observations: list[Observation],
    claimed_plant_date: date | None,
    claimed_harvest_date: date | None,
    has_photo_evidence: bool = True,
) -> Verdict:
    """Terjemahkan deret pengamatan + klaim Tenant menjadi status verifikasi (FR-4.5)."""
    usable = [o for o in observations if o.usable]

    # Tutupan awan berkepanjangan → jujur mengaku tidak bisa memverifikasi (§5.4.3).
    if len(usable) < MIN_USABLE_OBSERVATIONS:
        return Verdict(
            status="TIDAK_DAPAT",
            detected_plant_date=None,
            detected_harvest_date=None,
            plant_diff_days=None,
            harvest_diff_days=None,
            reason=(
                f"Hanya {len(usable)} dari {len(observations)} citra yang layak pakai "
                "(tutupan awan atau lahan terlalu kecil). Bukti foto menjadi lapis kedua."
            ),
            peak_ndvi=None,
        )

    ph = detect_phenology(observations, expected_harvest=claimed_harvest_date)
    plant_diff = _diff_days(ph.detected_plant_date, claimed_plant_date)
    harvest_diff = _diff_days(ph.detected_harvest_date, claimed_harvest_date)

    # Belum ada apa pun yang bisa dibandingkan.
    if plant_diff is None and harvest_diff is None:
        return Verdict(
            status="FOTO_SAJA" if has_photo_evidence else "TIDAK_DAPAT",
            detected_plant_date=ph.detected_plant_date,
            detected_harvest_date=ph.detected_harvest_date,
            plant_diff_days=None,
            harvest_diff_days=None,
            reason=ph.reason,
            peak_ndvi=ph.peak_ndvi,
        )

    # Selisih terburuk yang menentukan status — satu klaim meleset sudah cukup
    # untuk menurunkan derajat kepercayaan.
    diffs = [d for d in (plant_diff, harvest_diff) if d is not None]
    worst = max(diffs)

    if worst <= VERIFIED_MAX_DIFF_DAYS:
        status: VerificationStatus = "TERVERIFIKASI"
        reason = f"Kurva vegetasi konsisten dengan klaim (selisih terbesar {worst} hari)"
    elif worst <= REVIEW_MAX_DIFF_DAYS:
        status = "PERLU_DITINJAU"
        reason = f"Terdapat selisih {worst} hari antara klaim dan deteksi satelit"
    else:
        status = "TIDAK_SESUAI"
        reason = f"Selisih {worst} hari — klaim tidak sesuai pengamatan satelit"

    return Verdict(
        status=status,
        detected_plant_date=ph.detected_plant_date,
        detected_harvest_date=ph.detected_harvest_date,
        plant_diff_days=plant_diff,
        harvest_diff_days=harvest_diff,
        reason=reason,
        peak_ndvi=ph.peak_ndvi,
    )
