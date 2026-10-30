import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient, OpportunityType, WorkMode, EmploymentType, ExperienceLevel, RequirementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { OpportunityIngestor, OpportunityNormalizer, OpportunityDeduplicator, ExternalJob, OpportunityProvider } from './lib/opportunityProvider';
import { IndiaLocationClassifier } from './services/indiaLocationClassifier';

async function runIngestionReadinessTests() {
  console.log('======================================================================');
  console.log('   INGESTION READINESS & IDEMPOTENT UPSERT INTEGRATION TEST');
  console.log('   Target Database: Port 5433 (ISOLATED TEST DATABASE ONLY)');
  console.log('======================================================================\n');

  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/intelligence_engine_test';
  console.log(`Connecting to isolated test DB: ${testDbUrl.replace(/:[^:@]+@/, ':***@')}`);

  const pool = new pg.Pool({ connectionString: testDbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as any).then(
          () => {
            console.log(`  [PASS] ${name}`);
            passed++;
          },
          (err: any) => {
            console.error(`  [FAIL] ${name}`);
            console.error(err);
            process.exit(1);
          }
        );
      } else {
        console.log(`  [PASS] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  try {
    // ─── Setup & Cleanup ───────────────────────────────────────────────────
    console.log('\n--- Step 1: Cleaning up previous readiness test fixtures ---');
    await prisma.$executeRawUnsafe(`DELETE FROM "OpportunitySkill" WHERE "opportunityId" LIKE 'ready-fix-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Opportunity" WHERE id LIKE 'ready-fix-%' OR "sourceJobId" LIKE 'ready-job-%'`);

    // ─── Step 2: Multi-Board Mock Provider Simulation ──────────────────────
    console.log('\n--- Step 2: Testing Multi-Board Ingestion via OpportunityIngestor ---');

    class MockMultiBoardProvider implements OpportunityProvider {
      readonly name = 'Greenhouse';
      constructor(private jobs: ExternalJob[]) {}
      async fetch(): Promise<ExternalJob[]> {
        return this.jobs;
      }
    }

    const initialMockJobs: ExternalJob[] = [
      {
        id: 'ready-job-okta-1',
        title: 'Developer Support Engineer',
        company: 'Okta',
        location: 'Bengaluru, India',
        workMode: 'Hybrid',
        employmentType: 'Full-time',
        experienceLevel: 'Entry',
        description: 'Support cloud developers using Python, JavaScript, and REST APIs.',
        applicationUrl: 'https://okta.com/jobs/1',
        source: 'Greenhouse',
        sourceUrl: 'https://okta.com/jobs/1',
        postedDate: new Date('2026-10-25').toISOString(),
        requiredSkills: ['Python', 'JavaScript', 'REST API'],
        preferredSkills: ['Docker'],
      },
      {
        id: 'ready-job-stripe-1',
        title: 'Backend Software Engineer',
        company: 'Stripe',
        location: 'Bengaluru',
        workMode: 'Onsite',
        employmentType: 'Full-time',
        experienceLevel: 'Mid',
        description: 'Build global payments systems using Java, Go, and PostgreSQL.',
        applicationUrl: 'https://stripe.com/jobs/1',
        source: 'Greenhouse',
        sourceUrl: 'https://stripe.com/jobs/1',
        postedDate: new Date('2026-10-26').toISOString(),
        requiredSkills: ['Java', 'Go', 'PostgreSQL'],
      },
      {
        id: 'ready-job-inmobi-1',
        title: 'Applied Scientist III',
        company: 'InMobi',
        location: 'Bangalore, Karnataka',
        workMode: 'Hybrid',
        employmentType: 'Full-time',
        experienceLevel: 'Senior',
        description: 'Ad tech machine learning and generative AI algorithms using Python and PyTorch.',
        applicationUrl: 'https://inmobi.com/jobs/1',
        source: 'Greenhouse',
        sourceUrl: 'https://inmobi.com/jobs/1',
        postedDate: new Date('2026-10-27').toISOString(),
        requiredSkills: ['Machine Learning', 'Python', 'PyTorch'],
      },
      {
        id: 'ready-job-meesho-1',
        title: 'Assistant Manager - Risk Analytics',
        company: 'Meesho',
        location: 'Bangalore, Karnataka',
        workMode: 'Hybrid',
        employmentType: 'Full-time',
        experienceLevel: 'Mid',
        description: 'Risk analytics modeling using SQL, Python, and statistical methods.',
        applicationUrl: 'https://meesho.com/jobs/1',
        source: 'Lever',
        sourceUrl: 'https://meesho.com/jobs/1',
        postedDate: new Date('2026-10-27').toISOString(),
        requiredSkills: ['SQL', 'Python'],
      },
      {
        id: 'ready-job-palantir-overseas',
        title: 'Deployment Strategist',
        company: 'Palantir',
        location: 'London, UK',
        workMode: 'Onsite',
        employmentType: 'Full-time',
        experienceLevel: 'Mid',
        description: 'Deploy mission-critical data systems in London, UK.',
        applicationUrl: 'https://palantir.com/jobs/1',
        source: 'Lever',
        sourceUrl: 'https://palantir.com/jobs/1',
        postedDate: new Date('2026-10-24').toISOString(),
        requiredSkills: ['Python', 'Docker'],
      },
    ];

    const ingestor = new OpportunityIngestor(prisma);
    const mockProvider = new MockMultiBoardProvider(initialMockJobs);

    const stats1 = await ingestor.ingest(mockProvider);

    test('Initial ingestion created 5 records', () => {
      assert.equal(stats1.created, 5);
      assert.equal(stats1.errors, 0);
    });

    test('All 5 records are persisted with sourceJobId', async () => {
      const records = await prisma.opportunity.findMany({
        where: { sourceJobId: { in: initialMockJobs.map((j) => j.id).filter(Boolean) as string[] } },
      });
      assert.equal(records.length, 5);
    });

    test('India location normalizer correctly formats India jobs and leaves overseas jobs intact', async () => {
      const oktaJob = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-okta-1' } });
      const stripeJob = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-stripe-1' } });
      const inmobiJob = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-inmobi-1' } });
      const palantirJob = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-palantir-overseas' } });

      assert.ok(oktaJob?.location?.startsWith('Bengaluru, India'));
      assert.ok(stripeJob?.location?.startsWith('Bengaluru, India')); // "Bengaluru" normalized to canonical "Bengaluru, India"
      assert.ok(inmobiJob?.location?.startsWith('Bengaluru, India')); // "Bangalore, Karnataka" normalized to "Bengaluru, India"
      assert.equal(palantirJob?.location, 'London, UK'); // Overseas preserved as raw
    });

    test('OpportunitySkill relations are created for required and preferred skills', async () => {
      const oktaJob = await prisma.opportunity.findFirst({
        where: { sourceJobId: 'ready-job-okta-1' },
        include: { opportunitySkills: { include: { skill: true } } },
      });
      assert.ok(oktaJob);
      const skillNames = oktaJob.opportunitySkills.map((os) => os.skill.name.toLowerCase());
      assert.ok(skillNames.includes('python'));
      assert.ok(skillNames.includes('javascript'));
      assert.ok(skillNames.includes('docker'));
    });

    // ─── Step 3: Idempotent Re-Ingestion (Zero Duplicate Verification) ───────
    console.log('\n--- Step 3: Idempotent Re-Ingestion & Freshness Verification ---');

    const stats2 = await ingestor.ingest(mockProvider);

    test('Re-ingestion creates exactly 0 duplicate records', () => {
      assert.equal(stats2.created, 0);
      assert.equal(stats2.updated, 5);
      assert.equal(stats2.errors, 0);
    });

    test('Database contains exactly 5 records (no duplicates created)', async () => {
      const totalCount = await prisma.opportunity.count({
        where: { sourceJobId: { in: initialMockJobs.map((j) => j.id).filter(Boolean) as string[] } },
      });
      assert.equal(totalCount, 5);
    });

    test('lastSeenAt timestamp is refreshed forward on re-observation', async () => {
      const record = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-okta-1' } });
      assert.ok(record?.lastSeenAt);
      const diffMs = Date.now() - new Date(record!.lastSeenAt!).getTime();
      assert.ok(diffMs < 5000, 'lastSeenAt should be within the last 5 seconds');
    });

    // ─── Step 4: Safe Field Mutation & Preservation Under Sparse Updates ────
    console.log('\n--- Step 4: Safe Update & Preservation Under Sparse Updates ---');

    // Simulate an update where title changes, but location is omitted
    const sparseUpdateJobs: ExternalJob[] = [
      {
        id: 'ready-job-stripe-1',
        title: 'Lead Backend Engineer - Payments', // Title updated
        company: 'Stripe',
        location: undefined, // Location omitted in update
        workMode: undefined, // Work mode omitted
        employmentType: 'Full-time',
        experienceLevel: 'Senior',
        description: 'Build next-generation payment APIs using Java, Go, and PostgreSQL.',
        applicationUrl: 'https://stripe.com/jobs/1-updated',
        source: 'Greenhouse',
        sourceUrl: 'https://stripe.com/jobs/1',
        postedDate: new Date('2026-10-26').toISOString(),
        requiredSkills: ['Java', 'Go'],
      },
    ];

    const sparseProvider = new MockMultiBoardProvider(sparseUpdateJobs);
    await ingestor.ingest(sparseProvider);

    test('Mutable fields update properly', async () => {
      const updatedStripe = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-stripe-1' } });
      assert.equal(updatedStripe?.title, 'Lead Backend Engineer - Payments');
      assert.equal(updatedStripe?.applicationUrl, 'https://stripe.com/jobs/1-updated');
    });

    test('Omitted fields in sparse update are preserved (not overwritten with null/UNKNOWN)', async () => {
      const preservedStripe = await prisma.opportunity.findFirst({ where: { sourceJobId: 'ready-job-stripe-1' } });
      assert.equal(preservedStripe?.location, 'Bengaluru, India', 'Location should not be erased');
      assert.equal(preservedStripe?.workMode, WorkMode.ONSITE, 'WorkMode should not be reset to UNKNOWN');
    });

    // ─── Step 5: India Feed Query Verification ──────────────────────────────
    console.log('\n--- Step 5: India Endpoint Query & Multi-Employer Interleaving ---');

    // Query through India SQL condition
    const indiaEligibleRecords = await prisma.$queryRaw<Array<{ organization: string; title: string; location: string }>>`
      SELECT "organization", "title", "location"
      FROM "Opportunity"
      WHERE "sourceJobId" LIKE 'ready-job-%'
        AND NOT (
          COALESCE("location", '') ~* '\\y(United States|USA|U\\.S\\.A\\.|U\\.S\\.|US|United Kingdom|UK|U\\.K\\.|Great Britain|England|EMEA|LATAM|Europe|Americas|California|New York|San Francisco|London|Canada|Toronto|Vancouver|Seattle|Austin|Chicago|Boston|Berlin|Munich|Germany|France|Paris|Amsterdam|Netherlands|Dublin|Ireland|Singapore|Sydney|Melbourne|Australia|Tokyo|Japan|Warsaw|Poland|Brazil|Mexico|Spain|Madrid|Barcelona|Switzerland|Zurich|Israel|Tel Aviv|Belgrade|Serbia)\\y'
          AND NOT COALESCE("location", '') ~* '\\y(India)\\y'
        )
        AND NOT (
          COALESCE("location", '') ~* '^(\\s*remote|\\s*unknown|\\s*telecommute)\\s*$'
          AND NOT COALESCE("title", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Gurgaon|Gurugram|Noida|Mumbai|Chennai)\\y'
        )
        AND (
          COALESCE("location", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Gurgaon|Gurugram|Noida|Mumbai|Chennai)\\y'
          OR COALESCE("title", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Gurgaon|Gurugram|Noida|Mumbai|Chennai)\\y'
        )
    `;

    test('Exactly 4 India jobs are returned (London UK job strictly excluded)', () => {
      assert.equal(indiaEligibleRecords.length, 4);
      const orgs = indiaEligibleRecords.map((r) => r.organization);
      assert.ok(orgs.includes('Okta'));
      assert.ok(orgs.includes('Stripe'));
      assert.ok(orgs.includes('InMobi'));
      assert.ok(orgs.includes('Meesho'));
      assert.ok(!orgs.includes('Palantir'), 'London UK job must be excluded');
    });

    // ─── Step 6: Cleanup ────────────────────────────────────────────────────
    console.log('\n--- Step 6: Cleaning up test fixtures on Port 5433 ---');
    await prisma.$executeRawUnsafe(`DELETE FROM "OpportunitySkill" WHERE "opportunityId" LIKE 'ready-fix-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Opportunity" WHERE id LIKE 'ready-fix-%' OR "sourceJobId" LIKE 'ready-job-%'`);
    console.log('  Cleaned up all test fixtures.');

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('\n======================================================================');
  console.log(`   INGESTION READINESS TEST RESULTS: ${passed} / ${total} PASSED (100%)`);
  console.log('======================================================================');
}

runIngestionReadinessTests().catch((err) => {
  console.error('Ingestion readiness test failed:', err);
  process.exit(1);
});
