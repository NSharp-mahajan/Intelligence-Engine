/**
 * PostgreSQL Integration Test — Opportunity Freshness & Lifecycle Verification
 *
 * PURPOSE: Verify real end-to-end persistence, freshness tracking, lifecycle
 *          semantics, and query behavior against the isolated test database
 *          (intelligence_engine_test, port 5433).
 *
 * SAFETY:  Strictly enforces DATABASE_URL_TEST targeting port 5433.
 *          Refuses any connection to port 5432 (the development database).
 *
 * SCOPE:   All test data is isolated to source='TestIngest' and skill-name
 *          prefix 'test_skill_'. Cleaned up before and after every scenario.
 *
 * RUN:
 *   set DATABASE_URL_TEST=postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public
 *   npx tsx src/testPostgresIngestion.ts
 */

import { randomUUID } from 'crypto';
import { PrismaClient, WorkMode, EmploymentType, ExperienceLevel, RequirementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ─── Phase 5 Requirement 9: Dev DB Safety Guard ─────────────────────────────

const TEST_DB_URL = process.env.DATABASE_URL_TEST;
if (!TEST_DB_URL) {
  console.error(
    '\n[ERROR] DATABASE_URL_TEST is not set.\n' +
    'Set it to the test database URL before running this script.\n' +
    'Example:\n' +
    '  set DATABASE_URL_TEST=postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public\n'
  );
  process.exit(1);
}

if (TEST_DB_URL.includes(':5432/') && !TEST_DB_URL.includes(':5433/')) {
  console.error(
    '\n[FATAL SAFETY VIOLATION] DATABASE_URL_TEST appears to point to port 5432 (the dev database).\n' +
    'This script must ONLY run against the isolated test database on port 5433.\n'
  );
  process.exit(1);
}

// ─── Prisma Client for Isolated Test DB ─────────────────────────────────────

const pool = new pg.Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

import {
  OpportunityIngestor,
  OpportunityNormalizer,
  OpportunityDeduplicator,
} from './lib/opportunityProvider.js';
import type { ExternalJob, OpportunityProvider } from './lib/opportunityProvider.js';
import { DashboardService } from './services/dashboardService.js';

function makeProvider(jobs: ExternalJob[]): OpportunityProvider {
  return {
    name: 'TestProvider',
    async fetch(): Promise<ExternalJob[]> {
      return jobs;
    },
  };
}

// ─── Assert & Cleanup Helpers ────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

async function cleanup(): Promise<void> {
  const opps = await prisma.opportunity.findMany({
    where: { source: 'TestIngest' },
    select: { id: true },
  });
  const oppIds = opps.map((o: { id: string }) => o.id);
  if (oppIds.length > 0) {
    await prisma.opportunitySkill.deleteMany({
      where: { opportunityId: { in: oppIds } },
    });
    await prisma.opportunity.deleteMany({
      where: { id: { in: oppIds } },
    });
  }
  await prisma.skill.deleteMany({
    where: { name: { startsWith: 'test_skill_' } },
  });
}

function makeJob(overrides: Partial<ExternalJob> = {}): ExternalJob {
  return {
    id: `test-${randomUUID()}`,
    title: 'Software Engineer Intern',
    company: 'TestCo',
    description: 'A test job posting.',
    location: 'Remote',
    workMode: 'Remote',
    employmentType: 'INTERNSHIP',
    experienceLevel: 'Entry',
    applicationUrl: 'https://example.com/apply',
    source: 'TestIngest',
    sourceUrl: 'https://example.com/jobs',
    postedDate: new Date('2026-01-01'),
    deadline: new Date('2027-12-31'),
    requiredSkills: ['test_skill_alpha'],
    preferredSkills: [],
    ...overrides,
  };
}

function buildIngestor(): OpportunityIngestor {
  const normalizer = new OpportunityNormalizer();
  const deduplicator = new OpportunityDeduplicator();
  return new OpportunityIngestor(prisma as any, normalizer, deduplicator);
}

// ─── Test 1: New opportunities receive a valid lastSeenAt ─────────────────────

async function test1_NewOpportunityFreshness(): Promise<void> {
  console.log('\n--- Test 1: New Opportunities Receive a Valid lastSeenAt ---');
  await cleanup();

  const ingestor = buildIngestor();
  const beforeTime = new Date(Date.now() - 2000);
  const job = makeJob({ requiredSkills: ['test_skill_alpha', 'test_skill_beta'] });

  const result = await ingestor.ingest(makeProvider([job]));
  const afterTime = new Date(Date.now() + 2000);

  assert(result.created === 1, `Created 1 opportunity (got ${result.created})`);
  assert(result.errors === 0, `0 errors (got ${result.errors})`);

  const opp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest' } });
  assert(opp !== null, 'Opportunity persisted in database');
  assert(opp?.lastSeenAt instanceof Date, 'lastSeenAt is a valid Date instance');
  assert(
    opp!.lastSeenAt >= beforeTime && opp!.lastSeenAt <= afterTime,
    `lastSeenAt is set to current ingestion time (got ${opp?.lastSeenAt.toISOString()})`,
  );
  assert(opp?.createdAt instanceof Date, 'createdAt is initialized');
}

// ─── Test 2: Re-ingesting existing opportunity refreshes lastSeenAt ──────────

async function test2_ReingestRefreshesTimestamp(): Promise<void> {
  console.log('\n--- Test 2: Re-ingesting Existing Opportunity Refreshes Timestamp ---');
  await cleanup();

  const ingestor = buildIngestor();
  const jobId = 'refresh-test-001';
  const job = makeJob({ id: jobId, title: 'Original Title' });

  // 1. Initial Ingestion
  await ingestor.ingest(makeProvider([job]));
  const initialOpp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });
  assert(initialOpp !== null, 'Initial opportunity persisted');
  const initialLastSeen = initialOpp!.lastSeenAt;
  const initialId = initialOpp!.id;

  // Wait 1.1s so timestamp strictly increases
  await new Promise((r) => setTimeout(r, 1100));

  // 2. Re-ingestion
  const secondResult = await ingestor.ingest(makeProvider([job]));
  assert(secondResult.created === 0, 'Re-ingestion did NOT create duplicate');
  assert(secondResult.updated === 1, 'Re-ingestion incremented updated count');
  assert(secondResult.errors === 0, '0 errors during re-ingestion');

  const refreshedOpp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });
  assert(refreshedOpp?.id === initialId, 'Opportunity ID preserved across refresh');
  assert(
    refreshedOpp!.lastSeenAt.getTime() > initialLastSeen.getTime(),
    `lastSeenAt refreshed forward (${refreshedOpp?.lastSeenAt.toISOString()} > ${initialLastSeen.toISOString()})`,
  );
}

// ─── Test 3: Changed source data updates mutable fields without ID change ────

async function test3_ChangedDataUpdatesMutableFields(): Promise<void> {
  console.log('\n--- Test 3: Changed Source Data Updates Mutable Fields Without ID Change ---');
  await cleanup();

  const ingestor = buildIngestor();
  const jobId = 'update-test-001';

  // 1. Original
  const original = makeJob({
    id: jobId,
    title: 'Junior Software Engineer',
    description: 'Initial role description',
    applicationUrl: 'https://example.com/apply/v1',
  });
  await ingestor.ingest(makeProvider([original]));
  const initialOpp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });
  const originalId = initialOpp!.id;

  // 2. Updated job content
  const updatedJob = makeJob({
    id: jobId,
    title: 'Senior Staff Software Engineer',
    description: 'Updated comprehensive responsibilities',
    applicationUrl: 'https://example.com/apply/v2',
  });
  const updateResult = await ingestor.ingest(makeProvider([updatedJob]));

  assert(updateResult.updated === 1, 'Reported 1 updated record');
  assert(updateResult.created === 0, 'Created 0 new records');

  const updatedOpp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });
  assert(updatedOpp?.id === originalId, 'Opportunity ID remains unchanged');
  assert(updatedOpp?.title === 'Senior Staff Software Engineer', `Title updated to "${updatedOpp?.title}"`);
  assert(updatedOpp?.description === 'Updated comprehensive responsibilities', 'Description updated');
  assert(updatedOpp?.applicationUrl === 'https://example.com/apply/v2', 'Application URL updated');
}

// ─── Test 4: Missing optional fields do not erase known values ───────────────

async function test4_NonErasureOfOptionalFields(): Promise<void> {
  console.log('\n--- Test 4: Missing Optional Fields Do Not Erase Known Values ---');
  await cleanup();

  const ingestor = buildIngestor();
  const jobId = 'non-erasure-001';
  const knownDeadline = new Date('2027-06-30T00:00:00.000Z');

  // 1. Ingest with rich metadata
  const richJob = makeJob({
    id: jobId,
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    employmentType: 'Contract',
    experienceLevel: 'Mid',
    deadline: knownDeadline,
    sourceUrl: 'https://example.com/rich-source-url',
  });
  await ingestor.ingest(makeProvider([richJob]));

  // 2. Re-ingest with sparse metadata (provider omitted location, deadline, sourceUrl, workMode, etc.)
  const sparseJob: ExternalJob = {
    id: jobId,
    title: 'Software Engineer',
    company: 'TestCo',
    description: 'Updated description without optional fields',
    applicationUrl: 'https://example.com/apply',
    source: 'TestIngest',
    // location, deadline, workMode, employmentType, experienceLevel, sourceUrl all omitted
  };
  await ingestor.ingest(makeProvider([sparseJob]));

  const opp = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });

  assert(opp?.location === 'San Francisco, CA', `Known location preserved (got "${opp?.location}")`);
  assert(opp?.workMode === WorkMode.HYBRID, `Known workMode preserved (got "${opp?.workMode}")`);
  assert(opp?.employmentType === EmploymentType.CONTRACT, `Known employmentType preserved (got "${opp?.employmentType}")`);
  assert(opp?.experienceLevel === ExperienceLevel.MID, `Known experienceLevel preserved (got "${opp?.experienceLevel}")`);
  assert(opp?.deadline?.toISOString() === knownDeadline.toISOString(), 'Known deadline preserved');
  assert(opp?.sourceUrl === 'https://example.com/rich-source-url', 'Known sourceUrl preserved');
}

// ─── Test 5: Changed skill requirements update relations without duplicates ──

async function test5_SkillRequirementsUpdateSafely(): Promise<void> {
  console.log('\n--- Test 5: Changed Skill Requirements Update Relations Without Duplicates ---');
  await cleanup();

  const ingestor = buildIngestor();
  const jobId = 'skills-refresh-001';

  // 1. Initial: required = [test_skill_alpha], preferred = [test_skill_beta]
  const job1 = makeJob({
    id: jobId,
    requiredSkills: ['test_skill_alpha'],
    preferredSkills: ['test_skill_beta'],
  });
  await ingestor.ingest(makeProvider([job1]));

  const opp1 = await prisma.opportunity.findFirst({ where: { source: 'TestIngest', sourceJobId: jobId } });
  const initialRelations = await prisma.opportunitySkill.findMany({
    where: { opportunityId: opp1?.id },
    include: { skill: true },
  });
  assert(initialRelations.length === 2, `Initial relations count is 2 (got ${initialRelations.length})`);

  // 2. Updated requirements: required = [test_skill_beta, test_skill_gamma], preferred = []
  const job2 = makeJob({
    id: jobId,
    requiredSkills: ['test_skill_beta', 'test_skill_gamma'],
    preferredSkills: [],
  });
  await ingestor.ingest(makeProvider([job2]));

  const updatedRelations = await prisma.opportunitySkill.findMany({
    where: { opportunityId: opp1?.id },
    include: { skill: true },
  });

  assert(updatedRelations.length === 2, `Updated relations count is 2 (got ${updatedRelations.length})`);
  const skillNames = updatedRelations.map((r) => r.skill.name).sort();
  assert(
    skillNames[0] === 'test_skill_beta' && skillNames[1] === 'test_skill_gamma',
    `Relations reflect new skills (got: ${skillNames.join(', ')})`,
  );

  // Check no duplicates for test_skill_beta
  const betaRelations = updatedRelations.filter((r) => r.skill.name === 'test_skill_beta');
  assert(betaRelations.length === 1, 'test_skill_beta linked exactly once without duplicate');
  assert(betaRelations[0].requirementType === RequirementType.REQUIRED, 'test_skill_beta updated to REQUIRED');
}

// ─── Test 6: Repeated identical ingestion remains idempotent ─────────────────

async function test6_RepeatedIngestionIdempotency(): Promise<void> {
  console.log('\n--- Test 6: Repeated Identical Ingestion Remains Idempotent ---');
  await cleanup();

  const ingestor = buildIngestor();
  const job = makeJob({ id: 'idempotent-001' });

  const run1 = await ingestor.ingest(makeProvider([job]));
  assert(run1.created === 1, 'Run 1 created 1');

  const run2 = await ingestor.ingest(makeProvider([job]));
  assert(run2.created === 0, 'Run 2 created 0 (no duplicate created)');
  assert(run2.updated === 1, 'Run 2 refreshed existing record');
  assert(run2.errors === 0, 'Run 2 had 0 errors');

  const totalCount = await prisma.opportunity.count({ where: { source: 'TestIngest' } });
  assert(totalCount === 1, `Total opportunity count in DB is exactly 1 (got ${totalCount})`);
}

// ─── Test 7: Partial provider failure does not mark jobs closed or stale ─────

async function test7_PartialProviderFailureSafety(): Promise<void> {
  console.log('\n--- Test 7: Partial Provider Failure Safety ---');
  await cleanup();

  const ingestor = buildIngestor();

  // Seed two opportunities from different boards
  const jobBoardA = makeJob({ id: 'board-A-job', company: 'CompanyA' });
  const jobBoardB = makeJob({ id: 'board-B-job', company: 'CompanyB' });
  await ingestor.ingest(makeProvider([jobBoardA, jobBoardB]));

  const countBefore = await prisma.opportunity.count({ where: { source: 'TestIngest' } });
  assert(countBefore === 2, '2 opportunities seeded across boards');

  // Simulate a multi-board provider where Board B throws/fails, returning only Board A
  const partialProvider: OpportunityProvider = {
    name: 'PartialProvider',
    async fetch(): Promise<ExternalJob[]> {
      // Board A succeeded, Board B failed
      return [jobBoardA];
    },
  };

  const partialResult = await ingestor.ingest(partialProvider);
  assert(partialResult.errors === 0, 'Partial ingestion executed cleanly');

  // Verify Board B job is NOT deleted, NOT marked closed, and remains in database
  const boardBJob = await prisma.opportunity.findFirst({
    where: { source: 'TestIngest', sourceJobId: 'board-B-job' },
  });
  assert(boardBJob !== null, 'Board B job remains stored and untouched (not deleted or marked closed)');

  const totalAfter = await prisma.opportunity.count({ where: { source: 'TestIngest' } });
  assert(totalAfter === 2, `Total opportunity count unchanged (got ${totalAfter})`);
}

// ─── Test 8: Expired deadlines vs unknown deadlines handled distinctly ────────

async function test8_DeadlineExpirationSemantics(): Promise<void> {
  console.log('\n--- Test 8: Expired Deadlines vs Unknown Deadlines Handled Distinctly ---');
  await cleanup();

  const ingestor = buildIngestor();

  const threeSkills = ['test_skill_alpha', 'test_skill_beta', 'test_skill_gamma'];

  // 1. Active opportunity with future deadline
  const futureJob = makeJob({
    id: 'future-job',
    title: 'Active Future Role',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // +30 days
    requiredSkills: threeSkills,
  });

  // 2. Expired opportunity whose deadline passed
  const expiredJob = makeJob({
    id: 'expired-job',
    title: 'Expired Role',
    deadline: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // -7 days
    requiredSkills: threeSkills,
  });

  // 3. Opportunity with unknown deadline (null)
  const unknownDeadlineJob = makeJob({
    id: 'unknown-deadline-job',
    title: 'Ongoing Role (Unknown Deadline)',
    deadline: undefined,
    requiredSkills: threeSkills,
  });

  await ingestor.ingest(makeProvider([futureJob, expiredJob, unknownDeadlineJob]));

  const totalInDb = await prisma.opportunity.count({ where: { source: 'TestIngest' } });
  assert(totalInDb === 3, 'All 3 test opportunities stored in PostgreSQL');

  // Verify Dashboard Recommendations Query (Phase 4):
  // Must exclude expired deadlines, while keeping unknown deadlines (null) and active deadlines.
  const dashboardService = new DashboardService(prisma as any);
  // Create a minimal candidate profile to run dashboard query
  const testUserId = `test-user-${randomUUID()}`;
  await prisma.$executeRawUnsafe(
    'INSERT INTO "User" ("id", "email", "passwordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
    testUserId,
    `${testUserId}@example.com`,
    'mockPasswordHash',
  );

  const profile = await prisma.profile.create({
    data: {
      id: randomUUID(),
      userId: testUserId,
      fullName: 'Test Candidate',
      updatedAt: new Date(),
    },
  });

  const alphaSkill = await prisma.skill.findUnique({ where: { name: 'test_skill_alpha' } });
  if (alphaSkill) {
    await prisma.candidateSkill.create({
      data: {
        profileId: profile.id,
        skillId: alphaSkill.id,
      },
    });
  }

  const dashboardData = await dashboardService.getDashboardData(testUserId);
  const recTitles = dashboardData.recommendations.map((r) => r.title);

  assert(
    !recTitles.includes('Expired Role'),
    'Dashboard recommendations EXCLUDE expired deadline listing',
  );
  assert(
    recTitles.includes('Active Future Role'),
    'Dashboard recommendations INCLUDE active future deadline listing',
  );
  assert(
    recTitles.includes('Ongoing Role (Unknown Deadline)'),
    'Dashboard recommendations INCLUDE unknown deadline (null) listing — not treated as expired',
  );

  // Clean up user (cascades to profile and candidateSkills in PostgreSQL)
  await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE "id" = $1', testUserId);
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('PostgreSQL Integration Test — Opportunity Freshness & Lifecycle');
  console.log('='.repeat(70));
  console.log(`Target DB: ${(TEST_DB_URL || '').replace(/:([^:@]+)@/, ':***@')}`);

  try {
    await prisma.$connect();
    console.log('[OK] Connected to isolated test database\n');

    await test1_NewOpportunityFreshness();
    await test2_ReingestRefreshesTimestamp();
    await test3_ChangedDataUpdatesMutableFields();
    await test4_NonErasureOfOptionalFields();
    await test5_SkillRequirementsUpdateSafely();
    await test6_RepeatedIngestionIdempotency();
    await test7_PartialProviderFailureSafety();
    await test8_DeadlineExpirationSemantics();

  } catch (err) {
    console.error('\n[FATAL ERROR IN SUITE]:', err);
    failed++;
  } finally {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
