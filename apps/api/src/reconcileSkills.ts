import 'dotenv/config';
import { prisma } from './lib/prisma';
import { normalizeSkillName } from './lib/skillNormalizer';
import { RequirementType } from '@prisma/client';

export async function reconcileSkills() {
  console.log('=== Starting Skill Reconciliation ===\n');

  const allSkills = await prisma.skill.findMany();
  console.log(`Found ${allSkills.length} total Skill records in database.`);

  // Group skills by canonical name
  const groups = new Map<string, typeof allSkills>();

  for (const skill of allSkills) {
    const { canonicalName } = normalizeSkillName(skill.name);
    if (!groups.has(canonicalName)) {
      groups.set(canonicalName, []);
    }
    groups.get(canonicalName)!.push(skill);
  }

  let duplicateSkillsCount = 0;
  let candidateSkillsUpdated = 0;
  let candidateSkillsDeleted = 0;
  let projectSkillsUpdated = 0;
  let projectSkillsDeleted = 0;
  let opportunitySkillsUpdated = 0;
  let opportunitySkillsDeleted = 0;

  for (const [canonicalName, skills] of groups.entries()) {
    const { category: canonicalCategory } = normalizeSkillName(canonicalName);

    // Pick target skill (prefer one with name exact match, or first)
    let targetSkill = skills.find(s => s.name === canonicalName);
    if (!targetSkill) {
      targetSkill = skills[0];
      // Update targetSkill name to canonicalName
      targetSkill = await prisma.skill.update({
        where: { id: targetSkill.id },
        data: { name: canonicalName, category: canonicalCategory },
      });
    } else if (targetSkill.category !== canonicalCategory) {
      targetSkill = await prisma.skill.update({
        where: { id: targetSkill.id },
        data: { category: canonicalCategory },
      });
    }

    const duplicateSkills = skills.filter(s => s.id !== targetSkill!.id);
    if (duplicateSkills.length === 0) continue;

    console.log(`\nReconciling canonical skill "${canonicalName}" (Target ID: ${targetSkill.id}):`);
    console.log(`  Duplicates to merge: ${duplicateSkills.map(d => `"${d.name}" (${d.id})`).join(', ')}`);

    for (const dup of duplicateSkills) {
      duplicateSkillsCount++;

      // 1. Reconcile CandidateSkills
      const candidateSkills = await prisma.candidateSkill.findMany({
        where: { skillId: dup.id },
      });

      for (const cs of candidateSkills) {
        const existingTargetCS = await prisma.candidateSkill.findUnique({
          where: {
            profileId_skillId: {
              profileId: cs.profileId,
              skillId: targetSkill.id,
            },
          },
        });

        if (existingTargetCS) {
          // Candidate already has targetSkill, delete duplicate relationship
          await prisma.candidateSkill.delete({
            where: {
              profileId_skillId: {
                profileId: cs.profileId,
                skillId: dup.id,
              },
            },
          });
          candidateSkillsDeleted++;
        } else {
          // Re-link candidate skill to targetSkill
          await prisma.candidateSkill.update({
            where: {
              profileId_skillId: {
                profileId: cs.profileId,
                skillId: dup.id,
              },
            },
            data: { skillId: targetSkill.id },
          });
          candidateSkillsUpdated++;
        }
      }

      // 2. Reconcile ProjectSkills
      const projectSkills = await prisma.projectSkill.findMany({
        where: { skillId: dup.id },
      });

      for (const ps of projectSkills) {
        const existingTargetPS = await prisma.projectSkill.findUnique({
          where: {
            projectId_skillId: {
              projectId: ps.projectId,
              skillId: targetSkill.id,
            },
          },
        });

        if (existingTargetPS) {
          await prisma.projectSkill.delete({
            where: {
              projectId_skillId: {
                projectId: ps.projectId,
                skillId: dup.id,
              },
            },
          });
          projectSkillsDeleted++;
        } else {
          await prisma.projectSkill.update({
            where: {
              projectId_skillId: {
                projectId: ps.projectId,
                skillId: dup.id,
              },
            },
            data: { skillId: targetSkill.id },
          });
          projectSkillsUpdated++;
        }
      }

      // 3. Reconcile OpportunitySkills
      const opportunitySkills = await prisma.opportunitySkill.findMany({
        where: { skillId: dup.id },
      });

      for (const os of opportunitySkills) {
        const existingTargetOS = await prisma.opportunitySkill.findUnique({
          where: {
            opportunityId_skillId: {
              opportunityId: os.opportunityId,
              skillId: targetSkill.id,
            },
          },
        });

        if (existingTargetOS) {
          if (os.requirementType === RequirementType.REQUIRED && existingTargetOS.requirementType !== RequirementType.REQUIRED) {
            await prisma.opportunitySkill.update({
              where: {
                opportunityId_skillId: {
                  opportunityId: os.opportunityId,
                  skillId: targetSkill.id,
                },
              },
              data: { requirementType: RequirementType.REQUIRED },
            });
          }
          await prisma.opportunitySkill.delete({
            where: {
              opportunityId_skillId: {
                opportunityId: os.opportunityId,
                skillId: dup.id,
              },
            },
          });
          opportunitySkillsDeleted++;
        } else {
          await prisma.opportunitySkill.update({
            where: {
              opportunityId_skillId: {
                opportunityId: os.opportunityId,
                skillId: dup.id,
              },
            },
            data: { skillId: targetSkill.id },
          });
          opportunitySkillsUpdated++;
        }
      }

      // 4. Safely delete duplicate Skill record
      await prisma.skill.delete({
        where: { id: dup.id },
      });
    }
  }

  const remainingSkillsCount = await prisma.skill.count();

  console.log('\n=== Reconciliation Summary Report ===');
  console.log(`Initial Skill Records      : ${allSkills.length}`);
  console.log(`Duplicate Skill Records    : ${duplicateSkillsCount}`);
  console.log(`Remaining Skill Records    : ${remainingSkillsCount}`);
  console.log(`CandidateSkills Updated    : ${candidateSkillsUpdated} (Deleted duplicate refs: ${candidateSkillsDeleted})`);
  console.log(`ProjectSkills Updated      : ${projectSkillsUpdated} (Deleted duplicate refs: ${projectSkillsDeleted})`);
  console.log(`OpportunitySkills Updated  : ${opportunitySkillsUpdated} (Deleted duplicate refs: ${opportunitySkillsDeleted})`);
  console.log('\n=== Skill Reconciliation Complete ===');
}

async function main() {
  try {
    await reconcileSkills();
  } catch (error) {
    console.error('Reconciliation error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
