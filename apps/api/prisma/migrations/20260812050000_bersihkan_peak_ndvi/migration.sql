-- peak_ndvi seharusnya HANYA ditulis worker satelit dari deret amatan. Nilai yang ada
-- tanpa satu pun amatan layak berasal dari seed, bukan dari orbit — dan pita yang dibangun
-- di atasnya menilai Tenant memakai bukti yang tidak pernah ada.
--
-- Dikosongkan, bukan diperbaiki: tidak ada nilai benar yang bisa ditebak di sini, dan
-- menebaknya persis kesalahan yang sedang dibersihkan. NULL berarti tidak dapat dinilai,
-- dan itulah jawaban yang jujur sampai worker benar-benar berjalan untuk lahan tersebut.
--
-- Pagar permanennya ada di YieldAssessmentService.muatBatch: puncak NDVI hanya dibaca bila
-- lahannya punya amatan layak, jadi data seperti ini tidak bisa lolos lagi lewat aplikasi.
UPDATE batches b
SET peak_ndvi = NULL
WHERE b.peak_ndvi IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM satellite_observations o
     WHERE o.land_plot_id = b.land_plot_id AND o.usable
  );
