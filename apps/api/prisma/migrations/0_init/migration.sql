-- ============================================================================
-- AgroUs 0_init — bagian 1/3: extension
-- PostGIS wajib ada SEBELUM tabel ber-kolom geometry dibuat.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TENANT', 'BUYER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "LegalityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CaptureMethod" AS ENUM ('GAMBAR_PETA', 'WALK_AROUND');

-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('NORMAL', 'TERBATAS');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "CommodityCategory" AS ENUM ('DAUN', 'BUAH_UMBI', 'KERING');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNING', 'GROWING', 'HARVESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('TERVERIFIKASI', 'FOTO_SAJA', 'PERLU_DITINJAU', 'TIDAK_DAPAT', 'TIDAK_SESUAI');

-- CreateEnum
CREATE TYPE "TimelineActivity" AS ENUM ('PENYIAPAN_LAHAN', 'PENANAMAN', 'PEMUPUKAN', 'PENGENDALIAN_HAMA', 'PENGAIRAN', 'PANEN', 'GAGAL_PANEN');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('KEGIATAN', 'NOTA_INPUT');

-- CreateEnum
CREATE TYPE "CaptureSource" AS ENUM ('IN_APP_CAMERA', 'GALLERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('MENUNGGU_PANEN', 'PANEN', 'DIKIRIM', 'TIBA_DI_LOKASI', 'DITERIMA', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "ReceivedMode" AS ENUM ('BUYER_CONFIRM', 'AUTO_60MIN');

-- CreateEnum
CREATE TYPE "PaymentGatewayKind" AS ENUM ('MIDTRANS', 'XENDIT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'VA', 'EWALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscrowEntryType" AS ENUM ('HOLD', 'RELEASE30', 'POTONG_KLAIM', 'RELEASE', 'REFUND', 'BIAYA_BATAL10');

-- CreateEnum
CREATE TYPE "SessionEndReason" AS ENUM ('BUYER_CONFIRM', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClaimRoute" AS ENUM ('TOLAK_TOLERANSI', 'AUTO_SETTLE', 'OPERATOR');

-- CreateEnum
CREATE TYPE "AssuranceOption" AS ENUM ('SUBSTITUSI', 'JADWAL_ULANG', 'REFUND', 'TERIMA_SEBAGIAN');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('VERIFIED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "legality_status" "LegalityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "claim_ratio_cached" DECIMAL(5,2),
    "shortfall_ratio_cached" DECIMAL(5,2),
    "quota_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 0.70,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "active_zone_id" UUID,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "min_order_value" INTEGER NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_zones" (
    "tenant_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,

    CONSTRAINT "tenant_zones_pkey" PRIMARY KEY ("tenant_id","zone_id")
);

-- CreateTable
CREATE TABLE "commodities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" "CommodityCategory" NOT NULL,
    "shrink_tolerance_pct" DECIMAL(4,2) NOT NULL,
    "avg_yield_kg_per_ha" DECIMAL(10,2) NOT NULL,
    "grade_standards" JSONB NOT NULL,

    CONSTRAINT "commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_plots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "polygon" geometry(Polygon, 4326) NOT NULL,
    "area_ha" DECIMAL(8,2) NOT NULL,
    "capture_method" "CaptureMethod" NOT NULL,
    "verification_tier" "VerificationTier" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "land_plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "commodity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "price_per_box" INTEGER NOT NULL,
    "qty_kg_per_box" DECIMAL(6,2) NOT NULL,
    "stock_box" INTEGER NOT NULL DEFAULT 0,
    "est_harvest_date" DATE NOT NULL,
    "description" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "land_plot_id" UUID NOT NULL,
    "claimed_plant_date" DATE,
    "claimed_harvest_date" DATE NOT NULL,
    "quota_box_total" INTEGER NOT NULL,
    "quota_box_sold" INTEGER NOT NULL DEFAULT 0,
    "quota_box_fulfilled" INTEGER,
    "locked_price" INTEGER NOT NULL,
    "production_status" "ProductionStatus" NOT NULL DEFAULT 'PLANNING',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'FOTO_SAJA',
    "detected_plant_date" DATE,
    "detected_harvest_date" DATE,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "activity_type" "TimelineActivity" NOT NULL,
    "description" TEXT NOT NULL,
    "gps_point" geometry(Point, 4326) NOT NULL,
    "device_ts" TIMESTAMPTZ(6) NOT NULL,
    "server_ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prev_hash" TEXT,
    "node_hash" TEXT NOT NULL,
    "ralat_of" UUID,
    "outside_polygon_reason" TEXT,

    CONSTRAINT "timeline_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "object_url" TEXT NOT NULL,
    "photo_type" "PhotoType" NOT NULL,
    "capture_source" "CaptureSource" NOT NULL,
    "exif_lat" DECIMAL(9,6),
    "exif_lng" DECIMAL(9,6),
    "exif_ts" TIMESTAMPTZ(6),
    "sha256" TEXT NOT NULL,

    CONSTRAINT "node_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satellite_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "land_plot_id" UUID NOT NULL,
    "scene_date" DATE NOT NULL,
    "cloud_pct" DECIMAL(5,2) NOT NULL,
    "ndvi_mean" DECIMAL(6,4),
    "ndmi_mean" DECIMAL(6,4),
    "usable" BOOLEAN NOT NULL,

    CONSTRAINT "satellite_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hash_anchors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "anchor_date" DATE NOT NULL,
    "root_hash" TEXT NOT NULL,
    "external_ref" TEXT,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "hash_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'VERIFIED',
    "price_month" INTEGER NOT NULL DEFAULT 199000,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "grace_until" DATE,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_id" UUID NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "qty_box" INTEGER NOT NULL,
    "qty_box_fulfilled" INTEGER,
    "unit_price_locked" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "dest_point" geometry(Point, 4326) NOT NULL,
    "dest_radius_m" INTEGER NOT NULL DEFAULT 100,
    "receiving_hours" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'MENUNGGU_PANEN',
    "courier_pin_hash" TEXT,
    "pin_attempts" INTEGER NOT NULL DEFAULT 0,
    "received_mode" "ReceivedMode",
    "pod_photo_url" TEXT,
    "arrived_at" TIMESTAMPTZ(6),
    "claim_window_ends_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "gateway" "PaymentGatewayKind" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "invoice_ref" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "shipment_id" UUID,
    "tenant_id" UUID NOT NULL,
    "entry_type" "EscrowEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "gateway_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_qr_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_item_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "printed_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "box_qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "activation_token_id" UUID NOT NULL,
    "no_gps_mode" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "ended_reason" "SessionEndReason",

    CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "point" geometry(Point, 4326) NOT NULL,
    "device_ts" TIMESTAMPTZ(6) NOT NULL,
    "server_ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_plausible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tracking_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "actual_weight_kg" DECIMAL(8,2) NOT NULL,
    "claim_value" INTEGER NOT NULL,
    "pct_of_order" DECIMAL(5,2) NOT NULL,
    "route" "ClaimRoute" NOT NULL,
    "reviewed_by" UUID,
    "sla_due_at" TIMESTAMPTZ(6),
    "final_status" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assurance_resolutions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_item_id" UUID NOT NULL,
    "failed_batch_id" UUID NOT NULL,
    "chosen_option" "AssuranceOption" NOT NULL,
    "shortfall_box" INTEGER NOT NULL DEFAULT 0,
    "price_gap_borne_by_tenant" INTEGER NOT NULL DEFAULT 0,
    "replacement_batch_id" UUID,
    "resolved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assurance_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traceability_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "pdf_url" TEXT,
    "price" INTEGER NOT NULL DEFAULT 25000,
    "paid_ref" TEXT,

    CONSTRAINT "traceability_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_user_id_key" ON "buyers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "commodities_name_key" ON "commodities"("name");

-- CreateIndex
CREATE INDEX "land_plots_tenant_id_idx" ON "land_plots"("tenant_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_commodity_id_idx" ON "products"("commodity_id");

-- CreateIndex
CREATE INDEX "batches_product_id_idx" ON "batches"("product_id");

-- CreateIndex
CREATE INDEX "batches_land_plot_id_idx" ON "batches"("land_plot_id");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_nodes_node_hash_key" ON "timeline_nodes"("node_hash");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_nodes_batch_id_seq_key" ON "timeline_nodes"("batch_id", "seq");

-- CreateIndex
CREATE INDEX "node_photos_node_id_idx" ON "node_photos"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "satellite_observations_land_plot_id_scene_date_key" ON "satellite_observations"("land_plot_id", "scene_date");

-- CreateIndex
CREATE UNIQUE INDEX "hash_anchors_batch_id_anchor_date_key" ON "hash_anchors"("batch_id", "anchor_date");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_shipment_id_idx" ON "order_items"("shipment_id");

-- CreateIndex
CREATE INDEX "order_items_batch_id_idx" ON "order_items"("batch_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_zone_id_idx" ON "shipments"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_ref_key" ON "payments"("invoice_ref");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "escrow_ledger_order_id_idx" ON "escrow_ledger"("order_id");

-- CreateIndex
CREATE INDEX "escrow_ledger_tenant_id_idx" ON "escrow_ledger"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "box_qr_tokens_token_key" ON "box_qr_tokens"("token");

-- CreateIndex
CREATE INDEX "box_qr_tokens_order_item_id_idx" ON "box_qr_tokens"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_sessions_activation_token_id_key" ON "tracking_sessions"("activation_token_id");

-- CreateIndex
CREATE INDEX "tracking_sessions_shipment_id_idx" ON "tracking_sessions"("shipment_id");

-- CreateIndex
CREATE INDEX "tracking_positions_session_id_server_ts_idx" ON "tracking_positions"("session_id", "server_ts");

-- CreateIndex
CREATE INDEX "claims_shipment_id_idx" ON "claims"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assurance_resolutions_order_item_id_key" ON "assurance_resolutions"("order_item_id");

-- CreateIndex
CREATE INDEX "assurance_resolutions_failed_batch_id_idx" ON "assurance_resolutions"("failed_batch_id");

-- CreateIndex
CREATE INDEX "traceability_reports_buyer_id_idx" ON "traceability_reports"("buyer_id");

-- CreateIndex
CREATE INDEX "traceability_reports_shipment_id_idx" ON "traceability_reports"("shipment_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_active_zone_id_fkey" FOREIGN KEY ("active_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_zones" ADD CONSTRAINT "tenant_zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_zones" ADD CONSTRAINT "tenant_zones_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_plots" ADD CONSTRAINT "land_plots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_land_plot_id_fkey" FOREIGN KEY ("land_plot_id") REFERENCES "land_plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_nodes" ADD CONSTRAINT "timeline_nodes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_nodes" ADD CONSTRAINT "timeline_nodes_ralat_of_fkey" FOREIGN KEY ("ralat_of") REFERENCES "timeline_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_photos" ADD CONSTRAINT "node_photos_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "timeline_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_observations" ADD CONSTRAINT "satellite_observations_land_plot_id_fkey" FOREIGN KEY ("land_plot_id") REFERENCES "land_plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hash_anchors" ADD CONSTRAINT "hash_anchors_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_qr_tokens" ADD CONSTRAINT "box_qr_tokens_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_activation_token_id_fkey" FOREIGN KEY ("activation_token_id") REFERENCES "box_qr_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_positions" ADD CONSTRAINT "tracking_positions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tracking_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assurance_resolutions" ADD CONSTRAINT "assurance_resolutions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assurance_resolutions" ADD CONSTRAINT "assurance_resolutions_failed_batch_id_fkey" FOREIGN KEY ("failed_batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assurance_resolutions" ADD CONSTRAINT "assurance_resolutions_replacement_batch_id_fkey" FOREIGN KEY ("replacement_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_reports" ADD CONSTRAINT "traceability_reports_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_reports" ADD CONSTRAINT "traceability_reports_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- AgroUs 0_init — bagian 3/3: integritas yang TIDAK bisa dinyatakan Prisma.
-- Ditulis tangan. JANGAN dihapus saat regenerasi schema — lihat schema.prisma header.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- GiST index untuk seluruh kolom geometry (geofence ST_DWithin, clip poligon)
-- ---------------------------------------------------------------------------
CREATE INDEX "land_plots_polygon_gist" ON "land_plots" USING GIST ("polygon");
CREATE INDEX "timeline_nodes_gps_point_gist" ON "timeline_nodes" USING GIST ("gps_point");
CREATE INDEX "shipments_dest_point_gist" ON "shipments" USING GIST ("dest_point");
CREATE INDEX "tracking_positions_point_gist" ON "tracking_positions" USING GIST ("point");

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------
-- Kuota: sold ≤ total; fulfilled ≤ sold (panen sebagian §5.7.2)
ALTER TABLE "batches" ADD CONSTRAINT "batches_quota_sold_le_total"
  CHECK ("quota_box_sold" >= 0 AND "quota_box_sold" <= "quota_box_total");
ALTER TABLE "batches" ADD CONSTRAINT "batches_fulfilled_le_sold"
  CHECK ("quota_box_fulfilled" IS NULL
         OR ("quota_box_fulfilled" >= 0 AND "quota_box_fulfilled" <= "quota_box_sold"));
-- ERD v2.2: FAILED ⟹ fulfilled = 0
ALTER TABLE "batches" ADD CONSTRAINT "batches_failed_implies_zero_fulfilled"
  CHECK ("production_status" <> 'FAILED' OR COALESCE("quota_box_fulfilled", 0) = 0);

-- Alokasi per item: fulfilled ≤ qty (FR-7.9)
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fulfilled_le_qty"
  CHECK ("qty_box_fulfilled" IS NULL
         OR ("qty_box_fulfilled" >= 0 AND "qty_box_fulfilled" <= "qty_box"));

-- Kode Antar: maksimal 5 percobaan (FR-6.3)
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pin_attempts_range"
  CHECK ("pin_attempts" >= 0 AND "pin_attempts" <= 5);

-- quota_multiplier: 0 < x ≤ 0.70 (FR-7.12; 0.50 saat penalti)
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_quota_multiplier_range"
  CHECK ("quota_multiplier" > 0 AND "quota_multiplier" <= 0.70);

-- Nominal uang tidak boleh negatif
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_amount_positive"
  CHECK ("amount" > 0);

-- ---------------------------------------------------------------------------
-- APPEND-ONLY (PRD §6.1) — trigger menolak UPDATE/DELETE bahkan dari koneksi
-- administratif. Koreksi = baris baru (node Ralat / entri ledger baru).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabel % append-only (PRD 6.1): operasi % ditolak. Koreksi = tambah baris baru.',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "timeline_nodes_append_only"
  BEFORE UPDATE OR DELETE ON "timeline_nodes"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER "node_photos_append_only"
  BEFORE UPDATE OR DELETE ON "node_photos"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER "escrow_ledger_append_only"
  BEFORE UPDATE OR DELETE ON "escrow_ledger"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER "hash_anchors_append_only"
  BEFORE UPDATE OR DELETE ON "hash_anchors"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- ---------------------------------------------------------------------------
-- MATERIALIZED VIEW demand_aggregates (FR-8.1) — v1.
-- Grain: (zone, commodity, minggu panen). Refresh via cron harian:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY demand_aggregates;
-- Definisi boleh disempurnakan di feat/demand-intelligence.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW demand_aggregates AS
WITH demand AS (
  SELECT
    s."zone_id",
    p."commodity_id",
    (date_trunc('week', b."claimed_harvest_date"))::date AS harvest_week,
    SUM(oi."qty_box")::int AS demanded_box
  FROM "order_items" oi
  JOIN "shipments" s ON s."id" = oi."shipment_id"
  JOIN "batches"   b ON b."id" = oi."batch_id"
  JOIN "products"  p ON p."id" = b."product_id"
  JOIN "orders"    o ON o."id" = oi."order_id"
  WHERE o."order_status" = 'PAID'
  GROUP BY 1, 2, 3
),
supply AS (
  SELECT
    tz."zone_id",
    p."commodity_id",
    (date_trunc('week', b."claimed_harvest_date"))::date AS harvest_week,
    SUM(GREATEST(b."quota_box_total" - b."quota_box_sold", 0))::int AS open_quota_box,
    ROUND(AVG(b."locked_price"))::int AS est_locked_price
  FROM "batches" b
  JOIN "products" p      ON p."id" = b."product_id"
  JOIN "tenant_zones" tz ON tz."tenant_id" = p."tenant_id"
  WHERE b."production_status" IN ('PLANNING', 'GROWING')
  GROUP BY 1, 2, 3
)
SELECT
  COALESCE(d."zone_id", sp."zone_id")           AS zone_id,
  COALESCE(d."commodity_id", sp."commodity_id") AS commodity_id,
  COALESCE(d.harvest_week, sp.harvest_week)     AS harvest_week,
  COALESCE(d.demanded_box, 0)                   AS demanded_box,
  COALESCE(sp.open_quota_box, 0)                AS open_quota_box,
  GREATEST(COALESCE(d.demanded_box, 0) - COALESCE(sp.open_quota_box, 0), 0) AS gap_box,
  CASE
    WHEN COALESCE(d.demanded_box, 0) = 0 THEN 100.0
    ELSE ROUND(COALESCE(sp.open_quota_box, 0)::numeric * 100 / d.demanded_box, 1)
  END AS saturation_pct,
  sp.est_locked_price
FROM demand d
FULL OUTER JOIN supply sp
  ON  d."zone_id" = sp."zone_id"
  AND d."commodity_id" = sp."commodity_id"
  AND d.harvest_week = sp.harvest_week;

-- Dibutuhkan untuk REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX "demand_aggregates_pk"
  ON demand_aggregates (zone_id, commodity_id, harvest_week);
