import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  OpportunityProvider,
  OpportunityIngestor,
  JobicyProvider,
  GreenhouseProvider,
  DEFAULT_GREENHOUSE_BOARDS,
  LeverProvider,
  DEFAULT_LEVER_BOARDS,
} from '../lib/opportunityProvider';

// ─── Constants & Advisory Lock Key ──────────────────────────────────────────

/**
 * Unique 64-bit integer key for PostgreSQL advisory lock.
 * Ensures distributed mutual exclusion across worker processes and instances.
 */
export const INGESTION_ADVISORY_LOCK_KEY = '7483920192837465';

// ─── Interfaces & Types ─────────────────────────────────────────────────────

export type IngestionRunStatus = 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILED' | 'SKIPPED';
export type ProviderRunStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface IngestionConfig {
  /** Comma-separated list or array of enabled providers (e.g. 'jobicy', 'greenhouse', 'lever') */
  providers: string[];
  /** Recurring interval in minutes (default: 360 = 6 hours) */
  intervalMinutes: number;
  /** Explicit timezone for logging and scheduling (default: 'UTC') */
  timezone: string;
  /** Maximum retry attempts for transient provider failures (default: 2) */
  maxRetries: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelayMs: number;
  /** Per-provider network timeout in milliseconds (default: 30000) */
  timeoutMs: number;
  /** Number of jobs requested for Jobicy (default: 50) */
  jobicyCount: number;
  /** Optional max jobs per board for Greenhouse / Lever pilot runs */
  maxJobsPerBoard?: number;
}

export interface ProviderRunResult {
  provider: string;
  status: ProviderRunStatus;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  durationMs: number;
  attempts: number;
  error?: string;
}

export interface IngestionRunSummary {
  runId: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  status: IngestionRunStatus;
  providers: Record<string, ProviderRunResult>;
  totals: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  reason?: string;
}

export type ProviderFactory = (name: string, config: IngestionConfig) => OpportunityProvider;

// ─── Default Configuration Loader ───────────────────────────────────────────

export function loadIngestionConfigFromEnv(): IngestionConfig {
  const envProviders = process.env.INGESTION_PROVIDERS
    ? process.env.INGESTION_PROVIDERS.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
    : ['jobicy', 'greenhouse', 'lever'];

  const intervalMinutes = process.env.INGESTION_INTERVAL_MINUTES
    ? parseInt(process.env.INGESTION_INTERVAL_MINUTES, 10)
    : 360;

  const maxRetries = process.env.INGESTION_MAX_RETRIES
    ? parseInt(process.env.INGESTION_MAX_RETRIES, 10)
    : 2;

  const retryDelayMs = process.env.INGESTION_RETRY_DELAY_MS
    ? parseInt(process.env.INGESTION_RETRY_DELAY_MS, 10)
    : 1000;

  const timeoutMs = process.env.INGESTION_TIMEOUT_MS
    ? parseInt(process.env.INGESTION_TIMEOUT_MS, 10)
    : 30000;

  const jobicyCount = process.env.JOBICY_FETCH_COUNT
    ? parseInt(process.env.JOBICY_FETCH_COUNT, 10)
    : 50;

  const maxJobsPerBoard = process.env.INGESTION_MAX_JOBS_PER_BOARD
    ? parseInt(process.env.INGESTION_MAX_JOBS_PER_BOARD, 10)
    : undefined;

  return {
    providers: envProviders,
    intervalMinutes: isNaN(intervalMinutes) || intervalMinutes < 1 ? 360 : intervalMinutes,
    timezone: process.env.INGESTION_TIMEZONE || 'UTC',
    maxRetries: isNaN(maxRetries) || maxRetries < 0 ? 2 : maxRetries,
    retryDelayMs: isNaN(retryDelayMs) || retryDelayMs < 100 ? 1000 : retryDelayMs,
    timeoutMs: isNaN(timeoutMs) || timeoutMs < 1000 ? 30000 : timeoutMs,
    jobicyCount: isNaN(jobicyCount) || jobicyCount < 1 ? 50 : jobicyCount,
    maxJobsPerBoard: maxJobsPerBoard && !isNaN(maxJobsPerBoard) ? maxJobsPerBoard : undefined,
  };
}

// ─── Default Provider Factory ───────────────────────────────────────────────

export const defaultProviderFactory: ProviderFactory = (name: string, config: IngestionConfig): OpportunityProvider => {
  switch (name.toLowerCase()) {
    case 'jobicy':
      return new JobicyProvider(config.jobicyCount);
    case 'greenhouse':
      return new GreenhouseProvider({
        boards: DEFAULT_GREENHOUSE_BOARDS,
        maxJobsPerBoard: config.maxJobsPerBoard,
        timeoutMs: config.timeoutMs,
      });
    case 'lever':
      return new LeverProvider({
        boards: DEFAULT_LEVER_BOARDS,
        maxJobsPerBoard: config.maxJobsPerBoard,
        timeoutMs: config.timeoutMs,
      });
    default:
      throw new Error(`Unknown provider name: "${name}". Supported providers are: jobicy, greenhouse, lever.`);
  }
};

// ─── IngestionScheduler Service ─────────────────────────────────────────────

export class IngestionScheduler {
  private isLocalRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private nextRunTime: Date | null = null;
  private lastRunSummary: IngestionRunSummary | null = null;
  private history: IngestionRunSummary[] = [];
  private readonly maxHistorySize = 50;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: IngestionConfig = loadIngestionConfigFromEnv(),
    private readonly providerFactory: ProviderFactory = defaultProviderFactory,
    private readonly ingestor: OpportunityIngestor = new OpportunityIngestor(prisma),
  ) {}

  /**
   * Attempts to acquire the PostgreSQL advisory lock to ensure single-instance execution.
   */
  private async acquireDbLock(): Promise<boolean> {
    try {
      const res = await this.prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
        `SELECT pg_try_advisory_lock(${INGESTION_ADVISORY_LOCK_KEY}::bigint) as locked`
      );
      return res?.[0]?.locked === true;
    } catch (err) {
      console.warn('[IngestionScheduler] Could not acquire PostgreSQL advisory lock, falling back to local mutex:', err instanceof Error ? err.message : err);
      // Fall back to local in-process mutex if database does not support advisory lock
      return true;
    }
  }

  /**
   * Releases the PostgreSQL advisory lock.
   */
  private async releaseDbLock(): Promise<void> {
    try {
      await this.prisma.$queryRawUnsafe(
        `SELECT pg_advisory_unlock(${INGESTION_ADVISORY_LOCK_KEY}::bigint)`
      );
    } catch (err) {
      console.warn('[IngestionScheduler] Error releasing PostgreSQL advisory lock:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Executes a single provider with bounded retries and timeout protection.
   */
  private async runProviderWithRetries(
    provider: OpportunityProvider,
  ): Promise<{ stats: { created: number; updated: number; skipped: number; errors: number }; attempts: number; error?: Error }> {
    let lastError: Error | undefined;
    let attempts = 0;

    while (attempts <= this.config.maxRetries) {
      attempts++;
      try {
        // Enforce per-provider execution timeout
        const stats = await Promise.race([
          this.ingestor.ingest(provider),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: Ingestion for ${provider.name} exceeded ${this.config.timeoutMs}ms`)), this.config.timeoutMs)
          ),
        ]);
        return { stats, attempts };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempts <= this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempts - 1);
          console.warn(`[IngestionScheduler] Provider "${provider.name}" attempt ${attempts} failed: ${lastError.message}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return {
      stats: { created: 0, updated: 0, skipped: 0, errors: 1 },
      attempts,
      error: lastError,
    };
  }

  /**
   * Executes a one-off ingestion run across configured providers.
   * Concurrency is protected via PostgreSQL advisory lock and in-process mutex.
   */
  async runOnce(options: { providers?: string[]; bypassLock?: boolean } = {}): Promise<IngestionRunSummary> {
    const runId = randomUUID();
    const startedAt = new Date();

    // 1. Check local mutex
    if (this.isLocalRunning && !options.bypassLock) {
      console.warn(`[IngestionScheduler] Run ${runId} skipped: Ingestion is already running in this process.`);
      const summary: IngestionRunSummary = {
        runId,
        startedAt,
        endedAt: new Date(),
        durationMs: 0,
        status: 'SKIPPED',
        providers: {},
        totals: { created: 0, updated: 0, skipped: 0, errors: 0 },
        reason: 'CONCURRENT_LOCAL_RUN_IN_PROGRESS',
      };
      this.recordSummary(summary);
      return summary;
    }

    this.isLocalRunning = true;
    let acquiredDbLock = false;

    try {
      // 2. Check distributed DB lock
      if (!options.bypassLock) {
        acquiredDbLock = await this.acquireDbLock();
        if (!acquiredDbLock) {
          console.warn(`[IngestionScheduler] Run ${runId} skipped: Another worker holds the PostgreSQL ingestion lock.`);
          const summary: IngestionRunSummary = {
            runId,
            startedAt,
            endedAt: new Date(),
            durationMs: 0,
            status: 'SKIPPED',
            providers: {},
            totals: { created: 0, updated: 0, skipped: 0, errors: 0 },
            reason: 'CONCURRENT_DISTRIBUTED_RUN_IN_PROGRESS',
          };
          this.recordSummary(summary);
          return summary;
        }
      }

      console.log(`\n======================================================================`);
      console.log(`[IngestionScheduler] Starting Ingestion Run: ${runId}`);
      console.log(`Time: ${startedAt.toISOString()} | Timezone: ${this.config.timezone}`);
      console.log(`======================================================================`);

      const targetProviders = (options.providers || this.config.providers).map((p) => p.trim().toLowerCase());
      const providerResults: Record<string, ProviderRunResult> = {};
      const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };

      let successCount = 0;
      let failureCount = 0;

      for (const providerName of targetProviders) {
        const providerStart = Date.now();
        let providerInstance: OpportunityProvider;

        try {
          providerInstance = this.providerFactory(providerName, this.config);
        } catch (factoryErr) {
          const errMsg = factoryErr instanceof Error ? factoryErr.message : String(factoryErr);
          console.error(`[IngestionScheduler] Failed to initialize provider "${providerName}":`, errMsg);
          providerResults[providerName] = {
            provider: providerName,
            status: 'FAILED',
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            durationMs: Date.now() - providerStart,
            attempts: 1,
            error: errMsg,
          };
          totals.errors++;
          failureCount++;
          continue;
        }

        console.log(`\n--> Running Provider: ${providerInstance.name} (timeout: ${this.config.timeoutMs}ms, maxRetries: ${this.config.maxRetries})...`);
        const { stats, attempts, error } = await this.runProviderWithRetries(providerInstance);
        const durationMs = Date.now() - providerStart;

        totals.created += stats.created;
        totals.updated += stats.updated;
        totals.skipped += stats.skipped;
        totals.errors += stats.errors;

        if (error) {
          failureCount++;
          providerResults[providerName] = {
            provider: providerInstance.name,
            status: 'FAILED',
            created: stats.created,
            updated: stats.updated,
            skipped: stats.skipped,
            errors: stats.errors,
            durationMs,
            attempts,
            error: error.message,
          };
          console.error(`[IngestionScheduler] Provider "${providerInstance.name}" FAILED after ${attempts} attempts: ${error.message}`);
        } else {
          successCount++;
          providerResults[providerInstance.name.toLowerCase()] = {
            provider: providerInstance.name,
            status: 'SUCCESS',
            created: stats.created,
            updated: stats.updated,
            skipped: stats.skipped,
            errors: stats.errors,
            durationMs,
            attempts,
          };
          console.log(`[IngestionScheduler] Provider "${providerInstance.name}" finished in ${durationMs}ms: created=${stats.created}, updated=${stats.updated}, skipped=${stats.skipped}`);
        }
      }

      const endedAt = new Date();
      const totalDuration = endedAt.getTime() - startedAt.getTime();

      let overallStatus: IngestionRunStatus;
      if (failureCount === 0 && successCount > 0) {
        overallStatus = 'SUCCESS';
      } else if (successCount > 0 && failureCount > 0) {
        overallStatus = 'PARTIAL_FAILURE';
      } else {
        overallStatus = 'FAILED';
      }

      const summary: IngestionRunSummary = {
        runId,
        startedAt,
        endedAt,
        durationMs: totalDuration,
        status: overallStatus,
        providers: providerResults,
        totals,
      };

      console.log(`\n======================================================================`);
      console.log(`[IngestionScheduler] Run ${runId} Complete — Status: ${overallStatus}`);
      console.log(`Duration: ${totalDuration}ms | Created: ${totals.created} | Updated: ${totals.updated} | Errors: ${totals.errors}`);
      console.log(`======================================================================\n`);

      this.recordSummary(summary);
      return summary;
    } finally {
      if (acquiredDbLock) {
        await this.releaseDbLock();
      }
      this.isLocalRunning = false;
    }
  }

  /**
   * Records a run summary into in-memory history.
   */
  private recordSummary(summary: IngestionRunSummary): void {
    this.lastRunSummary = summary;
    this.history.unshift(summary);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  /**
   * Starts recurring scheduling using the configured interval.
   */
  start(options: { runImmediately?: boolean } = {}): void {
    if (this.timer) {
      console.warn('[IngestionScheduler] Scheduler is already active.');
      return;
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    console.log(`[IngestionScheduler] Starting daemon scheduler.`);
    console.log(`Schedule: Every ${this.config.intervalMinutes} minutes (${intervalMs / 1000}s)`);
    console.log(`Configured Providers: ${this.config.providers.join(', ')}`);
    console.log(`Timezone: ${this.config.timezone}`);

    if (options.runImmediately) {
      this.runOnce().catch((err) => {
        console.error('[IngestionScheduler] Error during initial scheduled run:', err);
      });
    }

    this.nextRunTime = new Date(Date.now() + intervalMs);

    this.timer = setInterval(() => {
      this.nextRunTime = new Date(Date.now() + intervalMs);
      this.runOnce().catch((err) => {
        console.error('[IngestionScheduler] Uncaught error during scheduled run:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops the recurring schedule cleanly.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.nextRunTime = null;
      console.log('[IngestionScheduler] Scheduler stopped cleanly.');
    }
  }

  /**
   * Returns current scheduler status.
   */
  getStatus() {
    return {
      active: this.timer !== null,
      isRunning: this.isLocalRunning,
      intervalMinutes: this.config.intervalMinutes,
      timezone: this.config.timezone,
      configuredProviders: this.config.providers,
      nextRunTime: this.nextRunTime,
      lastRunSummary: this.lastRunSummary,
    };
  }

  /**
   * Returns recorded run history.
   */
  getHistory(): IngestionRunSummary[] {
    return [...this.history];
  }

  /**
   * Returns current configuration.
   */
  getConfig(): IngestionConfig {
    return { ...this.config };
  }
}
