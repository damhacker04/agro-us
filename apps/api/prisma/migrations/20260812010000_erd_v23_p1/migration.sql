-- ERD v2.3 — fondasi Pita Kewajaran Hasil (FR-4.10, FR-7.12).
--
-- Dua tabel baru, satu materialized view, sembilan kolom. Seluruh mekanisme v2.3
-- berdiri di atas ini.

-- ============================== ENUM ==============================

-- Empat nilai, bukan tiga. `TIDAK_DAPAT_DINILAI` WAJIB terpisah dari `PERLU_DITINJAU`:
-- yang pertama berarti sistem tidak punya dasar (awan, zona sepi), yang kedua berarti
-- ada dasar tetapi hasilnya marginal. Menggabungkannya membuat Tenant merasa dituduh
-- karena mendung — cara tercepat kehilangan sisi pasok (aturan desain v2.3 butir 2).
CREATE TYPE "YieldPlausibility" AS ENUM (
  'WAJAR', 'PERLU_DITINJAU', 'TIDAK_WAJAR', 'TIDAK_DAPAT_DINILAI'
);

-- Merekam ATAS DASAR APA penilaian dibuat. Tanpa ini, `WAJAR` yang lahir dari pita saja
-- tidak bisa dibedakan dari `WAJAR` yang lahir dari pita + benchmark — padahal keduanya
-- punya kekuatan bukti yang sangat berbeda (ERD v2.3 poin 1).
CREATE TYPE "AssessmentBasis" AS ENUM ('PITA_SAJA', 'PITA_PLUS_BENCHMARK', 'TIDAK_ADA_DASAR');

CREATE TYPE "FailureReason" AS ENUM ('CUACA', 'HAMA', 'PENYAKIT', 'LAINNYA');

-- Callback disbursement bisa gagal. Tanpa status ini, satu callback yang hilang membuat
-- ledger append-only menyatakan dana sudah cair padahal belum — dan tidak ada baris yang
-- bisa dikoreksi (ERD v2.3 poin 6).
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SUCCESS', 'RETRY');

CREATE TYPE "Season" AS ENUM ('MUSIM_HUJAN', 'MUSIM_KEMARAU');

-- ============================== KOLOM BARU ==============================

ALTER TABLE "commodities" ADD COLUMN "ambient_stable" BOOLEAN NOT NULL DEFAULT false;

-- Piksel tepi poligon terkontaminasi jalan, pematang, dan pohon tetangga. Pita kewajaran
-- memakai luas EFEKTIF; kuota tetap memakai luas nominal. Menyamakan keduanya membuat pita
-- sistematis terlalu tinggi dan SETIAP Tenant terlihat kekurangan hasil (ERD v2.3 poin 8).
--
-- Sengaja NULLABLE, bukan diisi `area_ha`. Untuk poligon lama nilainya belum pernah
-- dihitung, dan menebaknya sama dengan membuat pita yang salah lalu menghukum orang
-- berdasarkan tebakan itu. NULL berarti pita tidak dapat dihitung → TIDAK_DAPAT_DINILAI.
ALTER TABLE "land_plots" ADD COLUMN "effective_area_ha" NUMERIC(10, 4);

ALTER TABLE "batches" ADD COLUMN "peak_ndvi" NUMERIC(6, 4);
ALTER TABLE "batches" ADD COLUMN "plausibility_cached" "YieldPlausibility";

ALTER TABLE "timeline_nodes" ADD COLUMN "failure_reason" "FailureReason";

ALTER TABLE "orders" ADD COLUMN "traceability_report_opted" BOOLEAN NOT NULL DEFAULT false;

-- Memisahkan Notif-2 (±1 km) dari Notif-3 (geofence 100 m). Jendela 60 menit dihitung
-- dari `arrived_at`, BUKAN dari notifikasi pertama yang diterima pembeli — tanpa dua kolom
-- terpisah aturan FR-10.2 tidak dapat ditegakkan maupun diaudit (ERD v2.3 poin 7).
ALTER TABLE "shipments" ADD COLUMN "notified_1km_at" TIMESTAMPTZ(6);

ALTER TABLE "escrow_ledger" ADD COLUMN "settlement_status" "SettlementStatus" NOT NULL DEFAULT 'SUCCESS';

ALTER TABLE "assurance_resolutions" ADD COLUMN "cap_waived" BOOLEAN NOT NULL DEFAULT false;

-- ============================== TABEL BARU ==============================

-- Kurva vegetasi & rendemen acuan per komoditas per musim — aset kalibrasi yang §6.2
-- poin 8 sebut sebagai moat teknis. `calibration_source` menyatakan terus terang bahwa
-- angkanya wajib divalidasi ke penyuluh atau BPS, bukan ditebak.
CREATE TABLE "commodity_season_baselines" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "commodity_id"        UUID    NOT NULL REFERENCES "commodities"(id),
  "season"              "Season" NOT NULL,
  "ndvi_peak_reference" NUMERIC(6, 4) NOT NULL,
  "vigor_curve_params"  JSONB   NOT NULL DEFAULT '{}'::jsonb,
  "typical_cycle_days"  INT     NOT NULL,
  "calibration_source"  TEXT    NOT NULL,
  CONSTRAINT "commodity_season_unik" UNIQUE ("commodity_id", "season")
);

-- TABEL, bukan kolom di batches (ERD v2.3 poin 1): satu batch dapat dinilai ULANG saat
-- scene satelit baru menembus awan, dan halaman TN-35 menuntut riwayatnya.
CREATE TABLE "yield_assessments" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "batch_id"            UUID        NOT NULL REFERENCES "batches"(id),
  "assessed_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reported_box"        INT         NOT NULL,
  -- Rentang, bukan angka tunggal, dan sengaja LEBAR: tujuannya menandai laporan yang
  -- tidak masuk akal, bukan mengaudit selisih kecil (§6.2 poin 6).
  "expected_yield_min"  NUMERIC(12, 2),
  "expected_yield_max"  NUMERIC(12, 2),
  "peak_ndvi_used"      NUMERIC(6, 4),
  "zone_benchmark_ratio" NUMERIC(6, 4),
  "basis"               "AssessmentBasis"   NOT NULL,
  "verdict"             "YieldPlausibility" NOT NULL,
  "reviewed_by"         UUID REFERENCES "users"(id),
  "sla_due_at"          TIMESTAMPTZ,
  "final_verdict"       "YieldPlausibility"
);

CREATE INDEX "yield_assessments_batch_idx"  ON "yield_assessments"("batch_id", "assessed_at" DESC);
-- Antrean Operator OP-13: yang menunggu putusan, paling mepet SLA di atas.
CREATE INDEX "yield_assessments_antrean_idx" ON "yield_assessments"("sla_due_at")
  WHERE "verdict" = 'PERLU_DITINJAU' AND "final_verdict" IS NULL;

-- ============================== BENCHMARK ZONA ==============================

-- Rata-rata realisasi lintas-Tenant per komoditas + zona + minggu panen (FR-7.12b).
--
-- Matview, bukan query langsung — berbeda dari DEMAND_AGGREGATES yang dibuang pada
-- migrasi 20260729000000. Alasannya berbeda pula: isi tabel ini adalah FAKTA HISTORIS
-- batch yang sudah selesai, bukan proyeksi ke depan, dan penyegarannya dipicu KEJADIAN
-- (batch mencapai Selesai) bukan jadwal — sehingga tidak bisa basi tanpa ada yang berubah.
--
-- `stddev` ikut disimpan karena yang dinilai adalah DEVIASI terhadap zona, bukan angka
-- absolut: musim buruk yang menimpa semua orang menggeser rata-rata dan tidak menghukum
-- siapa pun, sementara Tenant yang menyimpang sendirian pada musim normal langsung terlihat.
-- Dedupe ke tingkat BATCH lebih dulu. Satu batch bisa punya banyak order item dalam zona
-- yang sama; mengagregasi langsung di atas hasil join membuat batch yang laku ke banyak
-- pembeli terhitung berkali-kali dan mendominasi rata-rata zona. Rasio realisasi adalah
-- sifat batch, bukan sifat baris pesanan.
CREATE MATERIALIZED VIEW "zone_yield_benchmark" AS
WITH batch_zona AS (
  SELECT DISTINCT
         s.zone_id,
         p.commodity_id,
         b.id AS batch_id,
         date_trunc('week', b.claimed_harvest_date)::date AS harvest_week,
         b.quota_box_fulfilled::numeric / b.quota_box_sold AS fulfillment_ratio
  FROM batches b
  JOIN products p     ON p.id = b.product_id
  JOIN order_items oi ON oi.batch_id = b.id
  JOIN shipments s    ON s.id = oi.shipment_id
  WHERE b.production_status IN ('HARVESTED', 'FAILED')
    AND b.quota_box_sold > 0
    AND b.quota_box_fulfilled IS NOT NULL
)
SELECT zone_id,
       commodity_id,
       harvest_week,
       COUNT(*)::int                    AS batch_sample_count,
       AVG(fulfillment_ratio)           AS avg_fulfillment_ratio,
       STDDEV_POP(fulfillment_ratio)    AS stddev_fulfillment_ratio,
       now()                            AS refreshed_at
FROM batch_zona
GROUP BY 1, 2, 3;

-- Unique index wajib agar REFRESH ... CONCURRENTLY bisa dipakai; tanpa CONCURRENTLY,
-- penyegaran mengunci view dan pembacaan penilaian ikut terblokir.
CREATE UNIQUE INDEX "zone_yield_benchmark_unik"
  ON "zone_yield_benchmark"("zone_id", "commodity_id", "harvest_week");
