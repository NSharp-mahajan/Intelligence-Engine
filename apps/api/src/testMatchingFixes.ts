import 'dotenv/config';
import { prisma } from './lib/prisma';
import { MatchingService } from './services/matchingService';
import { findOrCreateCanonicalSkill } from './lib/skillNormalizer';
import { reconcileSkills } from './reconcileSkills';
import { RequirementType } from '@prisma/client';

async function main() {
  console.log('=== Running Backend Matching & Skill Canonicalization Tests ===\n');

  try {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-fix-' } } });
    await prisma.opportunity.deleteMany({ where: { source: 'test-fix-source' } });

    // Setup Test User & Profile
    const user = await prisma.user.create({
      data: {
        email: 'test-fix-user@example.com',
        clerkId: 'test-clerk-fix-user',
      },
    });

    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: 'Test Fix User',
      },
    });

    const matchingService = new MatchingService(prisma);

    // Test A & B: Case-insensitive and Alias Canonicalization Matching
    console.log('[Test A & B] Case-insensitive and Alias Canonicalization Matching');
    const mlSkill = await findOrCreateCanonicalSkill(prisma, 'machine learning'); // resolves to "Machine Learning"
    const reactSkill = await findOrCreateCanonicalSkill(prisma, 'react.js');        // resolves to "React"
    const nodeSkill = await findOrCreateCanonicalSkill(prisma, 'NodeJS');          // resolves to "Node.js"

    console.log('  Resolved "machine learning" ->', mlSkill.name);
    console.log('  Resolved "react.js"          ->', reactSkill.name);
    console.log('  Resolved "NodeJS"            ->', nodeSkill.name);

    if (mlSkill.name !== 'Machine Learning' || reactSkill.name !== 'React' || nodeSkill.name !== 'Node.js') {
      throw new Error('FAILED Test A & B: Canonical resolution mismatch!');
    }

    // Add candidate skills
    await prisma.candidateSkill.create({
      data: { profileId: profile.id, skillId: mlSkill.id },
    });
    await prisma.candidateSkill.create({
      data: { profileId: profile.id, skillId: reactSkill.id },
    });

    // Create Opportunity requiring "Machine Learning" and "React"
    const oppAB = await prisma.opportunity.create({
      data: {
        title: 'AI Dev',
        organization: 'Test Org',
        description: 'Desc',
        type: 'JOB',
        applicationUrl: 'https://example.com',
        source: 'test-fix-source',
      },
    });

    await prisma.opportunitySkill.create({
      data: { opportunityId: oppAB.id, skillId: mlSkill.id, requirementType: RequirementType.REQUIRED },
    });
    await prisma.opportunitySkill.create({
      data: { opportunityId: oppAB.id, skillId: reactSkill.id, requirementType: RequirementType.REQUIRED },
    });

    const resultAB = await matchingService.matchCandidateToOpportunity(profile.id, oppAB.id);
    console.log('  Matched required skills count:', resultAB.requiredMatched.length);
    console.log('  Match score:', resultAB.score);
    if (resultAB.requiredMatched.length !== 2 || resultAB.score !== 100) {
      throw new Error('FAILED Test A & B: Skill matching score failed!');
    }
    console.log('  PASS: Case-insensitive and alias canonicalization matched correctly.\n');

    // Test C: 2 required / 0 matched -> score 0
    console.log('[Test C] 2 required / 0 matched -> Score 0');
    const pythonSkill = await findOrCreateCanonicalSkill(prisma, 'Python');
    const sqlSkill = await findOrCreateCanonicalSkill(prisma, 'SQL');

    const oppC = await prisma.opportunity.create({
      data: {
        title: 'Data Dev',
        organization: 'Test Org',
        description: 'Desc',
        type: 'JOB',
        applicationUrl: 'https://example.com',
        source: 'test-fix-source',
      },
    });

    await prisma.opportunitySkill.create({
      data: { opportunityId: oppC.id, skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED },
    });
    await prisma.opportunitySkill.create({
      data: { opportunityId: oppC.id, skillId: sqlSkill.id, requirementType: RequirementType.REQUIRED },
    });

    const resultC = await matchingService.matchCandidateToOpportunity(profile.id, oppC.id);
    console.log('  Score for 0 matched out of 2 required:', resultC.score);
    if (resultC.score !== 0) {
      throw new Error(`FAILED Test C: Expected score 0, got ${resultC.score}`);
    }
    console.log('  PASS: Score is 0.\n');

    // Test D: 1 of 2 required matched -> 50%
    console.log('[Test D] 1 of 2 required matched -> Score 50');
    const oppD = await prisma.opportunity.create({
      data: {
        title: 'ML Dev',
        organization: 'Test Org',
        description: 'Desc',
        type: 'JOB',
        applicationUrl: 'https://example.com',
        source: 'test-fix-source',
      },
    });

    await prisma.opportunitySkill.create({
      data: { opportunityId: oppD.id, skillId: mlSkill.id, requirementType: RequirementType.REQUIRED }, // candidate has
    });
    await prisma.opportunitySkill.create({
      data: { opportunityId: oppD.id, skillId: pythonSkill.id, requirementType: RequirementType.REQUIRED }, // candidate lacks
    });

    const resultD = await matchingService.matchCandidateToOpportunity(profile.id, oppD.id);
    console.log('  Score for 1 of 2 required matched:', resultD.score);
    if (resultD.score !== 50) {
      throw new Error(`FAILED Test D: Expected score 50, got ${resultD.score}`);
    }
    console.log('  PASS: Score is 50.\n');

    // Test E: Required + Preferred scoring (1/1 required = 80, 1/2 preferred = 10 -> score 90)
    console.log('[Test E] Required (80%) + Preferred (20%) weighted scoring');
    const dockerSkill = await findOrCreateCanonicalSkill(prisma, 'Docker');
    const k8sSkill = await findOrCreateCanonicalSkill(prisma, 'Kubernetes');

    const oppE = await prisma.opportunity.create({
      data: {
        title: 'DevOps Role',
        organization: 'Test Org',
        description: 'Desc',
        type: 'JOB',
        applicationUrl: 'https://example.com',
        source: 'test-fix-source',
      },
    });

    await prisma.opportunitySkill.create({
      data: { opportunityId: oppE.id, skillId: mlSkill.id, requirementType: RequirementType.REQUIRED }, // candidate has (100% * 80 = 80)
    });
    await prisma.opportunitySkill.create({
      data: { opportunityId: oppE.id, skillId: reactSkill.id, requirementType: RequirementType.PREFERRED }, // candidate has (50% * 20 = 10)
    });
    await prisma.opportunitySkill.create({
      data: { opportunityId: oppE.id, skillId: dockerSkill.id, requirementType: RequirementType.PREFERRED }, // candidate lacks
    });

    const resultE = await matchingService.matchCandidateToOpportunity(profile.id, oppE.id);
    console.log('  Score for 1/1 required + 1/2 preferred:', resultE.score);
    if (resultE.score !== 90) {
      throw new Error(`FAILED Test E: Expected score 90, got ${resultE.score}`);
    }
    console.log('  PASS: Score is 90.\n');

    // Test F: No structured requirements -> score null & hasStructuredRequirements false
    console.log('[Test F] No structured requirements -> score null & hasStructuredRequirements false');
    const oppF = await prisma.opportunity.create({
      data: {
        title: 'Empty Requirements Role',
        organization: 'Test Org',
        description: 'Desc',
        type: 'JOB',
        applicationUrl: 'https://example.com',
        source: 'test-fix-source',
      },
    });

    const resultF = await matchingService.matchCandidateToOpportunity(profile.id, oppF.id);
    console.log('  Score is null:', resultF.score === null);
    console.log('  hasStructuredRequirements:', resultF.hasStructuredRequirements);
    if (resultF.score !== null || resultF.hasStructuredRequirements !== false) {
      throw new Error('FAILED Test F: Expected null score & hasStructuredRequirements false');
    }
    console.log('  PASS: Score is null and hasStructuredRequirements is false.\n');

    // Test G: Duplicate Skill Reconciliation Idempotency
    console.log('[Test G] Duplicate Skill Reconciliation Idempotency');
    await reconcileSkills(); // 1st run
    await reconcileSkills(); // 2nd run
    console.log('  PASS: Reconciliation executed twice without error.\n');

    // Cleanup
    await prisma.opportunity.deleteMany({ where: { source: 'test-fix-source' } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-fix-' } } });

    console.log('=== All Backend Tests Passed Successfully ===');
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
