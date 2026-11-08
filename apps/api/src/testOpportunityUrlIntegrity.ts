/**
 * M1 Closure Check: Focused URL Integrity & Absence Test Suite
 *
 * Verifies that missing, null, empty, and invalid applicationUrl / sourceUrl
 * values are handled consistently across providers, normalizers, and frontend contracts
 * without database writes or schema modifications.
 */

import {
  OpportunityNormalizer,
  isValidHttpUrl,
  type ExternalJob,
  type NormalizedOpportunity,
} from './lib/opportunityProvider';
import {
  SmartRecruitersProvider,
  isConfirmedPublicPostingUrl,
  type SmartRecruitersJobItem,
  type SmartRecruitersPostingDetail,
  type SmartRecruitersCompanyConfig,
} from './lib/smartRecruitersProvider';

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

async function runTests() {
  console.log('\n=== M1 Closure Check: Application & Source URL Integrity Suite ===\n');

  const normalizer = new OpportunityNormalizer();
  const company: SmartRecruitersCompanyConfig = {
    companyIdentifier: 'Freshworks',
    companyName: 'Freshworks',
  };
  const provider = new SmartRecruitersProvider({ companies: [company] });

  // Test 1: applicationUrl = null
  console.log('Test 1: applicationUrl = null handling in OpportunityNormalizer');
  {
    const job: ExternalJob = {
      title: 'Software Engineer',
      company: 'Freshworks',
      description: 'Role description',
      source: 'SmartRecruiters',
      applicationUrl: null,
      sourceUrl: null,
    };

    const normalized = normalizer.normalize(job);
    assert(normalized.applicationUrl === '', 'applicationUrl = null is normalized to empty string (DB-safe missing value)');
    assert(normalized.sourceUrl === null, 'sourceUrl = null is preserved as null');
    assert(!isValidHttpUrl(normalized.applicationUrl), 'Normalized empty string is NOT treated as a valid application URL');
  }

  // Test 2: applicationUrl = ''
  console.log('\nTest 2: applicationUrl = "" handling in OpportunityNormalizer');
  {
    const job: ExternalJob = {
      title: 'Software Engineer',
      company: 'Freshworks',
      description: 'Role description',
      source: 'SmartRecruiters',
      applicationUrl: '',
      sourceUrl: '',
    };

    const normalized = normalizer.normalize(job);
    assert(normalized.applicationUrl === '', 'applicationUrl = "" is normalized to empty string');
    assert(normalized.sourceUrl === null, 'Empty string sourceUrl is normalized to null');
    assert(!isValidHttpUrl(normalized.applicationUrl), 'Empty string is NOT treated as a valid application URL');
  }

  // Test 3: Missing applicationUrl (undefined)
  console.log('\nTest 3: Missing applicationUrl (undefined) handling in OpportunityNormalizer');
  {
    const job: ExternalJob = {
      title: 'DevOps Engineer',
      company: 'Freshworks',
      description: 'Role description',
      source: 'SmartRecruiters',
      // applicationUrl and sourceUrl omitted
    };

    const normalized = normalizer.normalize(job);
    assert(normalized.applicationUrl === '', 'Missing applicationUrl is normalized to empty string');
    assert(normalized.sourceUrl === null, 'Missing sourceUrl is normalized to null');
    assert(!isValidHttpUrl(normalized.applicationUrl), 'Missing applicationUrl is NOT treated as valid');
  }

  // Test 4: Valid application URL
  console.log('\nTest 4: Valid application URL handling');
  {
    const validUrl = 'https://jobs.smartrecruiters.com/Freshworks/744000158852264-software-engineer?oga=true';
    const validSource = 'https://jobs.smartrecruiters.com/Freshworks/744000158852264-software-engineer';

    const job: ExternalJob = {
      title: 'Senior Software Engineer',
      company: 'Freshworks',
      description: 'Role description',
      source: 'SmartRecruiters',
      applicationUrl: validUrl,
      sourceUrl: validSource,
    };

    const normalized = normalizer.normalize(job);
    assert(normalized.applicationUrl === validUrl, 'Valid applicationUrl is preserved exactly');
    assert(normalized.sourceUrl === validSource, 'Valid sourceUrl is preserved exactly');
    assert(isValidHttpUrl(normalized.applicationUrl) === true, 'Valid applicationUrl satisfies isValidHttpUrl');
  }

  // Test 5: Invalid application URLs (javascript:, ftp:, whitespace, relative)
  console.log('\nTest 5: Invalid application URL handling');
  {
    const invalidCandidates = [
      'javascript:alert(document.cookie)',
      '   ',
      'ftp://ftp.example.com/job',
      '/v1/companies/Freshworks/postings/123',
      'not-a-valid-url',
      'mailto:jobs@freshworks.com',
    ];

    for (const badUrl of invalidCandidates) {
      const job: ExternalJob = {
        title: 'Security Analyst',
        company: 'Freshworks',
        description: 'Role description',
        source: 'SmartRecruiters',
        applicationUrl: badUrl,
        sourceUrl: badUrl,
      };

      const normalized = normalizer.normalize(job);
      assert(
        normalized.applicationUrl === '',
        `Invalid URL "${badUrl}" is rejected and normalized to empty string`,
      );
      assert(
        normalized.sourceUrl === null,
        `Invalid source URL "${badUrl}" is rejected and normalized to null`,
      );
      assert(
        !isValidHttpUrl(normalized.applicationUrl),
        `Normalized value for "${badUrl}" fails isValidHttpUrl check`,
      );
    }
  }

  // Test 6: SmartRecruiters Provider - No Trustworthy Public URL Omits applicationUrl and sourceUrl
  console.log('\nTest 6: SmartRecruiters Provider without trustworthy URLs');
  {
    // Item with API reference in ref, no detail
    const itemWithApiRef: SmartRecruitersJobItem = {
      id: 'job-api-only',
      name: 'Cloud Engineer',
      ref: 'https://api.smartrecruiters.com/v1/companies/Freshworks/postings/job-api-only',
    };

    const transformedNoDetail = provider.transformSmartRecruitersJob(itemWithApiRef, null, company);
    assert(transformedNoDetail.applicationUrl === '', 'Provider produces empty applicationUrl when only API ref exists');
    assert(transformedNoDetail.sourceUrl === undefined, 'Provider produces undefined sourceUrl when only API ref exists');

    // Detail with missing postingUrl and invalid applyUrl
    const detailInvalid: SmartRecruitersPostingDetail = {
      id: 'job-api-only',
      name: 'Cloud Engineer',
      applyUrl: 'https://api.smartrecruiters.com/v1/companies/Freshworks/postings/job-api-only/apply',
    };

    const transformedWithDetail = provider.transformSmartRecruitersJob(itemWithApiRef, detailInvalid, company);
    assert(transformedWithDetail.applicationUrl === '', 'Provider produces empty applicationUrl when applyUrl is API endpoint');
    assert(transformedWithDetail.sourceUrl === undefined, 'Provider produces undefined sourceUrl when postingUrl is missing');

    // Verify normalization of the untrustworthy job
    const normalized = normalizer.normalize(transformedWithDetail);
    assert(normalized.applicationUrl === '', 'Normalizer produces empty string applicationUrl');
    assert(normalized.sourceUrl === null, 'Normalizer produces null sourceUrl');
  }

  // Test 7: Frontend Apply Button Display Logic Simulation
  console.log('\nTest 7: Frontend Apply Button Display Logic Verification');
  {
    // Evaluates whether the frontend condition: isValidHttpUrl(opp.applicationUrl)
    // correctly hides or shows the Apply button.
    const testCases: Array<{ url: string | null | undefined; shouldShowApplyBtn: boolean; reason: string }> = [
      { url: null, shouldShowApplyBtn: false, reason: 'null applicationUrl hides Apply button' },
      { url: undefined, shouldShowApplyBtn: false, reason: 'undefined applicationUrl hides Apply button' },
      { url: '', shouldShowApplyBtn: false, reason: 'empty string applicationUrl hides Apply button' },
      { url: '   ', shouldShowApplyBtn: false, reason: 'whitespace applicationUrl hides Apply button' },
      { url: 'javascript:alert(1)', shouldShowApplyBtn: false, reason: 'javascript: URL hides Apply button' },
      { url: 'ftp://example.com/apply', shouldShowApplyBtn: false, reason: 'ftp: URL hides Apply button' },
      { url: '/internal/apply', shouldShowApplyBtn: false, reason: 'relative URL hides Apply button' },
      { url: 'https://jobs.smartrecruiters.com/Freshworks/123-role', shouldShowApplyBtn: true, reason: 'valid HTTPS URL displays Apply button' },
      { url: 'http://careers.freshworks.com/apply/123', shouldShowApplyBtn: true, reason: 'valid HTTP URL displays Apply button' },
    ];

    for (const tc of testCases) {
      const willShow = isValidHttpUrl(tc.url);
      assert(willShow === tc.shouldShowApplyBtn, `${tc.reason} (got ${willShow})`);
    }
  }

  // Test 8: Deduplication key stability with empty applicationUrl
  console.log('\nTest 8: Deduplication Key Stability with Empty applicationUrl');
  {
    const { OpportunityDeduplicator } = await import('./lib/opportunityProvider');
    const deduplicator = new OpportunityDeduplicator();

    const normalizedNoUrl: NormalizedOpportunity = {
      title: 'Lead Platform Engineer',
      organization: 'Freshworks',
      description: 'Platform infrastructure role',
      type: 'JOB',
      location: 'Chennai, India',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      applicationUrl: '',
      source: 'SmartRecruiters',
      sourceUrl: null,
      sourceJobId: 'sr-789',
      postedDate: new Date('2026-10-30T00:00:00Z'),
      deadline: null,
      requiredSkills: ['kubernetes', 'go'],
      preferredSkills: [],
    };

    const key = deduplicator.generateDeduplicationKey(normalizedNoUrl);
    assert(typeof key === 'string' && key.length > 0, `Generates valid key with empty applicationUrl: ${key}`);
    assert(key.includes('SmartRecruiters|||sr-789|||freshworks'), 'Key accurately preserves source and sourceJobId');
  }

  // Summary
  console.log(`\nURL Integrity Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
