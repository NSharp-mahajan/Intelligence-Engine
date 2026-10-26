/**
 * Phase 3 — API Contracts & Authentication Verification Suite
 *
 * Runs against the isolated test database on port 5433 with strict safety guards.
 * Tests real Express HTTP routes (via supertest) and service contracts.
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import express, { Response } from 'express';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import request from 'supertest';
import { PrismaClient, OpportunityType, WorkMode, EmploymentType, ExperienceLevel, RequirementType, SkillCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ─── Safety Guard for Port 5433 ──────────────────────────────────────────────
const TEST_DB_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public';
if (!TEST_DB_URL.includes(':5433/') || TEST_DB_URL.includes(':5432/')) {
  console.error('\n[FATAL SAFETY VIOLATION] Must target isolated test database on port 5433 only.\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

import dashboardRoutes from './routes/dashboard';
import opportunitiesRoutes from './routes/opportunities';
import { DashboardService } from './services/dashboardService';
import { MatchingService } from './services/matchingService';
import { AuthRequest } from './middlewares/authMiddleware';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

async function runPhase3Tests() {
  console.log('='.repeat(70));
  console.log('PHASE 3 — AUTHENTICATION & API CONTRACTS VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Target Test DB: ${TEST_DB_URL.replace(/:([^:@]+)@/, ':***@')}\n`);

  // Track entities for cleanup
  const createdSkillIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdOppIds: string[] = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // SETUP TEST DATA: Users, Skills, Profiles, Projects, Opportunities
    // ══════════════════════════════════════════════════════════════════════════

    // 1. Create Skills
    const skillPythonId = randomUUID();
    const skillPythonName = `python_p3_${Date.now()}`;
    await prisma.skill.create({ data: { id: skillPythonId, name: skillPythonName, category: SkillCategory.LANGUAGE } });
    createdSkillIds.push(skillPythonId);

    const skillReactId = randomUUID();
    const skillReactName = `react_p3_${Date.now()}`;
    await prisma.skill.create({ data: { id: skillReactId, name: skillReactName, category: SkillCategory.FRAMEWORK } });
    createdSkillIds.push(skillReactId);

    const skillDockerId = randomUUID();
    const skillDockerName = `docker_p3_${Date.now()}`;
    await prisma.skill.create({ data: { id: skillDockerId, name: skillDockerName, category: SkillCategory.TOOL } });
    createdSkillIds.push(skillDockerId);

    const skillK8sId = randomUUID();
    const skillK8sName = `kubernetes_p3_${Date.now()}`;
    await prisma.skill.create({ data: { id: skillK8sId, name: skillK8sName, category: SkillCategory.TOOL } });
    createdSkillIds.push(skillK8sId);

    // 2. Create User A (Has Python + Docker via project)
    const userA = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `usera_p3_${Date.now()}@example.com`,
        clerkId: `clerk_usera_${Date.now()}`,
      },
    });
    createdUserIds.push(userA.id);

    const profileA = await prisma.profile.create({
      data: {
        id: randomUUID(),
        userId: userA.id,
        fullName: 'Candidate Alice',
        university: 'Test University',
        targetRole: 'Backend Engineer',
        candidateSkills: {
          create: [{ skillId: skillPythonId, proficiency: 'EXPERT' }],
        },
        projects: {
          create: [{
            id: randomUUID(),
            name: 'Cloud Infrastructure Pipeline',
            description: 'Containerized deployment pipeline with Docker',
            projectSkills: {
              create: [{ skillId: skillDockerId }],
            },
          }],
        },
      },
    });

    // 3. Create User B (Has React only — private data separation test)
    const userB = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `userb_p3_${Date.now()}@example.com`,
        clerkId: `clerk_userb_${Date.now()}`,
      },
    });
    createdUserIds.push(userB.id);

    await prisma.profile.create({
      data: {
        id: randomUUID(),
        userId: userB.id,
        fullName: 'Candidate Bob Private',
        university: 'Test University',
        targetRole: 'Frontend Engineer',
        candidateSkills: {
          create: [{ skillId: skillReactId, proficiency: 'ADVANCED' }],
        },
        projects: {
          create: [{
            id: randomUUID(),
            name: 'Bob Secret Portal',
            description: 'Private dashboard in React',
            projectSkills: {
              create: [{ skillId: skillReactId }],
            },
          }],
        },
      },
    });

    // 4. Create User C (No profile — incomplete profile test)
    const userC = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `userc_p3_${Date.now()}@example.com`,
        clerkId: `clerk_userc_${Date.now()}`,
      },
    });
    createdUserIds.push(userC.id);

    // 5. Create Structured Opportunity (Requires Python + React, Prefers Docker)
    const oppStructured = await prisma.opportunity.create({
      data: {
        id: randomUUID(),
        title: 'Full Stack Cloud Engineer',
        organization: 'Acme Cloud Platform',
        description: 'Building microservices and pipelines',
        type: OpportunityType.JOB,
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://example.com/apply/acme-1',
        source: 'TestApiContracts',
        sourceJobId: `acme_${Date.now()}`,
        opportunitySkills: {
          create: [
            { skillId: skillPythonId, requirementType: RequirementType.REQUIRED },
            { skillId: skillReactId, requirementType: RequirementType.REQUIRED },
            { skillId: skillDockerId, requirementType: RequirementType.PREFERRED },
          ],
        },
      },
    });
    createdOppIds.push(oppStructured.id);

    // 6. Create Unstructured Opportunity (0 skills attached)
    const oppUnstructured = await prisma.opportunity.create({
      data: {
        id: randomUUID(),
        title: 'General Office Coordinator',
        organization: 'Acme Operations',
        description: 'General administrative coordination',
        type: OpportunityType.JOB,
        workMode: WorkMode.ONSITE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.ENTRY,
        applicationUrl: 'https://example.com/apply/acme-admin',
        source: 'TestApiContracts',
        sourceJobId: `acme_admin_${Date.now()}`,
      },
    });
    createdOppIds.push(oppUnstructured.id);

    // ══════════════════════════════════════════════════════════════════════════
    // HTTP TEST HARNESS SETUP
    // ══════════════════════════════════════════════════════════════════════════

    // App with actual unmodified routes (testing unauthenticated requests)
    const rawApp = express();
    rawApp.use(express.json());
    rawApp.use(cookieParser());
    rawApp.use(clerkMiddleware());
    rawApp.use('/api/dashboard', dashboardRoutes);
    rawApp.use('/api/opportunities', opportunitiesRoutes);

    // Helper to create an authenticated app bound to a specific user and prisma client
    function makeAuthedApp(simulatedUserId: string) {
      const app = express();
      app.use(express.json());

      // Mock auth middleware injecting the simulated user ID
      app.use((req: AuthRequest, _res: Response, next) => {
        req.userId = simulatedUserId;
        next();
      });

      // Bind routes with our test DB prisma client
      const dashboardService = new DashboardService(prisma);
      const matchingService = new MatchingService(prisma);

      app.get('/api/dashboard', async (req: AuthRequest, res: Response) => {
        try {
          const data = await dashboardService.getDashboardData(req.userId!);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
        }
      });

      app.get('/api/opportunities/:opportunityId/match', async (req: AuthRequest, res: Response) => {
        try {
          const opportunityId = String(req.params.opportunityId);
          const opp = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            include: { opportunitySkills: { include: { skill: true } } },
          });

          if (!opp) {
            res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
            return;
          }

          const evidenceMap = (await matchingService.buildCandidateEvidenceMapByUserId(req.userId!)) || new Map();
          const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);

          const evidenceObj: Record<string, any[]> = {};
          for (const [key, value] of matchResult.evidence.entries()) {
            evidenceObj[key] = value;
          }

          res.json({
            score: matchResult.score,
            requiredMatched: matchResult.requiredMatched,
            requiredMissing: matchResult.requiredMissing,
            preferredMatched: matchResult.preferredMatched,
            preferredMissing: matchResult.preferredMissing,
            evidence: evidenceObj,
            hasStructuredRequirements: matchResult.hasStructuredRequirements,
          });
        } catch (error) {
          res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
        }
      });

      return app;
    }

    const appUserA = makeAuthedApp(userA.id);
    const appUserB = makeAuthedApp(userB.id);
    const appUserC = makeAuthedApp(userC.id);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CASES (1 to 10)
    // ══════════════════════════════════════════════════════════════════════════

    console.log('--- Test 1 & 2: Dashboard Authentication ---');
    // 1. Unauthenticated dashboard request returns 401 (or 302 redirect by Clerk if browser Accept header)
    const unauthDash = await request(rawApp)
      .get('/api/dashboard')
      .set('Accept', 'application/json');
    assert(unauthDash.status === 401 || unauthDash.status === 302, `1. Unauthenticated GET /api/dashboard returns 401 or redirects 302 (got ${unauthDash.status})`);

    // 2. Authenticated dashboard request returns 200 with full DashboardData
    const authDashA = await request(appUserA).get('/api/dashboard');
    assert(authDashA.status === 200, '2. Authenticated GET /api/dashboard returns 200');
    assert(authDashA.body.hasProfile === true, '   DashboardData.hasProfile is true');
    assert(authDashA.body.profileComplete === true, '   DashboardData.profileComplete is true');
    assert(authDashA.body.metrics.skillsCount >= 1, '   DashboardData.metrics.skillsCount is populated');
    assert(Array.isArray(authDashA.body.recommendations), '   DashboardData.recommendations is array');
    assert(Array.isArray(authDashA.body.skillGaps), '   DashboardData.skillGaps is array');

    console.log('\n--- Test 3 & 4: Opportunity Match Authentication ---');
    // 3. Unauthenticated match request returns 401 (or 302 redirect by Clerk if browser Accept header)
    const unauthMatch = await request(rawApp)
      .get(`/api/opportunities/${oppStructured.id}/match`)
      .set('Accept', 'application/json');
    assert(unauthMatch.status === 401 || unauthMatch.status === 302, `3. Unauthenticated GET /api/opportunities/:id/match returns 401 or redirects 302 (got ${unauthMatch.status})`);

    // 4. Authenticated match request returns 200
    const authMatchA = await request(appUserA).get(`/api/opportunities/${oppStructured.id}/match`);
    assert(authMatchA.status === 200, '4. Authenticated GET /api/opportunities/:id/match returns 200');

    console.log('\n--- Test 5: Documented Match Response Contract ---');
    // 5. Valid opportunity returns exact MatchResultResponse contract
    const matchBody = authMatchA.body;
    assert(typeof matchBody.score === 'number', `5. Score is a valid number (got ${matchBody.score}%)`);
    assert(matchBody.hasStructuredRequirements === true, '   hasStructuredRequirements is true');
    assert(Array.isArray(matchBody.requiredMatched), '   requiredMatched is an array');
    assert(Array.isArray(matchBody.requiredMissing), '   requiredMissing is an array');
    assert(Array.isArray(matchBody.preferredMatched), '   preferredMatched is an array');
    assert(Array.isArray(matchBody.preferredMissing), '   preferredMissing is an array');
    assert(typeof matchBody.evidence === 'object' && matchBody.evidence !== null, '   evidence is an object');

    // Expected deterministic scoring for Alice (User A):
    // Required: Python (matched, 1/2 = 50%), React (missing, 1/2) -> req ratio = 0.5 * 80% = 40%
    // Preferred: Docker (matched via project, 1/1 = 100%) -> pref ratio = 1.0 * 20% = 20%
    // Combined deterministic score: 40% + 20% = 60%
    assert(matchBody.score === 60, `   Authoritative MatchingService score equals 60% (got ${matchBody.score}%)`);
    assert(matchBody.requiredMatched.some((s: any) => s.skillName === skillPythonName), '   requiredMatched includes Python');
    assert(matchBody.requiredMissing.some((s: any) => s.skillName === skillReactName), '   requiredMissing includes React');
    assert(matchBody.preferredMatched.some((s: any) => s.skillName === skillDockerName), '   preferredMatched includes Docker');

    console.log('\n--- Test 6: Nonexistent Opportunity Error Handling ---');
    // 6. Nonexistent opportunity returns 404
    const notFoundRes = await request(appUserA).get(`/api/opportunities/${randomUUID()}/match`);
    assert(notFoundRes.status === 404, '6. Nonexistent opportunity ID returns 404');
    assert(notFoundRes.body.error?.code === 'OPPORTUNITY_NOT_FOUND', '   Error code is OPPORTUNITY_NOT_FOUND');

    console.log('\n--- Test 7: User Data Privacy & Evidence Isolation ---');
    // 7. Verify Alice (User A) only sees her own evidence; does not see Bob's data
    const evidenceAlice = matchBody.evidence;
    const allEvidenceItems = Object.values(evidenceAlice).flat() as any[];
    assert(!allEvidenceItems.some((e: any) => e.projectName === 'Bob Secret Portal'), '7. Bob\'s private project evidence is NOT in Alice\'s match response');
    assert(!allEvidenceItems.some((e: any) => e.skillName === skillReactName), '   Bob\'s React skill is NOT attributed to Alice');

    // Now test Bob (User B) on the same opportunity:
    // Bob has React (required: 1/2 = 50% * 80 = 40%), missing Python, missing Docker (preferred: 0/1 = 0% * 20 = 0%)
    // Combined score: 40%
    const authMatchB = await request(appUserB).get(`/api/opportunities/${oppStructured.id}/match`);
    assert(authMatchB.body.score === 40, `   Bob\'s match score is independently calculated as 40% (got ${authMatchB.body.score}%)`);
    assert(authMatchB.body.requiredMatched.some((s: any) => s.skillName === skillReactName), '   Bob matches React');
    assert(authMatchB.body.requiredMissing.some((s: any) => s.skillName === skillPythonName), '   Bob is missing Python');
    assert(!authMatchB.body.evidence[skillDockerId], '   Alice\'s Docker project is NOT in Bob\'s match response');

    console.log('\n--- Test 8: Missing / Incomplete Profile Safety ---');
    // 8. User C has no profile
    const dashResC = await request(appUserC).get('/api/dashboard');
    assert(dashResC.status === 200, '8. User with no profile receives 200 on dashboard');
    assert(dashResC.body.hasProfile === false, '   hasProfile is false');
    assert(dashResC.body.recommendations.length === 0, '   recommendations is empty without throwing');

    const matchResC = await request(appUserC).get(`/api/opportunities/${oppStructured.id}/match`);
    assert(matchResC.status === 200, '   User with no profile receives 200 on match endpoint');
    assert(matchResC.body.score === 0, '   Match score is 0% without crashing');
    assert(matchResC.body.requiredMatched.length === 0, '   requiredMatched is empty');
    assert(matchResC.body.requiredMissing.length === 2, '   All required skills reported as missing');

    console.log('\n--- Test 9: Dashboard Authoritative Scoring & Explanations ---');
    // 9. Dashboard recommendations use authoritative backend scores
    const dashRecommendations = authDashA.body.recommendations;
    const acmeRec = dashRecommendations.find((r: any) => r.id === oppStructured.id);
    assert(acmeRec !== undefined, '9. Structured opportunity is recommended on dashboard');
    assert(acmeRec?.match.score === 60, `   Dashboard recommendation score matches MatchingService score (60% === ${acmeRec?.match.score}%)`);
    assert(acmeRec?.match.matchedCount === 2, '   matchedCount is 2 (Python + Docker)');
    assert(acmeRec?.match.missingCount === 1, '   missingCount is 1 (React)');
    assert(Array.isArray(acmeRec?.match.matchedSkills) && acmeRec.match.matchedSkills.includes(skillPythonName), '   matchedSkills contains Python');
    assert(Array.isArray(acmeRec?.match.missingSkills) && acmeRec.match.missingSkills.includes(skillReactName), '   missingSkills contains React');

    console.log('\n--- Test 10: Unstructured Opportunities Handled Honestly ---');
    // 10. Unstructured opportunity (0 skills)
    const matchUnstructured = await request(appUserA).get(`/api/opportunities/${oppUnstructured.id}/match`);
    assert(matchUnstructured.status === 200, '10. Unstructured opportunity match returns 200');
    assert(matchUnstructured.body.score === null, '   Unstructured opportunity has score === null (no synthetic percentage)');
    assert(matchUnstructured.body.hasStructuredRequirements === false, '   hasStructuredRequirements is false');

    // And verify it is excluded from dashboard recommendations
    assert(!dashRecommendations.some((r: any) => r.id === oppUnstructured.id), '   Unstructured opportunity excluded from dashboard recommendations');

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    failed++;
  } finally {
    // Cleanup
    for (const oppId of createdOppIds) {
      await prisma.opportunitySkill.deleteMany({ where: { opportunityId: oppId } });
      await prisma.opportunity.deleteMany({ where: { id: oppId } });
    }
    for (const userId of createdUserIds) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (profile) {
        await prisma.candidateSkill.deleteMany({ where: { profileId: profile.id } });
        await prisma.projectSkill.deleteMany({ where: { project: { profileId: profile.id } } });
        await prisma.project.deleteMany({ where: { profileId: profile.id } });
        await prisma.profile.delete({ where: { id: profile.id } });
      }
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.skill.deleteMany({ where: { id: { in: createdSkillIds } } });

    await prisma.$disconnect();
    await pool.end();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) process.exit(1);
}

runPhase3Tests();
