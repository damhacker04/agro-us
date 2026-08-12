-- ESCROW_LEDGER.settlement_status — ERD v2.3 poin 6.
--
-- Kolomnya ditambahkan pada migrasi 20260812010000, tetapi sampai sekarang MATI: tabel ini
-- append-only lewat trigger `reject_mutation`, yang menolak SEMUA update. Status yang tidak
-- pernah bisa berpindah dari PENDING sama saja dengan tidak ada.
--
-- Jalan keluarnya bukan melonggarkan append-only, melainkan mempersempit pengecualiannya
-- sampai sesempit mungkin: SATU kolom boleh berubah, dan hanya searah.
--
--   PENDING -> SUCCESS | RETRY
--   RETRY   -> SUCCESS | RETRY
--   SUCCESS -> (tidak ke mana-mana)
--
-- Yang tetap kekal adalah yang menjadi alasan tabel ini append-only sejak awal: jumlah,
-- jenis entri, pemilik, dan waktunya. Tak satu pun boleh berubah. Yang berpindah hanyalah
-- catatan tentang apakah instruksi ke mitra pembayaran sudah benar-benar berhasil — dan
-- itu memang fakta yang baru diketahui BELAKANGAN, bukan revisi atas fakta lama.
--
-- SUCCESS sengaja terminal. Begitu dana dinyatakan sampai, membalikkannya berarti menulis
-- ulang sejarah uang; koreksinya adalah baris ledger BARU, sesuai aturan aslinya.

CREATE OR REPLACE FUNCTION cek_perubahan_penyaluran() RETURNS trigger AS $$
BEGIN
  IF NEW.id            IS DISTINCT FROM OLD.id
  OR NEW.order_id      IS DISTINCT FROM OLD.order_id
  OR NEW.shipment_id   IS DISTINCT FROM OLD.shipment_id
  OR NEW.tenant_id     IS DISTINCT FROM OLD.tenant_id
  OR NEW.entry_type    IS DISTINCT FROM OLD.entry_type
  OR NEW.amount        IS DISTINCT FROM OLD.amount
  OR NEW.gateway_ref   IS DISTINCT FROM OLD.gateway_ref
  OR NEW.created_at    IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'escrow_ledger append-only (PRD 6.1): hanya settlement_status yang boleh berubah. Koreksi = tambah baris baru.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.settlement_status = 'SUCCESS'::"SettlementStatus"
     AND NEW.settlement_status <> 'SUCCESS'::"SettlementStatus" THEN
    RAISE EXCEPTION
      'Penyaluran yang sudah SUCCESS tidak dapat dibatalkan; koreksi = baris ledger baru.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- URUTAN PENTING: bersihkan dulu, pasang pagar belakangan.
--
-- Entri lama menyatakan SUCCESS karena itu nilai DEFAULT kolomnya, bukan karena ada
-- callback mitra pembayaran yang pernah berhasil — instruksi pencairan sungguhan memang
-- belum tersambung (§5.7.1). Nilai itu bukan klaim yang pernah dibuat proses mana pun,
-- jadi mengoreksinya bukan menulis ulang sejarah; ia menghapus pernyataan yang tidak
-- pernah ada dasarnya.
--
-- Koreksi ini HARUS berjalan sebelum trigger baru terpasang, karena trigger itu sendiri
-- melarang SUCCESS -> PENDING. Setelah baris ini, larangan tersebut berlaku penuh dan
-- tidak ada jalan lain mengubahnya selain menambah baris ledger baru.
--
-- Hanya arus KELUAR yang disetel ulang. HOLD bukan penyaluran: uangnya masuk lewat
-- callback pembayaran yang memang sudah bekerja.
DROP TRIGGER IF EXISTS escrow_ledger_append_only ON escrow_ledger;

UPDATE escrow_ledger
SET settlement_status = 'PENDING'::"SettlementStatus"
WHERE entry_type <> 'HOLD'::"EscrowEntryType"
  AND settlement_status = 'SUCCESS'::"SettlementStatus";

-- Default diubah ke PENDING. Enam dari tujuh jenis entri adalah arus KELUAR yang menunggu
-- instruksi ke mitra pembayaran; hanya HOLD yang benar-benar sukses saat baris dibuat.
-- Default yang salah untuk mayoritas baris adalah jebakan: lupa menyetelnya harus berarti
-- MENGAKU BELUM, bukan mengaku sudah.
ALTER TABLE escrow_ledger ALTER COLUMN settlement_status SET DEFAULT 'PENDING';

-- Trigger lama menolak UPDATE dan DELETE sekaligus. Ia dipecah: DELETE tetap ditolak
-- MUTLAK, termasuk dari koneksi administratif; UPDATE beralih ke pemeriksa sempit di atas.
CREATE TRIGGER escrow_ledger_no_delete
  BEFORE DELETE ON escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER escrow_ledger_penyaluran
  BEFORE UPDATE ON escrow_ledger
  FOR EACH ROW EXECUTE FUNCTION cek_perubahan_penyaluran();

CREATE INDEX IF NOT EXISTS "escrow_ledger_penyaluran_tertunda_idx"
  ON "escrow_ledger"("settlement_status")
  WHERE "settlement_status" <> 'SUCCESS';
