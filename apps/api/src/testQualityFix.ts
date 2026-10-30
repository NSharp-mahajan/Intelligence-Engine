import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient, RequirementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { normalizeSkillName, areSkillsEquivalent } from './services/skillNormalizer';
import { MatchingService } from './services/matchingService';
import { interleaveOpportunitiesByEmployer } from './services/employerInterleaving';

async function runQualityFixTestSuite() {
  console.log('===============================================================');
  console.log('   INTELLIGENCE ENGINE — QUALITY FIX REGRESSION TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as any).then(
          () => {
            console.log(`  ✓ ${name}`);
            passedTests++;
          },
          (err: any) => {
            console.error(`  ✗ ${name}`);
            console.error(err);
            process.exit(1);
          }
        );
      } else {
        console.log(`  ✓ ${name}`);
        passedTests++;
      }
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Skill Normalizer & Canonical Aliases
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Skill Normalizer & Canonical Aliases ---');

  test('Normalizes case variations of the same technology', () => {
    assert.equal(normalizeSkillName('JavaScript'), 'javascript');
    assert.equal(normalizeSkillName('javascript'), 'javascript');
    assert.equal(normalizeSkillName('JAVASCRIPT'), 'javascript');
    assert.equal(normalizeSkillName('Machine Learning'), 'machine learning');
    assert.equal(normalizeSkillName('machine learning'), 'machine learning');
    assert.equal(normalizeSkillName('PostgreSQL'), 'postgresql');
    assert.equal(normalizeSkillName('postgresql'), 'postgresql');
  });

  test('Normalizes common aliases to canonical keys', () => {
    assert.equal(normalizeSkillName('js'), 'javascript');
    assert.equal(normalizeSkillName('ts'), 'typescript');
    assert.equal(normalizeSkillName('py'), 'python');
    assert.equal(normalizeSkillName('golang'), 'go');
    assert.equal(normalizeSkillName('k8s'), 'kubernetes');
    assert.equal(normalizeSkillName('postgres'), 'postgresql');
    assert.equal(normalizeSkillName('mongo'), 'mongodb');
    assert.equal(normalizeSkillName('react.js'), 'react');
    assert.equal(normalizeSkillName('reactjs'), 'react');
    assert.equal(normalizeSkillName('node.js'), 'node.js');
    assert.equal(normalizeSkillName('nodejs'), 'node.js');
    assert.equal(normalizeSkillName('ml'), 'machine learning');
    assert.equal(normalizeSkillName('ai'), 'artificial intelligence');
    assert.equal(normalizeSkillName('genai'), 'generative ai');
    assert.equal(normalizeSkillName('gen ai'), 'generative ai');
    assert.equal(normalizeSkillName('llms'), 'llm');
    assert.equal(normalizeSkillName('ci/cd'), 'ci/cd');
    assert.equal(normalizeSkillName('cicd'), 'ci/cd');
  });

  test('Distinguishes non-equivalent technologies strictly', () => {
    assert.notEqual(normalizeSkillName('Java'), normalizeSkillName('JavaScript'));
    assert.notEqual(normalizeSkillName('C'), normalizeSkillName('C++'));
    assert.notEqual(normalizeSkillName('C'), normalizeSkillName('C#'));
    assert.notEqual(normalizeSkillName('React'), normalizeSkillName('React Native'));
    assert.equal(areSkillsEquivalent('Java', 'JavaScript'), false);
    assert.equal(areSkillsEquivalent('C', 'C++'), false);
    assert.equal(areSkillsEquivalent('React', 'React Native'), false);
    assert.equal(areSkillsEquivalent('JavaScript', 'js'), true);
    assert.equal(areSkillsEquivalent('PostgreSQL', 'postgres'), true);
    assert.equal(areSkillsEquivalent('Machine Learning', 'ml'), true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MatchingService Unit Logic
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. MatchingService Unit Logic ---');

  const mockPrisma = {} as PrismaClient;
  const matchingService = new MatchingService(mockPrisma);

  test('Builds evidence map indexing both UUID and normalized canonical names', () => {
    const mockProfile = {
      candidateSkills: [
        { skillId: 'uuid-js-1', skill: { name: 'JavaScript' } },
        { skillId: 'uuid-py-1', skill: { name: 'Python' } },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'AI Agent',
          projectSkills: [
            { skillId: 'uuid-ml-1', skill: { name: 'Machine Learning' } },
            { skillId: 'uuid-genai-1', skill: { name: 'Generative AI' } },
          ],
        },
      ],
    };

    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);
    assert.ok(evidenceMap.has('uuid-js-1'), 'Raw UUID should be indexed');
    assert.ok(evidenceMap.has('norm:javascript'), 'Normalized canonical key should be indexed');
    assert.ok(evidenceMap.has('norm:python'));
    assert.ok(evidenceMap.has('norm:machine learning'));
    assert.ok(evidenceMap.has('norm:generative ai'));
  });

  test('Calculates 100% score for exact canonical skill overlap despite differing UUIDs', () => {
    // Candidate has "JavaScript" (TitleCase)
    const mockProfile = {
      candidateSkills: [
        { skillId: 'candidate-uuid-js', skill: { name: 'JavaScript' } },
      ],
      projects: [],
    };
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);

    // Job requires "javascript" (lowercase) with DIFFERENT UUID
    const mockOpp = {
      opportunitySkills: [
        {
          skillId: 'job-uuid-js',
          requirementType: RequirementType.REQUIRED,
          skill: { name: 'javascript' },
        },
      ],
    };

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, mockOpp);
    const summary = matchingService.getMatchSummary(matchResult);

    assert.equal(matchResult.hasStructuredRequirements, true);
    assert.equal(matchResult.score, 100);
    assert.equal(matchResult.requiredMatched.length, 1);
    assert.equal(matchResult.requiredMissing.length, 0);
    assert.equal(summary.score, 100);
    assert.equal(summary.matchedCount, 1);
    assert.equal(summary.missingCount, 0);
  });

  test('Calculates explainable partial score when only subset of skills overlap', () => {
    // Candidate has Python and Machine Learning
    const mockProfile = {
      candidateSkills: [
        { skillId: 'cand-py', skill: { name: 'Python' } },
        { skillId: 'cand-ml', skill: { name: 'Machine Learning' } },
      ],
      projects: [],
    };
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);

    // Job requires 4 skills: python, machine learning, scala, spark
    const mockOpp = {
      opportunitySkills: [
        { skillId: 'opp-1', requirementType: RequirementType.REQUIRED, skill: { name: 'python' } },
        { skillId: 'opp-2', requirementType: RequirementType.REQUIRED, skill: { name: 'machine learning' } },
        { skillId: 'opp-3', requirementType: RequirementType.REQUIRED, skill: { name: 'scala' } },
        { skillId: 'opp-4', requirementType: RequirementType.REQUIRED, skill: { name: 'spark' } },
      ],
    };

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, mockOpp);
    const summary = matchingService.getMatchSummary(matchResult);

    assert.equal(matchResult.hasStructuredRequirements, true);
    assert.equal(matchResult.score, 50); // 2 out of 4 = 50%
    assert.equal(matchResult.requiredMatched.length, 2);
    assert.equal(matchResult.requiredMissing.length, 2);
    assert.equal(summary.score, 50);
    assert.equal(summary.matchedCount, 2);
    assert.equal(summary.missingCount, 2);
  });

  test('Calculates legitimate 0% score when candidate has skills but none match', () => {
    // Candidate has Python and Django
    const mockProfile = {
      candidateSkills: [
        { skillId: 'cand-py', skill: { name: 'Python' } },
        { skillId: 'cand-dj', skill: { name: 'Django' } },
      ],
      projects: [],
    };
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);

    // Job requires Swift and iOS
    const mockOpp = {
      opportunitySkills: [
        { skillId: 'opp-swift', requirementType: RequirementType.REQUIRED, skill: { name: 'Swift' } },
        { skillId: 'opp-ios', requirementType: RequirementType.REQUIRED, skill: { name: 'iOS' } },
      ],
    };

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, mockOpp);
    const summary = matchingService.getMatchSummary(matchResult);

    assert.equal(matchResult.hasStructuredRequirements, true);
    assert.equal(matchResult.score, 0); // Legitimate zero!
    assert.equal(matchResult.requiredMatched.length, 0);
    assert.equal(matchResult.requiredMissing.length, 2);
    assert.equal(summary.score, 0);
    assert.equal(summary.matchedCount, 0);
    assert.equal(summary.missingCount, 2);
  });

  test('Calculates valid 0% score and records missing requirements when candidate has 0 skills', () => {
    // Candidate has empty profile (no skills recorded)
    const mockProfile = {
      candidateSkills: [],
      projects: [],
    };
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);
    assert.equal(evidenceMap.size, 0);

    // Job has structured requirements
    const mockOpp = {
      opportunitySkills: [
        { skillId: 'opp-1', requirementType: RequirementType.REQUIRED, skill: { name: 'Java' } },
      ],
    };

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, mockOpp);
    const summary = matchingService.getMatchSummary(matchResult);

    assert.equal(matchResult.hasStructuredRequirements, true);
    assert.equal(matchResult.score, 0, 'Score is calculated as 0% for 0 matched out of 1');
    assert.equal(matchResult.requiredMatched.length, 0);
    assert.equal(matchResult.requiredMissing.length, 1);
    assert.equal(summary.score, 0);
    assert.equal(summary.hasStructuredRequirements, true);
  });

  test('Returns score null and hasStructuredRequirements false for unstructured role', () => {
    const mockProfile = {
      candidateSkills: [{ skillId: 'cand-1', skill: { name: 'Python' } }],
      projects: [],
    };
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(mockProfile);

    // Job has NO structured skills
    const mockOpp = {
      opportunitySkills: [],
    };

    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, mockOpp);
    const summary = matchingService.getMatchSummary(matchResult);

    assert.equal(matchResult.hasStructuredRequirements, false);
    assert.equal(matchResult.score, null);
    assert.equal(summary.score, null);
    assert.equal(summary.hasStructuredRequirements, false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Employer Interleaving & Diversity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Employer Interleaving & Diversity ---');

  test('Interleaves heavily concentrated employer across page window without consecutive clusters', () => {
    // Simulating dev DB Page 1: 14 Databricks, 5 Cloudflare, 1 Spotify
    const items: Array<{ id: string; organization: string; title: string }> = [];
    for (let i = 1; i <= 14; i++) {
      items.push({ id: `db-${i}`, organization: 'Databricks', title: `Databricks Role ${i}` });
    }
    for (let i = 1; i <= 5; i++) {
      items.push({ id: `cf-${i}`, organization: 'Cloudflare', title: `Cloudflare Role ${i}` });
    }
    items.push({ id: `sp-1`, organization: 'Spotify', title: 'Spotify Role 1' });

    assert.equal(items.length, 20);

    const interleaved = interleaveOpportunitiesByEmployer(items);

    assert.equal(interleaved.length, 20, 'All 20 items must be preserved');

    // Count occurrences of each employer
    const counts: Record<string, number> = {};
    for (const item of interleaved) {
      counts[item.organization] = (counts[item.organization] || 0) + 1;
    }
    assert.equal(counts['Databricks'], 14);
    assert.equal(counts['Cloudflare'], 5);
    assert.equal(counts['Spotify'], 1);

    // Verify maximum consecutive run of Databricks is strictly bounded
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    for (const item of interleaved) {
      if (item.organization === 'Databricks') {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
      } else {
        currentConsecutive = 0;
      }
    }

    console.log(`    Max consecutive Databricks roles on Page 1: ${maxConsecutive} (was 9 previously)`);
    assert.ok(maxConsecutive <= 3, `Max consecutive run should be <= 3, got ${maxConsecutive}`);

    // Verify minority items are present in both first half and second half of the page
    const firstHalfMinorities = interleaved.slice(0, 10).filter(i => i.organization !== 'Databricks').length;
    const secondHalfMinorities = interleaved.slice(10, 20).filter(i => i.organization !== 'Databricks').length;
    assert.ok(firstHalfMinorities >= 2, 'First half must contain minority employers');
    assert.ok(secondHalfMinorities >= 2, 'Second half must contain minority employers');
  });

  test('Handles balanced employer distribution gracefully with zero repeats', () => {
    const items = [
      { id: '1', organization: 'Google' },
      { id: '2', organization: 'Google' },
      { id: '3', organization: 'Microsoft' },
      { id: '4', organization: 'Microsoft' },
      { id: '5', organization: 'Amazon' },
      { id: '6', organization: 'Amazon' },
    ];

    const interleaved = interleaveOpportunitiesByEmployer(items);
    assert.equal(interleaved.length, 6);

    // Verify no adjacent elements are the same employer
    for (let i = 0; i < interleaved.length - 1; i++) {
      assert.notEqual(
        interleaved[i].organization,
        interleaved[i + 1].organization,
        `Items at index ${i} and ${i + 1} should have different employers`
      );
    }
  });

  test('Safely handles single-employer pages without modifying contents', () => {
    // Page 2 in dev DB where only Databricks is left
    const items = [
      { id: '1', organization: 'Databricks' },
      { id: '2', organization: 'Databricks' },
      { id: '3', organization: 'Databricks' },
    ];

    const interleaved = interleaveOpportunitiesByEmployer(items);
    assert.equal(interleaved.length, 3);
    assert.equal(interleaved[0].id, '1');
    assert.equal(interleaved[1].id, '2');
    assert.equal(interleaved[2].id, '3');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Integration Verification on Test DB (Port 5433)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Integration Verification on Test DB (Port 5433) ---');

  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/intelligence_engine_test';
  console.log(`Connecting to isolated test DB: ${testDbUrl.replace(/:[^:@]+@/, ':***@')}`);

  const pool = new pg.Pool({ connectionString: testDbUrl });
  const adapter = new PrismaPg(pool);
  const testPrisma = new PrismaClient({ adapter } as any);

  try {
    // Clean up test fixtures in test DB
    await testPrisma.$executeRawUnsafe(`DELETE FROM "OpportunitySkill" WHERE "opportunityId" LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "Opportunity" WHERE id LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "CandidateSkill" WHERE "profileId" LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "Profile" WHERE id LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id LIKE 'qual-fix-%'`);

    // Ensure Skills exist in test DB with different cases
    await testPrisma.skill.upsert({
      where: { name: 'JavaScript' },
      create: { name: 'JavaScript', category: 'LANGUAGE' },
      update: {},
    });
    await testPrisma.skill.upsert({
      where: { name: 'javascript' },
      create: { name: 'javascript', category: 'LANGUAGE' },
      update: {},
    });
    await testPrisma.skill.upsert({
      where: { name: 'Python' },
      create: { name: 'Python', category: 'LANGUAGE' },
      update: {},
    });

    const skillJsTitle = await testPrisma.skill.findUnique({ where: { name: 'JavaScript' } });
    const skillJsLower = await testPrisma.skill.findUnique({ where: { name: 'javascript' } });
    const skillPython = await testPrisma.skill.findUnique({ where: { name: 'Python' } });

    assert.ok(skillJsTitle);
    assert.ok(skillJsLower);
    assert.notEqual(skillJsTitle.id, skillJsLower.id, 'Skill records have different UUIDs');

    // Create Candidate with JavaScript (TitleCase)
    const testUser = await testPrisma.user.create({
      data: {
        id: 'qual-fix-user-1',
        email: 'qual-fix@example.com',
        clerkId: 'qual-fix-clerk-1',
        profile: {
          create: {
            id: 'qual-fix-prof-1',
            fullName: 'Quality Fix Candidate',
            targetRole: 'Fullstack Engineer',
            candidateSkills: {
              create: [
                { skillId: skillJsTitle.id, proficiency: 'EXPERT' },
                { skillId: skillPython!.id, proficiency: 'ADVANCED' },
              ],
            },
          },
        },
      },
    });

    // Create Opportunity requiring "javascript" (lowercase UUID)
    const testOpp = await testPrisma.opportunity.create({
      data: {
        id: 'qual-fix-opp-1',
        title: 'Senior Frontend Engineer',
        organization: 'Test India Org',
        description: 'Frontend Engineer responsible for web application architecture using JavaScript and React.',
        location: 'Bengaluru, India',
        workMode: 'HYBRID',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply',
        source: 'Greenhouse',
        sourceJobId: 'qual-fix-gh-1',
        opportunitySkills: {
          create: [
            { skillId: skillJsLower.id, requirementType: 'REQUIRED' },
          ],
        },
      },
    });

    // Test live matching service against test DB
    const dbMatchingService = new MatchingService(testPrisma);
    const candidateEvidence = await dbMatchingService.buildCandidateEvidenceMapByUserId(testUser.id);
    assert.ok(candidateEvidence);

    const liveMatch = dbMatchingService.matchEvidenceToOpportunity(candidateEvidence, {
      opportunitySkills: [
        { skillId: skillJsLower.id, requirementType: RequirementType.REQUIRED, skill: { name: 'javascript' } },
      ],
    });
    const liveSummary = dbMatchingService.getMatchSummary(liveMatch);

    assert.equal(liveMatch.score, 100);
    assert.equal(liveSummary.score, 100);
    assert.equal(liveMatch.requiredMatched.length, 1);
    assert.equal(liveMatch.requiredMatched[0].skillName, 'javascript');
    console.log('  ✓ Test DB integration: Candidate with JavaScript matches opportunity requiring javascript with 100% score');

    // Clean up
    await testPrisma.$executeRawUnsafe(`DELETE FROM "OpportunitySkill" WHERE "opportunityId" LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "Opportunity" WHERE id LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "CandidateSkill" WHERE "profileId" LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "Profile" WHERE id LIKE 'qual-fix-%'`);
    await testPrisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id LIKE 'qual-fix-%'`);

    passedTests++;
    totalTests++;
  } finally {
    await testPrisma.$disconnect();
    await pool.end();
  }

  console.log(`\n===============================================================`);
  console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log(`===============================================================`);
}

runQualityFixTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
