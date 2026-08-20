import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/profile/skills (Retrieve candidate skills)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { profileId: profile.id },
      include: {
        skill: true
      }
    });

    res.json({ candidateSkills });
  } catch (error) {
    console.error('Get profile skills error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

const candidateSkillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').trim(),
  category: z.enum(['LANGUAGE', 'FRAMEWORK', 'TOOL', 'CONCEPT', 'SOFT_SKILL']).optional().default('TOOL'),
  proficiency: z.string().optional().nullable()
});

// POST /api/profile/skills (Add skill to candidate)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    const parsed = candidateSkillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const normalizedSkillName = parsed.data.skillName.toLowerCase().trim();

    // Use transaction to ensure skill exists, then associate
    const candidateSkill = await prisma.$transaction(async (tx) => {
      let skill = await tx.skill.findUnique({ where: { name: normalizedSkillName } });
      if (!skill) {
        skill = await tx.skill.create({
          data: {
            name: normalizedSkillName,
            category: parsed.data.category,
          }
        });
      }

      // Check if association already exists
      const existing = await tx.candidateSkill.findUnique({
        where: {
          profileId_skillId: {
            profileId: profile.id,
            skillId: skill.id
          }
        }
      });

      if (existing) {
        throw new Error('SKILL_ALREADY_EXISTS');
      }

      return tx.candidateSkill.create({
        data: {
          profileId: profile.id,
          skillId: skill.id,
          proficiency: parsed.data.proficiency || null
        },
        include: { skill: true }
      });
    });

    res.status(201).json({ candidateSkill });
  } catch (error: any) {
    if (error.message === 'SKILL_ALREADY_EXISTS') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Skill is already associated with this profile' } });
      return;
    }
    console.error('Add candidate skill error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /api/profile/skills/:skillId
router.delete('/:skillId', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const { skillId } = req.params;

    // Check if it exists
    const existing = await prisma.candidateSkill.findUnique({
      where: {
        profileId_skillId: { profileId: profile.id, skillId }
      }
    });

    if (!existing) {
      res.status(404).json({ error: { code: 'SKILL_NOT_FOUND', message: 'Skill association not found' } });
      return;
    }

    await prisma.candidateSkill.delete({
      where: {
        profileId_skillId: { profileId: profile.id, skillId }
      }
    });

    res.json({ success: true, message: 'Skill removed from profile' });
  } catch (error) {
    console.error('Remove candidate skill error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
