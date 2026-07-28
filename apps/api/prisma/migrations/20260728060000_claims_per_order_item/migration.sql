-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "claimable_kg" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order_item_id" UUID,
ADD COLUMN     "resolved_at" TIMESTAMPTZ(6),
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "settled_value" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "claims_route_final_status_idx" ON "claims"("route", "final_status");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

