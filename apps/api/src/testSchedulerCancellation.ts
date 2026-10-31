import {
  IngestionScheduler,
  type IngestionConfig,
  type ProviderFactory,
} from './services/ingestionScheduler';
import {
  OpportunityIngestor,
  type OpportunityProvider,
  type ExternalJob,
} from './lib/opportunityProvider';

// ─── Test Harness Setup ─────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Test Suite: Scheduler Timeout & Ingestion Cancellation Bug Regression ===\n');

  // Test 1: Ingestion halts and does NOT start database writes after cancellation signal
  console.log('Test 1: Ingestion halts before database write when AbortSignal is cancelled');
  {
    let writeAttempts = 0;
    const mockPrisma: any = {
      $transaction: async () => {
        writeAttempts++;
        return {};
      },
      opportunity: {
        findFirst: async () => null,
        create: async () => {
          writeAttempts++;
          return { id: 'test' };
        },
      },
    };

    const mockNormalizer: any = {
      normalize: (j: any) => ({
        title: j.title,
        organization: j.company,
        description: j.description,
        type: 'JOB',
        location: null,
        workMode: 'ONSITE',
        employmentType: 'FULL_TIME',
        experienceLevel: 'ENTRY',
        applicationUrl: 'https://example.com',
        source: 'Mock',
        sourceUrl: null,
        sourceJobId: '1',
        postedDate: null,
        deadline: null,
        requiredSkills: [],
        preferredSkills: [],
      }),
    };

    const mockDeduplicator: any = {
      findExisting: async () => null,
    };

    const ingestor = new OpportunityIngestor(mockPrisma, mockNormalizer, mockDeduplicator);

    const abortController = new AbortController();

    const mockProvider: OpportunityProvider = {
      name: 'MockHangingProvider',
      fetch: async (signal?: AbortSignal) => {
        // Return 5 jobs, but abort the signal before ingestion writes
        abortController.abort(new Error('Timeout triggered'));
        return [
          { title: 'Job 1', company: 'Co', description: 'Desc', applicationUrl: 'https://example.com', source: 'Mock' },
          { title: 'Job 2', company: 'Co', description: 'Desc', applicationUrl: 'https://example.com', source: 'Mock' },
        ];
      },
    };

    let caughtError = false;
    try {
      await ingestor.ingest(mockProvider, abortController.signal);
    } catch (err) {
      caughtError = true;
      assert(
        err instanceof Error && err.message.includes('Ingestion aborted for MockHangingProvider'),
        `Ingestor threw abort error: ${err instanceof Error ? err.message : err}`,
      );
    }

    assert(caughtError, 'Ingestion threw error on cancellation');
    assert(writeAttempts === 0, `Zero database transactions started after cancellation (actual writes: ${writeAttempts})`);
  }

  // Test 2: Scheduler timeout cancels slow provider and prevents concurrent overlapping retries
  console.log('\nTest 2: Timeout cancellation prevents overlapping retry execution');
  {
    let activeAttempts = 0;
    let maxConcurrentAttempts = 0;
    const attemptLog: Array<{ attempt: number; event: 'start' | 'aborted' | 'settled' }> = [];
    let providerAttemptCount = 0;

    const mockSlowProvider: OpportunityProvider = {
      name: 'SlowProvider',
      fetch: async (signal?: AbortSignal) => {
        providerAttemptCount++;
        const currentAttempt = providerAttemptCount;
        activeAttempts++;
        if (activeAttempts > maxConcurrentAttempts) {
          maxConcurrentAttempts = activeAttempts;
        }
        attemptLog.push({ attempt: currentAttempt, event: 'start' });

        return new Promise<ExternalJob[]>((resolve, reject) => {
          const onAbort = () => {
            attemptLog.push({ attempt: currentAttempt, event: 'aborted' });
            activeAttempts--;
            attemptLog.push({ attempt: currentAttempt, event: 'settled' });
            reject(new Error(`Attempt ${currentAttempt} aborted by timeout`));
          };

          if (signal?.aborted) {
            onAbort();
            return;
          }

          signal?.addEventListener('abort', onAbort, { once: true });
        });
      },
    };

    const mockIngestor: any = {
      ingest: async (provider: OpportunityProvider, signal?: AbortSignal) => {
        return provider.fetch(signal) as any;
      },
    };

    const mockPrisma: any = {};
    const config: IngestionConfig = {
      providers: ['slow'],
      intervalMinutes: 60,
      timezone: 'UTC',
      maxRetries: 1, // 1 retry = 2 attempts total
      retryDelayMs: 20,
      timeoutMs: 50, // fast timeout: 50ms
      jobicyCount: 1,
    };

    const providerFactory: ProviderFactory = () => mockSlowProvider;
    const scheduler = new IngestionScheduler(mockPrisma, config, providerFactory, mockIngestor);

    // Call private runProviderWithRetries via any
    const result = await (scheduler as any).runProviderWithRetries(mockSlowProvider);

    assert(result.attempts === 2, `Ran exactly 2 attempts (initial + 1 retry) (actual: ${result.attempts})`);
    assert(
      result.error !== undefined && result.error.message.includes('Timeout: Ingestion for SlowProvider exceeded 50ms'),
      `Recorded timeout error message: ${result.error?.message}`,
    );
    assert(maxConcurrentAttempts === 1, `Max concurrent attempts was strictly 1 (no overlapping executions; actual: ${maxConcurrentAttempts})`);

    // Verify ordering in attemptLog
    const start1 = attemptLog.findIndex((e) => e.attempt === 1 && e.event === 'start');
    const settled1 = attemptLog.findIndex((e) => e.attempt === 1 && e.event === 'settled');
    const start2 = attemptLog.findIndex((e) => e.attempt === 2 && e.event === 'start');
    const settled2 = attemptLog.findIndex((e) => e.attempt === 2 && e.event === 'settled');

    assert(start1 !== -1 && settled1 !== -1, 'Attempt 1 started and settled');
    assert(start2 !== -1 && settled2 !== -1, 'Attempt 2 started and settled');
    assert(settled1 < start2, 'Attempt 1 completely settled BEFORE Attempt 2 started (no overlapping retries)');
  }

  // Test 3: Successful fast execution clears timeout resources
  console.log('\nTest 3: Successful completion clears timeout handle cleanly');
  {
    const mockFastProvider: OpportunityProvider = {
      name: 'FastProvider',
      fetch: async () => [],
    };

    const mockIngestor: any = {
      ingest: async () => ({ created: 2, updated: 1, skipped: 0, errors: 0 }),
    };

    const mockPrisma: any = {};
    const config: IngestionConfig = {
      providers: ['fast'],
      intervalMinutes: 60,
      timezone: 'UTC',
      maxRetries: 0,
      retryDelayMs: 10,
      timeoutMs: 1000,
      jobicyCount: 1,
    };

    const scheduler = new IngestionScheduler(mockPrisma, config, () => mockFastProvider, mockIngestor);
    const result = await (scheduler as any).runProviderWithRetries(mockFastProvider);

    assert(result.error === undefined, 'No error on fast completion');
    assert(result.stats.created === 2, 'Returns stats correctly');
    assert(result.attempts === 1, 'Completed on attempt 1');
  }

  // Summary
  console.log(`\nSchedulerCancellation Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
