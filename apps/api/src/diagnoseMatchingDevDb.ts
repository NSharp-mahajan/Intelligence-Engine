import { PrismaClient, RequirementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { MatchingService } from '../src/services/matchingService';

const DEV_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/intelligence_engine?schema=public';

async function diagnose() {
  const pool = new pg.Pool({ connectionString: DEV_DB_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('======================================================================');
  console.log('DIAGNOSING REAL DEVELOPMENT DATABASE (Port 5432)');
  console.log('======================================================================\n');

  // 1. Inspect all Users & Profiles
  const users = await prisma.user.findMany({
    include: {
      profile: {
        include: {
          candidateSkills: { include: { skill: true } },
          projects: { include: { projectSkills: { include: { skill: true } } } },
        },
      },
    },
  });

  console.log(`--- 1. Users Found in Dev DB (${users.length}) ---`);
  for (const u of users) {
    console.log(`User: ${u.email} (id: ${u.id}, clerkId: ${u.clerkId || 'NULL'})`);
    if (!u.profile) {
      console.log('  No Profile');
      continue;
    }
    console.log(`  Profile ID: ${u.profile.id}, TargetRole: ${u.profile.targetRole}`);
    console.log(`  Candidate Skills (${u.profile.candidateSkills.length}):`);
    const cSkills = u.profile.candidateSkills.map(cs => cs.skill.name);
    console.log(`    ${cSkills.join(', ')}`);
    console.log(`  Projects (${u.profile.projects.length}):`);
    for (const p of u.profile.projects) {
      const pSkills = p.projectSkills.map(ps => ps.skill.name);
      console.log(`    Project: "${p.name}" -> Skills: [${pSkills.join(', ')}]`);
    }
  }

  // 2. Candidate Evidence Map for each user
  const matchingService = new MatchingService(prisma);
  for (const u of users) {
    const evidenceMap = await matchingService.buildCandidateEvidenceMapByUserId(u.id);
    console.log(`\nEvidence Map for ${u.email}:`);
    if (!evidenceMap) {
      console.log('  NULL evidence map');
    } else {
      console.log(`  Keys (${evidenceMap.size}):`);
      for (const [skillId, evList] of evidenceMap.entries()) {
        const first = evList[0];
        console.log(`    skillId: ${skillId} -> "${first.skillName}" (${evList.length} evidence items, direct: ${evList.some(e => e.isDirect)})`);
      }
    }
  }

  // 3. Inspect All Opportunities
  const totalOpps = await prisma.opportunity.count();
  const oppsWithSkills = await prisma.opportunity.count({
    where: { opportunitySkills: { some: {} } },
  });
  const oppsWithoutSkills = totalOpps - oppsWithSkills;

  console.log(`\n--- 2. Opportunities Summary ---`);
  console.log(`Total Opportunities: ${totalOpps}`);
  console.log(`With OpportunitySkills: ${oppsWithSkills}`);
  console.log(`Without OpportunitySkills: ${oppsWithoutSkills}`);

  // Fetch all opportunities with their skills
  const allOpps = await prisma.opportunity.findMany({
    include: {
      opportunitySkills: {
        include: { skill: true },
      },
    },
    orderBy: { postedDate: 'desc' },
  });

  console.log(`\n--- 3. Detailed Opportunity Inspection (Structured: ${oppsWithSkills}) ---`);
  const structuredOpps = allOpps.filter(o => o.opportunitySkills.length > 0);
  for (const opp of structuredOpps) {
    const req = opp.opportunitySkills.filter(os => os.requirementType === RequirementType.REQUIRED).map(os => os.skill.name);
    const pref = opp.opportunitySkills.filter(os => os.requirementType === RequirementType.PREFERRED).map(os => os.skill.name);
    console.log(`\n[${opp.id}] "${opp.title}" at "${opp.organization}" (Source: ${opp.source})`);
    console.log(`  Required Skills (${req.length}): [${req.join(', ')}]`);
    console.log(`  Preferred Skills (${pref.length}): [${pref.join(', ')}]`);

    // Calculate match for first user
    if (users[0]) {
      const evMap = (await matchingService.buildCandidateEvidenceMapByUserId(users[0].id)) || new Map();
      const match = matchingService.matchEvidenceToOpportunity(evMap, opp);
      console.log(`  Match for ${users[0].email}:`);
      console.log(`    score: ${match.score}% (hasStructuredRequirements: ${match.hasStructuredRequirements})`);
      console.log(`    requiredMatched (${match.requiredMatched.length}): [${match.requiredMatched.map(s => s.skillName).join(', ')}]`);
      console.log(`    requiredMissing (${match.requiredMissing.length}): [${match.requiredMissing.map(s => s.skillName).join(', ')}]`);
      console.log(`    preferredMatched (${match.preferredMatched.length}): [${match.preferredMatched.map(s => s.skillName).join(', ')}]`);
      console.log(`    preferredMissing (${match.preferredMissing.length}): [${match.preferredMissing.map(s => s.skillName).join(', ')}]`);
    }
  }

  // 4. Distribution of scores across all opportunities for users[0]
  if (users[0]) {
    const evMap = (await matchingService.buildCandidateEvidenceMapByUserId(users[0].id)) || new Map();
    let zeroCount = 0;
    let nonZeroCount = 0;
    let nullCount = 0;
    const nonZeroList: any[] = [];

    for (const opp of allOpps) {
      const match = matchingService.matchEvidenceToOpportunity(evMap, opp);
      if (match.score === null) nullCount++;
      else if (match.score === 0) zeroCount++;
      else {
        nonZeroCount++;
        nonZeroList.push({ id: opp.id, title: opp.title, org: opp.organization, score: match.score });
      }
    }

    console.log(`\n--- 4. Score Distribution for ${users[0].email} across ${allOpps.length} opportunities ---`);
    console.log(`Score is NULL (Unstructured): ${nullCount}`);
    console.log(`Score is 0%: ${zeroCount}`);
    console.log(`Score > 0%: ${nonZeroCount}`);
    console.log(`Non-zero sample matches:`, nonZeroList.slice(0, 10));
  }

  await prisma.$disconnect();
  await pool.end();
}

diagnose().catch(console.error);
