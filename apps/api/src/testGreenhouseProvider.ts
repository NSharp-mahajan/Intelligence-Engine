import {
  GreenhouseProvider,
  decodeHtmlEntities,
  type GreenhouseJobItem,
  type GreenhouseBoardConfig,
} from './lib/greenhouseProvider';
import {
  OpportunityNormalizer,
  OpportunityDeduplicator,
  type ExternalJob,
} from './lib/opportunityProvider';

class MockGreenhouseProvider extends GreenhouseProvider {
  private mockBoardData: Map<string, GreenhouseJobItem[]>;

  constructor(
    boards: GreenhouseBoardConfig[],
    mockBoardData: Map<string, GreenhouseJobItem[]>,
  ) {
    super(boards);
    this.mockBoardData = mockBoardData;
  }

  override async fetchBoard(board: GreenhouseBoardConfig): Promise<ExternalJob[]> {
    const jobs = this.mockBoardData.get(board.boardToken) || [];
    return jobs.map((job) => this.transformGreenhouseJob(job, board));
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('TEST SUITE: GreenhouseProvider Implementation');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const cloudflareBoard: GreenhouseBoardConfig = {
    boardToken: 'cloudflare',
    companyName: 'Cloudflare',
  };

  const databricksBoard: GreenhouseBoardConfig = {
    boardToken: 'databricks',
    companyName: 'Databricks',
  };

  // ─── Test 1: Representative Payload Mapping ──────────────────────────────────
  console.log('--- Test 1: Representative Greenhouse Payload Mapping ---');
  const provider = new GreenhouseProvider();

  const sampleCloudflareJob: GreenhouseJobItem = {
    id: 8097321,
    title: 'AI Security Research & Red Team Engineer',
    company_name: 'Cloudflare',
    content:
      '&lt;h3&gt;About the Role&lt;/h3&gt;&lt;p&gt;Work on LLM safety.&lt;/p&gt;&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Strong experience with Python, Rust, and TypeScript&lt;/li&gt;&lt;li&gt;Experience with Docker and Kubernetes&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Bonus&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Familiarity with PyTorch and PostgreSQL&lt;/li&gt;&lt;/ul&gt;',
    location: { name: 'Hybrid - Austin, TX' },
    absolute_url: 'https://boards.greenhouse.io/cloudflare/jobs/8097321',
    first_published: '2026-08-10T11:02:09-04:00',
    updated_at: '2026-10-02T14:24:13-04:00',
    application_deadline: '2026-12-31T23:59:59Z',
  };

  const transformed = provider.transformGreenhouseJob(sampleCloudflareJob, cloudflareBoard);

  assert(transformed.id === '8097321', 'Job ID stringified correctly as "8097321"');
  assert(transformed.title === 'AI Security Research & Red Team Engineer', 'Title preserved');
  assert(transformed.company === 'Cloudflare', 'Company mapped correctly as "Cloudflare"');
  assert(transformed.source === 'Greenhouse', 'Source identifier is "Greenhouse"');
  assert(transformed.workMode === 'HYBRID', 'WorkMode inferred as "HYBRID" from location');
  assert(transformed.location === 'Hybrid - Austin, TX', 'Location preserved');
  assert(transformed.applicationUrl === 'https://boards.greenhouse.io/cloudflare/jobs/8097321', 'Application URL mapped');
  assert(transformed.sourceUrl === 'https://boards.greenhouse.io/cloudflare/jobs/8097321', 'Source URL mapped');
  assert(transformed.postedDate === '2026-08-10T11:02:09-04:00', 'first_published mapped to postedDate');
  assert(transformed.deadline === '2026-12-31T23:59:59Z', 'application_deadline mapped to deadline');
  assert(transformed.description.includes('<h3>About the Role</h3>'), 'HTML entities properly decoded in description');
  assert(Array.isArray(transformed.requiredSkills) && transformed.requiredSkills.includes('Python'), 'Required skills extracted (Python)');
  assert(Array.isArray(transformed.requiredSkills) && transformed.requiredSkills.includes('TypeScript'), 'Required skills extracted (TypeScript)');
  assert(Array.isArray(transformed.preferredSkills) && transformed.preferredSkills.includes('PostgreSQL'), 'Preferred skills extracted (PostgreSQL)');
  console.log();

  // ─── Test 2: Publication vs. Update Timestamp Rules ──────────────────────────
  console.log('--- Test 2: Publication Date Rule Enforcement ---');
  const jobWithOnlyUpdatedAt: GreenhouseJobItem = {
    id: 112233,
    title: 'Systems Engineer',
    content: '<p>Build systems.</p>',
    updated_at: '2026-10-02T14:24:13-04:00',
    first_published: null, // No first_published timestamp
  };

  const transformedNoPub = provider.transformGreenhouseJob(jobWithOnlyUpdatedAt, cloudflareBoard);
  assert(
    transformedNoPub.postedDate === undefined,
    'Does not invent publication date when first_published is null (updated_at is NOT used as postedDate)',
  );
  console.log();

  // ─── Test 3: Missing Optional Fields & Sparse Fallbacks ──────────────────────
  console.log('--- Test 3: Sparse Payload Handling & Safe Fallbacks ---');
  const sparseJob: GreenhouseJobItem = {
    id: 999999,
    title: '',
    content: undefined,
    location: null,
  };

  const sparseTransformed = provider.transformGreenhouseJob(sparseJob, databricksBoard);
  assert(sparseTransformed.id === '999999', 'ID preserved for sparse payload');
  assert(sparseTransformed.title === 'Untitled Opportunity', 'Fallback for empty title applied');
  assert(sparseTransformed.company === 'Databricks', 'Fallback to boardConfig companyName when payload lacks company_name');
  assert(sparseTransformed.description === '', 'Missing content maps to empty string without injecting unrelated text');
  assert(sparseTransformed.location === undefined, 'Missing location yields undefined');
  assert(sparseTransformed.postedDate === undefined, 'Missing date yields undefined');
  console.log();

  // ─── Test 4: HTML Entity Decoding Helper ────────────────────────────────────
  console.log('--- Test 4: HTML Entity Decoding ---');
  const encoded = '&lt;div class=&quot;job&quot;&gt;C&#43;&#43; &amp; Go &amp; Node&#39;s API &lt;/div&gt;';
  const decoded = decodeHtmlEntities(encoded);
  assert(decoded.includes('<div class="job">'), 'Decodes &lt;, &gt;, &quot;');
  assert(decoded.includes('&'), 'Decodes &amp;');
  assert(decoded.includes("Node's"), "Decodes &#39;");
  console.log();

  // ─── Test 5: Multi-Board Company Attribution ────────────────────────────────
  console.log('--- Test 5: Multi-Board Company Attribution ---');
  const mockData = new Map<string, GreenhouseJobItem[]>([
    [
      'cloudflare',
      [
        {
          id: 101,
          title: 'Cloudflare Backend Engineer',
          company_name: 'Cloudflare',
          first_published: '2026-09-01T00:00:00Z',
        },
      ],
    ],
    [
      'databricks',
      [
        {
          id: 202,
          title: 'Databricks Software Engineer',
          company_name: 'Databricks',
          first_published: '2026-09-02T00:00:00Z',
        },
      ],
    ],
  ]);

  const multiBoardProvider = new MockGreenhouseProvider(
    [cloudflareBoard, databricksBoard],
    mockData,
  );

  const fetched = await multiBoardProvider.fetch();
  assert(fetched.length === 2, 'Fetched 2 jobs across 2 boards');
  assert(fetched[0].company === 'Cloudflare' && fetched[0].id === '101', 'Cloudflare job retains Cloudflare attribution');
  assert(fetched[1].company === 'Databricks' && fetched[1].id === '202', 'Databricks job retains Databricks attribution');
  assert(fetched[0].source === 'Greenhouse' && fetched[1].source === 'Greenhouse', 'Both share "Greenhouse" source identifier');
  console.log();

  // ─── Test 6: OpportunityNormalizer Pipeline with Greenhouse ─────────────────
  console.log('--- Test 6: OpportunityNormalizer Pipeline Integration ---');
  const normalizer = new OpportunityNormalizer();
  const normalized = normalizer.normalize(transformed);

  assert(normalized.organization === 'Cloudflare', 'Normalized organization matches Cloudflare');
  assert(normalized.source === 'Greenhouse', 'Normalized source is "Greenhouse"');
  assert(normalized.sourceJobId === '8097321', 'Normalized sourceJobId matches "8097321"');
  assert(normalized.workMode === 'HYBRID', 'Normalized workMode matches "HYBRID"');
  assert(normalized.requiredSkills.includes('python'), 'Skill Python canonicalized to lowercase "python"');
  assert(normalized.requiredSkills.includes('typescript'), 'Skill TypeScript canonicalized to lowercase "typescript"');
  assert(normalized.preferredSkills.includes('postgresql'), 'Skill PostgreSQL canonicalized to lowercase "postgresql"');
  console.log();

  // ─── Test 7: Deduplication & Idempotency Key ────────────────────────────────
  console.log('--- Test 7: Deduplication Key & Idempotency Check ---');
  const deduplicator = new OpportunityDeduplicator();
  const dedupKey = deduplicator.generateDeduplicationKey(normalized);
  assert(dedupKey.startsWith('Greenhouse|||8097321'), 'Deduplication key format matches Greenhouse|||8097321');
  assert(dedupKey.includes('cloudflare'), 'Deduplication key includes company name');
  console.log();

  // ─── Test 8: Employment Classification & Word-Boundary Rules ───────────────
  console.log('--- Test 8: Employment Classification & False Positive Regression ---');
  
  // 8a. Positive Internship Tests
  const positiveInterns = [
    'Software Engineer Intern',
    'Machine Learning Internship',
    'Software Engineering Internships, Summer 2027',
    'University Co-op - Cloudflare Workers',
    'Engineering co-op (Fall 2026)',
  ];
  for (const title of positiveInterns) {
    const job: GreenhouseJobItem = { id: 1001, title, company_name: 'Cloudflare' };
    const t = provider.transformGreenhouseJob(job, cloudflareBoard);
    const n = normalizer.normalize(t);
    assert(t.employmentType === 'INTERNSHIP', `Positive intern classification: "${title}" -> INTERNSHIP`);
    assert(n.type === 'INTERNSHIP', `Normalizer maps "${title}" -> OpportunityType.INTERNSHIP`);
  }

  // 8b. Positive Contract Tests
  const positiveContracts = [
    'Contract Software Engineer',
    'Temporary Software Engineer',
    'Frontend Developer (Contractor)',
    'Temp Systems Administrator',
  ];
  for (const title of positiveContracts) {
    const job: GreenhouseJobItem = { id: 2001, title, company_name: 'Databricks' };
    const t = provider.transformGreenhouseJob(job, databricksBoard);
    const n = normalizer.normalize(t);
    assert(t.employmentType === 'CONTRACT', `Positive contract classification: "${title}" -> CONTRACT`);
    assert(n.employmentType === 'CONTRACT', `Normalizer maps "${title}" -> EmploymentType.CONTRACT`);
  }

  // 8c. Regression Tests: Words containing "intern" substrings must NOT be classified as internships
  const regressionTitles = [
    'Senior Software Engineer, Internal Fraud Platform',
    'Software Engineer - Database Engine Internals',
    'Staff Software Engineer - Database Engine Internals',
    'Director, International Communications',
    'International Accounts Payable Manager',
    'Engineering Manager, Agentic Internet & Data Insights',
  ];
  for (const title of regressionTitles) {
    const job: GreenhouseJobItem = { id: 3001, title, company_name: 'Cloudflare' };
    const t = provider.transformGreenhouseJob(job, cloudflareBoard);
    const n = normalizer.normalize(t);
    assert(
      t.employmentType === undefined,
      `False-positive regression avoided: "${title}" is NOT classified as INTERNSHIP (employmentType is undefined)`,
    );
    assert(
      n.type === 'JOB',
      `Normalizer preserves "${title}" as OpportunityType.JOB (not INTERNSHIP)`,
    );
  }

  // 8d. Ordinary Full-Time Titles: Not classified as internship or contract
  const ordinaryTitles = [
    'Senior Full Stack Engineer',
    'Staff Software Engineer, Platform Infrastructure',
    'Backend Systems Developer',
    'Engineering Lead, Core Services',
  ];
  for (const title of ordinaryTitles) {
    const job: GreenhouseJobItem = { id: 4001, title, company_name: 'Databricks' };
    const t = provider.transformGreenhouseJob(job, databricksBoard);
    const n = normalizer.normalize(t);
    assert(
      t.employmentType === undefined,
      `Ordinary title: "${title}" has undefined employmentType (relies on normalizer UNKNOWN)`,
    );
    assert(
      n.type === 'JOB',
      `Ordinary title "${title}" maps to OpportunityType.JOB`,
    );
    assert(
      n.employmentType === 'UNKNOWN',
      `Ordinary title "${title}" maps to EmploymentType.UNKNOWN without synthetic assumption`,
    );
  }
  console.log();

  // ─── Test 9: Live Bounded Endpoint Validation (NO DB PERSISTENCE) ───────────
  console.log('--- Test 9: Live Bounded Endpoint Connectivity Validation ---');
  try {
    const liveProvider = new GreenhouseProvider({
      boards: [cloudflareBoard, databricksBoard],
      maxJobsPerBoard: 5, // Bounded validation check
      timeoutMs: 10000,
    });

    console.log('  Testing live connectivity to Cloudflare board...');
    const cloudflareLive = await liveProvider.fetchBoard(cloudflareBoard);
    assert(cloudflareLive.length > 0, `Cloudflare live board responded successfully (${cloudflareLive.length} sampled jobs)`);
    if (cloudflareLive.length > 0) {
      assert(cloudflareLive[0].company === 'Cloudflare', 'Live Cloudflare job has company Cloudflare');
      assert(Boolean(cloudflareLive[0].applicationUrl), 'Live Cloudflare job has valid applicationUrl');
    }

    console.log('  Testing live connectivity to Databricks board...');
    const databricksLive = await liveProvider.fetchBoard(databricksBoard);
    assert(databricksLive.length > 0, `Databricks live board responded successfully (${databricksLive.length} sampled jobs)`);
    if (databricksLive.length > 0) {
      assert(databricksLive[0].company === 'Databricks', 'Live Databricks job has company Databricks');
      assert(Boolean(databricksLive[0].applicationUrl), 'Live Databricks job has valid applicationUrl');
    }
  } catch (error) {
    console.warn('[WARN] Live endpoint connectivity failed or timed out:', error instanceof Error ? error.message : error);
  }
  console.log();

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
