import runpy
import sys
from datetime import date
from unittest.mock import Mock

import pytest

from src import demo_curve


def test_square_polygon_closed_centered_and_expected_size():
    polygon = demo_curve.square_polygon(112, -8, 0.02)
    ring = polygon["coordinates"][0]
    assert polygon["type"] == "Polygon"
    assert ring[0] == ring[-1]
    assert ring[0] == [111.99, -8.01]
    assert ring[2] == [112.01, -7.99]


@pytest.mark.parametrize("claims", [[], ["--claim-plant", "2025-01-01"], ["--claim-harvest", "2025-04-01"],
                                   ["--claim-plant", "2025-01-01", "--claim-harvest", "2025-04-01"]])
def test_cli_prints_curve_deduplicates_and_optionally_classifies(monkeypatch, make_scene, capsys, claims):
    provider = Mock()
    provider.fetch.return_value = [make_scene(date(2025, 1, 1), scl=(9, 9, 9, 9)),
                                   make_scene(date(2025, 1, 1)),
                                   make_scene(date(2025, 1, 1), scl=(4, 4, 4, 9)),
                                   make_scene(date(2025, 1, 6), scl=(9, 9, 9, 9))]
    monkeypatch.setattr(demo_curve, "StacCogProvider", Mock(return_value=provider))
    monkeypatch.setattr(sys, "argv", ["demo_curve", "--start", "2025-01-01", "--end", "2025-04-01", *claims])
    assert demo_curve.main() == 0
    output = capsys.readouterr().out
    assert "Citra layak: 1/2" in output
    assert "0.500" in output
    assert "--" in output
    assert ("VONIS" in output) is bool(claims)


def test_demo_module_entry_point_empty_catalog(monkeypatch, capsys):
    monkeypatch.setattr("src.stac_provider.StacCogProvider.fetch", lambda *args: [])
    monkeypatch.setattr(sys, "argv", ["demo_curve", "--start", "2025-01-01", "--end", "2025-04-01"])
    monkeypatch.delitem(sys.modules, "src.demo_curve")
    with pytest.raises(SystemExit) as exc:
        runpy.run_module("src.demo_curve", run_name="__main__")
    assert exc.value.code == 0
    assert "Citra layak: 0/0" in capsys.readouterr().out
