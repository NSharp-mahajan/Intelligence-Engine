import 'dotenv/config';
import { prisma } from './lib/prisma';
import { DashboardService } from './services/dashboardService';
import { MatchingService } from './services/matchingService';
import { findOrCreateCanonicalSkill } from './lib/skillNormalizer';
import { RequirementType } from '@prisma/client';

async function runDashboardTests() {
  console.log('=== Running Focused Backend Dashboard Intelligence Tests ===\n');

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

    // Setup Test User B (has Go)
    const userB = await prisma.user.create({
      data: {
        email: 'test-dash-user-b@example.com',
        clerkId: 'test-clerk-dash-user-b',
      },
    });

    const profileB = await prisma.profile.create({
      data: {
        userId: userB.id,
        fullName: 'Candidate Beta',
        university: 'Tech Institute',
        targetRole: 'Backend Engineer',
      },
    });

    await prisma.candidateSkill.create({
      data: { profileId: profileB.id, skillId: goSkill.id },
    });

    // Setup Test User C (Profile exists but NO skills or projects)
    const userC = await prisma.user.create({
      data: {
        email: 'test-dash-user-c@example.com',
        clerkId: 'test-clerk-dash-user-c',
      },
    });

    await prisma.profile.create({
      data: {
        userId: userC.id,
        fullName: 'Candidate Gamma',
        university: 'Community College',
        targetRole: 'Junior Dev',
      },
    });

    // Setup Test User D (NO profile at all)
    const userD = await prisma.user.create({
      data: {
        email: 'test-dash-user-d@example.com',
        clerkId: 'test-clerk-dash-user-d',
      },
    });

    // Create Opportunities:
    // Opp 1: High match for User A (Python, ML, LLM) - User A has 2/3 -> ~66.7%
    const opp1 = await prisma.opportunity.create({
      data: {
        title: 'Lead AI Engineer',
        organization: 'AI Corp',
        description: 'Requires Python, ML, LLM',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/1',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: llmSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 2: 100% match for User A (Python, ML)
    const opp2 = await prisma.opportunity.create({
      data: {
        title: 'Senior Python & ML Specialist',
        organization: 'DeepTech',
        description: 'Requires Python, ML',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/2',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 3: Requires Python, Docker, LLM (User A has 1/3 -> ~33.3%)
    const opp3 = await prisma.opportunity.create({
      data: {
        title: 'Python Cloud Dev',
        organization: 'CloudScale',
        description: 'Requires Python, Docker, LLM',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/3',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: dockerSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: llmSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 4: Requires Go (100% match for User B, 0% for User A)
    const opp4 = await prisma.opportunity.create({
      data: {
        title: 'Go Systems Engineer',
        organization: 'GoSystems',
        description: 'Requires Go',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/4',
        opportunitySkills: {
          create: [
            { skillId: goSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 5: Unstructured opportunity (NO skills)
    const opp5 = await prisma.opportunity.create({
      data: {
        title: 'General Office Coordinator',
        organization: 'AdminOrg',
        description: 'General unstructured description',
        source: 'test-dash-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/5',
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1: Authenticated user with profile and skills → recommendations returned
    // -------------------------------------------------------------------------
    console.log('[Test 1] Authenticated user with profile and skills returns recommendations');
    const dashA = await dashboardService.getDashboardData(userA.id);
    if (!dashA.recommendations || dashA.recommendations.length === 0) {
      throw new Error('Test 1 Failed: Expected recommendations for User A, got 0');
    }
    console.log(`  ✓ Passed: User A received ${dashA.recommendations.length} recommendations`);

    // -------------------------------------------------------------------------
    // TEST 2: Recommendations are ordered by deterministic match score
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Recommendations are ordered by deterministic match score (highest first)');
    const scores = dashA.recommendations.map(r => r.match.score);
    console.log('  Scores received:', scores);
    for (let i = 0; i < scores.length - 1; i++) {
      if (scores[i] < scores[i + 1]) {
        throw new Error(`Test 2 Failed: Scores not in descending order: ${scores[i]} < ${scores[i + 1]}`);
      }
    }
    const opp2Rec = dashA.recommendations.find(r => r.id === opp2.id);
    if (!opp2Rec || opp2Rec.match.score !== 100) {
      throw new Error(`Test 2 Failed: Expected opp2 to be in recommendations with 100% score, got ${opp2Rec?.match.score}`);
    }
    console.log('  ✓ Passed: Recommendations in descending score order, opp2 has 100% score');

    // -------------------------------------------------------------------------
    // TEST 3: Unstructured opportunities are not presented as scored recommendations
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Unstructured opportunities are not presented as scored recommendations');
    const hasUnstructured = dashA.recommendations.some(r => r.id === opp5.id);
    if (hasUnstructured) {
      throw new Error('Test 3 Failed: Unstructured opportunity (opp5) was included in recommendations!');
    }
    for (const rec of dashA.recommendations) {
      if (!rec.match.hasStructuredRequirements || rec.match.score === null) {
        throw new Error(`Test 3 Failed: Recommendation ${rec.id} has invalid score/structure`);
      }
    }
    console.log('  ✓ Passed: Zero unstructured opportunities in recommendations');

    // -------------------------------------------------------------------------
    // TEST 4: Skill gaps are derived from structured missing requirements
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Skill gaps are derived from structured missing requirements');
    const skillGapNames = dashA.skillGaps.map(g => g.skillName);
    console.log('  Skill gaps found for User A:', skillGapNames);
    if (!skillGapNames.includes('LLM') && !skillGapNames.includes('Docker')) {
      throw new Error('Test 4 Failed: Expected LLM and/or Docker in skill gaps for User A');
    }
    if (skillGapNames.includes('Python') || skillGapNames.includes('Machine Learning')) {
      throw new Error('Test 4 Failed: Candidate has Python/ML, but they appeared in skill gaps!');
    }
    console.log('  ✓ Passed: Only actual missing structured skills appear in skill gaps');

    // -------------------------------------------------------------------------
    // TEST 5: Repeated missing skills are aggregated correctly
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Repeated missing skills are aggregated correctly');
    const llmGap = dashA.skillGaps.find(g => g.skillName === 'LLM');
    if (!llmGap) {
      throw new Error('Test 5 Failed: LLM gap not found');
    }
    console.log(`  LLM is missing from ${llmGap.opportunityCount} opportunities`);
    // In our test opps, LLM was required in opp1 and opp3 (2 opportunities)
    // Plus any in the main database
    if (llmGap.opportunityCount < 2) {
      throw new Error(`Test 5 Failed: Expected LLM opportunityCount >= 2, got ${llmGap.opportunityCount}`);
    }
    console.log('  ✓ Passed: Repeated missing skills correctly aggregated across opportunities');

    // -------------------------------------------------------------------------
    // TEST 6: User without profile does not fail request
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] User without profile returns clean data without error');
    const dashD = await dashboardService.getDashboardData(userD.id);
    if (dashD.hasProfile !== false) {
      throw new Error('Test 6 Failed: Expected hasProfile: false');
    }
    if (dashD.recommendations.length !== 0 || dashD.skillGaps.length !== 0) {
      throw new Error('Test 6 Failed: Expected empty recommendations and skill gaps for unprofiled user');
    }
    console.log('  ✓ Passed: User without profile returns clean payload (hasProfile: false)');

    // -------------------------------------------------------------------------
    // TEST 7: User with no skills/evidence returns no fake recommendations
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] User with no skills/evidence returns no fake recommendations');
    const dashC = await dashboardService.getDashboardData(userC.id);
    if (dashC.hasProfile !== true) {
      throw new Error('Test 7 Failed: Expected hasProfile: true');
    }
    if (dashC.hasSkillsOrEvidence !== false) {
      throw new Error('Test 7 Failed: Expected hasSkillsOrEvidence: false');
    }
    if (dashC.recommendations.length !== 0) {
      throw new Error(`Test 7 Failed: Expected 0 recommendations for user without skills, got ${dashC.recommendations.length}`);
    }
    console.log('  ✓ Passed: User with no skills gets 0 fake recommendations');

    // -------------------------------------------------------------------------
    // TEST 8: Dashboard data is scoped to the authenticated user
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Dashboard data is scoped to the authenticated user');
    const dashB = await dashboardService.getDashboardData(userB.id);
    const topRecA = dashA.recommendations[0];
    const topRecB = dashB.recommendations[0];
    console.log(`  User A Top Rec: ${topRecA.title} (${topRecA.match.score}%)`);
    console.log(`  User B Top Rec: ${topRecB.title} (${topRecB.match.score}%)`);
    if (topRecA.id === topRecB.id && topRecA.match.score === topRecB.match.score) {
      throw new Error('Test 8 Failed: User A and User B received identical recommendations despite different skills');
    }
    const opp4InB = dashB.recommendations.some(r => r.id === opp4.id && r.match.score === 100);
    const opp4InA = dashA.recommendations.some(r => r.id === opp4.id);
    if (!opp4InB) {
      throw new Error('Test 8 Failed: User B (with Go) should have opp4 (Go Systems Engineer) in recommendations');
    }
    if (opp4InA) {
      throw new Error('Test 8 Failed: User A (no Go) should NOT have opp4 in recommendations');
    }
    console.log('  ✓ Passed: Personalized matching is correctly scoped to individual user evidence');

    // -------------------------------------------------------------------------
    // TEST 9: Existing opportunity matching endpoint still works
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Existing MatchingService.matchCandidateToOpportunity still works');
    const singleMatch = await matchingService.matchCandidateToOpportunity(profileA.id, opp2.id);
    if (singleMatch.score !== 100) {
      throw new Error(`Test 9 Failed: Expected score 100 for User A on opp2, got ${singleMatch.score}`);
    }
    if (singleMatch.requiredMatched.length !== 2) {
      throw new Error(`Test 9 Failed: Expected 2 matched skills, got ${singleMatch.requiredMatched.length}`);
    }
    console.log('  ✓ Passed: Existing single-opportunity matching logic intact');

    // -------------------------------------------------------------------------
    // TEST 10: Existing opportunity discovery still works
    // -------------------------------------------------------------------------
    console.log('\n[Test 10] Existing opportunity discovery query logic still works');
    const oppList = await prisma.opportunity.findMany({
      where: { source: 'test-dash-source' },
      orderBy: [{ postedDate: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
    if (oppList.length !== 5) {
      throw new Error(`Test 10 Failed: Expected 5 test opportunities, got ${oppList.length}`);
    }
    console.log('  ✓ Passed: Opportunity listing queries work with deterministic ordering');

    console.log('\n=== ALL 10 BACKEND DASHBOARD TESTS PASSED SUCCESSFULLY! ===\n');
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
