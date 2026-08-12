-- Penyelarasan dengan ERD v2.3 — koreksi atas migrasi 20260807000000.
--
-- Tiga penyimpangan dari ERD yang sudah terlanjur terpasang:
--   1. SHORTFALL_SENIORITY menunjuk batch, seharusnya order item.
--   2. ORDER_ITEMS.seniority_applied tidak ada.
--   3. TENANTS masih memakai rasio mentah, seharusnya posisi relatif.

-- ---------- 1. SHORTFALL_SENIORITY menunjuk ORDER ITEM ----------
--
-- Satu batch dapat melahirkan shortfall pada beberapa pembeli sekaligus. Menunjuk batch
-- kehilangan informasi shortfall YANG MANA yang sedang dikompensasi, dan membuat kolom
-- "dipakai oleh" tidak bisa menyatakan pesanan mana yang menikmati prioritas itu.
--
-- Tabel dibentuk ulang, bukan di-ALTER: memetakan batch → order item pada baris lama
-- bersifat menebak, sedangkan haknya bisa diturunkan ulang secara pasti dari shortfall
-- yang memang tercatat di order_items.
DROP TABLE IF EXISTS "shortfall_seniority";

CREATE TABLE "shortfall_seniority" (
  "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id"                  UUID        NOT NULL REFERENCES "buyers"(id),
  "tenant_id"                 UUID        NOT NULL REFERENCES "tenants"(id),
  "source_order_item_id"      UUID        NOT NULL REFERENCES "order_items"(id),
  "granted_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "consumed_by_order_item_id" UUID REFERENCES "order_items"(id),
  "consumed_at"               TIMESTAMPTZ
);

CREATE INDEX "shortfall_seniority_tenant_idx" ON "shortfall_seniority"("tenant_id", "consumed_at");
CREATE INDEX "shortfall_seniority_buyer_idx"  ON "shortfall_seniority"("buyer_id",  "consumed_at");

-- Aturan integritas ERD #7 — satu hak aktif per pasangan pembeli × Tenant.
CREATE UNIQUE INDEX "shortfall_seniority_aktif_unik"
  ON "shortfall_seniority"("buyer_id", "tenant_id")
  WHERE "consumed_at" IS NULL;

-- Turunkan ulang hak yang aktif dari shortfall yang benar-benar tercatat. DISTINCT ON
-- menjaga satu hak per pasangan (indeks unik di atas menolak lebih); yang dipilih adalah
-- shortfall terbaru, karena itu yang paling relevan dikompensasi siklus berikutnya.
INSERT INTO "shortfall_seniority" (buyer_id, tenant_id, source_order_item_id, granted_at)
SELECT DISTINCT ON (o.buyer_id, p.tenant_id)
       o.buyer_id, p.tenant_id, oi.id, now()
FROM order_items oi
JOIN orders   o ON o.id = oi.order_id
JOIN batches  b ON b.id = oi.batch_id
JOIN products p ON p.id = b.product_id
WHERE oi.qty_box_fulfilled IS NOT NULL
  AND oi.qty_box_fulfilled < oi.qty_box
ORDER BY o.buyer_id, p.tenant_id, b.claimed_harvest_date DESC;

-- ---------- 2. ORDER_ITEMS.seniority_applied ----------
--
-- Sengaja redundan terhadap tabel di atas (ERD v2.3 poin 4): alokasi adalah keputusan
-- finansial yang harus dapat diaudit dari sisi pesanan tanpa join, dan nilainya beku
-- setelah alokasi selesai.
ALTER TABLE "order_items" ADD COLUMN "seniority_applied" BOOLEAN NOT NULL DEFAULT false;

-- ---------- 3. TENANTS: rasio mentah → posisi relatif ----------
--
-- ERD v2.3 mengganti `shortfall_ratio_cached` dengan `yield_position_cached`. Angka mentah
-- mengundang dibandingkan dengan ambang — dan begitu dibandingkan, ambangnya tersimpulkan
-- meski tidak pernah ditampilkan (FR-7.12c).
--
-- Nilainya BELUM diisi: posisi relatif memerlukan ZONE_YIELD_BENCHMARK yang dibangun pada
-- tahap berikutnya. NULL di sini berarti "belum ada dasar pembanding", dan itulah yang
-- ditampilkan apa adanya — bukan diisi 0 yang akan terbaca sebagai "tepat rata-rata".
ALTER TABLE "tenants" ADD COLUMN "yield_position_cached" NUMERIC(6,2);
ALTER TABLE "tenants" ADD COLUMN "clean_cycles_streak"   INT NOT NULL DEFAULT 0;
ALTER TABLE "tenants" DROP COLUMN "shortfall_ratio_cached";
