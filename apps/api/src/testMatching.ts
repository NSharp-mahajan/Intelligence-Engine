import 'dotenv/config';
import { prisma } from './lib/prisma';
import { RequirementType } from '@prisma/client';

async function main() {
  console.log('Testing Opportunity Matching API...\n');

  try {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: 'match-test@example.com' } });
    await prisma.opportunity.deleteMany({ where: { source: 'match-test' } });
    await prisma.skill.deleteMany({ where: { name: { in: ['react', 'typescript', 'node', 'python', 'sql'] } } });

    // Setup test user
    const user = await prisma.user.create({
      data: {
        email: 'match-test@example.com',
        clerkId: 'test-clerk-id-match',
      },
    });

    // Setup test profile with skills and projects
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: 'Test User',
        university: 'Test University',
        targetRole: 'Software Engineer',
      },
    });

    // Create skills
    const reactSkill = await prisma.skill.create({
      data: { name: 'react', category: 'FRAMEWORK' },
    });

    const typescriptSkill = await prisma.skill.create({
      data: { name: 'typescript', category: 'LANGUAGE' },
    });

    const nodeSkill = await prisma.skill.create({
      data: { name: 'node', category: 'FRAMEWORK' },
    });

    const pythonSkill = await prisma.skill.create({
      data: { name: 'python', category: 'LANGUAGE' },
    });

    const sqlSkill = await prisma.skill.create({
      data: { name: 'sql', category: 'LANGUAGE' },
    });

    // Add candidate skills
    await prisma.candidateSkill.create({
      data: {
        profileId: profile.id,
        skillId: reactSkill.id,
        proficiency: 'intermediate',
      },
    });

    await prisma.candidateSkill.create({
      data: {
        profileId: profile.id,
        skillId: typescriptSkill.id,
        proficiency: 'advanced',
      },
    });

    // Create project with skills
    const project = await prisma.project.create({
      data: {
        profileId: profile.id,
        name: 'Test Project',
        description: 'A test project',
        githubUrl: 'https://github.com/test/project',
      },
    });

    await prisma.projectSkill.create({
      data: {
        projectId: project.id,
        skillId: nodeSkill.id,
      },
    });

    await prisma.projectSkill.create({
      data: {
        projectId: project.id,
        skillId: sqlSkill.id,
      },
    });

    // Create test opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        title: 'Senior Developer',
        organization: 'Test Company',
        description: 'A test opportunity',
        type: 'JOB',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceLevel: 'SENIOR',
        applicationUrl: 'https://example.com/apply',
        source: 'match-test',
        sourceJobId: 'test-job-1',
      },
    });

    // Add required and preferred skills to opportunity
    await prisma.opportunitySkill.create({
      data: {
        opportunityId: opportunity.id,
        skillId: reactSkill.id,
        requirementType: RequirementType.REQUIRED,
      },
    });

    await prisma.opportunitySkill.create({
      data: {
        opportunityId: opportunity.id,
        skillId: typescriptSkill.id,
        requirementType: RequirementType.REQUIRED,
      },
    });

    await prisma.opportunitySkill.create({
      data: {
        opportunityId: opportunity.id,
        skillId: pythonSkill.id,
        requirementType: RequirementType.PREFERRED,
      },
    });

    // Test 1: Check endpoint exists (without auth for structure validation)
    console.log('Test 1: Endpoint Structure');
    const matchRes = await fetch(`http://localhost:3001/api/opportunities/${opportunity.id}/match`);
    console.log('  Status:', matchRes.status);
    console.log('  Expected 401 (unauthorized):', matchRes.status === 401 ? 'PASS' : 'FAIL');
    console.log();

    // Test 2: Non-existent opportunity
    console.log('Test 2: Non-existent Opportunity');
    const notFoundRes = await fetch(`http://localhost:3001/api/opportunities/non-existent-id/match`);
    console.log('  Status:', notFoundRes.status);
    console.log('  Expected 401 (unauthorized first):', notFoundRes.status === 401 ? 'PASS' : 'FAIL');
    console.log();

    // Test 3: Test with MatchingService directly (bypassing auth)
    console.log('Test 3: MatchingService Direct Test');
    const { MatchingService } = await import('./services/matchingService');
    const matchingService = new MatchingService(prisma);
    
    const matchResult = await matchingService.matchCandidateToOpportunity(profile.id, opportunity.id);
    console.log('  Score:', matchResult.score);
    console.log('  Required matched:', matchResult.requiredMatched.length);
    console.log('  Required missing:', matchResult.requiredMissing.length);
    console.log('  Preferred matched:', matchResult.preferredMatched.length);
    console.log('  Preferred missing:', matchResult.preferredMissing.length);
    console.log('  Has evidence:', matchResult.evidence.size > 0 ? 'PASS' : 'FAIL');
    console.log('  Score calculation:', matchResult.score === 100 ? 'PASS (perfect match)' : 'PARTIAL');
    console.log();

    // Test 4: Missing profile scenario
    console.log('Test 4: Non-existent Profile');
    try {
      await matchingService.matchCandidateToOpportunity('non-existent-profile-id', opportunity.id);
      console.log('  Expected error thrown: FAIL');
    } catch (error) {
      console.log('  Expected error thrown: PASS');
    }
    console.log();

    // Test 5: Missing opportunity scenario
    console.log('Test 5: Non-existent Opportunity');
    try {
      await matchingService.matchCandidateToOpportunity(profile.id, 'non-existent-opportunity-id');
      console.log('  Expected error thrown: FAIL');
    } catch (error) {
      console.log('  Expected error thrown: PASS');
    }
    console.log();

    // Test 6: Opportunity with no structured requirements
    console.log('Test 6: No Structured Requirements');
    const noSkillsOpp = await prisma.opportunity.create({
      data: {
        title: 'No Skills Job',
        organization: 'Test Company',
        description: 'A job with no structured skills',
        type: 'JOB',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceLevel: 'ENTRY',
        applicationUrl: 'https://example.com/apply',
        source: 'match-test',
        sourceJobId: 'test-job-2',
      },
    });

    const noSkillsResult = await matchingService.matchCandidateToOpportunity(profile.id, noSkillsOpp.id);
    console.log('  Score is null:', noSkillsResult.score === null ? 'PASS' : 'FAIL');
    console.log('  Has structured requirements:', noSkillsResult.hasStructuredRequirements === false ? 'PASS' : 'FAIL');
    console.log();

    // Cleanup
    console.log('Cleaning up test data...');
    await prisma.opportunity.deleteMany({ where: { source: 'match-test' } });
    await prisma.user.deleteMany({ where: { email: 'match-test@example.com' } });
    await prisma.skill.deleteMany({ where: { name: { in: ['react', 'typescript', 'node', 'python', 'sql'] } } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }

  console.log('\n=== All Tests Complete ===');
  process.exit(0);
}

main().catch(console.error);
