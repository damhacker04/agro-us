from datetime import date
from unittest.mock import Mock

import numpy as np
import pytest
import rasterio
import requests
from rasterio.io import MemoryFile
from rasterio.transform import from_origin

from src import stac_provider as stac
from src.stac_provider import StacCogProvider, _bbox


def feature(day="2025-01-01", *, complete=True):
    return {"id": day, "properties": {"datetime": f"{day}T10:00:00Z"},
            "assets": {name: {"href": f"https://example.test/{name}.tif"}
                       for name in (("red", "nir", "swir16", "scl") if complete else ("red",))}}


def response(page):
    result = Mock()
    result.json.return_value = page
    return result


def test_constructor_supports_env_and_explicit_overrides(monkeypatch):
    monkeypatch.setenv("STAC_URL", "https://example.test/search")
    monkeypatch.setenv("STAC_COLLECTION", "test-collection")
    monkeypatch.setenv("STAC_WORKERS", "2")
    provider = StacCogProvider()
    assert provider.stac_url == "https://example.test/search"
    assert provider.collection == "test-collection"
    assert provider.workers == 2
    explicit = StacCogProvider("https://explicit.test", "override", workers=1)
    assert explicit.collection == "override" and explicit.workers == 1


def test_search_paginates_and_restores_chronological_order(monkeypatch, polygon):
    post = Mock(side_effect=[
        response({"features": [feature("2025-02-01")], "links": [
            {"rel": "self", "href": "https://example.test/search"},
            {"rel": "next", "href": "https://example.test/page2", "body": {"token": "next-token"}}]}),
        response({"features": [feature("2025-01-01")]}),
    ])
    monkeypatch.setattr(stac.requests, "post", post)
    scenes = StacCogProvider(timeout=3).search(polygon, date(2025, 1, 1), date(2025, 2, 2))
    assert [scene["id"] for scene in scenes] == ["2025-01-01", "2025-02-01"]
    request = post.call_args_list[0].kwargs
    assert request["json"]["intersects"] == polygon
    assert request["json"]["datetime"] == "2025-01-01T00:00:00Z/2025-02-02T23:59:59Z"
    assert request["json"]["query"] == {"eo:cloud_cover": {"lt": 60.0}}
    assert post.call_args_list[1].args == ("https://example.test/page2",)
    assert post.call_args_list[1].kwargs["json"]["token"] == "next-token"


def test_search_honors_max_scenes_and_warns_on_truncation(monkeypatch, polygon, caplog):
    post = Mock(return_value=response({"features": [feature(), feature("2025-01-02"), feature("2025-01-03")],
                                      "links": [{"rel": "next"}]}))
    monkeypatch.setattr(stac.requests, "post", post)
    scenes = StacCogProvider(max_scenes=2).search(polygon, date(2025, 1, 1), date(2025, 2, 1))
    assert len(scenes) == 2
    assert "dipotong" in caplog.text
    assert post.call_count == 1


def test_search_next_link_missing_href_uses_catalog(monkeypatch, polygon):
    post = Mock(side_effect=[response({"features": [], "links": [{"rel": "next", "body": None}]}), response({})])
    monkeypatch.setattr(stac.requests, "post", post)
    assert StacCogProvider().search(polygon, date(2025, 1, 1), date(2025, 2, 1)) == []
    assert post.call_args_list[0].args == post.call_args_list[1].args


def test_search_http_failure_is_propagated(monkeypatch, polygon):
    resp = response({})
    resp.raise_for_status.side_effect = requests.HTTPError("503")
    monkeypatch.setattr(stac.requests, "post", Mock(return_value=resp))
    with pytest.raises(requests.HTTPError, match="503"):
        StacCogProvider().search(polygon, date(2025, 1, 1), date(2025, 2, 1))


@pytest.mark.parametrize("key,alias", [("red", "red"), ("red", "B04"), ("red", "b04"),
                                      ("nir", "B08"), ("swir", "B11"), ("scl", "SCL")])
def test_asset_aliases_support_both_catalog_formats(key, alias):
    assert StacCogProvider._asset_href({"assets": {alias: {"href": "test.tif"}}}, key) == "test.tif"
    assert StacCogProvider._asset_href({"assets": {alias: {}}}, key) is None
    assert StacCogProvider._asset_href({}, key) is None


def test_bbox_covers_all_vertices(polygon):
    assert _bbox(polygon) == (0, 0, 2, 2)


@pytest.mark.parametrize("out_shape,categorical", [(None, False), ((4, 4), False), ((4, 4), True)])
def test_clipping_reads_real_in_memory_raster_and_resamples(polygon, out_shape, categorical):
    values = np.array([[1, 2], [3, 4]], dtype="uint16")
    with MemoryFile() as mem:
        with mem.open(driver="GTiff", height=2, width=2, count=1, dtype="uint16", crs="EPSG:4326",
                      transform=from_origin(0, 2, 1, 1)) as dataset:
            dataset.write(values, 1)
        data, outside = StacCogProvider()._read_clipped(mem.name, polygon, out_shape, categorical)
    assert data.shape == (out_shape or (2, 2))
    assert not outside.any()
    if out_shape is None:
        np.testing.assert_array_equal(data, values)
    elif categorical:
        np.testing.assert_array_equal(data, values.repeat(2, axis=0).repeat(2, axis=1))


def test_clipping_handles_subpixel_geometry_mask_failure(polygon, monkeypatch):
    monkeypatch.setattr(stac, "geometry_mask", Mock(side_effect=ValueError("No valid geometry")))
    with MemoryFile() as mem:
        with mem.open(driver="GTiff", height=2, width=2, count=1, dtype="uint16", crs="EPSG:4326",
                      transform=from_origin(0, 2, 1, 1)) as dataset:
            dataset.write(np.ones((2, 2), dtype="uint16"), 1)
        data, outside = StacCogProvider()._read_clipped(mem.name, polygon, (2, 2), True)
    assert not outside.any()
    assert data.shape == (2, 2)


def test_clipping_empty_raster_avoids_invalid_transform_scaling(polygon, monkeypatch):
    dataset = Mock()
    dataset.crs = "EPSG:4326"
    dataset.transform = from_origin(0, 2, 1, 1)
    dataset.read.return_value = np.empty((0, 0))
    dataset.window_transform.return_value = dataset.transform
    opened = Mock()
    opened.__enter__ = Mock(return_value=dataset)
    opened.__exit__ = Mock(return_value=False)
    monkeypatch.setattr(stac.rasterio, "open", Mock(return_value=opened))
    data, outside = StacCogProvider()._read_clipped("empty.tif", polygon, (0, 0), True)
    assert data.size == 0 and outside.size == 0


def test_scene_missing_band_is_skipped(polygon, caplog):
    assert StacCogProvider()._read_scene(feature(complete=False), polygon) is None
    assert "band tidak lengkap" in caplog.text


def test_scene_empty_red_is_skipped(polygon, monkeypatch):
    provider = StacCogProvider()
    monkeypatch.setattr(provider, "_read_clipped", Mock(return_value=(np.empty((0, 0)), np.empty((0, 0)))))
    assert provider._read_scene(feature(), polygon) is None


@pytest.mark.parametrize("error", [rasterio.errors.RasterioIOError("bad raster"), requests.RequestException("failed")])
def test_scene_raster_and_network_failures_are_skipped(polygon, monkeypatch, error):
    provider = StacCogProvider()
    monkeypatch.setattr(provider, "_read_clipped", Mock(side_effect=error))
    assert provider._read_scene(feature(), polygon) is None


def test_scene_aligns_bands_and_masks_outside_polygon(polygon, monkeypatch):
    provider = StacCogProvider()
    values = np.full((2, 2), 4)
    outside = np.array([[True, False], [False, False]])
    reader = Mock(return_value=(values, outside))
    monkeypatch.setattr(provider, "_read_clipped", reader)
    scene = provider._read_scene(feature(), polygon)
    assert scene.scene_date == date(2025, 1, 1)
    assert scene.scl.tolist() == [[0, 4], [4, 4]]
    assert [call.args[2] for call in reader.call_args_list] == [None, (2, 2), (2, 2), (2, 2)]
    assert reader.call_args_list[-1].kwargs == {"categorical": True}


def test_fetch_empty_catalog_skips_rasters(polygon, monkeypatch):
    provider = StacCogProvider()
    monkeypatch.setattr(provider, "search", lambda *args: [])
    assert provider.fetch(polygon, date(2025, 1, 1), date(2025, 2, 1)) == []


def test_fetch_parallel_results_exclude_failed_scenes_and_sort(polygon, make_scene, monkeypatch):
    provider = StacCogProvider(workers=2)
    monkeypatch.setattr(provider, "search", lambda *args: [feature("2025-01-06"), feature(), feature("2025-01-03")])
    def read(item, poly):
        assert poly == polygon
        return None if item["id"] == "2025-01-03" else make_scene(date.fromisoformat(item["id"]))
    monkeypatch.setattr(provider, "_read_scene", read)
    scenes = provider.fetch(polygon, date(2025, 1, 1), date(2025, 2, 1))
    assert [scene.scene_date for scene in scenes] == [date(2025, 1, 1), date(2025, 1, 6)]
