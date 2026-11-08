/**
 * M2.7: Early Opportunities Feed + Matching Integration Test Suite
 *
 * Comprehensive tests for:
 * - Dedicated Early Opportunities Feed endpoint (GET /api/opportunities/early-career)
 * - Persisted early-career category inclusions (INTERNSHIP, FRESHER, GRADUATE_TRAINEE, ENTRY_LEVEL, JUNIOR)
 * - Exclusion of UNKNOWN, NOT_EARLY_CAREER, and opportunities without eligibility
 * - Anonymous browsing (public access with null candidate eligibility & null match)
 * - Authenticated personalized feed (evaluating eligibility and skill match against profile)
 * - Incomplete profile handling (browsing allowed, conservative UNKNOWN evaluations)
 * - Orthogonality of skill matching and hard eligibility (100% skill match never overrides NOT_ELIGIBLE)
 * - Multi-tier feed ranking:
 *     1. Verified vs uncertain classifications
 *     2. Candidate eligibility (ELIGIBLE > UNKNOWN > NOT_ELIGIBLE)
 *     3. Skill match percentage
 *     4. Recency & ID stability
 * - Visible NOT_ELIGIBLE opportunities when unfiltered (with full explanations)
 * - Deterministic Graduation Batch filtering (matching RESTRICTED batches + UNRESTRICTED, excluding mismatches)
 * - Search, location, workMode, and skill filter compositions
 * - Application URL validation (hasValidApplicationUrl flag, sanitized null for invalid URLs)
 * - Stable pagination without duplicate opportunities
 * - Candidate profile data isolation (tenant boundary)
 * - Non-regression of existing India feed (GET /api/opportunities/india)
 *
 * STRICT SAFETY: ZERO live database connections or writes. Uses in-memory mock harness.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
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
  console.log('  M2.7: EARLY OPPORTUNITIES FEED + MATCHING INTEGRATION SUITE');
  console.log('================================================================\n');

  // In-memory data stores
  const mockUsers = new Map<string, any>();
  const mockProfiles = new Map<string, any>();
  const mockOpportunities: any[] = [];

  // Monkey-patch Prisma Client methods
  const originalProfileFindUnique = prisma.profile.findUnique;
  const originalUserFindUnique = prisma.user.findUnique;
  const originalOpportunityFindMany = prisma.opportunity.findMany;
  const originalOpportunityFindUnique = prisma.opportunity.findUnique;
  const originalQueryRaw = prisma.$queryRaw;

  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.clerkId) {
      for (const u of mockUsers.values()) {
        if (u.clerkId === where.clerkId) return u;
      }
    }
    if (where.id) return mockUsers.get(where.id) || null;
    return null;
  };

  (prisma.profile as any).findUnique = async ({ where }: any) => {
    return mockProfiles.get(where.userId) || null;
  };

  (prisma.opportunity as any).findUnique = async ({ where }: any) => {
    return mockOpportunities.find((o) => o.id === where.id) || null;
  };

  // Flexible in-memory findMany implementation for Opportunity supporting M2.7 filters
  (prisma.opportunity as any).findMany = async (args?: any) => {
    let results = [...mockOpportunities];

    if (args?.where) {
      const where = args.where;

      // Handle AND conditions
      if (where.AND && Array.isArray(where.AND)) {
        for (const cond of where.AND) {
          // 1. Eligibility category filter
          if (cond.eligibility?.category?.in) {
            const allowed = cond.eligibility.category.in;
            results = results.filter((o) => o.eligibility && allowed.includes(o.eligibility.category));
          }

          // 2. Eligibility batch filter
          if (cond.eligibility?.OR && Array.isArray(cond.eligibility.OR)) {
            results = results.filter((o) => {
              if (!o.eligibility) return false;
              for (const orCond of cond.eligibility.OR) {
                if (orCond.batchConstraint === 'UNRESTRICTED' && o.eligibility.batchConstraint === 'UNRESTRICTED') {
                  return true;
                }
                if (
                  orCond.batchConstraint === 'RESTRICTED' &&
                  orCond.eligibleBatches?.has &&
                  o.eligibility.batchConstraint === 'RESTRICTED' &&
                  Array.isArray(o.eligibility.eligibleBatches) &&
                  o.eligibility.eligibleBatches.includes(orCond.eligibleBatches.has)
                ) {
                  return true;
                }
              }
              return false;
            });
          }

          // 3. WorkMode filter
          if (cond.workMode) {
            results = results.filter((o) => o.workMode === cond.workMode);
          }

          // 4. Location / Title search
          if (cond.OR && cond.OR.some((c: any) => c.location?.contains)) {
            const targetStr = cond.OR.find((c: any) => c.location?.contains)?.location?.contains?.toLowerCase();
            results = results.filter((o) => {
              const locMatch = o.location && o.location.toLowerCase().includes(targetStr);
              const titleMatch = o.title && o.title.toLowerCase().includes(targetStr);
              return locMatch || titleMatch;
            });
          }

          // 5. Text Search (title, organization, description)
          if (cond.OR && cond.OR.some((c: any) => c.description?.contains)) {
            const targetStr = cond.OR.find((c: any) => c.title?.contains)?.title?.contains?.toLowerCase();
            results = results.filter((o) => {
              const t = (o.title || '').toLowerCase();
              const org = (o.organization || '').toLowerCase();
              const d = (o.description || '').toLowerCase();
              return t.includes(targetStr) || org.includes(targetStr) || d.includes(targetStr);
            });
          }

          // 6. Skill filter
          if (cond.opportunitySkills?.some?.skill?.name?.contains) {
            const skillTarget = cond.opportunitySkills.some.skill.name.contains.toLowerCase();
            results = results.filter((o) => {
              return (o.opportunitySkills || []).some(
                (os: any) => os.skill?.name && os.skill.name.toLowerCase().includes(skillTarget)
              );
            });
          }
        }
      }

      // Handle simple where.id.in (used by /india route)
      if (where.id?.in) {
        results = results.filter((o) => where.id.in.includes(o.id));
      }
    }

    return results;
  };

  // Mock queryRaw for /india fallback tests
  (prisma as any).$queryRaw = async (query: any) => {
    // If querying count
    const qStr = String(query?.strings || query || '');
    if (qStr.includes('COUNT(')) {
      return [{ count: mockOpportunities.length }];
    }
    // Return all IDs
    return mockOpportunities.map((o) => ({ id: o.id }));
  };

  // Set up Express app
  const app = express();
  app.use(express.json());

  // Test auth injector: sets req.userId if x-test-user-id header is provided
  app.use((req: any, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-id']) {
      req.userId = String(req.headers['x-test-user-id']);
    }
    next();
  });

  app.use(cookieParser());
  app.use(clerkMiddleware());
  app.use('/api/opportunities', opportunitiesRouter);

  try {
    // ─── Seed Data Setup ─────────────────────────────────────────────────────

    // Candidate 1: 2026 Batch, B.Tech CSE, 8.5 CGPA, 0 backlogs, 0 months exp, React + TypeScript
    const user1Id = 'cand-alice-2026';
    mockUsers.set(user1Id, { id: user1Id, email: 'alice@example.com' });
    mockProfiles.set(user1Id, {
      id: 'prof-alice',
      userId: user1Id,
      fullName: 'Alice Tech',
      university: 'IIT Madras',
      graduationYear: 2026,
      targetRole: 'Software Engineer',
      degree: 'B.Tech',
      branch: 'Computer Science and Engineering',
      cgpa: 8.5,
      cgpaScale: 'SCALE_10_0',
      percentage: 82.0,
      activeBacklogs: 0,
      hasBacklogHistory: false,
      experienceMonths: 0,
      candidateSkills: [
        { skillId: 'sk-react', skill: { id: 'sk-react', name: 'React', category: 'Frontend' } },
        { skillId: 'sk-ts', skill: { id: 'sk-ts', name: 'TypeScript', category: 'Language' } },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'E-commerce Platform',
          projectSkills: [
            { skillId: 'sk-node', skill: { id: 'sk-node', name: 'Node.js', category: 'Backend' } },
          ],
        },
      ],
    });

    // Candidate 2: Incomplete profile (missing academic and experience info)
    const user2Id = 'cand-bob-incomplete';
    mockUsers.set(user2Id, { id: user2Id, email: 'bob@example.com' });
    mockProfiles.set(user2Id, {
      id: 'prof-bob',
      userId: user2Id,
      fullName: 'Bob Learner',
      university: 'State University',
      graduationYear: 2026,
      targetRole: null, // incomplete
      degree: null,
      branch: null,
      cgpa: null,
      cgpaScale: null,
      percentage: null,
      activeBacklogs: null,
      hasBacklogHistory: null,
      experienceMonths: null,
      candidateSkills: [],
      projects: [],
    });

    // Candidate 3: 2023 Batch (Experienced / Senior grad - ineligible for 2026 fresher roles)
    const user3Id = 'cand-charlie-2023';
    mockUsers.set(user3Id, { id: user3Id, email: 'charlie@example.com' });
    mockProfiles.set(user3Id, {
      id: 'prof-charlie',
      userId: user3Id,
      fullName: 'Charlie Senior',
      university: 'BITS Pilani',
      graduationYear: 2023,
      targetRole: 'Software Engineer',
      degree: 'B.Tech',
      branch: 'Computer Science',
      cgpa: 9.0,
      cgpaScale: 'SCALE_10_0',
      activeBacklogs: 0,
      hasBacklogHistory: false,
      experienceMonths: 24,
      candidateSkills: [
        { skillId: 'sk-react', skill: { id: 'sk-react', name: 'React', category: 'Frontend' } },
        { skillId: 'sk-ts', skill: { id: 'sk-ts', name: 'TypeScript', category: 'Language' } },
      ],
      projects: [],
    });

    // Opportunities Setup
    // Opp 1: Verified Fresher 2026 (Alice is ELIGIBLE, High Confidence, High Match)
    mockOpportunities.push({
      id: 'opp-fresher-2026',
      title: 'Graduate Software Engineer - 2026 Batch',
      organization: 'Google India',
      location: 'Bengaluru, India',
      workMode: 'HYBRID',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-25'),
      createdAt: new Date('2026-10-25'),
      applicationUrl: 'https://careers.google.com/jobs/results/12345',
      source: 'GoogleCareers',
      sourceUrl: 'https://careers.google.com/jobs/results/12345',
      eligibility: {
        category: 'FRESHER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.98,
        explanation: 'Explicit 2026 batch fresher requirement with zero experience required.',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        academicConstraint: 'RESTRICTED',
        academicEvaluationMode: 'SINGLE_CRITERION',
        minCgpa: 7.5,
        cgpaScale: 'SCALE_10_0',
        backlogPolicy: 'NO_ACTIVE',
        degreeConstraint: 'RESTRICTED',
        eligibleDegrees: ['BTECH', 'BE'],
        branchConstraint: 'RESTRICTED',
        eligibleBranches: ['CSE', 'IT'],
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [
        { skillId: 'sk-react', requirementType: 'REQUIRED', skill: { id: 'sk-react', name: 'React' } },
        { skillId: 'sk-ts', requirementType: 'REQUIRED', skill: { id: 'sk-ts', name: 'TypeScript' } },
      ],
    });

    // Opp 2: Verified Internship (Experience unspecified, High Confidence)
    mockOpportunities.push({
      id: 'opp-intern-summer',
      title: 'Software Engineering Intern (Summer 2026)',
      organization: 'Microsoft',
      location: 'Hyderabad, India',
      workMode: 'ONSITE',
      type: 'INTERNSHIP',
      employmentType: 'INTERNSHIP',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-28'),
      createdAt: new Date('2026-10-28'),
      applicationUrl: 'https://careers.microsoft.com/us/en/job/67890',
      source: 'MicrosoftCareers',
      sourceUrl: 'https://careers.microsoft.com/us/en/job/67890',
      eligibility: {
        category: 'INTERNSHIP',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.96,
        explanation: 'Explicit 6-month software engineering internship.',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026, 2027],
        experienceConstraint: 'UNKNOWN',
        experienceBoundType: null,
        academicConstraint: 'UNRESTRICTED',
        backlogPolicy: 'UNRESTRICTED',
        degreeConstraint: 'UNRESTRICTED',
        branchConstraint: 'UNRESTRICTED',
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [
        { skillId: 'sk-node', requirementType: 'REQUIRED', skill: { id: 'sk-node', name: 'Node.js' } },
      ],
    });

    // Opp 3: Entry-Level Role with Low/Uncertain Verification (INFERRED_HEURISTIC)
    mockOpportunities.push({
      id: 'opp-entry-inferred',
      title: 'Junior Web Developer',
      organization: 'Startup Labs',
      location: 'Pune, India',
      workMode: 'REMOTE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-29'),
      createdAt: new Date('2026-10-29'),
      applicationUrl: 'https://startuplabs.io/careers/junior-dev',
      source: 'StartupBoard',
      sourceUrl: 'https://startuplabs.io/careers/junior-dev',
      eligibility: {
        category: 'ENTRY_LEVEL',
        overallVerificationLevel: 'INFERRED_HEURISTIC',
        confidence: 0.65,
        explanation: 'Inferred entry level role from title and 0-12 months experience mention.',
        batchConstraint: 'UNRESTRICTED',
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'MAXIMUM_ONLY',
        maxExperienceMonths: 12,
        academicConstraint: 'UNRESTRICTED',
        backlogPolicy: 'UNRESTRICTED',
        degreeConstraint: 'UNRESTRICTED',
        branchConstraint: 'UNRESTRICTED',
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    });

    // Opp 4: Generic SDE-1 Title Classified as UNKNOWN (Must be EXCLUDED from early career feed)
    mockOpportunities.push({
      id: 'opp-generic-unknown',
      title: 'Software Engineer',
      organization: 'Global Corp',
      location: 'Bengaluru, India',
      workMode: 'ONSITE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'MID',
      postedDate: new Date('2026-10-20'),
      createdAt: new Date('2026-10-20'),
      applicationUrl: 'https://globalcorp.com/jobs/111',
      source: 'Greenhouse',
      sourceUrl: 'https://globalcorp.com/jobs/111',
      eligibility: {
        category: 'UNKNOWN',
        overallVerificationLevel: 'UNVERIFIED',
        confidence: 0.2,
        explanation: 'Generic title without early-career eligibility criteria.',
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    });

    // Opp 5: Senior Role Classified as NOT_EARLY_CAREER (Must be EXCLUDED)
    mockOpportunities.push({
      id: 'opp-senior-not-early',
      title: 'Senior Software Engineer (5+ Yrs)',
      organization: 'Amazon India',
      location: 'Hyderabad, India',
      workMode: 'HYBRID',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      postedDate: new Date('2026-10-24'),
      createdAt: new Date('2026-10-24'),
      applicationUrl: 'https://amazon.jobs/en/jobs/222',
      source: 'Amazon',
      sourceUrl: 'https://amazon.jobs/en/jobs/222',
      eligibility: {
        category: 'NOT_EARLY_CAREER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.98,
        explanation: 'Requires 5+ years of experience.',
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    });

    // Opp 6: Legacy Opportunity without persisted eligibility (Must be EXCLUDED)
    mockOpportunities.push({
      id: 'opp-legacy-no-elig',
      title: 'Legacy IT Analyst',
      organization: 'Legacy Systems',
      location: 'Chennai, India',
      workMode: 'ONSITE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-09-01'),
      createdAt: new Date('2026-09-01'),
      applicationUrl: 'https://legacy.com/apply',
      source: 'LegacyBoard',
      sourceUrl: null,
      eligibility: null,
      opportunitySkills: [],
    });

    // Opp 7: Invalid Application URL (javascript: attack / malformed)
    mockOpportunities.push({
      id: 'opp-invalid-url',
      title: 'Graduate Trainee QA',
      organization: 'TestCo',
      location: 'Delhi-NCR, India',
      workMode: 'REMOTE',
      type: 'JOB',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      postedDate: new Date('2026-10-15'),
      createdAt: new Date('2026-10-15'),
      applicationUrl: 'javascript:alert(document.cookie)', // Malicious / invalid
      source: 'TestBoard',
      sourceUrl: null,
      eligibility: {
        category: 'GRADUATE_TRAINEE',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.9,
        explanation: 'Graduate Trainee QA role.',
        batchConstraint: 'UNRESTRICTED',
        experienceConstraint: 'UNRESTRICTED',
        academicConstraint: 'UNRESTRICTED',
        backlogPolicy: 'UNRESTRICTED',
        degreeConstraint: 'UNRESTRICTED',
        branchConstraint: 'UNRESTRICTED',
        hasConflict: false,
        conflictDetails: [],
      },
      opportunitySkills: [],
    });

    // ─── Phase 1: Opportunity Inclusion & Exclusion Rules ────────────────────
    console.log('Test 1: Only early career categories included; UNKNOWN, NOT_EARLY_CAREER, and missing eligibility excluded');
    {
      const res = await request(app).get('/api/opportunities/early-career');
      assert(res.status === 200, `Feed returned 200 OK (got ${res.status})`);
      assert(Array.isArray(res.body.opportunities), 'Response contains opportunities array');

      const returnedIds = res.body.opportunities.map((o: any) => o.id);
      // Included: opp-fresher-2026, opp-intern-summer, opp-entry-inferred, opp-invalid-url
      assert(returnedIds.includes('opp-fresher-2026'), 'Includes verified FRESHER');
      assert(returnedIds.includes('opp-intern-summer'), 'Includes verified INTERNSHIP (even with unspecified experience)');
      assert(returnedIds.includes('opp-entry-inferred'), 'Includes ENTRY_LEVEL opportunity');
      assert(returnedIds.includes('opp-invalid-url'), 'Includes GRADUATE_TRAINEE opportunity');

      // Excluded: opp-generic-unknown, opp-senior-not-early, opp-legacy-no-elig
      assert(!returnedIds.includes('opp-generic-unknown'), 'Strictly EXCLUDES UNKNOWN classification');
      assert(!returnedIds.includes('opp-senior-not-early'), 'Strictly EXCLUDES NOT_EARLY_CAREER');
      assert(!returnedIds.includes('opp-legacy-no-elig'), 'Strictly EXCLUDES opportunities without eligibility record');
    }

    console.log('\nTest 2: Category filter validation');
    {
      // Valid category filter: category=INTERNSHIP
      const resIntern = await request(app).get('/api/opportunities/early-career?category=INTERNSHIP');
      assert(resIntern.status === 200, 'category=INTERNSHIP returned 200');
      assert(resIntern.body.opportunities.length === 1, 'Returns exactly 1 internship');
      assert(resIntern.body.opportunities[0].id === 'opp-intern-summer', 'Returned opp-intern-summer');

      // Invalid category filter: category=NOT_EARLY_CAREER should be rejected with 400
      const resInvalid = await request(app).get('/api/opportunities/early-career?category=NOT_EARLY_CAREER');
      assert(resInvalid.status === 400, 'category=NOT_EARLY_CAREER rejected with 400');
      assert(resInvalid.body.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

      // Invalid category filter: category=UNKNOWN should be rejected with 400
      const resUnknown = await request(app).get('/api/opportunities/early-career?category=UNKNOWN');
      assert(resUnknown.status === 400, 'category=UNKNOWN rejected with 400');
    }

    // ─── Phase 2: Anonymous Browsing Contract ────────────────────────────────
    console.log('\nTest 3: Anonymous browsing returns opportunity data without pretending evaluation occurred');
    {
      const res = await request(app).get('/api/opportunities/early-career');
      assert(res.status === 200, 'Anonymous request succeeded');
      assert(res.body.candidateContext.isAuthenticated === false, 'candidateContext.isAuthenticated is false');
      assert(res.body.candidateContext.hasProfile === false, 'candidateContext.hasProfile is false');

      for (const opp of res.body.opportunities) {
        assert(opp.eligibility === null, `opp ${opp.id} eligibility is null for anonymous browser`);
        assert(opp.match === null, `opp ${opp.id} match is null for anonymous browser`);
        assert(typeof opp.earlyCareer === 'object', `opp ${opp.id} contains structured earlyCareer classification`);
      }
    }

    // ─── Phase 3: Authenticated Personalization & Profile Context ─────────────
    console.log('\nTest 4: Authenticated user (Alice, 2026) receives personalized evaluation and match');
    {
      const res = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user1Id);

      assert(res.status === 200, 'Authenticated request succeeded');
      assert(res.body.candidateContext.isAuthenticated === true, 'candidateContext.isAuthenticated is true');
      assert(res.body.candidateContext.hasProfile === true, 'candidateContext.hasProfile is true');
      assert(res.body.candidateContext.profileComplete === true, 'candidateContext.profileComplete is true');

      const fresherOpp = res.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      assert(Boolean(fresherOpp), 'Fresher opp is in results');
      assert(fresherOpp.eligibility?.overallStatus === 'ELIGIBLE', 'Alice is ELIGIBLE for 2026 fresher role');
      assert(fresherOpp.eligibility.criteria.graduationBatch.status === 'ELIGIBLE', 'Batch is ELIGIBLE');
      assert(fresherOpp.eligibility.criteria.academics.status === 'ELIGIBLE', 'Academics is ELIGIBLE (8.5 >= 7.5)');
      assert(fresherOpp.eligibility.criteria.degree.status === 'ELIGIBLE', 'Degree is ELIGIBLE (B.Tech matches BTECH)');
      assert(fresherOpp.eligibility.criteria.branch.status === 'ELIGIBLE', 'Branch is ELIGIBLE (CSE matches CSE)');

      // Skill match: Alice has React and TypeScript, both required -> score = 100
      assert(fresherOpp.match?.hasStructuredRequirements === true, 'Opp has structured requirements');
      assert(fresherOpp.match?.score === 100, 'Skill match score is 100%');
      assert(fresherOpp.match.matchedSkills.includes('React'), 'Matched React');
      assert(fresherOpp.match.matchedSkills.includes('TypeScript'), 'Matched TypeScript');
      assert(fresherOpp.match.missingSkills.length === 0, 'No missing skills');
    }

    console.log('\nTest 5: Incomplete candidate profile (Bob) allows browsing with conservative UNKNOWN evaluations');
    {
      const res = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user2Id);

      assert(res.status === 200, 'Incomplete profile request succeeded');
      assert(res.body.candidateContext.isAuthenticated === true, 'Authenticated is true');
      assert(res.body.candidateContext.hasProfile === true, 'hasProfile is true');
      assert(res.body.candidateContext.profileComplete === false, 'profileComplete is false (targetRole null)');

      const fresherOpp = res.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      // Bob has graduationYear: 2026, but missing academic and degree facts
      assert(fresherOpp.eligibility?.overallStatus === 'UNKNOWN', 'Incomplete profile yields UNKNOWN overall');
      assert(fresherOpp.eligibility.criteria.graduationBatch.status === 'ELIGIBLE', 'Batch evaluated to ELIGIBLE (2026 matches)');
      assert(fresherOpp.eligibility.criteria.academics.status === 'UNKNOWN', 'Missing academics is UNKNOWN');
      assert(fresherOpp.eligibility.criteria.degree.status === 'UNKNOWN', 'Missing degree is UNKNOWN');
    }

    // ─── Phase 4: Skill Match and Eligibility Separation ──────────────────────
    console.log('\nTest 6: High skill match NEVER overrides NOT_ELIGIBLE (Charlie, 2023 grad)');
    {
      // Charlie has 100% skill match for React + TypeScript, but graduation batch is 2023 (opp requires 2026)
      const res = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user3Id);

      const fresherOpp = res.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      assert(Boolean(fresherOpp), 'Opp is returned');
      assert(fresherOpp.eligibility?.overallStatus === 'NOT_ELIGIBLE', 'Charlie is strictly NOT_ELIGIBLE');
      assert(fresherOpp.eligibility.criteria.graduationBatch.status === 'NOT_ELIGIBLE', 'Batch criterion failed');
      assert(fresherOpp.match?.score === 100, 'Skill match score is 100%');
      assert(
        fresherOpp.eligibility.overallStatus !== 'ELIGIBLE',
        'Invariance confirmed: 100% skill match did NOT override NOT_ELIGIBLE'
      );
    }

    // ─── Phase 5: Multi-Tier Feed Ranking ────────────────────────────────────
    console.log('\nTest 7: Feed Ranking: Verified before uncertain, ELIGIBLE before UNKNOWN/NOT_ELIGIBLE');
    {
      // Alice request:
      // opp-fresher-2026: AUTOMATED_HIGH_CONFIDENCE (tier 1), ELIGIBLE (tier 1), Match 100%
      // opp-intern-summer: AUTOMATED_HIGH_CONFIDENCE (tier 1), ELIGIBLE (tier 1), Match 100% (Node.js via project)
      // opp-invalid-url: AUTOMATED_HIGH_CONFIDENCE (tier 1), ELIGIBLE (tier 1), Match null
      // opp-entry-inferred: INFERRED_HEURISTIC (tier 2), ELIGIBLE (tier 1), Match null
      const res = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user1Id);

      const opps = res.body.opportunities;
      const indexOfFresher = opps.findIndex((o: any) => o.id === 'opp-fresher-2026');
      const indexOfInferred = opps.findIndex((o: any) => o.id === 'opp-entry-inferred');

      assert(indexOfFresher < indexOfInferred, 'High-confidence opp ranked ahead of INFERRED_HEURISTIC opp');

      // For Charlie (opp-fresher-2026 is NOT_ELIGIBLE, opp-intern-summer is NOT_ELIGIBLE (requires 2026/2027), opp-entry-inferred is ELIGIBLE)
      const resCharlie = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user3Id);

      // Verify NOT_ELIGIBLE opp is NOT hidden when user has not filtered by eligibility
      const charlieFresher = resCharlie.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      assert(Boolean(charlieFresher), 'NOT_ELIGIBLE opp is NOT hidden in default browsing');
      assert(charlieFresher.eligibility.overallStatus === 'NOT_ELIGIBLE', 'Shows reason for ineligibility');
    }

    // ─── Phase 6: Graduation Batch & Filter Compositions ──────────────────────
    console.log('\nTest 8: Graduation Batch filter (batch=2026)');
    {
      const res2026 = await request(app).get('/api/opportunities/early-career?batch=2026');
      assert(res2026.status === 200, 'batch=2026 succeeded');
      const ids = res2026.body.opportunities.map((o: any) => o.id);
      // opp-fresher-2026 (eligibleBatches: [2026]) -> Included
      // opp-intern-summer (eligibleBatches: [2026, 2027]) -> Included
      // opp-entry-inferred (batchConstraint: UNRESTRICTED) -> Included
      // opp-invalid-url (batchConstraint: UNRESTRICTED) -> Included
      assert(ids.includes('opp-fresher-2026'), 'Includes opp with eligible batch 2026');
      assert(ids.includes('opp-intern-summer'), 'Includes intern with 2026');
      assert(ids.includes('opp-entry-inferred'), 'Includes unrestricted batch opp');

      // Invalid non-integer batch
      const resBadBatch = await request(app).get('/api/opportunities/early-career?batch=grad-year');
      assert(resBadBatch.status === 400, 'Non-integer batch rejected with 400');
    }

    console.log('\nTest 9: Location, WorkMode, Search and Skill filter composition');
    {
      // Location filter: Bengaluru
      const resBlr = await request(app).get('/api/opportunities/early-career?city=Bengaluru');
      assert(resBlr.status === 200, 'City Bengaluru succeeded');
      for (const o of resBlr.body.opportunities) {
        assert(o.location.includes('Bengaluru'), `Opp ${o.id} is in Bengaluru`);
      }

      // WorkMode filter: REMOTE
      const resRemote = await request(app).get('/api/opportunities/early-career?workMode=REMOTE');
      assert(resRemote.status === 200, 'workMode=REMOTE succeeded');
      for (const o of resRemote.body.opportunities) {
        assert(o.workMode === 'REMOTE', `Opp ${o.id} is REMOTE`);
      }

      // Search filter: "Summer"
      const resSearch = await request(app).get('/api/opportunities/early-career?search=Summer');
      assert(resSearch.status === 200, 'Search succeeded');
      assert(resSearch.body.opportunities.length === 1, 'Only 1 result for Summer');
      assert(resSearch.body.opportunities[0].id === 'opp-intern-summer', 'Matched opp-intern-summer');

      // Skill filter: "React"
      const resSkill = await request(app).get('/api/opportunities/early-career?skill=React');
      assert(resSkill.status === 200, 'Skill filter succeeded');
      assert(resSkill.body.opportunities.some((o: any) => o.id === 'opp-fresher-2026'), 'Matched React opp');
    }

    console.log('\nTest 10: Explicit Eligibility filter (eligibility=ELIGIBLE)');
    {
      // Unauthenticated request with eligibility filter should return 401
      const resAnonElig = await request(app).get('/api/opportunities/early-career?eligibility=ELIGIBLE');
      assert(resAnonElig.status === 401, 'Anonymous eligibility filter returns 401');

      // Alice with eligibility=ELIGIBLE
      const resAliceElig = await request(app)
        .get('/api/opportunities/early-career?eligibility=ELIGIBLE')
        .set('x-test-user-id', user1Id);
      assert(resAliceElig.status === 200, 'Alice eligibility filter succeeded');
      for (const o of resAliceElig.body.opportunities) {
        assert(o.eligibility.overallStatus === 'ELIGIBLE', `Opp ${o.id} is ELIGIBLE`);
      }

      // Charlie with eligibility=ELIGIBLE (opp-fresher-2026 must be excluded)
      const resCharlieElig = await request(app)
        .get('/api/opportunities/early-career?eligibility=ELIGIBLE')
        .set('x-test-user-id', user3Id);
      const charlieIds = resCharlieElig.body.opportunities.map((o: any) => o.id);
      assert(!charlieIds.includes('opp-fresher-2026'), 'Ineligible opp filtered out when eligibility=ELIGIBLE');
    }

    // ─── Phase 7: Application URL Integrity & Sanitization ────────────────────
    console.log('\nTest 11: Application URL validation & sanitization');
    {
      const res = await request(app).get('/api/opportunities/early-career');
      const validOpp = res.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      assert(validOpp.hasValidApplicationUrl === true, 'Confirmed valid URL has hasValidApplicationUrl: true');
      assert(validOpp.applicationUrl.startsWith('https://'), 'Valid HTTPS applicationUrl preserved');

      const invalidOpp = res.body.opportunities.find((o: any) => o.id === 'opp-invalid-url');
      assert(invalidOpp.hasValidApplicationUrl === false, 'Invalid javascript: URL has hasValidApplicationUrl: false');
      assert(invalidOpp.applicationUrl === null, 'Invalid applicationUrl sanitized to null');
    }

    // ─── Phase 8: Pagination Stability & Non-Duplication ─────────────────────
    console.log('\nTest 12: Pagination stability (page 1 and page 2 are disjoint)');
    {
      const resPage1 = await request(app).get('/api/opportunities/early-career?limit=2&page=1');
      const resPage2 = await request(app).get('/api/opportunities/early-career?limit=2&page=2');

      assert(resPage1.body.opportunities.length === 2, 'Page 1 has 2 items');
      assert(resPage2.body.opportunities.length === 2, 'Page 2 has 2 items');

      const idsPage1 = new Set(resPage1.body.opportunities.map((o: any) => o.id));
      for (const o of resPage2.body.opportunities) {
        assert(!idsPage1.has(o.id), `Page 2 item ${o.id} is not in Page 1 (no duplicates across pages)`);
      }

      assert(resPage1.body.pagination.total === 4, 'Total opportunities count is 4');
      assert(resPage1.body.pagination.totalPages === 2, 'Total pages is 2');
    }

    // ─── Phase 9: Candidate Isolation ─────────────────────────────────────────
    console.log('\nTest 13: Candidate Isolation across different users');
    {
      const resAlice = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user1Id);
      const resCharlie = await request(app)
        .get('/api/opportunities/early-career')
        .set('x-test-user-id', user3Id);

      const aliceFresher = resAlice.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');
      const charlieFresher = resCharlie.body.opportunities.find((o: any) => o.id === 'opp-fresher-2026');

      assert(aliceFresher.eligibility.overallStatus === 'ELIGIBLE', 'Alice evaluation is ELIGIBLE');
      assert(charlieFresher.eligibility.overallStatus === 'NOT_ELIGIBLE', 'Charlie evaluation is NOT_ELIGIBLE');
      assert(resAlice.body.candidateContext.profileComplete === true, 'Alice profile complete');
    }

    // ─── Phase 10: Non-Regression of Existing India Feed ──────────────────────
    console.log('\nTest 14: Existing /api/opportunities/india feed remains functional');
    {
      const resIndia = await request(app).get('/api/opportunities/india');
      assert(resIndia.status === 200, `India feed returned 200 OK (got ${resIndia.status})`);
      assert(Array.isArray(resIndia.body.opportunities), 'India feed returns opportunities array');
      assert(typeof resIndia.body.filters === 'object', 'India feed returns filters object');
      assert(typeof resIndia.body.pagination === 'object', 'India feed returns pagination object');
    }

  } finally {
    // Restore original Prisma methods
    (prisma.profile as any).findUnique = originalProfileFindUnique;
    (prisma.user as any).findUnique = originalUserFindUnique;
    (prisma.opportunity as any).findMany = originalOpportunityFindMany;
    (prisma.opportunity as any).findUnique = originalOpportunityFindUnique;
    (prisma as any).$queryRaw = originalQueryRaw;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
