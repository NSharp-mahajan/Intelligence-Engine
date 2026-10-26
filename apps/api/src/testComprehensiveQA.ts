import 'dotenv/config';
import { prisma } from './lib/prisma';
import { MatchingService } from './services/matchingService';
import { DashboardService } from './services/dashboardService';
import { findOrCreateCanonicalSkill, normalizeSkillName } from './lib/skillNormalizer';
import { RequirementType } from '@prisma/client';

async function runComprehensiveQA() {
  console.log('====================================================');
  console.log('=== INTELLIGENCE-ENGINE V1 COMPREHENSIVE QA TEST ===');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
      throw new Error(`QA Failure: ${testName}`);
    }
  }

  try {
    // Cleanup any existing test QA data
    await prisma.user.deleteMany({ where: { email: { startsWith: 'qa-test-' } } });
    await prisma.opportunity.deleteMany({ where: { source: 'qa-test-source' } });

    const matchingService = new MatchingService(prisma);
    const dashboardService = new DashboardService(prisma);

    // =========================================================================
    // PHASE 2: AUTHENTICATION & DATA ISOLATION QA
    // =========================================================================
    console.log('\n--- PHASE 2: AUTHENTICATION & DATA ISOLATION QA ---');

    const userA = await prisma.user.create({
      data: {
        email: 'qa-test-user-a@example.com',
        clerkId: 'qa-clerk-user-a',
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: 'qa-test-user-b@example.com',
        clerkId: 'qa-clerk-user-b',
      },
    });

    const userC_NoProfile = await prisma.user.create({
      data: {
        email: 'qa-test-user-c@example.com',
        clerkId: 'qa-clerk-user-c',
      },
    });

    assert(Boolean(userA.id && userB.id), 'Test 2.1: Users created successfully');

    // Profile for User A
    const profileA = await prisma.profile.create({
      data: {
        userId: userA.id,
        fullName: 'Alice QA',
        university: 'MIT',
        targetRole: 'Senior AI Engineer',
      },
    });

    // Profile for User B
    const profileB = await prisma.profile.create({
      data: {
        userId: userB.id,
        fullName: 'Bob QA',
        university: 'Stanford',
        targetRole: 'Systems Engineer',
      },
    });

    assert(profileA.userId !== profileB.userId, 'Test 2.2: User profiles isolated by internal userId');

    // User C without profile check
    const userCProfile = await prisma.profile.findUnique({ where: { userId: userC_NoProfile.id } });
    assert(userCProfile === null, 'Test 2.3: User with no profile cleanly returns null in DB');

    // =========================================================================
    // PHASE 3: PROFILE, SKILLS & EVIDENCE QA
    // =========================================================================
    console.log('\n--- PHASE 3: PROFILE, SKILLS & EVIDENCE QA ---');

    // Canonical skill deduplication
    const s1 = await findOrCreateCanonicalSkill(prisma, 'machine learning');
    const s2 = await findOrCreateCanonicalSkill(prisma, 'Machine Learning');
    const s3 = await findOrCreateCanonicalSkill(prisma, 'React.js');
    const s4 = await findOrCreateCanonicalSkill(prisma, 'react');
    const s5 = await findOrCreateCanonicalSkill(prisma, 'NodeJS');
    const s6 = await findOrCreateCanonicalSkill(prisma, 'Node.js');

    assert(s1.id === s2.id && s1.name === 'Machine Learning', 'Test 3.1: Canonical resolution: "machine learning" == "Machine Learning"');
    assert(s3.id === s4.id && s3.name === 'React', 'Test 3.2: Canonical resolution: "React.js" == "React"');
    assert(s5.id === s6.id && s5.name === 'Node.js', 'Test 3.3: Canonical resolution: "NodeJS" == "Node.js"');

    // Additional canonical skills
    const pythonSkill = await findOrCreateCanonicalSkill(prisma, 'Python');
    const llmSkill = await findOrCreateCanonicalSkill(prisma, 'LLM');
    const dockerSkill = await findOrCreateCanonicalSkill(prisma, 'Docker');
    const k8sSkill = await findOrCreateCanonicalSkill(prisma, 'Kubernetes');
    const goSkill = await findOrCreateCanonicalSkill(prisma, 'Go');

    // Candidate skills for Alice: Python, Machine Learning, React
    await prisma.candidateSkill.create({
      data: { profileId: profileA.id, skillId: pythonSkill.id, proficiency: 'EXPERT' },
    });
    await prisma.candidateSkill.create({
      data: { profileId: profileA.id, skillId: s1.id }, // Machine Learning
    });
    await prisma.candidateSkill.create({
      data: { profileId: profileA.id, skillId: s3.id }, // React
    });

    const aliceSkills = await prisma.candidateSkill.findMany({ where: { profileId: profileA.id } });
    assert(aliceSkills.length === 3, 'Test 3.4: Candidate skills added and persisted (count: 3)');

    // Attempt duplicate skill for Alice -> should throw on unique constraint
    let dupFailed = false;
    try {
      await prisma.candidateSkill.create({
        data: { profileId: profileA.id, skillId: pythonSkill.id },
      });
    } catch {
      dupFailed = true;
    }
    assert(dupFailed, 'Test 3.5: Duplicate skill association prevented by unique constraint');

    // Candidate skills for Bob: Go, Docker
    await prisma.candidateSkill.create({
      data: { profileId: profileB.id, skillId: goSkill.id },
    });
    await prisma.candidateSkill.create({
      data: { profileId: profileB.id, skillId: dockerSkill.id },
    });

    // Project evidence for Alice: Project with LLM (indirect evidence)
    const projectA = await prisma.project.create({
      data: {
        profileId: profileA.id,
        name: 'LLM Agent Project',
        description: 'Built autonomous research assistant using LLMs',
      },
    });

    await prisma.projectSkill.create({
      data: {
        projectId: projectA.id,
        skillId: llmSkill.id,
      },
    });

    const evidenceMapA = await matchingService.buildCandidateEvidenceMapByUserId(userA.id);
    assert(Boolean(evidenceMapA && evidenceMapA.has(llmSkill.id)), 'Test 3.6: Project evidence compiles into candidate evidence map');
    const llmEv = evidenceMapA!.get(llmSkill.id)!;
    assert(llmEv[0].isDirect === false && llmEv[0].projectName === 'LLM Agent Project', 'Test 3.7: Indirect project evidence correctly flagged with projectName');

    // =========================================================================
    // PHASE 4 & 5: OPPORTUNITY MATCHING & DISCOVERY QA
    // =========================================================================
    console.log('\n--- PHASE 4 & 5: OPPORTUNITY MATCHING & DISCOVERY QA ---');

    // Opp 1: 100% Match for Alice (Python, Machine Learning, React) - 3 requirements
    const opp1_100 = await prisma.opportunity.create({
      data: {
        title: 'Full Stack AI Engineer',
        organization: 'DeepAI Labs',
        description: 'Requires Python, Machine Learning, React',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/1',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: s1.id, requirementType: RequirementType.REQUIRED },
            { skillId: s3.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 2: Required (80%) + Preferred (20%) weighted scoring
    // Required: Python (matched) -> 1/1 = 100% * 80% = 80
    // Preferred: Docker (missing), LLM (matched via project) -> 1/2 = 50% * 20% = 10
    // Total score: 80 + 10 = 90%
    const opp2_weighted = await prisma.opportunity.create({
      data: {
        title: 'Lead Python Agent Architect',
        organization: 'AgenticSystems',
        description: 'Required: Python. Preferred: Docker, LLM',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/2',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: dockerSkill.id, requirementType: RequirementType.PREFERRED },
            { skillId: llmSkill.id, requirementType: RequirementType.PREFERRED },
          ],
        },
      },
    });

    // Opp 3: 0% match for Alice (Go, Docker, Kubernetes) - 3 requirements
    const opp3_zero = await prisma.opportunity.create({
      data: {
        title: 'Kubernetes Platform Engineer',
        organization: 'CloudBase',
        description: 'Requires Go, Docker, Kubernetes',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/3',
        opportunitySkills: {
          create: [
            { skillId: goSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: dockerSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: k8sSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 4: Sparse 1-requirement opportunity (Python) -> 100% score for Alice
    const opp4_sparse1 = await prisma.opportunity.create({
      data: {
        title: 'Junior Python Scripter',
        organization: 'ScriptOrg',
        description: 'Requires Python',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/4',
        opportunitySkills: {
          create: [
            { skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 5: Sparse 2-requirement opportunity (Go, Docker) -> 100% score for Bob, 0% for Alice
    const opp5_sparse2 = await prisma.opportunity.create({
      data: {
        title: 'Go/Docker Microservices Engineer',
        organization: 'GoMicro',
        description: 'Requires Go, Docker',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/5',
        opportunitySkills: {
          create: [
            { skillId: goSkill.id, requirementType: RequirementType.REQUIRED },
            { skillId: dockerSkill.id, requirementType: RequirementType.REQUIRED },
          ],
        },
      },
    });

    // Opp 6: Unstructured (0 requirements)
    const opp6_unstructured = await prisma.opportunity.create({
      data: {
        title: 'General IT Admin',
        organization: 'CorpAdmin',
        description: 'General unstructured description',
        source: 'qa-test-source',
        type: 'JOB',
        applicationUrl: 'https://example.com/apply/6',
      },
    });

    // Test Match on Opp 1 (100%)
    const match1 = await matchingService.matchCandidateToOpportunity(profileA.id, opp1_100.id);
    assert(match1.score === 100, 'Test 5.1: 100% match score calculated accurately', `got ${match1.score}`);
    assert(match1.requiredMatched.length === 3 && match1.requiredMissing.length === 0, 'Test 5.2: All 3 required skills matched');

    // Test Match on Opp 2 (Weighted 90%)
    const match2 = await matchingService.matchCandidateToOpportunity(profileA.id, opp2_weighted.id);
    assert(match2.score === 90, 'Test 5.3: Required (80%) + Preferred (20%) weighted score equals exactly 90', `got ${match2.score}`);
    assert(match2.requiredMatched.length === 1, 'Test 5.4: Required Python matched');
    assert(match2.preferredMatched.some(s => s.skillName === 'LLM'), 'Test 5.5: Preferred LLM matched via project evidence');
    assert(match2.preferredMissing.some(s => s.skillName === 'Docker'), 'Test 5.6: Preferred Docker correctly identified as missing');

    // Test Match on Opp 3 (0%)
    const match3 = await matchingService.matchCandidateToOpportunity(profileA.id, opp3_zero.id);
    assert(match3.score === 0, 'Test 5.7: 0% match score calculated accurately', `got ${match3.score}`);
    assert(match3.requiredMissing.length === 3, 'Test 5.8: All 3 skills in requiredMissing');

    // Test Match on Opp 6 (Unstructured)
    const match6 = await matchingService.matchCandidateToOpportunity(profileA.id, opp6_unstructured.id);
    assert(match6.score === null && match6.hasStructuredRequirements === false, 'Test 5.9: Unstructured opp returns score: null & hasStructuredRequirements: false');

    // =========================================================================
    // PHASE 6: DASHBOARD INTELLIGENCE & ELIGIBILITY QA
    // =========================================================================
    console.log('\n--- PHASE 6: DASHBOARD INTELLIGENCE & ELIGIBILITY QA ---');

    const dashA = await dashboardService.getDashboardData(userA.id);

    // 1. Check recommendations exist
    assert(dashA.recommendations.length > 0, 'Test 6.1: Dashboard returns recommendations for candidate with skills');

    // 2. Check eligibility rule (>= 3 requirements):
    // opp4_sparse1 has 1 requirement (100% match) -> MUST NOT be in recommendations!
    const opp4InRecs = dashA.recommendations.some(r => r.id === opp4_sparse1.id);
    assert(!opp4InRecs, 'Test 6.2: Sparse opportunity with 1 requirement excluded from Dashboard recommendations');

    // opp5_sparse2 has 2 requirements -> MUST NOT be in recommendations!
    const opp5InRecs = dashA.recommendations.some(r => r.id === opp5_sparse2.id);
    assert(!opp5InRecs, 'Test 6.3: Sparse opportunity with 2 requirements excluded from Dashboard recommendations');

    // opp6_unstructured has 0 requirements -> MUST NOT be in recommendations!
    const opp6InRecs = dashA.recommendations.some(r => r.id === opp6_unstructured.id);
    assert(!opp6InRecs, 'Test 6.4: Unstructured opportunity excluded from Dashboard recommendations');

    // opp1_100 (3 requirements, 100%) and opp2_weighted (3 requirements, 90%) MUST be in recommendations
    const opp1InRecs = dashA.recommendations.find(r => r.id === opp1_100.id);
    const opp2InRecs = dashA.recommendations.find(r => r.id === opp2_weighted.id);
    assert(Boolean(opp1InRecs && opp2InRecs), 'Test 6.5: Opportunities with >=3 requirements are present in recommendations');

    // 3. Ordering: 100% must precede 90%
    const index1 = dashA.recommendations.findIndex(r => r.id === opp1_100.id);
    const index2 = dashA.recommendations.findIndex(r => r.id === opp2_weighted.id);
    assert(index1 < index2, 'Test 6.6: Recommendations sorted by match score descending (100% before 90%)');

    // 4. Skill Gaps: Docker is missing from opp2 and opp3
    const dockerGap = dashA.skillGaps.find(g => g.skillName === 'Docker');
    assert(Boolean(dockerGap && dockerGap.opportunityCount >= 2), 'Test 6.7: Repeated missing skill (Docker) correctly aggregated in skill gaps');

    // 5. User without profile
    const dashC = await dashboardService.getDashboardData(userC_NoProfile.id);
    assert(dashC.hasProfile === false && dashC.recommendations.length === 0, 'Test 6.8: User without profile receives hasProfile: false and empty recs');

    // =========================================================================
    // PHASE 7: CROSS-SURFACE DATA CONSISTENCY QA
    // =========================================================================
    console.log('\n--- PHASE 7: CROSS-SURFACE DATA CONSISTENCY QA ---');

    // Detail API vs Dashboard Recommendation vs Opportunity List Summary:
    // Opp 2 for Alice:
    // Detail score: match2.score = 90
    // Detail matched: match2.requiredMatched.length + match2.preferredMatched.length = 2
    // Detail missing: match2.requiredMissing.length + match2.preferredMissing.length = 1

    const opp2Rec = dashA.recommendations.find(r => r.id === opp2_weighted.id);
    assert(opp2Rec !== undefined, 'Test 7.1: Opp 2 found in Dashboard recommendations');
    assert(opp2Rec!.match.score === match2.score, 'Test 7.2: Score on Dashboard matches Score on Detail page (90% == 90%)');
    assert(opp2Rec!.match.matchedCount === (match2.requiredMatched.length + match2.preferredMatched.length), 'Test 7.3: Matched count on Dashboard matches Detail page (2 == 2)');
    assert(opp2Rec!.match.missingCount === (match2.requiredMissing.length + match2.preferredMissing.length), 'Test 7.4: Missing count on Dashboard matches Detail page (1 == 1)');

    // Summary check via MatchingService.getMatchSummary
    const summary2 = matchingService.getMatchSummary(match2);
    assert(summary2.score === opp2Rec!.match.score, 'Test 7.5: Opportunity Card match summary score agrees with Dashboard score');
    assert(summary2.matchedCount === opp2Rec!.match.matchedCount, 'Test 7.6: Opportunity Card match summary matched count agrees with Dashboard');
    assert(summary2.missingCount === opp2Rec!.match.missingCount, 'Test 7.7: Opportunity Card match summary missing count agrees with Dashboard');

    console.log('\n====================================================');
    console.log(`=== ALL ${passed} COMPREHENSIVE QA CHECKS PASSED (0 FAILURES) ===`);
    console.log('====================================================\n');
  } finally {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: { startsWith: 'qa-test-' } } });
    await prisma.opportunity.deleteMany({ where: { source: 'qa-test-source' } });
  }
}

runComprehensiveQA().catch(err => {
  console.error('\n❌ QA Test Script Failed:', err);
  process.exit(1);
});
