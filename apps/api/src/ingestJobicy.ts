import 'dotenv/config';
import { prisma } from './lib/prisma';
import { OpportunityIngestor } from './lib/opportunityProvider';
import { JobicyProvider } from './lib/jobicyProvider';

async function main() {
  console.log('Starting Jobicy Ingestion...');
  
  try {
    const provider = new JobicyProvider(50); // Fetch 50 jobs
    const ingestor = new OpportunityIngestor(prisma);
    
    console.log(`Fetching from ${provider.name}...`);
    const result = await ingestor.ingest(provider);
    
    console.log('Ingestion Complete:');
    console.log(`  Created: ${result.created}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Errors:  ${result.errors}`);
  } catch (error) {
    console.error('Ingestion failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
