-- Add new enums
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'UNKNOWN');
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'UNKNOWN');

-- Add new columns to Opportunity table
ALTER TABLE "Opportunity" ADD COLUMN "workMode" "WorkMode" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Opportunity" ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Opportunity" ADD COLUMN "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Opportunity" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "sourceJobId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "postedDate" TIMESTAMP(3);

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX "Opportunity_source_sourceJobId_key" ON "Opportunity"("source", "sourceJobId");

-- Create indexes for filtering
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");
CREATE INDEX "Opportunity_workMode_idx" ON "Opportunity"("workMode");
CREATE INDEX "Opportunity_employmentType_idx" ON "Opportunity"("employmentType");
CREATE INDEX "Opportunity_experienceLevel_idx" ON "Opportunity"("experienceLevel");
CREATE INDEX "Opportunity_location_idx" ON "Opportunity"("location");
CREATE INDEX "Opportunity_postedDate_idx" ON "Opportunity"("postedDate");
CREATE INDEX "Opportunity_deadline_idx" ON "Opportunity"("deadline");
