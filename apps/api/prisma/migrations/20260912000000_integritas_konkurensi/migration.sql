-- Integritas konkurensi: tiga pagar yang tidak bisa ditegakkan dari sisi aplikasi.
--
-- Pemeriksaan "baca dulu, baru tulis" di service selalu punya celah di antara keduanya.
-- Dua permintaan yang tiba bersamaan sama-sama membaca keadaan yang masih bersih, lalu
-- keduanya menulis. Satu-satunya tempat aturan ini bisa ditegakkan adalah database.

-- 1) BE-11 — urutan foto yang ikut dihitung ke dalam node_hash.
--    Tanpa kolom ini verifikasi hanya bisa mengurutkan menurut id (UUID acak), sementara
--    hash dibuat dari urutan unggahan: node dengan dua foto yang sah bisa dilaporkan
--    rusak. Baris lama bernilai 0 — urutan aslinya memang tidak pernah tersimpan, dan
--    verifikasi menanganinya lewat jalur kompatibilitas terpisah.
ALTER TABLE node_photos ADD COLUMN IF NOT EXISTS ordinal integer NOT NULL DEFAULT 0;

-- 2) BE-15 — satu petak, satu batch aktif (FR-3.3).
--    Partial unique index, bukan unique biasa: petak yang batch-nya sudah HARVESTED atau
--    FAILED harus bisa dipakai lagi untuk musim berikutnya.
--    Dibuat sebagai indeks unik biasa (bukan CONCURRENTLY) supaya berjalan di dalam
--    transaksi migrasi; tabel batch berukuran kecil sehingga kuncinya singkat.
CREATE UNIQUE INDEX IF NOT EXISTS batches_land_plot_aktif_uniq
  ON batches (land_plot_id)
  WHERE production_status IN ('PLANNING', 'GROWING');

-- 3) BE-01/BE-12 — satu entri ledger per kejadian.
--    gateway_ref adalah identitas kejadian yang melahirkan barisnya (invoiceRef,
--    claim:<id>, settle:<shipment>, batal:<order>, substitusi:<item>). Callback ganda,
--    dua operator yang memutus bersamaan, atau cron yang berjalan tumpang tindih tidak
--    boleh menghasilkan dua baris untuk kejadian yang sama pada tenant & pengiriman yang
--    sama. shipment_id boleh NULL (entri tingkat pesanan), dan di Postgres NULL selalu
--    dianggap berbeda dari NULL — karena itu dipakai COALESCE, bukan kolom mentah.
--    Ledger tetap append-only: yang dicegah adalah DUPLIKAT, bukan koreksi (koreksi
--    memakai entryType lain, sehingga tidak bertabrakan).
CREATE UNIQUE INDEX IF NOT EXISTS escrow_ledger_kejadian_uniq
  ON escrow_ledger (entry_type, gateway_ref, tenant_id,
                    COALESCE(shipment_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE gateway_ref IS NOT NULL;

-- 4) BE-05 — jenis entri untuk perpindahan tahanan dana ke siklus panen berikutnya.
--    Nilainya tidak dipakai di migrasi ini; PostgreSQL melarang memakai label enum baru
--    pada transaksi yang sama dengan penambahannya.
ALTER TYPE "EscrowEntryType" ADD VALUE IF NOT EXISTS 'ALIH_JADWAL';
