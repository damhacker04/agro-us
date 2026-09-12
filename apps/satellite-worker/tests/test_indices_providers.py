from datetime import date, timedelta

import numpy as np
import pytest

from src.indices import cloud_fraction, masked_mean, ndmi, ndvi, valid_mask
from src.providers import CopernicusProvider, SceneProvider, SyntheticProvider, summarize


def test_all_scl_classes_are_classified_and_empty_scene_is_unusable():
    scl = np.arange(12)
    assert valid_mask(scl).tolist() == [False, False, True, False, True, True, True, True, False, False, False, True]
    assert cloud_fraction(scl) == 50
    assert cloud_fraction(np.array([])) == 100


def test_polygon_domain_is_excluded_from_the_cloud_fraction():
    """Bounding-box padding is not sky: it must leave both numerator and denominator."""
    scl = np.array([[0, 0], [4, 9]])
    inside = np.array([[False, False], [True, True]])
    assert cloud_fraction(scl, inside) == 50
    assert valid_mask(scl, inside).tolist() == [[False, False], [True, False]]
    # A window that misses the polygon entirely has nothing to judge, not a clear sky.
    assert cloud_fraction(scl, np.zeros((2, 2), dtype=bool)) == 100


def test_ratios_use_signed_float_and_handle_zero_denominator():
    red = np.array([1000, 3000, 0], dtype=np.uint16)
    nir = np.array([3000, 1000, 0], dtype=np.uint16)
    np.testing.assert_allclose(ndvi(red, nir), [0.5, -0.5, np.nan], equal_nan=True)
    np.testing.assert_allclose(ndmi(nir, red), [0.5, -0.5, np.nan], equal_nan=True)


def test_masked_mean_ignores_clouds_and_nonfinite_values():
    assert masked_mean(np.array([0.1, 0.3, np.nan, np.inf, -100]), np.array([True, True, True, True, False])) == pytest.approx(0.2)
    assert masked_mean(np.array([np.nan]), np.array([True])) is None
    assert masked_mean(np.array([1]), np.array([False])) is None


@pytest.mark.parametrize("scl, usable, cloud", [((4, 4, 4, 9, 9), True, 40), ((4, 9, 9, 9, 9), False, 80)])
def test_summarize_respects_cloud_threshold_inclusively(make_scene, scl, usable, cloud):
    stats = summarize(make_scene(scl=scl), 40)
    assert stats.usable is usable
    assert stats.cloud_pct == cloud
    assert stats.ndvi_mean == (0.5 if usable else None)
    assert stats.ndmi_mean == (pytest.approx(0.2) if usable else None)


def test_clear_scene_with_invalid_reflectance_is_not_usable(make_scene):
    stats = summarize(make_scene(red=0, nir=0, swir=0), 40)
    assert not stats.usable
    assert stats.ndvi_mean is None and stats.ndmi_mean is None


def test_provider_interface_cannot_be_instantiated():
    with pytest.raises(TypeError, match="abstract"):
        SceneProvider()


def test_unfinished_copernicus_provider_fails_explicitly(polygon, monkeypatch):
    with pytest.raises(RuntimeError, match="belum diset"):
        CopernicusProvider().fetch(polygon, date(2025, 1, 1), date(2025, 1, 2))
    monkeypatch.setenv("COPERNICUS_USER", "test-user")
    monkeypatch.setenv("COPERNICUS_PASSWORD", "test-password")
    provider = CopernicusProvider()
    assert provider.user == "test-user"
    with pytest.raises(NotImplementedError, match="belum diimplementasikan"):
        provider.fetch(polygon, date(2025, 1, 1), date(2025, 1, 2))
    assert CopernicusProvider("explicit", "value").user == "explicit"


@pytest.mark.parametrize("offset, expected", [(-1, 0.15), (0, 0.15), (7, 0.175), (14, 0.2), (29, 0.5), (44, 0.8), (90, 0.18)])
def test_synthetic_curve_has_emergence_lag_and_harvest_drop(offset, expected):
    plant = date(2025, 1, 1)
    provider = SyntheticProvider(plant, plant + timedelta(days=90))
    assert provider._ndvi_at(plant + timedelta(days=offset)) == pytest.approx(expected)


@pytest.mark.parametrize("cloudy_ratio", [0.0, 1.0])
def test_synthetic_fetch_reproducible_and_respects_revisit(polygon, cloudy_ratio):
    start, end = date(2025, 1, 1), date(2025, 1, 11)
    a = SyntheticProvider(start, date(2025, 4, 1), cloudy_ratio=cloudy_ratio)
    b = SyntheticProvider(start, date(2025, 4, 1), cloudy_ratio=cloudy_ratio)
    scenes = a.fetch(polygon, start, end)
    same = b.fetch(polygon, start, end)
    assert [s.scene_date for s in scenes] == [start, date(2025, 1, 6), end]
    for actual, expected in zip(scenes, same):
        np.testing.assert_array_equal(actual.nir, expected.nir)
        assert actual.red.shape == (16, 16)
        assert bool(np.any(actual.scl == 9)) is bool(cloudy_ratio)
    assert a.fetch(polygon, end, start) == []
