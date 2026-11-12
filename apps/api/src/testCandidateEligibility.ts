/**
 * M2.5: Candidate Eligibility Evaluation and API Integration Test Suite
 *
 * Comprehensive tests for:
 * - Pure TypeScript CandidateEligibilityEvaluator
 * - Criterion-level evaluations (Experience, Batch, Academics, Backlogs, Degree, Branch)
 * - AcademicEvaluationMode (SINGLE_CRITERION, DISJUNCTIVE_OR, CONJUNCTIVE_AND)
 * - Conflict handling and REVIEW_REQUIRED / stale evidence
 * - Express API endpoint GET /api/opportunities/:opportunityId/eligibility
 * - Authentication, 401, 404, error responses, candidate data isolation, and payload sanitization
 *
 * STRICTLY complies with project boundary: ZERO live database connections or writes.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import {
  candidateEligibilityEvaluator,
  CandidateEligibilityEvaluator,
  type CandidateProfileInput,
  type OpportunityEligibilityInput,
} from './services/candidateEligibilityEvaluator';
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
  console.log('  M2.5: CANDIDATE ELIGIBILITY EVALUATION & API INTEGRATION SUITE');
  console.log('================================================================\n');

  const evaluator = new CandidateEligibilityEvaluator();

  // ─── Test 1: All Criteria Satisfied ─────────────────────────────────────────
  console.log('Test 1: All criteria satisfied -> Overall ELIGIBLE');
  {
    const candidate: CandidateProfileInput = {
      graduationYear: 2026,
      degree: 'B.Tech',
      branch: 'Computer Science',
      cgpa: 8.5,
      cgpaScale: 'SCALE_10_0',
      percentage: 82.0,
      activeBacklogs: 0,
      hasBacklogHistory: false,
      experienceMonths: 6,
    };

    const eligibility: OpportunityEligibilityInput = {
      category: 'ENTRY_LEVEL',
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      experienceConstraint: 'RESTRICTED',
      experienceBoundType: 'EXACT_RANGE',
      minExperienceMonths: 0,
      maxExperienceMonths: 12,
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2025, 2026],
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.0,
      cgpaScale: 'SCALE_10_0',
      backlogPolicy: 'NO_ACTIVE',
      degreeConstraint: 'RESTRICTED',
      eligibleDegrees: ['BTECH', 'BE'],
      branchConstraint: 'RESTRICTED',
      eligibleBranches: ['CSE', 'IT'],
      hasConflict: false,
    };

    const res = evaluator.evaluate(candidate, eligibility);
    assert(res.overallStatus === 'ELIGIBLE', `Overall status is ELIGIBLE (got ${res.overallStatus})`);
    assert(res.criteria.experience.status === 'ELIGIBLE', 'Experience is ELIGIBLE');
    assert(res.criteria.graduationBatch.status === 'ELIGIBLE', 'Graduation batch is ELIGIBLE');
    assert(res.criteria.academics.status === 'ELIGIBLE', 'Academics is ELIGIBLE');
    assert(res.criteria.backlog.status === 'ELIGIBLE', 'Backlog is ELIGIBLE');
    assert(res.criteria.degree.status === 'ELIGIBLE', 'Degree is ELIGIBLE');
    assert(res.criteria.branch.status === 'ELIGIBLE', 'Branch is ELIGIBLE');
  }

  // ─── Test 2: Verified Experience Failure ───────────────────────────────────
  console.log('\nTest 2: Verified experience failure -> Overall NOT_ELIGIBLE');
  {
    const candidate: CandidateProfileInput = {
      graduationYear: 2026,
      experienceMonths: 18,
    };

    const eligibility: OpportunityEligibilityInput = {
      category: 'ENTRY_LEVEL',
      experienceConstraint: 'RESTRICTED',
      experienceBoundType: 'EXACT_RANGE',
      minExperienceMonths: 0,
      maxExperienceMonths: 12,
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
    };

    const res = evaluator.evaluate(candidate, eligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', `Overall status is NOT_ELIGIBLE on experience breach (got ${res.overallStatus})`);
    assert(res.criteria.experience.status === 'NOT_ELIGIBLE', 'Experience status is NOT_ELIGIBLE');
    assert(res.criteria.graduationBatch.status === 'ELIGIBLE', 'Graduation batch is ELIGIBLE');
    assert(res.overallExplanation.includes('outside the required range'), 'Explanation details experience breach');
  }

  // ─── Test 3: Graduation-Year Mismatch ──────────────────────────────────────
  console.log('\nTest 3: Graduation-year mismatch -> Overall NOT_ELIGIBLE');
  {
    const candidate: CandidateProfileInput = {
      graduationYear: 2024,
      experienceMonths: 0,
    };

    const eligibility: OpportunityEligibilityInput = {
      category: 'FRESHER',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2025, 2026],
      experienceConstraint: 'UNRESTRICTED',
    };

    const res = evaluator.evaluate(candidate, eligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', `Overall status is NOT_ELIGIBLE (got ${res.overallStatus})`);
    assert(res.criteria.graduationBatch.status === 'NOT_ELIGIBLE', 'Batch is NOT_ELIGIBLE');
    assert(res.overallExplanation.includes('does not match eligible batches'), 'Explanation cites batch mismatch');
  }

  // ─── Test 4: Missing Graduation Year in Candidate Profile ──────────────────
  console.log('\nTest 4: Missing graduation year in candidate profile -> Overall UNKNOWN');
  {
    const candidate: CandidateProfileInput = {
      graduationYear: null,
      experienceMonths: 0,
    };

    const eligibility: OpportunityEligibilityInput = {
      category: 'FRESHER',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
      experienceConstraint: 'UNRESTRICTED',
    };

    const res = evaluator.evaluate(candidate, eligibility);
    assert(res.overallStatus === 'UNKNOWN', `Overall status is UNKNOWN (got ${res.overallStatus})`);
    assert(res.criteria.graduationBatch.status === 'UNKNOWN', 'Batch is UNKNOWN');
    assert(res.criteria.graduationBatch.explanation.includes('not specified in profile'), 'Explanation notes missing graduation year');
  }

  // ─── Test 5: CGPA Mismatch ─────────────────────────────────────────────────
  console.log('\nTest 5: CGPA mismatch -> Overall NOT_ELIGIBLE');
  {
    const candidate: CandidateProfileInput = {
      cgpa: 6.8,
      cgpaScale: 'SCALE_10_0',
      graduationYear: 2026,
    };

    const eligibility: OpportunityEligibilityInput = {
      category: 'GRADUATE_TRAINEE',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.5,
      cgpaScale: 'SCALE_10_0',
    };

    const res = evaluator.evaluate(candidate, eligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', `Overall status is NOT_ELIGIBLE (got ${res.overallStatus})`);
    assert(res.criteria.academics.status === 'NOT_ELIGIBLE', 'Academics is NOT_ELIGIBLE');
    assert(res.criteria.academics.explanation.includes('below required minimum'), 'Explanation cites CGPA shortfall');
  }

  // ─── Test 6: Unknown CGPA Scale & Scale Mismatch ───────────────────────────
  console.log('\nTest 6: Unknown CGPA scale & scale mismatch -> Academics UNKNOWN (no assumed equivalence)');
  {
    // Case 6a: Job scale unknown
    const candA: CandidateProfileInput = { cgpa: 8.0, cgpaScale: 'SCALE_10_0' };
    const eligA: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.0,
      cgpaScale: 'SCALE_UNKNOWN',
    };
    const resA = evaluator.evaluate(candA, eligA);
    assert(resA.criteria.academics.status === 'UNKNOWN', 'Job SCALE_UNKNOWN produces academics UNKNOWN');

    // Case 6b: Candidate scale unknown
    const candB: CandidateProfileInput = { cgpa: 3.8, cgpaScale: null };
    const eligB: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 3.5,
      cgpaScale: 'SCALE_4_0',
    };
    const resB = evaluator.evaluate(candB, eligB);
    assert(resB.criteria.academics.status === 'UNKNOWN', 'Candidate missing scale produces academics UNKNOWN');

    // Case 6c: Scale mismatch (e.g., 3.8 on 4.0 vs 7.0 on 10.0) - No assumed equivalence
    const candC: CandidateProfileInput = { cgpa: 3.8, cgpaScale: 'SCALE_4_0' };
    const eligC: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.0,
      cgpaScale: 'SCALE_10_0',
    };
    const resC = evaluator.evaluate(candC, eligC);
    assert(resC.criteria.academics.status === 'UNKNOWN', 'Scale mismatch produces academics UNKNOWN');
    assert(resC.criteria.academics.explanation.includes('scale conversion is not assumed'), 'Scale conversion not assumed');
  }

  // ─── Test 7: Percentage-Based Academic Requirement ─────────────────────────
  console.log('\nTest 7: Percentage-based academic requirement');
  {
    const eligPerc: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minPercentage: 70.0,
    };

    // Candidate above cutoff
    const resPass = evaluator.evaluate({ percentage: 74.5 }, eligPerc);
    assert(resPass.criteria.academics.status === 'ELIGIBLE', 'Percentage >= 70 is ELIGIBLE');

    // Candidate below cutoff
    const resFail = evaluator.evaluate({ percentage: 65.0 }, eligPerc);
    assert(resFail.criteria.academics.status === 'NOT_ELIGIBLE', 'Percentage < 70 is NOT_ELIGIBLE');
  }

  // ─── Test 8: OR Academic Evaluation (DISJUNCTIVE_OR) ───────────────────────
  console.log('\nTest 8: OR academic evaluation (DISJUNCTIVE_OR)');
  {
    const eligOr: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'DISJUNCTIVE_OR',
      minPercentage: 60.0,
      minCgpa: 6.5,
      cgpaScale: 'SCALE_10_0',
    };

    // Candidate meets CGPA but fails percentage -> ELIGIBLE via OR
    const cand1 = { percentage: 55.0, cgpa: 7.0, cgpaScale: 'SCALE_10_0' };
    const res1 = evaluator.evaluate(cand1, eligOr);
    assert(res1.criteria.academics.status === 'ELIGIBLE', 'Meeting CGPA in OR mode produces ELIGIBLE');

    // Candidate meets percentage but fails CGPA -> ELIGIBLE via OR
    const cand2 = { percentage: 65.0, cgpa: 5.5, cgpaScale: 'SCALE_10_0' };
    const res2 = evaluator.evaluate(cand2, eligOr);
    assert(res2.criteria.academics.status === 'ELIGIBLE', 'Meeting percentage in OR mode produces ELIGIBLE');

    // Candidate fails both -> NOT_ELIGIBLE
    const cand3 = { percentage: 55.0, cgpa: 5.5, cgpaScale: 'SCALE_10_0' };
    const res3 = evaluator.evaluate(cand3, eligOr);
    assert(res3.criteria.academics.status === 'NOT_ELIGIBLE', 'Failing both in OR mode produces NOT_ELIGIBLE');

    // Candidate fails one, other is missing -> UNKNOWN (cannot rule out satisfaction)
    const cand4 = { percentage: 55.0, cgpa: null };
    const res4 = evaluator.evaluate(cand4, eligOr);
    assert(res4.criteria.academics.status === 'UNKNOWN', 'Failing one with other unknown produces UNKNOWN in OR mode');
  }

  // ─── Test 9: AND Academic Evaluation (CONJUNCTIVE_AND) ─────────────────────
  console.log('\nTest 9: AND academic evaluation (CONJUNCTIVE_AND)');
  {
    const eligAnd: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'CONJUNCTIVE_AND',
      minPercentage: 70.0,
      minCgpa: 7.5,
      cgpaScale: 'SCALE_10_0',
    };

    // Candidate meets both -> ELIGIBLE
    const cand1 = { percentage: 75.0, cgpa: 8.0, cgpaScale: 'SCALE_10_0' };
    const res1 = evaluator.evaluate(cand1, eligAnd);
    assert(res1.criteria.academics.status === 'ELIGIBLE', 'Meeting both in AND mode produces ELIGIBLE');

    // Candidate meets percentage but fails CGPA -> NOT_ELIGIBLE
    const cand2 = { percentage: 75.0, cgpa: 6.5, cgpaScale: 'SCALE_10_0' };
    const res2 = evaluator.evaluate(cand2, eligAnd);
    assert(res2.criteria.academics.status === 'NOT_ELIGIBLE', 'Failing one in AND mode produces NOT_ELIGIBLE');

    // Candidate meets percentage but CGPA is unknown -> UNKNOWN
    const cand3 = { percentage: 75.0, cgpa: null };
    const res3 = evaluator.evaluate(cand3, eligAnd);
    assert(res3.criteria.academics.status === 'UNKNOWN', 'Passing one with other unknown produces UNKNOWN in AND mode');
  }

  // ─── Test 10: Missing Academic Information ─────────────────────────────────
  console.log('\nTest 10: Missing academic information in profile -> UNKNOWN');
  {
    const candEmpty: CandidateProfileInput = { cgpa: null, percentage: null };
    const elig: OpportunityEligibilityInput = {
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.0,
      cgpaScale: 'SCALE_10_0',
    };
    const res = evaluator.evaluate(candEmpty, elig);
    assert(res.criteria.academics.status === 'UNKNOWN', 'Missing academic facts produces UNKNOWN');
    assert(res.criteria.academics.explanation.includes('not specified in profile'), 'Explanation notes missing profile info');
  }

  // ─── Test 11: Backlog-Policy Mismatch ──────────────────────────────────────
  console.log('\nTest 11: Backlog-policy mismatch');
  {
    // Policy: NO_ACTIVE
    const eligNoActive: OpportunityEligibilityInput = { backlogPolicy: 'NO_ACTIVE' };
    assert(evaluator.evaluate({ activeBacklogs: 0 }, eligNoActive).criteria.backlog.status === 'ELIGIBLE', '0 backlogs with NO_ACTIVE is ELIGIBLE');
    assert(evaluator.evaluate({ activeBacklogs: 2 }, eligNoActive).criteria.backlog.status === 'NOT_ELIGIBLE', '2 backlogs with NO_ACTIVE is NOT_ELIGIBLE');

    // Policy: ALLOWED_WITH_LIMIT (limit = 1)
    const eligLimit: OpportunityEligibilityInput = { backlogPolicy: 'ALLOWED_WITH_LIMIT', maxActiveBacklogs: 1 };
    assert(evaluator.evaluate({ activeBacklogs: 1 }, eligLimit).criteria.backlog.status === 'ELIGIBLE', '1 backlog with limit 1 is ELIGIBLE');
    assert(evaluator.evaluate({ activeBacklogs: 2 }, eligLimit).criteria.backlog.status === 'NOT_ELIGIBLE', '2 backlogs with limit 1 is NOT_ELIGIBLE');

    // Policy: NO_HISTORY
    const eligNoHist: OpportunityEligibilityInput = { backlogPolicy: 'NO_HISTORY' };
    assert(evaluator.evaluate({ activeBacklogs: 1 }, eligNoHist).criteria.backlog.status === 'NOT_ELIGIBLE', 'Active backlog with NO_HISTORY is NOT_ELIGIBLE');
    assert(evaluator.evaluate({ activeBacklogs: 0, hasBacklogHistory: true }, eligNoHist).criteria.backlog.status === 'NOT_ELIGIBLE', 'History with NO_HISTORY is NOT_ELIGIBLE');
    assert(evaluator.evaluate({ activeBacklogs: 0, hasBacklogHistory: false }, eligNoHist).criteria.backlog.status === 'ELIGIBLE', 'Zero active and zero history is ELIGIBLE');
  }

  // ─── Test 12: Missing Backlog Information ──────────────────────────────────
  console.log('\nTest 12: Missing backlog information in profile -> UNKNOWN');
  {
    const elig: OpportunityEligibilityInput = { backlogPolicy: 'NO_ACTIVE' };
    const res = evaluator.evaluate({ activeBacklogs: null }, elig);
    assert(res.criteria.backlog.status === 'UNKNOWN', 'Missing active backlogs produces UNKNOWN');
    assert(res.criteria.backlog.explanation.includes('not specified in profile'), 'Explanation notes missing backlog info');
  }

  // ─── Test 13: Degree Mismatch ──────────────────────────────────────────────
  console.log('\nTest 13: Degree mismatch');
  {
    const eligDegree: OpportunityEligibilityInput = {
      degreeConstraint: 'RESTRICTED',
      eligibleDegrees: ['BTECH', 'BE'],
    };

    assert(evaluator.evaluate({ degree: 'B.Tech in CSE' }, eligDegree).criteria.degree.status === 'ELIGIBLE', 'B.Tech matches BTECH');
    assert(evaluator.evaluate({ degree: 'Bachelor of Engineering' }, eligDegree).criteria.degree.status === 'ELIGIBLE', 'BE matches');
    assert(evaluator.evaluate({ degree: 'BBA' }, eligDegree).criteria.degree.status === 'NOT_ELIGIBLE', 'BBA does not match BTECH/BE');
    assert(evaluator.evaluate({ degree: null }, eligDegree).criteria.degree.status === 'UNKNOWN', 'Missing degree is UNKNOWN');
  }

  // ─── Test 14: Branch Mismatch ──────────────────────────────────────────────
  console.log('\nTest 14: Branch mismatch');
  {
    const eligBranch: OpportunityEligibilityInput = {
      branchConstraint: 'RESTRICTED',
      eligibleBranches: ['CSE', 'IT'],
    };

    assert(evaluator.evaluate({ branch: 'Computer Science and Engineering' }, eligBranch).criteria.branch.status === 'ELIGIBLE', 'Computer Science matches CSE');
    assert(evaluator.evaluate({ branch: 'Information Technology' }, eligBranch).criteria.branch.status === 'ELIGIBLE', 'Information Technology matches IT');
    assert(evaluator.evaluate({ branch: 'Mechanical' }, eligBranch).criteria.branch.status === 'NOT_ELIGIBLE', 'Mechanical does not match CSE/IT');
    assert(evaluator.evaluate({ branch: null }, eligBranch).criteria.branch.status === 'UNKNOWN', 'Missing branch is UNKNOWN');
  }

  // ─── Test 15: Conflicting Eligibility Requirements ─────────────────────────
  console.log('\nTest 15: Conflicting eligibility requirements -> Overall UNKNOWN (never silent pass)');
  {
    const candidate: CandidateProfileInput = {
      graduationYear: 2026,
      experienceMonths: 0,
      activeBacklogs: 0,
    };

    const conflictingElig: OpportunityEligibilityInput = {
      hasConflict: true,
      conflictDetails: ['Title states Senior Architect, but description specifies summer intern position.'],
      overallVerificationLevel: 'UNVERIFIED',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
    };

    const res = evaluator.evaluate(candidate, conflictingElig);
    assert(res.overallStatus === 'UNKNOWN', `Conflicting requirements produce overall UNKNOWN (got ${res.overallStatus})`);
    assert(res.hasConflict === true, 'hasConflict flag is preserved');
    assert(res.overallExplanation.includes('material conflicts'), 'Explanation identifies material conflicts');
  }

  // ─── Test 16: Stale or REVIEW_REQUIRED Evidence ────────────────────────────
  console.log('\nTest 16: Stale or REVIEW_REQUIRED evidence handling');
  {
    const cand: CandidateProfileInput = { graduationYear: 2026 };
    const eligReview: OpportunityEligibilityInput = {
      overallVerificationLevel: 'REVIEW_REQUIRED',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
      evidenceRecords: [
        {
          criterion: 'GRADUATION_BATCH',
          verificationLevel: 'REVIEW_REQUIRED',
          isActive: true,
          hasConflict: false,
        },
      ],
    };

    const res = evaluator.evaluate(cand, eligReview);
    assert(res.overallVerificationLevel === 'REVIEW_REQUIRED', 'overallVerificationLevel preserved as REVIEW_REQUIRED');
  }

  // ─── Test 17: Opportunity with No Eligibility Record ───────────────────────
  console.log('\nTest 17: Opportunity with no eligibility record -> Graceful UNKNOWN');
  {
    const cand: CandidateProfileInput = { graduationYear: 2026 };
    const res = evaluator.evaluate(cand, null);
    assert(res.overallStatus === 'UNKNOWN', 'Overall status is UNKNOWN');
    assert(res.criteria.experience.status === 'UNKNOWN', 'Experience is UNKNOWN');
    assert(res.criteria.academics.status === 'UNKNOWN', 'Academics is UNKNOWN');
    assert(res.overallExplanation.includes('have not been evaluated or persisted'), 'Clear explanation for missing eligibility');
  }

  // ─── Test 18: Candidate with Incomplete Profile (Current Schema Reality) ───
  console.log('\nTest 18: Incomplete profile (graduationYear populated, missing academic facts)');
  {
    // Real-world scenario for current User Profile in Udaan
    const realCand: CandidateProfileInput = {
      graduationYear: 2026,
      university: 'National Institute of Technology',
      degree: null,
      branch: null,
      cgpa: null,
      cgpaScale: null,
      percentage: null,
      activeBacklogs: null,
      experienceMonths: null,
    };

    const jobElig: OpportunityEligibilityInput = {
      category: 'FRESHER',
      batchConstraint: 'RESTRICTED',
      eligibleBatches: [2026],
      academicConstraint: 'RESTRICTED',
      academicEvaluationMode: 'SINGLE_CRITERION',
      minCgpa: 7.0,
      cgpaScale: 'SCALE_10_0',
      backlogPolicy: 'NO_ACTIVE',
    };

    const res = evaluator.evaluate(realCand, jobElig);
    assert(res.criteria.graduationBatch.status === 'ELIGIBLE', 'Batch is ELIGIBLE');
    assert(res.criteria.academics.status === 'UNKNOWN', 'Academics is UNKNOWN due to missing profile field');
    assert(res.criteria.backlog.status === 'UNKNOWN', 'Backlog is UNKNOWN due to missing profile field');
    assert(res.overallStatus === 'UNKNOWN', 'Overall is UNKNOWN (conservative: missing mandatory facts never coerced to pass)');
  }

  // ─── Test 19-24: Express API Integration Tests ─────────────────────────────
  console.log('\n── Express API Integration Tests (GET /api/opportunities/:id/eligibility) ──');

  // Set up mock Express application
  const app = express();
  app.use(express.json());

  // Test state store
  const mockProfiles = new Map<string, any>();
  const mockOpportunities = new Map<string, any>();

  // Monkey-patch Prisma Client read methods safely in memory
  const originalProfileFindUnique = prisma.profile.findUnique;
  const originalOpportunityFindUnique = prisma.opportunity.findUnique;

  (prisma.profile as any).findUnique = async ({ where }: any) => {
    return mockProfiles.get(where.userId) || null;
  };

  (prisma.opportunity as any).findUnique = async ({ where }: any) => {
    return mockOpportunities.get(where.id) || null;
  };

  // Mount test auth injector, cookieParser, clerkMiddleware and opportunitiesRouter
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
    // Seed test data
    const userA_Id = 'user-alpha-123';
    const userB_Id = 'user-beta-456';
    const oppIdEligible = 'opp-entry-1';
    const oppIdNoElig = 'opp-no-elig-2';

    mockProfiles.set(userA_Id, {
      id: 'prof-a',
      userId: userA_Id,
      fullName: 'Alice Developer',
      university: 'IIT Bombay',
      graduationYear: 2026,
    });

    mockProfiles.set(userB_Id, {
      id: 'prof-b',
      userId: userB_Id,
      fullName: 'Bob Junior',
      university: 'BITS Pilani',
      graduationYear: 2023, // Ineligible for 2026 fresher
    });

    mockOpportunities.set(oppIdEligible, {
      id: oppIdEligible,
      title: 'Junior Software Engineer',
      organization: 'TechFlow',
      description: 'Requirements: 2026 Batch.',
      type: 'JOB',
      location: 'Bengaluru',
      eligibility: {
        id: 'elig-1',
        opportunityId: oppIdEligible,
        category: 'FRESHER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        experienceConstraint: 'UNRESTRICTED',
        academicConstraint: 'UNRESTRICTED',
        backlogPolicy: 'UNRESTRICTED',
        degreeConstraint: 'UNRESTRICTED',
        branchConstraint: 'UNRESTRICTED',
        hasConflict: false,
        sourceContentHash: 'hash-abc',
        classifierVersion: 'early-career-v1',
      },
    });

    mockOpportunities.set(oppIdNoElig, {
      id: oppIdNoElig,
      title: 'Senior DevOps Architect',
      organization: 'LegacyCo',
      description: 'Ancient systems maintenance.',
      type: 'JOB',
      location: 'Remote',
      eligibility: null,
    });

    // Test 19: Unauthenticated request -> 401 UNAUTHORIZED
    console.log('\nTest 19: Unauthenticated API request returns 401');
    const res19 = await request(app)
      .get(`/api/opportunities/${oppIdEligible}/eligibility`)
      .set('Accept', 'application/json');
    assert(res19.status === 401, `Unauthenticated request returned 401 (got ${res19.status})`);
    assert(res19.body?.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    // Test 20: Nonexistent opportunity -> 404 OPPORTUNITY_NOT_FOUND
    console.log('\nTest 20: Nonexistent opportunity returns 404 OPPORTUNITY_NOT_FOUND');
    const res20 = await request(app)
      .get('/api/opportunities/non-existent-id/eligibility')
      .set('x-test-user-id', userA_Id);
    assert(res20.status === 404, `Nonexistent opportunity returned 404 (got ${res20.status})`);
    assert(res20.body?.error?.code === 'OPPORTUNITY_NOT_FOUND', 'Error code is OPPORTUNITY_NOT_FOUND');

    // Test 21: Nonexistent user profile -> 404 PROFILE_NOT_FOUND
    console.log('\nTest 21: User without profile returns 404 PROFILE_NOT_FOUND');
    const res21 = await request(app)
      .get(`/api/opportunities/${oppIdEligible}/eligibility`)
      .set('x-test-user-id', 'unregistered-user-999');
    assert(res21.status === 404, `User without profile returned 404 (got ${res21.status})`);
    assert(res21.body?.error?.code === 'PROFILE_NOT_FOUND', 'Error code is PROFILE_NOT_FOUND');

    // Test 22: Successful evaluation & payload sanitization
    console.log('\nTest 22: Authenticated request returns sanitized evaluation without leaking internal evidence/hashes');
    const res22 = await request(app)
      .get(`/api/opportunities/${oppIdEligible}/eligibility`)
      .set('x-test-user-id', userA_Id);
    assert(res22.status === 200, `Authenticated request returned 200 (got ${res22.status})`);
    assert(res22.body.opportunityId === oppIdEligible, 'Response contains opportunityId');
    assert(res22.body.overallStatus === 'ELIGIBLE', `User A (2026) is ELIGIBLE for 2026 role (got ${res22.body.overallStatus})`);
    assert(res22.body.criteria.graduationBatch.status === 'ELIGIBLE', 'Batch criterion is ELIGIBLE');
    assert(res22.body.category === 'FRESHER', 'Category is FRESHER');

    // Verify sanitization: internal DB details must NOT leak
    assert(res22.body.sourceContentHash === undefined, 'sourceContentHash is omitted from client response');
    assert(res22.body.evidenceRecords === undefined, 'evidenceRecords table is omitted from client response');
    assert(res22.body.classifierVersion === undefined, 'classifierVersion is omitted from client response');

    // Test 23: Opportunity without eligibility record returns 200 UNKNOWN
    console.log('\nTest 23: Opportunity without eligibility returns 200 with UNKNOWN status');
    const res23 = await request(app)
      .get(`/api/opportunities/${oppIdNoElig}/eligibility`)
      .set('x-test-user-id', userA_Id);
    assert(res23.status === 200, `Returned 200 for opportunity without eligibility (got ${res23.status})`);
    assert(res23.body.overallStatus === 'UNKNOWN', `Overall status is UNKNOWN (got ${res23.body.overallStatus})`);
    assert(res23.body.overallExplanation.includes('not been evaluated or persisted'), 'Clear explanation for missing eligibility');

    // Test 24: Candidate Data Isolation
    console.log('\nTest 24: Candidate data isolation (User B evaluated independently)');
    const res24 = await request(app)
      .get(`/api/opportunities/${oppIdEligible}/eligibility`)
      .set('x-test-user-id', userB_Id);
    assert(res24.status === 200, `User B request returned 200 (got ${res24.status})`);
    assert(res24.body.overallStatus === 'NOT_ELIGIBLE', `User B (2023) is NOT_ELIGIBLE (got ${res24.body.overallStatus})`);
    assert(res24.body.criteria.graduationBatch.status === 'NOT_ELIGIBLE', 'User B batch is NOT_ELIGIBLE');

  } finally {
    // Restore Prisma methods
    (prisma.profile as any).findUnique = originalProfileFindUnique;
    (prisma.opportunity as any).findUnique = originalOpportunityFindUnique;
  }

  console.log('\n================================================================');
  console.log(`  M2.5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
