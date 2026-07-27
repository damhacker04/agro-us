-- CreateTable
CREATE TABLE "otp_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_requests_phone_expires_at_idx" ON "otp_requests"("phone", "expires_at");

