import { Skill, SkillCategory } from '@prisma/client';
import { SKILL_VOCABULARY } from '../services/opportunitySkillExtractor';

/**
 * Normalizes any raw skill name (e.g. "machine learning", "react.js", "NodeJS", "postgres")
 * to its canonical name and category based on SKILL_VOCABULARY.
 */
export function normalizeSkillName(rawName: string): { canonicalName: string; category: SkillCategory } {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { canonicalName: rawName, category: 'TOOL' };
  }

  // 1. Check against SKILL_VOCABULARY definitions
  for (const def of SKILL_VOCABULARY) {
    // Exact canonical name match (case-insensitive)
    if (def.name.toLowerCase() === trimmed.toLowerCase()) {
      return { canonicalName: def.name, category: def.category };
    }
    // Pattern / Alias match
    for (const pattern of def.patterns) {
      if (pattern.test(trimmed)) {
        return { canonicalName: def.name, category: def.category };
      }
    }
  }

  // 2. Fallback for custom skills not in SKILL_VOCABULARY:
  // Title-case or clean trimmed string
  return { canonicalName: trimmed, category: 'TOOL' };
}

/**
 * Finds or creates a canonical Skill record in the database.
 * Prevents case differences and alias variations from creating duplicate Skill rows.
 */
export async function findOrCreateCanonicalSkill(
  prismaOrTx: any,
  rawName: string,
  categoryOverride?: SkillCategory
): Promise<Skill> {
  const { canonicalName, category } = normalizeSkillName(rawName);
  const finalCategory = categoryOverride || category;

  // 1. Exact match on canonical name
  let skill = await prismaOrTx.skill.findUnique({
    where: { name: canonicalName },
  });

  if (skill) {
    return skill;
  }

  // 2. Case-insensitive lookup for canonicalName
  skill = await prismaOrTx.skill.findFirst({
    where: {
      name: {
        equals: canonicalName,
        mode: 'insensitive',
      },
    },
  });

  if (skill) {
    if (skill.name !== canonicalName) {
      return await prismaOrTx.skill.update({
        where: { id: skill.id },
        data: { name: canonicalName, category: finalCategory },
      });
    }
    return skill;
  }

  // 3. Case-insensitive lookup for rawName
  skill = await prismaOrTx.skill.findFirst({
    where: {
      name: {
        equals: rawName.trim(),
        mode: 'insensitive',
      },
    },
  });

  if (skill) {
    return await prismaOrTx.skill.update({
      where: { id: skill.id },
      data: { name: canonicalName, category: finalCategory },
    });
  }

  // 4. Create new canonical Skill
  try {
    return await prismaOrTx.skill.create({
      data: {
        name: canonicalName,
        category: finalCategory,
      },
    });
  } catch {
    const existing = await prismaOrTx.skill.findFirst({
      where: {
        name: {
          equals: canonicalName,
          mode: 'insensitive',
        },
      },
    });
    if (existing) return existing;
    throw new Error(`Failed to create or find skill: ${canonicalName}`);
  }
}
