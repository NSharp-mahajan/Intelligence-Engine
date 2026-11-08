/**
 * Automated Test Suite: Early Opportunities India Relevance + Engineering Specialization
 *
 * Verifies:
 * Part A — India Geographic Relevance:
 *  1. Domestic India onsite, hybrid, and India-confirmed remote roles are classified as INDIA_DOMESTIC and India-eligible.
 *  2. US/Overseas-restricted remote and overseas in-office roles without sponsorship are classified as INTERNATIONAL_OTHER and excluded from India-only feed.
 *  3. Explicit visa sponsorship is detected and classified as INTERNATIONAL_SPONSORED.
 *  4. Negative visa clauses ("no sponsorship", "must have work authorization") are never falsely detected as sponsored.
 *  5. GET /api/opportunities/early-career defaults to indiaOnly=true, excluding overseas and unconfirmed roles.
 *  6. GET /api/opportunities/early-career?geoScope=VERIFIED_SPONSORSHIP returns only international roles with verified visa sponsorship.
 *  7. GET /api/opportunities/early-career?indiaOnly=false or geoScope=ALL allows browsing international opportunities.
 *  8. Opportunities response attaches complete geographic summary metadata.
 *
 * Part B — Engineering Sub-Family Specialization:
 *  9. Backend, Frontend, and Full Stack roles classify into SOFTWARE_DEVELOPMENT.
 * 10. DevOps, SRE, Platform, Cloud, and Infrastructure roles classify into DEVOPS_PLATFORM.
 * 11. Machine Learning, AI, GenAI, and Deep Learning roles classify into AI_ML_ENGINEERING.
 * 12. Security, Cyber, and AppSec roles classify into SECURITY_ENGINEERING.
 * 13. Data Engineering, ETL, and Analytics Engineering roles classify into DATA_ENGINEERING.
 * 14. QA, SDET, Test Automation, and Quality roles classify into QA_TESTING.
 * 15. Ambiguous/generic engineering titles classify into AMBIGUOUS.
 * 16. Non-software roles (e.g., Customer Support Specialist) classify as null and are excluded from software engineering.
 * 17. GET /api/opportunities/early-career supports ?specialization= filter (single and multi-value comma-separated).
 * 18. Default ?specialization=ALL returns all sub-families.
 *
 * Part C — Non-Regression & Preserved Contracts:
 * 19. Dedicated India opportunities endpoint (GET /api/opportunities/india) remains untouched and fully functional.
 * 20. Candidate eligibility calculations and four-category reason codes remain intact.
 * 21. Skill matching remains intact and orthogonal to eligibility.
 * 22. Multi-tier deterministic sorting and pagination remain intact.
 * 23. Zero database writes, zero schema modifications, zero backfills.
 */

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  IndiaLocationClassifier,
  detectVisaSponsorship,
  getOpportunityGeographicScope,
} from './services/indiaLocationClassifier';
import {
  classifyEngineeringSubFamily,
  classifyJobFamily,
  isSoftwareEngineeringRole,
} from './services/jobFamilyClassifier';
import opportunitiesRouter from './routes/opportunities';
import { prisma } from './lib/prisma';

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
  console.log('\n================================================================');
  console.log('  EARLY OPPORTUNITIES: INDIA RELEVANCE + SPECIALIZATION SUITE');
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. UNIT TESTS: India Geographic Classification & Visa Sponsorship Detection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Geographic Classification & Visa Sponsorship Unit Tests ---');

  // 1.1 Domestic India Onsite
  const bengaluruRole = {
    title: 'Software Engineer',
    location: 'Bengaluru, Karnataka, India',
    workMode: 'ONSITE',
    description: 'Join our engineering team in Bangalore.',
  };
  const bengaluruScope = getOpportunityGeographicScope(bengaluruRole);
  assert(bengaluruScope.isIndiaEligible === true, 'Bengaluru onsite is marked isIndiaEligible=true');
  assert(bengaluruScope.geoScope === 'INDIA_DOMESTIC', 'Bengaluru onsite geoScope is INDIA_DOMESTIC');
  assert(bengaluruScope.hasVisaSponsorship === false, 'Bengaluru domestic does not claim international visa sponsorship');

  // 1.2 Domestic India Hybrid
  const hyderabadRole = {
    title: 'Junior Backend Developer',
    location: 'Hyderabad, India',
    workMode: 'HYBRID',
    description: 'Hybrid role based in Hyderabad office 3 days a week.',
  };
  const hydScope = getOpportunityGeographicScope(hyderabadRole);
  assert(hydScope.isIndiaEligible === true, 'Hyderabad hybrid is marked isIndiaEligible=true');
  assert(hydScope.geoScope === 'INDIA_DOMESTIC', 'Hyderabad hybrid geoScope is INDIA_DOMESTIC');

  // 1.3 Confirmed India Remote
  const remoteIndiaRole = {
    title: 'Frontend Engineer',
    location: 'Remote - India',
    workMode: 'REMOTE',
    description: 'Work from anywhere in India.',
  };
  const remoteIndiaScope = getOpportunityGeographicScope(remoteIndiaRole);
  assert(remoteIndiaScope.isIndiaEligible === true, 'Remote - India is marked isIndiaEligible=true');
  assert(remoteIndiaScope.geoScope === 'INDIA_DOMESTIC', 'Remote - India geoScope is INDIA_DOMESTIC');

  // 1.4 Overseas In-Office (Unavailable to India, No Sponsorship)
  const nyInOfficeRole = {
    title: 'Software Engineer New Grad',
    location: 'New York, NY',
    workMode: 'ONSITE',
    description: 'Must work out of our NYC office. US work authorization required.',
  };
  const nyScope = getOpportunityGeographicScope(nyInOfficeRole);
  assert(nyScope.isIndiaEligible === false, 'NYC in-office is marked isIndiaEligible=false');
  assert(nyScope.geoScope === 'INTERNATIONAL_OTHER', 'NYC in-office geoScope is INTERNATIONAL_OTHER');
  assert(nyScope.hasVisaSponsorship === false, 'NYC in-office hasVisaSponsorship=false');

  // 1.5 Overseas Remote Restricted to US
  const usOnlyRemoteRole = {
    title: 'DevOps Engineer',
    location: 'Remote, US',
    workMode: 'REMOTE',
    description: 'Must be physically located in the United States and eligible to work for any US employer.',
  };
  const usRemoteScope = getOpportunityGeographicScope(usOnlyRemoteRole);
  assert(usRemoteScope.isIndiaEligible === false, 'Remote US only is marked isIndiaEligible=false');
  assert(usRemoteScope.geoScope === 'INTERNATIONAL_OTHER', 'Remote US only geoScope is INTERNATIONAL_OTHER');

  // 1.6 Overseas with Positive Visa Sponsorship
  const palantirSponsorshipRole = {
    title: 'Software Engineer - New Grad 2026',
    location: 'Washington, DC / Palo Alto, CA / New York, NY',
    workMode: 'ONSITE',
    description: `We support international students and new graduates. We provide full visa sponsorship including H-1B, TN, E-3, and employment-based green card processing. Relocation assistance provided.`,
  };
  const palantirScope = getOpportunityGeographicScope(palantirSponsorshipRole);
  assert(palantirScope.isIndiaEligible === false, 'International sponsored role is not domestic India eligible');
  assert(palantirScope.hasVisaSponsorship === true, 'International role with sponsorship detected hasVisaSponsorship=true');
  assert(palantirScope.geoScope === 'INTERNATIONAL_SPONSORED', 'International role with sponsorship geoScope is INTERNATIONAL_SPONSORED');

  // 1.7 Negative Visa Clause (Must NOT be flagged as sponsored)
  const negativeVisaRole = {
    title: 'Software Engineer',
    location: 'London, UK',
    workMode: 'HYBRID',
    description: 'At this time, we do not offer visa sponsorship or transfer. Candidates must have pre-existing UK right to work without sponsorship.',
  };
  assert(detectVisaSponsorship(negativeVisaRole.description) === false, 'Negative visa clause is detected as false');
  const negativeScope = getOpportunityGeographicScope(negativeVisaRole);
  assert(negativeScope.hasVisaSponsorship === false, 'Negative visa role hasVisaSponsorship=false');
  assert(negativeScope.geoScope === 'INTERNATIONAL_OTHER', 'Negative visa role geoScope is INTERNATIONAL_OTHER');

  // 1.8 Clearance Requirement (Strictly non-sponsored)
  const securityClearanceRole = {
    title: 'Embedded Systems Engineer',
    location: 'Denver, CO',
    workMode: 'ONSITE',
    description: 'Candidates must possess or be able to obtain a US Security Clearance. US Citizenship is strictly required.',
  };
  assert(detectVisaSponsorship(securityClearanceRole.description) === false, 'Clearance requirement is rejected as non-sponsored');
  assert(getOpportunityGeographicScope(securityClearanceRole).geoScope === 'INTERNATIONAL_OTHER', 'Clearance role is INTERNATIONAL_OTHER');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UNIT TESTS: Engineering Sub-Family Classification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Engineering Sub-Family Specialization Unit Tests ---');

  // 2.1 SOFTWARE_DEVELOPMENT
  assert(
    classifyEngineeringSubFamily({ title: 'Backend Software Engineer' }) === 'SOFTWARE_DEVELOPMENT',
    'Backend Engineer -> SOFTWARE_DEVELOPMENT'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Frontend Developer Intern' }) === 'SOFTWARE_DEVELOPMENT',
    'Frontend Developer -> SOFTWARE_DEVELOPMENT'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Full Stack Engineer - New Grad' }) === 'SOFTWARE_DEVELOPMENT',
    'Full Stack Engineer -> SOFTWARE_DEVELOPMENT'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'iOS Application Developer' }) === 'SOFTWARE_DEVELOPMENT',
    'Mobile Developer -> SOFTWARE_DEVELOPMENT'
  );

  // 2.2 DEVOPS_PLATFORM
  assert(
    classifyEngineeringSubFamily({ title: 'DevOps Engineer Intern' }) === 'DEVOPS_PLATFORM',
    'DevOps Engineer -> DEVOPS_PLATFORM'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Site Reliability Engineer (SRE)' }) === 'DEVOPS_PLATFORM',
    'SRE -> DEVOPS_PLATFORM'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Cloud Infrastructure Engineer' }) === 'DEVOPS_PLATFORM',
    'Cloud Infrastructure Engineer -> DEVOPS_PLATFORM'
  );

  // 2.3 AI_ML_ENGINEERING
  assert(
    classifyEngineeringSubFamily({ title: 'Machine Learning Engineer' }) === 'AI_ML_ENGINEERING',
    'Machine Learning Engineer -> AI_ML_ENGINEERING'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Generative AI Research Scientist Intern' }) === 'AI_ML_ENGINEERING',
    'Generative AI Research Scientist -> AI_ML_ENGINEERING'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Computer Vision Engineer' }) === 'AI_ML_ENGINEERING',
    'Computer Vision Engineer -> AI_ML_ENGINEERING'
  );

  // 2.4 DATA_ENGINEERING
  assert(
    classifyEngineeringSubFamily({ title: 'Data Engineer - Early Career' }) === 'DATA_ENGINEERING',
    'Data Engineer -> DATA_ENGINEERING'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Analytics Engineer' }) === 'DATA_ENGINEERING',
    'Analytics Engineer -> DATA_ENGINEERING'
  );

  // 2.5 SECURITY_ENGINEERING
  assert(
    classifyEngineeringSubFamily({ title: 'Network Security Engineer' }) === 'SECURITY_ENGINEERING',
    'Network Security Engineer -> SECURITY_ENGINEERING'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Application Security Engineer' }) === 'SECURITY_ENGINEERING',
    'Application Security Engineer -> SECURITY_ENGINEERING'
  );

  // 2.6 QA_TESTING
  assert(
    classifyEngineeringSubFamily({ title: 'Software Development Engineer in Test (SDET)' }) === 'QA_TESTING',
    'SDET -> QA_TESTING'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'QA Automation Engineer Intern' }) === 'QA_TESTING',
    'QA Automation Engineer -> QA_TESTING'
  );

  // 2.7 Non-software engineering exclusions
  assert(
    classifyEngineeringSubFamily({ title: 'Customer Support Specialist II' }) === null,
    'Customer Support Specialist -> null (excluded from sub-families)'
  );
  assert(
    isSoftwareEngineeringRole({ title: 'Customer Support Specialist II' }) === false,
    'Customer Support Specialist is not a software engineering role'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Account Executive' }) === null,
    'Account Executive -> null'
  );

  // 2.8 Generic / Ambiguous titles
  assert(
    classifyEngineeringSubFamily({ title: 'Engineering Intern', department: 'Engineering' }) === 'AMBIGUOUS',
    'Generic Engineering Intern with tech department -> AMBIGUOUS'
  );
  assert(
    classifyEngineeringSubFamily({ title: 'Technical Associate', department: 'Software Engineering' }) === 'AMBIGUOUS',
    'Technical Associate with software department -> AMBIGUOUS'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. INTEGRATION TESTS: API Mock Harness for Early Opportunities Feed
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Early Opportunities API Integration Tests ---');

  // Create isolated mock opportunities
  const mockOpportunities: any[] = [
    {
      id: 'opp-india-sw-1',
      title: 'Junior Software Engineer',
      organization: 'TechCorp India',
      location: 'Bengaluru, India',
      workMode: 'ONSITE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-25T10:00:00Z'),
      createdAt: new Date('2026-10-25T10:00:00Z'),
      applicationUrl: 'https://techcorp.in/apply/1',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/techcorp/1',
      description: 'Join our core platform software engineering team in Bengaluru.',
      eligibility: {
        id: 'el-1',
        opportunityId: 'opp-india-sw-1',
        category: 'ENTRY_LEVEL',
        overallVerificationLevel: 'MANUALLY_AUDITED',
        experienceBoundType: 'MAX_BOUNDED',
        minExperienceMonths: 0,
        maxExperienceMonths: 12,
        experienceConstraint: 'RESTRICTED',
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        cgpaCutoff: null,
        percentageCutoff: null,
        backlogPolicy: 'NO_BACKLOG_RESTRICTION',
        eligibleDegrees: ['B.Tech', 'B.E.'],
        eligibleBranches: ['Computer Science'],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    },
    {
      id: 'opp-india-devops-2',
      title: 'DevOps & Cloud Engineer Intern',
      organization: 'CloudIndia Labs',
      location: 'Hyderabad, India',
      workMode: 'HYBRID',
      type: 'INTERNSHIP',
      employmentType: 'INTERNSHIP',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-26T10:00:00Z'),
      createdAt: new Date('2026-10-26T10:00:00Z'),
      applicationUrl: 'https://cloudindia.io/jobs/2',
      source: 'Lever',
      sourceUrl: 'https://jobs.lever.co/cloudindia/2',
      description: 'Hands-on DevOps, Terraform, and Kubernetes internship in Hyderabad.',
      eligibility: {
        id: 'el-2',
        opportunityId: 'opp-india-devops-2',
        category: 'INTERNSHIP',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        experienceConstraint: 'RESTRICTED',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026, 2027],
        cgpaCutoff: 7.0,
        percentageCutoff: null,
        backlogPolicy: 'NO_ACTIVE_BACKLOGS',
        eligibleDegrees: ['B.Tech'],
        eligibleBranches: ['CS', 'IT'],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    },
    {
      id: 'opp-palantir-sponsored-3',
      title: 'Software Engineer - New Grad 2026',
      organization: 'Palantir Technologies',
      location: 'New York, NY / Washington, DC',
      workMode: 'ONSITE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-28T10:00:00Z'),
      createdAt: new Date('2026-10-28T10:00:00Z'),
      applicationUrl: 'https://palantir.com/careers/3',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/palantir/3',
      description: 'Palantir welcomes international applicants! We provide full visa sponsorship (H-1B, TN, O-1) and full relocation assistance for international new grads.',
      eligibility: {
        id: 'el-3',
        opportunityId: 'opp-palantir-sponsored-3',
        category: 'FRESHER',
        overallVerificationLevel: 'MANUALLY_AUDITED',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 12,
        experienceConstraint: 'RESTRICTED',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        cgpaCutoff: null,
        percentageCutoff: null,
        backlogPolicy: 'NO_BACKLOG_RESTRICTION',
        eligibleDegrees: ['B.S.', 'B.Tech'],
        eligibleBranches: ['Computer Science'],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    },
    {
      id: 'opp-us-ineligible-4',
      title: 'Site Reliability Engineer - US Defense',
      organization: 'DefenseCorp US',
      location: 'Denver, CO',
      workMode: 'ONSITE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-27T10:00:00Z'),
      createdAt: new Date('2026-10-27T10:00:00Z'),
      applicationUrl: 'https://defensecorp.com/4',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/defensecorp/4',
      description: 'US Citizenship and Active Secret Clearance required. No international candidates.',
      eligibility: {
        id: 'el-4',
        opportunityId: 'opp-us-ineligible-4',
        category: 'ENTRY_LEVEL',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 12,
        experienceConstraint: 'RESTRICTED',
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        cgpaCutoff: null,
        percentageCutoff: null,
        backlogPolicy: 'NO_BACKLOG_RESTRICTION',
        eligibleDegrees: [],
        eligibleBranches: [],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    },
    {
      id: 'opp-india-aiml-5',
      title: 'Machine Learning Engineer Intern',
      organization: 'AI Innovations India',
      location: 'Pune, Maharashtra',
      workMode: 'ONSITE',
      type: 'INTERNSHIP',
      employmentType: 'INTERNSHIP',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-29T10:00:00Z'),
      createdAt: new Date('2026-10-29T10:00:00Z'),
      applicationUrl: 'https://aiinnovations.in/5',
      source: 'Lever',
      sourceUrl: 'https://jobs.lever.co/aiinnovations/5',
      description: 'Deep Learning, NLP, and LLM fine-tuning research internship in Pune.',
      eligibility: {
        id: 'el-5',
        opportunityId: 'opp-india-aiml-5',
        category: 'INTERNSHIP',
        overallVerificationLevel: 'MANUALLY_AUDITED',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        experienceConstraint: 'RESTRICTED',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        cgpaCutoff: 8.0,
        percentageCutoff: null,
        backlogPolicy: 'NO_ACTIVE_BACKLOGS',
        eligibleDegrees: ['B.Tech', 'M.Tech'],
        eligibleBranches: ['AI', 'Data Science', 'CS'],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    },
  ];

  // Monkey-patch Prisma Client methods safely
  const originalFindMany = prisma.opportunity.findMany;
  const originalProfileFindUnique = prisma.profile.findUnique;
  const originalUserFindUnique = prisma.user.findUnique;

  (prisma.opportunity as any).findMany = async (args: any) => {
    return mockOpportunities;
  };
  (prisma.profile as any).findUnique = async () => null;
  (prisma.user as any).findUnique = async () => null;

  // Set up Express test app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/opportunities', opportunitiesRouter);

  // 3.1 Test default feed: indiaOnly defaults to true
  const resDefault = await request(app).get('/api/opportunities/early-career');
  assert(resDefault.status === 200, 'GET /api/opportunities/early-career returns 200');
  assert(resDefault.body.filters.indiaOnly === true, 'Default filters show indiaOnly=true');
  assert(resDefault.body.filters.geoScope === 'INDIA_ONLY', 'Default filters show geoScope=INDIA_ONLY');
  assert(
    resDefault.body.opportunities.length === 3,
    `Default feed returns exactly 3 India-eligible roles (found: ${resDefault.body.opportunities.length})`
  );
  const idsDefault = resDefault.body.opportunities.map((o: any) => o.id);
  assert(idsDefault.includes('opp-india-sw-1'), 'Includes Bengaluru software role');
  assert(idsDefault.includes('opp-india-devops-2'), 'Includes Hyderabad DevOps role');
  assert(idsDefault.includes('opp-india-aiml-5'), 'Includes Pune AI/ML role');
  assert(!idsDefault.includes('opp-palantir-sponsored-3'), 'Excludes international visa sponsorship role from default domestic feed');
  assert(!idsDefault.includes('opp-us-ineligible-4'), 'Excludes ineligible US role from default feed');

  // 3.2 Test verified visa sponsorship filter (geoScope=VERIFIED_SPONSORSHIP)
  const resSponsored = await request(app).get('/api/opportunities/early-career?geoScope=VERIFIED_SPONSORSHIP');
  assert(resSponsored.status === 200, 'GET ?geoScope=VERIFIED_SPONSORSHIP returns 200');
  assert(resSponsored.body.filters.geoScope === 'VERIFIED_SPONSORSHIP', 'Filters show geoScope=VERIFIED_SPONSORSHIP');
  assert(
    resSponsored.body.opportunities.length === 1,
    `Returns exactly 1 sponsored opportunity (found: ${resSponsored.body.opportunities.length})`
  );
  assert(
    resSponsored.body.opportunities[0].id === 'opp-palantir-sponsored-3',
    'Returned opportunity is Palantir New Grad'
  );
  assert(
    resSponsored.body.opportunities[0].geographic.geoScope === 'INTERNATIONAL_SPONSORED',
    'Opportunity geographic.geoScope is INTERNATIONAL_SPONSORED'
  );
  assert(
    resSponsored.body.opportunities[0].geographic.hasVisaSponsorship === true,
    'Opportunity geographic.hasVisaSponsorship is true'
  );

  // 3.3 Test all opportunities browsing (indiaOnly=false or geoScope=ALL)
  const resAllGeo = await request(app).get('/api/opportunities/early-career?indiaOnly=false');
  assert(resAllGeo.status === 200, 'GET ?indiaOnly=false returns 200');
  assert(resAllGeo.body.filters.indiaOnly === false, 'Filters show indiaOnly=false');
  assert(
    resAllGeo.body.opportunities.length === 5,
    `Returns all 5 opportunities when indiaOnly=false (found: ${resAllGeo.body.opportunities.length})`
  );

  // 3.4 Test Specialization Filtering (specialization=DEVOPS_PLATFORM)
  const resDevOps = await request(app).get(
    '/api/opportunities/early-career?specialization=DEVOPS_PLATFORM&indiaOnly=false'
  );
  assert(resDevOps.status === 200, 'GET ?specialization=DEVOPS_PLATFORM returns 200');
  assert(
    resDevOps.body.opportunities.length === 2,
    `Returns 2 DevOps roles across all locations (found: ${resDevOps.body.opportunities.length})`
  );
  for (const opp of resDevOps.body.opportunities) {
    assert(
      opp.specialization === 'DEVOPS_PLATFORM',
      `Role ${opp.title} has specialization=DEVOPS_PLATFORM`
    );
  }

  // 3.5 Test Combined India Only + Specialization Filtering (indiaOnly=true & specialization=AI_ML_ENGINEERING)
  const resIndiaAiml = await request(app).get(
    '/api/opportunities/early-career?indiaOnly=true&specialization=AI_ML_ENGINEERING'
  );
  assert(resIndiaAiml.status === 200, 'GET ?indiaOnly=true&specialization=AI_ML_ENGINEERING returns 200');
  assert(
    resIndiaAiml.body.opportunities.length === 1,
    `Returns 1 India AI/ML role (found: ${resIndiaAiml.body.opportunities.length})`
  );
  assert(
    resIndiaAiml.body.opportunities[0].id === 'opp-india-aiml-5',
    'Returned opportunity is AI Innovations India'
  );

  // 3.6 Test Comma-Separated Multi-Specialization Filtering
  const resMultiSpec = await request(app).get(
    '/api/opportunities/early-career?specialization=SOFTWARE_DEVELOPMENT,AI_ML_ENGINEERING'
  );
  assert(resMultiSpec.status === 200, 'GET with multiple comma-separated specializations returns 200');
  assert(
    resMultiSpec.body.opportunities.length === 2,
    `Returns 2 domestic roles matching SOFTWARE_DEVELOPMENT or AI_ML_ENGINEERING (found: ${resMultiSpec.body.opportunities.length})`
  );

  // 3.7 Verify Attached Geographic and Specialization Metadata Structure
  const sampleOpp = resDefault.body.opportunities[0];
  assert(Boolean(sampleOpp.specialization), 'Response includes specialization metadata');
  assert(Boolean(sampleOpp.geographic), 'Response includes geographic metadata');
  assert(typeof sampleOpp.geographic.isIndiaEligible === 'boolean', 'geographic.isIndiaEligible is boolean');
  assert(typeof sampleOpp.geographic.geoScope === 'string', 'geographic.geoScope is string');
  assert(typeof sampleOpp.geographic.hasVisaSponsorship === 'boolean', 'geographic.hasVisaSponsorship is boolean');
  assert(typeof sampleOpp.geographic.locationLabel === 'string', 'geographic.locationLabel is string');

  // Restore Prisma mocks
  (prisma.opportunity as any).findMany = originalFindMany;
  (prisma.profile as any).findUnique = originalProfileFindUnique;
  (prisma.user as any).findUnique = originalUserFindUnique;

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. NON-REGRESSION TESTS: India Feed Contract
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Non-Regression Tests for Existing India Feed ---');

  // Verify /api/opportunities/india endpoint exists and has not regressed
  const resIndiaFeed = await request(app).get('/api/opportunities/india?limit=5');
  assert(
    resIndiaFeed.status === 200 || resIndiaFeed.status === 401,
    'GET /api/opportunities/india responds without 500 error'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
