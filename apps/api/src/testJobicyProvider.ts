import { JobicyProvider, type JobicyJobItem } from './lib/jobicyProvider';
import { OpportunityNormalizer, OpportunityDeduplicator, OpportunityIngestor, type ExternalJob } from './lib/opportunityProvider';

class MockJobicyProvider extends JobicyProvider {
  private mockJobs: JobicyJobItem[];

  constructor(mockJobs: JobicyJobItem[]) {
    super();
    this.mockJobs = mockJobs;
  }

  override async fetch(): Promise<ExternalJob[]> {
    return this.mockJobs.map(job => this.transformJobicyJob(job));
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('TEST SUITE: JobicyProvider Abstraction');
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

  // ─── Test 1: Transform Representative Jobicy Payload ────────────────────────
  console.log('--- Test 1: Representative Jobicy Response Transformation ---');
  const provider = new JobicyProvider();

  const sampleJobicyPayload: JobicyJobItem = {
    id: 156321,
    url: 'https://jobicy.com/jobs/156321-senior-full-stack-engineer',
    jobTitle: 'Senior Full Stack Engineer',
    companyName: 'TechCorp',
    companyLogo: 'https://jobicy.com/logo.png',
    jobIndustry: ['Engineering', 'React.js'],
    jobType: ['full-time'],
    jobGeo: 'USA',
    jobLevel: 'Senior',
    jobExcerpt: 'Build scalable web apps',
    jobDescription: '<p>Build scalable web apps using React and Node.</p>',
    pubDate: '2026-10-07T19:37:36+00:00',
    salaryMin: 120000,
    salaryMax: 160000,
    salaryCurrency: 'USD',
    salaryPeriod: 'yearly',
  };

  const externalJob = provider.transformJobicyJob(sampleJobicyPayload);

  assert(externalJob.id === '156321', 'ID converted to string "156321"');
  assert(externalJob.title === 'Senior Full Stack Engineer', 'Job title preserved');
  assert(externalJob.company === 'TechCorp', 'Company name preserved');
  assert(externalJob.source === 'Jobicy', 'Source is set to "Jobicy"');
  assert(externalJob.workMode === 'REMOTE', 'WorkMode defaults to "REMOTE" for Jobicy');
  assert(externalJob.employmentType === 'full-time', 'EmploymentType correctly formatted');
  assert(externalJob.experienceLevel === 'Senior', 'Experience level preserved');
  assert(externalJob.applicationUrl === 'https://jobicy.com/jobs/156321-senior-full-stack-engineer', 'Application URL mapped');
  assert(externalJob.sourceUrl === 'https://jobicy.com/jobs/156321-senior-full-stack-engineer', 'Source URL mapped');
  assert(externalJob.postedDate === '2026-10-07T19:37:36+00:00', 'Posted date preserved');
  assert(Array.isArray(externalJob.requiredSkills) && externalJob.requiredSkills.includes('React.js'), 'Required skills extracted from industry tags');
  console.log();

  // ─── Test 2: Transform Sparse / Missing Fields Jobicy Payload ────────────────
  console.log('--- Test 2: Sparse/Missing Optional Fields Handling ---');
  const sparsePayload: JobicyJobItem = {
    id: 999888,
    url: 'https://jobicy.com/jobs/999888',
    jobTitle: '',
    companyName: '',
  };

  const sparseJob = provider.transformJobicyJob(sparsePayload);

  assert(sparseJob.id === '999888', 'ID handles numeric ID correctly');
  assert(sparseJob.title === 'Untitled Opportunity', 'Fallback for empty title');
  assert(sparseJob.company === 'Unknown Organization', 'Fallback for empty company');
  assert(sparseJob.location === undefined, 'Missing location yields undefined');
  assert(sparseJob.employmentType === undefined, 'Missing employment type yields undefined');
  assert(sparseJob.experienceLevel === undefined, 'Missing experience level yields undefined');
  assert(sparseJob.postedDate === undefined, 'Missing pubDate yields undefined');
  console.log();

  // ─── Test 3: Normalization of Jobicy ExternalJob ───────────
  console.log('--- Test 3: OpportunityNormalizer with Jobicy ExternalJob ---');
  const normalizer = new OpportunityNormalizer();
  const normalized = normalizer.normalize(externalJob);

  assert(normalized.title === 'Senior Full Stack Engineer', 'Normalized title matches');
  assert(normalized.organization === 'TechCorp', 'Normalized organization matches');
  assert(normalized.source === 'Jobicy', 'Normalized source is "Jobicy"');
  assert(normalized.sourceJobId === '156321', 'Normalized sourceJobId is "156321"');
  assert(normalized.workMode === 'REMOTE', 'Normalized workMode is "REMOTE"');
  assert(normalized.employmentType === 'FULL_TIME', 'Normalized employmentType is "FULL_TIME"');
  assert(normalized.experienceLevel === 'SENIOR', 'Normalized experienceLevel is "SENIOR"');
  assert(normalized.requiredSkills.includes('react'), 'Skill "React.js" normalized to "react"');
  console.log();

  // ─── Test 4: Ingestion Pipeline & Deduplication (Idempotency) ───────────────
  console.log('--- Test 4: Deduplication & Idempotency Check ---');
  const mockProvider = new MockJobicyProvider([sampleJobicyPayload]);
  const fetchedJobs = await mockProvider.fetch();

  assert(fetchedJobs.length === 1, 'MockJobicyProvider returns 1 transformed job');
  assert(fetchedJobs[0].id === '156321', 'ExternalJob contains id "156321" for Jobicy job');
  assert(fetchedJobs[0].source === 'Jobicy', 'Fetched job source is "Jobicy"');

  const deduplicator = new OpportunityDeduplicator();
  const dedupKey = deduplicator.generateDeduplicationKey(normalized);
  assert(dedupKey.startsWith('Jobicy|||156321'), 'Deduplication key format is correct for Jobicy source & ID');
  console.log();

  // ─── Test 5: Provider Constructor & Ingestion Calling Conventions ────────────
  console.log('--- Test 5: Constructor Options & Ingestion Compatibility ---');
  const numericProvider = new JobicyProvider(50);
  assert(numericProvider.name === 'Jobicy', 'new JobicyProvider(50) initializes cleanly');

  const optionsProvider = new JobicyProvider({ count: 25, geo: 'usa' });
  assert(optionsProvider.name === 'Jobicy', 'new JobicyProvider({ count: 25 }) initializes cleanly');

  const defaultProvider = new JobicyProvider();
  assert(defaultProvider.name === 'Jobicy', 'new JobicyProvider() initializes cleanly');
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
