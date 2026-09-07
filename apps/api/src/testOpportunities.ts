import 'dotenv/config';
import { prisma } from './lib/prisma';
import { OpportunityIngestor, OpportunityNormalizer, OpportunityDeduplicator, type ExternalJob, type OpportunityProvider } from './lib/opportunityProvider';

class MockProvider implements OpportunityProvider {
  name = 'MockProvider';
  
  async fetch(): Promise<ExternalJob[]> {
    return [
      {
        id: 'job-1',
        title: 'Senior React Developer',
        company: 'Tech Corp',
        description: 'Build amazing React applications',
        location: 'San Francisco, CA',
        workMode: 'Remote',
        employmentType: 'Full-time',
        experienceLevel: 'Senior',
        applicationUrl: 'https://example.com/apply/1',
        sourceUrl: 'https://example.com/jobs/1',
        source: 'mock',
        postedDate: '2024-01-15',
        deadline: '2024-02-15',
        requiredSkills: ['React', 'TypeScript', 'Node.js'],
        preferredSkills: ['GraphQL', 'AWS'],
      },
      {
        id: 'job-2',
        title: 'Junior Python Developer',
        company: 'Data Inc',
        description: 'Work with Python and data',
        location: 'New York, NY',
        workMode: 'On-site',
        employmentType: 'Full-time',
        experienceLevel: 'Entry',
        applicationUrl: 'https://example.com/apply/2',
        sourceUrl: 'https://example.com/jobs/2',
        source: 'mock',
        postedDate: '2024-01-16',
        requiredSkills: ['Python', 'SQL'],
        preferredSkills: ['Pandas', 'NumPy'],
      },
    ];
  }
}

async function main() {
  console.log('Testing Opportunity Intelligence System...\n');

  try {
    // Test 1: Skill Normalization
    console.log('Test 1: Skill Normalization');
    const normalizer = new OpportunityNormalizer();
    
    const testSkills = ['React.js', 'ReactJS', 'react', 'Vue.js', 'Node.js', 'nodejs'];
    const normalized = testSkills.map(s => normalizer.normalizeSkill(s));
    console.log('  Input:', testSkills);
    console.log('  Output:', normalized);
    console.log('  Result:', normalized.every(s => s === s.toLowerCase()) ? 'PASS' : 'FAIL');
    console.log();

    // Test 2: Work Mode Normalization
    console.log('Test 2: Work Mode Normalization');
    const workModes = ['remote', 'REMOTE', 'Hybrid Work', 'On-site', 'Office'];
    const normalizedWorkModes = workModes.map(wm => normalizer.normalizeWorkMode(wm));
    console.log('  Input:', workModes);
    console.log('  Output:', normalizedWorkModes);
    console.log('  Result:', normalizedWorkModes.every(wm => ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'].includes(wm)) ? 'PASS' : 'FAIL');
    console.log();

    // Test 3: Employment Type Normalization
    console.log('Test 3: Employment Type Normalization');
    const empTypes = ['Full-time', 'PART TIME', 'Contractor', 'Internship'];
    const normalizedEmpTypes = empTypes.map(et => normalizer.normalizeEmploymentType(et));
    console.log('  Input:', empTypes);
    console.log('  Output:', normalizedEmpTypes);
    console.log('  Result:', normalizedEmpTypes.every(et => ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'UNKNOWN'].includes(et)) ? 'PASS' : 'FAIL');
    console.log();

    // Test 4: Experience Level Normalization
    console.log('Test 4: Experience Level Normalization');
    const expLevels = ['Entry Level', 'Junior Developer', 'Mid-level', 'Senior Engineer', 'Lead'];
    const normalizedExpLevels = expLevels.map(el => normalizer.normalizeExperienceLevel(el));
    console.log('  Input:', expLevels);
    console.log('  Output:', normalizedExpLevels);
    console.log('  Result:', normalizedExpLevels.every(el => ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'UNKNOWN'].includes(el)) ? 'PASS' : 'FAIL');
    console.log();

    // Test 5: Opportunity Type Normalization
    console.log('Test 5: Opportunity Type Normalization');
    const oppTypes = ['Internship', 'Full-time Job', 'Hackathon', 'Workshop'];
    const normalizedOppTypes = oppTypes.map(ot => normalizer.normalizeOpportunityType(ot));
    console.log('  Input:', oppTypes);
    console.log('  Output:', normalizedOppTypes);
    console.log('  Result:', normalizedOppTypes.every(ot => ['INTERNSHIP', 'JOB', 'HACKATHON', 'WORKSHOP', 'OPEN_SOURCE', 'MICRO_INTERNSHIP'].includes(ot)) ? 'PASS' : 'FAIL');
    console.log();

    // Test 6: Full Opportunity Normalization
    console.log('Test 6: Full Opportunity Normalization');
    const externalJob: ExternalJob = {
      id: 'test-123',
      title: '  Senior React Developer  ',
      company: 'Tech Corp',
      description: 'Build apps',
      location: 'San Francisco',
      workMode: 'Remote',
      employmentType: 'Full-time',
      experienceLevel: 'Senior',
      applicationUrl: 'https://example.com/apply',
      sourceUrl: 'https://example.com/job',
      source: 'test',
      postedDate: '2024-01-15',
      deadline: '2024-02-15',
      requiredSkills: ['React.js', 'NodeJS', 'TypeScript'],
      preferredSkills: ['AWS', 'Docker'],
    };
    
    const normalized = normalizer.normalize(externalJob);
    console.log('  Title trimmed:', normalized.title === externalJob.title.trim() ? 'PASS' : 'FAIL');
    console.log('  Skills normalized:', normalized.requiredSkills.every(s => s === s.toLowerCase()) ? 'PASS' : 'FAIL');
    console.log('  Work mode:', normalized.workMode === 'REMOTE' ? 'PASS' : 'FAIL');
    console.log('  Employment type:', normalized.employmentType === 'FULL_TIME' ? 'PASS' : 'FAIL');
    console.log('  Experience level:', normalized.experienceLevel === 'SENIOR' ? 'PASS' : 'FAIL');
    console.log();

    // Test 7: Deduplication Key Generation
    console.log('Test 7: Deduplication Key Generation');
    const deduplicator = new OpportunityDeduplicator();
    const key = deduplicator.generateDeduplicationKey(normalized);
    console.log('  Generated key:', key);
    console.log('  Result:', key.includes('test') && key.includes('test-123') ? 'PASS' : 'FAIL');
    console.log();

    // Test 8: API - List Opportunities (Empty)
    console.log('Test 8: API - List Opportunities (Empty)');
    const listRes = await fetch('http://localhost:3001/api/opportunities');
    const listData = await listRes.json();
    console.log('  Status:', listRes.status);
    console.log('  Has opportunities array:', Array.isArray(listData.opportunities) ? 'PASS' : 'FAIL');
    console.log('  Has pagination:', listData.pagination ? 'PASS' : 'FAIL');
    console.log();

    // Test 9: API - Get Non-existent Opportunity
    console.log('Test 9: API - Get Non-existent Opportunity');
    const getRes = await fetch('http://localhost:3001/api/opportunities/non-existent-id');
    console.log('  Status:', getRes.status === 404 ? 'PASS (404)' : 'FAIL');
    console.log();

    // Test 10: API - Filter by Type
    console.log('Test 10: API - Filter by Type');
    const filterRes = await fetch('http://localhost:3001/api/opportunities?type=JOB');
    console.log('  Status:', filterRes.status === 200 ? 'PASS' : 'FAIL');
    console.log();

    // Test 11: API - Invalid Filter
    console.log('Test 11: API - Invalid Filter');
    const invalidRes = await fetch('http://localhost:3001/api/opportunities?type=INVALID');
    console.log('  Status:', invalidRes.status === 400 ? 'PASS (400)' : 'FAIL');
    console.log();

    // Test 12: API - Pagination
    console.log('Test 12: API - Pagination');
    const pageRes = await fetch('http://localhost:3001/api/opportunities?page=1&limit=10');
    const pageData = await pageRes.json();
    console.log('  Status:', pageRes.status === 200 ? 'PASS' : 'FAIL');
    console.log('  Pagination present:', pageData.pagination ? 'PASS' : 'FAIL');
    console.log();

    // Test 13: Ingestion (with cleanup)
    console.log('Test 13: Opportunity Ingestion');
    await prisma.opportunity.deleteMany({ where: { source: 'test' } });
    
    const ingestor = new OpportunityIngestor(prisma);
    const provider = new MockProvider();
    const result = await ingestor.ingest(provider);
    
    console.log('  Created:', result.created);
    console.log('  Skipped:', result.skipped);
    console.log('  Errors:', result.errors);
    console.log('  Result:', result.created > 0 && result.errors === 0 ? 'PASS' : 'FAIL');
    console.log();

    // Test 14: Deduplication on Re-ingestion
    console.log('Test 14: Deduplication on Re-ingestion');
    const result2 = await ingestor.ingest(provider);
    console.log('  Created:', result2.created);
    console.log('  Skipped:', result2.skipped);
    console.log('  Result:', result2.created === 0 && result2.skipped > 0 ? 'PASS (duplicates skipped)' : 'FAIL');
    console.log();

    // Test 15: API - List Opportunities (After Ingestion)
    console.log('Test 15: API - List Opportunities (After Ingestion)');
    const listRes2 = await fetch('http://localhost:3001/api/opportunities');
    const listData2 = await listRes2.json();
    console.log('  Status:', listRes2.status === 200 ? 'PASS' : 'FAIL');
    console.log('  Opportunities count:', listData2.opportunities.length);
    console.log('  Result:', listData2.opportunities.length > 0 ? 'PASS' : 'FAIL');
    console.log();

    // Test 16: API - Get Specific Opportunity
    console.log('Test 16: API - Get Specific Opportunity');
    if (listData2.opportunities.length > 0) {
      const oppId = listData2.opportunities[0].id;
      const getRes2 = await fetch(`http://localhost:3001/api/opportunities/${oppId}`);
      const getOpp = await getRes2.json();
      console.log('  Status:', getRes2.status === 200 ? 'PASS' : 'FAIL');
      console.log('  Has skills:', getOpp.opportunity?.opportunitySkills ? 'PASS' : 'FAIL');
    } else {
      console.log('  SKIP: No opportunities to test');
    }
    console.log();

    // Test 17: API - Filter by Skill
    console.log('Test 17: API - Filter by Skill');
    const skillRes = await fetch('http://localhost:3001/api/opportunities?skill=react');
    console.log('  Status:', skillRes.status === 200 ? 'PASS' : 'FAIL');
    console.log();

    // Test 18: API - Filter by Location
    console.log('Test 18: API - Filter by Location');
    const locRes = await fetch('http://localhost:3001/api/opportunities?location=san');
    console.log('  Status:', locRes.status === 200 ? 'PASS' : 'FAIL');
    console.log();

    // Cleanup
    console.log('Cleaning up test data...');
    await prisma.opportunity.deleteMany({ where: { source: 'test' } });
    await prisma.skill.deleteMany({ where: { name: { in: ['react', 'typescript', 'node', 'python', 'sql', 'graphql', 'aws', 'docker', 'pandas', 'numpy'] } } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }

  console.log('\n=== All Tests Complete ===');
  process.exit(0);
}

main().catch(console.error);
