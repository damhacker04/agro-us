-- FR-5.8 — umur simpan per komoditas, pada suhu ambien.
--
-- Yang ditambahkan v2.4 BUKAN fasilitas penyimpanan, melainkan satu perhitungan: berapa
-- lama komoditas ini bertahan, dan sudah berapa lama sejak dipanen. Tidak ada gudang,
-- lokasi simpan, sensor, maupun rantai dingin — keputusan asset-light v2.3 tidak dibatalkan
-- (PRD §11.2).
--
-- ⚠️ NULLABLE dengan sengaja, dan tidak diisi nilai bawaan.
--
-- Angka ini akan dipakai memberi tahu pembeli seberapa segar barangnya. Menebaknya untuk
-- komoditas yang belum dikalibrasi berarti menyampaikan tebakan sebagai fakta kesegaran —
-- persis kesalahan yang FR-7.12e ada untuk mencegah. NULL berarti "belum diketahui", dan
-- antarmuka wajib menyatakannya begitu, bukan menampilkan angka karangan.
--
-- Nilai awalnya diisi seed dengan penanda kalibrasi yang sama seperti avg_yield_kg_per_ha.

ALTER TABLE "commodities" ADD COLUMN "shelf_life_days" INT;

COMMENT ON COLUMN "commodities"."shelf_life_days" IS
  'Umur simpan pada suhu ambien, hari. FR-5.8. INDIKATIF — wajib divalidasi ke penyuluh/BPS sebelum dipakai menolak atau menahan apa pun.';

-- Antrean pantau OP-14 (FR-5.10) menyortir batch yang sudah dipanen tetapi belum terkirim,
-- dari sisa umur simpan paling tipis. Node PANEN yang menjadi titik nol jamnya, jadi indeks
-- dipasang pada pencariannya.
CREATE INDEX IF NOT EXISTS "timeline_nodes_panen_idx"
  ON "timeline_nodes"("batch_id", "server_ts" DESC)
  WHERE "activity_type" = 'PANEN';
