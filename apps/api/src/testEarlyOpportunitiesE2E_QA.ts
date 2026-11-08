/**
 * M2.9: Early Opportunities End-to-End QA and Data-Quality Audit Suite
 *
 * Exhaustive QA verification covering:
 * 1. Anonymous vs Authenticated Access & Permissions
 * 2. API Integration across all Query Parameters & Edge Cases
 * 3. Eligibility Correctness & Decision Matrix (ELIGIBLE, NOT_ELIGIBLE, UNKNOWN, Conflicts, Stale Audits)
 * 4. Strict Invariance Rule (100% Skill Match NEVER overrides NOT_ELIGIBLE)
 * 5. Application URL Integrity & Defense
 * 6. Non-regression of existing routes (/opportunities, /opportunities/india, /:id, /:id/eligibility)
 * 7. Read-only Data Quality Audit & Schema Limitation Reporting
 *
 * STRICT SAFETY CONSTRAINTS:
 * - Read-only execution.
 * - Zero database writes.
 * - Zero Prisma migrations or schema mutations.
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
import { isValidHttpUrl } from './lib/opportunityProvider';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
    failures.push(message);
  }
}

async function runQASuite() {
  console.log('\n================================================================');
  console.log('  M2.9: EARLY OPPORTUNITIES END-TO-END QA & DATA AUDIT SUITE');
  console.log('================================================================\n');

  // In-memory mock repositories
  const mockUsers = new Map<string, any>();
  const mockProfiles = new Map<string, any>();
  const mockOpportunities: any[] = [];

  // Seed Candidates
  // Candidate 1: Alice - 2026 Grad, B.Tech CSE, 8.5 CGPA, 0 backlogs, 0 months exp, React + TypeScript skills
  mockUsers.set('user-alice', { id: 'user-alice', clerkId: 'clerk-alice', email: 'alice@example.com' });
  mockProfiles.set('user-alice', {
    id: 'prof-alice',
    userId: 'user-alice',
    fullName: 'Alice Candidate',
    university: 'National Institute of Technology',
    graduationYear: 2026,
    degree: 'B.Tech',
    branch: 'CSE',
    cgpa: 8.5,
    cgpaScale: 'SCALE_10_0',
    percentage: 85.0,
    activeBacklogs: 0,
    hasBacklogHistory: false,
    experienceMonths: 0,
    targetRole: 'Software Engineer',
    profileComplete: true,
    candidateSkills: [
      { id: 'cs-1', profileId: 'prof-alice', skillId: 'skill-react', skill: { id: 'skill-react', name: 'React' } },
      { id: 'cs-2', profileId: 'prof-alice', skillId: 'skill-ts', skill: { id: 'skill-ts', name: 'TypeScript' } },
    ],
    projects: [],
  });

  // Candidate 2: Bob - Incomplete profile (missing academics, backlogs, targetRole)
  mockUsers.set('user-bob', { id: 'user-bob', clerkId: 'clerk-bob', email: 'bob@example.com' });
  mockProfiles.set('user-bob', {
    id: 'prof-bob',
    userId: 'user-bob',
    fullName: 'Bob Incomplete',
    graduationYear: 2026,
    degree: null,
    branch: null,
    cgpa: null,
    cgpaScale: null,
    percentage: null,
    activeBacklogs: null,
    hasBacklogHistory: null,
    experienceMonths: null,
    targetRole: null,
    profileComplete: false,
    candidateSkills: [],
    projects: [],
  });

  // Candidate 3: Charlie - 2023 Grad (Ineligible for 2026 Fresher), but has 100% skill match
  mockUsers.set('user-charlie', { id: 'user-charlie', clerkId: 'clerk-charlie', email: 'charlie@example.com' });
  mockProfiles.set('user-charlie', {
    id: 'prof-charlie',
    userId: 'user-charlie',
    fullName: 'Charlie Senior',
    university: 'Test Tech University',
    graduationYear: 2023,
    degree: 'B.Tech',
    branch: 'CSE',
    cgpa: 9.0,
    cgpaScale: 'SCALE_10_0',
    percentage: 90.0,
    activeBacklogs: 0,
    hasBacklogHistory: false,
    experienceMonths: 24,
    targetRole: 'Senior Engineer',
    profileComplete: true,
    candidateSkills: [
      { id: 'cs-3', profileId: 'prof-charlie', skillId: 'skill-react', skill: { id: 'skill-react', name: 'React' } },
      { id: 'cs-4', profileId: 'prof-charlie', skillId: 'skill-ts', skill: { id: 'skill-ts', name: 'TypeScript' } },
    ],
    projects: [],
  });

  // Candidate 4: Dave - 2026 Grad, but has active backlogs and low CGPA
  mockUsers.set('user-dave', { id: 'user-dave', clerkId: 'clerk-dave', email: 'dave@example.com' });
  mockProfiles.set('user-dave', {
    id: 'prof-dave',
    userId: 'user-dave',
    fullName: 'Dave Backlog',
    university: 'Test Tech University',
    graduationYear: 2026,
    degree: 'B.Tech',
    branch: 'CSE',
    cgpa: 6.2,
    cgpaScale: 'SCALE_10_0',
    percentage: 62.0,
    activeBacklogs: 2,
    hasBacklogHistory: true,
    experienceMonths: 0,
    targetRole: 'Junior Developer',
    profileComplete: true,
    candidateSkills: [],
    projects: [],
  });

  // Seed Opportunities Catalog (Diverse types and constraints)
  mockOpportunities.push(
    // 1. High-Confidence Verified Fresher (Eligible for Alice, Ineligible for Charlie & Dave)
    {
      id: 'opp-fresher-bengaluru',
      title: 'Graduate Software Engineer - 2026 Batch',
      organization: 'Acme Corp',
      location: 'Bengaluru, India',
      country: 'India',
      workMode: 'ONSITE',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/acme/jobs/101',
      applicationUrl: 'https://boards.greenhouse.io/acme/jobs/101/apply',
      hasValidApplicationUrl: true,
      description: 'We are hiring 2026 graduates with B.Tech CSE and min 7.5 CGPA. No active backlogs. Tech: React, TypeScript.',
      postedDate: new Date('2026-10-20'),
      createdAt: new Date('2026-10-20'),
      eligibility: {
        id: 'el-fresher',
        opportunityId: 'opp-fresher-bengaluru',
        category: 'FRESHER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.98,
        explanation: 'Fresher role for 2026 batch requiring zero experience.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        relativeCohorts: ['FINAL_YEAR'],
        academicConstraint: 'RESTRICTED',
        academicEvaluationMode: 'SINGLE_CRITERION',
        minCgpa: 7.5,
        cgpaScale: 'SCALE_10_0',
        minPercentage: null,
        backlogPolicy: 'NO_ACTIVE',
        maxBacklogsAllowed: 0,
        eligibleDegrees: ['BTECH'],
        eligibleBranches: ['CSE'],
      },
      opportunitySkills: [
        { id: 'os-1', opportunityId: 'opp-fresher-bengaluru', skillId: 'skill-react', requirementType: 'REQUIRED', skill: { id: 'skill-react', name: 'React' } },
        { id: 'os-2', opportunityId: 'opp-fresher-bengaluru', skillId: 'skill-ts', requirementType: 'REQUIRED', skill: { id: 'skill-ts', name: 'TypeScript' } },
      ],
    },

    // 2. Verified Summer Internship (Unrestricted batch, Open experience)
    {
      id: 'opp-intern-summer',
      title: 'Frontend Engineering Intern',
      organization: 'TechNova Labs',
      location: 'Remote',
      country: 'India',
      workMode: 'REMOTE',
      type: 'INTERNSHIP',
      employmentType: 'INTERNSHIP',
      source: 'Lever',
      sourceUrl: 'https://jobs.lever.co/technova/202',
      applicationUrl: 'https://jobs.lever.co/technova/202/apply',
      hasValidApplicationUrl: true,
      description: 'Summer 2026 internship for pre-final and final year students. React knowledge preferred.',
      postedDate: new Date('2026-10-22'),
      createdAt: new Date('2026-10-22'),
      eligibility: {
        id: 'el-intern',
        opportunityId: 'opp-intern-summer',
        category: 'INTERNSHIP',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.95,
        explanation: 'Summer internship role.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'UNRESTRICTED',
        experienceBoundType: 'UNSPECIFIED',
        minExperienceMonths: null,
        maxExperienceMonths: null,
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        relativeCohorts: ['PRE_FINAL_YEAR', 'FINAL_YEAR'],
        academicConstraint: 'UNRESTRICTED',
        academicEvaluationMode: null,
        minCgpa: null,
        cgpaScale: null,
        minPercentage: null,
        backlogPolicy: 'UNRESTRICTED',
        maxBacklogsAllowed: null,
        eligibleDegrees: [],
        eligibleBranches: [],
      },
      opportunitySkills: [
        { id: 'os-3', opportunityId: 'opp-intern-summer', skillId: 'skill-react', requirementType: 'PREFERRED', skill: { id: 'skill-react', name: 'React' } },
      ],
    },

    // 3. Graduate Trainee with Ambiguous / Unverified Academic requirements
    {
      id: 'opp-graduate-trainee',
      title: 'Graduate Engineer Trainee (GET)',
      organization: 'InfraSys Corp',
      location: 'Pune, India',
      country: 'India',
      workMode: 'HYBRID',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Jobicy',
      sourceUrl: 'https://jobicy.com/jobs/303',
      applicationUrl: 'https://jobicy.com/jobs/303/apply',
      hasValidApplicationUrl: true,
      description: 'GET position for 2025 and 2026 batches. Requires 60% or 6.5 CGPA.',
      postedDate: new Date('2026-10-18'),
      createdAt: new Date('2026-10-18'),
      eligibility: {
        id: 'el-get',
        opportunityId: 'opp-graduate-trainee',
        category: 'GRADUATE_TRAINEE',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.92,
        explanation: 'Graduate Engineer Trainee program.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'NO_EXPERIENCE_REQ',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2025, 2026],
        relativeCohorts: ['FINAL_YEAR'],
        academicConstraint: 'RESTRICTED',
        academicEvaluationMode: 'DISJUNCTIVE_OR',
        minCgpa: 6.5,
        cgpaScale: 'SCALE_10_0',
        minPercentage: 60.0,
        backlogPolicy: 'NO_ACTIVE',
        maxBacklogsAllowed: 0,
        eligibleDegrees: ['BTECH', 'BE'],
        eligibleBranches: ['CSE', 'ECE', 'IT'],
      },
      opportunitySkills: [], // Unstructured skills
    },

    // 4. Entry-Level with Invalid (malicious) Application URL
    {
      id: 'opp-invalid-url',
      title: 'Junior Web Developer',
      organization: 'Sketchy Tech',
      location: 'Remote',
      country: 'India',
      workMode: 'REMOTE',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'SmartRecruiters',
      sourceUrl: 'https://jobs.smartrecruiters.com/404',
      applicationUrl: 'javascript:alert(document.cookie)', // MALICIOUS URL
      hasValidApplicationUrl: false,
      description: 'Entry-level web developer. 0 to 12 months experience.',
      postedDate: new Date('2026-10-15'),
      createdAt: new Date('2026-10-15'),
      eligibility: {
        id: 'el-entry-url',
        opportunityId: 'opp-invalid-url',
        category: 'ENTRY_LEVEL',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.88,
        explanation: 'Entry level role requiring 0-12 months.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'EXACT_RANGE',
        minExperienceMonths: 0,
        maxExperienceMonths: 12,
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        relativeCohorts: [],
        academicConstraint: 'UNRESTRICTED',
        academicEvaluationMode: null,
        minCgpa: null,
        cgpaScale: null,
        minPercentage: null,
        backlogPolicy: 'UNRESTRICTED',
        maxBacklogsAllowed: null,
        eligibleDegrees: [],
        eligibleBranches: [],
      },
      opportunitySkills: [],
    },

    // 5. Inferred Heuristic Junior Role (1-2 yrs)
    {
      id: 'opp-junior-dev',
      title: 'Associate React Developer',
      organization: 'CloudScale Inc',
      location: 'Hyderabad, India',
      country: 'India',
      workMode: 'HYBRID',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/cloudscale/505',
      applicationUrl: 'https://boards.greenhouse.io/cloudscale/505/apply',
      hasValidApplicationUrl: true,
      description: 'Junior developer with 12 to 24 months experience. React knowledge.',
      postedDate: new Date('2026-10-10'),
      createdAt: new Date('2026-10-10'),
      eligibility: {
        id: 'el-junior',
        opportunityId: 'opp-junior-dev',
        category: 'JUNIOR',
        overallVerificationLevel: 'INFERRED_HEURISTIC',
        confidence: 0.75,
        explanation: 'Junior role inferred from 12-24 months experience.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'EXACT_RANGE',
        minExperienceMonths: 12,
        maxExperienceMonths: 24,
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        relativeCohorts: [],
        academicConstraint: 'UNRESTRICTED',
        academicEvaluationMode: null,
        minCgpa: null,
        cgpaScale: null,
        minPercentage: null,
        backlogPolicy: 'UNRESTRICTED',
        maxBacklogsAllowed: null,
        eligibleDegrees: [],
        eligibleBranches: [],
      },
      opportunitySkills: [
        { id: 'os-4', opportunityId: 'opp-junior-dev', skillId: 'skill-react', requirementType: 'REQUIRED', skill: { id: 'skill-react', name: 'React' } },
      ],
    },

    // 6. Conflicting Source Evidence (Material conflict: Senior Title vs Internship body) -> UNKNOWN
    {
      id: 'opp-conflict',
      title: 'Senior Software Engineer Intern',
      organization: 'Glitch Ltd',
      location: 'Bengaluru, India',
      country: 'India',
      workMode: 'ONSITE',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Lever',
      sourceUrl: 'https://jobs.lever.co/glitch/606',
      applicationUrl: 'https://jobs.lever.co/glitch/606/apply',
      hasValidApplicationUrl: true,
      description: 'Material contradiction in source: Title indicates senior position, but body requires internship.',
      postedDate: new Date('2026-10-05'),
      createdAt: new Date('2026-10-05'),
      eligibility: {
        id: 'el-conflict',
        opportunityId: 'opp-conflict',
        category: 'UNKNOWN',
        overallVerificationLevel: 'UNVERIFIED',
        confidence: 0.3,
        explanation: 'Contradiction between title and description.',
        hasConflict: true,
        conflictDetails: 'Material conflict: Title indicates senior position, but description specifies an internship.',
        experienceConstraint: 'UNKNOWN',
        experienceBoundType: 'UNSPECIFIED',
        minExperienceMonths: null,
        maxExperienceMonths: null,
        batchConstraint: 'UNKNOWN',
        eligibleBatches: [],
        relativeCohorts: [],
        academicConstraint: 'UNKNOWN',
        academicEvaluationMode: null,
        minCgpa: null,
        cgpaScale: null,
        minPercentage: null,
        backlogPolicy: 'UNKNOWN',
        maxBacklogsAllowed: null,
        eligibleDegrees: [],
        eligibleBranches: [],
      },
      opportunitySkills: [],
    },

    // 7. Experienced Opportunity (NOT_EARLY_CAREER) -> Strictly Excluded
    {
      id: 'opp-senior-lead',
      title: 'Lead Architect',
      organization: 'Enterprise Co',
      location: 'Bengaluru, India',
      country: 'India',
      workMode: 'ONSITE',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Greenhouse',
      sourceUrl: 'https://boards.greenhouse.io/enterprise/707',
      applicationUrl: 'https://boards.greenhouse.io/enterprise/707/apply',
      hasValidApplicationUrl: true,
      description: 'Requires 8+ years experience in distributed architectures.',
      postedDate: new Date('2026-10-01'),
      createdAt: new Date('2026-10-01'),
      eligibility: {
        id: 'el-senior',
        opportunityId: 'opp-senior-lead',
        category: 'NOT_EARLY_CAREER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        confidence: 0.99,
        explanation: 'Requires 96 months minimum experience.',
        hasConflict: false,
        conflictDetails: null,
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'MINIMUM_ONLY',
        minExperienceMonths: 96,
        maxExperienceMonths: null,
        batchConstraint: 'UNRESTRICTED',
        eligibleBatches: [],
        relativeCohorts: [],
        academicConstraint: 'UNRESTRICTED',
        academicEvaluationMode: null,
        minCgpa: null,
        cgpaScale: null,
        minPercentage: null,
        backlogPolicy: 'UNRESTRICTED',
        maxBacklogsAllowed: null,
        eligibleDegrees: [],
        eligibleBranches: [],
      },
      opportunitySkills: [],
    },

    // 8. Legacy Opportunity WITHOUT eligibility record -> Strictly Excluded
    {
      id: 'opp-legacy-no-elig',
      title: 'Legacy Python Developer',
      organization: 'OldTech Inc',
      location: 'Delhi-NCR, India',
      country: 'India',
      workMode: 'ONSITE',
      type: 'FULL_TIME',
      employmentType: 'FULL_TIME',
      source: 'Jobicy',
      sourceUrl: 'https://jobicy.com/jobs/808',
      applicationUrl: 'https://jobicy.com/jobs/808/apply',
      hasValidApplicationUrl: true,
      description: 'Legacy posting before M2.4 classification.',
      postedDate: new Date('2026-09-01'),
      createdAt: new Date('2026-09-01'),
      eligibility: null,
      opportunitySkills: [],
    }
  );

  // Hook Prisma mock harness
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

  (prisma.opportunity as any).count = async () => {
    return mockOpportunities.length;
  };

  (prisma.opportunity as any).findMany = async (args?: any) => {
    let results = [...mockOpportunities];

    if (args?.where) {
      const where = args.where;
      if (where.AND && Array.isArray(where.AND)) {
        for (const cond of where.AND) {
          if (cond.eligibility?.category?.in) {
            const allowed = cond.eligibility.category.in;
            results = results.filter((o) => o.eligibility && allowed.includes(o.eligibility.category));
          }
          if (cond.eligibility?.OR) {
            results = results.filter((o) => {
              if (!o.eligibility) return false;
              if (o.eligibility.batchConstraint === 'UNRESTRICTED') return true;
              if (cond.eligibility.OR[1]?.eligibleBatches?.has !== undefined) {
                const b = cond.eligibility.OR[1].eligibleBatches.has;
                return o.eligibility.eligibleBatches?.includes(b);
              }
              return false;
            });
          }
          if (cond.workMode) {
            results = results.filter((o) => o.workMode === cond.workMode);
          }
          if (cond.OR) {
            results = results.filter((o) => {
              return cond.OR.some((orClause: any) => {
                if (orClause.location?.contains) {
                  return o.location?.toLowerCase().includes(orClause.location.contains.toLowerCase());
                }
                if (orClause.title?.contains) {
                  return o.title?.toLowerCase().includes(orClause.title.contains.toLowerCase());
                }
                if (orClause.organization?.contains) {
                  return o.organization?.toLowerCase().includes(orClause.organization.contains.toLowerCase());
                }
                if (orClause.description?.contains) {
                  return o.description?.toLowerCase().includes(orClause.description.contains.toLowerCase());
                }
                return false;
              });
            });
          }
          if (cond.opportunitySkills?.some?.skill?.name?.contains) {
            const sTerm = cond.opportunitySkills.some.skill.name.contains.toLowerCase();
            results = results.filter((o) =>
              o.opportunitySkills?.some((os: any) => os.skill?.name?.toLowerCase().includes(sTerm))
            );
          }
        }
      }
    }

    return results;
  };

  (prisma as any).$queryRaw = async () => [];

  // Build Express Test Application
  let currentTestUserId: string | null = null;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(clerkMiddleware());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (currentTestUserId) {
      (req as any).userId = currentTestUserId;
    }
    next();
  });
  app.use('/api/opportunities', opportunitiesRouter);

  // ════════════════════════════════════════════════════════════════
  // 1. ANONYMOUS & AUTHENTICATED ACCESS AUDIT
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 1: Anonymous & Authenticated Access Audit ---');

  currentTestUserId = null; // Anonymous
  const anonRes = await request(app).get('/api/opportunities/early-career');
  assert(anonRes.status === 200, 'Anonymous access to /api/opportunities/early-career succeeds with 200 OK');
  assert(anonRes.body.candidateContext.isAuthenticated === false, 'candidateContext.isAuthenticated is false');
  assert(anonRes.body.candidateContext.hasProfile === false, 'candidateContext.hasProfile is false');
  assert(anonRes.body.candidateContext.profileComplete === false, 'candidateContext.profileComplete is false');

  // Verify that anonymous response never fabricates eligibility or skill match
  const allAnonNull = anonRes.body.opportunities.every((o: any) => o.eligibility === null && o.match === null);
  assert(allAnonNull, 'Every opportunity has eligibility=null and match=null for anonymous visitors');

  // Anonymous attempts to filter by candidate eligibility
  const anonFilterRes = await request(app).get('/api/opportunities/early-career?eligibility=ELIGIBLE');
  assert(anonFilterRes.status === 401, 'Anonymous eligibility filter returns 401 UNAUTHORIZED');
  assert(anonFilterRes.body.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

  // Authenticated candidate with complete profile (Alice)
  currentTestUserId = 'user-alice';
  const aliceRes = await request(app).get('/api/opportunities/early-career');
  assert(aliceRes.status === 200, 'Authenticated candidate access succeeds with 200 OK');
  assert(aliceRes.body.candidateContext.isAuthenticated === true, 'Alice candidateContext.isAuthenticated is true');
  assert(aliceRes.body.candidateContext.hasProfile === true, 'Alice candidateContext.hasProfile is true');
  assert(aliceRes.body.candidateContext.profileComplete === true, 'Alice candidateContext.profileComplete is true');

  const aliceFresher = aliceRes.body.opportunities.find((o: any) => o.id === 'opp-fresher-bengaluru');
  assert(Boolean(aliceFresher?.eligibility), 'Alice receives structured eligibility evaluation on fresher role');
  assert(aliceFresher.eligibility.overallStatus === 'ELIGIBLE', 'Alice evaluation on fresher role is ELIGIBLE');
  assert(aliceFresher.match.score === 100, 'Alice receives 100% skill match (React + TypeScript)');

  // Authenticated candidate with incomplete profile (Bob)
  currentTestUserId = 'user-bob';
  const bobRes = await request(app).get('/api/opportunities/early-career');
  assert(bobRes.status === 200, 'Incomplete profile candidate access succeeds');
  assert(bobRes.body.candidateContext.profileComplete === false, 'Bob candidateContext.profileComplete is false');
  const bobFresher = bobRes.body.opportunities.find((o: any) => o.id === 'opp-fresher-bengaluru');
  assert(bobFresher.eligibility.overallStatus === 'UNKNOWN', 'Bob overall status is UNKNOWN due to missing academic facts');
  assert(bobFresher.eligibility.criteria.academics.status === 'UNKNOWN', 'Bob missing academics evaluated as UNKNOWN');
  assert(bobFresher.eligibility.criteria.backlog.status === 'UNKNOWN', 'Bob missing backlog evaluated as UNKNOWN');
  assert(bobFresher.eligibility.criteria.graduationBatch.status === 'ELIGIBLE', 'Bob known graduation batch (2026) evaluated as ELIGIBLE');

  // ════════════════════════════════════════════════════════════════
  // 2. API INTEGRATION & QUERY PARAMETER AUDIT
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 2: API Integration & Query Parameter Audit ---');

  currentTestUserId = null; // Public browsing

  // Category filter
  const internRes = await request(app).get('/api/opportunities/early-career?category=INTERNSHIP');
  assert(internRes.status === 200, 'category=INTERNSHIP returned 200 OK');
  assert(internRes.body.opportunities.every((o: any) => o.earlyCareer.category === 'INTERNSHIP'), 'All returned opportunities are INTERNSHIP');

  // Invalid category validation
  const invalidCatRes = await request(app).get('/api/opportunities/early-career?category=NOT_EARLY_CAREER');
  assert(invalidCatRes.status === 400, 'category=NOT_EARLY_CAREER rejected with 400 VALIDATION_ERROR');
  assert(invalidCatRes.body.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

  const unknownCatRes = await request(app).get('/api/opportunities/early-career?category=UNKNOWN');
  assert(unknownCatRes.status === 400, 'category=UNKNOWN rejected with 400 VALIDATION_ERROR');

  // Location / City filter
  const bngRes = await request(app).get('/api/opportunities/early-career?city=Bengaluru');
  assert(bngRes.body.opportunities.every((o: any) => o.location.includes('Bengaluru') || o.title.includes('Bengaluru')), 'City filter matches Bengaluru');

  // Work Mode filter
  const remoteRes = await request(app).get('/api/opportunities/early-career?workMode=REMOTE');
  assert(remoteRes.body.opportunities.every((o: any) => o.workMode === 'REMOTE'), 'workMode=REMOTE strictly returns remote opportunities');

  // Graduation Batch filter (Valid 4-digit integer vs Invalid values)
  const batchRes = await request(app).get('/api/opportunities/early-career?batch=2026');
  assert(batchRes.status === 200, 'batch=2026 succeeds');
  const invalidBatchRes = await request(app).get('/api/opportunities/early-career?batch=twentysix');
  assert(invalidBatchRes.status === 400, 'batch=twentysix rejected with 400');
  const nonIntegerStringRes = await request(app).get('/api/opportunities/early-career?batch=grad-year');
  assert(nonIntegerStringRes.status === 400, 'batch=grad-year rejected with 400');
  const decimalBatchRes = await request(app).get('/api/opportunities/early-career?batch=2026.5');
  assert(decimalBatchRes.status === 400, 'M2.10 Fix: Decimal batch (2026.5) strictly rejected with 400');
  const negativeBatchRes = await request(app).get('/api/opportunities/early-career?batch=-2026');
  assert(negativeBatchRes.status === 400, 'M2.10 Fix: Negative batch (-2026) strictly rejected with 400');
  const signedBatchRes = await request(app).get('/api/opportunities/early-career?batch=%2B2026');
  assert(signedBatchRes.status === 400, 'M2.10 Fix: Signed batch (+2026) strictly rejected with 400');
  const alphanumericBatchRes = await request(app).get('/api/opportunities/early-career?batch=2026a');
  assert(alphanumericBatchRes.status === 400, 'M2.10 Fix: Alphanumeric batch (2026a) strictly rejected with 400');
  const outOfRangeBatchRes = await request(app).get('/api/opportunities/early-career?batch=1940');
  assert(outOfRangeBatchRes.status === 400, 'M2.10 Fix: Out of range batch (1940) strictly rejected with 400');

  // Search filter
  const searchRes = await request(app).get('/api/opportunities/early-career?search=Frontend');
  assert(searchRes.body.opportunities.length === 1, 'Search query "Frontend" returns exactly 1 match');
  assert(searchRes.body.opportunities[0].id === 'opp-intern-summer', 'Matched Frontend Engineering Intern');

  // Skill filter
  const skillRes = await request(app).get('/api/opportunities/early-career?skill=TypeScript');
  assert(skillRes.body.opportunities.length === 1, 'Skill query "TypeScript" matches 1 opportunity');
  assert(skillRes.body.opportunities[0].id === 'opp-fresher-bengaluru', 'Matched Fresher Bengaluru');

  // Excluded Opportunities Verification
  const allEarly = anonRes.body.opportunities;
  const hasSenior = allEarly.some((o: any) => o.id === 'opp-senior-lead');
  assert(!hasSenior, 'Senior role (NOT_EARLY_CAREER) is strictly excluded from early career feed');
  const hasLegacy = allEarly.some((o: any) => o.id === 'opp-legacy-no-elig');
  assert(!hasLegacy, 'Legacy role without eligibility record is strictly excluded from early career feed');
  const hasConflictOpp = allEarly.some((o: any) => o.id === 'opp-conflict');
  assert(!hasConflictOpp, 'Conflicting opportunity (category: UNKNOWN) is strictly excluded from early career feed');

  // Unstructured skills handling
  const getOpp = allEarly.find((o: any) => o.id === 'opp-graduate-trainee');
  assert(Boolean(getOpp), 'Graduate trainee included in feed');

  currentTestUserId = 'user-alice';
  const aliceGetRes = await request(app).get('/api/opportunities/early-career');
  const aliceGetOpp = aliceGetRes.body.opportunities.find((o: any) => o.id === 'opp-graduate-trainee');
  assert(aliceGetOpp.match.hasStructuredRequirements === false, 'Role without explicit skills has hasStructuredRequirements: false');
  assert(aliceGetOpp.match.score === null, 'Role without explicit skills has score: null (not misleading 0%)');

  // ════════════════════════════════════════════════════════════════
  // 3. ELIGIBILITY DECISION MATRIX & STRICT INVARIANCE AUDIT
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 3: Eligibility Correctness & Decision Matrix ---');

  // Scenario A: ELIGIBLE candidate (Alice on Fresher 2026)
  currentTestUserId = 'user-alice';
  const evalAlice = await request(app).get('/api/opportunities/opp-fresher-bengaluru/eligibility');
  assert(evalAlice.status === 200, 'Alice eligibility evaluation API returns 200 OK');
  assert(evalAlice.body.overallStatus === 'ELIGIBLE', 'Verdict is ELIGIBLE');
  assert(evalAlice.body.criteria.graduationBatch.status === 'ELIGIBLE', 'Batch criterion is ELIGIBLE');
  assert(evalAlice.body.criteria.academics.status === 'ELIGIBLE', 'Academics criterion is ELIGIBLE');
  assert(evalAlice.body.criteria.backlog.status === 'ELIGIBLE', 'Backlog criterion is ELIGIBLE');

  // Scenario B: STRICT INVARIANCE TEST (Charlie: 100% Skill Match, but Batch NOT_ELIGIBLE)
  currentTestUserId = 'user-charlie';
  const charlieFeed = await request(app).get('/api/opportunities/early-career');
  const charlieFresher = charlieFeed.body.opportunities.find((o: any) => o.id === 'opp-fresher-bengaluru');
  assert(charlieFresher.eligibility.overallStatus === 'NOT_ELIGIBLE', 'Charlie is strictly NOT_ELIGIBLE');
  assert(charlieFresher.eligibility.criteria.graduationBatch.status === 'NOT_ELIGIBLE', 'Batch failed (2023 vs 2026)');
  assert(charlieFresher.match.score === 100, 'Charlie has 100% skill match score');
  assert(
    charlieFresher.eligibility.overallStatus === 'NOT_ELIGIBLE' && charlieFresher.match.score === 100,
    'INVARIANCE CONFIRMED: 100% skill match did NOT override NOT_ELIGIBLE'
  );

  // Scenario C: Disqualification by Backlogs (Dave: 2 active backlogs on NO_ACTIVE policy)
  currentTestUserId = 'user-dave';
  const evalDave = await request(app).get('/api/opportunities/opp-fresher-bengaluru/eligibility');
  assert(evalDave.status === 200, 'Dave evaluation API returns 200');
  assert(evalDave.body.overallStatus === 'NOT_ELIGIBLE', 'Dave is NOT_ELIGIBLE due to active backlogs');
  assert(evalDave.body.criteria.backlog.status === 'NOT_ELIGIBLE', 'Backlog criterion failed');
  assert(evalDave.body.criteria.academics.status === 'NOT_ELIGIBLE', 'Academics failed (6.2 < 7.5 CGPA)');

  // Scenario D: Candidate Eligibility Filter functionality
  currentTestUserId = 'user-alice';
  const aliceEligibleOnly = await request(app).get('/api/opportunities/early-career?eligibility=ELIGIBLE');
  assert(aliceEligibleOnly.status === 200, 'Alice eligibility=ELIGIBLE succeeded');
  assert(aliceEligibleOnly.body.opportunities.every((o: any) => o.eligibility.overallStatus === 'ELIGIBLE'), 'All returned opportunities are ELIGIBLE for Alice');

  currentTestUserId = 'user-charlie';
  const charlieNotEligibleOnly = await request(app).get('/api/opportunities/early-career?eligibility=NOT_ELIGIBLE');
  assert(charlieNotEligibleOnly.status === 200, 'Charlie eligibility=NOT_ELIGIBLE succeeded');
  assert(charlieNotEligibleOnly.body.opportunities.some((o: any) => o.id === 'opp-fresher-bengaluru'), 'Includes Fresher role where Charlie is NOT_ELIGIBLE');

  // ════════════════════════════════════════════════════════════════
  // 4. APPLICATION URL DEFENSE & SANITIZATION AUDIT
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 4: Application URL Defense & Sanitization ---');

  currentTestUserId = null;
  const urlFeed = await request(app).get('/api/opportunities/early-career');
  const validOpp = urlFeed.body.opportunities.find((o: any) => o.id === 'opp-fresher-bengaluru');
  assert(validOpp.hasValidApplicationUrl === true, 'Valid HTTPS applicationUrl has hasValidApplicationUrl: true');
  assert(validOpp.applicationUrl === 'https://boards.greenhouse.io/acme/jobs/101/apply', 'Valid HTTPS URL preserved');

  const invalidOpp = urlFeed.body.opportunities.find((o: any) => o.id === 'opp-invalid-url');
  assert(invalidOpp.hasValidApplicationUrl === false, 'Malicious javascript: URL has hasValidApplicationUrl: false');
  assert(invalidOpp.applicationUrl === null, 'Malicious javascript: URL is sanitized to null in API response');

  // ════════════════════════════════════════════════════════════════
  // 5. REGRESSION TESTING OF EXISTING OPPORTUNITY ROUTES
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 5: Regression Testing on Existing Routes ---');

  // 5.1 Existing GET /api/opportunities/ (root opportunities catalog)
  const rootOppsRes = await request(app).get('/api/opportunities');
  assert(rootOppsRes.status === 200, 'GET /api/opportunities returns 200 OK');
  assert(Array.isArray(rootOppsRes.body.opportunities), 'Root response contains opportunities array');
  assert(Boolean(rootOppsRes.body.pagination), 'Root response contains pagination object');

  // 5.2 Existing GET /api/opportunities/india
  const indiaRes = await request(app).get('/api/opportunities/india');
  assert(indiaRes.status === 200, 'GET /api/opportunities/india returns 200 OK');
  assert(Array.isArray(indiaRes.body.opportunities), 'India response contains opportunities array');
  assert(Boolean(indiaRes.body.filters), 'India response contains filters object');
  assert(Boolean(indiaRes.body.pagination), 'India response contains pagination object');

  // 5.2 Single Opportunity Detail GET /api/opportunities/:id
  const singleRes = await request(app).get('/api/opportunities/opp-fresher-bengaluru');
  assert(singleRes.status === 200, 'GET /api/opportunities/:id returns 200 OK');
  assert(singleRes.body.opportunity.id === 'opp-fresher-bengaluru', 'Returned requested opportunity');
  assert(singleRes.body.opportunity.title === 'Graduate Software Engineer - 2026 Batch', 'Title preserved');

  // 5.3 Nonexistent Opportunity Detail returns 404
  const notFoundRes = await request(app).get('/api/opportunities/non-existent-id-999');
  assert(notFoundRes.status === 404, 'Nonexistent opportunity returns 404');
  assert(notFoundRes.body.error.code === 'OPPORTUNITY_NOT_FOUND', 'Error code is OPPORTUNITY_NOT_FOUND');

  // 5.4 Eligibility Endpoint Authentication Guard
  currentTestUserId = null;
  const anonDetailElig = await request(app).get('/api/opportunities/opp-fresher-bengaluru/eligibility');
  assert(anonDetailElig.status === 401, 'Anonymous request to /:id/eligibility returns 401');

  // 5.5 Match Endpoint (Bug B fix verification: Authoritative single registration)
  currentTestUserId = null;
  const anonMatch = await request(app).get('/api/opportunities/opp-fresher-bengaluru/match');
  assert(anonMatch.status === 401, 'Anonymous request to /:id/match returns 401');

  currentTestUserId = 'user-alice';
  const aliceMatch = await request(app).get('/api/opportunities/opp-fresher-bengaluru/match');
  assert(aliceMatch.status === 200, 'Authenticated request to /:id/match returns 200');
  assert(aliceMatch.body.score === 100, 'Match score is 100');
  assert(aliceMatch.body.hasStructuredRequirements === true, 'hasStructuredRequirements is true');
  assert(Array.isArray(aliceMatch.body.requiredMatched), 'requiredMatched is array');
  assert(typeof aliceMatch.body.evidence === 'object', 'evidence is object record');

  // User without profile receives 404 PROFILE_NOT_FOUND
  mockUsers.set('user-no-profile', { id: 'user-no-profile', clerkId: 'clerk-no-profile' });
  currentTestUserId = 'user-no-profile';
  const noProfileMatch = await request(app).get('/api/opportunities/opp-fresher-bengaluru/match');
  assert(noProfileMatch.status === 404, 'User without profile returns 404');
  assert(noProfileMatch.body.error.code === 'PROFILE_NOT_FOUND', 'Error code is PROFILE_NOT_FOUND');

  // Nonexistent opportunity receives 404 OPPORTUNITY_NOT_FOUND
  currentTestUserId = 'user-alice';
  const nonExistentMatch = await request(app).get('/api/opportunities/non-existent-999/match');
  assert(nonExistentMatch.status === 404, 'Nonexistent opportunity match returns 404');
  assert(nonExistentMatch.body.error.code === 'OPPORTUNITY_NOT_FOUND', 'Error code is OPPORTUNITY_NOT_FOUND');

  // ════════════════════════════════════════════════════════════════
  // 6. READ-ONLY DATA QUALITY & LIMITATION REPORT
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Section 6: Data Quality Metrics ---');
  console.log(`  Total Seeded Opportunities In Catalog: ${mockOpportunities.length}`);
  console.log(`  Included In Early Opportunities Feed: ${allEarly.length}`);
  console.log(`  Excluded Opportunities: ${mockOpportunities.length - allEarly.length}`);
  console.log('  Exclusion Reasons:');
  console.log('    - opp-senior-lead: Category is NOT_EARLY_CAREER (senior experience required)');
  console.log('    - opp-legacy-no-elig: Eligibility relation is null (unclassified legacy role)');
  console.log('    - opp-conflict: Category is UNKNOWN (contradiction between senior title and intern body)');

  console.log('\n----------------------------------------------------------------');
  console.log(`  QA SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

runQASuite().catch((err) => {
  console.error('Fatal error during QA suite:', err);
  process.exit(1);
});
