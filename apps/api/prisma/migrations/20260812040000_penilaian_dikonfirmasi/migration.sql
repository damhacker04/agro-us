-- TN-35 harus bisa menunjukkan penilaian MANA yang akhirnya menjadi panen.
--
-- Menurunkannya sebagai "penilaian terakhir saat batch tertutup" terlihat cukup, tetapi
-- justru salah pada satu-satunya kasus yang membuat TN-35 layak ada: Tenant meminta
-- pratinjau 500 box, lalu 300 box, lalu mengonfirmasi memakai assessment_id yang PERTAMA.
-- Penilaian yang dikonfirmasi bukan yang terakhir, dan riwayat akan menampilkan tebakan
-- yang keliru persis pada pola yang ingin diperlihatkan.
ALTER TABLE "yield_assessments" ADD COLUMN "confirmed_at" TIMESTAMPTZ(6);

-- Satu penilaian yang dikonfirmasi per batch. Konfirmasi kedua berarti panen dicatat dua
-- kali, dan itu harus gagal di basis data, bukan hanya di service.
CREATE UNIQUE INDEX "yield_assessments_dikonfirmasi_unik"
  ON "yield_assessments"("batch_id") WHERE "confirmed_at" IS NOT NULL;
