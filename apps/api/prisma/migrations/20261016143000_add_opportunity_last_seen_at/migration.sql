-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Opportunity_lastSeenAt_idx" ON "Opportunity"("lastSeenAt");
