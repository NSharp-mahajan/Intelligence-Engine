import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const DEV_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/intelligence_engine?schema=public';

async function checkSkills() {
  const pool = new pg.Pool({ connectionString: DEV_DB_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  console.log(`Total Skill rows in DB: ${skills.length}`);

  const byNormalized = new Map<string, Array<{ id: string; name: string }>>();
  for (const s of skills) {
    const norm = s.name.toLowerCase().trim().replace(/[-_.]/g, '');
    if (!byNormalized.has(norm)) byNormalized.set(norm, []);
    byNormalized.get(norm)!.push(s);
  }

  console.log('\n--- Skill Name Overlaps / Case / Alias Duplicates ---');
  let duplicateCount = 0;
  for (const [norm, records] of byNormalized.entries()) {
    if (records.length > 1) {
      duplicateCount++;
      console.log(`Key "${norm}":`, records);
    }
  }
  console.log(`Total duplicate skill groups: ${duplicateCount}`);

  // Now check candidate skills vs opportunity skills:
  const candidate = await prisma.user.findFirst({
    where: { email: 'mahajannatansh@gmail.com' },
    include: {
      profile: {
        include: {
          candidateSkills: { include: { skill: true } },
          projects: { include: { projectSkills: { include: { skill: true } } } },
        },
      },
    },
  });

  const candidateSkillNames = new Set<string>();
  const candidateSkillIds = new Set<string>();
  if (candidate?.profile) {
    for (const cs of candidate.profile.candidateSkills) {
      candidateSkillNames.add(cs.skill.name.toLowerCase().trim());
      candidateSkillIds.add(cs.skillId);
    }
    for (const p of candidate.profile.projects) {
      for (const ps of p.projectSkills) {
        candidateSkillNames.add(ps.skill.name.toLowerCase().trim());
        candidateSkillIds.add(ps.skillId);
      }
    }
  }

  console.log(`\nCandidate has ${candidateSkillIds.size} unique skill IDs and ${candidateSkillNames.size} unique skill names.`);

  // Check every opportunitySkill in DB:
  const allOppSkills = await prisma.opportunitySkill.findMany({
    include: { skill: true, opportunity: true },
  });

  console.log(`Total OpportunitySkill relations in DB: ${allOppSkills.length}`);

  let exactIdMatches = 0;
  let nameMatches = 0;
  let nameMatchesDifferentId = 0;

  for (const os of allOppSkills) {
    const oppSkillNameNorm = os.skill.name.toLowerCase().trim();
    const hasSameId = candidateSkillIds.has(os.skillId);
    const hasSameName = candidateSkillNames.has(oppSkillNameNorm);

    if (hasSameId) exactIdMatches++;
    if (hasSameName) nameMatches++;
    if (hasSameName && !hasSameId) {
      nameMatchesDifferentId++;
      console.log(`MISMATCH: Opportunity "${os.opportunity.title}" requires "${os.skill.name}" (skillId: ${os.skillId}), but candidate has same name with different skillId!`);
    }
  }

  console.log(`Exact skillId matches: ${exactIdMatches}`);
  console.log(`Name matches (case-insensitive): ${nameMatches}`);
  console.log(`Name matches with DIFFERENT skillId: ${nameMatchesDifferentId}`);

  await prisma.$disconnect();
  await pool.end();
}

checkSkills().catch(console.error);
