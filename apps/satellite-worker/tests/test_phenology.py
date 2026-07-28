"""Uji aturan keputusan verifikasi (PRD §6.2 poin 5, FR-4.5).

Bagian ini yang paling berbahaya kalau salah: statusnya menentukan badge yang
dilihat pembeli dan premium harga yang dibayar. Karena itu diuji terpisah dari
pengambilan citra.
"""

from datetime import date, timedelta

import pytest

from src.phenology import (
    EMERGENCE_LAG_DAYS,
    MIN_USABLE_OBSERVATIONS,
    Observation,
    classify,
    detect_phenology,
)


def series(plant: date, harvest: date, *, step: int = 5, cloudy: set[int] | None = None,
           start_offset: int = 30, end_offset: int = 20,
           emergence_days: int = EMERGENCE_LAG_DAYS) -> list[Observation]:
    """Deret NDVI yang MENIRU FISIOLOGI NYATA.

    Penting: ada masa perkecambahan `emergence_days` di mana NDVI masih setara tanah
    terbuka meski benih sudah ditanam — satelit belum bisa melihat apa pun. Fixture
    tanpa fase ini membuat pengujian menyesatkan, karena lag yang justru ingin
    dikoreksi tidak pernah muncul.
    """
    cloudy = cloudy or set()
    obs: list[Observation] = []
    d = plant - timedelta(days=start_offset)
    i = 0
    while d <= harvest + timedelta(days=end_offset):
        days_since_plant = (d - plant).days
        if d < plant:
            v = 0.15
        elif d >= harvest:
            v = 0.18
        elif days_since_plant < emergence_days:
            # Perkecambahan: tanah masih dominan, kenaikan nyaris tak terlihat.
            v = 0.15 + 0.05 * (days_since_plant / emergence_days)
        else:
            # Pertumbuhan tajuk: naik menuju ~0,80 dalam ~30 hari.
            t = (days_since_plant - emergence_days) / 30.0
            v = 0.20 + 0.60 * min(t, 1.0)
        is_cloudy = i in cloudy
        obs.append(Observation(d, v, 0.3, 85.0 if is_cloudy else 5.0, usable=not is_cloudy))
        d += timedelta(days=step)
        i += 1
    return obs


class TestDeteksiFenologi:
    def test_menemukan_tanam_dan_panen(self):
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        ph = detect_phenology(series(plant, harvest))
        assert ph.detected_plant_date is not None
        assert ph.detected_harvest_date is not None
        # Toleransi 1 interval revisit (5 hari) — satelit tidak melihat tiap hari.
        assert abs((ph.detected_plant_date - plant).days) <= 5
        assert abs((ph.detected_harvest_date - harvest).days) <= 5

    def test_lahan_kosong_tidak_menghasilkan_deteksi(self):
        obs = [Observation(date(2026, 7, 1) + timedelta(days=5 * i), 0.12, 0.2, 5.0, True) for i in range(10)]
        ph = detect_phenology(obs)
        assert ph.detected_plant_date is None

    def test_panen_tidak_dideteksi_sebelum_tanam(self):
        """Penurunan NDVI sebelum ada penanaman tidak boleh dianggap panen."""
        obs = [
            Observation(date(2026, 7, 1), 0.60, 0.3, 5.0, True),
            Observation(date(2026, 7, 6), 0.20, 0.3, 5.0, True),
            Observation(date(2026, 7, 11), 0.18, 0.3, 5.0, True),
            Observation(date(2026, 7, 16), 0.17, 0.3, 5.0, True),
        ]
        ph = detect_phenology(obs)
        assert ph.detected_harvest_date is None


class TestKlasifikasi:
    def test_klaim_tepat_menghasilkan_terverifikasi(self):
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        v = classify(series(plant, harvest), plant, harvest)
        assert v.status == "TERVERIFIKASI"

    def test_selisih_sedang_menghasilkan_perlu_ditinjau(self):
        """Selisih 7-21 hari → ditinjau, bukan langsung dituduh tidak sesuai."""
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        v = classify(series(plant, harvest), plant - timedelta(days=14), harvest)
        assert v.status == "PERLU_DITINJAU"

    def test_selisih_besar_menghasilkan_tidak_sesuai(self):
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        v = classify(series(plant, harvest), plant - timedelta(days=40), harvest)
        assert v.status == "TIDAK_SESUAI"

    def test_awan_tebal_menghasilkan_tidak_dapat_bukan_tebakan(self):
        """§5.4.3 — sistem harus jujur mengaku tidak bisa, bukan menebak."""
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        obs = series(plant, harvest)
        # Sisakan observasi layak di bawah ambang minimum.
        cloudy_all = set(range(len(obs) - (MIN_USABLE_OBSERVATIONS - 1)))
        obs = series(plant, harvest, cloudy=cloudy_all)
        v = classify(obs, plant, harvest)
        assert v.status == "TIDAK_DAPAT"
        assert "awan" in v.reason.lower() or "layak" in v.reason.lower()

    def test_status_ditentukan_selisih_TERBURUK(self):
        """Tanggal tanam tepat tapi panen meleset jauh tetap harus turun derajat."""
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        v = classify(series(plant, harvest), plant, harvest - timedelta(days=40))
        assert v.status == "TIDAK_SESUAI"

    def test_batas_tepat_7_hari_masih_terverifikasi(self):
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        obs = series(plant, harvest)
        ph = detect_phenology(obs)
        # Geser klaim persis 7 hari dari hasil deteksi.
        v = classify(obs, ph.detected_plant_date - timedelta(days=7), ph.detected_harvest_date)
        assert v.plant_diff_days == 7
        assert v.status == "TERVERIFIKASI"

    def test_batas_8_hari_sudah_perlu_ditinjau(self):
        plant, harvest = date(2026, 7, 1), date(2026, 9, 29)
        obs = series(plant, harvest)
        ph = detect_phenology(obs)
        v = classify(obs, ph.detected_plant_date - timedelta(days=8), ph.detected_harvest_date)
        assert v.plant_diff_days == 8
        assert v.status == "PERLU_DITINJAU"


class TestPesanTidakMenuduh:
    """Tanaman muda TIDAK boleh dilaporkan sebagai 'lahan tidak ditanami'.

    Status ini tampil ke pembeli (FR-4.6), jadi salah kata = menuduh Tenant
    yang tidak bersalah dan merusak reputasinya.
    """

    def _deret_muda(self, plant: date, hari: int = 20) -> list[Observation]:
        """Tanaman baru beberapa minggu — NDVI masih di bawah ambang tajuk."""
        obs = []
        d = plant - timedelta(days=20)
        while d <= plant + timedelta(days=hari):
            v = 0.15 if d < plant else 0.15 + 0.008 * (d - plant).days
            obs.append(Observation(d, v, 0.3, 5.0, True))
            d += timedelta(days=5)
        return obs

    def test_tanaman_muda_dilaporkan_belum_selesai_bukan_tidak_ditanami(self):
        plant = date(2026, 7, 1)
        harvest = date(2026, 9, 29)  # masih jauh di depan
        ph = detect_phenology(self._deret_muda(plant), expected_harvest=harvest)
        assert ph.detected_plant_date is None
        assert "belum selesai" in ph.reason.lower()
        assert "tidak ditanami" not in ph.reason.lower()

    def test_lahan_benar_benar_kosong_sepanjang_siklus_tetap_dituduh(self):
        """Kalau jendela amatan MELEWATI tanggal panen dan tetap kosong, barulah wajar disebut tidak ditanami."""
        harvest = date(2026, 7, 20)
        obs = [Observation(date(2026, 7, 1) + timedelta(days=5 * i), 0.12, 0.2, 5.0, True) for i in range(10)]
        ph = detect_phenology(obs, expected_harvest=harvest)
        assert ph.detected_plant_date is None
        assert "tidak ditanami" in ph.reason.lower()
