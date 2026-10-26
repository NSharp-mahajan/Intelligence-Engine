import 'dotenv/config';
import { prisma } from './lib/prisma';
import { OpportunityIngestor } from './lib/opportunityProvider';
import { LeverProvider, DEFAULT_LEVER_BOARDS } from './lib/leverProvider';

async function main() {
  console.log('=== Starting Lever Public Boards Ingestion ===\n');

  try {
    // Optionally parse CLI arguments for bounded pilot: e.g. --limit 25
    const args = process.argv.slice(2);
    let maxJobsPerBoard: number | undefined = undefined;
    const limitIndex = args.indexOf('--limit');
    if (limitIndex !== -1 && args[limitIndex + 1]) {
      const parsed = parseInt(args[limitIndex + 1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxJobsPerBoard = parsed;
        console.log(`Applying per-board limit: ${maxJobsPerBoard} jobs per board`);
      }
    }

    const provider = new LeverProvider({
      boards: DEFAULT_LEVER_BOARDS,
      maxJobsPerBoard,
      timeoutMs: 20000,
    });

    const ingestor = new OpportunityIngestor(prisma);

    console.log(`Configured boards: ${provider.getBoardConfigs().map(b => `${b.companyName} (${b.site})`).join(', ')}`);
    console.log(`Fetching opportunities from ${provider.name}...`);

    const result = await ingestor.ingest(provider);

    console.log('\n=== Lever Ingestion Complete ===');
    console.log(`  Created: ${result.created}`);
    console.log(`  Skipped: ${result.skipped} (duplicates preserved)`);
    console.log(`  Errors:  ${result.errors}`);
  } catch (error) {
    console.error('Lever ingestion failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
