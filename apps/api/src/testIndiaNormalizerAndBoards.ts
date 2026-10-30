import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OpportunityNormalizer,
  OpportunityDeduplicator,
  OpportunityIngestor,
  OpportunityProvider,
  ExternalJob,
  DEFAULT_GREENHOUSE_BOARDS,
  VERIFIED_INDIA_GREENHOUSE_BOARDS,
  DEFAULT_LEVER_BOARDS,
  VERIFIED_INDIA_LEVER_BOARDS,
} from './lib/opportunityProvider';
import {
  IndiaLocationClassifier,
  IndiaClassificationResult,
} from './services/indiaLocationClassifier';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test';
const pool = new Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prismaTest = new PrismaClient({ adapter });

async function runTests() {
  console.log('===============================================================');
  console.log('   TESTING: INDIA ATS BOARDS & INGESTION NORMALIZER HARDENING');
  console.log('   Target Test DB: Port 5433 (ISOLATED TEST DATABASE ONLY)');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, label: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label}`);
      process.exitCode = 1;
    }
  }

  const normalizer = new OpportunityNormalizer();

  try {
    // ─── Test 1: Indian City Aliases & Normalization ─────────────────────────
    console.log('--- Test 1: Indian City Aliases & Normalization ---');

    const cityTestCases = [
      { raw: 'Bengaluru, India', expectedCity: 'Bengaluru', expectedState: 'Karnataka' },
      { raw: 'Bangalore', expectedCity: 'Bengaluru', expectedState: 'Karnataka' },
      { raw: 'Bengaluru-VTP, India', expectedCity: 'Bengaluru', expectedState: 'Karnataka' },
      { raw: 'Bangalore, Karnataka', expectedCity: 'Bengaluru', expectedState: 'Karnataka' },
      { raw: 'Hyderabad', expectedCity: 'Hyderabad', expectedState: 'Telangana' },
      { raw: 'Hyderabad, Telangana, India', expectedCity: 'Hyderabad', expectedState: 'Telangana' },
      { raw: 'Secunderabad', expectedCity: 'Hyderabad', expectedState: 'Telangana' },
      { raw: 'Pune, Maharashtra, India', expectedCity: 'Pune', expectedState: 'Maharashtra' },
      { raw: 'Pune', expectedCity: 'Pune', expectedState: 'Maharashtra' },
      { raw: 'Gurugram, India', expectedCity: 'Delhi-NCR', expectedSubCity: 'Gurugram' },
      { raw: 'Gurgaon', expectedCity: 'Delhi-NCR', expectedSubCity: 'Gurugram' },
      { raw: 'Noida, Uttar Pradesh', expectedCity: 'Delhi-NCR', expectedSubCity: 'Noida' },
      { raw: 'New Delhi, India', expectedCity: 'Delhi-NCR', expectedSubCity: 'New Delhi' },
      { raw: 'Delhi, India', expectedCity: 'Delhi-NCR', expectedSubCity: 'Delhi' },
      { raw: 'Mumbai', expectedCity: 'Mumbai', expectedState: 'Maharashtra' },
      { raw: 'Navi Mumbai', expectedCity: 'Mumbai', expectedSubCity: 'Navi Mumbai' },
      { raw: 'Mumbai, Maharashtra', expectedCity: 'Mumbai', expectedState: 'Maharashtra' },
      { raw: 'Chennai, India', expectedCity: 'Chennai', expectedState: 'Tamil Nadu' },
      { raw: 'Madras', expectedCity: 'Chennai', expectedState: 'Tamil Nadu' },
      { raw: 'Kolkata, West Bengal', expectedCity: 'Kolkata', expectedState: 'West Bengal' },
      { raw: 'Ahmedabad, Gujarat', expectedCity: 'Ahmedabad', expectedState: 'Gujarat' },
      { raw: 'Kochi, Kerala', expectedCity: 'Kochi', expectedState: 'Kerala' },
      { raw: 'Thiruvananthapuram', expectedCity: 'Thiruvananthapuram', expectedState: 'Kerala' },
      { raw: 'Indore', expectedCity: 'Indore', expectedState: 'Madhya Pradesh' },
      { raw: 'Jaipur, Rajasthan', expectedCity: 'Jaipur', expectedState: 'Rajasthan' },
      { raw: 'Chandigarh', expectedCity: 'Chandigarh', expectedState: 'Punjab / Haryana' },
      { raw: 'Coimbatore', expectedCity: 'Coimbatore', expectedState: 'Tamil Nadu' },
    ];

    for (const tc of cityTestCases) {
      const res = IndiaLocationClassifier.classify(tc.raw);
      assert(res.isIndiaEligible, `City "${tc.raw}" classified as India-eligible`);
      assert(res.normalizedCity === tc.expectedCity, `City "${tc.raw}" normalized to "${tc.expectedCity}" (got "${res.normalizedCity}")`);
      if (tc.expectedState) {
        assert(res.state === tc.expectedState, `City "${tc.raw}" state is "${tc.expectedState}"`);
      }
      if (tc.expectedSubCity) {
        assert(res.subCity === tc.expectedSubCity, `City "${tc.raw}" subCity is "${tc.expectedSubCity}"`);
      }
    }

    // ─── Test 2: India-Eligible Remote Roles ─────────────────────────────────
    console.log('\n--- Test 2: India-Eligible Remote Roles ---');

    const remoteEligibleCases = [
      { raw: 'Remote - India', title: 'Machine Learning Engineer' },
      { raw: 'India Remote', title: 'Frontend Developer' },
      { raw: 'India - Remote', title: 'DevOps Engineer' },
      { raw: 'Remote (India)', title: 'Full Stack Engineer' },
      { raw: 'Remote, India', title: 'Systems Architect' },
      { raw: 'Anywhere in India', title: 'Backend Developer' },
      { raw: 'Work from anywhere in India', title: 'Data Scientist' },
      { raw: 'Worldwide', title: 'Open Source Engineer', desc: 'Work from anywhere in the world including India' },
      { raw: 'Global Remote', title: 'Developer Advocate', desc: 'Hiring remotely across APAC and India hubs' },
    ];

    for (const tc of remoteEligibleCases) {
      const res = IndiaLocationClassifier.classify(tc.raw, tc.title, tc.desc);
      assert(res.isIndiaEligible, `Remote location "${tc.raw}" is India-eligible`);
      assert(res.classification === 'INDIA_REMOTE', `Remote location "${tc.raw}" classification is INDIA_REMOTE`);
      assert(res.effectiveWorkMode === 'REMOTE', `Remote location "${tc.raw}" effectiveWorkMode is REMOTE`);
    }

    // ─── Test 3: Overseas-Only & Ambiguous Remote Roles ─────────────────────
    console.log('\n--- Test 3: Overseas-Only & Ambiguous Remote Roles ---');

    const overseasCases = [
      { raw: 'New York, NY', title: 'Software Engineer', desc: 'Based in Manhattan' },
      { raw: 'London, United Kingdom', title: 'Account Executive', desc: 'UK office' },
      { raw: 'San Francisco, California', title: 'Platform Engineer', desc: 'HQ role' },
      { raw: 'Remote - US', title: 'Senior Backend Engineer', desc: 'US remote' },
      { raw: 'Remote - California', title: 'Security Engineer', desc: 'California remote' },
      { raw: 'Remote - EMEA', title: 'Cloud Architect', desc: 'Europe, Middle East, Africa' },
      { raw: 'Remote - UK', title: 'Support Engineer', desc: 'UK residency' },
      { raw: 'Canada', title: 'Data Engineer', desc: 'Toronto or Vancouver' },
      { raw: 'Berlin, Germany', title: 'Rust Engineer', desc: 'Germany office' },
    ];

    for (const tc of overseasCases) {
      const res = IndiaLocationClassifier.classify(tc.raw, tc.title, tc.desc);
      assert(!res.isIndiaEligible, `Overseas role "${tc.raw}" correctly NOT India-eligible`);
      assert(res.classification === 'OVERSEAS_ONLY', `Overseas role "${tc.raw}" is OVERSEAS_ONLY`);
    }

    // Ambiguous cases (including generic worldwide without explicit India evidence)
    const ambiguousCases = [
      { raw: 'Remote', title: 'Software Engineer', desc: 'Competitive salary and equity' }, // No country given
      { raw: 'Worldwide', title: 'Staff Designer', desc: 'Work from anywhere with great benefits' }, // Generic worldwide without India evidence
      { raw: 'Global Remote', title: 'Product Manager', desc: 'Distributed company worldwide' },
      { raw: '', title: 'Developer', desc: 'Join our team' },
      { raw: null, title: 'Engineer', desc: 'Build great software' },
      { raw: 'Flexible', title: 'Product Manager', desc: 'Office or home' },
    ];

    for (const tc of ambiguousCases) {
      const res = IndiaLocationClassifier.classify(tc.raw, tc.title, tc.desc);
      assert(!res.isIndiaEligible, `Ambiguous role "${tc.raw}" correctly NOT India-eligible`);
      assert(res.classification === 'AMBIGUOUS', `Ambiguous role "${tc.raw}" classification is AMBIGUOUS`);
    }

    // ─── Test 4: Conflicting Location & Work-Authorisation Evidence ─────────
    console.log('\n--- Test 4: Conflicting Location & Work-Authorisation Evidence ---');

    // Case 4A: Worldwide header, but description says "US Only / US Citizenship required"
    const conflict1 = IndiaLocationClassifier.classify(
      'Worldwide',
      'Security Analyst',
      'US Citizenship required due to Department of Defense contracts. Must reside in the US.',
    );
    assert(!conflict1.isIndiaEligible, 'Worldwide with US Citizenship requirement rejected from India');
    assert(conflict1.classification === 'OVERSEAS_ONLY', 'Classified as OVERSEAS_ONLY due to legal restrictions');

    // Case 4B: Remote - India header, but description says "Must be legally authorized to work in the UK"
    const conflict2 = IndiaLocationClassifier.classify(
      'Remote - India',
      'Solutions Architect',
      'Candidates must be authorized to work in the UK. We do not provide UK visa sponsorship.',
    );
    assert(!conflict2.isIndiaEligible, 'Remote - India with conflicting UK authorization rejected from India');
    assert(conflict2.classification === 'OVERSEAS_ONLY', 'Classified as OVERSEAS_ONLY due to UK authorization clause');

    // ─── Test 5: Experience-Level Normalization (Table-Driven) ───────────────
    console.log('\n--- Test 5: Experience-Level Normalization ---');

    const expLevelCases = [
      // 5A: Explicit SDE-1 / Entry Titles
      { title: 'SDE-1', desc: '', expected: 'ENTRY' },
      { title: 'SDE 1', desc: '', expected: 'ENTRY' },
      { title: 'SDE I', desc: '', expected: 'ENTRY' },
      { title: 'Software Engineer 1', desc: '', expected: 'ENTRY' },
      { title: 'Software Engineer I', desc: '', expected: 'ENTRY' },
      { title: 'Software Development Engineer I', desc: '', expected: 'ENTRY' },
      { title: 'Associate Software Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Associate Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Graduate Engineer Trainee', desc: '', expected: 'ENTRY' },
      { title: 'Graduate Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Associate Technical Solutions Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Associate TSE', desc: '', expected: 'ENTRY' },
      { title: 'Junior Software Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Campus Hire - Software Engineer', desc: '', expected: 'ENTRY' },
      { title: 'Fresher Developer', desc: '', expected: 'ENTRY' },

      // 5B: Internships & Co-ops
      { title: 'ENG Project/ Program - Intern', desc: '', expected: 'ENTRY' },
      { title: 'Industrial Trainee', desc: '', expected: 'ENTRY' },
      { title: 'Video Editor Intern', desc: '', expected: 'ENTRY' },
      { title: 'Summer Intern (Software Engineering)', desc: '', expected: 'ENTRY' },

      // 5C: Mid-Level Roles
      { title: 'Software Engineer (Backend - SDE 2)', desc: '', expected: 'MID' },
      { title: 'SDE-2', desc: '', expected: 'MID' },
      { title: 'SDE II', desc: '', expected: 'MID' },
      { title: 'Software Engineer 2', desc: '', expected: 'MID' },
      { title: 'Software Engineer II', desc: '', expected: 'MID' },
      { title: 'Associate TSE II', desc: '', expected: 'MID' },
      { title: 'Assistant Manager - Internal Audit', desc: '', expected: 'MID' },

      // 5D: Senior & Leadership Precedence (Must NEVER be downgraded to Entry)
      { title: 'Senior Software Engineer', desc: '', expected: 'SENIOR' },
      { title: 'Senior Application Development Analyst', desc: '', expected: 'SENIOR' },
      { title: 'Senior Associate / Assistant Manager', desc: '', expected: 'SENIOR' },
      { title: 'Associate Director - Business Finance', desc: '', expected: 'SENIOR' },
      { title: 'Lead Software Engineer', desc: '', expected: 'SENIOR' },
      { title: 'Staff Software Engineer - Search Platform', desc: '', expected: 'SENIOR' },
      { title: 'Principal Architect', desc: '', expected: 'SENIOR' },
      { title: 'Engineering Manager - Backend', desc: '', expected: 'SENIOR' },
      { title: 'SDE-3', desc: '', expected: 'SENIOR' },
      { title: 'MTS-3', desc: '', expected: 'SENIOR' },

      // 5E: Explicit Year Requirements in Description
      { title: 'Software Engineer', desc: 'Requires 6+ years of distributed systems engineering', expected: 'SENIOR' },
      { title: 'Backend Developer', desc: 'Minimum of 5 years of production experience with Go', expected: 'SENIOR' },
      { title: 'Frontend Developer', desc: '3+ years of experience with React and TypeScript', expected: 'MID' },
      { title: 'Full Stack Engineer', desc: '0-2 years of software engineering experience or fresh graduate', expected: 'ENTRY' },

      // 5F: Generic Titles with Zero Clues (Must remain UNKNOWN, never guess)
      { title: 'Software Engineer', desc: 'Join our team to build scalable services', expected: 'UNKNOWN' },
      { title: 'Analyst', desc: 'Work with cross functional partners', expected: 'UNKNOWN' },
      { title: 'Product Manager', desc: 'Drive product vision and execution', expected: 'UNKNOWN' },
    ];

    for (const tc of expLevelCases) {
      const res = normalizer.normalizeExperienceLevel(undefined, tc.title, tc.desc);
      assert(res === tc.expected, `Title "${tc.title}" normalized to "${tc.expected}" (got "${res}")`);
    }

    // ─── Test 6: Board Configurations & Provider Definitions ────────────────
    console.log('\n--- Test 6: Board Configurations & Provider Verification ---');

    assert(DEFAULT_GREENHOUSE_BOARDS.length === 11, `DEFAULT_GREENHOUSE_BOARDS contains all 11 verified boards (got ${DEFAULT_GREENHOUSE_BOARDS.length})`);
    const ghTokens = DEFAULT_GREENHOUSE_BOARDS.map(b => b.boardToken);
    const expectedGh = ['cloudflare', 'databricks', 'okta', 'stripe', 'inmobi', 'rubrik', 'mongodb', 'elastic', 'druva', 'groww', 'coinbase'];
    for (const token of expectedGh) {
      assert(ghTokens.includes(token), `Greenhouse board list contains verified token: "${token}"`);
    }

    assert(DEFAULT_LEVER_BOARDS.length === 4, `DEFAULT_LEVER_BOARDS contains all 4 verified boards (got ${DEFAULT_LEVER_BOARDS.length})`);
    const leverSites = DEFAULT_LEVER_BOARDS.map(b => b.site);
    const expectedLever = ['palantir', 'spotify', 'meesho', 'cred'];
    for (const site of expectedLever) {
      assert(leverSites.includes(site), `Lever board list contains verified site: "${site}"`);
    }

    assert(VERIFIED_INDIA_GREENHOUSE_BOARDS.length === 11, 'VERIFIED_INDIA_GREENHOUSE_BOARDS export exists and has 11 boards');
    assert(VERIFIED_INDIA_LEVER_BOARDS.length === 3, 'VERIFIED_INDIA_LEVER_BOARDS export exists and has 3 boards');

    // ─── Test 7: Safe Ingestion & Idempotent Upsert on Isolated DB (5433) ───
    console.log('\n--- Test 7: Safe Ingestion & Idempotent Upsert on Port 5433 ---');

    // Clean test fixture IDs by sourceJobId
    const testIds = ['india-norm-test-1', 'india-norm-test-2', 'india-norm-test-3'];
    await prismaTest.opportunitySkill.deleteMany({
      where: { opportunity: { sourceJobId: { in: testIds } } },
    });
    await prismaTest.opportunity.deleteMany({
      where: { sourceJobId: { in: testIds } },
    });

    const mockProvider: OpportunityProvider = {
      name: 'Greenhouse',
      async fetch(): Promise<ExternalJob[]> {
        return [
          {
            id: 'india-norm-test-1',
            title: 'Associate Software Engineer - Frontend',
            company: 'Okta',
            description: 'Entry level frontend role. React, TypeScript. 0-1 years experience.',
            location: 'Bengaluru, India',
            workMode: 'ONSITE',
            applicationUrl: 'https://boards.greenhouse.io/okta/jobs/101',
            sourceUrl: 'https://boards.greenhouse.io/okta/jobs/101',
            source: 'Greenhouse',
            postedDate: new Date('2026-10-26T10:00:00Z'),
            requiredSkills: ['react', 'typescript'],
          },
          {
            id: 'india-norm-test-2',
            title: 'ENG Project/ Program - Intern',
            company: 'Rubrik',
            description: 'Engineering internship for university students. C++, Python.',
            location: 'Bangalore',
            workMode: 'ONSITE',
            applicationUrl: 'https://boards.greenhouse.io/rubrik/jobs/102',
            sourceUrl: 'https://boards.greenhouse.io/rubrik/jobs/102',
            source: 'Greenhouse',
            postedDate: new Date('2026-10-26T11:00:00Z'),
            requiredSkills: ['cpp', 'python'],
          },
          {
            id: 'india-norm-test-3',
            title: 'Machine Learning Engineer',
            company: 'Coinbase',
            description: 'Core ML platform. PyTorch, Distributed training.',
            location: 'Remote - India',
            workMode: 'REMOTE',
            applicationUrl: 'https://boards.greenhouse.io/coinbase/jobs/103',
            sourceUrl: 'https://boards.greenhouse.io/coinbase/jobs/103',
            source: 'Greenhouse',
            postedDate: new Date('2026-10-26T12:00:00Z'),
            requiredSkills: ['python', 'pytorch'],
          },
        ];
      },
    };

    const ingestor = new OpportunityIngestor(prismaTest);
    const run1 = await ingestor.ingest(mockProvider);
    assert(run1.created === 3, `Run 1 created 3 opportunities (got ${run1.created})`);
    assert(run1.errors === 0, 'Run 1 had 0 errors');

    // Verify normalization in database
    const opp1 = await prismaTest.opportunity.findUnique({
      where: { source_sourceJobId: { source: 'Greenhouse', sourceJobId: 'india-norm-test-1' } },
    });
    assert(opp1 !== null, 'Opp 1 found in DB');
    assert(opp1?.experienceLevel === 'ENTRY', `Opp 1 experienceLevel normalized to ENTRY (got ${opp1?.experienceLevel})`);
    assert(opp1?.type === 'JOB', `Opp 1 type is JOB (got ${opp1?.type})`);
    assert(opp1?.location === 'Bengaluru, India', `Opp 1 location is "Bengaluru, India" (got ${opp1?.location})`);

    const opp2 = await prismaTest.opportunity.findUnique({
      where: { source_sourceJobId: { source: 'Greenhouse', sourceJobId: 'india-norm-test-2' } },
    });
    assert(opp2 !== null, 'Opp 2 found in DB');
    assert(opp2?.type === 'INTERNSHIP', `Opp 2 type normalized to INTERNSHIP (got ${opp2?.type})`);
    assert(opp2?.employmentType === 'INTERNSHIP', `Opp 2 employmentType normalized to INTERNSHIP (got ${opp2?.employmentType})`);
    assert(opp2?.experienceLevel === 'ENTRY', `Opp 2 experienceLevel is ENTRY (got ${opp2?.experienceLevel})`);
    assert(opp2?.location === 'Bengaluru, India', `Opp 2 location normalized from "Bangalore" to "Bengaluru, India" (got ${opp2?.location})`);

    const opp3 = await prismaTest.opportunity.findUnique({
      where: { source_sourceJobId: { source: 'Greenhouse', sourceJobId: 'india-norm-test-3' } },
    });
    assert(opp3 !== null, 'Opp 3 found in DB');
    assert(opp3?.workMode === 'REMOTE', `Opp 3 workMode is REMOTE (got ${opp3?.workMode})`);
    assert(opp3?.location === 'Remote - India', `Opp 3 location is "Remote - India" (got ${opp3?.location})`);

    // Run 2: Re-ingest to verify idempotency
    const run2 = await ingestor.ingest(mockProvider);
    assert(run2.created === 0, `Run 2 created 0 duplicates (got ${run2.created})`);
    assert(run2.updated === 3, `Run 2 marked 3 updated (got ${run2.updated})`);
    assert(run2.errors === 0, 'Run 2 had 0 errors');

    // Cleanup fixtures
    await prismaTest.opportunitySkill.deleteMany({
      where: { opportunity: { sourceJobId: { in: testIds } } },
    });
    await prismaTest.opportunity.deleteMany({
      where: { sourceJobId: { in: testIds } },
    });

    console.log('\n===============================================================');
    console.log(`   TEST RESULT: ${passed}/${total} CHECKS PASSED`);
    console.log('===============================================================\n');
  } finally {
    await prismaTest.$disconnect();
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
