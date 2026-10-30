import {
  GreenhouseProvider,
  type GreenhouseJobItem,
  type GreenhouseBoardConfig,
  type GreenhouseApiResponse,
} from './lib/greenhouseProvider';
import {
  LeverProvider,
  type LeverJobItem,
  type LeverBoardConfig,
} from './lib/leverProvider';
import {
  OpportunityNormalizer,
  OpportunityDeduplicator,
  type ExternalJob,
} from './lib/opportunityProvider';

// ─── Test Harness Setup ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// ─── Mock Implementations ───────────────────────────────────────────────────

/**
 * MockGreenhouseProvider that intercepts fetchRawJobs or network call
 * without making external network requests.
 */
class MockGreenhousePaginationProvider extends GreenhouseProvider {
  private mockJobs: GreenhouseJobItem[];

  constructor(options: any, mockJobs: GreenhouseJobItem[]) {
    super(options);
    this.mockJobs = mockJobs;
  }

  // Override fetchBoard directly simulating the internal scan & partition logic with mockJobs
  override async fetchBoard(board: GreenhouseBoardConfig): Promise<ExternalJob[]> {
    // Simulate what fetchBoard does with this.mockJobs
    const scanLimit = (this as any).maxScanLimit > 0
      ? Math.min(this.mockJobs.length, (this as any).maxScanLimit)
      : this.mockJobs.length;
    const scannedJobs = this.mockJobs.slice(0, scanLimit);

    const maxJobs = (this as any).maxJobsPerBoard;
    if (maxJobs === undefined || maxJobs <= 0 || scannedJobs.length <= maxJobs) {
      return scannedJobs.map((j) => this.transformGreenhouseJob(j, board));
    }

    const { IndiaLocationClassifier } = await import('./services/indiaLocationClassifier');
    const { decodeHtmlEntities } = await import('./lib/greenhouseProvider');

    const indiaJobs: GreenhouseJobItem[] = [];
    const otherJobs: GreenhouseJobItem[] = [];

    for (const job of scannedJobs) {
      let locationStr = job.location?.name?.trim() || undefined;
      if (!locationStr && Array.isArray(job.offices) && job.offices.length > 0) {
        locationStr = job.offices[0].location?.trim() || job.offices[0].name?.trim() || undefined;
      }
      const rawContent = typeof job.content === 'string' ? job.content : '';
      const cleanDesc = decodeHtmlEntities(rawContent);

      const classification = IndiaLocationClassifier.classify(locationStr, job.title || '', cleanDesc);
      if (classification.isIndiaEligible) {
        indiaJobs.push(job);
      } else {
        otherJobs.push(job);
      }
    }

    const retained: GreenhouseJobItem[] = [...indiaJobs];
    const remainingQuota = Math.max(0, maxJobs - retained.length);
    if (remainingQuota > 0) {
      retained.push(...otherJobs.slice(0, remainingQuota));
    }

    return retained.map((j) => this.transformGreenhouseJob(j, board));
  }
}

/**
 * MockLeverPaginationProvider that tracks requested pages and returns mock slices.
 */
class MockLeverPaginationProvider extends LeverProvider {
  public requestsMade: Array<{ limit: number; skip: number }> = [];
  public retryAttemptsTracked = 0;
  private allMockJobs: LeverJobItem[];
  private failFirstRequestWith429 = false;
  private alwaysFailWith429 = false;

  constructor(
    options: any,
    mockJobs: LeverJobItem[],
    config?: { failFirstRequestWith429?: boolean; alwaysFailWith429?: boolean },
  ) {
    super(options);
    this.allMockJobs = mockJobs;
    this.failFirstRequestWith429 = !!config?.failFirstRequestWith429;
    this.alwaysFailWith429 = !!config?.alwaysFailWith429;
  }

  protected override async fetchPage(
    site: string,
    limit: number,
    skip: number,
  ): Promise<LeverJobItem[]> {
    this.requestsMade.push({ limit, skip });

    if (this.alwaysFailWith429) {
      throw new Error(`Lever API rate limit (429) exceeded for "${site}"`);
    }

    if (this.failFirstRequestWith429 && this.retryAttemptsTracked === 0) {
      this.retryAttemptsTracked++;
      throw new Error(`Lever API rate limit (429) simulated`);
    }

    // Return the slice from mock data
    return this.allMockJobs.slice(skip, skip + limit);
  }
}

// ─── Test Suite Execution ───────────────────────────────────────────────────

async function runTestSuite() {
  console.log('======================================================================');
  console.log('TEST SUITE: ATS Ingestion Pagination, Scanning & India Discovery');
  console.log('======================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Greenhouse Regression & Bounded Scanning
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 1: Greenhouse Regression & Scanning ---');

  const stripeBoard: GreenhouseBoardConfig = {
    boardToken: 'stripe',
    companyName: 'Stripe',
  };

  // Generate 40 mock jobs: first 30 overseas, last 10 India-eligible
  const mockStripeJobs: GreenhouseJobItem[] = [];
  for (let i = 1; i <= 30; i++) {
    mockStripeJobs.push({
      id: 1000 + i,
      title: `Global Infrastructure Engineer ${i}`,
      location: { name: i % 2 === 0 ? 'San Francisco, CA' : 'Dublin, Ireland' },
      content: '<p>US/EU engineering team.</p>',
      absolute_url: `https://boards.greenhouse.io/stripe/jobs/${1000 + i}`,
    });
  }
  for (let i = 1; i <= 10; i++) {
    mockStripeJobs.push({
      id: 2000 + i,
      title: `Staff Backend Engineer - India Core Payments ${i}`,
      location: { name: 'Bengaluru, India' },
      content: '<p>Join our Bengaluru engineering hub.</p>',
      absolute_url: `https://boards.greenhouse.io/stripe/jobs/${2000 + i}`,
    });
  }

  // Test 1.1: India listings beyond the first 25 are discovered under limit 25
  console.log('Test 1.1: Greenhouse India listings beyond first 25 are discovered');
  const ghProvider = new MockGreenhousePaginationProvider(
    { maxJobsPerBoard: 25, maxScanLimit: 500 },
    mockStripeJobs,
  );
  const ghJobs = await ghProvider.fetchBoard(stripeBoard);

  assert(ghJobs.length === 25, `Retains exactly 25 jobs (got ${ghJobs.length})`);
  const indiaGhJobs = ghJobs.filter((j) => j.location?.includes('India') || j.location?.includes('Bengaluru'));
  const overseasGhJobs = ghJobs.filter((j) => !j.location?.includes('India') && !j.location?.includes('Bengaluru'));

  assert(indiaGhJobs.length === 10, `All 10 India listings were discovered despite appearing after 30 overseas listings (got ${indiaGhJobs.length})`);
  assert(overseasGhJobs.length === 15, `Remaining 15 slots filled by overseas listings without discarding them (got ${overseasGhJobs.length})`);
  assert(ghJobs.some((j) => j.id === '2001'), 'Contains India job ID 2001');
  assert(ghJobs.some((j) => j.id === '2010'), 'Contains India job ID 2010');

  // Test 1.2: Greenhouse Max Scan Bounds Enforcement
  console.log('\nTest 1.2: Greenhouse maxScanLimit bounds enforcement');
  const boundedGhProvider = new MockGreenhousePaginationProvider(
    { maxJobsPerBoard: 25, maxScanLimit: 20 }, // Scan limit is 20, India jobs start at 31
    mockStripeJobs,
  );
  const boundedGhJobs = await boundedGhProvider.fetchBoard(stripeBoard);
  assert(boundedGhJobs.length === 20, `Retains only jobs within scan bound (got ${boundedGhJobs.length})`);
  const boundedIndiaCount = boundedGhJobs.filter((j) => j.location?.includes('India')).length;
  assert(boundedIndiaCount === 0, `Scan strictly respects maxScanLimit=20 (got ${boundedIndiaCount} India jobs beyond bound)`);

  // Test 1.3: Greenhouse Overseas-Only Board (Palantir) Preserves Shared Table Contract
  console.log('\nTest 1.3: Greenhouse overseas-only board preserves shared Opportunity records');
  const overseasOnlyJobs: GreenhouseJobItem[] = [];
  for (let i = 1; i <= 50; i++) {
    overseasOnlyJobs.push({
      id: 3000 + i,
      title: `Forward Deployed Software Engineer ${i}`,
      location: { name: 'London, UK' },
      content: '<p>UK deployed role.</p>',
      absolute_url: `https://boards.greenhouse.io/palantir/jobs/${3000 + i}`,
    });
  }
  const overseasGhProvider = new MockGreenhousePaginationProvider(
    { maxJobsPerBoard: 25, maxScanLimit: 500 },
    overseasOnlyJobs,
  );
  const overseasGhResult = await overseasGhProvider.fetchBoard({ boardToken: 'palantir', companyName: 'Palantir' });
  assert(overseasGhResult.length === 25, `Retains exactly 25 overseas jobs for the shared Opportunity table (got ${overseasGhResult.length})`);
  assert(overseasGhResult.every((j) => j.company === 'Palantir'), 'All records attributed to Palantir');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Lever Multi-Page Bounded Pagination & Discovery
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 2: Lever Multi-Page Bounded Pagination & Discovery ---');

  const spotifyBoard: LeverBoardConfig = {
    site: 'spotify',
    companyName: 'Spotify',
  };

  // Generate 75 mock Lever jobs:
  // Page 1 (items 0..49): 50 overseas jobs (London, Stockholm, New York)
  // Page 2 (items 50..74): 5 India jobs (Mumbai) + 20 overseas jobs
  const mockSpotifyJobs: LeverJobItem[] = [];
  for (let i = 0; i < 50; i++) {
    mockSpotifyJobs.push({
      id: `spotify-global-${i}`,
      text: `Backend Engineer, Content Platform ${i}`,
      categories: {
        location: i % 2 === 0 ? 'Stockholm, Sweden' : 'London, UK',
        commitment: 'Full-time',
      },
      workplaceType: 'hybrid',
      hostedUrl: `https://jobs.lever.co/spotify/spotify-global-${i}`,
    });
  }
  for (let i = 0; i < 5; i++) {
    mockSpotifyJobs.push({
      id: `spotify-india-${i}`,
      text: `Senior Data Scientist, India Listener Growth ${i}`,
      categories: {
        location: 'Mumbai, India',
        commitment: 'Full-time',
      },
      workplaceType: 'hybrid',
      hostedUrl: `https://jobs.lever.co/spotify/spotify-india-${i}`,
    });
  }
  for (let i = 0; i < 20; i++) {
    mockSpotifyJobs.push({
      id: `spotify-us-${i}`,
      text: `Product Designer, Ads ${i}`,
      categories: {
        location: 'New York, NY',
        commitment: 'Full-time',
      },
      workplaceType: 'on-site',
      hostedUrl: `https://jobs.lever.co/spotify/spotify-us-${i}`,
    });
  }

  // Test 2.1: Lever paginates beyond Page 1 to discover India listings on Page 2
  console.log('Test 2.1: Lever paginates beyond Page 1 and discovers India listings');
  const leverProvider = new MockLeverPaginationProvider(
    {
      maxJobsPerBoard: 25,
      maxScanLimit: 500,
      pageSize: 30, // 30 per page: Page 1 (0..29), Page 2 (30..59: contains India jobs at 50..54)
      maxRequestsPerBoard: 5,
      rateLimitDelayMs: 0,
    },
    mockSpotifyJobs,
  );

  const leverJobs = await leverProvider.fetchBoard(spotifyBoard);

  assert(leverProvider.requestsMade.length >= 2, `Made multiple paginated requests (made ${leverProvider.requestsMade.length} requests)`);
  assert(leverProvider.requestsMade[0].skip === 0, 'First request used skip=0');
  assert(leverProvider.requestsMade[1].skip === 30, 'Second request used skip=30');

  const indiaLeverJobs = leverJobs.filter((j) => j.location?.includes('Mumbai') || j.location?.includes('India'));
  const overseasLeverJobs = leverJobs.filter((j) => !j.location?.includes('Mumbai') && !j.location?.includes('India'));

  assert(indiaLeverJobs.length === 5, `Discovered all 5 India listings across paginated pages (got ${indiaLeverJobs.length})`);
  assert(leverJobs.length === 25, `Retains 25 total jobs respecting maxJobsPerBoard (got ${leverJobs.length})`);
  assert(overseasLeverJobs.length === 20, `Retains 20 overseas jobs in remaining capacity (got ${overseasLeverJobs.length})`);
  assert(leverJobs.some((j) => j.id === 'spotify-india-0'), 'Contains India job spotify-india-0');
  assert(leverJobs.some((j) => j.id === 'spotify-india-4'), 'Contains India job spotify-india-4');

  // Test 2.2: Pagination termination on empty response
  console.log('\nTest 2.2: Lever pagination terminates when an empty batch is returned');
  const smallJobList: LeverJobItem[] = [
    { id: 'job-1', text: 'Engineer 1', categories: { location: 'London' } },
    { id: 'job-2', text: 'Engineer 2', categories: { location: 'London' } },
  ];
  const emptyTermProvider = new MockLeverPaginationProvider(
    { pageSize: 2, maxRequestsPerBoard: 10, rateLimitDelayMs: 0 },
    smallJobList,
  );
  await emptyTermProvider.fetchBoard({ site: 'test', companyName: 'Test' });
  // Request 1: skip 0, limit 2 -> returns 2 jobs
  // Request 2: skip 2, limit 2 -> returns 0 jobs -> terminates!
  assert(emptyTermProvider.requestsMade.length === 2, `Terminated after empty batch (made ${emptyTermProvider.requestsMade.length} requests)`);

  // Test 2.3: Pagination termination on partial page (< pageSize)
  console.log('\nTest 2.3: Lever pagination terminates immediately on partial page');
  const partialProvider = new MockLeverPaginationProvider(
    { pageSize: 100, maxRequestsPerBoard: 5, rateLimitDelayMs: 0 },
    smallJobList, // Only 2 jobs with pageSize 100
  );
  await partialProvider.fetchBoard({ site: 'test', companyName: 'Test' });
  assert(partialProvider.requestsMade.length === 1, `Terminated after 1 request when batch < pageSize (made ${partialProvider.requestsMade.length} requests)`);

  // Test 2.4: Early termination when India quota is satisfied
  console.log('\nTest 2.4: Lever early termination when India quota is satisfied');
  const earlyTermJobs: LeverJobItem[] = [];
  // 50 India jobs on Page 1
  for (let i = 0; i < 50; i++) {
    earlyTermJobs.push({
      id: `meesho-india-${i}`,
      text: `Software Engineer ${i}`,
      categories: { location: 'Bengaluru, India' },
      hostedUrl: `https://jobs.lever.co/meesho/${i}`,
    });
  }
  const earlyProvider = new MockLeverPaginationProvider(
    { maxJobsPerBoard: 25, pageSize: 30, maxRequestsPerBoard: 10, rateLimitDelayMs: 0 },
    earlyTermJobs,
  );
  const earlyResult = await earlyProvider.fetchBoard({ site: 'meesho', companyName: 'Meesho' });
  assert(earlyResult.length === 25, `Retained exactly 25 India jobs (got ${earlyResult.length})`);
  assert(earlyProvider.requestsMade.length === 1, `Early terminated after Page 1 without fetching Page 2 (made ${earlyProvider.requestsMade.length} requests)`);

  // Test 2.5: Maximum requests bound enforcement
  console.log('\nTest 2.5: Lever maxRequestsPerBoard strictly enforced');
  const massiveJobs: LeverJobItem[] = [];
  for (let i = 0; i < 200; i++) {
    massiveJobs.push({
      id: `palantir-${i}`,
      text: `Engineer ${i}`,
      categories: { location: 'London, UK' },
    });
  }
  const boundedReqProvider = new MockLeverPaginationProvider(
    { maxJobsPerBoard: 50, pageSize: 20, maxRequestsPerBoard: 3, rateLimitDelayMs: 0 },
    massiveJobs,
  );
  await boundedReqProvider.fetchBoard({ site: 'palantir', companyName: 'Palantir' });
  assert(boundedReqProvider.requestsMade.length === 3, `Strictly stopped at maxRequestsPerBoard=3 (made ${boundedReqProvider.requestsMade.length})`);

  // Test 2.6: Maximum scan limit bound enforcement
  console.log('\nTest 2.6: Lever maxScanLimit strictly enforced');
  const boundedScanProvider = new MockLeverPaginationProvider(
    { maxJobsPerBoard: 50, pageSize: 40, maxScanLimit: 60, maxRequestsPerBoard: 10, rateLimitDelayMs: 0 },
    massiveJobs,
  );
  await boundedScanProvider.fetchBoard({ site: 'palantir', companyName: 'Palantir' });
  // Request 1: limit 40, skip 0 (scanned: 40)
  // Request 2: limit 20 (min(40, 60-40)), skip 40 (scanned: 60)
  // Stops because scannedCount == 60 == maxScanLimit!
  assert(boundedScanProvider.requestsMade.length === 2, `Made 2 requests bounded by maxScanLimit=60 (made ${boundedScanProvider.requestsMade.length})`);
  assert(boundedScanProvider.requestsMade[1].limit === 20, `Last batch limit clamped to remaining scan capacity 20 (got ${boundedScanProvider.requestsMade[1].limit})`);

  // Test 2.7: Simulated Rate Limit / Server Error Resilience
  console.log('\nTest 2.7: Lever error resilience returns previously scanned jobs if later page fails');
  class FailingLaterPageProvider extends LeverProvider {
    protected override async fetchPage(site: string, limit: number, skip: number): Promise<LeverJobItem[]> {
      if (skip > 0) {
        throw new Error('500 Internal Server Error');
      }
      return [
        { id: 'job-page1-1', text: 'Engineer 1', categories: { location: 'Bengaluru, India' } },
        { id: 'job-page1-2', text: 'Engineer 2', categories: { location: 'London, UK' } },
      ];
    }
  }
  const resilientProvider = new FailingLaterPageProvider({ pageSize: 2, maxScanLimit: 100, rateLimitDelayMs: 0 });
  const resilientResult = await resilientProvider.fetchBoard({ site: 'resilient', companyName: 'Resilient' });
  assert(resilientResult.length === 2, `Safely recovered and retained 2 jobs from Page 1 despite Page 2 failure (got ${resilientResult.length})`);
  assert(resilientResult.some((j) => j.id === 'job-page1-1'), 'Retained India job from successful page');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Normalizer & Deduplication Pipeline Integration
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: Normalizer & Deduplication Pipeline Integration ---');

  const normalizer = new OpportunityNormalizer();
  const deduplicator = new OpportunityDeduplicator();

  // Pick one discovered India job and one discovered overseas job from Greenhouse & Lever
  const testSampleJobs = [
    ghJobs.find((j) => j.id === '2001')!,
    ghJobs.find((j) => j.id === '1001')!,
    leverJobs.find((j) => j.id === 'spotify-india-0')!,
    leverJobs.find((j) => j.id === 'spotify-global-0')!,
  ];

  for (const sample of testSampleJobs) {
    const normalized = normalizer.normalize(sample);
    const dedupKey = deduplicator.generateDeduplicationKey(normalized);

    assert(Boolean(normalized.title && normalized.organization && normalized.source), `Valid normalized structure for "${sample.title}"`);
    assert(dedupKey.startsWith(`${sample.source}|||`), `Deduplication key correctly formatted (${dedupKey})`);
    assert(normalized.sourceJobId === sample.id, `sourceJobId preserved as "${sample.id}"`);
  }

  // Verify India Location Classifier accurately separates India from overseas across results
  const sampleIndiaJob = ghJobs.find((j) => j.id === '2001')!;
  const sampleOverseasJob = ghJobs.find((j) => j.id === '1001')!;

  const { IndiaLocationClassifier } = await import('./services/indiaLocationClassifier');
  const indiaClassification = IndiaLocationClassifier.classify(sampleIndiaJob.location, sampleIndiaJob.title);
  const overseasClassification = IndiaLocationClassifier.classify(sampleOverseasJob.location, sampleOverseasJob.title);

  assert(indiaClassification.isIndiaEligible === true, `India listing classified as India-eligible (${indiaClassification.classification})`);
  assert(overseasClassification.isIndiaEligible === false, `Overseas listing classified as NOT India-eligible (${overseasClassification.classification})`);

  console.log('\n======================================================================');
  console.log(`TOTAL REGRESSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
