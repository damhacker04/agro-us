-- ---------------------------------------------------------------------------
-- Demand Intelligence (FR-8.1) — mengganti materialized view v1 dari 0_init.
--
-- Kenapa v1 dibuang, bukan disempurnakan:
--   1. `demanded_box` menghitung order_items, yaitu permintaan yang SUDAH dilayani.
--      Setiap barisnya ada karena suatu Tenant lebih dulu membuka kuota, jadi
--      permintaan secara struktural tidak pernah bisa melebihi pasokan.
--   2. Grain-nya bertumpu pada claimed_harvest_date batch yang SUDAH ADA. Untuk
--      minggu panen yang belum ada Tenant membuka kuota sama sekali, barisnya tidak
--      terbentuk — padahal justru itu kasus yang dicontohkan FR-8.2.
--   3. `gap_box` mengurangkan sisa kuota (stok) dari pesanan (arus) — besaran yang
--      tidak punya arti.
--   4. saturation_pct = 100 saat permintaan nol, sehingga "tidak diketahui" tampil
--      sebagai "sudah tertutup" dan justru menekan rekomendasi.
--
-- Penggantinya dihitung LANGSUNG di query (apps/api/src/modules/intelligence).
-- Volumenya kecil (zona x komoditas x 9 minggu) dan belum ada penjadwal cron di
-- sistem ini; matview yang basi akan menyarankan penanaman berdasarkan data lama.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS demand_aggregates;

CREATE TYPE "DemandSignalType" AS ENUM ('CARI_KOSONG', 'KUOTA_HABIS');

-- Bukti permintaan yang GAGAL dilayani. Tanpa tabel ini permintaan hanya terlihat
-- dari pesanan yang berhasil.
CREATE TABLE "demand_signals" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "zone_id"        UUID NOT NULL REFERENCES "zones"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "commodity_id"   UUID REFERENCES "commodities"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "buyer_id"       UUID REFERENCES "buyers"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "signal_type"    "DemandSignalType" NOT NULL,
  -- KG, bukan box: isi box berbeda antar Tenant sehingga box tidak bisa dijumlahkan.
  "qty_kg_wanted"  NUMERIC(10, 2),
  "search_term"    TEXT,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_signals_qty_positive" CHECK ("qty_kg_wanted" IS NULL OR "qty_kg_wanted" > 0)
);

CREATE INDEX "demand_signals_zone_commodity_created_idx"
  ON "demand_signals" ("zone_id", "commodity_id", "created_at");
