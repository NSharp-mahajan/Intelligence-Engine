import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  githubUrl: z.string().url().optional().or(z.literal('')).nullable(),
  liveUrl: z.string().url().optional().or(z.literal('')).nullable(),
});

// GET /api/profile/projects
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    const projects = await prisma.project.findMany({
      where: { profileId: profile.id },
      include: {
        projectSkills: {
          include: { skill: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/profile/projects
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const { name, description, githubUrl, liveUrl } = parsed.data;

    const project = await prisma.project.create({
      data: {
        profileId: profile.id,
        name,
        description,
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
      },
      include: {
        projectSkills: {
          include: { skill: true }
        }
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/profile/projects/:projectId
router.get('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        projectSkills: {
          include: { skill: true }
        }
      }
    });

    if (!project || project.profileId !== profile.id) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' } });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /api/profile/projects/:projectId
router.put('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.profileId !== profile.id) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' } });
      return;
    }

    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const { name, description, githubUrl, liveUrl } = parsed.data;

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        name,
        description,
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
      },
      include: {
        projectSkills: {
          include: { skill: true }
        }
      }
    });

    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /api/profile/projects/:projectId
router.delete('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.profileId !== profile.id) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' } });
      return;
    }

    await prisma.project.delete({
      where: { id: project.id },
    });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/profile/projects/:projectId/skills
const projectSkillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').trim(),
  category: z.enum(['LANGUAGE', 'FRAMEWORK', 'TOOL', 'CONCEPT', 'SOFT_SKILL']).optional().default('TOOL')
});

router.post('/:projectId/skills', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.profileId !== profile.id) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' } });
      return;
    }

    const parsed = projectSkillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const normalizedSkillName = parsed.data.skillName.toLowerCase().trim();

    // Use transaction to ensure skill exists, then associate
    const projectSkill = await prisma.$transaction(async (tx) => {
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
      const existing = await tx.projectSkill.findUnique({
        where: {
          projectId_skillId: {
            projectId: project.id,
            skillId: skill.id
          }
        }
      });

      if (existing) {
        throw new Error('SKILL_ALREADY_EXISTS');
      }

      return tx.projectSkill.create({
        data: {
          projectId: project.id,
          skillId: skill.id
        },
        include: { skill: true }
      });
    });

    res.status(201).json({ projectSkill });
  } catch (error: any) {
    if (error.message === 'SKILL_ALREADY_EXISTS') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Skill is already associated with this project' } });
      return;
    }
    console.error('Add project skill error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /api/profile/projects/:projectId/skills/:skillId
router.delete('/:projectId/skills/:skillId', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project || project.profileId !== profile.id) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or unauthorized.' } });
      return;
    }

    const { skillId } = req.params;

    // Check if it exists
    const existing = await prisma.projectSkill.findUnique({
      where: {
        projectId_skillId: { projectId: project.id, skillId }
      }
    });

    if (!existing) {
      res.status(404).json({ error: { code: 'SKILL_NOT_FOUND', message: 'Skill association not found' } });
      return;
    }

    await prisma.projectSkill.delete({
      where: {
        projectId_skillId: { projectId: project.id, skillId }
      }
    });

    res.json({ success: true, message: 'Skill removed from project' });
  } catch (error) {
    console.error('Remove project skill error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
