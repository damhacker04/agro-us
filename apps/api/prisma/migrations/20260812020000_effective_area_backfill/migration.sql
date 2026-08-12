-- Isi `land_plots.effective_area_ha` untuk poligon yang sudah ada (FR-4.10).
--
-- Ini BUKAN menebak. Migrasi P1 sengaja meninggalkan kolom ini NULL karena saat itu
-- belum ada aturan yang menyatakan bagaimana menghitungnya; menyalin `area_ha` akan
-- menjadi tebakan. Sekarang aturannya ada dan tertulis di LandPlotService: kikis
-- poligon selebar satu piksel Sentinel-2 (10 m), sisakan bagian dalam yang pikselnya
-- benar-benar milik lahan ini. Nilainya diturunkan dari geometri yang memang tersimpan,
-- bukan dikarang.
--
-- NULLIF(..., 0): poligon yang habis terkikis tidak punya interior yang teramati andal.
-- NULL berarti "pita tidak dapat dihitung" → TIDAK_DAPAT_DINILAI, dan itu jawaban yang
-- benar. Menuliskan 0 akan terbaca sebagai "luasnya nol".
UPDATE land_plots
SET effective_area_ha =
      NULLIF(ST_Area(ST_Buffer(polygon::geography, -10)) / 10000.0, 0)::numeric(12, 4)
WHERE effective_area_ha IS NULL;
