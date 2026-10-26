/**
 * Opportunity Matching End-to-End Verification Suite
 *
 * Runs strictly against the isolated test database on Port 5433.
 * Verifies the complete end-to-end matching journey:
 * 1. Opportunity listing (/api/opportunities) returns enriched match summary for authenticated candidates.
 * 2. Unauthenticated requests return 200 OK with match: null.
 * 3. Sorting by match_desc ranks highest match first and places unstructured at the end.
 * 4. Filtering by matchFilter (e.g. 60_plus, unavailable) returns strictly matching subsets.
 * 5. Opportunity detail match (/api/opportunities/:id/match) and list match strictly agree.
 * 6. Candidate with 0 matching skills gets 0% with clear missing skills breakdown.
 * 7. Candidate with matching skills gets accurate score with evidence breakdown.
 * 8. Unstructured opportunity gets score: null and hasStructuredRequirements: false (never synthetic 0%).
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import express, { Response, Request } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient, OpportunityType, WorkMode, EmploymentType, ExperienceLevel, RequirementType, SkillCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ─── Port 5433 Safety Guard ──────────────────────────────────────────────────
const TEST_DB_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public';
if (!TEST_DB_URL.includes(':5433/') || TEST_DB_URL.includes(':5432/')) {
  console.error('\n[FATAL SAFETY VIOLATION] Must target isolated test database on port 5433 only.\n');
  process.exit(1);
}

// Redirect process.env.DATABASE_URL to port 5433 before any route uses lib/prisma
process.env.DATABASE_URL = TEST_DB_URL;

const pool = new pg.Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);
(global as any).prisma = prisma;

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

async function runTests() {
  console.log('='.repeat(70));
  console.log('OPPORTUNITY MATCHING END-TO-END VERIFICATION (PORT 5433)');
  console.log('='.repeat(70));

  const cleanupUserIds: string[] = [];
  const cleanupSkillIds: string[] = [];
  const cleanupOppIds: string[] = [];

  try {
    // 1. Create Skills
    const skillTs = await prisma.skill.create({
      data: { name: `TypeScript_${Date.now()}`, category: SkillCategory.LANGUAGE },
    });
    const skillReact = await prisma.skill.create({
      data: { name: `React_${Date.now()}`, category: SkillCategory.FRAMEWORK },
    });
    const skillNode = await prisma.skill.create({
      data: { name: `Node.js_${Date.now()}`, category: SkillCategory.FRAMEWORK },
    });
    const skillK8s = await prisma.skill.create({
      data: { name: `Kubernetes_${Date.now()}`, category: SkillCategory.TOOL },
    });
    const skillTerraform = await prisma.skill.create({
      data: { name: `Terraform_${Date.now()}`, category: SkillCategory.TOOL },
    });

    cleanupSkillIds.push(skillTs.id, skillReact.id, skillNode.id, skillK8s.id, skillTerraform.id);

    // 2. Create Candidate A (Fullstack: TS, React, Node)
    const userA = await prisma.user.create({
      data: {
        email: `cand_a_${Date.now()}@test.org`,
        clerkId: `clerk_cand_a_${Date.now()}`,
      },
    });
    cleanupUserIds.push(userA.id);

    const profileA = await prisma.profile.create({
      data: {
        userId: userA.id,
        fullName: 'Candidate Alpha',
        targetRole: 'Full Stack Engineer',
      },
    });

    await prisma.candidateSkill.createMany({
      data: [
        { profileId: profileA.id, skillId: skillTs.id, proficiency: 'ADVANCED' },
        { profileId: profileA.id, skillId: skillReact.id, proficiency: 'EXPERT' },
      ],
    });

    const projectA = await prisma.project.create({
      data: {
        profileId: profileA.id,
        name: 'Alpha Microservices',
        description: 'Microservice backend built with Node.js and TypeScript',
      },
    });

    await prisma.projectSkill.createMany({
      data: [
        { projectId: projectA.id, skillId: skillNode.id },
        { projectId: projectA.id, skillId: skillTs.id },
      ],
    });

    // 3. Create Candidate B (Disjoint skills - e.g. Cooking)
    const userB = await prisma.user.create({
      data: {
        email: `cand_b_${Date.now()}@test.org`,
        clerkId: `clerk_cand_b_${Date.now()}`,
      },
    });
    cleanupUserIds.push(userB.id);

    await prisma.profile.create({
      data: {
        userId: userB.id,
        fullName: 'Candidate Beta',
        targetRole: 'Junior DevOps',
      },
    });

    // 4. Create Opportunities
    // Opp 1: High Match for A (Requires TS, React, Node.js - 3 of 3 matched = 100% required = 80% total score)
    const oppHigh = await prisma.opportunity.create({
      data: {
        title: `Fullstack Lead Engineer_${Date.now()}`,
        organization: 'Acme High Tech',
        description: 'Building modern web applications.',
        type: OpportunityType.JOB,
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://acme.example.com/apply/high',
        source: 'greenhouse',
        postedDate: new Date('2026-10-20T10:00:00Z'),
        opportunitySkills: {
          create: [
            { skillId: skillTs.id, requirementType: RequirementType.REQUIRED },
            { skillId: skillReact.id, requirementType: RequirementType.REQUIRED },
            { skillId: skillNode.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    cleanupOppIds.push(oppHigh.id);

    // Opp 2: Zero Match for A (Requires K8s, Terraform)
    const oppZero = await prisma.opportunity.create({
      data: {
        title: `Cloud SRE Architect_${Date.now()}`,
        organization: 'Infra Cloud Corp',
        description: 'Managing Kubernetes clusters and Terraform.',
        type: OpportunityType.JOB,
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://infra.example.com/apply/sre',
        source: 'lever',
        postedDate: new Date('2026-10-25T10:00:00Z'),
        opportunitySkills: {
          create: [
            { skillId: skillK8s.id, requirementType: RequirementType.REQUIRED },
            { skillId: skillTerraform.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    cleanupOppIds.push(oppZero.id);

    // Opp 3: Unstructured (0 skills extracted)
    const oppUnstructured = await prisma.opportunity.create({
      data: {
        title: `Business Operations Specialist_${Date.now()}`,
        organization: 'Operations Global',
        description: 'Coordinate business operations across teams.',
        type: OpportunityType.JOB,
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://ops.example.com/apply/ops',
        source: 'jobicy',
        postedDate: new Date('2026-10-26T10:00:00Z'),
      },
    });
    cleanupOppIds.push(oppUnstructured.id);

    // ─── Set up Express Test Apps ─────────────────────────────────────────────
    const { default: opportunitiesRoutes } = await import('./routes/opportunities');

    // Unauthenticated App
    const unauthedApp = express();
    unauthedApp.use(express.json());
    unauthedApp.use('/api/opportunities', opportunitiesRoutes);

    // Authed App for Candidate A
    const authedAppA = express();
    authedAppA.use(express.json());
    authedAppA.use((req: AuthRequest, _res: Response, next) => {
      req.userId = userA.id;
      next();
    });
    authedAppA.use('/api/opportunities', opportunitiesRoutes);

    // Authed App for Candidate B
    const authedAppB = express();
    authedAppB.use(express.json());
    authedAppB.use((req: AuthRequest, _res: Response, next) => {
      req.userId = userB.id;
      next();
    });
    authedAppB.use('/api/opportunities', opportunitiesRoutes);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: Unauthenticated Opportunity Listing
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 1: Unauthenticated Opportunity Listing ---');
    const resUnauthed = await request(unauthedApp).get('/api/opportunities');
    assert(resUnauthed.status === 200, 'Unauthenticated GET /api/opportunities returns 200 OK');
    assert(Array.isArray(resUnauthed.body.opportunities), 'Returns opportunities array');
    const unauthedOpp = resUnauthed.body.opportunities.find((o: any) => o.id === oppHigh.id);
    assert(unauthedOpp !== undefined, 'Contains created test opportunity');
    assert(unauthedOpp.match === null, 'Unauthenticated opportunity has match === null');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: Authenticated Listing for Candidate A (with skills)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 2: Authenticated Listing for Candidate A ---');
    const resAuthedA = await request(authedAppA).get('/api/opportunities');
    assert(resAuthedA.status === 200, 'Authenticated GET /api/opportunities returns 200 OK');
    
    const highA = resAuthedA.body.opportunities.find((o: any) => o.id === oppHigh.id);
    assert(highA !== undefined, 'Found high-match opportunity in listing');
    assert(highA.match !== null && highA.match !== undefined, 'Opportunity contains match summary');
    assert(highA.match.hasStructuredRequirements === true, 'highA.match has hasStructuredRequirements: true');
    assert(highA.match.matchedCount === 3, 'highA.match has matchedCount === 3');
    assert(highA.match.missingCount === 0, 'highA.match has missingCount === 0');
    assert(highA.match.score === 100, 'highA.match score is 100% (all 3 required matched, no preferred)');

    const zeroA = resAuthedA.body.opportunities.find((o: any) => o.id === oppZero.id);
    assert(zeroA !== undefined, 'Found zero-match opportunity in listing');
    assert(zeroA.match.hasStructuredRequirements === true, 'zeroA has hasStructuredRequirements: true');
    assert(zeroA.match.score === 0, 'zeroA has score === 0%');
    assert(zeroA.match.matchedCount === 0, 'zeroA has matchedCount === 0');
    assert(zeroA.match.missingCount === 2, 'zeroA has missingCount === 2');

    const unstructA = resAuthedA.body.opportunities.find((o: any) => o.id === oppUnstructured.id);
    assert(unstructA !== undefined, 'Found unstructured opportunity in listing');
    assert(unstructA.match.hasStructuredRequirements === false, 'unstructA has hasStructuredRequirements: false');
    assert(unstructA.match.score === null, 'unstructA has score === null (never synthetic 0%)');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: Opportunity Detail Match (/api/opportunities/:id/match) Agreement
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 3: Detail Match Agreement with List Match ---');
    const detailHighA = await request(authedAppA).get(`/api/opportunities/${oppHigh.id}/match`);
    assert(detailHighA.status === 200, 'GET /opportunities/:id/match returns 200 OK');
    assert(detailHighA.body.score === highA.match.score, 'Detail score (100%) matches list score (100%) exactly');
    assert(detailHighA.body.requiredMatched.length === 3, 'Detail requiredMatched count is 3');
    assert(detailHighA.body.requiredMissing.length === 0, 'Detail requiredMissing count is 0');
    assert(detailHighA.body.evidence[skillTs.id] !== undefined, 'Evidence for TypeScript is provided');
    assert(detailHighA.body.evidence[skillNode.id] !== undefined, 'Evidence for Node.js is provided');

    const detailZeroA = await request(authedAppA).get(`/api/opportunities/${oppZero.id}/match`);
    assert(detailZeroA.status === 200, 'Zero-match detail returns 200 OK');
    assert(detailZeroA.body.score === 0, 'Zero-match detail score is 0%');
    assert(detailZeroA.body.requiredMatched.length === 0, 'Zero-match requiredMatched is empty');
    assert(detailZeroA.body.requiredMissing.length === 2, 'Zero-match requiredMissing lists all 2 missing skills');

    const detailUnstructA = await request(authedAppA).get(`/api/opportunities/${oppUnstructured.id}/match`);
    assert(detailUnstructA.status === 200, 'Unstructured detail returns 200 OK');
    assert(detailUnstructA.body.score === null, 'Unstructured detail score is null');
    assert(detailUnstructA.body.hasStructuredRequirements === false, 'Unstructured detail hasStructuredRequirements is false');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: Sorting by Match Score (sort=match_desc)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 4: Sorting by Match Score (sort=match_desc) ---');
    const resSorted = await request(authedAppA).get('/api/opportunities?sort=match_desc');
    assert(resSorted.status === 200, 'GET /api/opportunities?sort=match_desc returns 200 OK');
    const sortedOpps = resSorted.body.opportunities;
    
    // Find positions of created opportunities
    const idxHigh = sortedOpps.findIndex((o: any) => o.id === oppHigh.id);
    const idxZero = sortedOpps.findIndex((o: any) => o.id === oppZero.id);
    const idxUnstruct = sortedOpps.findIndex((o: any) => o.id === oppUnstructured.id);

    assert(idxHigh < idxZero, `High match (pos ${idxHigh}) precedes zero match (pos ${idxZero})`);
    assert(idxZero < idxUnstruct, `Zero match (pos ${idxZero}) precedes unstructured null (pos ${idxUnstruct})`);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: Filtering by Match Quality (matchFilter)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 5: Match Quality Filters ---');
    const res60Plus = await request(authedAppA).get('/api/opportunities?matchFilter=60_plus');
    assert(res60Plus.status === 200, 'GET ?matchFilter=60_plus returns 200 OK');
    const hasHighIn60 = res60Plus.body.opportunities.some((o: any) => o.id === oppHigh.id);
    const hasZeroIn60 = res60Plus.body.opportunities.some((o: any) => o.id === oppZero.id);
    const hasUnstructIn60 = res60Plus.body.opportunities.some((o: any) => o.id === oppUnstructured.id);
    assert(hasHighIn60 === true, '60_plus filter includes 80% opportunity');
    assert(hasZeroIn60 === false, '60_plus filter excludes 0% opportunity');
    assert(hasUnstructIn60 === false, '60_plus filter excludes unstructured opportunity');

    const resBelow40 = await request(authedAppA).get('/api/opportunities?matchFilter=below_40');
    assert(resBelow40.status === 200, 'GET ?matchFilter=below_40 returns 200 OK');
    const hasZeroInBelow40 = resBelow40.body.opportunities.some((o: any) => o.id === oppZero.id);
    const hasHighInBelow40 = resBelow40.body.opportunities.some((o: any) => o.id === oppHigh.id);
    assert(hasZeroInBelow40 === true, 'below_40 filter includes 0% opportunity');
    assert(hasHighInBelow40 === false, 'below_40 filter excludes 80% opportunity');

    const resUnavail = await request(authedAppA).get('/api/opportunities?matchFilter=unavailable');
    assert(resUnavail.status === 200, 'GET ?matchFilter=unavailable returns 200 OK');
    const hasUnstructInUnavail = resUnavail.body.opportunities.some((o: any) => o.id === oppUnstructured.id);
    const hasHighInUnavail = resUnavail.body.opportunities.some((o: any) => o.id === oppHigh.id);
    assert(hasUnstructInUnavail === true, 'unavailable filter includes unstructured opportunity');
    assert(hasHighInUnavail === false, 'unavailable filter excludes structured high-match opportunity');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 6: Search by keyword (search parameter)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 6: Search Parameter ---');
    const resSearch = await request(authedAppA).get('/api/opportunities?search=Fullstack');
    assert(resSearch.status === 200, 'GET ?search=Fullstack returns 200 OK');
    assert(resSearch.body.opportunities.some((o: any) => o.id === oppHigh.id), 'Search found oppHigh by title');
    assert(!resSearch.body.opportunities.some((o: any) => o.id === oppZero.id), 'Search excluded oppZero');

    const resSearchOrg = await request(authedAppA).get('/api/opportunities?search=Infra%20Cloud');
    assert(resSearchOrg.status === 200, 'GET ?search=Infra Cloud returns 200 OK');
    assert(resSearchOrg.body.opportunities.some((o: any) => o.id === oppZero.id), 'Search found oppZero by organization');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 7: Candidate B with 0 skills
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 7: Candidate B (0 skills) ---');
    const resAuthedB = await request(authedAppB).get('/api/opportunities');
    const highB = resAuthedB.body.opportunities.find((o: any) => o.id === oppHigh.id);
    assert(highB !== undefined, 'Candidate B sees high-match opportunity');
    assert(highB.match.score === 0, 'Candidate B with 0 skills scores 0% on structured opportunity');
    assert(highB.match.matchedCount === 0, 'Candidate B matchedCount is 0');
    assert(highB.match.missingCount === 3, 'Candidate B missingCount is 3');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Clean up created records on Port 5433
    console.log('\nCleaning up test records on Port 5433...');
    if (cleanupOppIds.length > 0) {
      await prisma.opportunitySkill.deleteMany({ where: { opportunityId: { in: cleanupOppIds } } });
      await prisma.opportunity.deleteMany({ where: { id: { in: cleanupOppIds } } });
    }
    if (cleanupUserIds.length > 0) {
      const profiles = await prisma.profile.findMany({ where: { userId: { in: cleanupUserIds } } });
      const profileIds = profiles.map(p => p.id);
      await prisma.projectSkill.deleteMany({ where: { project: { profileId: { in: profileIds } } } });
      await prisma.project.deleteMany({ where: { profileId: { in: profileIds } } });
      await prisma.candidateSkill.deleteMany({ where: { profileId: { in: profileIds } } });
      await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
    }
    if (cleanupSkillIds.length > 0) {
      await prisma.skill.deleteMany({ where: { id: { in: cleanupSkillIds } } });
    }
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('='.repeat(70));
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
