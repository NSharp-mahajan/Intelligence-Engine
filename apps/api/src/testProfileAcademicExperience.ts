/**
 * M2.6: Candidate Academic & Experience Profile Test Suite
 *
 * Comprehensive tests for:
 * - Profile Creation (POST /api/profile) with academic & experience fields
 * - Profile Partial Update (PUT /api/profile) preserving omitted fields
 * - Explicit null clearing of optional academic & experience fields
 * - Strict CGPA scale validation (SCALE_10_0, SCALE_4_0, SCALE_7_0, SCALE_UNKNOWN)
 * - Numeric range validations (percentage 0-100, non-negative backlogs & experience)
 * - Backlog history independence (active backlogs vs historical backlogs)
 * - Candidate eligibility evaluator integration with real candidate facts (converting UNKNOWN -> ELIGIBLE/NOT_ELIGIBLE)
 * - Opportunity eligibility endpoint integration (GET /api/opportunities/:id/eligibility) with candidate profile
 * - Auth enforcement and candidate isolation (tenant boundaries)
 *
 * STRICTLY complies with project safety boundary: ZERO live database connections or writes.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import profileRouter from './routes/profile';
import opportunitiesRouter from './routes/opportunities';
import { prisma } from './lib/prisma';
import {
  candidateEligibilityEvaluator,
  type CandidateProfileInput,
  type OpportunityEligibilityInput,
} from './services/candidateEligibilityEvaluator';

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
  console.log('  M2.6: CANDIDATE ACADEMIC & EXPERIENCE PROFILE TEST SUITE');
  console.log('================================================================\n');

  // In-memory mock databases
  const mockProfiles = new Map<string, any>();
  const mockOpportunities = new Map<string, any>();

  // Monkey-patch Prisma Client methods in memory
  const originalProfileFindUnique = prisma.profile.findUnique;
  const originalProfileCreate = prisma.profile.create;
  const originalProfileUpdate = prisma.profile.update;
  const originalOpportunityFindUnique = prisma.opportunity.findUnique;

  (prisma.profile as any).findUnique = async ({ where }: any) => {
    return mockProfiles.get(where.userId) || null;
  };

  (prisma.profile as any).create = async ({ data }: any) => {
    const record = {
      id: `prof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProfiles.set(data.userId, record);
    return record;
  };

  (prisma.profile as any).update = async ({ where, data }: any) => {
    const existing = mockProfiles.get(where.userId);
    if (!existing) throw new Error('Record not found');
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    mockProfiles.set(where.userId, updated);
    return updated;
  };

  (prisma.opportunity as any).findUnique = async ({ where }: any) => {
    return mockOpportunities.get(where.id) || null;
  };

  // Set up mock Express app
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
  app.use('/api/profile', profileRouter);
  app.use('/api/opportunities', opportunitiesRouter);

  try {
    const user1 = 'candidate-usr-001';
    const user2 = 'candidate-usr-002';

    // ─── Phase 1: Authentication & Isolation ─────────────────────────────────
    console.log('Test 1: Unauthenticated request to GET /api/profile returns 401');
    {
      const res = await request(app).get('/api/profile');
      assert(res.status === 401, `Status is 401 (got ${res.status})`);
      assert(res.body.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
    }

    console.log('\nTest 2: GET /api/profile when profile does not exist returns 404 PROFILE_NOT_FOUND');
    {
      const res = await request(app)
        .get('/api/profile')
        .set('x-test-user-id', user1);
      assert(res.status === 404, `Status is 404 (got ${res.status})`);
      assert(res.body.error?.code === 'PROFILE_NOT_FOUND', 'Error code is PROFILE_NOT_FOUND');
    }

    // ─── Phase 2: Profile Creation with Academic & Experience Fields ─────────
    console.log('\nTest 3: POST /api/profile creates profile with all 8 new fields');
    {
      const payload = {
        fullName: 'Aarav Sharma',
        university: 'IIT Madras',
        graduationYear: 2026,
        targetRole: 'Software Development Engineer',
        degree: 'B.Tech',
        branch: 'Computer Science and Engineering',
        cgpa: 8.75,
        cgpaScale: 'SCALE_10_0',
        percentage: 84.5,
        activeBacklogs: 0,
        hasBacklogHistory: false,
        experienceMonths: 6,
      };

      const res = await request(app)
        .post('/api/profile')
        .set('x-test-user-id', user1)
        .send(payload);

      assert(res.status === 201, `Status is 201 Created (got ${res.status})`);
      assert(res.body.profile.fullName === 'Aarav Sharma', 'Full name saved');
      assert(res.body.profile.degree === 'B.Tech', 'Degree saved');
      assert(res.body.profile.branch === 'Computer Science and Engineering', 'Branch saved');
      assert(res.body.profile.cgpa === 8.75, 'CGPA saved');
      assert(res.body.profile.cgpaScale === 'SCALE_10_0', 'CGPA scale saved');
      assert(res.body.profile.percentage === 84.5, 'Percentage saved');
      assert(res.body.profile.activeBacklogs === 0, 'Active backlogs saved');
      assert(res.body.profile.hasBacklogHistory === false, 'Backlog history saved');
      assert(res.body.profile.experienceMonths === 6, 'Experience months saved');
      assert(res.body.profileComplete === true, 'profileComplete is true');
    }

    console.log('\nTest 4: POST /api/profile for existing user returns 409 PROFILE_EXISTS');
    {
      const res = await request(app)
        .post('/api/profile')
        .set('x-test-user-id', user1)
        .send({ fullName: 'Duplicate Creation' });

      assert(res.status === 409, `Status is 409 (got ${res.status})`);
      assert(res.body.error?.code === 'PROFILE_EXISTS', 'Error code is PROFILE_EXISTS');
    }

    // ─── Phase 3: Partial Updates & Omitted Fields Preservation ───────────────
    console.log('\nTest 5: PUT /api/profile preserves omitted fields during partial update');
    {
      // Update only experienceMonths and targetRole, omitting degree, cgpa, etc.
      const res = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({
          experienceMonths: 12,
          targetRole: 'Senior SDE Intern',
        });

      assert(res.status === 200, `Status is 200 OK (got ${res.status})`);
      assert(res.body.profile.experienceMonths === 12, 'experienceMonths updated to 12');
      assert(res.body.profile.targetRole === 'Senior SDE Intern', 'targetRole updated');
      // Verify omitted fields remained unchanged
      assert(res.body.profile.degree === 'B.Tech', 'Omitted degree preserved');
      assert(res.body.profile.branch === 'Computer Science and Engineering', 'Omitted branch preserved');
      assert(res.body.profile.cgpa === 8.75, 'Omitted CGPA preserved');
      assert(res.body.profile.cgpaScale === 'SCALE_10_0', 'Omitted CGPA scale preserved');
      assert(res.body.profile.percentage === 84.5, 'Omitted percentage preserved');
      assert(res.body.profile.activeBacklogs === 0, 'Omitted activeBacklogs preserved');
      assert(res.body.profile.hasBacklogHistory === false, 'Omitted hasBacklogHistory preserved');
    }

    // ─── Phase 4: Explicit Null Clearing ──────────────────────────────────────
    console.log('\nTest 6: PUT /api/profile clears fields when explicit null is provided');
    {
      const res = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({
          percentage: null,
          experienceMonths: null,
        });

      assert(res.status === 200, `Status is 200 OK (got ${res.status})`);
      assert(res.body.profile.percentage === null, 'percentage cleared to null');
      assert(res.body.profile.experienceMonths === null, 'experienceMonths cleared to null');
      // Other fields should still be preserved
      assert(res.body.profile.cgpa === 8.75, 'CGPA preserved when clearing other fields');
      assert(res.body.profile.degree === 'B.Tech', 'Degree preserved');
    }

    // ─── Phase 5: Validation & Range Constraints ──────────────────────────────
    console.log('\nTest 7: CGPA Scale validation & bounds');
    {
      // Missing scale when CGPA is present
      const resMissingScale = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ cgpa: 3.8, cgpaScale: null });
      assert(resMissingScale.status === 400, 'CGPA with null scale rejected (400)');
      assert(resMissingScale.body.error?.code === 'VALIDATION_ERROR', 'Error is VALIDATION_ERROR');

      // SCALE_4_0 max 4.0
      const res4Max = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ cgpa: 4.5, cgpaScale: 'SCALE_4_0' });
      assert(res4Max.status === 400, 'CGPA 4.5 on SCALE_4_0 rejected (400)');

      // SCALE_7_0 max 7.0
      const res7Max = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ cgpa: 7.2, cgpaScale: 'SCALE_7_0' });
      assert(res7Max.status === 400, 'CGPA 7.2 on SCALE_7_0 rejected (400)');

      // SCALE_10_0 max 10.0
      const res10Max = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ cgpa: 10.5, cgpaScale: 'SCALE_10_0' });
      assert(res10Max.status === 400, 'CGPA 10.5 on SCALE_10_0 rejected (400)');

      // Negative CGPA
      const resNegCgpa = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ cgpa: -1.0, cgpaScale: 'SCALE_10_0' });
      assert(resNegCgpa.status === 400, 'Negative CGPA rejected (400)');
    }

    console.log('\nTest 8: Percentage range validation (0 - 100)');
    {
      const resOver100 = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ percentage: 105.0 });
      assert(resOver100.status === 400, 'Percentage > 100 rejected (400)');

      const resNegPct = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ percentage: -5.0 });
      assert(resNegPct.status === 400, 'Negative percentage rejected (400)');
    }

    console.log('\nTest 9: Backlogs & Experience non-negative integer validations');
    {
      const resNegBacklogs = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ activeBacklogs: -2 });
      assert(resNegBacklogs.status === 400, 'Negative active backlogs rejected (400)');

      const resFloatBacklogs = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ activeBacklogs: 1.5 });
      assert(resFloatBacklogs.status === 400, 'Float active backlogs rejected (400)');

      const resNegExp = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ experienceMonths: -1 });
      assert(resNegExp.status === 400, 'Negative experience months rejected (400)');

      const resFloatExp = await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ experienceMonths: 3.5 });
      assert(resFloatExp.status === 400, 'Float experience months rejected (400)');
    }

    // ─── Phase 6: Backlog History Independence ────────────────────────────────
    console.log('\nTest 10: Backlog History vs Active Backlogs independence');
    {
      // Candidate has cleared past backlogs: activeBacklogs = 0, hasBacklogHistory = true
      const candidateCleared: CandidateProfileInput = {
        graduationYear: 2026,
        activeBacklogs: 0,
        hasBacklogHistory: true,
      };

      // Candidate has clean record: activeBacklogs = 0, hasBacklogHistory = false
      const candidateClean: CandidateProfileInput = {
        graduationYear: 2026,
        activeBacklogs: 0,
        hasBacklogHistory: false,
      };

      // Policy 1: NO_ACTIVE (allows cleared history)
      const policyNoActive: OpportunityEligibilityInput = {
        category: 'ENTRY_LEVEL',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        backlogPolicy: 'NO_ACTIVE',
        batchConstraint: 'UNRESTRICTED',
        experienceConstraint: 'UNRESTRICTED',
        academicConstraint: 'UNRESTRICTED',
        degreeConstraint: 'UNRESTRICTED',
        branchConstraint: 'UNRESTRICTED',
      };

      const resCleared_NoActive = candidateEligibilityEvaluator.evaluate(candidateCleared, policyNoActive);
      assert(resCleared_NoActive.criteria.backlog.status === 'ELIGIBLE', 'Candidate with cleared backlogs passes NO_ACTIVE policy');

      // Policy 2: NO_HISTORY (strictly forbids any past backlog)
      const policyNoHistory: OpportunityEligibilityInput = {
        ...policyNoActive,
        backlogPolicy: 'NO_HISTORY',
      };

      const resCleared_NoHistory = candidateEligibilityEvaluator.evaluate(candidateCleared, policyNoHistory);
      assert(resCleared_NoHistory.criteria.backlog.status === 'NOT_ELIGIBLE', 'Candidate with cleared backlogs fails NO_HISTORY policy');

      const resClean_NoHistory = candidateEligibilityEvaluator.evaluate(candidateClean, policyNoHistory);
      assert(resClean_NoHistory.criteria.backlog.status === 'ELIGIBLE', 'Candidate with clean history passes NO_HISTORY policy');
    }

    // ─── Phase 7: Evaluator Real Facts Mapping (Transforming UNKNOWN) ──────────
    console.log('\nTest 11: Real candidate profile facts convert UNKNOWN to ELIGIBLE or NOT_ELIGIBLE');
    {
      const opportunityReqs: OpportunityEligibilityInput = {
        category: 'FRESHER',
        overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        batchConstraint: 'RESTRICTED',
        eligibleBatches: [2026],
        experienceConstraint: 'RESTRICTED',
        experienceBoundType: 'MAXIMUM_ONLY',
        maxExperienceMonths: 12,
        academicConstraint: 'RESTRICTED',
        academicEvaluationMode: 'SINGLE_CRITERION',
        minCgpa: 8.0,
        cgpaScale: 'SCALE_10_0',
        backlogPolicy: 'NO_ACTIVE',
        degreeConstraint: 'RESTRICTED',
        eligibleDegrees: ['BTECH'],
        branchConstraint: 'RESTRICTED',
        eligibleBranches: ['CSE'],
      };

      // Case A: Missing academic facts (old M2.5 behavior -> UNKNOWN)
      const sparseCandidate: CandidateProfileInput = {
        graduationYear: 2026,
      };
      const resSparse = candidateEligibilityEvaluator.evaluate(sparseCandidate, opportunityReqs);
      assert(resSparse.criteria.academics.status === 'UNKNOWN', 'Sparse candidate academics is UNKNOWN');
      assert(resSparse.criteria.experience.status === 'UNKNOWN', 'Sparse candidate experience is UNKNOWN');
      assert(resSparse.criteria.degree.status === 'UNKNOWN', 'Sparse candidate degree is UNKNOWN');
      assert(resSparse.criteria.branch.status === 'UNKNOWN', 'Sparse candidate branch is UNKNOWN');
      assert(resSparse.overallStatus === 'UNKNOWN', 'Sparse candidate overall status is UNKNOWN');

      // Case B: Real candidate meeting requirements (M2.6 -> ELIGIBLE)
      const qualifiedCandidate: CandidateProfileInput = {
        graduationYear: 2026,
        degree: 'B.Tech',
        branch: 'Computer Science and Engineering',
        cgpa: 8.5,
        cgpaScale: 'SCALE_10_0',
        activeBacklogs: 0,
        hasBacklogHistory: false,
        experienceMonths: 4,
      };
      const resQualified = candidateEligibilityEvaluator.evaluate(qualifiedCandidate, opportunityReqs);
      assert(resQualified.criteria.academics.status === 'ELIGIBLE', 'Academics evaluated to ELIGIBLE with real CGPA');
      assert(resQualified.criteria.experience.status === 'ELIGIBLE', 'Experience evaluated to ELIGIBLE with real months');
      assert(resQualified.criteria.degree.status === 'ELIGIBLE', 'Degree evaluated to ELIGIBLE with real degree');
      assert(resQualified.criteria.branch.status === 'ELIGIBLE', 'Branch evaluated to ELIGIBLE with real branch');
      assert(resQualified.criteria.backlog.status === 'ELIGIBLE', 'Backlog evaluated to ELIGIBLE with real backlogs');
      assert(resQualified.overallStatus === 'ELIGIBLE', 'Qualified candidate overall status is ELIGIBLE');

      // Case C: Real candidate failing requirements (M2.6 -> NOT_ELIGIBLE)
      const disqualifiedCandidate: CandidateProfileInput = {
        graduationYear: 2026,
        degree: 'B.Com', // Disqualified
        branch: 'Accounting',
        cgpa: 7.2, // Below 8.0
        cgpaScale: 'SCALE_10_0',
        activeBacklogs: 2, // Has active backlogs
        experienceMonths: 24, // Exceeds 12 months max
      };
      const resDisqualified = candidateEligibilityEvaluator.evaluate(disqualifiedCandidate, opportunityReqs);
      assert(resDisqualified.criteria.academics.status === 'NOT_ELIGIBLE', 'Academics evaluated to NOT_ELIGIBLE');
      assert(resDisqualified.criteria.experience.status === 'NOT_ELIGIBLE', 'Experience evaluated to NOT_ELIGIBLE');
      assert(resDisqualified.criteria.degree.status === 'NOT_ELIGIBLE', 'Degree evaluated to NOT_ELIGIBLE');
      assert(resDisqualified.criteria.backlog.status === 'NOT_ELIGIBLE', 'Backlog evaluated to NOT_ELIGIBLE');
      assert(resDisqualified.overallStatus === 'NOT_ELIGIBLE', 'Disqualified candidate overall status is NOT_ELIGIBLE');
    }

    // ─── Phase 8: Opportunity Eligibility API Integration ─────────────────────
    console.log('\nTest 12: GET /api/opportunities/:id/eligibility uses candidate stored profile facts');
    {
      const oppId = 'opp-fresher-tech';
      mockOpportunities.set(oppId, {
        id: oppId,
        title: 'Associate Software Engineer - 2026 Batch',
        organization: 'Infosys',
        eligibility: {
          category: 'FRESHER',
          overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          batchConstraint: 'RESTRICTED',
          eligibleBatches: [2026],
          experienceConstraint: 'RESTRICTED',
          experienceBoundType: 'MAXIMUM_ONLY',
          maxExperienceMonths: 12,
          academicConstraint: 'RESTRICTED',
          academicEvaluationMode: 'SINGLE_CRITERION',
          minCgpa: 8.0,
          cgpaScale: 'SCALE_10_0',
          backlogPolicy: 'NO_ACTIVE',
          degreeConstraint: 'RESTRICTED',
          eligibleDegrees: ['BTECH'],
          branchConstraint: 'RESTRICTED',
          eligibleBranches: ['CSE'],
          hasConflict: false,
          sourceContentHash: 'hash-abc-123',
          classifierVersion: 'early-career-v1',
        },
      });

      // User1 profile in mockProfiles currently has:
      // degree: 'B.Tech', branch: 'Computer Science and Engineering', cgpa: 8.75, cgpaScale: 'SCALE_10_0', activeBacklogs: 0
      // Let's set experienceMonths to 6 so candidate satisfies all criteria
      await request(app)
        .put('/api/profile')
        .set('x-test-user-id', user1)
        .send({ experienceMonths: 6 });

      const res = await request(app)
        .get(`/api/opportunities/${oppId}/eligibility`)
        .set('x-test-user-id', user1);

      assert(res.status === 200, `API returned 200 OK (got ${res.status})`);
      assert(res.body.overallStatus === 'ELIGIBLE', 'Evaluation overallStatus is ELIGIBLE');
      assert(res.body.criteria.experience.status === 'ELIGIBLE', 'Experience criterion is ELIGIBLE');
      assert(res.body.criteria.academics.status === 'ELIGIBLE', 'Academics criterion is ELIGIBLE');
      assert(res.body.criteria.degree.status === 'ELIGIBLE', 'Degree criterion is ELIGIBLE');
      assert(res.body.criteria.branch.status === 'ELIGIBLE', 'Branch criterion is ELIGIBLE');
      assert(res.body.criteria.backlog.status === 'ELIGIBLE', 'Backlog criterion is ELIGIBLE');
    }

    // ─── Phase 9: Candidate Tenant Isolation ──────────────────────────────────
    console.log('\nTest 13: Candidate data isolation between users');
    {
      // Create user2 profile with different academic metrics
      await request(app)
        .post('/api/profile')
        .set('x-test-user-id', user2)
        .send({
          fullName: 'Bhavna Patel',
          university: 'Gujarat University',
          graduationYear: 2024,
          degree: 'B.Sc',
          cgpa: 6.8,
          cgpaScale: 'SCALE_10_0',
        });

      // Fetch user1 profile - should be unaffected by user2
      const resUser1 = await request(app)
        .get('/api/profile')
        .set('x-test-user-id', user1);
      assert(resUser1.body.profile.fullName === 'Aarav Sharma', 'User1 profile retains its own full name');
      assert(resUser1.body.profile.degree === 'B.Tech', 'User1 profile retains its own degree');

      // Fetch user2 profile
      const resUser2 = await request(app)
        .get('/api/profile')
        .set('x-test-user-id', user2);
      assert(resUser2.body.profile.fullName === 'Bhavna Patel', 'User2 profile retrieves user2 data');
      assert(resUser2.body.profile.degree === 'B.Sc', 'User2 profile retrieves user2 degree');
    }

  } finally {
    // Restore monkey patches
    (prisma.profile as any).findUnique = originalProfileFindUnique;
    (prisma.profile as any).create = originalProfileCreate;
    (prisma.profile as any).update = originalProfileUpdate;
    (prisma.opportunity as any).findUnique = originalOpportunityFindUnique;
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
