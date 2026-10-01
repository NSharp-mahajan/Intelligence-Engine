import 'dotenv/config';
import { prisma } from './lib/prisma';
import { DashboardService } from './services/dashboardService';
import { MatchingService } from './services/matchingService';
import { findOrCreateCanonicalSkill } from './lib/skillNormalizer';
import { RequirementType } from '@prisma/client';

async function runDashboardTests() {
  console.log('=== Running Focused Backend Dashboard Intelligence & Eligibility Tests ===\n');

  try {
    // 0. Cleanup any previous test data
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-dash-' } } });
    await prisma.opportunity.deleteMany({ where: { source: 'test-dash-source' } });

    const dashboardService = new DashboardService(prisma);
    const matchingService = new MatchingService(prisma);

    // Setup skills
    const pythonSkill = await findOrCreateCanonicalSkill(prisma, 'Python');
    const mlSkill = await findOrCreateCanonicalSkill(prisma, 'Machine Learning');
    const llmSkill = await findOrCreateCanonicalSkill(prisma, 'LLM');
    const dockerSkill = await findOrCreateCanonicalSkill(prisma, 'Docker');
    const goSkill = await findOrCreateCanonicalSkill(prisma, 'Go');

    // Setup Test User A (has Python & Machine Learning)
    const userA = await prisma.user.create({
      data: {
        email: 'test-dash-user-a@example.com',
        clerkId: 'test-clerk-dash-user-a',
      },
    });

    const profileA = await prisma.profile.create({
      data: {
        userId: userA.id,
        fullName: 'Candidate Alpha',
        university: 'State University',
        targetRole: 'AI Engineer',
      },
    });

    await prisma.candidateSkill.create({
      data: { profileId: profileA.id, skillId: pythonSkill.id },
    });
    await prisma.candidateSkill.create({
      data: { profileId: profileA.id, skillId: mlSkill.id },
    });

    // Create Test Opportunities for Eligibility Rules:
    // Opp Sparse 1: 1 requirement (Python), 100% match for User A, but only 1 requirement total
    const opp1Req = await prisma.opportunity.create({
      data: {
        title: 'Single Skill Python Developer',
        organization: 'SparseCorp',
        description: 'Requires only Python',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/sparse1',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp Sparse 2: 2 requirements (Python, ML), 100% match for User A, but only 2 requirements total
    const opp2Req = await prisma.opportunity.create({
      data: {
        title: 'Two Skill ML Engineer',
        organization: 'SparseCorp2',
        description: 'Requires Python and ML',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/sparse2',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp Eligible 3: Exactly 3 requirements (Python, ML, LLM) -> 2/3 matched (66.67%)
    const opp3Req = await prisma.opportunity.create({
      data: {
        title: 'AI Engineer (3 Requirements)',
        organization: 'EligibleCorp3',
        description: 'Requires Python, ML, LLM',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/eligible3',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: llmSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp Eligible 5: 5 requirements (Python, ML, LLM, Docker, Go) -> 2/5 matched (40%)
    const opp5Req = await prisma.opportunity.create({
      data: {
        title: 'Full Stack AI Architect (5 Requirements)',
        organization: 'EligibleCorp5',
        description: 'Requires Python, ML, LLM, Docker, Go',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/eligible5',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: llmSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: dockerSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: goSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp Unstructured: 0 requirements
    const oppUnstructured = await prisma.opportunity.create({
      data: {
        title: 'Unstructured Manager Role',
        organization: 'NoSkillOrg',
        description: 'Unstructured description with no skills',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/unstructured',
      },
    });

    const dashA = await dashboardService.getDashboardData(userA.id);

    // -------------------------------------------------------------------------
    // TEST 1: Opportunity with 1 structured requirement and 100% match -> NOT recommended
    // -------------------------------------------------------------------------
    console.log('[Test 1] Opportunity with 1 structured requirement and 100% match is NOT recommended');
    const isOpp1Recommended = dashA.recommendations.some(r => r.id === opp1Req.id);
    if (isOpp1Recommended) {
      throw new Error('Test 1 Failed: Opportunity with 1 requirement was included in recommendations!');
    }
    console.log('  ✓ Passed: Opportunity with 1 requirement excluded from Dashboard recommendations');

    // -------------------------------------------------------------------------
    // TEST 2: Opportunity with 2 structured requirements and 100% match -> NOT recommended
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Opportunity with 2 structured requirements and 100% match is NOT recommended');
    const isOpp2Recommended = dashA.recommendations.some(r => r.id === opp2Req.id);
    if (isOpp2Recommended) {
      throw new Error('Test 2 Failed: Opportunity with 2 requirements was included in recommendations!');
    }
    console.log('  ✓ Passed: Opportunity with 2 requirements excluded from Dashboard recommendations');

    // -------------------------------------------------------------------------
    // TEST 3: Opportunity with exactly 3 structured requirements -> eligible for recommendation
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Opportunity with exactly 3 structured requirements is eligible for recommendation');
    const isOpp3Recommended = dashA.recommendations.some(r => r.id === opp3Req.id);
    if (!isOpp3Recommended) {
      throw new Error('Test 3 Failed: Opportunity with 3 requirements should be recommended!');
    }
    console.log('  ✓ Passed: Opportunity with 3 requirements correctly recommended');

    // -------------------------------------------------------------------------
    // TEST 4: Opportunity with 5+ structured requirements -> eligible for recommendation
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Opportunity with 5+ structured requirements is eligible when it has a valid match score');
    const isOpp5Recommended = dashA.recommendations.some(r => r.id === opp5Req.id);
    if (!isOpp5Recommended) {
      throw new Error('Test 4 Failed: Opportunity with 5 requirements should be recommended!');
    }
    console.log('  ✓ Passed: Opportunity with 5 requirements correctly recommended');

    // -------------------------------------------------------------------------
    // TEST 5: Unstructured opportunity -> NOT recommended
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Unstructured opportunity is NOT recommended');
    const isUnstructuredRecommended = dashA.recommendations.some(r => r.id === oppUnstructured.id);
    if (isUnstructuredRecommended) {
      throw new Error('Test 5 Failed: Unstructured opportunity was included in recommendations!');
    }
    console.log('  ✓ Passed: Unstructured opportunity excluded from recommendations');

    // -------------------------------------------------------------------------
    // TEST 6: Recommendation ordering by match score remains unchanged among eligible opportunities
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Existing recommendation ordering by match score remains unchanged among eligible opportunities');
    const scores = dashA.recommendations.map(r => r.match.score);
    console.log('  Eligible recommendation scores:', scores);
    for (let i = 0; i < scores.length - 1; i++) {
      if (scores[i] < scores[i + 1]) {
        throw new Error(`Test 6 Failed: Scores not in descending order: ${scores[i]} < ${scores[i + 1]}`);
      }
    }
    console.log('  ✓ Passed: Eligible recommendations remain sorted strictly by match score descending');

    // -------------------------------------------------------------------------
    // TEST 7: Existing Opportunity Discovery matching behavior remains unchanged
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Existing Opportunity Discovery matching behavior remains unchanged');
    // opp1Req (1 requirement) still has a valid match score in MatchingService
    const evidenceMapA = await matchingService.buildCandidateEvidenceMapByUserId(userA.id);
    const opp1Full = await prisma.opportunity.findUnique({
      where: { id: opp1Req.id },
      include: { opportunitySkills: { include: { skill: true } } },
    });
    const matchOpp1 = matchingService.matchEvidenceToOpportunity(
      evidenceMapA!,
      opp1Full!
    );
    if (matchOpp1.score !== 100 || !matchOpp1.hasStructuredRequirements) {
      throw new Error(`Test 7 Failed: MatchingService score changed for sparse opportunity! Got ${matchOpp1.score}`);
    }
    console.log(`  ✓ Passed: Opportunity Discovery score for 1-requirement opp remains ${matchOpp1.score}%`);

    // -------------------------------------------------------------------------
    // TEST 8: Existing opportunity detail match endpoint remains unchanged
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Existing opportunity detail match endpoint remains unchanged');
    const detailMatch = await matchingService.matchCandidateToOpportunity(profileA.id, opp2Req.id);
    if (detailMatch.score !== 100 || detailMatch.requiredMatched.length !== 2) {
      throw new Error('Test 8 Failed: Detail match response altered for 2-requirement opp!');
    }
    console.log(`  ✓ Passed: Opportunity detail match result remains ${detailMatch.score}% with ${detailMatch.requiredMatched.length} matched`);

    console.log('\n=== ALL 8 RECOMMENDATION ELIGIBILITY TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-dash-' } } });
    await prisma.opportunity.deleteMany({ where: { source: 'test-dash-source' } });
  }
}

runDashboardTests().catch(err => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
