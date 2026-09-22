-- Add Clerk identity mapping and align the legacy password column with the schema.
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");