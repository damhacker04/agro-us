-- Aturan integritas ERD #2 dan #6 — dua pagar terakhir yang masih hidup hanya di aplikasi.
--
-- Keduanya ditegakkan sebagai TRIGGER, bukan CHECK, karena rumusnya membaca tabel lain
-- (land_plots, commodities, products, tenants, zone_yield_benchmark) dan CHECK PostgreSQL
-- tidak boleh melakukannya. Yang penting pagarnya berada di basis data: seed, migrasi,
-- skrip perbaikan, dan koneksi administratif tidak melewati NestJS.

-- ============================ #2 — BATAS KUOTA PRE-ORDER ============================
--
--   quota_box_total ≤ effective_area_ha × avg_yield_kg_per_ha × quota_multiplier ÷ qty_kg_per_box
--
-- ⚠️ Catatan atas teks ERD. Aturan #2 di dokumen tertulis "0.70 × quota_multiplier".
-- Itu menghitung pembatasnya dua kali: `quota_multiplier` MEMANG 0,70 pada keadaan normal
-- (dan 0,50 saat penalti), sehingga mengalikannya lagi dengan 0,70 menghasilkan 0,49 dan
-- memangkas kapasitas setiap Tenant sekitar 30% tanpa alasan. FR-3.3 menuliskannya sebagai
-- satu pengali — "luas poligon × rendemen rata-rata komoditas × quota_multiplier" — dan
-- itulah yang dipakai di sini serta di BatchService.getCapacity.
--
-- Memakai `effective_area_ha` sesuai aturan #2, dengan mundur ke `area_ha` bila luas efektif
-- belum pernah dihitung. Jalur mundur itu LEBIH LONGGAR, jadi sengaja disempitkan pada satu
-- kondisi saja: NULL berarti belum terhitung, bukan berarti nol.
--
-- Hanya berlaku saat kuota DIBUKA atau DIUBAH. Tidak boleh dievaluasi ulang pada UPDATE
-- lain, karena `quota_multiplier` bisa turun ke 0,50 belakangan akibat penalti — dan bila
-- pagar ini ikut menilai ulang batch lama, pencatatan panen milik Tenant yang sedang kena
-- penalti akan gagal justru pada saat ia paling butuh menyelesaikan siklusnya.

CREATE OR REPLACE FUNCTION cek_batas_kuota_po() RETURNS trigger AS $$
DECLARE
  luas_ha    numeric;
  rendemen   numeric;
  pengali    numeric;
  kg_per_box numeric;
  batas      bigint;
BEGIN
  SELECT COALESCE(lp.effective_area_ha, lp.area_ha),
         c.avg_yield_kg_per_ha,
         t.quota_multiplier,
         p.qty_kg_per_box
    INTO luas_ha, rendemen, pengali, kg_per_box
    FROM land_plots  lp
    JOIN products    p ON p.id = NEW.product_id
    JOIN commodities c ON c.id = p.commodity_id
    JOIN tenants     t ON t.id = p.tenant_id
   WHERE lp.id = NEW.land_plot_id;

  IF luas_ha IS NULL OR kg_per_box IS NULL OR kg_per_box <= 0 THEN
    RAISE EXCEPTION 'Kapasitas lahan tidak dapat dihitung untuk batch ini (lahan % / produk %)',
      NEW.land_plot_id, NEW.product_id
      USING ERRCODE = 'check_violation';
  END IF;

  batas := floor(luas_ha * rendemen * pengali / kg_per_box);

  IF NEW.quota_box_total > batas THEN
    RAISE EXCEPTION
      'Kuota % box melampaui kapasitas lahan (maksimum % box = % ha x % kg/ha x % / % kg per box)',
      NEW.quota_box_total, batas, round(luas_ha, 4), rendemen, pengali, kg_per_box
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batas_kuota_po ON batches;
CREATE TRIGGER trg_batas_kuota_po
  BEFORE INSERT ON batches
  FOR EACH ROW EXECUTE FUNCTION cek_batas_kuota_po();

DROP TRIGGER IF EXISTS trg_batas_kuota_po_ubah ON batches;
CREATE TRIGGER trg_batas_kuota_po_ubah
  BEFORE UPDATE OF quota_box_total ON batches
  FOR EACH ROW
  WHEN (NEW.quota_box_total IS DISTINCT FROM OLD.quota_box_total)
  EXECUTE FUNCTION cek_batas_kuota_po();

-- ====================== #6 — BENCHMARK BUTUH 5 PEMBANDING ======================
--
-- `basis = PITA_PLUS_BENCHMARK` menyatakan penilaian ini berdiri di atas perbandingan
-- lintas-Tenant. Klaim itu harus benar, karena `basis` yang menentukan boleh-tidaknya
-- cabang PNB menjatuhkan penalti (FR-7.12e). Di bawah lima pembanding, rata-rata zona
-- adalah kebisingan yang menyamar sebagai bukti.

CREATE OR REPLACE FUNCTION cek_dasar_benchmark() RETURNS trigger AS $$
DECLARE
  sampel int;
BEGIN
  IF NEW.basis <> 'PITA_PLUS_BENCHMARK'::"AssessmentBasis" THEN
    RETURN NEW;
  END IF;

  SELECT MAX(zb.batch_sample_count)
    INTO sampel
    FROM batches b
    JOIN products p     ON p.id = b.product_id
    JOIN order_items oi ON oi.batch_id = b.id
    JOIN shipments s    ON s.id = oi.shipment_id
    JOIN zone_yield_benchmark zb
           ON zb.zone_id      = s.zone_id
          AND zb.commodity_id = p.commodity_id
          AND zb.harvest_week = date_trunc('week', b.claimed_harvest_date)::date
   WHERE b.id = NEW.batch_id;

  IF COALESCE(sampel, 0) < 5 THEN
    RAISE EXCEPTION
      'basis PITA_PLUS_BENCHMARK butuh minimal 5 batch pembanding, tersedia %', COALESCE(sampel, 0)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dasar_benchmark ON yield_assessments;
CREATE TRIGGER trg_dasar_benchmark
  BEFORE INSERT OR UPDATE OF basis ON yield_assessments
  FOR EACH ROW EXECUTE FUNCTION cek_dasar_benchmark();
