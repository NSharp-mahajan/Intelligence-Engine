/**
 * Core Integration Verification Suite
 *
 * Verifies:
 * 1. User.clerkId schema alignment and migration in isolated test PostgreSQL (port 5433).
 * 2. DashboardService deterministic matching, enriched recommendations, and skill gaps.
 * 3. Opportunity Match logic and contract (score, requiredMatched, preferredMatched, evidence).
 * 4. Route registration in Express (mounting of /api/dashboard and GET /:opportunityId/match).
 * 5. Frontend portal alignment (removal of fabricated 75%/85% scores).
 */

import { randomUUID } from 'crypto';
import { PrismaClient, OpportunityType, WorkMode, EmploymentType, ExperienceLevel, RequirementType, SkillCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// ─── Safety Guard for Port 5433 ──────────────────────────────────────────────
const TEST_DB_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public';
if (!TEST_DB_URL.includes(':5433/') || TEST_DB_URL.includes(':5432/')) {
  console.error('\n[FATAL SAFETY VIOLATION] Must target isolated test database on port 5433 only.\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

import { DashboardService } from './services/dashboardService';
import { MatchingService } from './services/matchingService';

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

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('INTELLIGENCE-ENGINE — CORE INTEGRATION REPAIR VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Target Test DB: ${TEST_DB_URL.replace(/:([^:@]+)@/, ':***@')}\n`);

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: User.clerkId Schema & Database Migration
    // ══════════════════════════════════════════════════════════════════════════
    console.log('--- Part 1: User.clerkId Schema & Database Migration ---');

    // 1.1 Column definitions in PostgreSQL
    const colRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position;
    `);
    const cols = colRes.rows.map(r => r.column_name);
    assert(cols.includes('clerkId'), 'PostgreSQL "User" table has "clerkId" column');
    assert(cols.includes('passwordHash'), 'PostgreSQL "User" table has "passwordHash" column');

    const clerkIdCol = colRes.rows.find(r => r.column_name === 'clerkId');
    assert(clerkIdCol?.is_nullable === 'YES', '"clerkId" is nullable in PostgreSQL');

    const pwCol = colRes.rows.find(r => r.column_name === 'passwordHash');
    assert(pwCol?.is_nullable === 'YES', '"passwordHash" is nullable in PostgreSQL');

    // 1.2 Unique constraint check
    const idxRes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'User' AND indexname = 'User_clerkId_key';
    `);
    assert(idxRes.rows.length === 1, 'Unique index "User_clerkId_key" exists on "User"(clerkId)');

    // 1.3 Prisma Migration record in _prisma_migrations
    const migRes = await pool.query(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%add_clerk_id_to_user%';
    `);
    assert(migRes.rows.length === 1, 'Canonical migration "add_clerk_id_to_user" recorded in "_prisma_migrations"');

    // 1.4 Preserving existing user records and creating Clerk user
    const testClerkEmail = `clerk_user_${Date.now()}@example.com`;
    const testLegacyEmail = `legacy_user_${Date.now()}@example.com`;
    const clerkIdVal = `clerk_id_${Date.now()}`;

    const legacyUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: testLegacyEmail,
        passwordHash: 'hashed_pw_legacy',
      },
    });
    assert(legacyUser.clerkId === null, 'Legacy user created with null clerkId');
    assert(legacyUser.passwordHash === 'hashed_pw_legacy', 'Legacy user passwordHash stored');

    const clerkUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: testClerkEmail,
        clerkId: clerkIdVal,
      },
    });
    assert(clerkUser.clerkId === clerkIdVal, 'Clerk user created with clerkId');
    assert(clerkUser.passwordHash === null, 'Clerk user created without passwordHash');

    // Find by clerkId
    const foundUser = await prisma.user.findUnique({
      where: { clerkId: clerkIdVal },
    });
    assert(foundUser?.id === clerkUser.id, 'User found by clerkId via Prisma findUnique');

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: Dashboard Service & Route Mounting
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Part 2: Dashboard Service & Mounting ---');

    // 2.1 Seed test candidate profile, skills, and opportunities
    const candidateSkillId = randomUUID();
    const candidateSkillName = `skill_cand_${Date.now()}`;
    await prisma.skill.create({
      data: {
        id: candidateSkillId,
        name: candidateSkillName,
        category: SkillCategory.TOOL,
      },
    });

    const otherSkillId = randomUUID();
    const otherSkillName = `skill_other_${Date.now()}`;
    await prisma.skill.create({
      data: {
        id: otherSkillId,
        name: otherSkillName,
        category: SkillCategory.TOOL,
      },
    });

    const thirdSkillId = randomUUID();
    const thirdSkillName = `skill_third_${Date.now()}`;
    await prisma.skill.create({
      data: {
        id: thirdSkillId,
        name: thirdSkillName,
        category: SkillCategory.TOOL,
      },
    });

    const profile = await prisma.profile.create({
      data: {
        id: randomUUID(),
        userId: clerkUser.id,
        fullName: 'Jane Integration Tester',
        targetRole: 'Software Engineer',
        candidateSkills: {
          create: [
            { skillId: candidateSkillId, proficiency: 'EXPERT' },
          ],
        },
      },
    });

    // Create an opportunity with 3 structured skills (eligible for dashboard)
    const oppEligible = await prisma.opportunity.create({
      data: {
        id: randomUUID(),
        title: 'Full Stack Integration Engineer',
        organization: 'Core Systems Inc',
        description: 'Building robust core pipelines',
        type: OpportunityType.JOB,
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://example.com/apply/1',
        source: 'TestCoreIntegration',
        sourceJobId: `job_${Date.now()}_1`,
        opportunitySkills: {
          create: [
            { skillId: candidateSkillId, requirementType: RequirementType.REQUIRED },
            { skillId: otherSkillId, requirementType: RequirementType.REQUIRED },
            { skillId: thirdSkillId, requirementType: RequirementType.PREFERRED },
          ],
        },
      },
    });

    // 2.2 Test DashboardService directly
    const dashboardService = new DashboardService(prisma);
    const dashboardData = await dashboardService.getDashboardData(clerkUser.id);

    assert(dashboardData.hasProfile === true, 'DashboardData reports hasProfile: true');
    assert(dashboardData.metrics.skillsCount >= 1, 'Dashboard metrics include skillsCount');
    assert(dashboardData.recommendations.length >= 1, 'Dashboard recommendations populated');

    const rec = dashboardData.recommendations.find(r => r.id === oppEligible.id);
    assert(rec !== undefined, 'Eligible opportunity included in dashboard recommendations');
    assert(typeof rec?.match.score === 'number' && rec.match.score > 0, `Recommendation has authoritative score (got ${rec?.match.score}%)`);
    assert(rec?.match.matchedCount === 1, `Matched count is 1 (got ${rec?.match.matchedCount})`);
    assert(rec?.match.missingCount === 2, `Missing count is 2 (got ${rec?.match.missingCount})`);
    assert(Array.isArray(rec?.match.matchedSkills) && rec.match.matchedSkills.includes(candidateSkillName), 'rec.match.matchedSkills contains candidate skill name');
    assert(Array.isArray(rec?.match.missingSkills) && rec.match.missingSkills.includes(otherSkillName), 'rec.match.missingSkills contains missing skill name');
    assert(rec?.type === OpportunityType.JOB, 'rec.type matches OpportunityType');
    assert(rec?.experienceLevel === ExperienceLevel.MID, 'rec.experienceLevel matches');
    assert(Array.isArray(rec?.opportunitySkills) && rec.opportunitySkills.length === 3, 'rec.opportunitySkills contains 3 structured skills');

    // 2.3 Verify index.ts route mounting
    const indexSource = fs.readFileSync(path.resolve(__dirname, 'index.ts'), 'utf8');
    assert(indexSource.includes("app.use('/api/dashboard', dashboardRoutes)"), 'index.ts mounts /api/dashboard');
    assert(indexSource.includes("app.use('/api/opportunities', opportunitiesRoutes)"), 'index.ts mounts /api/opportunities');

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: Opportunity Match Endpoint Contract & Logic
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Part 3: Opportunity Match Endpoint Contract & Logic ---');

    // 3.1 Verify opportunities.ts has route defined
    const oppSource = fs.readFileSync(path.resolve(__dirname, 'routes/opportunities.ts'), 'utf8');
    assert(oppSource.includes("router.get('/:opportunityId/match', requireAuth,"), 'routes/opportunities.ts declares GET /:opportunityId/match with requireAuth');

    // 3.2 Test MatchingService logic for this opportunity
    const matchingService = new MatchingService(prisma);
    const evidenceMap = await matchingService.buildCandidateEvidenceMapByUserId(clerkUser.id);
    assert(evidenceMap !== null, 'Candidate evidence map constructed');

    const oppWithSkills = await prisma.opportunity.findUnique({
      where: { id: oppEligible.id },
      include: {
        opportunitySkills: {
          include: { skill: true },
        },
      },
    });

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap!, oppWithSkills!);
    assert(matchResult.hasStructuredRequirements === true, 'Match result has structured requirements');
    assert(typeof matchResult.score === 'number', `Computed match score is a number (${matchResult.score}%)`);
    assert(matchResult.requiredMatched.some(s => s.skillName === candidateSkillName), 'Candidate skill is in requiredMatched');
    assert(matchResult.requiredMissing.some(s => s.skillName === otherSkillName), 'Other skill is in requiredMissing');
    assert(matchResult.preferredMissing.some(s => s.skillName === thirdSkillName), 'Third skill is in preferredMissing');

    // 3.3 Verify contract serialization matches MatchResultResponse
    const evidenceObj: Record<string, any[]> = {};
    for (const [key, value] of matchResult.evidence.entries()) {
      evidenceObj[key] = value;
    }
    const responsePayload = {
      score: matchResult.score,
      requiredMatched: matchResult.requiredMatched,
      requiredMissing: matchResult.requiredMissing,
      preferredMatched: matchResult.preferredMatched,
      preferredMissing: matchResult.preferredMissing,
      evidence: evidenceObj,
      hasStructuredRequirements: matchResult.hasStructuredRequirements,
    };

    assert(responsePayload.score === matchResult.score, 'Payload score aligns');
    assert(typeof responsePayload.evidence === 'object', 'Payload evidence is a Record object');
    assert(Array.isArray(responsePayload.requiredMatched), 'requiredMatched is an array');

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: Frontend Portal Source Inspection
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Part 4: Frontend Portal Source Inspection ---');

    const portalSourcePath = path.resolve(__dirname, '../../web/app/(auth)/portal/page.tsx');
    const portalSource = fs.readFileSync(portalSourcePath, 'utf8');

    assert(!portalSource.includes('matchScore = 75'), 'Arbitrary 75% fallback score removed from portal');
    assert(!portalSource.includes('matchScore = 85'), 'Arbitrary 85% fallback score removed from portal');
    assert(portalSource.includes('/dashboard'), 'Portal calls /dashboard API endpoint');
    assert(portalSource.includes('rec.match.score'), 'Portal renders match percentage from rec.match.score');
    assert(!portalSource.includes('Math.round((matchedSkills.length / totalReqs) * 100)'), 'Client-side naive score formula removed');

    // ══════════════════════════════════════════════════════════════════════════
    // CLEANUP TEST DATA
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.opportunitySkill.deleteMany({ where: { opportunityId: oppEligible.id } });
    await prisma.opportunity.delete({ where: { id: oppEligible.id } });
    await prisma.candidateSkill.deleteMany({ where: { profileId: profile.id } });
    await prisma.profile.delete({ where: { id: profile.id } });
    await prisma.skill.deleteMany({
      where: { id: { in: [candidateSkillId, otherSkillId, thirdSkillId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [clerkUser.id, legacyUser.id] } },
    });

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`CORE INTEGRATION SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) process.exit(1);
}

runAllTests();
