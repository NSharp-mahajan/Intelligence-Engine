-- ============================================================================
-- Migration: Add Early Career Eligibility and Evidence Relational Models
-- Timestamp: 20261104120000
-- Smallest safe additive migration: zero data loss, zero table drops
-- ============================================================================

-- 1. Create Enums
CREATE TYPE "EarlyCareerCategory" AS ENUM (
  'INTERNSHIP',
  'FRESHER',
  'GRADUATE_TRAINEE',
  'ENTRY_LEVEL',
  'JUNIOR',
  'NOT_EARLY_CAREER',
  'UNKNOWN'
);

CREATE TYPE "VerificationLevel" AS ENUM (
  'MANUALLY_AUDITED',
  'AUTOMATED_HIGH_CONFIDENCE',
  'INFERRED_HEURISTIC',
  'REVIEW_REQUIRED',
  'UNVERIFIED'
);

CREATE TYPE "ConstraintState" AS ENUM (
  'RESTRICTED',
  'UNRESTRICTED',
  'UNKNOWN'
);

CREATE TYPE "ExperienceBoundType" AS ENUM (
  'EXACT_RANGE',
  'MINIMUM_ONLY',
  'MAXIMUM_ONLY',
  'NO_EXPERIENCE_REQ'
);

CREATE TYPE "BacklogPolicy" AS ENUM (
  'NO_ACTIVE',
  'NO_HISTORY',
  'ALLOWED_WITH_LIMIT',
  'UNRESTRICTED',
  'UNKNOWN'
);

CREATE TYPE "CgpaScale" AS ENUM (
  'SCALE_10_0',
  'SCALE_4_0',
  'SCALE_7_0',
  'SCALE_UNKNOWN'
);

CREATE TYPE "AcademicEvaluationMode" AS ENUM (
  'SINGLE_CRITERION',
  'DISJUNCTIVE_OR',
  'CONJUNCTIVE_AND'
);

CREATE TYPE "CriterionType" AS ENUM (
  'ROLE_CATEGORY',
  'GRADUATION_BATCH',
  'RELATIVE_COHORT',
  'DEGREE',
  'BRANCH',
  'EXPERIENCE_MONTHS',
  'CGPA',
  'PERCENTAGE',
  'BACKLOG',
  'CITIZENSHIP',
  'WORK_AUTHORIZATION'
);

CREATE TYPE "ExtractionMethod" AS ENUM (
  'ATS_METADATA_FIELD',
  'REGEX_DETERMINISTIC',
  'NLP_LLM_STRUCTURED',
  'MANUAL_AUDIT_OVERRIDE'
);

-- 2. Create OpportunityEligibility Table
CREATE TABLE "OpportunityEligibility" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "category" "EarlyCareerCategory" NOT NULL DEFAULT 'UNKNOWN',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "overallVerificationLevel" "VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
  "explanation" TEXT NOT NULL DEFAULT '',
  "experienceConstraint" "ConstraintState" NOT NULL DEFAULT 'UNKNOWN',
  "experienceBoundType" "ExperienceBoundType",
  "minExperienceMonths" INTEGER,
  "maxExperienceMonths" INTEGER,
  "batchConstraint" "ConstraintState" NOT NULL DEFAULT 'UNKNOWN',
  "eligibleBatches" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "relativeCohorts" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "academicConstraint" "ConstraintState" NOT NULL DEFAULT 'UNKNOWN',
  "academicEvaluationMode" "AcademicEvaluationMode",
  "minCgpa" DOUBLE PRECISION,
  "cgpaScale" "CgpaScale",
  "minPercentage" DOUBLE PRECISION,
  "backlogPolicy" "BacklogPolicy" NOT NULL DEFAULT 'UNKNOWN',
  "maxActiveBacklogs" INTEGER,
  "degreeConstraint" "ConstraintState" NOT NULL DEFAULT 'UNKNOWN',
  "eligibleDegrees" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "branchConstraint" "ConstraintState" NOT NULL DEFAULT 'UNKNOWN',
  "eligibleBranches" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "hasConflict" BOOLEAN NOT NULL DEFAULT false,
  "conflictDetails" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sourceContentHash" TEXT NOT NULL,
  "classifierVersion" TEXT NOT NULL DEFAULT 'early-career-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OpportunityEligibility_pkey" PRIMARY KEY ("id")
);

-- 3. Create OpportunityEligibilityEvidence Table
CREATE TABLE "OpportunityEligibilityEvidence" (
  "id" TEXT NOT NULL,
  "eligibilityId" TEXT NOT NULL,
  "criterion" "CriterionType" NOT NULL,
  "rawValue" TEXT NOT NULL,
  "normalizedValue" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
  "extractionMethod" "ExtractionMethod" NOT NULL,
  "sourceField" TEXT NOT NULL,
  "hasConflict" BOOLEAN NOT NULL DEFAULT false,
  "conflictReason" TEXT,
  "sourceContentHash" TEXT NOT NULL,
  "extractorVersion" TEXT NOT NULL DEFAULT 'early-career-v1',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "supersededAt" TIMESTAMP(3),
  "supersededById" TEXT,
  "auditedByAdminId" TEXT,
  "auditedAt" TIMESTAMP(3),
  "auditNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpportunityEligibilityEvidence_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign Key Constraints & Unique Relations
CREATE UNIQUE INDEX "OpportunityEligibility_opportunityId_key" ON "OpportunityEligibility"("opportunityId");

ALTER TABLE "OpportunityEligibility"
  ADD CONSTRAINT "OpportunityEligibility_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityEligibilityEvidence"
  ADD CONSTRAINT "OpportunityEligibilityEvidence_eligibilityId_fkey"
  FOREIGN KEY ("eligibilityId") REFERENCES "OpportunityEligibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityEligibilityEvidence"
  ADD CONSTRAINT "OpportunityEligibilityEvidence_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "OpportunityEligibilityEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Indexes for High-Performance Queries
CREATE INDEX "OpportunityEligibility_category_idx" ON "OpportunityEligibility"("category");
CREATE INDEX "OpportunityEligibility_overallVerificationLevel_idx" ON "OpportunityEligibility"("overallVerificationLevel");
CREATE INDEX "OpportunityEligibility_experienceConstraint_idx" ON "OpportunityEligibility"("experienceConstraint");
CREATE INDEX "OpportunityEligibility_batchConstraint_idx" ON "OpportunityEligibility"("batchConstraint");
CREATE INDEX "OpportunityEligibility_academicConstraint_idx" ON "OpportunityEligibility"("academicConstraint");
CREATE INDEX "OpportunityEligibility_sourceContentHash_idx" ON "OpportunityEligibility"("sourceContentHash");

CREATE INDEX "OpportunityEligibilityEvidence_eligibilityId_criterion_isActive_idx"
  ON "OpportunityEligibilityEvidence"("eligibilityId", "criterion", "isActive");
CREATE INDEX "OpportunityEligibilityEvidence_sourceContentHash_idx"
  ON "OpportunityEligibilityEvidence"("sourceContentHash");
CREATE INDEX "OpportunityEligibilityEvidence_extractorVersion_idx"
  ON "OpportunityEligibilityEvidence"("extractorVersion");
CREATE INDEX "OpportunityEligibilityEvidence_extractionMethod_idx"
  ON "OpportunityEligibilityEvidence"("extractionMethod");

-- 6. Custom SQL Invariants: Single Active Version per Criterion & Check Constraints
-- Invariant: Exactly one active evidence row per (eligibilityId, criterion).
CREATE UNIQUE INDEX "idx_single_active_evidence_per_criterion"
  ON "OpportunityEligibilityEvidence" ("eligibilityId", "criterion")
  WHERE "isActive" = true;

-- Invariant: Mathematical bounds consistency on experience.
ALTER TABLE "OpportunityEligibility"
  ADD CONSTRAINT "chk_experience_bounds" CHECK (
    ("experienceConstraint" = 'RESTRICTED' AND (
      ("minExperienceMonths" IS NOT NULL AND "minExperienceMonths" >= 0) OR
      ("maxExperienceMonths" IS NOT NULL AND "maxExperienceMonths" >= 0)
    ) AND (
      "minExperienceMonths" IS NULL OR "maxExperienceMonths" IS NULL OR 
      "minExperienceMonths" <= "maxExperienceMonths"
    ) AND "experienceBoundType" IS NOT NULL)
    OR
    ("experienceConstraint" IN ('UNRESTRICTED', 'UNKNOWN') AND 
      "minExperienceMonths" IS NULL AND "maxExperienceMonths" IS NULL AND 
      "experienceBoundType" IS NULL)
  );

-- Invariant: Backlog limit consistency.
ALTER TABLE "OpportunityEligibility"
  ADD CONSTRAINT "chk_backlog_policy" CHECK (
    ("backlogPolicy" = 'ALLOWED_WITH_LIMIT' AND "maxActiveBacklogs" IS NOT NULL AND "maxActiveBacklogs" >= 1) OR
    ("backlogPolicy" != 'ALLOWED_WITH_LIMIT' AND "maxActiveBacklogs" IS NULL)
  );
