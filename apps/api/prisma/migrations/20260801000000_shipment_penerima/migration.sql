-- FR-2.7 — identitas penerima ikut disimpan.
--
-- Sebelumnya recipientName, phone, dan landmark divalidasi di DTO checkout lalu
-- dibuang begitu saja: kurir yang tiba di lokasi tidak tahu menyerahkan kepada siapa,
-- dan layar detail pesanan Tenant tidak punya data penerima untuk ditampilkan.
--
-- Baris lama diisi penanda eksplisit, bukan string kosong, supaya data yang memang
-- tidak pernah terekam tidak menyamar sebagai data kosong yang sah.
ALTER TABLE "shipments" ADD COLUMN "recipient_name"  TEXT NOT NULL DEFAULT '(tidak terekam)';
ALTER TABLE "shipments" ADD COLUMN "recipient_phone" TEXT NOT NULL DEFAULT '(tidak terekam)';
ALTER TABLE "shipments" ADD COLUMN "landmark"        TEXT;

ALTER TABLE "shipments" ALTER COLUMN "recipient_name"  DROP DEFAULT;
ALTER TABLE "shipments" ALTER COLUMN "recipient_phone" DROP DEFAULT;
