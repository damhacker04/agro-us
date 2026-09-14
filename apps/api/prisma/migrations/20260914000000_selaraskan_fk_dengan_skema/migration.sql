-- Selaraskan aturan foreign key dengan yang dinyatakan schema.prisma.
--
-- Ditemukan saat migration pertama kali diterapkan ke PostgreSQL sungguhan (bukan test
-- double): `prisma migrate diff` terhadap database hidup menunjukkan SQL migration
-- yang ditulis tangan untuk demand_signals, shortfall_seniority, commodity_season_baselines
-- dan yield_assessments memakai aturan default (RESTRICT / NO ACTION), sementara
-- schema.prisma menyatakan maksud yang berbeda. Empat di antaranya berbeda PERILAKU,
-- bukan hanya nama:
--
--   demand_signals.buyer_id / commodity_id            RESTRICT  -> SET NULL
--   shortfall_seniority.consumed_by_order_item_id     NO ACTION -> SET NULL
--   yield_assessments.reviewed_by                     NO ACTION -> SET NULL
--
-- Contoh akibatnya: menghapus pembeli DIBLOKIR database karena sinyal permintaannya,
-- padahal sinyal itu sengaja dirancang tetap ada tanpa pemiliknya (agregat zona).
-- Sisanya RESTRICT vs NO ACTION — setara untuk constraint yang tidak deferrable — dan
-- ON UPDATE CASCADE yang tidak berpengaruh pada id UUID; diselaraskan supaya diff
-- skema kembali bersih dan drift yang BENAR-BENAR baru terlihat kelak.
--
-- ⚠️ SENGAJA TIDAK DISENTUH: indeks GIST pada kolom geometri (land_plots_polygon_gist,
-- shipments_dest_point_gist, timeline_nodes_gps_point_gist, tracking_positions_point_gist).
-- Prisma tidak bisa memodelkannya, sehingga `migrate diff` selalu mengusulkan
-- menghapusnya. Itu drift yang DISENGAJA. Jangan pernah menjalankan `prisma migrate dev`
-- lalu menerima migration yang menjatuhkan indeks tersebut: kueri geofence dan
-- poligon lahan akan berubah dari pencarian indeks menjadi pemindaian penuh tabel.

-- demand_signals
ALTER TABLE "demand_signals" DROP CONSTRAINT "demand_signals_buyer_id_fkey";
ALTER TABLE "demand_signals" DROP CONSTRAINT "demand_signals_commodity_id_fkey";
ALTER TABLE "demand_signals" ADD CONSTRAINT "demand_signals_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demand_signals" ADD CONSTRAINT "demand_signals_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- shortfall_seniority
ALTER TABLE "shortfall_seniority" DROP CONSTRAINT "shortfall_seniority_buyer_id_fkey";
ALTER TABLE "shortfall_seniority" DROP CONSTRAINT "shortfall_seniority_consumed_by_order_item_id_fkey";
ALTER TABLE "shortfall_seniority" DROP CONSTRAINT "shortfall_seniority_source_order_item_id_fkey";
ALTER TABLE "shortfall_seniority" DROP CONSTRAINT "shortfall_seniority_tenant_id_fkey";
ALTER TABLE "shortfall_seniority" ADD CONSTRAINT "shortfall_seniority_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shortfall_seniority" ADD CONSTRAINT "shortfall_seniority_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shortfall_seniority" ADD CONSTRAINT "shortfall_seniority_source_order_item_id_fkey" FOREIGN KEY ("source_order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shortfall_seniority" ADD CONSTRAINT "shortfall_seniority_consumed_by_order_item_id_fkey" FOREIGN KEY ("consumed_by_order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- commodity_season_baselines
ALTER TABLE "commodity_season_baselines" DROP CONSTRAINT "commodity_season_baselines_commodity_id_fkey";
ALTER TABLE "commodity_season_baselines" ADD CONSTRAINT "commodity_season_baselines_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- yield_assessments
ALTER TABLE "yield_assessments" DROP CONSTRAINT "yield_assessments_batch_id_fkey";
ALTER TABLE "yield_assessments" DROP CONSTRAINT "yield_assessments_reviewed_by_fkey";
ALTER TABLE "yield_assessments" ADD CONSTRAINT "yield_assessments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "yield_assessments" ADD CONSTRAINT "yield_assessments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Nama indeks mengikuti konvensi Prisma.
ALTER INDEX "demand_signals_zone_commodity_created_idx" RENAME TO "demand_signals_zone_id_commodity_id_created_at_idx";
ALTER INDEX "shortfall_seniority_buyer_idx" RENAME TO "shortfall_seniority_buyer_id_consumed_at_idx";
ALTER INDEX "shortfall_seniority_tenant_idx" RENAME TO "shortfall_seniority_tenant_id_consumed_at_idx";
