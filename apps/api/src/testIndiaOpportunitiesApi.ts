/**
 * Phase 2 India Opportunities API Verification Suite
 *
 * Runs strictly against the isolated test database on Port 5433.
 * Verifies all requirements for GET /api/opportunities/india:
 * 1. Indian city filters and alias normalization (Bengaluru, Hyderabad, Pune, Delhi-NCR, Mumbai, Chennai, All).
 * 2. Stage filtering (INTERNSHIP, ENTRY, ALL) with exact semantics.
 * 3. Work mode filtering (REMOTE, HYBRID, ONSITE) and validation.
 * 4. Validation error handling (HTTP 400 with VALIDATION_ERROR) on invalid parameters.
 * 5. Strict India eligibility (overseas-only and ambiguous bare remote excluded).
 * 6. Balanced employer round-robin interleaving (no single company dominates page 1).
 * 7. Stable pagination across adjacent pages (zero duplicates).
 * 8. Sorting options (balanced, posted_desc, posted_asc, match_desc).
 * 9. Authenticated candidate matching vs unauthenticated match: null.
 * 10. Unstructured jobs receive score: null and hasStructuredRequirements: false.
 * 11. Company branding logos populated on every returned opportunity.
 * 12. Existing /api/opportunities endpoint remains unaffected.
 */

import 'dotenv/config';
import express, { Response } from 'express';
import request from 'supertest';
import {
  PrismaClient,
  OpportunityType,
  WorkMode,
  EmploymentType,
  ExperienceLevel,
  RequirementType,
  SkillCategory,
} from '@prisma/client';
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
  console.log('   PHASE 2: INDIA OPPORTUNITIES API VERIFICATION (PORT 5433)');
  console.log('='.repeat(70));

  const cleanupUserIds: string[] = [];
  const cleanupSkillIds: string[] = [];
  const cleanupOppIds: string[] = [];

  try {
    // ─── 0. Fixture Setup ────────────────────────────────────────────────────
    console.log('\n--- Setting up Test Fixtures on Port 5433 ---');

    // Skills
    const skillTs = await prisma.skill.create({
      data: { name: `TypeScript_India_${Date.now()}`, category: SkillCategory.LANGUAGE },
    });
    const skillPython = await prisma.skill.create({
      data: { name: `Python_India_${Date.now()}`, category: SkillCategory.LANGUAGE },
    });
    cleanupSkillIds.push(skillTs.id, skillPython.id);

    // Candidate User & Profile
    const testUser = await prisma.user.create({
      data: {
        email: `india_cand_${Date.now()}@test.in`,
        clerkId: `clerk_india_${Date.now()}`,
      },
    });
    cleanupUserIds.push(testUser.id);

    const testProfile = await prisma.profile.create({
      data: {
        userId: testUser.id,
        fullName: 'Arjun Sharma',
        targetRole: 'Software Engineer',
      },
    });

    await prisma.candidateSkill.create({
      data: { profileId: testProfile.id, skillId: skillTs.id, proficiency: 'ADVANCED' },
    });

    // Opportunities
    const now = Date.now();

    // 1. Bengaluru - Databricks Job 1 (Matches candidate skill TS)
    const oppBlr1 = await prisma.opportunity.create({
      data: {
        title: `Software Engineer - Backend_${now}`,
        organization: 'Databricks',
        description: 'Scalable data platform services in Bengaluru.',
        location: 'Bengaluru, India',
        workMode: WorkMode.HYBRID,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://databricks.com/jobs/1',
        source: 'greenhouse',
        sourceJobId: `test-ind-blr-1-${now}`,
        postedDate: new Date('2026-10-27T10:00:00Z'),
      },
    });
    cleanupOppIds.push(oppBlr1.id);
    await prisma.opportunitySkill.create({
      data: {
        opportunityId: oppBlr1.id,
        skillId: skillTs.id,
        requirementType: RequirementType.REQUIRED,
      },
    });

    // 2. Bengaluru - Databricks Job 2
    const oppBlr2 = await prisma.opportunity.create({
      data: {
        title: `Distributed Systems Engineer_${now}`,
        organization: 'Databricks',
        description: 'Distributed storage infrastructure.',
        location: 'Bangalore', // Alias
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://databricks.com/jobs/2',
        source: 'greenhouse',
        sourceJobId: `test-ind-blr-2-${now}`,
        postedDate: new Date('2026-10-26T10:00:00Z'),
      },
    });
    cleanupOppIds.push(oppBlr2.id);

    // 3. Hyderabad - Okta Job 1
    const oppHyd1 = await prisma.opportunity.create({
      data: {
        title: `Identity Platform Engineer_${now}`,
        organization: 'Okta',
        description: 'Authentication core services.',
        location: 'Hyderabad, Telangana, India',
        workMode: WorkMode.HYBRID,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://okta.com/jobs/1',
        source: 'greenhouse',
        sourceJobId: `test-ind-hyd-1-${now}`,
        postedDate: new Date('2026-10-27T09:00:00Z'),
      },
    });
    cleanupOppIds.push(oppHyd1.id);

    // 4. Hyderabad - Okta Job 2
    const oppHyd2 = await prisma.opportunity.create({
      data: {
        title: `Cloud Infrastructure Associate_${now}`,
        organization: 'Okta',
        description: 'AWS and identity infrastructure.',
        location: 'Secunderabad', // Alias for Hyderabad
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.ENTRY,
        applicationUrl: 'https://okta.com/jobs/2',
        source: 'greenhouse',
        sourceJobId: `test-ind-hyd-2-${now}`,
        postedDate: new Date('2026-10-25T09:00:00Z'),
      },
    });
    cleanupOppIds.push(oppHyd2.id);

    // 5. Pune - Rubrik Job 1 (Internship)
    const oppPuneIntern = await prisma.opportunity.create({
      data: {
        title: `Software Engineering Intern_${now}`,
        organization: 'Rubrik',
        description: 'Internship on zero-trust data security.',
        location: 'Pune, Maharashtra, India',
        workMode: WorkMode.ONSITE,
        type: OpportunityType.INTERNSHIP,
        employmentType: EmploymentType.INTERNSHIP,
        experienceLevel: ExperienceLevel.ENTRY,
        applicationUrl: 'https://rubrik.com/jobs/intern-1',
        source: 'greenhouse',
        sourceJobId: `test-ind-pune-intern-${now}`,
        postedDate: new Date('2026-10-27T08:00:00Z'),
      },
    });
    cleanupOppIds.push(oppPuneIntern.id);

    // 6. Delhi-NCR - Rubrik Job 2 (Entry level job)
    const oppDelhiEntry = await prisma.opportunity.create({
      data: {
        title: `Associate QA Engineer_${now}`,
        organization: 'Rubrik',
        description: 'Automation testing in Gurugram.',
        location: 'Gurugram, India', // Sub-city of Delhi-NCR
        workMode: WorkMode.HYBRID,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.ENTRY,
        applicationUrl: 'https://rubrik.com/jobs/entry-1',
        source: 'greenhouse',
        sourceJobId: `test-ind-delhi-entry-${now}`,
        postedDate: new Date('2026-10-26T08:00:00Z'),
      },
    });
    cleanupOppIds.push(oppDelhiEntry.id);

    // 7. Mumbai - InMobi Job 1
    const oppMumbai = await prisma.opportunity.create({
      data: {
        title: `Data Analyst_${now}`,
        organization: 'InMobi',
        description: 'Marketing analytics in Mumbai.',
        location: 'Mumbai, Maharashtra',
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://inmobi.com/jobs/1',
        source: 'greenhouse',
        sourceJobId: `test-ind-mum-1-${now}`,
        postedDate: new Date('2026-10-24T08:00:00Z'),
      },
    });
    cleanupOppIds.push(oppMumbai.id);

    // 8. Chennai - Spotify Job 1
    const oppChennai = await prisma.opportunity.create({
      data: {
        title: `Audio Platform Engineer_${now}`,
        organization: 'Spotify',
        description: 'Music streaming infrastructure.',
        location: 'Chennai, India',
        workMode: WorkMode.HYBRID,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://spotify.com/jobs/1',
        source: 'lever',
        sourceJobId: `test-ind-chn-1-${now}`,
        postedDate: new Date('2026-10-23T08:00:00Z'),
      },
    });
    cleanupOppIds.push(oppChennai.id);

    // 9. Remote - India (Explicit India Remote)
    const oppRemoteIndia = await prisma.opportunity.create({
      data: {
        title: `Senior Python Engineer_${now}`,
        organization: 'Groww',
        description: 'Fintech services open across India.',
        location: 'Remote - India',
        workMode: WorkMode.REMOTE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://groww.in/jobs/1',
        source: 'greenhouse',
        sourceJobId: `test-ind-rem-1-${now}`,
        postedDate: new Date('2026-10-27T07:00:00Z'),
      },
    });
    cleanupOppIds.push(oppRemoteIndia.id);

    // 10. Overseas Role (Should NEVER appear in India endpoint)
    const oppOverseas = await prisma.opportunity.create({
      data: {
        title: `US Solutions Architect_${now}`,
        organization: 'Databricks',
        description: 'San Francisco enterprise accounts. Must reside in the US.',
        location: 'San Francisco, CA, USA',
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://databricks.com/jobs/us-1',
        source: 'greenhouse',
        sourceJobId: `test-overseas-sf-${now}`,
        postedDate: new Date('2026-10-27T12:00:00Z'),
      },
    });
    cleanupOppIds.push(oppOverseas.id);

    // 10B. Overseas Role with Indian City Homonym (Delhi, NY, USA - Must NEVER appear in India endpoint)
    const oppDelhiUSA = await prisma.opportunity.create({
      data: {
        title: `Civil Engineer_${now}`,
        organization: 'EmpireState Infrastructure',
        description: 'Municipal engineering in upstate New York.',
        location: 'Delhi, NY, USA',
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://empire.example.com/jobs/delhi-ny',
        source: 'jobicy',
        sourceJobId: `test-delhi-ny-usa-${now}`,
        postedDate: new Date('2026-10-27T12:30:00Z'),
      },
    });
    cleanupOppIds.push(oppDelhiUSA.id);

    // 10C. Indian location with Overseas Authorization Conflict (Must NEVER appear in India endpoint)
    const oppConflict = await prisma.opportunity.create({
      data: {
        title: `US Defense Liaison_${now}`,
        organization: 'DefenseCorp',
        description: 'Liaison office. Active TS/SCI security clearance required. US citizenship required.',
        location: 'Bengaluru, India',
        workMode: WorkMode.ONSITE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://defense.example.com/jobs/liaison-1',
        source: 'jobicy',
        sourceJobId: `test-defense-liaison-${now}`,
        postedDate: new Date('2026-10-27T12:45:00Z'),
      },
    });
    cleanupOppIds.push(oppConflict.id);

    // 11. Ambiguous Bare Remote Role (Should NEVER appear in India endpoint)
    const oppAmbiguousRemote = await prisma.opportunity.create({
      data: {
        title: `General Remote Contributor_${now}`,
        organization: 'GlobalTech',
        description: 'Remote role anywhere. No country details.',
        location: 'Remote',
        workMode: WorkMode.REMOTE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.CONTRACT,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://global.example.com/jobs/ambiguous-1',
        source: 'jobicy',
        sourceJobId: `test-ambiguous-rem-${now}`,
        postedDate: new Date('2026-10-27T11:00:00Z'),
      },
    });
    cleanupOppIds.push(oppAmbiguousRemote.id);

    // 11B. Worldwide Remote WITHOUT India Hiring Evidence (Must NEVER appear in India endpoint)
    const oppWorldwideNoIndia = await prisma.opportunity.create({
      data: {
        title: `Worldwide Contributor_${now}`,
        organization: 'GlobalTech',
        description: 'Global remote team across Americas and Europe.',
        location: 'Worldwide',
        workMode: WorkMode.REMOTE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.MID,
        applicationUrl: 'https://global.example.com/jobs/worldwide-1',
        source: 'jobicy',
        sourceJobId: `test-worldwide-no-india-${now}`,
        postedDate: new Date('2026-10-27T11:15:00Z'),
      },
    });
    cleanupOppIds.push(oppWorldwideNoIndia.id);

    // 11C. Worldwide Remote WITH Verified India Hiring Evidence (Must appear in India endpoint)
    const oppWorldwideWithIndia = await prisma.opportunity.create({
      data: {
        title: `Global Core Contributor_${now}`,
        organization: 'GlobalTech',
        description: 'Worldwide remote position. We actively hire engineers based in India and Bengaluru.',
        location: 'Worldwide',
        workMode: WorkMode.REMOTE,
        type: OpportunityType.JOB,
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.SENIOR,
        applicationUrl: 'https://global.example.com/jobs/worldwide-2',
        source: 'jobicy',
        sourceJobId: `test-worldwide-with-india-${now}`,
        postedDate: new Date('2026-10-27T11:30:00Z'),
      },
    });
    cleanupOppIds.push(oppWorldwideWithIndia.id);

    // Mount Express Test Apps
    const { default: opportunitiesRoutes } = await import('./routes/opportunities');

    // Unauthenticated App
    const unauthedApp = express();
    unauthedApp.use(express.json());
    unauthedApp.use('/api/opportunities', opportunitiesRoutes);

    // Authenticated App for Candidate Arjun
    const authedApp = express();
    authedApp.use(express.json());
    authedApp.use((req: AuthRequest, _res: Response, next) => {
      req.userId = testUser.id;
      next();
    });
    authedApp.use('/api/opportunities', opportunitiesRoutes);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: Strict India Eligibility & Overseas Exclusion
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 1: Strict India Eligibility & Overseas Exclusion ---');
    const resAllIndia = await request(unauthedApp).get('/api/opportunities/india?limit=50');
    assert(resAllIndia.status === 200, 'GET /api/opportunities/india returns 200 OK');
    assert(Array.isArray(resAllIndia.body.opportunities), 'Response contains opportunities array');
    assert(typeof resAllIndia.body.pagination === 'object', 'Response contains pagination metadata');
    assert(typeof resAllIndia.body.filters === 'object', 'Response contains active filters');

    const allReturnedIds: string[] = resAllIndia.body.opportunities.map((o: any) => o.id);
    assert(!allReturnedIds.includes(oppOverseas.id), 'San Francisco US role is strictly EXCLUDED');
    assert(!allReturnedIds.includes(oppDelhiUSA.id), 'Delhi, NY, USA role (overseas homonym) is strictly EXCLUDED');
    assert(!allReturnedIds.includes(oppConflict.id), 'Bengaluru role with TS/SCI US citizenship clause is strictly EXCLUDED');
    assert(!allReturnedIds.includes(oppAmbiguousRemote.id), 'Ambiguous bare "Remote" role is strictly EXCLUDED');
    assert(!allReturnedIds.includes(oppWorldwideNoIndia.id), 'Worldwide remote WITHOUT India hiring evidence is strictly EXCLUDED');
    assert(allReturnedIds.includes(oppWorldwideWithIndia.id), 'Worldwide remote WITH verified India hiring evidence is INCLUDED');
    assert(allReturnedIds.includes(oppBlr1.id), 'Bengaluru job is INCLUDED');
    assert(allReturnedIds.includes(oppHyd1.id), 'Hyderabad job is INCLUDED');
    assert(allReturnedIds.includes(oppRemoteIndia.id), 'Explicit "Remote - India" job is INCLUDED');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: Indian City Filtering & Alias Normalization
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 2: Indian City Filtering & Alias Normalization ---');

    // 2A: Bengaluru canonical
    const resBlr = await request(unauthedApp).get('/api/opportunities/india?city=Bengaluru');
    assert(resBlr.status === 200, 'GET /api/opportunities/india?city=Bengaluru returns 200');
    const blrIds = resBlr.body.opportunities.map((o: any) => o.id);
    assert(blrIds.includes(oppBlr1.id), 'Includes canonical Bengaluru job');
    assert(blrIds.includes(oppBlr2.id), 'Includes alias "Bangalore" job');
    assert(!blrIds.includes(oppHyd1.id), 'Excludes Hyderabad job from Bengaluru filter');
    assert(resBlr.body.filters.city === 'Bengaluru', 'Filters metadata confirms city="Bengaluru"');

    // 2B: Bangalore alias
    const resBlrAlias = await request(unauthedApp).get('/api/opportunities/india?city=bangalore');
    assert(resBlrAlias.status === 200, 'GET /api/opportunities/india?city=bangalore returns 200');
    assert(resBlrAlias.body.filters.city === 'Bengaluru', 'Normalizes city alias "bangalore" -> "Bengaluru"');

    // 2C: Hyderabad & Secunderabad alias
    const resHyd = await request(unauthedApp).get('/api/opportunities/india?city=Hyderabad');
    assert(resHyd.status === 200, 'GET /api/opportunities/india?city=Hyderabad returns 200');
    const hydIds = resHyd.body.opportunities.map((o: any) => o.id);
    assert(hydIds.includes(oppHyd1.id), 'Includes Hyderabad job');
    assert(hydIds.includes(oppHyd2.id), 'Includes Secunderabad alias job');
    assert(!hydIds.includes(oppBlr1.id), 'Excludes Bengaluru job from Hyderabad filter');

    // 2D: Delhi-NCR & Gurugram alias
    const resDelhi = await request(unauthedApp).get('/api/opportunities/india?city=Delhi-NCR');
    assert(resDelhi.status === 200, 'GET /api/opportunities/india?city=Delhi-NCR returns 200');
    const delhiIds = resDelhi.body.opportunities.map((o: any) => o.id);
    assert(delhiIds.includes(oppDelhiEntry.id), 'Includes Gurugram job under Delhi-NCR filter');
    assert(!delhiIds.includes(oppDelhiUSA.id), 'Delhi-NCR filter strictly EXCLUDES Delhi, NY, USA');

    const resGurgaonAlias = await request(unauthedApp).get('/api/opportunities/india?city=gurgaon');
    assert(resGurgaonAlias.status === 200, 'GET /api/opportunities/india?city=gurgaon returns 200');
    assert(resGurgaonAlias.body.filters.city === 'Delhi-NCR', 'Normalizes city alias "gurgaon" -> "Delhi-NCR"');

    // 2E: Pune
    const resPune = await request(unauthedApp).get('/api/opportunities/india?city=Pune');
    assert(resPune.status === 200, 'GET /api/opportunities/india?city=Pune returns 200');
    const puneIds = resPune.body.opportunities.map((o: any) => o.id);
    assert(puneIds.includes(oppPuneIntern.id), 'Includes Pune job');

    // 2F: Mumbai
    const resMumbai = await request(unauthedApp).get('/api/opportunities/india?city=Mumbai');
    assert(resMumbai.status === 200, 'GET /api/opportunities/india?city=Mumbai returns 200');
    const mumIds = resMumbai.body.opportunities.map((o: any) => o.id);
    assert(mumIds.includes(oppMumbai.id), 'Includes Mumbai job');

    // 2G: Chennai
    const resChennai = await request(unauthedApp).get('/api/opportunities/india?city=Chennai');
    assert(resChennai.status === 200, 'GET /api/opportunities/india?city=Chennai returns 200');
    const chnIds = resChennai.body.opportunities.map((o: any) => o.id);
    assert(chnIds.includes(oppChennai.id), 'Includes Chennai job');

    // 2H: City "All"
    const resCityAll = await request(unauthedApp).get('/api/opportunities/india?city=All');
    assert(resCityAll.status === 200, 'GET /api/opportunities/india?city=All returns 200');
    assert(resCityAll.body.filters.city === 'All', 'Filters metadata confirms city="All"');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: Stage Filtering (INTERNSHIP, ENTRY, ALL)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 3: Stage Filtering ---');

    // 3A: INTERNSHIP stage
    const resIntern = await request(unauthedApp).get('/api/opportunities/india?stage=INTERNSHIP');
    assert(resIntern.status === 200, 'GET /api/opportunities/india?stage=INTERNSHIP returns 200');
    const internIds = resIntern.body.opportunities.map((o: any) => o.id);
    assert(internIds.includes(oppPuneIntern.id), 'Includes internship role');
    assert(!internIds.includes(oppBlr1.id), 'Excludes mid-level full-time job');
    assert(!internIds.includes(oppDelhiEntry.id), 'Excludes regular entry-level full-time job from internship filter');
    assert(resIntern.body.filters.stage === 'INTERNSHIP', 'Filters metadata confirms stage="INTERNSHIP"');

    // 3B: ENTRY stage (Entry jobs only, NOT internships)
    const resEntry = await request(unauthedApp).get('/api/opportunities/india?stage=ENTRY');
    assert(resEntry.status === 200, 'GET /api/opportunities/india?stage=ENTRY returns 200');
    const entryIds = resEntry.body.opportunities.map((o: any) => o.id);
    assert(entryIds.includes(oppDelhiEntry.id), 'Includes Gurugram entry job');
    assert(entryIds.includes(oppHyd2.id), 'Includes Secunderabad entry job');
    assert(!entryIds.includes(oppPuneIntern.id), 'Excludes internship from ENTRY stage');
    assert(!entryIds.includes(oppBlr1.id), 'Excludes mid-level job from ENTRY stage');
    assert(resEntry.body.filters.stage === 'ENTRY', 'Filters metadata confirms stage="ENTRY"');

    // 3C: ALL stage
    const resStageAll = await request(unauthedApp).get('/api/opportunities/india?stage=ALL');
    assert(resStageAll.status === 200, 'GET /api/opportunities/india?stage=ALL returns 200');
    assert(resStageAll.body.filters.stage === 'ALL', 'Filters metadata confirms stage="ALL"');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: Work Mode Filtering
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 4: Work Mode Filtering ---');

    // 4A: REMOTE
    const resRemote = await request(unauthedApp).get('/api/opportunities/india?workMode=REMOTE');
    assert(resRemote.status === 200, 'GET /api/opportunities/india?workMode=REMOTE returns 200');
    const remoteIds = resRemote.body.opportunities.map((o: any) => o.id);
    assert(remoteIds.includes(oppRemoteIndia.id), 'Includes Remote - India role');
    assert(!remoteIds.includes(oppBlr1.id), 'Excludes hybrid role');

    // 4B: HYBRID
    const resHybrid = await request(unauthedApp).get('/api/opportunities/india?workMode=HYBRID');
    assert(resHybrid.status === 200, 'GET /api/opportunities/india?workMode=HYBRID returns 200');
    const hybridIds = resHybrid.body.opportunities.map((o: any) => o.id);
    assert(hybridIds.includes(oppBlr1.id), 'Includes hybrid role');
    assert(!hybridIds.includes(oppRemoteIndia.id), 'Excludes remote role');

    // 4C: ONSITE
    const resOnsite = await request(unauthedApp).get('/api/opportunities/india?workMode=ONSITE');
    assert(resOnsite.status === 200, 'GET /api/opportunities/india?workMode=ONSITE returns 200');
    const onsiteIds = resOnsite.body.opportunities.map((o: any) => o.id);
    assert(onsiteIds.includes(oppBlr2.id), 'Includes onsite role');
    assert(!onsiteIds.includes(oppBlr1.id), 'Excludes hybrid role');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: Input Validation & Error Handling (HTTP 400 VALIDATION_ERROR & 401 UNAUTHORIZED)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 5: Input Validation & Error Handling ---');

    const resInvalidCity = await request(unauthedApp).get('/api/opportunities/india?city=London');
    assert(resInvalidCity.status === 400, 'Invalid city "London" returns 400');
    assert(resInvalidCity.body.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    const resInvalidStage = await request(unauthedApp).get('/api/opportunities/india?stage=DIRECTOR');
    assert(resInvalidStage.status === 400, 'Invalid stage "DIRECTOR" returns 400');
    assert(resInvalidStage.body.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    const resInvalidWorkMode = await request(unauthedApp).get('/api/opportunities/india?workMode=PART_TIME');
    assert(resInvalidWorkMode.status === 400, 'Invalid workMode "PART_TIME" returns 400');
    assert(resInvalidWorkMode.body.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    const resInvalidSort = await request(unauthedApp).get('/api/opportunities/india?sort=random_sort');
    assert(resInvalidSort.status === 400, 'Invalid sort "random_sort" returns 400');
    assert(resInvalidSort.body.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    // Unauthenticated match operations produce explicit 401 UNAUTHORIZED
    const resUnauthedMatchFilter = await request(unauthedApp).get('/api/opportunities/india?matchFilter=80_plus');
    assert(resUnauthedMatchFilter.status === 401, 'Unauthenticated GET ?matchFilter=80_plus returns 401');
    assert(resUnauthedMatchFilter.body.error?.code === 'UNAUTHORIZED', 'Unauthenticated matchFilter error code is UNAUTHORIZED');

    const resUnauthedMatchSortDesc = await request(unauthedApp).get('/api/opportunities/india?sort=match_desc');
    assert(resUnauthedMatchSortDesc.status === 401, 'Unauthenticated GET ?sort=match_desc returns 401');
    assert(resUnauthedMatchSortDesc.body.error?.code === 'UNAUTHORIZED', 'Unauthenticated match_desc error code is UNAUTHORIZED');

    const resUnauthedMatchSortAsc = await request(unauthedApp).get('/api/opportunities/india?sort=match_asc');
    assert(resUnauthedMatchSortAsc.status === 401, 'Unauthenticated GET ?sort=match_asc returns 401');
    assert(resUnauthedMatchSortAsc.body.error?.code === 'UNAUTHORIZED', 'Unauthenticated match_asc error code is UNAUTHORIZED');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 6: Balanced Employer Interleaving & Stable Pagination
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 6: Balanced Employer Interleaving & Stable Pagination ---');

    // Query Page 1 with limit 4
    const resPage1 = await request(unauthedApp).get('/api/opportunities/india?limit=4&page=1');
    assert(resPage1.status === 200, 'GET /api/opportunities/india?limit=4&page=1 returns 200');
    assert(resPage1.body.opportunities.length === 4, 'Page 1 has 4 items');

    const orgsPage1 = resPage1.body.opportunities.map((o: any) => o.organization);
    const uniqueOrgsPage1 = new Set(orgsPage1);
    assert(
      uniqueOrgsPage1.size === 4,
      `Page 1 features 4 distinct employers (got: ${Array.from(uniqueOrgsPage1).join(', ')})`,
    );

    // Query Page 2 with limit 4
    const resPage2 = await request(unauthedApp).get('/api/opportunities/india?limit=4&page=2');
    assert(resPage2.status === 200, 'GET /api/opportunities/india?limit=4&page=2 returns 200');

    const page1Ids = new Set(resPage1.body.opportunities.map((o: any) => o.id));
    const page2Ids = resPage2.body.opportunities.map((o: any) => o.id);
    const hasOverlap = page2Ids.some((id: string) => page1Ids.has(id));
    assert(!hasOverlap, 'Pagination is strictly stable: Zero overlapping IDs between adjacent Page 1 and Page 2');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 7: Sorting
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 7: Explicit Date Sorting ---');

    // 7A: posted_desc
    const resPostedDesc = await request(unauthedApp).get('/api/opportunities/india?sort=posted_desc&limit=10');
    assert(resPostedDesc.status === 200, 'GET /api/opportunities/india?sort=posted_desc returns 200');
    const datesDesc = resPostedDesc.body.opportunities.map((o: any) => new Date(o.postedDate).getTime());
    let isMonotonicDesc = true;
    for (let i = 0; i < datesDesc.length - 1; i++) {
      if (datesDesc[i] < datesDesc[i + 1]) {
        isMonotonicDesc = false;
        break;
      }
    }
    assert(isMonotonicDesc, 'sort=posted_desc returns monotonically descending posted dates');

    // 7B: posted_asc
    const resPostedAsc = await request(unauthedApp).get('/api/opportunities/india?sort=posted_asc&limit=10');
    assert(resPostedAsc.status === 200, 'GET /api/opportunities/india?sort=posted_asc returns 200');
    const datesAsc = resPostedAsc.body.opportunities.map((o: any) => new Date(o.postedDate).getTime());
    let isMonotonicAsc = true;
    for (let i = 0; i < datesAsc.length - 1; i++) {
      if (datesAsc[i] > datesAsc[i + 1]) {
        isMonotonicAsc = false;
        break;
      }
    }
    assert(isMonotonicAsc, 'sort=posted_asc returns monotonically ascending posted dates');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 8: Candidate Intelligence & Match Breakdown
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 8: Candidate Intelligence & Match Breakdown ---');

    // 8A: Unauthenticated user has match: null
    const unauthedMatch = resAllIndia.body.opportunities.find((o: any) => o.id === oppBlr1.id);
    assert(unauthedMatch?.match === null, 'Unauthenticated candidate receives match: null');

    // 8B: Authenticated candidate receives match summary
    const resAuthed = await request(authedApp).get('/api/opportunities/india?limit=20');
    assert(resAuthed.status === 200, 'Authenticated candidate GET returns 200');
    const authedBlr1 = resAuthed.body.opportunities.find((o: any) => o.id === oppBlr1.id);
    assert(authedBlr1 !== undefined, 'Found test opportunity in authenticated feed');
    assert(authedBlr1.match !== null, 'Authenticated candidate receives non-null match');
    assert(authedBlr1.match.hasStructuredRequirements === true, 'hasStructuredRequirements is true for job with skills');
    assert(typeof authedBlr1.match.score === 'number', `Calculated match score is numeric (got ${authedBlr1.match.score})`);
    assert(authedBlr1.match.matchedCount >= 1, `Matched count is >= 1 (got ${authedBlr1.match.matchedCount})`);

    // 8C: Unstructured job has score: null and hasStructuredRequirements: false
    const authedBlr2 = resAuthed.body.opportunities.find((o: any) => o.id === oppBlr2.id);
    assert(authedBlr2 !== undefined, 'Found unstructured test opportunity');
    assert(authedBlr2.match.score === null, 'Unstructured job receives match score: null');
    assert(authedBlr2.match.hasStructuredRequirements === false, 'Unstructured job hasStructuredRequirements: false');

    // 8D: Match filter 80_plus
    const resMatchFilter = await request(authedApp).get('/api/opportunities/india?matchFilter=80_plus');
    assert(resMatchFilter.status === 200, 'GET /api/opportunities/india?matchFilter=80_plus returns 200');
    const allFilteredAre80Plus = resMatchFilter.body.opportunities.every((o: any) => o.match?.score >= 80);
    assert(allFilteredAre80Plus, 'Every opportunity returned under matchFilter=80_plus has score >= 80');

    // 8E: Match filter unavailable
    const resMatchUnavailable = await request(authedApp).get('/api/opportunities/india?matchFilter=unavailable');
    assert(resMatchUnavailable.status === 200, 'GET /api/opportunities/india?matchFilter=unavailable returns 200');
    const unavailableIds = resMatchUnavailable.body.opportunities.map((o: any) => o.id);
    assert(unavailableIds.includes(oppBlr2.id), 'unavailable filter includes unstructured job');
    assert(!unavailableIds.includes(oppBlr1.id), 'unavailable filter excludes structured job with skills');

    // 8F: Match sorting (match_desc and match_asc)
    const resMatchDesc = await request(authedApp).get('/api/opportunities/india?sort=match_desc');
    assert(resMatchDesc.status === 200, 'GET /api/opportunities/india?sort=match_desc returns 200');
    const descScores = resMatchDesc.body.opportunities.map((o: any) => o.match?.score);
    assert(descScores[0] === 100, 'sort=match_desc places highest score (100) first');
    assert(descScores[descScores.length - 1] === null, 'sort=match_desc places null score at the end');

    const resMatchAsc = await request(authedApp).get('/api/opportunities/india?sort=match_asc');
    assert(resMatchAsc.status === 200, 'GET /api/opportunities/india?sort=match_asc returns 200');
    const ascScores = resMatchAsc.body.opportunities.map((o: any) => o.match?.score);
    assert(ascScores[ascScores.length - 1] === null, 'sort=match_asc places null/unstructured scores at the end (not top)');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 9: Company Branding
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 9: Company Branding ---');
    const databricksJob = resAllIndia.body.opportunities.find((o: any) => o.organization === 'Databricks');
    assert(databricksJob !== undefined, 'Found Databricks job');
    assert(
      databricksJob.companyLogoUrl !== null && databricksJob.companyLogoUrl.includes('databricks.com'),
      `Databricks job has branded logo URL: ${databricksJob.companyLogoUrl}`,
    );

    const spotifyJob = resAllIndia.body.opportunities.find((o: any) => o.organization === 'Spotify');
    assert(spotifyJob !== undefined, 'Found Spotify job');
    assert(
      spotifyJob.companyLogoUrl !== null && spotifyJob.companyLogoUrl.includes('spotify.com'),
      `Spotify job has branded logo URL: ${spotifyJob.companyLogoUrl}`,
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 10: Existing /api/opportunities Route Unaffected
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 10: Existing /api/opportunities Route Unaffected ---');
    const resExistingFeed = await request(unauthedApp).get('/api/opportunities?limit=5');
    assert(resExistingFeed.status === 200, 'Existing GET /api/opportunities returns 200 OK');
    assert(Array.isArray(resExistingFeed.body.opportunities), 'Existing feed returns opportunities array');

    const resExistingSingle = await request(unauthedApp).get(`/api/opportunities/${oppBlr1.id}`);
    assert(resExistingSingle.status === 200, 'Existing GET /api/opportunities/:id returns 200 OK');
    assert(resExistingSingle.body.opportunity?.id === oppBlr1.id, 'Single opportunity lookup returns correct entity');

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 11: Phase 2.1 Audit — India Eligibility Rule Equivalence
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 11: Phase 2.1 Audit — India Eligibility Rule Equivalence ---');
    const { IndiaLocationClassifier } = await import('./services/indiaLocationClassifier');

    const edgeCases = [
      { loc: 'Bengaluru, India', title: 'Software Engineer', desc: 'Standard backend role', wm: 'ONSITE', expectedEligible: true },
      { loc: 'Bangalore', title: 'Software Engineer', desc: 'Backend role', wm: 'ONSITE', expectedEligible: true },
      { loc: 'Remote - India', title: 'Backend Engineer', desc: 'Work from home anywhere in India', wm: 'REMOTE', expectedEligible: true },
      { loc: 'Delhi, NY, USA', title: 'Civil Engineer', desc: 'New York state municipality', wm: 'ONSITE', expectedEligible: false },
      { loc: 'Bengaluru, India', title: 'Defense Liaison', desc: 'Must reside in the US. Active TS/SCI required.', wm: 'ONSITE', expectedEligible: false },
      { loc: 'Remote', title: 'General Contributor', desc: 'No location details', wm: 'REMOTE', expectedEligible: false },
      { loc: 'Worldwide', title: 'Global Developer', desc: 'Americas and Europe distributed', wm: 'REMOTE', expectedEligible: false },
      { loc: 'Worldwide', title: 'Global Developer', desc: 'We hire in India and Bengaluru', wm: 'REMOTE', expectedEligible: true },
      { loc: 'London, UK', title: 'Data Analyst', desc: 'London headquarters', wm: 'ONSITE', expectedEligible: false },
      { loc: 'Remote - US', title: 'Staff Engineer', desc: 'US only positions', wm: 'REMOTE', expectedEligible: false },
      { loc: '', title: 'Software Engineer', desc: 'No location signal', wm: 'UNKNOWN', expectedEligible: false },
      { loc: '', title: 'Software Engineer - Bengaluru', desc: 'Title mentions Bengaluru', wm: 'UNKNOWN', expectedEligible: true },
    ];

    for (const ec of edgeCases) {
      const classRes = IndiaLocationClassifier.classify(ec.loc, ec.title, ec.desc, ec.wm);
      assert(
        classRes.isIndiaEligible === ec.expectedEligible,
        `Classifier: "${ec.loc || 'EMPTY'}" / "${ec.title}" -> eligible: ${classRes.isIndiaEligible} (expected: ${ec.expectedEligible})`,
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 12: Phase 2.1 Audit — Search/Skill Cannot Bypass India Eligibility
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Test 12: Phase 2.1 Audit — Search/Skill Cannot Bypass India Eligibility ---');

    // Searching specifically for overseas organization returns 0 results on /api/opportunities/india
    const resSearchOverseas = await request(unauthedApp).get('/api/opportunities/india?search=EmpireState');
    assert(resSearchOverseas.status === 200, 'GET /api/opportunities/india?search=EmpireState returns 200');
    assert(resSearchOverseas.body.opportunities.length === 0, 'Overseas employer (EmpireState) not returned via search');
    assert(resSearchOverseas.body.pagination.total === 0, 'Pagination total is 0');

    // Searching specifically for conflicted security-clearance role returns 0 results
    const resSearchConflict = await request(unauthedApp).get('/api/opportunities/india?search=DefenseCorp');
    assert(resSearchConflict.status === 200, 'GET /api/opportunities/india?search=DefenseCorp returns 200');
    assert(resSearchConflict.body.opportunities.length === 0, 'Conflicted TS/SCI overseas role not returned via search');

    // Single employer filter returns clean pagination without crashes
    const resSingleEmployer = await request(unauthedApp).get('/api/opportunities/india?search=Groww');
    assert(resSingleEmployer.status === 200, 'GET /api/opportunities/india?search=Groww returns 200');
    assert(resSingleEmployer.body.opportunities.length === 1, 'Returns exactly 1 Groww job');
    assert(resSingleEmployer.body.pagination.total === 1, 'Pagination total is 1');
    assert(resSingleEmployer.body.pagination.totalPages === 1, 'Pagination totalPages is 1');

    // Completely empty results returns 200 with total: 0 and totalPages: 0
    const resEmpty = await request(unauthedApp).get('/api/opportunities/india?search=NonExistentCompany999');
    assert(resEmpty.status === 200, 'GET empty search returns 200');
    assert(resEmpty.body.opportunities.length === 0, 'Returns empty opportunities array');
    assert(resEmpty.body.pagination.total === 0, 'Pagination total is 0');
    assert(resEmpty.body.pagination.totalPages === 0, 'Pagination totalPages is 0');
  } finally {
    // ─── Cleanup ─────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up Test Fixtures on Port 5433 ---');
    if (cleanupOppIds.length > 0) {
      await prisma.opportunitySkill.deleteMany({
        where: { opportunityId: { in: cleanupOppIds } },
      });
      await prisma.opportunity.deleteMany({
        where: { id: { in: cleanupOppIds } },
      });
    }
    if (cleanupUserIds.length > 0) {
      const profiles = await prisma.profile.findMany({
        where: { userId: { in: cleanupUserIds } },
        select: { id: true },
      });
      const profileIds = profiles.map((p) => p.id);
      await prisma.candidateSkill.deleteMany({
        where: { profileId: { in: profileIds } },
      });
      await prisma.profile.deleteMany({
        where: { id: { in: profileIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
    }
    if (cleanupSkillIds.length > 0) {
      await prisma.skill.deleteMany({
        where: { id: { in: cleanupSkillIds } },
      });
    }
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('='.repeat(70));
  console.log(`   TEST RESULT: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
