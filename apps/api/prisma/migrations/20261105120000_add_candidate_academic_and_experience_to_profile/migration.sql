-- AlterTable Profile
-- M2.6: Add optional candidate academic and experience profile fields
ALTER TABLE "Profile" ADD COLUMN "degree" TEXT,
ADD COLUMN "branch" TEXT,
ADD COLUMN "cgpa" DOUBLE PRECISION,
ADD COLUMN "cgpaScale" "CgpaScale",
ADD COLUMN "percentage" DOUBLE PRECISION,
ADD COLUMN "activeBacklogs" INTEGER,
ADD COLUMN "hasBacklogHistory" BOOLEAN,
ADD COLUMN "experienceMonths" INTEGER;
