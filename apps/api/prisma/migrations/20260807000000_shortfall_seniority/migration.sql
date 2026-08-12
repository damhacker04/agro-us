-- FR-7.13 — Senioritas shortfall (baru v2.3).
--
-- Alokasi FIFO atas `payments.paid_at` bersifat STRUKTURAL, bukan acak: pembeli yang
-- selalu membayar lambat selalu berada di ekor antrean dan terkena shortfall berulang
-- hingga churn — dan justru merekalah akun yang perlu persetujuan finance, yang umumnya
-- bernilai lebih besar. Pro-rata menyebar kerugian; FIFO memusatkannya pada subset tetap.
--
-- Pembeli yang terkena shortfall naik ke prioritas teratas pada batch berikutnya dari
-- Tenant yang sama, berlaku satu siklus, lalu gugur.
CREATE TABLE "shortfall_seniority" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id"          UUID        NOT NULL REFERENCES "buyers"(id),
  "tenant_id"         UUID        NOT NULL REFERENCES "tenants"(id),
  "granted_batch_id"  UUID        NOT NULL REFERENCES "batches"(id),
  "granted_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Terisi saat dipakai. Baris TIDAK dihapus: riwayatnya dipertahankan supaya bisa
  -- diaudit mengapa suatu alokasi mendahulukan pembeli tertentu.
  "consumed_at"       TIMESTAMPTZ,
  "consumed_batch_id" UUID REFERENCES "batches"(id)
);

CREATE INDEX "shortfall_seniority_tenant_idx" ON "shortfall_seniority"("tenant_id", "consumed_at");
CREATE INDEX "shortfall_seniority_buyer_idx"  ON "shortfall_seniority"("buyer_id",  "consumed_at");

-- Satu pembeli hanya boleh menyandang SATU senioritas aktif per Tenant. Tanpa ini,
-- pembeli yang terkena shortfall tiga siklus berturut-turut akan menumpuk tiga baris
-- dan tetap hanya bisa memakainya sekali — sisanya menggantung selamanya sebagai
-- prioritas hantu yang tidak pernah gugur.
CREATE UNIQUE INDEX "shortfall_seniority_aktif_unik"
  ON "shortfall_seniority"("buyer_id", "tenant_id")
  WHERE "consumed_at" IS NULL;
