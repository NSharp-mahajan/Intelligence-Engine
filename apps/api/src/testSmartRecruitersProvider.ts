import {
  SmartRecruitersProvider,
  buildSmartRecruitersFullDescription,
  type SmartRecruitersJobItem,
  type SmartRecruitersPostingDetail,
  type SmartRecruitersCompanyConfig,
  type SmartRecruitersApiResponse,
} from './lib/smartRecruitersProvider';
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

class MockSmartRecruitersProvider extends SmartRecruitersProvider {
  public mockPages: Map<string, (offset: number, limit: number) => SmartRecruitersApiResponse | Error> = new Map();
  public mockDetails: Map<string, SmartRecruitersPostingDetail | null> = new Map();
  public pageFetchLog: Array<{ company: string; offset: number; limit: number }> = [];

  protected override async fetchPage(
    companyIdentifier: string,
    limit: number,
    offset: number,
    signal?: AbortSignal,
  ): Promise<SmartRecruitersApiResponse> {
    if (signal?.aborted) {
      throw new Error(`[MockSmartRecruitersProvider] Aborted for "${companyIdentifier}"`);
    }
    this.pageFetchLog.push({ company: companyIdentifier, offset, limit });
    const handler = this.mockPages.get(companyIdentifier);
    if (!handler) {
      return { offset, limit, totalFound: 0, content: [] };
    }
    const result = handler(offset, limit);
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }

  protected override async fetchPostingDetail(
    companyIdentifier: string,
    postingId: string,
    signal?: AbortSignal,
  ): Promise<SmartRecruitersPostingDetail | null> {
    if (signal?.aborted) {
      throw new Error(`[MockSmartRecruitersProvider] Aborted detail for "${postingId}"`);
    }
    const key = `${companyIdentifier}:${postingId}`;
    if (this.mockDetails.has(key)) {
      return this.mockDetails.get(key) ?? null;
    }
    return null;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Test Suite: SmartRecruitersProvider Implementation & Regression ===\n');

  // Test 1: Field Normalization, Skills Extraction, and Multi-Section JobAd
  console.log('Test 1: Field Normalization, Multi-Section HTML Reconstruction, and Skills');
  {
    const listItem: SmartRecruitersJobItem = {
      id: 'sr-job-001',
      name: 'Senior Frontend Engineer (React & TypeScript)',
      releasedDate: '2026-10-24T09:00:00.000Z',
      location: {
        city: 'Chennai',
        region: 'Tamil Nadu',
        country: 'in',
        fullLocation: 'Chennai, Tamil Nadu, India',
        remote: false,
        hybrid: true,
      },
      typeOfEmployment: { id: 'permanent', label: 'Full-time' },
      experienceLevel: { id: 'mid_senior_level', label: 'Mid-Senior Level' },
    };

    const detail: SmartRecruitersPostingDetail = {
      id: 'sr-job-001',
      postingUrl: 'https://jobs.smartrecruiters.com/Freshworks/sr-job-001',
      applyUrl: 'https://jobs.smartrecruiters.com/Freshworks/sr-job-001/apply',
      jobAd: {
        sections: {
          jobDescription: {
            title: 'Job Description',
            text: '<p>Join our team building modern SPAs with React, Next.js, and Redux.</p>',
          },
          qualifications: {
            title: 'Qualifications',
            text: '<p>Strong proficiency in TypeScript, JavaScript &amp; CSS3. Experience with GraphQL.</p>',
          },
          additionalInformation: {
            title: 'Benefits',
            text: '<p>Comprehensive health coverage and learning stipend.</p>',
          },
        },
      },
    };

    const company: SmartRecruitersCompanyConfig = {
      companyIdentifier: 'Freshworks',
      companyName: 'Freshworks',
    };

    const provider = new SmartRecruitersProvider({ companies: [company] });
    const transformed = provider.transformSmartRecruitersJob(listItem, detail, company);

    assert(transformed.id === 'sr-job-001', 'Maps job id correctly');
    assert(transformed.title === 'Senior Frontend Engineer (React & TypeScript)', 'Maps job title');
    assert(transformed.company === 'Freshworks', 'Maps company name');
    assert(transformed.source === 'SmartRecruiters', 'Sets source to "SmartRecruiters"');
    assert(transformed.location === 'Chennai, Tamil Nadu, India', 'Maps full location string');
    assert(transformed.workMode === 'HYBRID', 'Maps hybrid: true to HYBRID workMode');
    assert(transformed.employmentType === 'FULL_TIME', 'Maps "Full-time" to FULL_TIME');
    assert(transformed.experienceLevel === 'SENIOR', 'Maps mid_senior_level to SENIOR');
    assert(transformed.postedDate === '2026-10-24T09:00:00.000Z', 'Maps releasedDate to postedDate');
    assert(transformed.applicationUrl === 'https://jobs.smartrecruiters.com/Freshworks/sr-job-001/apply', 'Prefers API-provided applyUrl');
    assert(transformed.sourceUrl === 'https://jobs.smartrecruiters.com/Freshworks/sr-job-001', 'Maps postingUrl to sourceUrl');
    assert(transformed.description.includes('Qualifications') && transformed.description.includes('CSS3'), 'Assembles multi-section description');
    assert(transformed.requiredSkills?.includes('React') === true, 'Extracts "React" skill');
    assert(transformed.requiredSkills?.includes('TypeScript') === true, 'Extracts "TypeScript" skill');
    assert(transformed.requiredSkills?.includes('JavaScript') === true, 'Extracts "JavaScript" skill');
  }

  // Test 2: Application URL Handling (No Blind ${postingUrl}/apply, Verified Public Posting Fallback, HTTP/HTTPS Only)
  console.log('\nTest 2: Application URL Handling (No Blind /apply Construction, HTTP/HTTPS Only)');
  {
    const company: SmartRecruitersCompanyConfig = { companyIdentifier: 'Freshworks', companyName: 'Freshworks' };
    const provider = new SmartRecruitersProvider({ companies: [company] });

    // 2a: Detail has applyUrl missing -> uses verified postingUrl (does NOT append /apply)
    const itemNoApply: SmartRecruitersJobItem = { id: 'job-no-apply', name: 'Backend Engineer' };
    const detailNoApply: SmartRecruitersPostingDetail = {
      id: 'job-no-apply',
      postingUrl: 'https://jobs.smartrecruiters.com/Freshworks/job-no-apply',
    };
    const tNoApply = provider.transformSmartRecruitersJob(itemNoApply, detailNoApply, company);
    assert(tNoApply.applicationUrl === 'https://jobs.smartrecruiters.com/Freshworks/job-no-apply', 'Uses verified postingUrl when applyUrl is missing (no blind /apply appended)');
    assert(!tNoApply.applicationUrl.endsWith('/apply'), 'Does NOT append /apply blindly to postingUrl');

    // 2b: Malicious or invalid applyUrl -> rejects and falls back to verified public postingUrl
    const detailBadApply: SmartRecruitersPostingDetail = {
      id: 'job-bad-apply',
      applyUrl: 'javascript:alert(1)',
      postingUrl: 'https://jobs.smartrecruiters.com/Freshworks/job-bad-apply',
    };
    const tBadApply = provider.transformSmartRecruitersJob(itemNoApply, detailBadApply, company);
    assert(tBadApply.applicationUrl === 'https://jobs.smartrecruiters.com/Freshworks/job-bad-apply', 'Rejects javascript: applyUrl and falls back to verified postingUrl');

    // 2c: Fallback public posting URL format verification
    const tFallback = provider.transformSmartRecruitersJob({ id: 'job-fb', name: 'Dev' }, null, company);
    assert(tFallback.applicationUrl === 'https://jobs.smartrecruiters.com/Freshworks/job-fb', 'Constructs verified public postingUrl when detail is null');
  }

  // Test 3: Correct Employment-Type Classification (GET, Fresher, Graduate Engineer, Intern, Co-op)
  console.log('\nTest 3: Correct Employment-Type Classification (GET, Fresher, Graduate Engineer, Intern, Co-op)');
  {
    const company: SmartRecruitersCompanyConfig = { companyIdentifier: 'Freshworks', companyName: 'Freshworks' };
    const provider = new SmartRecruitersProvider({ companies: [company] });

    // 3a: Graduate Engineer Trainee with no source evidence -> undefined
    const tGetNoEv = provider.transformSmartRecruitersJob({ id: 'get-1', name: 'Graduate Engineer Trainee' }, null, company);
    assert(tGetNoEv.employmentType === undefined, 'GET with no source evidence does not infer INTERNSHIP or FULL_TIME');

    // 3b: GET with source evidence Full-time -> FULL_TIME
    const tGetFT = provider.transformSmartRecruitersJob(
      { id: 'get-2', name: 'Graduate Engineer Trainee', typeOfEmployment: { label: 'Full-time' } },
      null,
      company,
    );
    assert(tGetFT.employmentType === 'FULL_TIME', 'GET with source evidence Full-time maps to FULL_TIME');

    // 3c: Fresher with no evidence -> undefined
    const tFrNoEv = provider.transformSmartRecruitersJob({ id: 'fr-1', name: 'Fresher Software Engineer' }, null, company);
    assert(tFrNoEv.employmentType === undefined, 'Fresher with no source evidence does not infer INTERNSHIP');

    // 3d: Fresher with permanent id -> FULL_TIME
    const tFrPerm = provider.transformSmartRecruitersJob(
      { id: 'fr-2', name: 'Fresher Software Engineer', typeOfEmployment: { id: 'permanent' } },
      null,
      company,
    );
    assert(tFrPerm.employmentType === 'FULL_TIME', 'Fresher with permanent id maps to FULL_TIME');

    // 3e: Graduate Engineer with no evidence -> undefined
    const tGeNoEv = provider.transformSmartRecruitersJob({ id: 'ge-1', name: 'Graduate Engineer' }, null, company);
    assert(tGeNoEv.employmentType === undefined, 'Graduate Engineer with no source evidence does not infer INTERNSHIP');

    // 3f: Campus Hire with no evidence -> undefined
    const tChNoEv = provider.transformSmartRecruitersJob({ id: 'ch-1', name: 'Campus Hire - Core Platform' }, null, company);
    assert(tChNoEv.employmentType === undefined, 'Campus Hire with no source evidence does not infer INTERNSHIP');

    // 3g: Intern with Internship label -> INTERNSHIP
    const tIntern = provider.transformSmartRecruitersJob(
      { id: 'int-1', name: 'Software Engineer', typeOfEmployment: { label: 'Internship' } },
      null,
      company,
    );
    assert(tIntern.employmentType === 'INTERNSHIP', 'Internship label maps to INTERNSHIP');

    // 3h: Summer Internship in title -> INTERNSHIP
    const tSummerInt = provider.transformSmartRecruitersJob({ id: 'int-2', name: 'Summer Internship 2027' }, null, company);
    assert(tSummerInt.employmentType === 'INTERNSHIP', 'Summer Internship in title maps to INTERNSHIP');

    // 3i: Co-op in title -> INTERNSHIP
    const tCoop = provider.transformSmartRecruitersJob({ id: 'coop-1', name: 'Software Engineering Co-op' }, null, company);
    assert(tCoop.employmentType === 'INTERNSHIP', 'Co-op in title maps to INTERNSHIP');
  }

  // Test 4: Bounded Offset Pagination Progression & TotalFound Termination
  console.log('\nTest 4: Bounded Offset Pagination Progression & TotalFound Termination');
  {
    const totalListings = 45;
    const allItems: SmartRecruitersJobItem[] = [];
    for (let i = 0; i < totalListings; i++) {
      allItems.push({
        id: `fresh-${String(i).padStart(2, '0')}`,
        name: `Engineer ${i}`,
        releasedDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        location: {
          city: i < 5 ? 'Bengaluru' : 'San Francisco',
          country: i < 5 ? 'in' : 'us',
          fullLocation: i < 5 ? 'Bengaluru, Karnataka, India' : 'San Francisco, CA, USA',
        },
      });
    }

    const provider = new MockSmartRecruitersProvider({
      companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
      pageSize: 20,
      maxScanLimit: 500,
      maxJobsPerBoard: 25,
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });

    provider.mockPages.set('Freshworks', (offset, limit) => {
      const pageSlice = allItems.slice(offset, offset + limit);
      return {
        offset,
        limit,
        totalFound: totalListings,
        content: pageSlice,
      };
    });

    const results = await provider.fetchCompany({
      companyIdentifier: 'Freshworks',
      companyName: 'Freshworks',
    });

    assert(provider.pageFetchLog.length === 3, `Made exactly 3 page requests to scan 45 items (actual: ${provider.pageFetchLog.length})`);
    assert(provider.pageFetchLog[0].offset === 0, 'First page offset is 0');
    assert(provider.pageFetchLog[1].offset === 20, 'Second page offset is 20');
    assert(provider.pageFetchLog[2].offset === 40, 'Third page offset is 40');
    assert(results.length === 25, `Retained maxJobsPerBoard (25) opportunities (actual: ${results.length})`);

    const indiaResults = results.filter((r) => r.location?.includes('India') || r.location?.includes('Bengaluru'));
    assert(indiaResults.length === 5, `Discovered and retained all 5 India jobs (actual: ${indiaResults.length})`);
  }

  // Test 5: Early Termination on India Quota Fulfillment
  console.log('\nTest 5: Early Termination on India Quota Fulfillment');
  {
    const page1Items: SmartRecruitersJobItem[] = [];
    for (let i = 0; i < 30; i++) {
      page1Items.push({
        id: `ind-${String(i).padStart(2, '0')}`,
        name: `India Engineer ${i}`,
        releasedDate: '2026-10-25T00:00:00.000Z',
        location: { fullLocation: 'Bengaluru, Karnataka, India' },
      });
    }

    const provider = new MockSmartRecruitersProvider({
      companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
      pageSize: 30,
      maxJobsPerBoard: 10,
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });

    provider.mockPages.set('Freshworks', (offset, limit) => {
      return {
        offset,
        limit,
        totalFound: 100,
        content: page1Items,
      };
    });

    const results = await provider.fetchCompany({
      companyIdentifier: 'Freshworks',
      companyName: 'Freshworks',
    });

    assert(provider.pageFetchLog.length === 1, `Terminated after 1 request because India quota (10) was met (actual: ${provider.pageFetchLog.length})`);
    assert(results.length === 10, `Retained exactly 10 India jobs (actual: ${results.length})`);
  }

  // Test 6: Deterministic Job Retention (Newest First, Missing Date Fallback, Stable Ties)
  console.log('\nTest 6: Deterministic Job Retention (Newest First, Missing Date Fallback, Stable Ties)');
  {
    const items: SmartRecruitersJobItem[] = [
      { id: 'job-old', name: 'Old Role', releasedDate: '2026-10-01T00:00:00.000Z', location: { fullLocation: 'Chennai, India' } },
      { id: 'job-no-date-b', name: 'No Date Role B', location: { fullLocation: 'Chennai, India' } },
      { id: 'job-newest', name: 'Newest Role', releasedDate: '2026-10-30T00:00:00.000Z', location: { fullLocation: 'Chennai, India' } },
      { id: 'job-mid', name: 'Mid Role', releasedDate: '2026-10-15T00:00:00.000Z', location: { fullLocation: 'Chennai, India' } },
      { id: 'job-no-date-a', name: 'No Date Role A', location: { fullLocation: 'Chennai, India' } },
    ];

    const provider = new MockSmartRecruitersProvider({
      companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
      maxJobsPerBoard: 10,
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });

    provider.mockPages.set('Freshworks', () => ({
      totalFound: items.length,
      content: items,
    }));

    const results = await provider.fetchCompany({
      companyIdentifier: 'Freshworks',
      companyName: 'Freshworks',
    });

    assert(results[0].id === 'job-newest', 'First retained is job-newest (2026-10-30)');
    assert(results[1].id === 'job-mid', 'Second retained is job-mid (2026-10-15)');
    assert(results[2].id === 'job-old', 'Third retained is job-old (2026-10-01)');
    assert(results[3].id === 'job-no-date-a', 'Fourth retained is job-no-date-a (stably sorted by ID)');
    assert(results[4].id === 'job-no-date-b', 'Fifth retained is job-no-date-b (stably sorted by ID)');
  }

  // Test 7: Deep India Discovery Across Multiple Pages
  console.log('\nTest 7: Deep India Discovery Across Multiple Pages');
  {
    const items: SmartRecruitersJobItem[] = [];
    for (let i = 0; i < 30; i++) {
      items.push({
        id: `us-${String(i).padStart(2, '0')}`,
        name: `US Role ${i}`,
        releasedDate: '2026-10-10T00:00:00.000Z',
        location: { fullLocation: 'San Francisco, CA, USA' },
      });
    }
    for (let i = 0; i < 4; i++) {
      items.push({
        id: `in-${String(i).padStart(2, '0')}`,
        name: `India Role ${i}`,
        releasedDate: '2026-10-25T00:00:00.000Z',
        location: { fullLocation: 'Chennai, Tamil Nadu, India' },
      });
    }

    const provider = new MockSmartRecruitersProvider({
      companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
      pageSize: 20,
      maxJobsPerBoard: 25,
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });

    provider.mockPages.set('Freshworks', (offset, limit) => {
      return {
        offset,
        limit,
        totalFound: items.length,
        content: items.slice(offset, offset + limit),
      };
    });

    const results = await provider.fetchCompany({
      companyIdentifier: 'Freshworks',
      companyName: 'Freshworks',
    });

    assert(results.length === 25, `Retained maxJobsPerBoard (25) opportunities (actual: ${results.length})`);
    const indiaRetained = results.filter((r) => r.location?.includes('India') || r.location?.includes('Chennai'));
    assert(indiaRetained.length === 4, `All 4 India jobs discovered on page 2 were retained (actual: ${indiaRetained.length})`);
  }

  // Test 8: Rate Limiting (429) & Server Error (5xx) Retry Mechanics on real fetchPage
  console.log('\nTest 8: Rate Limiting (429) & Server Error (5xx) Retry Mechanics');
  {
    const originalFetch = globalThis.fetch;
    try {
      // 8a: 500 error on attempt 1, retry success on attempt 2
      let attempts500 = 0;
      globalThis.fetch = (async () => {
        attempts500++;
        if (attempts500 === 1) {
          return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500, statusText: 'Internal Server Error' });
        }
        return new Response(JSON.stringify({
          offset: 0,
          limit: 10,
          totalFound: 1,
          content: [{ id: 'retry-500-success', name: 'Resilient Role', location: { fullLocation: 'Pune, India' } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }) as any;

      const provider500 = new SmartRecruitersProvider({
        companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
        maxRetries: 2,
        rateLimitDelayMs: 0,
        fetchDetailsForRetained: false,
      });

      const results500 = await provider500.fetchCompany({
        companyIdentifier: 'Freshworks',
        companyName: 'Freshworks',
      });

      assert(results500.length === 1 && results500[0].id === 'retry-500-success', 'Successfully recovered after transient 500 on attempt 1');
      assert(attempts500 === 2, `Attempted exactly 2 times for 500 retry (actual: ${attempts500})`);

      // 8b: 429 rate limit with Retry-After header on attempt 1, success on attempt 2
      let attempts429 = 0;
      globalThis.fetch = (async () => {
        attempts429++;
        if (attempts429 === 1) {
          return new Response('Rate limited', {
            status: 429,
            statusText: 'Too Many Requests',
            headers: { 'Retry-After': '0' },
          });
        }
        return new Response(JSON.stringify({
          offset: 0,
          limit: 10,
          totalFound: 1,
          content: [{ id: 'retry-429-success', name: 'Rate Limit Recovered', location: { fullLocation: 'Bengaluru, India' } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }) as any;

      const provider429 = new SmartRecruitersProvider({
        companies: [{ companyIdentifier: 'Freshworks', companyName: 'Freshworks' }],
        maxRetries: 2,
        rateLimitDelayMs: 0,
        fetchDetailsForRetained: false,
      });

      const results429 = await provider429.fetchCompany({
        companyIdentifier: 'Freshworks',
        companyName: 'Freshworks',
      });

      assert(results429.length === 1 && results429[0].id === 'retry-429-success', 'Successfully recovered after transient 429 on attempt 1');
      assert(attempts429 === 2, `Attempted exactly 2 times for 429 retry (actual: ${attempts429})`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // Test 9: Provider Failure Reporting (Total Failure vs Partial Failure)
  console.log('\nTest 9: Provider Failure Reporting (Total Failure vs Partial Failure)');
  {
    const compA: SmartRecruitersCompanyConfig = { companyIdentifier: 'Freshworks', companyName: 'Freshworks' };
    const compB: SmartRecruitersCompanyConfig = { companyIdentifier: 'BrokenCompany', companyName: 'Broken Corp' };

    // 9a: Partial failure (Freshworks succeeds, BrokenCompany fails) -> returns Freshworks jobs, exposes failedSources
    const providerPartial = new MockSmartRecruitersProvider({
      companies: [compA, compB],
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });
    providerPartial.mockPages.set('Freshworks', () => ({
      totalFound: 1,
      content: [{ id: 'fw-1', name: 'Freshworks Dev', location: { fullLocation: 'Chennai, India' } }],
    }));
    providerPartial.mockPages.set('BrokenCompany', () => {
      throw new Error('404 Company Not Found');
    });

    const partialJobs = await providerPartial.fetch();
    assert(partialJobs.length === 1 && partialJobs[0].id === 'fw-1', 'Partial failure returns jobs from succeeding company');
    const stats = providerPartial.getLastFetchStats();
    assert(stats.successfulSources.includes('Freshworks'), 'Stats track Freshworks as successful source');
    assert(stats.failedSources.some((f) => f.source === 'BrokenCompany'), 'Stats track BrokenCompany in failedSources');

    // 9b: Total failure (all companies fail) -> throws Error with failure details
    const providerTotal = new MockSmartRecruitersProvider({
      companies: [compA, compB],
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });
    providerTotal.mockPages.set('Freshworks', () => {
      throw new Error('503 Service Unavailable');
    });
    providerTotal.mockPages.set('BrokenCompany', () => {
      throw new Error('404 Company Not Found');
    });

    let threwTotal = false;
    try {
      await providerTotal.fetch();
    } catch (err) {
      threwTotal = true;
      assert(
        err instanceof Error && err.message.includes('All 2 configured SmartRecruiters companies failed'),
        `Throws descriptive error on total failure: ${err instanceof Error ? err.message : err}`,
      );
    }
    assert(threwTotal, 'Total company failure propagates error instead of returning empty array');
  }

  // Test 10: Cancellation Propagation via AbortSignal
  console.log('\nTest 10: Cancellation Propagation via AbortSignal');
  {
    const company: SmartRecruitersCompanyConfig = { companyIdentifier: 'Freshworks', companyName: 'Freshworks' };
    const provider = new MockSmartRecruitersProvider({
      companies: [company],
      fetchDetailsForRetained: false,
      rateLimitDelayMs: 0,
    });
    provider.mockPages.set('Freshworks', () => ({
      totalFound: 1,
      content: [{ id: 'fw-1', name: 'Freshworks Dev' }],
    }));

    const abortController = new AbortController();
    abortController.abort(new Error('Pre-aborted signal'));

    let threwAbort = false;
    try {
      await provider.fetch(abortController.signal);
    } catch {
      threwAbort = true;
    }
    assert(threwAbort, 'fetch(signal) rejects immediately when AbortSignal is aborted');
  }

  // Test 11: Normalizer & Deduplicator Integration
  console.log('\nTest 11: Normalizer & Deduplicator Integration');
  {
    const rawExternalJob: ExternalJob = {
      id: 'sr-dedup-1',
      title: 'Junior Software Engineer',
      company: 'Freshworks',
      description: 'Join Freshworks as a junior engineer. We require Java and SQL proficiency in Chennai.',
      location: 'Chennai, Tamil Nadu, India',
      workMode: 'ONSITE',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      applicationUrl: 'https://jobs.smartrecruiters.com/Freshworks/sr-dedup-1',
      sourceUrl: 'https://jobs.smartrecruiters.com/Freshworks/sr-dedup-1',
      source: 'SmartRecruiters',
      postedDate: '2026-10-26T14:00:00.000Z',
      requiredSkills: ['java', 'sql'],
    };

    const normalizer = new OpportunityNormalizer();
    const normalized = normalizer.normalize(rawExternalJob);

    assert(normalized.title === 'Junior Software Engineer', 'Preserves title');
    assert(normalized.organization === 'Freshworks', 'Maps company to organization');
    assert(normalized.source === 'SmartRecruiters', 'Preserves source "SmartRecruiters"');
    assert(normalized.sourceJobId === 'sr-dedup-1', 'Maps id to sourceJobId');
    assert(normalized.workMode === 'ONSITE', 'Preserves workMode');
    assert(normalized.experienceLevel === 'ENTRY', 'Preserves experienceLevel');

    const deduplicator = new OpportunityDeduplicator();
    const key = deduplicator.generateDeduplicationKey(normalized);
    assert(typeof key === 'string' && key.startsWith('SmartRecruiters'), `Generates valid deduplication key: ${key}`);
  }

  // Summary
  console.log(`\nSmartRecruitersProvider Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
