-- Aturan integritas ERD #8 — FR-7.11.
--
--   price_gap_borne_by_tenant ≤ 10% nilai PO yang gagal, KECUALI cap_waived = true
--
-- ERD menuliskannya sebagai CHECK, tetapi CHECK di PostgreSQL tidak boleh membaca tabel
-- lain, sementara nilai PO yang gagal hidup di ORDER_ITEMS.unit_price_locked. Jadi
-- ditegakkan sebagai TRIGGER — sama seperti aturan #1 (append-only) dan #3 (GPS di dalam
-- poligon) pada daftar yang sama. Yang penting bukan bentuk sintaksisnya, melainkan bahwa
-- pagarnya berada di basis data: aturan ini menyangkut uang, dan ia harus berlaku juga
-- untuk skrip, migrasi, dan koneksi administratif yang tidak melewati NestJS.

CREATE OR REPLACE FUNCTION cek_cap_selisih_substitusi() RETURNS trigger AS $$
DECLARE
  nilai_po bigint;
  batas    bigint;
BEGIN
  IF NEW.price_gap_borne_by_tenant IS NULL OR NEW.price_gap_borne_by_tenant = 0 THEN
    RETURN NEW;
  END IF;

  -- Cap GUGUR: hasil dinilai TIDAK_WAJAR atau satelit menyatakan klaimnya TIDAK_SESUAI.
  -- Tenant menanggung selisih penuh, jadi tidak ada batas yang perlu diperiksa.
  IF NEW.cap_waived THEN
    RETURN NEW;
  END IF;

  SELECT oi.unit_price_locked::bigint * NEW.shortfall_box
    INTO nilai_po
    FROM order_items oi
   WHERE oi.id = NEW.order_item_id;

  IF nilai_po IS NULL THEN
    RAISE EXCEPTION 'Resolusi assurance menunjuk order item yang tidak ada: %', NEW.order_item_id;
  END IF;

  batas := floor(nilai_po * 0.10);

  IF NEW.price_gap_borne_by_tenant > batas THEN
    RAISE EXCEPTION
      'Selisih harga substitusi (%) melampaui batas tanggungan Tenant (%) untuk nilai PO gagal %, dan cap tidak gugur',
      NEW.price_gap_borne_by_tenant, batas, nilai_po
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cap_selisih_substitusi ON assurance_resolutions;
CREATE TRIGGER trg_cap_selisih_substitusi
  BEFORE INSERT OR UPDATE ON assurance_resolutions
  FOR EACH ROW EXECUTE FUNCTION cek_cap_selisih_substitusi();
