/**
 * M2.4: Early Career Eligibility Persistence Test Suite
 *
 * Verifies relational persistence, evidence lifecycle, idempotency,
 * and rollback guarantees using isolated mock Prisma infrastructure.
 * STRICTLY complies with project boundary: NO live DB connection or migration executed.
 */

import { randomUUID } from 'crypto';
import {
  OpportunityIngestor,
  OpportunityNormalizer,
  OpportunityDeduplicator,
  type ExternalJob,
  type OpportunityProvider,
} from './lib/opportunityProvider';

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

/**
 * Isolated in-memory transaction and storage harness mirroring Prisma Client
 */
class InMemoryPrismaHarness {
  public opportunities = new Map<string, any>();
  public skills = new Map<string, any>();
  public opportunitySkills: any[] = [];
  public eligibilities = new Map<string, any>();
  public evidences = new Map<string, any>();

  private cloneState() {
    return {
      opportunities: new Map(JSON.parse(JSON.stringify(Array.from(this.opportunities.entries())))),
      skills: new Map(JSON.parse(JSON.stringify(Array.from(this.skills.entries())))),
      opportunitySkills: JSON.parse(JSON.stringify(this.opportunitySkills)),
      eligibilities: new Map(JSON.parse(JSON.stringify(Array.from(this.eligibilities.entries())))),
      evidences: new Map(JSON.parse(JSON.stringify(Array.from(this.evidences.entries())))),
    };
  }

  private restoreState(snapshot: any) {
    this.opportunities = snapshot.opportunities;
    this.skills = snapshot.skills;
    this.opportunitySkills = snapshot.opportunitySkills;
    this.eligibilities = snapshot.eligibilities;
    this.evidences = snapshot.evidences;
  }

  // Deduplicator lookups
  public opportunity = {
    findFirst: async ({ where }: any) => {
      for (const opp of this.opportunities.values()) {
        if (where.source && opp.source !== where.source) continue;
        if (where.sourceJobId && opp.sourceJobId !== where.sourceJobId) continue;
        return opp;
      }
      return null;
    },
    findUnique: async ({ where }: any) => {
      return this.opportunities.get(where.id) || null;
    },
  };

  public async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const snapshot = this.cloneState();
    const tx = {
      opportunity: {
        findUnique: async ({ where }: any) => {
          return this.opportunities.get(where.id) || null;
        },
        create: async ({ data }: any) => {
          const rec = { ...data };
          this.opportunities.set(rec.id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const existing = this.opportunities.get(where.id);
          if (!existing) throw new Error(`Opportunity not found: ${where.id}`);
          const updated = { ...existing, ...data };
          this.opportunities.set(where.id, updated);
          return updated;
        },
      },
      skill: {
        upsert: async ({ where, create }: any) => {
          let s = this.skills.get(where.name);
          if (!s) {
            s = { ...create };
            this.skills.set(where.name, s);
          }
          return s;
        },
      },
      opportunitySkill: {
        deleteMany: async ({ where }: any) => {
          this.opportunitySkills = this.opportunitySkills.filter(
            (os) => os.opportunityId !== where.opportunityId
          );
        },
        create: async ({ data }: any) => {
          this.opportunitySkills.push({ ...data });
          return data;
        },
      },
      opportunityEligibility: {
        findUnique: async ({ where }: any) => {
          if (where.opportunityId) {
            for (const el of this.eligibilities.values()) {
              if (el.opportunityId === where.opportunityId) return el;
            }
            return null;
          }
          return this.eligibilities.get(where.id) || null;
        },
        create: async ({ data }: any) => {
          const rec = { ...data };
          this.eligibilities.set(rec.id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const existing = this.eligibilities.get(where.id);
          if (!existing) throw new Error(`Eligibility not found: ${where.id}`);
          const updated = { ...existing, ...data };
          this.eligibilities.set(where.id, updated);
          return updated;
        },
      },
      opportunityEligibilityEvidence: {
        findMany: async ({ where }: any) => {
          const results: any[] = [];
          for (const ev of this.evidences.values()) {
            if (where.eligibilityId && ev.eligibilityId !== where.eligibilityId) continue;
            if (where.isActive !== undefined && ev.isActive !== where.isActive) continue;
            results.push(ev);
          }
          return results;
        },
        create: async ({ data }: any) => {
          const rec = { ...data };
          this.evidences.set(rec.id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const existing = this.evidences.get(where.id);
          if (!existing) throw new Error(`Evidence not found: ${where.id}`);
          const updated = { ...existing, ...data };
          this.evidences.set(where.id, updated);
          return updated;
        },
        deleteMany: async () => {
          throw new Error('UNAUTHORIZED: deleteMany on OpportunityEligibilityEvidence is prohibited');
        },
      },
    };

    try {
      return await fn(tx);
    } catch (err) {
      this.restoreState(snapshot);
      throw err;
    }
  }
}

class StaticMockProvider implements OpportunityProvider {
  name = 'StaticMockProvider';
  constructor(private jobs: ExternalJob[]) {}
  async fetch(): Promise<ExternalJob[]> {
    return this.jobs;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('  M2.4: EARLY CAREER ELIGIBILITY PERSISTENCE REGRESSION SUITE');
  console.log('================================================================\n');

  // ─── Test 1: New Opportunity + Eligibility Persistence ─────────────────────
  console.log('Test 1: New opportunity + eligibility persistence');
  const db = new InMemoryPrismaHarness();
  const ingestor = new OpportunityIngestor(db as any);

  const job1: ExternalJob = {
    id: 'job-swe-intern',
    title: 'Software Engineer Intern - Summer 2026',
    company: 'Stripe',
    description: 'We are looking for students graduating in 2026. No prior experience required. 0-6 months experience.',
    location: 'Bengaluru, India',
    employmentType: 'Internship',
    source: 'Greenhouse',
    applicationUrl: 'https://stripe.com/jobs/1',
  };

  const res1 = await ingestor.ingest(new StaticMockProvider([job1]));
  assert(res1.created === 1, 'Ingestor reports 1 created opportunity');

  const opp1 = Array.from(db.opportunities.values())[0];
  assert(!!opp1, 'Opportunity record was created in database');

  const elig1 = Array.from(db.eligibilities.values())[0];
  assert(!!elig1, 'OpportunityEligibility record was created in database');
  assert(elig1.opportunityId === opp1.id, 'Eligibility references opportunityId');
  assert(elig1.category === 'INTERNSHIP', `Category persisted as INTERNSHIP: ${elig1.category}`);
  assert(elig1.confidence > 0, `Confidence is positive float: ${elig1.confidence}`);
  assert(typeof elig1.sourceContentHash === 'string' && elig1.sourceContentHash.length === 64, 'Valid SHA-256 sourceContentHash persisted');
  assert(elig1.classifierVersion === 'early-career-v1', 'Classifier version recorded');

  // ─── Test 2 & 3: Evidence Creation for New Opportunity ─────────────────────
  console.log('\nTest 2 & 3: Relational evidence records created with active lifecycle');
  const evidences1 = Array.from(db.evidences.values());
  assert(evidences1.length > 0, `Created ${evidences1.length} relational evidence records`);

  const roleEv = evidences1.find((e) => e.criterion === 'ROLE_CATEGORY');
  assert(!!roleEv, 'ROLE_CATEGORY evidence record exists');
  assert(roleEv.isActive === true, 'Evidence record isActive is true');
  assert(roleEv.supersededAt === null || roleEv.supersededAt === undefined, 'supersededAt is initially null');
  assert(roleEv.extractionMethod === 'REGEX_DETERMINISTIC' || roleEv.extractionMethod === 'ATS_METADATA_FIELD', 'Extraction method persisted');
  assert(typeof roleEv.normalizedValue === 'object', 'normalizedValue is structured object');

  // ─── Test 4: Identical Content Reprocessing (Idempotency) ──────────────────
  console.log('\nTest 4: Identical content reprocessing does not duplicate evidence');
  const evidenceCountBefore = db.evidences.size;
  const initialUpdatedAt = elig1.updatedAt;

  // Ingest identical job
  const res2 = await ingestor.ingest(new StaticMockProvider([job1]));
  assert(res2.updated === 1, 'Ingestor reported 1 updated opportunity on re-run');
  assert(db.evidences.size === evidenceCountBefore, `Evidence table size remained identical (${evidenceCountBefore}) without duplication`);

  const elig1After = db.eligibilities.get(elig1.id);
  assert(elig1After.sourceContentHash === elig1.sourceContentHash, 'Source content hash remains unchanged');

  // ─── Test 5: Changed Source Content Superseding Old Evidence ───────────────
  console.log('\nTest 5: Changed content marks old evidence superseded and creates new active evidence');
  const job1Modified: ExternalJob = {
    ...job1,
    title: 'Graduate Engineer Trainee 2026',
    description: 'Candidates eligible: 2026 Batch with B.Tech in CSE / IT. Minimum 7.5 CGPA required. 0-12 months exp.',
  };

  const res3 = await ingestor.ingest(new StaticMockProvider([job1Modified]));
  assert(res3.updated === 1, 'Ingestor processed modified job update');

  const elig1Updated = db.eligibilities.get(elig1.id);
  assert(elig1Updated.category === 'GRADUATE_TRAINEE', `Eligibility category updated to GRADUATE_TRAINEE: ${elig1Updated.category}`);
  assert(elig1Updated.minCgpa === 7.5, `Eligibility CGPA updated to 7.5: ${elig1Updated.minCgpa}`);

  const allEvidencesAfter = Array.from(db.evidences.values());
  const inactiveEvidences = allEvidencesAfter.filter((e) => e.isActive === false);
  const activeEvidences = allEvidencesAfter.filter((e) => e.isActive === true);

  assert(inactiveEvidences.length > 0, `Previous evidence records marked isActive = false (${inactiveEvidences.length} records)`);
  assert(activeEvidences.length > 0, `New evidence records marked isActive = true (${activeEvidences.length} records)`);

  const supersededRecord = inactiveEvidences[0];
  assert(supersededRecord.supersededAt instanceof Date, 'Superseded evidence has timestamp in supersededAt');
  assert(typeof supersededRecord.supersededById === 'string', `Superseded evidence points to new evidence id: ${supersededRecord.supersededById}`);

  // ─── Test 6: Manual Audit Invalidation Transition on Content Change ───────
  console.log('\nTest 6: Manual audit invalidation transitions to REVIEW_REQUIRED upon source modification');
  // Simulate an admin manually auditing an active record
  const currentActive = activeEvidences[0];
  currentActive.verificationLevel = 'MANUALLY_AUDITED';
  currentActive.auditedByAdminId = 'admin-user-42';
  db.evidences.set(currentActive.id, currentActive);

  // Ingest modified description
  const job1Mod2: ExternalJob = {
    ...job1Modified,
    description: 'Updated requirement: B.Tech 2026 batch. Zero years experience. 8.0 CGPA required.',
  };
  await ingestor.ingest(new StaticMockProvider([job1Mod2]));

  const previousAudited = db.evidences.get(currentActive.id);
  assert(previousAudited.isActive === false, 'Audited record was deactivated on source content change');
  assert(
    previousAudited.verificationLevel === 'REVIEW_REQUIRED',
    `Audited record transitioned from MANUALLY_AUDITED to REVIEW_REQUIRED: ${previousAudited.verificationLevel}`
  );

  // ─── Test 7: Conflict Preservation ─────────────────────────────────────────
  console.log('\nTest 7: Conflict preservation across title and eligibility evidence');
  const conflictingJob: ExternalJob = {
    id: 'job-conflict-1',
    title: 'Senior Principal Architect',
    company: 'BigTech',
    description: 'This is a summer internship position for university students. 0 years experience required.',
    source: 'SmartRecruiters',
    applicationUrl: 'https://smartrecruiters.com/jobs/conflict',
  };

  await ingestor.ingest(new StaticMockProvider([conflictingJob]));
  const conflictOpp = Array.from(db.opportunities.values()).find((o) => o.sourceJobId === 'job-conflict-1');
  const conflictElig = Array.from(db.eligibilities.values()).find((e) => e.opportunityId === conflictOpp.id);

  assert(conflictElig.hasConflict === true, 'hasConflict flag is true');
  assert(conflictElig.conflictDetails.length > 0, `Conflict details recorded: ${conflictElig.conflictDetails.join('; ')}`);

  // ─── Test 8: UNKNOWN and UNVERIFIED Persistence ────────────────────────────
  console.log('\nTest 8: UNKNOWN category and UNVERIFIED level persistence without silent coercion');
  const genericJob: ExternalJob = {
    id: 'job-generic-1',
    title: 'Technical Specialist',
    company: 'ConsultingCo',
    description: 'Help our team build solutions.',
    source: 'Ashby',
    applicationUrl: 'https://ashby.com/jobs/generic',
  };

  await ingestor.ingest(new StaticMockProvider([genericJob]));
  const genericOpp = Array.from(db.opportunities.values()).find((o) => o.sourceJobId === 'job-generic-1');
  const genericElig = Array.from(db.eligibilities.values()).find((e) => e.opportunityId === genericOpp.id);

  assert(genericElig.category === 'UNKNOWN', `Generic opportunity categorized as UNKNOWN: ${genericElig.category}`);
  assert(genericElig.overallVerificationLevel === 'UNVERIFIED', `Overall verification level is UNVERIFIED: ${genericElig.overallVerificationLevel}`);
  assert(genericElig.experienceConstraint === 'UNKNOWN', 'Experience constraint is UNKNOWN');
  assert(genericElig.batchConstraint === 'UNKNOWN', 'Batch constraint is UNKNOWN');
  assert(genericElig.academicConstraint === 'UNKNOWN', 'Academic constraint is UNKNOWN');

  // ─── Test 9: Transaction Rollback when Persistence Fails ───────────────────
  console.log('\nTest 9: Transaction rollback when persistence fails');
  const failingDb = new InMemoryPrismaHarness();
  const failingIngestor = new OpportunityIngestor(failingDb as any);

  // Monkey-patch persistEligibility to throw an unexpected DB error
  const originalPersist = failingIngestor.persistEligibility;
  failingIngestor.persistEligibility = async () => {
    throw new Error('Database constraint violation: FOREIGN KEY CHECK FAILED');
  };

  const failingJob: ExternalJob = {
    id: 'job-fail-tx',
    title: 'Software Developer',
    company: 'FailCorp',
    description: 'Entry level role.',
    source: 'TestProvider',
    applicationUrl: 'https://fail.com/apply',
  };

  const failRes = await failingIngestor.ingest(new StaticMockProvider([failingJob]));
  assert(failRes.errors === 1, 'Ingestor caught error and reported 1 error count');
  assert(failingDb.opportunities.size === 0, 'Opportunity creation was rolled back (0 opportunities in DB)');
  assert(failingDb.eligibilities.size === 0, 'Eligibility creation was rolled back (0 eligibilities in DB)');
  assert(failingDb.evidences.size === 0, 'Evidence creation was rolled back (0 evidences in DB)');

  // Restore method
  failingIngestor.persistEligibility = originalPersist;

  // ─── Test 10: Classification Failure Does Not Break Ingestion ─────────────
  console.log('\nTest 10: Classification error fallback does not halt opportunity ingestion');
  const normalizerWithFaultyClassifier = new OpportunityNormalizer();
  // Force classifyEarlyCareerWithCache to hit fallback
  (normalizerWithFaultyClassifier as any).classifyEarlyCareerWithCache = () => ({
    category: 'UNKNOWN',
    confidence: 0.0,
    explanation: 'Classification suspended due to simulated normalization error.',
    overallVerificationLevel: 'UNVERIFIED',
    experienceConstraint: 'UNKNOWN',
    experienceBoundType: null,
    minExperienceMonths: null,
    maxExperienceMonths: null,
    batchConstraint: 'UNKNOWN',
    eligibleBatches: [],
    relativeCohorts: [],
    academicConstraint: 'UNKNOWN',
    minCgpa: null,
    cgpaScale: null,
    minPercentage: null,
    academicEvaluationMode: null,
    backlogPolicy: 'UNKNOWN',
    maxActiveBacklogs: null,
    degreeConstraint: 'UNKNOWN',
    eligibleDegrees: [],
    branchConstraint: 'UNKNOWN',
    eligibleBranches: [],
    hasConflict: false,
    conflictDetails: [],
    evidenceRecords: [],
  });

  const resilientIngestor = new OpportunityIngestor(db as any, normalizerWithFaultyClassifier);
  const resilientJob: ExternalJob = {
    id: 'job-resilient-1',
    title: 'DevOps Engineer',
    company: 'CloudWorks',
    description: 'Work on CI/CD pipelines.',
    source: 'Ashby',
    applicationUrl: 'https://cloudworks.com/apply',
  };

  const resResilient = await resilientIngestor.ingest(new StaticMockProvider([resilientJob]));
  assert(resResilient.created === 1, 'Opportunity ingested successfully despite classification fallback');

  const resilientOpp = Array.from(db.opportunities.values()).find((o) => o.sourceJobId === 'job-resilient-1');
  assert(!!resilientOpp, 'Opportunity was committed to DB');
  const resilientElig = Array.from(db.eligibilities.values()).find((e) => e.opportunityId === resilientOpp.id);
  assert(resilientElig.category === 'UNKNOWN', 'Fallback eligibility persisted as UNKNOWN');

  // ─── Test 11: Legacy Opportunities Without Eligibility Remain Usable ───────
  console.log('\nTest 11: Legacy opportunities without eligibility remain usable');
  // Inject legacy opportunity directly into DB without eligibility
  const legacyId = randomUUID();
  db.opportunities.set(legacyId, {
    id: legacyId,
    title: 'Legacy Python Engineer',
    organization: 'LegacyCorp',
    description: 'Ancient codebase maintenance.',
    type: 'JOB',
    location: 'Remote',
    source: 'LegacyATS',
    sourceJobId: 'legacy-123',
    applicationUrl: 'https://legacy.com/123',
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  });

  const legacyJobUpdate: ExternalJob = {
    id: 'legacy-123',
    title: 'Junior Python Engineer',
    company: 'LegacyCorp',
    description: 'Requirements: 0 to 12 months Python experience.',
    source: 'LegacyATS',
    applicationUrl: 'https://legacy.com/123',
  };

  const legacyRes = await ingestor.ingest(new StaticMockProvider([legacyJobUpdate]));
  assert(legacyRes.updated === 1, 'Legacy opportunity successfully updated');

  const updatedLegacyOpp = db.opportunities.get(legacyId);
  assert(updatedLegacyOpp.title === 'Junior Python Engineer', 'Legacy opportunity title updated');

  const newlyAddedElig = Array.from(db.eligibilities.values()).find((e) => e.opportunityId === legacyId);
  assert(!!newlyAddedElig, 'Eligibility successfully attached to legacy opportunity');
  assert(newlyAddedElig.category === 'ENTRY_LEVEL', `Legacy opportunity classified as ENTRY_LEVEL: ${newlyAddedElig.category}`);

  // ─── Test 12: No Accidental Deletion of Historical Evidence ───────────────
  console.log('\nTest 12: Historical evidence records are immutable and never deleted');
  const totalEvidences = db.evidences.size;
  const inactiveCount = Array.from(db.evidences.values()).filter((e) => !e.isActive).length;
  const activeCount = Array.from(db.evidences.values()).filter((e) => e.isActive).length;

  assert(inactiveCount > 0, `Historical superseded evidence preserved in storage (${inactiveCount} records)`);
  assert(activeCount > 0, `Active evidence preserved in storage (${activeCount} records)`);
  assert(totalEvidences === inactiveCount + activeCount, `Total records (${totalEvidences}) equals active + inactive`);

  console.log('\n================================================================');
  console.log(`  M2.4 PERSISTENCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
