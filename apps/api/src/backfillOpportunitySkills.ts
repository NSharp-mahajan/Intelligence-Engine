import 'dotenv/config';
import { prisma } from './lib/prisma';
import { extractOpportunitySkills, SKILL_VOCABULARY } from './services/opportunitySkillExtractor';
import { RequirementType } from '@prisma/client';

async function main() {
  console.log('=== Starting Opportunity Skill Backfill Pipeline ===\n');

  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${opportunities.length} total opportunities in database.`);

    let totalProcessed = 0;
    let hasSkillsCount = 0;
    let noSkillsCount = 0;
    let totalOpportunitySkillsCreated = 0;
    let requiredCount = 0;
    let preferredCount = 0;

    const categoryMap = new Map(SKILL_VOCABULARY.map(def => [def.name, def.category]));

    const samples: Array<{
      title: string;
      requiredSkills: string[];
      preferredSkills: string[];
    }> = [];

    for (const opp of opportunities) {
      totalProcessed++;

      const extraction = extractOpportunitySkills(opp.title, opp.description);

      const hasSkills = extraction.skills.length > 0;
      if (hasSkills) {
        hasSkillsCount++;
      } else {
        noSkillsCount++;
      }

      if (samples.length < 5 && hasSkills) {
        samples.push({
          title: opp.title,
          requiredSkills: extraction.requiredSkills,
          preferredSkills: extraction.preferredSkills,
        });
      }

      for (const item of extraction.skills) {
        const category = categoryMap.get(item.name) || 'TOOL';

        // Find or create Skill record
        const skill = await prisma.skill.upsert({
          where: { name: item.name },
          update: {},
          create: {
            name: item.name,
            category,
          },
        });

        // Find or upsert OpportunitySkill record
        await prisma.opportunitySkill.upsert({
          where: {
            opportunityId_skillId: {
              opportunityId: opp.id,
              skillId: skill.id,
            },
          },
          update: {
            requirementType: item.requirementType,
          },
          create: {
            opportunityId: opp.id,
            skillId: skill.id,
            requirementType: item.requirementType,
          },
        });

        totalOpportunitySkillsCreated++;
        if (item.requirementType === RequirementType.REQUIRED) {
          requiredCount++;
        } else {
          preferredCount++;
        }
      }
    }

    console.log('\n=== Backfill Summary Report ===');
    console.log(`Total Opportunities Processed : ${totalProcessed}`);
    console.log(`With >= 1 Extracted Skill     : ${hasSkillsCount}`);
    console.log(`With 0 Extracted Skills       : ${noSkillsCount}`);
    console.log(`Total OpportunitySkill Rows   : ${totalOpportunitySkillsCreated}`);
    console.log(`  - REQUIRED Count           : ${requiredCount}`);
    console.log(`  - PREFERRED Count          : ${preferredCount}`);

    console.log('\n=== 5 Representative Examples ===');
    samples.forEach((sample, idx) => {
      console.log(`\n[Example ${idx + 1}]`);
      console.log(`Title            : ${sample.title}`);
      console.log(`Required Skills  : ${sample.requiredSkills.join(', ') || '(None)'}`);
      console.log(`Preferred Skills : ${sample.preferredSkills.join(', ') || '(None)'}`);
    });

  } catch (error) {
    console.error('Backfill error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
