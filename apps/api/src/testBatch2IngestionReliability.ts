import assert from 'assert';
import { randomUUID } from 'crypto';
import {
  OpportunityIngestor,
  OpportunityNormalizer,
  ExternalJob,
} from './lib/opportunityProvider';
import {
  IngestionScheduler,
  loadIngestionConfigFromEnv,
  IngestionConfig,
} from './services/ingestionScheduler';

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  [PASS] ${desc}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${desc}: ${err.message}`);
      failed++;
    }
  })();
}

async function run() {
  console.log('\n==================================================');
  console.log('TEST SUITE: Batch 2 Ingestion Reliability Fixes');
  console.log('==================================================\n');

  // ──────────────────────────────────────────────────────────
  // 1. Skill Resolution Tests (resolveSkillIds)
  // ──────────────────────────────────────────────────────────
  console.log('--- 1. Bulk Skill Resolution Tests ---');

  const ingestor = new OpportunityIngestor({} as any);

  await it('Existing skill lookup: finds existing skills in bulk via findMany', async () => {
    const existingDb = [
      { id: 'skill-uuid-python', name: 'python' },
      { id: 'skill-uuid-sql', name: 'sql' },
    ];
    let findManyCalled = false;
    let createCalled = false;

    const mockTx = {
      skill: {
        findMany: async (args: any) => {
          findManyCalled = true;
          return existingDb.filter((s) => args.where.name.in.includes(s.name));
        },
        create: async () => {
          createCalled = true;
          throw new Error('Should not create existing skills');
        },
      },
    };

    const res = await (ingestor as any).resolveSkillIds(
      mockTx,
      ['Python', 'sql'],
      []
    );

    assert.strictEqual(findManyCalled, true);
    assert.strictEqual(createCalled, false);
    assert.deepStrictEqual(res.reqSkillIds, ['skill-uuid-python', 'skill-uuid-sql']);
    assert.deepStrictEqual(res.prefSkillIds, []);
  });

  await it('Missing skill creation: creates missing skills safely', async () => {
    const created: string[] = [];
    const mockTx = {
      skill: {
        findMany: async () => [], // None exist
        create: async (args: any) => {
          created.push(args.data.name);
          return { id: `id-${args.data.name}`, name: args.data.name };
        },
      },
    };

    const res = await (ingestor as any).resolveSkillIds(
      mockTx,
      ['rust', 'go'],
      ['docker']
    );

    assert.strictEqual(created.length, 3);
    assert.ok(created.includes('rust'));
    assert.ok(created.includes('go'));
    assert.ok(created.includes('docker'));
    assert.deepStrictEqual(res.reqSkillIds, ['id-rust', 'id-go']);
    assert.deepStrictEqual(res.prefSkillIds, ['id-docker']);
  });

  await it('Duplicate skill names: deduplicates case and whitespace variations', async () => {
    const mockTx = {
      skill: {
        findMany: async (args: any) => {
          // Should only query for 1 normalized name
          assert.strictEqual(args.where.name.in.length, 1);
          assert.strictEqual(args.where.name.in[0], 'typescript');
          return [{ id: 'skill-ts', name: 'typescript' }];
        },
      },
    };

    const res = await (ingestor as any).resolveSkillIds(
      mockTx,
      [' TypeScript ', 'typescript', 'TYPESCRIPT', 'TypeScript'],
      ['typescript']
    );

    assert.deepStrictEqual(res.reqSkillIds, ['skill-ts']);
    assert.deepStrictEqual(res.prefSkillIds, []);
  });

  await it('Required vs Preferred overlap: required takes precedence; sets are disjoint', async () => {
    const mockTx = {
      skill: {
        findMany: async () => [
          { id: 'id-react', name: 'react' },
          { id: 'id-node', name: 'node' },
        ],
      },
    };

    const res = await (ingestor as any).resolveSkillIds(
      mockTx,
      ['react'],
      ['react', 'node'] // react is both required and preferred
    );

    assert.deepStrictEqual(res.reqSkillIds, ['id-react']);
    assert.deepStrictEqual(res.prefSkillIds, ['id-node']);
    // Verify disjoint
    assert.ok(!res.prefSkillIds.includes('id-react'));
  });

  await it('Concurrent skill insertion race: catches P2002 and recovers gracefully', async () => {
    let createAttempted = false;
    const mockTx = {
      skill: {
        findMany: async () => [], // Initially looks missing
        create: async () => {
          createAttempted = true;
          const p2002Err: any = new Error('Unique constraint failed on the fields: (name)');
          p2002Err.code = 'P2002';
          throw p2002Err;
        },
        findUnique: async () => ({ id: 'race-winner-id', name: 'kafka' }),
      },
    };

    const res = await (ingestor as any).resolveSkillIds(mockTx, ['kafka'], []);

    assert.strictEqual(createAttempted, true);
    assert.deepStrictEqual(res.reqSkillIds, ['race-winner-id']);
  });

  // ──────────────────────────────────────────────────────────
  // 2. Eligibility Evidence Bulk Persistence Tests
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 2. Eligibility Evidence Bulk Persistence Tests ---');

  await it('Initial insertion: batches active evidence records via createMany', async () => {
    let createManyCalled = false;
    let createManyRows: any[] = [];

    const mockTx = {
      opportunityEligibility: {
        findUnique: async () => null, // Initial insertion
        create: async () => ({ id: 'elig-123' }),
      },
      opportunityEligibilityEvidence: {
        createMany: async (args: any) => {
          createManyCalled = true;
          createManyRows = args.data;
          return { count: args.data.length };
        },
        create: async () => {
          throw new Error('create() should not be called when createMany is available');
        },
      },
    };

    const classification: any = {
      category: 'INTERNSHIP',
      confidence: 0.95,
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      explanation: 'Test',
      evidenceRecords: [
        {
          criterion: 'ROLE_CATEGORY',
          rawValue: 'Software Intern',
          confidence: 0.95,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'TITLE_REGEX',
          sourceField: 'title',
        },
        {
          criterion: 'EXPERIENCE_MONTHS',
          rawValue: '0 years',
          confidence: 0.9,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'EXPERIENCE_REGEX',
          sourceField: 'description',
        },
      ],
    };

    await ingestor.persistEligibility(
      mockTx,
      'opp-123',
      classification,
      'hash-123',
      new Date(),
      'early-career-v1'
    );

    assert.strictEqual(createManyCalled, true);
    assert.strictEqual(createManyRows.length, 2);
    assert.ok(createManyRows[0].id.length > 10, 'UUID generated');
    assert.strictEqual(createManyRows[0].isActive, true);
    assert.strictEqual(createManyRows[0].criterion, 'ROLE_CATEGORY');
    assert.strictEqual(createManyRows[1].criterion, 'EXPERIENCE_MONTHS');
  });

  await it('Empty evidence array: handles safely without calling createMany with empty array', async () => {
    let createManyCalled = false;

    const mockTx = {
      opportunityEligibility: {
        findUnique: async () => null,
        create: async () => ({ id: 'elig-empty' }),
      },
      opportunityEligibilityEvidence: {
        createMany: async () => {
          createManyCalled = true;
        },
      },
    };

    const classification: any = {
      category: 'UNKNOWN',
      confidence: 0.1,
      overallVerificationLevel: 'UNVERIFIED',
      explanation: 'No evidence',
      evidenceRecords: [],
    };

    await ingestor.persistEligibility(
      mockTx,
      'opp-empty',
      classification,
      'hash-empty',
      new Date()
    );

    assert.strictEqual(createManyCalled, false);
  });

  await it('Supersession lifecycle: batches new evidence in createMany and supersedes old records', async () => {
    let createManyCalled = false;
    let createManyRows: any[] = [];
    const updatedOldIds: string[] = [];

    const mockTx = {
      opportunityEligibility: {
        findUnique: async () => ({
          id: 'elig-existing',
          sourceContentHash: 'old-hash',
          classifierVersion: 'early-career-v1',
        }),
        update: async () => ({}),
      },
      opportunityEligibilityEvidence: {
        findMany: async () => [
          { id: 'old-ev-1', criterion: 'ROLE_CATEGORY', verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE' },
        ],
        createMany: async (args: any) => {
          createManyCalled = true;
          createManyRows = args.data;
          return { count: args.data.length };
        },
        update: async (args: any) => {
          updatedOldIds.push(args.where.id);
          assert.strictEqual(args.data.isActive, false);
          assert.ok(args.data.supersededById);
        },
      },
    };

    const newClassification: any = {
      category: 'FRESHER',
      confidence: 0.95,
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      evidenceRecords: [
        {
          criterion: 'ROLE_CATEGORY',
          rawValue: 'Graduate Engineer Trainee',
          confidence: 0.95,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'TITLE_REGEX',
          sourceField: 'title',
        },
      ],
    };

    await ingestor.persistEligibility(
      mockTx,
      'opp-update',
      newClassification,
      'new-hash-changed',
      new Date()
    );

    assert.strictEqual(createManyCalled, true);
    assert.strictEqual(createManyRows.length, 1);
    assert.strictEqual(updatedOldIds.length, 1);
    assert.strictEqual(updatedOldIds[0], 'old-ev-1');
  });

  await it('Regression: duplicate incoming evidence for same criterion consolidated to 1 active row', async () => {
    let insertedRows: any[] = [];
    const mockTx = {
      opportunityEligibility: {
        findUnique: async () => null,
        create: async () => ({ id: 'elig-dedup' }),
      },
      opportunityEligibilityEvidence: {
        createMany: async (args: any) => {
          insertedRows = args.data;
          return { count: args.data.length };
        },
      },
    };

    const duplicateClassification: any = {
      category: 'INTERNSHIP',
      confidence: 0.9,
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      explanation: 'Duplicate test',
      evidenceRecords: [
        {
          criterion: 'ROLE_CATEGORY',
          rawValue: 'Software Intern',
          confidence: 0.95,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'TITLE_REGEX',
          sourceField: 'title',
        },
        {
          criterion: 'ROLE_CATEGORY',
          rawValue: 'Engineering Intern',
          confidence: 0.90,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'DESC_REGEX',
          sourceField: 'description',
        },
      ],
    };

    await ingestor.persistEligibility(
      mockTx,
      'opp-dedup',
      duplicateClassification,
      'hash-dedup',
      new Date()
    );

    assert.strictEqual(insertedRows.length, 1, 'Only one evidence row created for ROLE_CATEGORY');
    assert.strictEqual(insertedRows[0].criterion, 'ROLE_CATEGORY');
    assert.strictEqual(insertedRows[0].isActive, true);
  });

  await it('Regression: old active evidence deactivated BEFORE inserting new active evidence (idx_single_active_evidence_per_criterion)', async () => {
    // In-memory table state simulating PostgreSQL partial unique index:
    // idx_single_active_evidence_per_criterion ON (eligibilityId, criterion) WHERE isActive = true
    const activeRecords = new Map<string, boolean>([['ROLE_CATEGORY', true]]);
    const operationOrder: string[] = [];

    const mockTx = {
      opportunityEligibility: {
        findUnique: async () => ({
          id: 'elig-supersede',
          sourceContentHash: 'old-hash',
          classifierVersion: 'early-career-v1',
        }),
        update: async () => ({}),
      },
      opportunityEligibilityEvidence: {
        findMany: async () => [
          { id: 'old-ev-role', criterion: 'ROLE_CATEGORY', verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE' },
        ],
        update: async (args: any) => {
          operationOrder.push(`deactivate:${args.where.id}`);
          if (args.data.isActive === false) {
            activeRecords.set('ROLE_CATEGORY', false);
          }
        },
        updateMany: async (args: any) => {
          operationOrder.push('updateMany:deactivate');
          if (args.data.isActive === false) {
            activeRecords.set('ROLE_CATEGORY', false);
          }
        },
        createMany: async (args: any) => {
          operationOrder.push('createMany:newEvidence');
          for (const row of args.data) {
            if (row.isActive && activeRecords.get(row.criterion) === true) {
              const err: any = new Error(
                'Unique constraint failed on the constraint: idx_single_active_evidence_per_criterion'
              );
              err.code = 'P2002';
              throw err;
            }
            if (row.isActive) {
              activeRecords.set(row.criterion, true);
            }
          }
          return { count: args.data.length };
        },
      },
    };

    const newClassification: any = {
      category: 'ENTRY_LEVEL',
      confidence: 0.95,
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      evidenceRecords: [
        {
          criterion: 'ROLE_CATEGORY',
          rawValue: 'Junior Engineer',
          confidence: 0.95,
          verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
          extractionMethod: 'TITLE_REGEX',
          sourceField: 'title',
        },
      ],
    };

    // This must NOT throw P2002 because old evidence is deactivated before createMany is called
    await ingestor.persistEligibility(
      mockTx,
      'opp-supersede',
      newClassification,
      'new-hash',
      new Date()
    );

    const deactivateIndex = operationOrder.indexOf('deactivate:old-ev-role');
    const createIndex = operationOrder.indexOf('createMany:newEvidence');
    assert.ok(deactivateIndex !== -1, 'Old record was deactivated');
    assert.ok(createIndex !== -1, 'New record was inserted');
    assert.ok(
      deactivateIndex < createIndex,
      `Deactivation (${deactivateIndex}) must occur before creation (${createIndex})`
    );
    assert.strictEqual(activeRecords.get('ROLE_CATEGORY'), true, 'Exactly 1 active record remains');
  });

  // ──────────────────────────────────────────────────────────
  // 3. Transaction Safety Tests
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 3. Transaction Safety Tests ---');

  await it('Explicit transaction options: timeout=20000 and maxWait=10000 applied to $transaction', async () => {
    let capturedOptions: any = null;

    const mockPrisma = {
      $transaction: async (cb: any, opts: any) => {
        capturedOptions = opts;
        const fakeTx = {
          opportunity: { create: async () => ({ id: 'opp-tx' }), findUnique: async () => null },
          skill: { findMany: async () => [] },
          opportunitySkill: { createMany: async () => ({}) },
          opportunityEligibility: { findUnique: async () => null, create: async () => ({}) },
          opportunityEligibilityEvidence: { createMany: async () => ({}) },
        };
        return cb(fakeTx);
      },
      opportunity: {
        findFirst: async () => null,
      },
    };

    const testIngestor = new OpportunityIngestor(mockPrisma as any);
    const mockProvider = {
      name: 'TestTxProvider',
      fetch: async () => [
        {
          id: 'test-job-tx',
          title: 'Software Engineer',
          company: 'Acme',
          source: 'TestTxProvider',
          applicationUrl: 'https://example.com/apply',
          requiredSkills: [],
          preferredSkills: [],
        },
      ],
    };

    await testIngestor.ingest(mockProvider as any);

    assert.notStrictEqual(capturedOptions, null);
    assert.strictEqual(capturedOptions.timeout, 20000);
    assert.strictEqual(capturedOptions.maxWait, 10000);
  });

  await it('Transaction rollback on persistence failure: increments errors count cleanly', async () => {
    const mockPrisma = {
      $transaction: async () => {
        throw new Error('P2028: Transaction timeout');
      },
      opportunity: {
        findFirst: async () => null,
      },
    };

    const testIngestor = new OpportunityIngestor(mockPrisma as any);
    const mockProvider = {
      name: 'FailingProvider',
      fetch: async () => [
        {
          id: 'failing-job',
          title: 'DevOps Engineer',
          company: 'Acme',
          source: 'FailingProvider',
          applicationUrl: 'https://example.com/apply',
        },
      ],
    };

    const stats = await testIngestor.ingest(mockProvider as any);

    assert.strictEqual(stats.created, 0);
    assert.strictEqual(stats.updated, 0);
    assert.strictEqual(stats.errors, 1);
  });

  // ──────────────────────────────────────────────────────────
  // 4. Ingestion Scheduler Failure Reporting Tests
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 4. Ingestion Scheduler Failure Reporting Tests ---');

  await it('Total persistence failure: provider marked FAILED and overall status is FAILED', async () => {
    const mockPrisma = {
      $queryRawUnsafe: async () => [{ locked: true }],
    };

    const failingProvider = {
      name: 'broken_provider',
      fetchOpportunities: async () => [
        { id: '1', title: 'SWE', company: 'Corp', applicationUrl: 'https://example.com' },
      ],
    };

    const mockIngestor = {
      ingest: async () => ({ created: 0, updated: 0, skipped: 0, errors: 5 }),
    };

    const config: IngestionConfig = {
      providers: ['broken_provider'],
      intervalMinutes: 360,
      timezone: 'UTC',
      maxRetries: 0,
      retryDelayMs: 10,
      timeoutMs: 5000,
      jobicyCount: 50,
    };

    const scheduler = new IngestionScheduler(
      mockPrisma as any,
      config,
      () => failingProvider as any,
      mockIngestor as any
    );

    const summary = await scheduler.runOnce({ bypassLock: true });

    assert.strictEqual(summary.status, 'FAILED');
    assert.strictEqual(summary.providers['broken_provider'].status, 'FAILED');
    assert.ok(summary.providers['broken_provider'].error?.includes('Persistence failure'));
    assert.strictEqual(summary.totals.errors, 5);
  });

  await it('Partial success: provider marked SUCCESS but overall status is PARTIAL_FAILURE', async () => {
    const mockPrisma = {
      $queryRawUnsafe: async () => [{ locked: true }],
    };

    const partialProvider = {
      name: 'partial_provider',
      fetchOpportunities: async () => [],
    };

    const mockIngestor = {
      ingest: async () => ({ created: 10, updated: 2, skipped: 1, errors: 3 }),
    };

    const config: IngestionConfig = {
      providers: ['partial_provider'],
      intervalMinutes: 360,
      timezone: 'UTC',
      maxRetries: 0,
      retryDelayMs: 10,
      timeoutMs: 5000,
      jobicyCount: 50,
    };

    const scheduler = new IngestionScheduler(
      mockPrisma as any,
      config,
      () => partialProvider as any,
      mockIngestor as any
    );

    const summary = await scheduler.runOnce({ bypassLock: true });

    assert.strictEqual(summary.status, 'PARTIAL_FAILURE');
    assert.strictEqual(summary.providers['partial_provider'].status, 'SUCCESS');
    assert.strictEqual(summary.totals.created, 10);
    assert.strictEqual(summary.totals.errors, 3);
  });

  await it('Complete success: 0 errors results in overall status SUCCESS', async () => {
    const mockPrisma = {
      $queryRawUnsafe: async () => [{ locked: true }],
    };

    const cleanProvider = {
      name: 'clean_provider',
      fetchOpportunities: async () => [],
    };

    const mockIngestor = {
      ingest: async () => ({ created: 25, updated: 0, skipped: 0, errors: 0 }),
    };

    const config: IngestionConfig = {
      providers: ['clean_provider'],
      intervalMinutes: 360,
      timezone: 'UTC',
      maxRetries: 0,
      retryDelayMs: 10,
      timeoutMs: 5000,
      jobicyCount: 50,
    };

    const scheduler = new IngestionScheduler(
      mockPrisma as any,
      config,
      () => cleanProvider as any,
      mockIngestor as any
    );

    const summary = await scheduler.runOnce({ bypassLock: true });

    assert.strictEqual(summary.status, 'SUCCESS');
    assert.strictEqual(summary.providers['clean_provider'].status, 'SUCCESS');
    assert.strictEqual(summary.totals.created, 25);
    assert.strictEqual(summary.totals.errors, 0);
  });

  // ──────────────────────────────────────────────────────────
  // 5. Ingestion Limit Configuration Tests
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 5. Ingestion Limit Configuration Tests ---');

  await it('Default per-board limit is undefined when omitted (eliminates unintended 25 limit)', () => {
    delete process.env.INGESTION_MAX_JOBS_PER_BOARD;
    const config = loadIngestionConfigFromEnv();
    assert.strictEqual(config.maxJobsPerBoard, undefined);
  });

  await it('Explicit limit override overrides default', () => {
    process.env.INGESTION_MAX_JOBS_PER_BOARD = '500';
    const config = loadIngestionConfigFromEnv();
    assert.strictEqual(config.maxJobsPerBoard, 500);
    delete process.env.INGESTION_MAX_JOBS_PER_BOARD;
  });

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
