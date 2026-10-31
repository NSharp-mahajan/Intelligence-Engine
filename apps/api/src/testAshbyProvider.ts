import {
  AshbyProvider,
  type AshbyJobItem,
  type AshbyBoardConfig,
  type AshbyApiResponse,
} from './lib/ashbyProvider';
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

class MockAshbyProvider extends AshbyProvider {
  private mockPayloads: Map<string, AshbyJobItem[] | Error>;

  constructor(
    options: any,
    mockPayloads: Map<string, AshbyJobItem[] | Error>,
  ) {
    super(options);
    this.mockPayloads = mockPayloads;
  }

  protected override async fetchRawJobs(board: AshbyBoardConfig, signal?: AbortSignal): Promise<AshbyJobItem[]> {
    if (signal?.aborted) {
      throw new Error(`[MockAshbyProvider] Aborted for "${board.boardToken}"`);
    }
    const payload = this.mockPayloads.get(board.boardToken);
    if (!payload) {
      return [];
    }
    if (payload instanceof Error) {
      throw payload;
    }
    return payload;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Test Suite: AshbyProvider Implementation & Regression ===\n');

  // Test 1: Field Normalization, Skills Extraction, and Valid HTTP/HTTPS URLs
  console.log('Test 1: Field Normalization, Skills Extraction, and Valid HTTP/HTTPS URLs');
  {
    const sampleJob: AshbyJobItem = {
      id: 'ashby-job-001',
      title: 'Full Stack AI Engineer (React, TypeScript & Python)',
      department: 'Engineering',
      team: 'Core Platform',
      employmentType: 'FullTime',
      location: 'Bengaluru, Karnataka',
      isListed: true,
      workplaceType: 'Hybrid',
      publishedAt: '2026-10-25T10:30:00.000Z',
      jobUrl: 'https://jobs.ashbyhq.com/sarvam/ashby-job-001',
      applyUrl: 'https://jobs.ashbyhq.com/sarvam/ashby-job-001/application',
      descriptionHtml: '<p>We are seeking an engineer skilled in &lt;React&gt;, TypeScript, Node.js, and PostgreSQL &amp; Docker.</p>',
    };

    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const provider = new AshbyProvider({ boards: [board] });
    const transformed = provider.transformAshbyJob(sampleJob, board);

    assert(transformed.id === 'ashby-job-001', 'Maps Ashby job id correctly');
    assert(transformed.company === 'Sarvam AI', 'Maps company name correctly');
    assert(transformed.source === 'Ashby', 'Sets source to "Ashby"');
    assert(transformed.workMode === 'HYBRID', 'Maps workplaceType "Hybrid" to HYBRID workMode');
    assert(transformed.employmentType === 'FULL_TIME', 'Maps employmentType "FullTime" to FULL_TIME');
    assert(transformed.postedDate === '2026-10-25T10:30:00.000Z', 'Maps publishedAt to postedDate');
    assert(transformed.applicationUrl === 'https://jobs.ashbyhq.com/sarvam/ashby-job-001/application', 'Prefers direct applyUrl');
    assert(transformed.sourceUrl === 'https://jobs.ashbyhq.com/sarvam/ashby-job-001', 'Maps sourceUrl to jobUrl');
    assert(transformed.description.includes('<React>') && transformed.description.includes('& Docker'), 'Decodes HTML entities in description');
    assert(transformed.requiredSkills?.includes('React') === true, 'Extracts "React" skill');
    assert(transformed.requiredSkills?.includes('TypeScript') === true, 'Extracts "TypeScript" skill');
    assert(transformed.requiredSkills?.includes('Python') === true, 'Extracts "Python" skill');
  }

  // Test 1b: URL Scheme Validation (rejects javascript:, mailto:, ftp:)
  console.log('\nTest 1b: URL Scheme Validation (Reject non-HTTP/HTTPS)');
  {
    const badUrlJob: AshbyJobItem = {
      id: 'ashby-job-bad-url',
      title: 'Security Researcher',
      applyUrl: 'javascript:alert(1)',
      jobUrl: 'ftp://files.example.com/job',
    };
    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const provider = new AshbyProvider({ boards: [board] });
    const transformed = provider.transformAshbyJob(badUrlJob, board);

    assert(transformed.applicationUrl === '', 'Rejects javascript: applicationUrl and falls back to empty string');
    assert(transformed.sourceUrl === undefined, 'Rejects ftp: sourceUrl and sets undefined');
  }

  // Test 2: Correct Employment-Type Classification (GET, Fresher, Graduate Engineer, Intern, Co-op)
  console.log('\nTest 2: Correct Employment-Type Classification (GET, Fresher, Graduate Engineer, Intern, Co-op)');
  {
    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const provider = new AshbyProvider({ boards: [board] });

    // 2a: Graduate Engineer Trainee with no employmentType evidence -> undefined (not INTERNSHIP, not FULL_TIME)
    const getNoEvidence: AshbyJobItem = { id: 'get-1', title: 'Graduate Engineer Trainee - Backend' };
    const tGetNoEv = provider.transformAshbyJob(getNoEvidence, board);
    assert(tGetNoEv.employmentType === undefined, 'GET with no source evidence does not infer INTERNSHIP or FULL_TIME');

    // 2b: GET with employmentType: FullTime -> FULL_TIME
    const getFullTime: AshbyJobItem = { id: 'get-2', title: 'Graduate Engineer Trainee', employmentType: 'FullTime' };
    const tGetFT = provider.transformAshbyJob(getFullTime, board);
    assert(tGetFT.employmentType === 'FULL_TIME', 'GET with employmentType FullTime maps to FULL_TIME');

    // 2c: Fresher with no evidence -> undefined
    const fresherNoEv: AshbyJobItem = { id: 'fr-1', title: 'Fresher Software Engineer' };
    const tFrNoEv = provider.transformAshbyJob(fresherNoEv, board);
    assert(tFrNoEv.employmentType === undefined, 'Fresher with no source evidence does not infer INTERNSHIP');

    // 2d: Fresher with employmentType FullTime -> FULL_TIME
    const fresherFT: AshbyJobItem = { id: 'fr-2', title: 'Fresher Software Engineer', employmentType: 'FullTime' };
    const tFrFT = provider.transformAshbyJob(fresherFT, board);
    assert(tFrFT.employmentType === 'FULL_TIME', 'Fresher with FullTime source evidence maps to FULL_TIME');

    // 2e: Graduate Engineer with no evidence -> undefined
    const gradEngNoEv: AshbyJobItem = { id: 'ge-1', title: 'Graduate Engineer' };
    const tGeNoEv = provider.transformAshbyJob(gradEngNoEv, board);
    assert(tGeNoEv.employmentType === undefined, 'Graduate Engineer with no source evidence does not infer INTERNSHIP');

    // 2f: Campus Hire with no evidence -> undefined
    const campusHireNoEv: AshbyJobItem = { id: 'ch-1', title: 'Campus Hire - Engineering' };
    const tChNoEv = provider.transformAshbyJob(campusHireNoEv, board);
    assert(tChNoEv.employmentType === undefined, 'Campus Hire with no source evidence does not infer INTERNSHIP');

    // 2g: Actual Intern -> INTERNSHIP
    const internJob: AshbyJobItem = { id: 'int-1', title: 'AI Research Intern', employmentType: 'Intern' };
    const tIntern = provider.transformAshbyJob(internJob, board);
    assert(tIntern.employmentType === 'INTERNSHIP', 'Intern maps to INTERNSHIP');

    // 2h: Summer Internship -> INTERNSHIP
    const summerInternJob: AshbyJobItem = { id: 'int-2', title: 'Summer Internship 2027' };
    const tSummerIntern = provider.transformAshbyJob(summerInternJob, board);
    assert(tSummerIntern.employmentType === 'INTERNSHIP', 'Summer Internship in title maps to INTERNSHIP');

    // 2i: Co-op -> INTERNSHIP
    const coopJob: AshbyJobItem = { id: 'coop-1', title: 'Software Engineering Co-op', employmentType: 'CoOp' };
    const tCoop = provider.transformAshbyJob(coopJob, board);
    assert(tCoop.employmentType === 'INTERNSHIP', 'Co-op maps to INTERNSHIP');
  }

  // Test 3: Ashby Secondary-Location Classification & Preservation
  console.log('\nTest 3: Ashby Secondary-Location Classification & Preservation');
  {
    // Primary is overseas, secondary contains Bengaluru, Karnataka, India
    const multiLocJob: AshbyJobItem = {
      id: 'ashby-multi-loc-1',
      title: 'Distributed Systems Engineer',
      location: 'San Francisco, CA',
      secondaryLocations: ['London, UK', 'Bengaluru, Karnataka, India'],
      publishedAt: '2026-10-28T10:00:00.000Z',
      isListed: true,
    };

    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const mockMap = new Map<string, AshbyJobItem[]>([['sarvam', [multiLocJob]]]);
    const provider = new MockAshbyProvider({ boards: [board] }, mockMap);

    const results = await provider.fetchBoard(board);
    assert(results.length === 1, 'Discovers and retains job with India secondary location');
    const transformed = results[0];
    assert(
      Boolean(
        transformed.location?.includes('San Francisco, CA') &&
        transformed.location?.includes('London, UK') &&
        transformed.location?.includes('Bengaluru, Karnataka, India'),
      ),
      'Preserves accurate primary and all secondary locations in location string',
    );
  }

  // Test 4: Deterministic Job Retention (Newest First, Missing Date Fallback, Tie Breaking)
  console.log('\nTest 4: Deterministic Job Retention (Newest First, Missing Date Fallback, Tie Breaking)');
  {
    const jobs: AshbyJobItem[] = [
      { id: 'ind-old', title: 'India Engineer Old', location: 'Bengaluru, India', publishedAt: '2026-10-01T00:00:00.000Z', isListed: true },
      { id: 'ind-missing-date-b', title: 'India Engineer No Date B', location: 'Bengaluru, India', isListed: true },
      { id: 'ind-newest', title: 'India Engineer Newest', location: 'Bengaluru, India', publishedAt: '2026-10-30T00:00:00.000Z', isListed: true },
      { id: 'ind-mid', title: 'India Engineer Mid', location: 'Bengaluru, India', publishedAt: '2026-10-15T00:00:00.000Z', isListed: true },
      { id: 'ind-missing-date-a', title: 'India Engineer No Date A', location: 'Bengaluru, India', isListed: true },
    ];

    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const mockMap = new Map<string, AshbyJobItem[]>([['sarvam', jobs]]);
    const provider = new MockAshbyProvider({ boards: [board], maxJobsPerBoard: 10 }, mockMap);

    const results = await provider.fetchBoard(board);
    assert(results[0].id === 'ind-newest', 'First retained job is ind-newest (2026-10-30)');
    assert(results[1].id === 'ind-mid', 'Second retained job is ind-mid (2026-10-15)');
    assert(results[2].id === 'ind-old', 'Third retained job is ind-old (2026-10-01)');
    assert(results[3].id === 'ind-missing-date-a', 'Fourth retained job is ind-missing-date-a (stably sorted by ID)');
    assert(results[4].id === 'ind-missing-date-b', 'Fifth retained job is ind-missing-date-b (stably sorted by ID)');
  }

  // Test 5: India-First Discovery with Deep Listings (26 Overseas, 3 India)
  console.log('\nTest 5: India-First Discovery with Deep Listings (26 Overseas, 3 India)');
  {
    const mockJobs: AshbyJobItem[] = [];

    for (let i = 0; i < 26; i++) {
      mockJobs.push({
        id: `overseas-${String(i).padStart(2, '0')}`,
        title: `Software Engineer - US Role ${i}`,
        location: i % 2 === 0 ? 'San Francisco, CA' : 'London, United Kingdom',
        workplaceType: 'OnSite',
        employmentType: 'FullTime',
        publishedAt: '2026-10-20T00:00:00.000Z',
        isListed: true,
      });
    }

    mockJobs.push({
      id: 'india-001',
      title: 'Senior Backend Engineer',
      location: 'Bengaluru, India',
      workplaceType: 'Hybrid',
      employmentType: 'FullTime',
      publishedAt: '2026-10-28T00:00:00.000Z',
      isListed: true,
    });

    mockJobs.push({
      id: 'india-002',
      title: 'AI Research Scientist',
      location: 'Hyderabad, India',
      workplaceType: 'OnSite',
      employmentType: 'FullTime',
      publishedAt: '2026-10-27T00:00:00.000Z',
      isListed: true,
    });

    mockJobs.push({
      id: 'india-003',
      title: 'Frontend Engineer (Early Career)',
      location: 'Pune, Maharashtra',
      workplaceType: 'Remote',
      employmentType: 'FullTime',
      publishedAt: '2026-10-26T00:00:00.000Z',
      isListed: true,
    });

    const mockMap = new Map<string, AshbyJobItem[]>([['sarvam', mockJobs]]);
    const provider = new MockAshbyProvider(
      {
        boards: [{ boardToken: 'sarvam', companyName: 'Sarvam AI' }],
        maxJobsPerBoard: 25,
        maxScanLimit: 500,
      },
      mockMap,
    );

    const results = await provider.fetchBoard({ boardToken: 'sarvam', companyName: 'Sarvam AI' });

    assert(results.length === 25, `Retains exactly maxJobsPerBoard (25) opportunities (actual: ${results.length})`);

    const indiaResults = results.filter((j) => {
      const loc = (j.location || '').toLowerCase();
      return loc.includes('bengaluru') || loc.includes('hyderabad') || loc.includes('pune');
    });

    assert(indiaResults.length === 3, `Discovers and retains all 3 India jobs appearing after 26 overseas jobs (actual: ${indiaResults.length})`);
    assert(results[0].id === 'india-001', 'India job with newest date is placed first');
    assert(results[1].id === 'india-002', 'India job with second newest date is placed second');
    assert(results[2].id === 'india-003', 'India job with third newest date is placed third');
  }

  // Test 6: Provider Failure Reporting (Total Failure Throws, Partial Failure Exposes Failed Sources)
  console.log('\nTest 6: Provider Failure Reporting (Total Failure vs Partial Failure)');
  {
    const boardA: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const boardB: AshbyBoardConfig = { boardToken: 'failing-board', companyName: 'Failing Corp' };

    // 6a: Partial failure (1 succeeds, 1 fails) -> returns successful jobs, exposes failedSources in stats
    const mockMapPartial = new Map<string, AshbyJobItem[] | Error>([
      ['sarvam', [{ id: 'sarvam-1', title: 'Sarvam Engineer', isListed: true }]],
      ['failing-board', new Error('500 Internal Server Error')],
    ]);

    const providerPartial = new MockAshbyProvider({ boards: [boardA, boardB] }, mockMapPartial);
    const jobs = await providerPartial.fetch();
    assert(jobs.length === 1 && jobs[0].id === 'sarvam-1', 'Partial failure returns jobs from succeeding board');
    const stats = providerPartial.getLastFetchStats();
    assert(stats.successfulSources.includes('sarvam'), 'Stats track sarvam as successful source');
    assert(stats.failedSources.some((f) => f.source === 'failing-board'), 'Stats track failing-board in failedSources');

    // 6b: Total failure (all boards fail) -> throws Error with failure details
    const mockMapTotal = new Map<string, AshbyJobItem[] | Error>([
      ['sarvam', new Error('DNS resolution failure')],
      ['failing-board', new Error('500 Internal Server Error')],
    ]);

    const providerTotal = new MockAshbyProvider({ boards: [boardA, boardB] }, mockMapTotal);
    let threw = false;
    try {
      await providerTotal.fetch();
    } catch (err) {
      threw = true;
      assert(
        err instanceof Error && err.message.includes('All 2 configured Ashby boards failed'),
        `Throws descriptive error on total failure: ${err instanceof Error ? err.message : err}`,
      );
    }
    assert(threw, 'Total source failure propagates error instead of returning empty array');
  }

  // Test 7: Cancellation Propagation via AbortSignal
  console.log('\nTest 7: Cancellation Propagation via AbortSignal');
  {
    const board: AshbyBoardConfig = { boardToken: 'sarvam', companyName: 'Sarvam AI' };
    const mockMap = new Map<string, AshbyJobItem[]>([['sarvam', [{ id: 'j-1', title: 'Job 1', isListed: true }]]]);
    const provider = new MockAshbyProvider({ boards: [board] }, mockMap);

    const abortController = new AbortController();
    abortController.abort(new Error('Pre-aborted signal'));

    let threwAbort = false;
    try {
      await provider.fetch(abortController.signal);
    } catch (err) {
      threwAbort = true;
    }
    assert(threwAbort, 'fetch(signal) rejects immediately when AbortSignal is aborted');
  }

  // Test 8: Normalizer & Deduplicator Integration
  console.log('\nTest 8: Normalizer & Deduplicator Integration');
  {
    const rawExternalJob: ExternalJob = {
      id: 'ashby-dedup-1',
      title: 'Junior Machine Learning Engineer',
      company: 'Sarvam AI',
      description: 'Looking for a junior engineer to train LLMs using PyTorch and Python in Bengaluru.',
      location: 'Bengaluru, India',
      workMode: 'ONSITE',
      employmentType: 'FULL_TIME',
      applicationUrl: 'https://jobs.ashbyhq.com/sarvam/ashby-dedup-1/application',
      sourceUrl: 'https://jobs.ashbyhq.com/sarvam/ashby-dedup-1',
      source: 'Ashby',
      postedDate: '2026-10-28T12:00:00.000Z',
      requiredSkills: ['python', 'pytorch'],
    };

    const normalizer = new OpportunityNormalizer();
    const normalized = normalizer.normalize(rawExternalJob);

    assert(normalized.title === 'Junior Machine Learning Engineer', 'Preserves title');
    assert(normalized.organization === 'Sarvam AI', 'Maps company to organization');
    assert(normalized.source === 'Ashby', 'Preserves source "Ashby"');
    assert(normalized.sourceJobId === 'ashby-dedup-1', 'Maps id to sourceJobId');
    assert(normalized.workMode === 'ONSITE', 'Preserves ONSITE workMode');

    const deduplicator = new OpportunityDeduplicator();
    const deduplicationKey = deduplicator.generateDeduplicationKey(normalized);
    assert(typeof deduplicationKey === 'string' && deduplicationKey.length > 0, `Generates valid deduplication key: ${deduplicationKey}`);
  }

  // Summary
  console.log(`\nAshbyProvider Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
