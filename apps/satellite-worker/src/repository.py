"""Akses basis data untuk worker satelit.

Menulis ke `satellite_observations` dan memperbarui kolom verifikasi di `batches`.
TIDAK menyentuh tabel append-only (timeline_nodes / escrow_ledger / hash_anchors) —
trigger akan menolak dan memang seharusnya begitu.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from psycopg.rows import dict_row

# Parameter khusus Prisma yang tidak dipahami libpq. DATABASE_URL dipakai bersama
# oleh apps/api (Prisma) dan worker ini (psycopg), jadi harus dibersihkan di sini.
PRISMA_ONLY_PARAMS = {"schema", "connection_limit", "pool_timeout", "pgbouncer", "sslidentity", "sslcert"}


def normalize_dsn(url: str) -> str:
    """Buang query param milik Prisma agar psycopg bisa memakai URL yang sama."""
    parts = urlsplit(url)
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in PRISMA_ONLY_PARAMS]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), parts.fragment))


@dataclass(frozen=True)
class ActiveBatch:
    """Batch yang perlu diverifikasi beserta poligon lahannya."""

    batch_id: str
    land_plot_id: str
    polygon_geojson: dict
    area_ha: float
    verification_tier: str
    claimed_plant_date: date | None
    claimed_harvest_date: date
    production_status: str
    commodity_name: str
    has_photo_evidence: bool
    subscription_active: bool


class Repository:
    def __init__(self, dsn: str) -> None:
        self.dsn = normalize_dsn(dsn)

    def _connect(self) -> psycopg.Connection:
        return psycopg.connect(self.dsn, row_factory=dict_row)

    def fetch_active_batches(self) -> list[ActiveBatch]:
        """Batch yang masih berjalan / baru dipanen — yang sudah lama selesai dilewati.

        `subscription_active` menentukan apakah batch BARU boleh diverifikasi (FR-9.1).
        Batch yang PO-nya sudah terjual tetap diverifikasi walau langganan lapse (FR-9.3),
        karena itu kewajiban ke pembeli — lihat pemakaiannya di pipeline.
        """
        sql = """
            SELECT
                b.id::text                              AS batch_id,
                lp.id::text                             AS land_plot_id,
                ST_AsGeoJSON(lp.polygon)                AS polygon_geojson,
                lp.area_ha::float                       AS area_ha,
                lp.verification_tier::text              AS verification_tier,
                b.claimed_plant_date,
                b.claimed_harvest_date,
                b.production_status::text               AS production_status,
                c.name                                  AS commodity_name,
                EXISTS (
                    SELECT 1 FROM timeline_nodes tn
                    JOIN node_photos np ON np.node_id = tn.id
                    WHERE tn.batch_id = b.id
                )                                       AS has_photo_evidence,
                COALESCE((
                    SELECT s.status = 'ACTIVE' OR s.status = 'GRACE'
                    FROM subscriptions s
                    WHERE s.tenant_id = p.tenant_id
                    ORDER BY s.period_end DESC LIMIT 1
                ), false)                               AS subscription_active,
                b.quota_box_sold > 0                    AS has_sold_quota
            FROM batches b
            JOIN products  p  ON p.id  = b.product_id
            JOIN commodities c ON c.id = p.commodity_id
            JOIN land_plots lp ON lp.id = b.land_plot_id
            WHERE b.production_status IN ('PLANNING', 'GROWING', 'HARVESTED')
            ORDER BY b.claimed_harvest_date
        """
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        out: list[ActiveBatch] = []
        for r in rows:
            # FR-9.3: batch dengan PO terjual tetap diverifikasi meski langganan lapse.
            effective_sub = bool(r["subscription_active"]) or bool(r["has_sold_quota"])
            out.append(
                ActiveBatch(
                    batch_id=r["batch_id"],
                    land_plot_id=r["land_plot_id"],
                    polygon_geojson=json.loads(r["polygon_geojson"]),
                    area_ha=r["area_ha"],
                    verification_tier=r["verification_tier"],
                    claimed_plant_date=r["claimed_plant_date"],
                    claimed_harvest_date=r["claimed_harvest_date"],
                    production_status=r["production_status"],
                    commodity_name=r["commodity_name"],
                    has_photo_evidence=bool(r["has_photo_evidence"]),
                    subscription_active=effective_sub,
                )
            )
        return out

    def upsert_observation(
        self,
        land_plot_id: str,
        scene_date: date,
        cloud_pct: float,
        ndvi_mean: float | None,
        ndmi_mean: float | None,
        usable: bool,
    ) -> None:
        """Idempoten: menjalankan ulang worker di hari yang sama tidak menggandakan baris."""
        sql = """
            INSERT INTO satellite_observations
                (land_plot_id, scene_date, cloud_pct, ndvi_mean, ndmi_mean, usable)
            VALUES (%s::uuid, %s, %s, %s, %s, %s)
            ON CONFLICT (land_plot_id, scene_date) DO UPDATE SET
                cloud_pct = EXCLUDED.cloud_pct,
                ndvi_mean = EXCLUDED.ndvi_mean,
                ndmi_mean = EXCLUDED.ndmi_mean,
                usable    = EXCLUDED.usable
        """
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, (land_plot_id, scene_date, cloud_pct, ndvi_mean, ndmi_mean, usable))
            conn.commit()

    def load_observations(self, land_plot_id: str) -> list[dict]:
        sql = """
            SELECT scene_date, ndvi_mean::float, ndmi_mean::float, cloud_pct::float, usable
            FROM satellite_observations
            WHERE land_plot_id = %s::uuid
            ORDER BY scene_date
        """
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, (land_plot_id,))
            return cur.fetchall()

    def update_batch_verification(
        self,
        batch_id: str,
        status: str,
        detected_plant_date: date | None,
        detected_harvest_date: date | None,
    ) -> None:
        sql = """
            UPDATE batches
            SET verification_status = %s::"VerificationStatus",
                detected_plant_date = %s,
                detected_harvest_date = %s
            WHERE id = %s::uuid
        """
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, (status, detected_plant_date, detected_harvest_date, batch_id))
            conn.commit()
