"""Regression guards for SAT-01..SAT-04, the four P1 defects found in the 10 Sep 2026 audit.

These were recorded as strict xfail while the defects stood. They are now plain tests:
each one fails the moment the corresponding fix is undone. Do not weaken them into
xfail again — a red test here means a shipped verdict is wrong, not that a marker
needs updating.
"""

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


def test_current_batch_is_classified_only_against_its_own_observation_window(batch, monkeypatch):
    """SAT-01: an earlier season on the same plot must not drive this batch's verdict."""
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
    # The window is also pushed down to storage, so the whole history is never fetched.
    window = main.observation_window(batch)
    repository.load_observations.assert_called_once_with(batch.land_plot_id, *window)


def test_lapsed_subscription_does_not_revoke_previously_issued_badge(batch):
    """SAT-02: FR-9.2 — a badge already issued survives a lapsed subscription."""
    current_status = {"value": "TERVERIFIKASI"}
    repository = Mock()
    def update(batch_id, status, *args):
        current_status["value"] = status
    repository.update_batch_verification.side_effect = update
    main.process_batch(repository, replace(batch, subscription_active=False))
    assert current_status["value"] == "TERVERIFIKASI"


def test_clear_irregular_plot_is_not_rejected_due_to_bounding_box_padding(polygon, monkeypatch):
    """SAT-03: bounding-box padding is outside the plot, not cloud over the plot."""
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
    assert stats.ndvi_mean == pytest.approx(0.5)


def test_catalog_http_outage_preserves_batch_and_allows_next_batch(batch, monkeypatch):
    """SAT-04: a catalog outage yields SKIPPED for that plot, not a dead daily job."""
    repository = Mock()
    repository.last_observation_date.return_value = None
    provider = Mock()
    provider.fetch.side_effect = requests.HTTPError("catalog unavailable")
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repository, batch) == "SKIPPED"
    repository.update_batch_verification.assert_not_called()
