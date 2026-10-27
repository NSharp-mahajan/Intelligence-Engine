import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveCompanyLogoUrl, normalizeCompanyForLookup } from './services/companyLogoService';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test';
const pool = new Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prismaTest = new PrismaClient({ adapter });

async function runTests() {
  console.log('===============================================================');
  console.log('   TESTING: COMPANY BRANDING & BALANCED DISCOVERY FEED');
  console.log('   Target Test DB: Port 5433');
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

  try {
    // ─── Test 1: Company Logo Resolution ─────────────────────────────────────
    console.log('--- Test 1: Company Logo Resolution ---');
    const knownCompanies = [
      { name: 'Cloudflare', expectedDomain: 'cloudflare.com' },
      { name: 'Databricks', expectedDomain: 'databricks.com' },
      { name: 'Spotify', expectedDomain: 'spotify.com' },
      { name: 'Palantir', expectedDomain: 'palantir.com' },
      { name: 'Palantir Technologies', expectedDomain: 'palantir.com' },
      { name: 'Snowflake', expectedDomain: 'snowflake.com' },
      { name: 'Ramp', expectedDomain: 'ramp.com' },
      { name: 'Roboflow', expectedDomain: 'roboflow.com' },
      { name: 'Dropbox', expectedDomain: 'dropbox.com' },
    ];

    for (const c of knownCompanies) {
      const url = resolveCompanyLogoUrl(c.name);
      assert(url !== null && url.includes(c.expectedDomain), `Resolves logo URL for ${c.name} containing ${c.expectedDomain}`);
    }

    // Test unknown / invalid company fallback
    const unknownLogo = resolveCompanyLogoUrl('Random NonExistent Co 12345 67890');
    assert(unknownLogo === null, 'Unknown multi-word non-domain company resolves to null for fallback');

    // Test company name normalization
    assert(normalizeCompanyForLookup('Cloudflare, Inc.') === 'cloudflare', 'Normalizes "Cloudflare, Inc." -> "cloudflare"');
    assert(normalizeCompanyForLookup('Palantir Technologies') === 'palantir', 'Normalizes "Palantir Technologies" -> "palantir"');
    assert(normalizeCompanyForLookup('Manay CPA Inc.') === 'manay cpa', 'Normalizes "Manay CPA Inc." -> "manay cpa"');

    // ─── Test 2: Balanced Feed Ordering on Port 5433 ─────────────────────────
    console.log('\n--- Test 2: Balanced Source Interleaving on Port 5433 ---');

    // Clean test fixture IDs
    const testIds = ['feed-test-gh-1', 'feed-test-gh-2', 'feed-test-jb-1', 'feed-test-jb-2', 'feed-test-lv-1', 'feed-test-lv-2'];
    await prismaTest.opportunitySkill.deleteMany({
      where: { opportunity: { id: { in: testIds } } },
    });
    await prismaTest.opportunity.deleteMany({
      where: { id: { in: testIds } },
    });

    const now = new Date();
    // Seed fixtures with distinct timestamps and sources
    await prismaTest.opportunity.createMany({
      data: [
        {
          id: 'feed-test-gh-1',
          title: 'Cloud Systems Engineer',
          organization: 'Cloudflare',
          description: 'Rust and Edge computing',
          type: 'JOB',
          source: 'Greenhouse',
          sourceJobId: 'gh-01',
          applicationUrl: 'https://boards.greenhouse.io/cloudflare/1',
          postedDate: new Date('2026-10-26T12:00:00Z'),
        },
        {
          id: 'feed-test-gh-2',
          title: 'Security Architect',
          organization: 'Cloudflare',
          description: 'Zero trust security',
          type: 'JOB',
          source: 'Greenhouse',
          sourceJobId: 'gh-02',
          applicationUrl: 'https://boards.greenhouse.io/cloudflare/2',
          postedDate: new Date('2026-10-25T12:00:00Z'),
        },
        {
          id: 'feed-test-jb-1',
          title: 'Full Stack Engineer',
          organization: 'Ramp',
          description: 'React and Python services',
          type: 'JOB',
          source: 'Jobicy',
          sourceJobId: 'jb-01',
          applicationUrl: 'https://jobicy.com/ramp/1',
          postedDate: new Date('2026-10-26T11:00:00Z'),
        },
        {
          id: 'feed-test-jb-2',
          title: 'Growth Marketing Engineer',
          organization: 'Wpromote',
          description: 'Marketing analytics',
          type: 'JOB',
          source: 'Jobicy',
          sourceJobId: 'jb-02',
          applicationUrl: 'https://jobicy.com/wpromote/2',
          postedDate: new Date('2026-10-25T11:00:00Z'),
        },
        {
          id: 'feed-test-lv-1',
          title: 'Data Infrastructure Engineer',
          organization: 'Spotify',
          description: 'Big data pipelines',
          type: 'JOB',
          source: 'Lever',
          sourceJobId: 'lv-01',
          applicationUrl: 'https://jobs.lever.co/spotify/1',
          postedDate: new Date('2026-10-26T10:00:00Z'),
        },
        {
          id: 'feed-test-lv-2',
          title: 'Forward Deployed Engineer',
          organization: 'Palantir',
          description: 'Mission analytics',
          type: 'JOB',
          source: 'Lever',
          sourceJobId: 'lv-02',
          applicationUrl: 'https://jobs.lever.co/palantir/2',
          postedDate: new Date('2026-10-25T10:00:00Z'),
        },
      ],
    });

    // Execute balanced query on these fixtures
    const query = Prisma.sql`
      SELECT id, source, "postedDate",
             ROW_NUMBER() OVER (
               PARTITION BY source
               ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
             ) as source_rank
      FROM "Opportunity"
      WHERE id IN (${Prisma.join(testIds)})
      ORDER BY source_rank ASC, source ASC
    `;

    const orderedResults = await prismaTest.$queryRaw<Array<{ id: string; source: string }>>(query);
    assert(orderedResults.length === 6, 'Balanced query returned all 6 records');

    // Verify round-robin sequence: Greenhouse -> Jobicy -> Lever -> Greenhouse -> Jobicy -> Lever
    assert(orderedResults[0].source === 'Greenhouse' && orderedResults[0].id === 'feed-test-gh-1', 'Item 1: Greenhouse rank 1');
    assert(orderedResults[1].source === 'Jobicy' && orderedResults[1].id === 'feed-test-jb-1', 'Item 2: Jobicy rank 1');
    assert(orderedResults[2].source === 'Lever' && orderedResults[2].id === 'feed-test-lv-1', 'Item 3: Lever rank 1');
    assert(orderedResults[3].source === 'Greenhouse' && orderedResults[3].id === 'feed-test-gh-2', 'Item 4: Greenhouse rank 2');
    assert(orderedResults[4].source === 'Jobicy' && orderedResults[4].id === 'feed-test-jb-2', 'Item 5: Jobicy rank 2');
    assert(orderedResults[5].source === 'Lever' && orderedResults[5].id === 'feed-test-lv-2', 'Item 6: Lever rank 2');

    // ─── Test 3: Deterministic Pagination Without Duplicates ─────────────────
    console.log('\n--- Test 3: Pagination Across Balanced Results ---');
    const page1Query = Prisma.sql`
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY source
                 ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
               ) as source_rank,
               source
        FROM "Opportunity"
        WHERE id IN (${Prisma.join(testIds)})
      ) ranked
      ORDER BY source_rank ASC, source ASC
      LIMIT 3 OFFSET 0
    `;
    const page1 = await prismaTest.$queryRaw<Array<{ id: string }>>(page1Query);
    assert(page1.length === 3, 'Page 1 has 3 items');
    assert(page1.map(r => r.id).join(',') === 'feed-test-gh-1,feed-test-jb-1,feed-test-lv-1', 'Page 1 contains rank 1 of all 3 sources');

    const page2Query = Prisma.sql`
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY source
                 ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
               ) as source_rank,
               source
        FROM "Opportunity"
        WHERE id IN (${Prisma.join(testIds)})
      ) ranked
      ORDER BY source_rank ASC, source ASC
      LIMIT 3 OFFSET 3
    `;
    const page2 = await prismaTest.$queryRaw<Array<{ id: string }>>(page2Query);
    assert(page2.length === 3, 'Page 2 has 3 items');
    assert(page2.map(r => r.id).join(',') === 'feed-test-gh-2,feed-test-jb-2,feed-test-lv-2', 'Page 2 contains rank 2 of all 3 sources');

    // Verify zero overlap across adjacent pages
    const overlap = page1.filter(p1 => page2.some(p2 => p2.id === p1.id));
    assert(overlap.length === 0, 'Zero duplicates across page 1 and page 2');

    // ─── Test 4: Missing Source Resilience ───────────────────────────────────
    console.log('\n--- Test 4: Resilience When One Source is Absent ---');
    const twoSources = ['feed-test-gh-1', 'feed-test-gh-2', 'feed-test-lv-1', 'feed-test-lv-2'];
    const twoSourceQuery = Prisma.sql`
      SELECT id, source FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY source
                 ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
               ) as source_rank,
               source
        FROM "Opportunity"
        WHERE id IN (${Prisma.join(twoSources)})
      ) ranked
      ORDER BY source_rank ASC, source ASC
    `;
    const twoSourceRes = await prismaTest.$queryRaw<Array<{ id: string; source: string }>>(twoSourceQuery);
    assert(twoSourceRes.length === 4, 'Works cleanly with only 2 sources present');
    assert(twoSourceRes[0].source === 'Greenhouse' && twoSourceRes[1].source === 'Lever', 'Alternates Greenhouse and Lever cleanly');

    // Cleanup test fixtures
    await prismaTest.opportunitySkill.deleteMany({
      where: { opportunity: { id: { in: testIds } } },
    });
    await prismaTest.opportunity.deleteMany({
      where: { id: { in: testIds } },
    });

    console.log('\n===============================================================');
    console.log(`   TEST RESULT: ${passed}/${total} CHECKS PASSED`);
    console.log('===============================================================\n');
  } finally {
    await prismaTest.$disconnect();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
