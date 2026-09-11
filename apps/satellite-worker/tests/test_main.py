import runpy
import sys
from dataclasses import replace
from datetime import date, timedelta
from unittest.mock import Mock

import pytest

from src import main
from src.phenology import Verdict
from src.providers import SyntheticProvider
from src.stac_provider import StacCogProvider


@pytest.fixture(autouse=True)
def no_dotenv(monkeypatch):
    monkeypatch.setattr(main, "load_dotenv", lambda: False)


@pytest.fixture
def repo():
    repository = Mock()
    repository.last_observation_date.return_value = None
    repository.load_observations.return_value = []
    return repository


def test_default_provider_uses_real_stac(batch):
    assert isinstance(main.build_provider(batch), StacCogProvider)


@pytest.mark.parametrize("claimed", [date(2025, 1, 15), None])
def test_synthetic_provider_uses_claim_or_ninety_day_fallback(batch, claimed, monkeypatch):
    monkeypatch.setenv("SYNTHETIC_SCENES", "1")
    item = replace(batch, claimed_plant_date=claimed)
    provider = main.build_provider(item)
    assert isinstance(provider, SyntheticProvider)
    assert provider.plant_date == (claimed or item.claimed_harvest_date - timedelta(days=90))
    assert provider.harvest_date == item.claimed_harvest_date


@pytest.mark.parametrize("claimed", [date(2025, 1, 15), None])
def test_observation_window_uses_fallback_and_includes_harvest_buffer(batch, claimed):
    item = replace(batch, claimed_plant_date=claimed)
    start, end = main.observation_window(item)
    assert start == (claimed or item.claimed_harvest_date - timedelta(days=90)) - timedelta(days=45)
    assert end == item.claimed_harvest_date + timedelta(days=30)


def test_future_harvest_window_stops_today(batch):
    item = replace(batch, claimed_harvest_date=date.today() + timedelta(days=90))
    assert main.observation_window(item)[1] == date.today()


@pytest.mark.parametrize("tier,subscription,photo,status", [
    ("TERBATAS", True, True, "TIDAK_DAPAT"),
    ("NORMAL", False, True, "FOTO_SAJA"),
    ("NORMAL", False, False, "TIDAK_DAPAT"),
])
def test_ineligible_batches_skip_imagery(repo, batch, tier, subscription, photo, status, monkeypatch):
    build = Mock(side_effect=AssertionError("Imagery must not be fetched"))
    monkeypatch.setattr(main, "build_provider", build)
    item = replace(batch, verification_tier=tier, subscription_active=subscription, has_photo_evidence=photo)
    assert main.process_batch(repo, item) == status
    repo.update_batch_verification.assert_called_once_with(item.batch_id, status, None, None)
    repo.load_observations.assert_not_called()


@pytest.mark.parametrize("failure", [RuntimeError("unavailable"), NotImplementedError("not implemented")])
def test_unavailable_provider_preserves_previous_verification(repo, batch, failure, monkeypatch):
    provider = Mock()
    provider.fetch.side_effect = failure
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repo, batch) == "SKIPPED"
    repo.update_batch_verification.assert_not_called()
    repo.upsert_observation.assert_not_called()


@pytest.mark.parametrize("synthetic", [False, True])
def test_incremental_window_advances_only_for_real_imagery(repo, batch, synthetic, monkeypatch):
    if synthetic:
        monkeypatch.setenv("SYNTHETIC_SCENES", "1")
    repo.last_observation_date.return_value = date(2025, 2, 1)
    provider = Mock()
    provider.fetch.return_value = []
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repo, batch) == "TIDAK_DAPAT"
    expected_start = main.observation_window(batch)[0] if synthetic else date(2025, 2, 2)
    provider.fetch.assert_called_once_with(batch.polygon_geojson, expected_start, date(2025, 5, 15))


def test_no_new_scene_reuses_persisted_history_without_fetch(repo, batch, monkeypatch):
    repo.last_observation_date.return_value = date(2025, 6, 1)
    provider = Mock()
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    assert main.process_batch(repo, batch) == "TIDAK_DAPAT"
    provider.fetch.assert_not_called()
    repo.load_observations.assert_called_once_with(batch.land_plot_id)


def test_duplicate_day_prefers_clearer_scene_and_null_ndvi_cannot_be_usable(repo, batch, make_scene, monkeypatch):
    day1, day2 = date(2025, 1, 1), date(2025, 1, 6)
    provider = Mock()
    provider.fetch.return_value = [make_scene(day2), make_scene(day1, scl=(9, 9, 9, 9)),
                                   make_scene(day1), make_scene(day1, scl=(4, 4, 4, 9))]
    monkeypatch.setattr(main, "build_provider", lambda _: provider)
    repo.load_observations.return_value = [
        {"scene_date": day1, "ndvi_mean": None, "ndmi_mean": None, "cloud_pct": 80, "usable": True},
        {"scene_date": day2, "ndvi_mean": 0.8, "ndmi_mean": 0.2, "cloud_pct": 0, "usable": True},
    ]
    classifier = Mock(return_value=Verdict("TERVERIFIKASI", day1, day2, 0, 0, "test", 0.8))
    monkeypatch.setattr(main, "classify", classifier)
    assert main.process_batch(repo, batch) == "TERVERIFIKASI"
    calls = repo.upsert_observation.call_args_list
    assert len(calls) == 2
    assert [call.args[1] for call in calls] == [day1, day2]
    assert calls[0].args[2:4] == (0.0, 0.5)
    obs = classifier.call_args.args[0]
    assert obs[0].ndvi_mean == 0.0 and not obs[0].usable
    assert obs[1].usable
    repo.update_batch_verification.assert_called_once_with(batch.batch_id, "TERVERIFIKASI", day1, day2, 0.8)


@pytest.mark.parametrize("count", [0, 2])
@pytest.mark.parametrize("synthetic", [False, True])
def test_main_processes_each_active_batch_and_returns_success(batch, count, synthetic, monkeypatch, caplog):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test/db")
    if synthetic:
        monkeypatch.setenv("SYNTHETIC_SCENES", "1")
    repository = Mock()
    repository.fetch_active_batches.return_value = [batch] * count
    factory = Mock(return_value=repository)
    processor = Mock(return_value="TERVERIFIKASI")
    monkeypatch.setattr(main, "Repository", factory)
    monkeypatch.setattr(main, "process_batch", processor)
    with caplog.at_level("INFO"):
        assert main.main() == 0
    assert processor.call_count == count
    factory.assert_called_once_with("postgresql://test/db")
    assert ("MODE SINTETIS" in caplog.text) is synthetic
    assert ("TERVERIFIKASI=2" if count else "tidak ada batch") in caplog.text


def test_main_missing_dsn_returns_configuration_error():
    assert main.main() == 1


def test_module_entry_point_exits_with_configuration_error(monkeypatch):
    # Exercise the real CLI guard; dotenv and database remain isolated by fixtures.
    monkeypatch.delitem(sys.modules, "src.main")
    with pytest.raises(SystemExit) as exc:
        runpy.run_module("src.main", run_name="__main__")
    assert exc.value.code == 1
