from datetime import date, timedelta

import pytest

from src import phenology
from src.phenology import Observation, classify, detect_phenology


def observations(values):
    return [Observation(date(2025, 1, 1) + timedelta(days=i * 5), value, None, 0, True)
            for i, value in enumerate(values)]


def test_detector_requires_four_usable_observations():
    ph = detect_phenology(observations([0.1, 0.6, 0.2]))
    assert ph.detected_plant_date is None
    assert "minimal 4" in ph.reason


def test_calibrated_minimum_rise_rejects_weak_growth(monkeypatch):
    # The guard is dormant under generic thresholds (0.45 - 0.25 >= 0.20).
    # A stricter future commodity calibration must retain its rejection behavior.
    monkeypatch.setattr(phenology, "MIN_TOTAL_RISE", 0.4)
    ph = detect_phenology(observations([0.25, 0.3, 0.45, 0.2]))
    assert ph.detected_plant_date is None
    assert "terlalu kecil" in ph.reason


def test_unharvested_cycle_retains_peak_and_plant_date():
    ph = detect_phenology(list(reversed(observations([0.0, 0.3, 0.5, 0.7]))))
    assert ph.detected_plant_date == date(2024, 12, 18)
    assert ph.detected_harvest_date is None
    assert ph.peak_ndvi == 0.7
    assert "panen belum terlihat" in ph.reason


@pytest.mark.parametrize("photo, expected", [(True, "FOTO_SAJA"), (False, "TIDAK_DAPAT")])
def test_uncomparable_claim_falls_back_to_available_evidence(photo, expected):
    verdict = classify(observations([0.15, 0.2, 0.2, 0.15]), None, None, photo)
    assert verdict.status == expected
    assert verdict.plant_diff_days is None
    assert verdict.harvest_diff_days is None


@pytest.mark.parametrize("diff,status", [(21, "PERLU_DITINJAU"), (22, "TIDAK_SESUAI")])
def test_review_upper_boundary(diff, status):
    obs = observations([0.1, 0.3, 0.6, 0.7, 0.2])
    ph = detect_phenology(obs)
    verdict = classify(obs, ph.detected_plant_date, ph.detected_harvest_date - timedelta(days=diff))
    assert verdict.status == status
    assert verdict.harvest_diff_days == diff


def test_missing_plant_claim_can_still_compare_harvest():
    obs = observations([0.1, 0.3, 0.6, 0.7, 0.2])
    verdict = classify(obs, None, date(2025, 1, 21))
    assert verdict.status == "TERVERIFIKASI"
    assert verdict.plant_diff_days is None
    assert verdict.harvest_diff_days == 0
