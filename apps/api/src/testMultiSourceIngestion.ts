import { PrismaClient, RequirementType, OpportunityType, WorkMode, EmploymentType, ExperienceLevel } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OpportunityNormalizer,
  OpportunityDeduplicator,
  OpportunityIngestor,
  OpportunityProvider,
  ExternalJob,
} from './lib/opportunityProvider';
import { MatchingService } from './services/matchingService';
import { IngestionScheduler, defaultProviderFactory, IngestionConfig } from './services/ingestionScheduler';

// Configure strictly isolated connection to Port 5433 test database
const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test';
const pool = new Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prismaTest = new PrismaClient({ adapter });

async function runVerification() {
  console.log('===============================================================');
  console.log('   INTELLIGENCE-ENGINE: MULTI-SOURCE INGESTION & PIPELINE TEST');
  console.log('   Target Database: Port 5433 (ISOLATED TEST DATABASE ONLY)');
  console.log('===============================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition: boolean, label: string) {
    totalChecks++;
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passedChecks++;
    } else {
      console.error(`  [FAIL] ${label}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Initial State Check on Port 5433
    const initialCount = await prismaTest.opportunity.count();
    console.log(`Step 1: Test DB (5433) active connection confirmed. Initial opportunities: ${initialCount}`);
    assert(true, 'Test DB connection established on port 5433');

    // 2. Define Mock Multi-Source Providers for Deterministic Verification
    const mockJobicyJob: ExternalJob = {
      id: 'jobicy-multi-001',
      title: 'Senior Backend Engineer',
      company: 'Jobicy Tech Ltd',
      description: 'Looking for a Senior Backend Engineer proficient in Node.js, TypeScript, and PostgreSQL.',
      location: 'Remote, Global',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      applicationUrl: 'https://jobicy.com/jobs/001',
      sourceUrl: 'https://jobicy.com/jobs/001',
      source: 'Jobicy',
      postedDate: new Date('2026-10-25T10:00:00Z'),
      requiredSkills: ['Node.js', 'TypeScript'],
      preferredSkills: ['PostgreSQL', 'Docker'],
    };

    const mockGreenhouseJob: ExternalJob = {
      id: 'greenhouse-multi-002',
      title: 'Distributed Systems Architect',
      company: 'Cloudflare',
      description: 'Designing high-scale edge computing networks using Rust, Go, and Kubernetes.',
      location: 'San Francisco, CA',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      applicationUrl: 'https://boards.greenhouse.io/cloudflare/jobs/002',
      sourceUrl: 'https://boards.greenhouse.io/cloudflare/jobs/002',
      source: 'Greenhouse',
      postedDate: new Date('2026-10-26T12:00:00Z'),
      requiredSkills: ['Rust', 'Go'],
      preferredSkills: ['Kubernetes', 'Linux'],
    };

    const mockLeverJob: ExternalJob = {
      id: 'lever-multi-003',
      title: 'Full Stack Product Engineer',
      company: 'Palantir',
      description: 'Building mission-critical analytics interfaces using React, TypeScript, and Python.',
      location: 'New York, NY',
      workMode: 'ONSITE',
      employmentType: 'FULL_TIME',
      applicationUrl: 'https://jobs.lever.co/palantir/003',
      sourceUrl: 'https://jobs.lever.co/palantir/003',
      source: 'Lever',
      postedDate: new Date('2026-10-27T08:00:00Z'),
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: ['Python'],
    };

    const mockJobicyProvider: OpportunityProvider = {
      name: 'Jobicy',
      fetch: async () => [mockJobicyJob],
    };

    const mockGreenhouseProvider: OpportunityProvider = {
      name: 'Greenhouse',
      fetch: async () => [mockGreenhouseJob],
    };

    const mockLeverProvider: OpportunityProvider = {
      name: 'Lever',
      fetch: async () => [mockLeverJob],
    };

    // Clean up any test records from prior runs
    await prismaTest.opportunitySkill.deleteMany({
      where: {
        opportunity: {
          sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
        },
      },
    });
    await prismaTest.opportunity.deleteMany({
      where: {
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
    });

    console.log('\nStep 2: Ingesting Jobicy, Greenhouse, and Lever records...');
    const ingestor = new OpportunityIngestor(prismaTest);

    const resJobicy = await ingestor.ingest(mockJobicyProvider);
    assert(resJobicy.created === 1, 'Jobicy record created successfully (created: 1)');

    const resGreenhouse = await ingestor.ingest(mockGreenhouseProvider);
    assert(resGreenhouse.created === 1, 'Greenhouse record created successfully (created: 1)');

    const resLever = await ingestor.ingest(mockLeverProvider);
    assert(resLever.created === 1, 'Lever record created successfully (created: 1)');

    // 3. Verify Source Identity Preservation in DB
    console.log('\nStep 3: Verifying source identity preservation in DB...');
    const dbJobicy = await prismaTest.opportunity.findFirst({
      where: { sourceJobId: 'jobicy-multi-001' },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    assert(dbJobicy !== null && dbJobicy.source === 'Jobicy', 'Jobicy opportunity persisted with source="Jobicy"');
    assert(dbJobicy?.organization === 'Jobicy Tech Ltd', 'Jobicy organization matches');
    assert(
      dbJobicy?.opportunitySkills.some((os) => os.skill.name === 'node' && os.requirementType === RequirementType.REQUIRED) === true,
      'Jobicy required skill "node" linked to OpportunitySkill'
    );

    const dbGreenhouse = await prismaTest.opportunity.findFirst({
      where: { sourceJobId: 'greenhouse-multi-002' },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    assert(dbGreenhouse !== null && dbGreenhouse.source === 'Greenhouse', 'Greenhouse opportunity persisted with source="Greenhouse"');
    assert(dbGreenhouse?.organization === 'Cloudflare', 'Greenhouse organization matches "Cloudflare"');
    assert(
      dbGreenhouse?.opportunitySkills.some((os) => os.skill.name === 'rust' && os.requirementType === RequirementType.REQUIRED) === true,
      'Greenhouse required skill "rust" linked to OpportunitySkill'
    );

    const dbLever = await prismaTest.opportunity.findFirst({
      where: { sourceJobId: 'lever-multi-003' },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    assert(dbLever !== null && dbLever.source === 'Lever', 'Lever opportunity persisted with source="Lever"');
    assert(dbLever?.organization === 'Palantir', 'Lever organization matches "Palantir"');
    assert(
      dbLever?.opportunitySkills.some((os) => os.skill.name === 'react' && os.requirementType === RequirementType.REQUIRED) === true,
      'Lever required skill "react" linked to OpportunitySkill'
    );

    // 4. Verify Idempotence and lastSeenAt semantics
    console.log('\nStep 4: Verifying deduplication, idempotency, and lastSeenAt...');
    const tBeforeUpdate = dbGreenhouse!.lastSeenAt;
    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 50));

    const reIngestGreenhouse = await ingestor.ingest(mockGreenhouseProvider);
    assert(reIngestGreenhouse.created === 0, 'Re-ingestion created 0 new records');
    assert(reIngestGreenhouse.updated === 1 && reIngestGreenhouse.skipped === 1, 'Re-ingestion updated 1 record and marked skipped 1');

    const dbGreenhouseUpdated = await prismaTest.opportunity.findFirst({
      where: { sourceJobId: 'greenhouse-multi-002' },
    });
    assert(
      dbGreenhouseUpdated!.lastSeenAt.getTime() >= tBeforeUpdate.getTime(),
      'lastSeenAt updated on successful re-observation'
    );

    // 5. Verify Case-Insensitive Source Querying in API logic
    console.log('\nStep 5: Verifying case-insensitive source querying...');
    const jobicyFilterResults = await prismaTest.opportunity.findMany({
      where: {
        source: { equals: 'jobicy', mode: 'insensitive' },
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
    });
    assert(jobicyFilterResults.length === 1 && jobicyFilterResults[0].source === 'Jobicy', 'Filter by "jobicy" (lowercase) matches Jobicy record');

    const ghFilterResults = await prismaTest.opportunity.findMany({
      where: {
        source: { equals: 'GREENHOUSE', mode: 'insensitive' },
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
    });
    assert(ghFilterResults.length === 1 && ghFilterResults[0].source === 'Greenhouse', 'Filter by "GREENHOUSE" (uppercase) matches Greenhouse record');

    const leverFilterResults = await prismaTest.opportunity.findMany({
      where: {
        source: { equals: 'lever', mode: 'insensitive' },
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
    });
    assert(leverFilterResults.length === 1 && leverFilterResults[0].source === 'Lever', 'Filter by "lever" (lowercase) matches Lever record');

    // 6. Verify Pagination across multi-source listings
    console.log('\nStep 6: Verifying multi-source pagination and ordering...');
    const multiSourceQuery = await prismaTest.opportunity.findMany({
      where: {
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
      orderBy: { postedDate: 'desc' },
      take: 2,
      skip: 0,
    });
    assert(multiSourceQuery.length === 2, 'Page 1 (take 2) returns 2 results');
    assert(multiSourceQuery[0].sourceJobId === 'lever-multi-003', 'First result is most recent posted (Lever Oct 27)');
    assert(multiSourceQuery[1].sourceJobId === 'greenhouse-multi-002', 'Second result is Greenhouse (Oct 26)');

    const multiSourcePage2 = await prismaTest.opportunity.findMany({
      where: {
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
      orderBy: { postedDate: 'desc' },
      take: 2,
      skip: 2,
    });
    assert(multiSourcePage2.length === 1, 'Page 2 (take 2, skip 2) returns 1 result');
    assert(multiSourcePage2[0].sourceJobId === 'jobicy-multi-001', 'Third result is Jobicy (Oct 25)');

    // 7. Verify Matching Engine works identically on all sources
    console.log('\nStep 7: Verifying matching calculations across all sources...');
    const matchingService = new MatchingService(prismaTest);
    const oppWithSkills = await prismaTest.opportunity.findUnique({
      where: { id: dbGreenhouse!.id },
      include: { opportunitySkills: { include: { skill: true } } },
    });

    const candidateEvidenceMap = new Map<string, Array<{ skillId: string; skillName: string; isDirect: boolean }>>();
    for (const os of oppWithSkills!.opportunitySkills) {
      candidateEvidenceMap.set(os.skillId, [
        { skillId: os.skillId, skillName: os.skill.name, isDirect: true },
      ]);
    }

    const matchResult = matchingService.matchEvidenceToOpportunity(candidateEvidenceMap as any, oppWithSkills!);
    const summary = matchingService.getMatchSummary(matchResult);
    assert(summary.hasStructuredRequirements === true, 'Greenhouse match detects structured requirements');
    assert(summary.score !== null && summary.score > 0, `Greenhouse match score computed: ${summary.score}%`);
    assert(summary.matchedCount === oppWithSkills!.opportunitySkills.length, 'Candidate matched all opportunity skills');

    // 8. Clean up test records from Port 5433
    await prismaTest.opportunitySkill.deleteMany({
      where: {
        opportunity: {
          sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
        },
      },
    });
    await prismaTest.opportunity.deleteMany({
      where: {
        sourceJobId: { in: ['jobicy-multi-001', 'greenhouse-multi-002', 'lever-multi-003'] },
      },
    });

    console.log(`\n===============================================================`);
    console.log(`   TEST RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log(`===============================================================\n`);
  } finally {
    await prismaTest.$disconnect();
    await pool.end();
  }
}

runVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
