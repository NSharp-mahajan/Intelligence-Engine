/**
 * Automated Verification Suite — Safe Opportunity Ingestion Scheduler
 *
 * SAFETY GUARD:
 * - Strictly targets the isolated test database on Port 5433 (intelligence_engine_test).
 * - Refuses any connection targeting the development database on Port 5432.
 * - Uses isolated mock providers (source = 'SchedulerTest') to eliminate external API dependency.
 */

import { PrismaClient, RequirementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import {
  IngestionScheduler,
  IngestionConfig,
  loadIngestionConfigFromEnv,
} from './services/ingestionScheduler';
import {
  OpportunityProvider,
  ExternalJob,
  OpportunityIngestor,
} from './lib/opportunityProvider';

// ─── Safety Guard ───────────────────────────────────────────────────────────

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://postgres:postgres@127.0.0.1:5433/intelligence_engine_test?schema=public';

if (TEST_DB_URL.includes(':5432/') && !TEST_DB_URL.includes(':5433/')) {
  console.error('\n[FATAL SAFETY VIOLATION] Target points to Port 5432 (development DB).');
  console.error('This test MUST ONLY run against Port 5433 (isolated test DB).\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Test Assertion Helper ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, section = 'General') {
  if (condition) {
    console.log(`  [PASS] [${section}] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] [${section}] ${message}`);
    failed++;
  }
}

// ─── Mock Providers ─────────────────────────────────────────────────────────

class MockFastProvider implements OpportunityProvider {
  constructor(
    public readonly name: string,
    private readonly jobs: ExternalJob[] = [],
  ) {}

  async fetch(): Promise<ExternalJob[]> {
    return this.jobs;
  }
}

class MockFlakyProvider implements OpportunityProvider {
  public attempts = 0;

  constructor(
    public readonly name: string,
    private readonly failUntilAttempt: number,
    private readonly jobs: ExternalJob[] = [],
  ) {}

  async fetch(): Promise<ExternalJob[]> {
    this.attempts++;
    if (this.attempts <= this.failUntilAttempt) {
      throw new Error(`Transient network failure on attempt ${this.attempts}`);
    }
    return this.jobs;
  }
}

class MockFailingProvider implements OpportunityProvider {
  public attempts = 0;

  constructor(public readonly name: string) {}

  async fetch(): Promise<ExternalJob[]> {
    this.attempts++;
    throw new Error(`Permanent provider outage (attempt ${this.attempts})`);
  }
}

// ─── Test Suite Execution ───────────────────────────────────────────────────

async function runTests() {
  console.log('======================================================================');
  console.log('INTELLIGENCE-ENGINE — INGESTION SCHEDULER VERIFICATION');
  console.log('======================================================================');
  console.log(`Target Test Database: ${TEST_DB_URL.replace(/:([^:@]+)@/, ':***@')}\n`);

  try {
    // Clean up any leftovers from previous test runs
    await prisma.opportunity.deleteMany({
      where: { source: 'SchedulerTest' },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: Configuration Loading & Defaults
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- Test 1: Configuration Loading & Defaults ---');
    const defaultConfig = loadIngestionConfigFromEnv();
    assert(Array.isArray(defaultConfig.providers), 'Default providers is an array', 'Config');
    assert(defaultConfig.providers.includes('jobicy'), 'Default providers include jobicy', 'Config');
    assert(defaultConfig.providers.includes('greenhouse'), 'Default providers include greenhouse', 'Config');
    assert(defaultConfig.providers.includes('lever'), 'Default providers include lever', 'Config');
    assert(defaultConfig.intervalMinutes > 0, 'Default intervalMinutes is positive', 'Config');
    assert(defaultConfig.timezone === 'UTC', 'Default timezone is UTC', 'Config');
    assert(defaultConfig.maxRetries === 2, 'Default maxRetries is 2', 'Config');
    assert(defaultConfig.timeoutMs === 30000, 'Default timeout is 30000ms', 'Config');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Manual One-Off Run (runOnce) with Multi-Provider Orchestration
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Manual One-Off Execution ---');
    const jobA: ExternalJob = {
      id: 'job_a_1',
      title: 'Distributed Systems Engineer',
      company: 'Acme Cloud',
      description: 'Building distributed event streams in Rust and Go',
      location: 'Remote, US',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      applicationUrl: 'https://acme.example.com/apply/1',
      source: 'SchedulerTest',
      requiredSkills: ['Rust', 'Go'],
      preferredSkills: ['Kafka'],
    };

    const jobB: ExternalJob = {
      id: 'job_b_1',
      title: 'Frontend Platform Architect',
      company: 'Zenith Design',
      description: 'Building design systems with TypeScript and Next.js',
      location: 'San Francisco, CA',
      workMode: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceLevel: 'MID',
      applicationUrl: 'https://zenith.example.com/apply/1',
      source: 'SchedulerTest',
      requiredSkills: ['TypeScript', 'Next.js'],
    };

    const mockFactory1 = (name: string): OpportunityProvider => {
      if (name === 'mock_provider_a') return new MockFastProvider('mock_provider_a', [jobA]);
      if (name === 'mock_provider_b') return new MockFastProvider('mock_provider_b', [jobB]);
      throw new Error(`Unknown provider: ${name}`);
    };

    const config1: IngestionConfig = {
      providers: ['mock_provider_a', 'mock_provider_b'],
      intervalMinutes: 60,
      timezone: 'UTC',
      maxRetries: 2,
      retryDelayMs: 50,
      timeoutMs: 5000,
      jobicyCount: 10,
    };

    const scheduler1 = new IngestionScheduler(prisma, config1, mockFactory1);
    const summary1 = await scheduler1.runOnce();

    assert(summary1.status === 'SUCCESS', 'Overall run status is SUCCESS', 'ManualRun');
    assert(summary1.durationMs >= 0, 'Run durationMs is recorded', 'ManualRun');
    assert(summary1.totals.created === 2, `Total created is 2 (got ${summary1.totals.created})`, 'ManualRun');
    assert(summary1.providers['mock_provider_a']?.status === 'SUCCESS', 'Provider A status is SUCCESS', 'ManualRun');
    assert(summary1.providers['mock_provider_b']?.status === 'SUCCESS', 'Provider B status is SUCCESS', 'ManualRun');

    // Verify database persistence
    const savedOpps = await prisma.opportunity.findMany({
      where: { source: 'SchedulerTest' },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    assert(savedOpps.length === 2, `Both opportunities persisted in DB (got ${savedOpps.length})`, 'ManualRun');
    assert(savedOpps.every((o) => o.lastSeenAt !== null), 'All saved opportunities have lastSeenAt set', 'ManualRun');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Disabled-Provider Behavior (Subsetting)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Disabled-Provider Behavior ---');
    let providerBExecuted = false;
    const mockFactorySub = (name: string): OpportunityProvider => {
      if (name === 'mock_provider_a') return new MockFastProvider('mock_provider_a', []);
      if (name === 'mock_provider_b') {
        providerBExecuted = true;
        return new MockFastProvider('mock_provider_b', []);
      }
      throw new Error(`Unexpected provider ${name}`);
    };

    const schedulerSub = new IngestionScheduler(prisma, config1, mockFactorySub);
    // Explicitly run only mock_provider_a
    const subSummary = await schedulerSub.runOnce({ providers: ['mock_provider_a'] });
    assert(subSummary.status === 'SUCCESS', 'Subset run status is SUCCESS', 'ProviderSubsetting');
    assert('mock_provider_a' in subSummary.providers, 'mock_provider_a was executed', 'ProviderSubsetting');
    assert(!('mock_provider_b' in subSummary.providers), 'mock_provider_b was omitted from results', 'ProviderSubsetting');
    assert(providerBExecuted === false, 'mock_provider_b was never invoked', 'ProviderSubsetting');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Provider Transient Failure & Bounded Retries
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Provider Transient Failure & Bounded Retries ---');
    // Flaky provider fails on attempt 1, succeeds on attempt 2
    const flakyProvider = new MockFlakyProvider('flaky_provider', 1, [
      {
        id: 'flaky_1',
        title: 'Backend Engineer',
        company: 'Flaky Corp',
        description: 'Reliable backend',
        applicationUrl: 'https://flaky.example.com/1',
        source: 'SchedulerTest',
      },
    ]);

    const schedulerFlaky = new IngestionScheduler(
      prisma,
      { ...config1, providers: ['flaky_provider'], retryDelayMs: 50 },
      () => flakyProvider,
    );

    const flakySummary = await schedulerFlaky.runOnce();
    assert(flakySummary.status === 'SUCCESS', 'Flaky provider ultimately succeeded', 'Retries');
    assert(flakySummary.providers['flaky_provider'].attempts === 2, `Provider was retried (attempts = 2, got ${flakySummary.providers['flaky_provider'].attempts})`, 'Retries');
    assert(flakySummary.totals.created === 1, 'Flaky job created on retry', 'Retries');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Permanent Provider Failure & Non-Fatal Partial Run Status
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Non-Fatal Partial Run Status ---');
    const failingProvider = new MockFailingProvider('failing_provider');
    const healthyProvider = new MockFastProvider('healthy_provider', [
      {
        id: 'healthy_1',
        title: 'Security Analyst',
        company: 'SafeGuard',
        description: 'Protect systems',
        applicationUrl: 'https://safeguard.example.com/1',
        source: 'SchedulerTest',
      },
    ]);

    const schedulerPartial = new IngestionScheduler(
      prisma,
      { ...config1, providers: ['healthy_provider', 'failing_provider'], maxRetries: 2, retryDelayMs: 30 },
      (name) => (name === 'healthy_provider' ? healthyProvider : failingProvider),
    );

    const partialSummary = await schedulerPartial.runOnce();
    assert(partialSummary.status === 'PARTIAL_FAILURE', 'Run correctly reports PARTIAL_FAILURE (not masked as SUCCESS)', 'PartialFailure');
    assert(partialSummary.providers['healthy_provider']?.status === 'SUCCESS', 'Healthy provider succeeded', 'PartialFailure');
    assert(partialSummary.providers['failing_provider']?.status === 'FAILED', 'Failing provider marked as FAILED', 'PartialFailure');
    assert(partialSummary.providers['failing_provider']?.attempts === 3, 'Failing provider exhausted maxRetries (1 + 2 = 3)', 'PartialFailure');
    assert(Boolean(partialSummary.providers['failing_provider']?.error), 'Failing provider recorded error message', 'PartialFailure');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: Prevention of Overlapping Runs (Local Mutex & Advisory Lock)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: Prevention of Overlapping Runs ---');
    let slowProviderResolve: () => void;
    const slowProviderPromise = new Promise<void>((r) => {
      slowProviderResolve = r;
    });
    const slowProvider: OpportunityProvider = {
      name: 'slow_provider',
      async fetch() {
        await slowProviderPromise;
        return [];
      },
    };

    const schedulerOverlap = new IngestionScheduler(
      prisma,
      { ...config1, providers: ['slow_provider'] },
      () => slowProvider,
    );

    // Start run 1 (in background, will hang until resolved)
    const run1Promise = schedulerOverlap.runOnce();
    // Immediate run 2 should detect run 1 is active
    const run2Summary = await schedulerOverlap.runOnce();

    assert(run2Summary.status === 'SKIPPED', 'Second concurrent run was SKIPPED', 'ConcurrencyLock');
    assert(Boolean(run2Summary.reason?.includes('CONCURRENT')), 'Skipped reason specifies concurrent run', 'ConcurrencyLock');

    // Resolve run 1
    slowProviderResolve!();
    const run1Summary = await run1Promise;
    assert(run1Summary.status === 'SUCCESS', 'First run completed successfully after unblocking', 'ConcurrencyLock');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: Idempotent Ingestion & lastSeenAt Timestamp Advancement
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Idempotency & Freshness Timestamp ---');
    const existingOppBefore = await prisma.opportunity.findFirst({
      where: { source: 'SchedulerTest', sourceJobId: 'job_a_1' },
    });
    const lastSeen1 = existingOppBefore?.lastSeenAt?.getTime() || 0;

    // Small delay to ensure forward timestamp advancement
    await new Promise((r) => setTimeout(r, 60));

    // Re-ingest the exact same jobA
    const reingestSummary = await scheduler1.runOnce({ providers: ['mock_provider_a'] });
    assert(reingestSummary.totals.created === 0, 'No duplicates created on re-ingestion', 'Idempotency');
    assert(reingestSummary.totals.updated === 1, 'Existing record marked updated', 'Idempotency');

    const existingOppAfter = await prisma.opportunity.findFirst({
      where: { source: 'SchedulerTest', sourceJobId: 'job_a_1' },
    });
    const lastSeen2 = existingOppAfter?.lastSeenAt?.getTime() || 0;
    assert(lastSeen2 > lastSeen1, `lastSeenAt timestamp refreshed forward (${lastSeen2} > ${lastSeen1})`, 'Idempotency');

    // Total count for job_a_1 remains exactly 1
    const matchCount = await prisma.opportunity.count({
      where: { source: 'SchedulerTest', sourceJobId: 'job_a_1' },
    });
    assert(matchCount === 1, 'Database contains exactly 1 copy of job_a_1', 'Idempotency');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: Field Preservation When Provider Omits Data
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: Data Preservation Under Sparse Provider Updates ---');
    // Original jobA had location: 'Remote, US', workMode: 'REMOTE'
    const sparseJobA: ExternalJob = {
      id: 'job_a_1',
      title: 'Distributed Systems Engineer - Updated Title',
      company: 'Acme Cloud',
      description: 'Updated description',
      applicationUrl: 'https://acme.example.com/apply/1',
      source: 'SchedulerTest',
      // location and workMode omitted
    };

    const sparseFactory = () => new MockFastProvider('mock_provider_a', [sparseJobA]);
    const schedulerSparse = new IngestionScheduler(prisma, config1, sparseFactory);
    await schedulerSparse.runOnce({ providers: ['mock_provider_a'] });

    const preservedOpp = await prisma.opportunity.findFirst({
      where: { source: 'SchedulerTest', sourceJobId: 'job_a_1' },
    });
    assert(preservedOpp?.title === 'Distributed Systems Engineer - Updated Title', 'Mutable field (title) updated', 'Preservation');
    assert(preservedOpp?.location === 'Remote, US', 'Omitted location preserved (not overwritten with null)', 'Preservation');
    assert(preservedOpp?.workMode === 'REMOTE', 'Omitted workMode preserved (not overwritten with UNKNOWN)', 'Preservation');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 9: Non-Deletion on Provider Failure or Sparse Listing
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 9: Zero Deletion on Provider Failure ---');
    const emptyFactory = () => new MockFastProvider('mock_provider_a', []); // Provider returned 0 jobs
    const schedulerEmpty = new IngestionScheduler(prisma, config1, emptyFactory);
    await schedulerEmpty.runOnce({ providers: ['mock_provider_a'] });

    const totalRemaining = await prisma.opportunity.count({
      where: { source: 'SchedulerTest' },
    });
    assert(totalRemaining >= 2, `Existing opportunities preserved after empty provider run (count: ${totalRemaining})`, 'NonDeletion');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 10: Scheduler Status & History Inspection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 10: Status & History Tracking ---');
    const history = scheduler1.getHistory();
    assert(history.length >= 2, `History records past runs (length: ${history.length})`, 'StatusTracking');
    const status = scheduler1.getStatus();
    assert(status.active === false, 'Scheduler active status reflects stopped timer', 'StatusTracking');
    assert(status.configuredProviders.length === 2, 'Status exposes configured providers', 'StatusTracking');

    // Test start and stop
    scheduler1.start({ runImmediately: false });
    assert(scheduler1.getStatus().active === true, 'Scheduler active is true after start()', 'StatusTracking');
    assert(scheduler1.getStatus().nextRunTime !== null, 'Scheduler calculates nextRunTime', 'StatusTracking');
    scheduler1.stop();
    assert(scheduler1.getStatus().active === false, 'Scheduler active is false after stop()', 'StatusTracking');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 11: CLI Interface Verification (--help)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 11: CLI Worker Interface Verification ---');
    const cliHelp = execSync('npx tsx src/worker.ts --help', { cwd: __dirname + '/..' }).toString();
    assert(cliHelp.includes('USAGE:'), 'CLI --help displays USAGE', 'CLI');
    assert(cliHelp.includes('--once'), 'CLI --help documents --once flag', 'CLI');
    assert(cliHelp.includes('INGESTION_PROVIDERS'), 'CLI --help documents environment variables', 'CLI');

    // Clean up test records
    await prisma.opportunity.deleteMany({
      where: { source: 'SchedulerTest' },
    });

    console.log('\n======================================================================');
    console.log(`INGESTION SCHEDULER VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[FATAL ERROR] Ingestion scheduler test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runTests();
