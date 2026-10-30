import 'dotenv/config';
import { prisma } from './lib/prisma';
import {
  IngestionScheduler,
  loadIngestionConfigFromEnv,
  defaultProviderFactory,
} from './services/ingestionScheduler';

// ─── Help / Usage ───────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Intelligence-Engine — Opportunity Ingestion Worker & Scheduler

USAGE:
  npx tsx src/worker.ts [options]

OPTIONS:
  --once, -1              Run a single ingestion cycle across configured providers and exit.
  --providers=<list>      Comma-separated list of providers to run (e.g. --providers=jobicy,lever).
                          Overrides INGESTION_PROVIDERS environment variable.
  --interval=<minutes>    Override scheduled interval in minutes for daemon mode.
  --limit=<count>         Maximum jobs retained per board for Greenhouse / Lever (default: 25).
  --scan-limit=<count>    Maximum raw records scanned per board (default: 500).
  --no-immediate          When starting in daemon mode, wait for the first interval instead of running immediately.
  --help, -h              Display this help message.

ENVIRONMENT VARIABLES:
  DATABASE_URL            PostgreSQL connection string.
  INGESTION_PROVIDERS     Comma-separated enabled providers (default: jobicy,greenhouse,lever).
  INGESTION_INTERVAL_MINUTES Recurring schedule interval (default: 360 = 6 hours).
  INGESTION_TIMEZONE      Timezone for logging and scheduling (default: UTC).
  INGESTION_MAX_RETRIES   Maximum retries on transient network errors (default: 2).
  INGESTION_RETRY_DELAY_MS Initial retry backoff delay (default: 1000).
  INGESTION_TIMEOUT_MS    Per-provider network timeout (default: 30000).
  JOBICY_FETCH_COUNT      Number of listings requested from Jobicy (default: 50).
  INGESTION_MAX_JOBS_PER_BOARD Cap jobs per board for Greenhouse / Lever pilot runs.

EXAMPLES:
  # Run once manually for development:
  npm run ingest:once

  # Run once for specific providers:
  npx tsx src/worker.ts --once --providers=greenhouse,lever

  # Start the background daemon worker:
  npm run ingest:worker
`);
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const isOnce = args.includes('--once') || args.includes('-1');
  const noImmediate = args.includes('--no-immediate');

  // Parse optional --providers override
  let providerOverride: string[] | undefined;
  const providersArg = args.find((a) => a.startsWith('--providers='));
  if (providersArg) {
    providerOverride = providersArg
      .split('=')[1]
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
  }

  // Parse optional --interval override
  let intervalOverride: number | undefined;
  const intervalArg = args.find((a) => a.startsWith('--interval='));
  if (intervalArg) {
    const parsed = parseInt(intervalArg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) intervalOverride = parsed;
  }

  // Parse optional --limit or --max-jobs override
  let limitOverride: number | undefined;
  const limitArg = args.find((a) => a.startsWith('--limit=') || a.startsWith('--max-jobs='));
  if (limitArg) {
    const parsed = parseInt(limitArg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) limitOverride = parsed;
  }

  // Parse optional --scan-limit override
  let scanLimitOverride: number | undefined;
  const scanLimitArg = args.find((a) => a.startsWith('--scan-limit=') || a.startsWith('--max-scan='));
  if (scanLimitArg) {
    const parsed = parseInt(scanLimitArg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) scanLimitOverride = parsed;
  }

  const baseConfig = loadIngestionConfigFromEnv();
  const config = {
    ...baseConfig,
    ...(providerOverride ? { providers: providerOverride } : {}),
    ...(intervalOverride ? { intervalMinutes: intervalOverride } : {}),
    ...(limitOverride !== undefined ? { maxJobsPerBoard: limitOverride } : {}),
    ...(scanLimitOverride !== undefined ? { maxScanLimit: scanLimitOverride } : {}),
  };

  const scheduler = new IngestionScheduler(prisma, config, defaultProviderFactory);

  if (isOnce) {
    console.log('[Worker] Executing single manual ingestion cycle...');
    try {
      const summary = await scheduler.runOnce({ providers: config.providers });
      if (summary.status === 'FAILED') {
        console.error('[Worker] Ingestion run completed with FAILED status.');
        process.exitCode = 1;
      } else if (summary.status === 'PARTIAL_FAILURE') {
        console.warn('[Worker] Ingestion run completed with PARTIAL_FAILURE (some providers succeeded, others encountered errors).');
        process.exitCode = 0;
      } else {
        console.log('[Worker] Ingestion run completed successfully.');
        process.exitCode = 0;
      }
    } catch (err) {
      console.error('[Worker] Fatal error during manual run:', err);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  // Daemon / Worker Mode
  console.log('[Worker] Starting Opportunity Ingestion Worker daemon...');
  scheduler.start({ runImmediately: !noImmediate });

  // Handle graceful termination
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down worker gracefully...`);
    scheduler.stop();
    await prisma.$disconnect();
    console.log('[Worker] Worker terminated cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('[Worker] Fatal error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
