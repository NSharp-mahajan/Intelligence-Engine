/**
 * M2.10: Controlled, Idempotent Early Career Eligibility Backfill
 *
 * Requirements:
 * - Reuses existing M2.2 earlyCareerClassifier and M2.3.1 normalizer.
 * - Reuses existing M2.4 evidence persistence via OpportunityIngestor.persistEligibility.
 * - Processes opportunities in bounded batches of 50 records inside transactions.
 * - Fully restart-safe and idempotent.
 * - Reports detailed distributions and metrics.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from './lib/prisma';
import { OpportunityNormalizer, OpportunityIngestor } from './lib/opportunityProvider';

const BATCH_SIZE = 50;

async function runBackfill() {
  console.log('\n================================================================');
  console.log('  M2.10: CONTROLLED EARLY CAREER ELIGIBILITY BACKFILL');
  console.log('================================================================\n');

  const normalizer = new OpportunityNormalizer();
  const ingestor = new OpportunityIngestor(prisma);

  // 1. Calculate Pre-Backfill Stats
  const totalOpportunities = await prisma.opportunity.count();
  const alreadyClassified = await prisma.opportunityEligibility.count();
  const requiringBackfill = totalOpportunities - alreadyClassified;

  console.log(`[PRE-FLIGHT] Total Opportunities in Database: ${totalOpportunities}`);
  console.log(`[PRE-FLIGHT] Already with Eligibility:        ${alreadyClassified}`);
  console.log(`[PRE-FLIGHT] Requiring Eligibility Backfill:  ${requiringBackfill}`);
  console.log(`[PRE-FLIGHT] Batch Size:                      ${BATCH_SIZE}\n`);

  if (requiringBackfill === 0) {
    console.log('No opportunities require backfill. Catalog is fully classified.');
    return;
  }

  let processedCount = 0;
  let batchNumber = 0;
  let errorCount = 0;

  const categoryCounts: Record<string, number> = {};
  const verificationCounts: Record<string, number> = {};
  let conflictCount = 0;

  const startTime = Date.now();

  while (true) {
    // Fetch next batch of opportunities without eligibility
    const batch = await prisma.opportunity.findMany({
      where: {
        eligibility: null,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: 'asc',
      },
    });

    if (batch.length === 0) {
      break;
    }

    batchNumber++;
    const now = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        for (const opp of batch) {
          const classification = normalizer.classifyEarlyCareerWithCache({
            source: opp.source,
            title: opp.title,
            description: opp.description,
            company: opp.organization,
            location: opp.location || undefined,
            employmentType: opp.employmentType,
            experienceLevel: opp.experienceLevel,
            sourceUrl: opp.sourceUrl || undefined,
          });

          const sourceContentHash = normalizer.computeClassificationCacheKey({
            title: opp.title,
            description: opp.description,
            employmentType: opp.employmentType,
            experienceLevel: opp.experienceLevel,
          });

          await ingestor.persistEligibility(
            tx,
            opp.id,
            classification,
            sourceContentHash,
            now
          );

          // Track in-memory stats
          categoryCounts[classification.category] = (categoryCounts[classification.category] || 0) + 1;
          verificationCounts[classification.overallVerificationLevel] =
            (verificationCounts[classification.overallVerificationLevel] || 0) + 1;
          if (classification.hasConflict) {
            conflictCount++;
          }
        }
      });

      processedCount += batch.length;
      const pct = ((processedCount / requiringBackfill) * 100).toFixed(1);
      console.log(`  [BATCH ${batchNumber}] Processed ${batch.length} records (${processedCount}/${requiringBackfill} - ${pct}%)`);
    } catch (err: any) {
      console.error(`  [BATCH ${batchNumber} ERROR] Transaction failed:`, err?.message || err);
      errorCount++;
      // Stop immediately on unexpected batch error
      throw err;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log('  BACKFILL EXECUTION COMPLETED');
  console.log('================================================================');
  console.log(`  Total Processed:         ${processedCount}`);
  console.log(`  Batches Executed:        ${batchNumber}`);
  console.log(`  Errors:                  ${errorCount}`);
  console.log(`  Duration:                ${durationSec}s`);
  console.log(`  Speed:                   ${(processedCount / Math.max(1, Number(durationSec))).toFixed(1)} records/sec\n`);

  // Query actual live database counts to verify persistence
  const postBackfillEligCount = await prisma.opportunityEligibility.count();
  const evidenceCount = await prisma.opportunityEligibilityEvidence.count();

  console.log('--- Database Verification ---');
  console.log(`  Persisted OpportunityEligibility Rows: ${postBackfillEligCount}`);
  console.log(`  Persisted Evidence Records:            ${evidenceCount}`);
  console.log(`  Classification Coverage:               ${((postBackfillEligCount / totalOpportunities) * 100).toFixed(1)}%\n`);

  console.log('--- Classification Distribution ---');
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    - ${cat.padEnd(20)}: ${count}`);
  }

  console.log('\n--- Verification Level Distribution ---');
  for (const [ver, count] of Object.entries(verificationCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    - ${ver.padEnd(30)}: ${count}`);
  }

  console.log(`\n  Conflicting Evidence Count: ${conflictCount}`);
}

runBackfill()
  .catch((err) => {
    console.error('Fatal backfill error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
