"""Offline unit tests: accidental external requests or database writes fail closed."""

from datetime import date
from unittest.mock import Mock

import numpy as np
import pytest

from src.providers import SceneBands
from src.repository import ActiveBatch


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    for name in ("DATABASE_URL", "SYNTHETIC_SCENES", "STAC_URL", "STAC_COLLECTION",
                 "STAC_WORKERS", "COPERNICUS_USER", "COPERNICUS_PASSWORD"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    monkeypatch.setattr("requests.sessions.Session.request", Mock(side_effect=AssertionError("Network forbidden")))
    monkeypatch.setattr("psycopg.connect", Mock(side_effect=AssertionError("Database forbidden")))


@pytest.fixture
def polygon():
    return {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}


@pytest.fixture
def batch(polygon):
    return ActiveBatch("batch-123456", "plot-123", polygon, 1.0, "NORMAL",
                       date(2025, 1, 15), date(2025, 4, 15), "GROWING", "Cabai", True, True)


@pytest.fixture
def make_scene():
    def make(scene_date=date(2025, 1, 1), *, scl=(4, 4, 4, 4), red=1000, nir=3000, swir=2000):
        shape = (1, len(scl))
        return SceneBands(scene_date, np.full(shape, red), np.full(shape, nir),
                          np.full(shape, swir), np.array([scl]))
    return make
