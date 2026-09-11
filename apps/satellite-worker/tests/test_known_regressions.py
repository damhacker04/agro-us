"""Acceptance checks for confirmed defects, deliberately not represented as fixed.

Set QA_ENFORCE_REGRESSIONS=1 to turn these into red release gates. The default
strict xfail records known broken behavior and requires cleanup when it is fixed.
"""

import os
from dataclasses import replace
from datetime import date
from unittest.mock import Mock

import numpy as np
import pytest
import requests

from src import main
from src.providers import summarize
from src.stac_provider import StacCogProvider
from tests.test_phenology import series


def known_defect(reason):
    return pytest.mark.xfail(os.getenv("QA_ENFORCE_REGRESSIONS") != "1", reason=reason, strict=True)


@known_defect("SAT-01: all historical plot cycles contaminate the current batch verdict")
def test_current_batch_is_classified_only_against_its_own_observation_window(batch, monkeypatch):
    current = series(batch.claimed_plant_date, batch.claimed_harvest_date, cloudy=set())
    old = series(date(2024, 1, 15), date(2024, 4, 15), cloudy=set())
    repository = Mock()
    repository.last_observation_date.return_value = None
    repository.load_observations.return_value = [
        {"scene_date": obs.scene_date, "ndvi_mean": obs.ndvi_mean, "ndmi_mean": obs.ndmi_mean,
         "cloud_pct": obs.cloud_pct, "usable": obs.usable} for obs in old + current
    ]
    provider = Mock()
    provider.fetch.return_value = []
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repository, batch) == "TERVERIFIKASI"


@known_defect("SAT-02: FR-9.2 permanent verification badge is revoked when subscription lapses")
def test_lapsed_subscription_does_not_revoke_previously_issued_badge(batch):
    current_status = {"value": "TERVERIFIKASI"}
    repository = Mock()
    def update(batch_id, status, *args):
        current_status["value"] = status
    repository.update_batch_verification.side_effect = update
    main.process_batch(repository, replace(batch, subscription_active=False))
    assert current_status["value"] == "TERVERIFIKASI"


@known_defect("SAT-03: pixels outside polygon are counted as clouds inside the plot")
def test_clear_irregular_plot_is_not_rejected_due_to_bounding_box_padding(polygon, monkeypatch):
    provider = StacCogProvider()
    outside = np.array([[True, True], [False, False]])
    band = np.ones((2, 2))
    reader = Mock(side_effect=[(band * 1000, outside), (band * 3000, outside),
                               (band * 2000, outside), (band * 4, outside)])
    monkeypatch.setattr(provider, "_read_clipped", reader)
    scene = provider._read_scene({"id": "clear-scene", "properties": {"datetime": "2025-01-01T00:00:00Z"},
                                 "assets": {key: {"href": f"{key}.tif"} for key in ("red", "nir", "swir16", "scl")}}, polygon)
    stats = summarize(scene, 40)
    assert stats.usable and stats.cloud_pct == 0


@known_defect("SAT-04: an HTTP catalog outage escapes process_batch instead of returning SKIPPED")
def test_catalog_http_outage_preserves_batch_and_allows_next_batch(batch, monkeypatch):
    repository = Mock()
    repository.last_observation_date.return_value = None
    provider = Mock()
    provider.fetch.side_effect = requests.HTTPError("catalog unavailable")
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repository, batch) == "SKIPPED"
    repository.update_batch_verification.assert_not_called()
