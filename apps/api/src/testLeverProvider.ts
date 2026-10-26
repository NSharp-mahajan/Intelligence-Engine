import {
  LeverProvider,
  buildLeverFullDescription,
  type LeverJobItem,
  type LeverBoardConfig,
} from './lib/leverProvider';
import {
  OpportunityNormalizer,
  OpportunityDeduplicator,
  type ExternalJob,
} from './lib/opportunityProvider';

class MockLeverProvider extends LeverProvider {
  private mockBoardData: Map<string, LeverJobItem[]>;

  constructor(
    boards: LeverBoardConfig[],
    mockBoardData: Map<string, LeverJobItem[]>,
  ) {
    super(boards);
    this.mockBoardData = mockBoardData;
  }

  override async fetchBoard(board: LeverBoardConfig): Promise<ExternalJob[]> {
    const jobs = this.mockBoardData.get(board.site) || [];
    return jobs.map((job) => this.transformLeverJob(job, board));
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('TEST SUITE: LeverProvider Implementation');
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

  const palantirBoard: LeverBoardConfig = {
    site: 'palantir',
    companyName: 'Palantir',
  };

  const spotifyBoard: LeverBoardConfig = {
    site: 'spotify',
    companyName: 'Spotify',
  };

  const provider = new LeverProvider();
  const normalizer = new OpportunityNormalizer();
  const deduplicator = new OpportunityDeduplicator();

  // ─── Test 1: Representative Payload Mapping (Palantir style) ───────────────
  console.log('--- Test 1: Representative Lever Payload Mapping ---');
  const samplePalantirJob: LeverJobItem = {
    id: '6ed76ce8-4156-4b60-b120-403538bd66cd',
    text: 'Backend Software Engineer - Application Development',
    createdAt: 1786469891368,
    hostedUrl: 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd',
    applyUrl: 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply',
    workplaceType: 'hybrid',
    categories: {
      commitment: 'Full-time',
      location: 'London, UK',
      team: 'Engineering',
      allLocations: ['London, UK', 'New York, NY'],
    },
    description: '<div>Palantir builds the world’s leading software.</div>',
    descriptionBody: '<div>Build scalable backend microservices.</div>',
    lists: [
      {
        text: 'What We Require',
        content:
          '<li>Strong experience with Java, Python, and Go</li><li>Experience with PostgreSQL and Docker</li>',
      },
      {
        text: 'Nice to Have',
        content: '<li>Experience with Kubernetes and AWS</li>',
      },
    ],
    additional: '<div>Life at Palantir is collaborative.</div>',
  };

  const transformed = provider.transformLeverJob(samplePalantirJob, palantirBoard);

  assert(
    transformed.id === '6ed76ce8-4156-4b60-b120-403538bd66cd',
    'Posting ID matches stable UUID "6ed76ce8-4156-4b60-b120-403538bd66cd"',
  );
  assert(
    transformed.title === 'Backend Software Engineer - Application Development',
    'Title preserved',
  );
  assert(transformed.company === 'Palantir', 'Company mapped to Palantir');
  assert(transformed.source === 'Lever', 'Source identifier is "Lever"');
  assert(transformed.workMode === 'HYBRID', 'WorkMode inferred as "HYBRID" from workplaceType');
  assert(transformed.employmentType === 'FULL_TIME', 'EmploymentType inferred as "FULL_TIME" from commitment');
  assert(transformed.location === 'London, UK', 'Location mapped from categories.location');
  assert(
    transformed.applicationUrl === 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply',
    'Direct applyUrl mapped to applicationUrl',
  );
  assert(
    transformed.sourceUrl === 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd',
    'Hosted URL mapped to sourceUrl',
  );
  assert(
    transformed.postedDate instanceof Date &&
      transformed.postedDate.getTime() === 1786469891368,
    'createdAt epoch ms parsed to Date',
  );
  assert(
    transformed.description.includes('What We Require') &&
      transformed.description.includes('Java, Python, and Go'),
    'Description properly includes structured lists and headings',
  );
  assert(
    Array.isArray(transformed.requiredSkills) && transformed.requiredSkills.includes('Python'),
    'Required skills extracted (Python)',
  );
  assert(
    Array.isArray(transformed.requiredSkills) && transformed.requiredSkills.includes('Java'),
    'Required skills extracted (Java)',
  );
  assert(
    Array.isArray(transformed.preferredSkills) && transformed.preferredSkills.includes('Kubernetes'),
    'Preferred skills extracted (Kubernetes)',
  );
  console.log();

  // ─── Test 2: Description Assembly Helper ────────────────────────────────────
  console.log('--- Test 2: Description Assembly & List Reconstruction ---');
  const customDescJob: LeverJobItem = {
    id: 'desc-1',
    text: 'Test Role',
    descriptionBody: '<p>Overview of the position</p>',
    lists: [
      { text: 'Requirements', content: '<li>Skill A</li><li>Skill B</li>' },
      { text: 'Nice to have', content: '<li>Skill C</li>' },
    ],
    additional: '<p>Benefits info</p>',
  };

  const fullDesc = buildLeverFullDescription(customDescJob);
  assert(fullDesc.includes('Overview of the position'), 'Contains body text');
  assert(fullDesc.includes('<h3>Requirements</h3>'), 'Contains Requirements heading');
  assert(fullDesc.includes('<ul><li>Skill A</li><li>Skill B</li></ul>'), 'Contains list content');
  assert(fullDesc.includes('<h3>Nice to have</h3>'), 'Contains Nice to have heading');
  assert(fullDesc.includes('Benefits info'), 'Contains additional benefits section');

  // Fallback to description if descriptionBody is missing
  const fallbackDescJob: LeverJobItem = {
    id: 'desc-2',
    description: '<p>Main description fallback</p>',
  };
  const fallbackResult = buildLeverFullDescription(fallbackDescJob);
  assert(fallbackResult === '<p>Main description fallback</p>', 'Falls back to job.description when descriptionBody omitted');
  console.log();

  // ─── Test 3: Sparse Payload Handling & Fallbacks ────────────────────────────
  console.log('--- Test 3: Sparse Payload Handling & Safe Fallbacks ---');
  const sparseJob: LeverJobItem = {
    id: 'sparse-uuid',
    text: '',
  };

  const sparseTransformed = provider.transformLeverJob(sparseJob, spotifyBoard);
  assert(sparseTransformed.id === 'sparse-uuid', 'UUID preserved');
  assert(sparseTransformed.title === 'Untitled Opportunity', 'Fallback for empty title');
  assert(sparseTransformed.company === 'Spotify', 'Company preserved from board config');
  assert(sparseTransformed.description === '', 'Missing content yields empty string without filler');
  assert(sparseTransformed.location === undefined, 'Missing location yields undefined');
  assert(sparseTransformed.workMode === undefined, 'Missing workplaceType yields undefined workMode');
  assert(sparseTransformed.employmentType === undefined, 'Missing commitment yields undefined employmentType');
  assert(sparseTransformed.postedDate === undefined, 'Missing createdAt yields undefined postedDate');
  assert(sparseTransformed.applicationUrl === '', 'Missing URLs yield empty string');
  console.log();

  // ─── Test 4: Multi-Board Company Attribution ────────────────────────────────
  console.log('--- Test 4: Multi-Board Company Attribution ---');
  const mockData = new Map<string, LeverJobItem[]>([
    [
      'palantir',
      [
        {
          id: 'pal-1',
          text: 'Palantir Forward Deployed Engineer',
          createdAt: 1780000000000,
        },
      ],
    ],
    [
      'spotify',
      [
        {
          id: 'spot-1',
          text: 'Spotify Machine Learning Engineer',
          createdAt: 1781000000000,
        },
      ],
    ],
  ]);

  const multiBoardProvider = new MockLeverProvider([palantirBoard, spotifyBoard], mockData);
  const fetched = await multiBoardProvider.fetch();
  assert(fetched.length === 2, 'Fetched 2 jobs across 2 Lever boards');
  assert(fetched[0].company === 'Palantir' && fetched[0].id === 'pal-1', 'Palantir attribution preserved');
  assert(fetched[1].company === 'Spotify' && fetched[1].id === 'spot-1', 'Spotify attribution preserved');
  assert(fetched[0].source === 'Lever' && fetched[1].source === 'Lever', 'Both share "Lever" source identifier');
  console.log();

  // ─── Test 5: OpportunityNormalizer Pipeline Integration ─────────────────────
  console.log('--- Test 5: OpportunityNormalizer Pipeline Integration ---');
  const normalized = normalizer.normalize(transformed);

  assert(normalized.organization === 'Palantir', 'Normalized organization matches Palantir');
  assert(normalized.source === 'Lever', 'Normalized source is "Lever"');
  assert(
    normalized.sourceJobId === '6ed76ce8-4156-4b60-b120-403538bd66cd',
    'Normalized sourceJobId matches stable UUID',
  );
  assert(normalized.workMode === 'HYBRID', 'Normalized workMode matches "HYBRID"');
  assert(normalized.employmentType === 'FULL_TIME', 'Normalized employmentType matches "FULL_TIME"');
  assert(normalized.requiredSkills.includes('python'), 'Python canonicalized to lowercase "python"');
  assert(normalized.requiredSkills.includes('java'), 'Java canonicalized to lowercase "java"');
  assert(normalized.preferredSkills.includes('kubernetes'), 'Kubernetes canonicalized to lowercase "kubernetes"');
  console.log();

  // ─── Test 6: Deduplication & Idempotency Key ────────────────────────────────
  console.log('--- Test 6: Deduplication Key & Idempotency Check ---');
  const dedupKey = deduplicator.generateDeduplicationKey(normalized);
  assert(
    dedupKey.startsWith('Lever|||6ed76ce8-4156-4b60-b120-403538bd66cd'),
    'Deduplication key format matches Lever|||{UUID}',
  );
  assert(dedupKey.includes('palantir'), 'Deduplication key includes company name');
  console.log();

  // ─── Test 7: Conservative Classification & Word Boundary Rules ─────────────
  console.log('--- Test 7: Classification Rules & Word-Boundary Safety ---');

  // 7a. Positive Internships
  const positiveInternTitles = [
    'Software Engineer Intern, Fall 2026',
    'Machine Learning Internship',
    'University Co-op, Data Science',
  ];
  for (const title of positiveInternTitles) {
    const job: LeverJobItem = { id: 'int-1', text: title };
    const t = provider.transformLeverJob(job, spotifyBoard);
    const n = normalizer.normalize(t);
    assert(t.employmentType === 'INTERNSHIP', `Positive intern: "${title}" -> INTERNSHIP`);
    assert(n.type === 'INTERNSHIP', `Normalizer maps "${title}" -> OpportunityType.INTERNSHIP`);
  }

  // 7b. Positive Contracts
  const positiveContractTitles = [
    'Contract Backend Developer',
    'Temporary Android Engineer',
  ];
  for (const title of positiveContractTitles) {
    const job: LeverJobItem = { id: 'con-1', text: title };
    const t = provider.transformLeverJob(job, palantirBoard);
    const n = normalizer.normalize(t);
    assert(t.employmentType === 'CONTRACT', `Positive contract: "${title}" -> CONTRACT`);
    assert(n.employmentType === 'CONTRACT', `Normalizer maps "${title}" -> EmploymentType.CONTRACT`);
  }

  // 7c. Regression: "intern" substrings must NOT misclassify
  const regressionTitles = [
    'Senior Software Engineer, Internal Fraud Platform',
    'Software Engineer - Database Engine Internals',
    'Director, International Communications',
    'Engineering Manager, Agentic Internet & Data Insights',
  ];
  for (const title of regressionTitles) {
    const job: LeverJobItem = { id: 'reg-1', text: title };
    const t = provider.transformLeverJob(job, spotifyBoard);
    const n = normalizer.normalize(t);
    assert(
      t.employmentType === undefined,
      `Regression avoided: "${title}" is NOT classified as INTERNSHIP (undefined)`,
    );
    assert(
      n.type === 'JOB',
      `Normalizer preserves "${title}" as OpportunityType.JOB`,
    );
  }

  // 7d. Ordinary Full-Time Titles
  const ordinaryTitles = [
    'Staff Software Engineer, Data Infrastructure',
    'Senior iOS Developer',
    'Engineering Manager, Platform Reliability',
  ];
  for (const title of ordinaryTitles) {
    const job: LeverJobItem = { id: 'ord-1', text: title };
    const t = provider.transformLeverJob(job, palantirBoard);
    const n = normalizer.normalize(t);
    assert(t.employmentType === undefined, `Ordinary title "${title}" has undefined employmentType`);
    assert(n.type === 'JOB', `Normalizer maps "${title}" to OpportunityType.JOB`);
    assert(n.employmentType === 'UNKNOWN', `Normalizer maps "${title}" to EmploymentType.UNKNOWN`);
  }
  console.log();

  // ─── Test 8: Live Bounded Endpoint Validation (NO DB PERSISTENCE) ───────────
  console.log('--- Test 8: Live Bounded Endpoint Connectivity Validation ---');
  try {
    const liveProvider = new LeverProvider({
      boards: [palantirBoard, spotifyBoard],
      maxJobsPerBoard: 5, // Bounded validation check
      timeoutMs: 25000,
    });

    console.log('  Testing live connectivity to Palantir Lever board...');
    const palantirLive = await liveProvider.fetchBoard(palantirBoard);
    assert(palantirLive.length > 0, `Palantir live board responded (${palantirLive.length} sampled jobs)`);
    if (palantirLive.length > 0) {
      assert(palantirLive[0].company === 'Palantir', 'Live Palantir job has company Palantir');
      assert(Boolean(palantirLive[0].applicationUrl), 'Live Palantir job has valid applicationUrl');
      assert(Boolean(palantirLive[0].id), 'Live Palantir job has valid UUID');
    }

    console.log('  Testing live connectivity to Spotify Lever board...');
    let spotifyLive: ExternalJob[] = [];
    try {
      spotifyLive = await liveProvider.fetchBoard(spotifyBoard);
    } catch (e) {
      console.warn('  [RETRY] Spotify request timed out or failed, retrying once...');
      spotifyLive = await liveProvider.fetchBoard(spotifyBoard);
    }
    assert(spotifyLive.length > 0, `Spotify live board responded (${spotifyLive.length} sampled jobs)`);
    if (spotifyLive.length > 0) {
      assert(spotifyLive[0].company === 'Spotify', 'Live Spotify job has company Spotify');
      assert(Boolean(spotifyLive[0].applicationUrl), 'Live Spotify job has valid applicationUrl');
      assert(Boolean(spotifyLive[0].id), 'Live Spotify job has valid UUID');
    }
  } catch (error) {
    console.warn('[WARN] Live endpoint connectivity check failed:', error instanceof Error ? error.message : error);
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
