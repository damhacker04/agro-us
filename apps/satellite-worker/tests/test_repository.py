import json
from datetime import date
from unittest.mock import MagicMock

import pytest

from src.repository import Repository, normalize_dsn


@pytest.fixture
def connection(monkeypatch):
    connect = MagicMock()
    conn = connect.return_value.__enter__.return_value
    cur = conn.cursor.return_value.__enter__.return_value
    monkeypatch.setattr("src.repository.psycopg.connect", connect)
    return connect, conn, cur


@pytest.mark.parametrize("dsn, expected", [
    ("postgresql://u:p@localhost/db?schema=public&connection_limit=3&pool_timeout=1&pgbouncer=true&sslidentity=x&sslcert=y&sslmode=require&application_name=", "postgresql://u:p@localhost/db?sslmode=require&application_name="),
    ("postgresql://u:p@localhost/db", "postgresql://u:p@localhost/db"),
])
def test_prisma_url_normalization_preserves_supported_parameters(dsn, expected):
    assert normalize_dsn(dsn) == expected


@pytest.mark.parametrize("subscription,sold,effective", [(False, False, False), (False, True, True), (True, False, True)])
def test_active_batches_preserve_sold_po_entitlement(connection, polygon, subscription, sold, effective):
    connect, _, cur = connection
    cur.fetchall.return_value = [{
        "batch_id": "batch-1", "land_plot_id": "land-1", "polygon_geojson": json.dumps(polygon),
        "area_ha": 1.2, "verification_tier": "NORMAL", "claimed_plant_date": None,
        "claimed_harvest_date": date(2025, 4, 1), "production_status": "GROWING",
        "commodity_name": "Cabai", "has_photo_evidence": 1, "verification_status": "TERVERIFIKASI",
        "subscription_active": subscription, "has_sold_quota": sold,
    }]
    rows = Repository("postgresql://localhost/db?schema=public").fetch_active_batches()
    assert len(rows) == 1
    assert rows[0].polygon_geojson == polygon
    assert rows[0].has_photo_evidence is True
    assert rows[0].subscription_active is effective
    # The stored badge travels with the batch so the worker knows what it would overwrite.
    assert rows[0].verification_status == "TERVERIFIKASI"
    assert connect.call_args.args[0] == "postgresql://localhost/db"
    assert "quota_box_sold > 0" in cur.execute.call_args.args[0]


def test_empty_active_batch_query(connection):
    connection[2].fetchall.return_value = []
    assert Repository("postgresql://localhost/db").fetch_active_batches() == []


def test_observation_upsert_uses_parameters_and_idempotent_key(connection):
    _, conn, cur = connection
    day = date(2025, 1, 1)
    Repository("postgresql://localhost/db").upsert_observation("plot", day, 4, 0.7, 0.3, True)
    sql, values = cur.execute.call_args.args
    assert "ON CONFLICT (land_plot_id, scene_date) DO UPDATE" in sql
    assert values == ("plot", day, 4, 0.7, 0.3, True)
    conn.commit.assert_called_once()


@pytest.mark.parametrize("row, expected", [(None, None), ({"d": None}, None), ({"d": date(2025, 1, 1)}, date(2025, 1, 1))])
def test_latest_observation_handles_empty_table(connection, row, expected):
    cur = connection[2]
    cur.fetchone.return_value = row
    assert Repository("postgresql://localhost/db").last_observation_date("plot") == expected
    assert cur.execute.call_args.args[1] == ("plot",)


def test_load_observations_is_bounded_to_the_requested_window(connection):
    cur = connection[2]
    cur.fetchall.return_value = [{"scene_date": date(2025, 1, 1)}]
    start, end = date(2024, 12, 1), date(2025, 5, 15)
    result = Repository("postgresql://localhost/db").load_observations("plot", start, end)
    assert result == cur.fetchall.return_value
    sql = cur.execute.call_args.args[0]
    assert "ORDER BY scene_date" in sql
    # Without this bound an earlier season on the same plot leaks into the verdict.
    assert "scene_date BETWEEN %s AND %s" in sql
    assert cur.execute.call_args.args[1] == ("plot", start, end)


@pytest.mark.parametrize("peak", [None, 0.8])
def test_verification_update_preserves_previous_peak_when_unavailable(connection, peak):
    _, conn, cur = connection
    plant, harvest = date(2025, 1, 1), date(2025, 4, 1)
    Repository("postgresql://localhost/db").update_batch_verification("batch", "TERVERIFIKASI", plant, harvest, peak)
    sql, values = cur.execute.call_args.args
    assert "peak_ndvi = COALESCE(%s, peak_ndvi)" in sql
    assert values == ("TERVERIFIKASI", plant, harvest, peak, "batch")
    conn.commit.assert_called_once()
