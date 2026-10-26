import { randomUUID } from 'crypto';
import {
  OpportunityIngestor,
  OpportunityNormalizer,
  OpportunityDeduplicator,
  type ExternalJob,
  type OpportunityProvider,
  type NormalizedOpportunity,
} from './lib/opportunityProvider';
import { RequirementType } from '@prisma/client';

interface MockSkill {
  id: string;
  name: string;
  category: string;
}

interface MockOpportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  source: string;
  sourceJobId: string | null;
  applicationUrl: string;
}

interface MockOpportunitySkill {
  opportunityId: string;
  skillId: string;
  requirementType: string;
}

class MockPrismaClient {
  public skills = new Map<string, MockSkill>();
  public opportunities = new Map<string, MockOpportunity>();
  public opportunitySkills: MockOpportunitySkill[] = [];
  public lastUpsertCreatePayload: any = null;
  public shouldFailSkillUpsert = false;

  public opportunity = {
    findFirst: async ({ where }: { where: { source: string; sourceJobId: string } }) => {
      for (const opp of this.opportunities.values()) {
        if (opp.source === where.source && opp.sourceJobId === where.sourceJobId) {
          return opp;
        }
      }
      return null;
    },
  };

  public $transaction = async (callback: (tx: any) => Promise<void>) => {
    const tx = {
      opportunity: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          return this.opportunities.get(where.id) || null;
        },
        create: async ({ data }: { data: any }) => {
          const id = data.id || randomUUID();
          const record: MockOpportunity = {
            id,
            title: data.title,
            organization: data.organization,
            description: data.description,
            source: data.source,
            sourceJobId: data.sourceJobId || null,
            applicationUrl: data.applicationUrl,
          };
          this.opportunities.set(id, record);
          return record;
        },
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
          const existing = this.opportunities.get(where.id);
          if (!existing) throw new Error(`Not found: ${where.id}`);
          const updated = { ...existing, ...data };
          this.opportunities.set(where.id, updated);
          return updated;
        },
      },
      skill: {
        upsert: async ({ where, update, create }: { where: { name: string }; update: any; create: any }) => {
          if (this.shouldFailSkillUpsert) {
            throw new Error('Simulated database failure during skill upsert');
          }

          this.lastUpsertCreatePayload = create;

          const existing = this.skills.get(where.name.toLowerCase());
          if (existing) {
            return existing;
          }

          const newSkill: MockSkill = {
            id: create.id,
            name: create.name,
            category: create.category,
          };
          this.skills.set(create.name.toLowerCase(), newSkill);
          return newSkill;
        },
      },
      opportunitySkill: {
        deleteMany: async ({ where }: { where: { opportunityId: string } }) => {
          this.opportunitySkills = this.opportunitySkills.filter(
            (os) => os.opportunityId !== where.opportunityId,
          );
          return { count: 0 };
        },
        create: async ({ data }: { data: MockOpportunitySkill }) => {
          this.opportunitySkills.push(data);
          return data;
        },
      },
    };

    return callback(tx);
  };
}

class TestJobProvider implements OpportunityProvider {
  name = 'TestJobProvider';
  source = 'TestJobSource';

  constructor(private jobs: ExternalJob[]) {}

  async fetch(): Promise<ExternalJob[]> {
    return this.jobs;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('TEST SUITE: Skill Persistence & Ingestion Verification');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ─── Test 1: Creating a previously unseen skill supplies all required fields ───
  console.log('--- Test 1: Unseen Skill Supplies Required id, name, and category ---');
  {
    const mockPrisma = new MockPrismaClient();
    const ingestor = new OpportunityIngestor(mockPrisma as any);

    const testJob: ExternalJob = {
      id: 'job-unseen-1',
      title: 'Systems Engineer',
      company: 'TestCorp',
      description: 'Role requiring Rust and Go',
      applicationUrl: 'https://example.com/apply/1',
      source: 'TestJobSource',
      requiredSkills: ['rust'],
      preferredSkills: ['docker'],
    };

    const provider = new TestJobProvider([testJob]);
    const result = await ingestor.ingest(provider);

    assert(result.created === 1, 'Ingest created 1 opportunity');
    assert(result.errors === 0, 'Ingest produced 0 errors');

    const createdRustSkill = mockPrisma.skills.get('rust');
    assert(Boolean(createdRustSkill), 'Skill "rust" was inserted into skills table');
    assert(
      Boolean(createdRustSkill?.id && UUID_REGEX.test(createdRustSkill.id)),
      `Skill "rust" has a valid RFC 4122 v4 UUID: "${createdRustSkill?.id}"`,
    );
    assert(createdRustSkill?.name === 'rust', 'Skill "rust" has correct name');
    assert(createdRustSkill?.category === 'TOOL', 'Skill "rust" has category "TOOL"');

    const createdDockerSkill = mockPrisma.skills.get('docker');
    assert(Boolean(createdDockerSkill), 'Skill "docker" was inserted into skills table');
    assert(
      Boolean(createdDockerSkill?.id && UUID_REGEX.test(createdDockerSkill.id)),
      `Skill "docker" has a valid RFC 4122 v4 UUID: "${createdDockerSkill?.id}"`,
    );

    assert(
      mockPrisma.lastUpsertCreatePayload !== null &&
        typeof mockPrisma.lastUpsertCreatePayload.id === 'string' &&
        UUID_REGEX.test(mockPrisma.lastUpsertCreatePayload.id),
      'tx.skill.upsert create payload explicitly contains valid id string',
    );
  }
  console.log();

  // ─── Test 2: An existing canonical skill is reused rather than duplicated ─────
  console.log('--- Test 2: Existing Canonical Skill Reused Without Duplication ---');
  {
    const mockPrisma = new MockPrismaClient();
    const preExistingId = '11111111-2222-3333-4444-555555555555';
    mockPrisma.skills.set('python', {
      id: preExistingId,
      name: 'python',
      category: 'LANGUAGE',
    });

    const ingestor = new OpportunityIngestor(mockPrisma as any);

    const testJob: ExternalJob = {
      id: 'job-reuse-1',
      title: 'Python Backend Engineer',
      company: 'DataCorp',
      description: 'Role requiring Python',
      applicationUrl: 'https://example.com/apply/python',
      source: 'TestJobSource',
      requiredSkills: ['python'],
    };

    const provider = new TestJobProvider([testJob]);
    const result = await ingestor.ingest(provider);

    assert(result.created === 1, 'Ingest created opportunity reusing skill');
    assert(mockPrisma.skills.size === 1, 'Skills count remains 1 (no duplicate python skill created)');

    const pythonSkill = mockPrisma.skills.get('python');
    assert(pythonSkill?.id === preExistingId, 'Pre-existing skill ID preserved');
    assert(pythonSkill?.category === 'LANGUAGE', 'Pre-existing skill category "LANGUAGE" preserved');

    const oppSkillRelation = mockPrisma.opportunitySkills.find(
      (os) => os.skillId === preExistingId,
    );
    assert(Boolean(oppSkillRelation), 'OpportunitySkill relation references existing skill ID');
    assert(
      oppSkillRelation?.requirementType === RequirementType.REQUIRED,
      'RequirementType mapped to REQUIRED',
    );
  }
  console.log();

  // ─── Test 3: Repeated ingestion of same job is idempotent ─────────────────────
  console.log('--- Test 3: Repeated Ingestion Idempotency & Deduplication ---');
  {
    const mockPrisma = new MockPrismaClient();
    const ingestor = new OpportunityIngestor(mockPrisma as any);

    const testJob: ExternalJob = {
      id: 'job-idempotent-1',
      title: 'Frontend Developer',
      company: 'WebCorp',
      description: 'Role requiring React and TypeScript',
      applicationUrl: 'https://example.com/apply/fe',
      source: 'TestJobSource',
      requiredSkills: ['react'],
      preferredSkills: ['typescript'],
    };

    const provider = new TestJobProvider([testJob]);

    // First ingestion
    const firstRun = await ingestor.ingest(provider);
    assert(firstRun.created === 1 && firstRun.skipped === 0, 'First run created 1 opportunity');
    const initialOppCount = mockPrisma.opportunities.size;
    const initialSkillCount = mockPrisma.skills.size;
    const initialRelationCount = mockPrisma.opportunitySkills.length;

    // Second ingestion with identical job
    const secondRun = await ingestor.ingest(provider);
    assert(secondRun.created === 0, 'Second run created 0 opportunities (skipped duplicate)');
    assert(secondRun.skipped === 1, 'Second run reported 1 skipped duplicate');
    assert(secondRun.errors === 0, 'Second run reported 0 errors');

    assert(mockPrisma.opportunities.size === initialOppCount, 'Opportunities count in DB unchanged');
    assert(mockPrisma.skills.size === initialSkillCount, 'Skills count in DB unchanged');
    assert(
      mockPrisma.opportunitySkills.length === initialRelationCount,
      'OpportunitySkill relations count unchanged (no duplicate relations created)',
    );
  }
  console.log();

  // ─── Test 4: Failure during skill persistence is reported accurately ─────────
  console.log('--- Test 4: Skill Persistence Failure Error Reporting ---');
  {
    const mockPrisma = new MockPrismaClient();
    mockPrisma.shouldFailSkillUpsert = true; // Inject simulated database failure
    const ingestor = new OpportunityIngestor(mockPrisma as any);

    const testJob: ExternalJob = {
      id: 'job-failing-1',
      title: 'Security Engineer',
      company: 'SecCorp',
      description: 'Security role',
      applicationUrl: 'https://example.com/apply/sec',
      source: 'TestJobSource',
      requiredSkills: ['cryptography'],
    };

    const provider = new TestJobProvider([testJob]);
    const result = await ingestor.ingest(provider);

    assert(result.created === 0, 'Failed ingestion does NOT count as created');
    assert(result.errors === 1, 'Failure accurately reported in errors count');
    assert(result.skipped === 0, 'Failure not marked as skipped');
  }
  console.log();

  // ─── Test 5: Existing Provider Normalization Remains Unchanged ───────────────
  console.log('--- Test 5: Provider Normalization Invariant Check ---');
  {
    const normalizer = new OpportunityNormalizer();

    // Canonical skills lowercased and trimmed
    assert(normalizer.normalizeSkill('  React.js  ') === 'react', 'React.js normalized to react');
    assert(normalizer.normalizeSkill('TypeScript') === 'typescript', 'TypeScript normalized to typescript');
    assert(normalizer.normalizeSkill('PostgreSQL') === 'postgresql', 'PostgreSQL normalized to postgresql');
    assert(normalizer.normalizeSkill('Docker') === 'docker', 'Docker normalized to docker');
    assert(normalizer.normalizeSkill('AWS') === 'aws', 'AWS normalized to aws');

    // Full job normalization preserves fields
    const extJob: ExternalJob = {
      id: 'norm-test-1',
      title: '  Staff Software Engineer  ',
      company: '  Acme Corp  ',
      description: '  Building scalable distributed systems  ',
      workMode: 'Hybrid',
      employmentType: 'Full-time',
      location: 'New York, NY',
      applicationUrl: 'https://acme.com/jobs/1/apply',
      sourceUrl: 'https://acme.com/jobs/1',
      source: 'Greenhouse',
      requiredSkills: ['Python', 'Docker'],
      preferredSkills: ['Kubernetes'],
    };

    const normalized = normalizer.normalize(extJob);
    assert(normalized.title === 'Staff Software Engineer', 'Title trimmed');
    assert(normalized.organization === 'Acme Corp', 'Organization trimmed');
    assert(normalized.source === 'Greenhouse', 'Source preserved');
    assert(normalized.sourceJobId === 'norm-test-1', 'sourceJobId preserved');
    assert(normalized.workMode === 'HYBRID', 'WorkMode normalized to HYBRID');
    assert(normalized.employmentType === 'FULL_TIME', 'EmploymentType normalized to FULL_TIME');
    assert(
      normalized.requiredSkills.includes('python') && normalized.requiredSkills.includes('docker'),
      'Required skills normalized and lowercased',
    );
    assert(
      normalized.preferredSkills.includes('kubernetes'),
      'Preferred skills normalized and lowercased',
    );
  }
  console.log();

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
