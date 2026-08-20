import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import projectRoutes from './projects';
import profileSkillsRoutes from './profileSkills';

const router = Router();

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  university: z.string().min(1, 'University is required').trim().nullable().optional(),
  graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
  targetRole: z.string().min(1, 'Target role is required').trim().nullable().optional(),
  githubUrl: z.string().url().optional().or(z.literal('')).nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal('')).nullable(),
  portfolioUrl: z.string().url().optional().or(z.literal('')).nullable(),
});

// GET /api/profile
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: {
        candidateSkills: {
          include: { skill: true }
        },
        projects: {
          include: { projectSkills: { include: { skill: true } } }
        }
      }
    });

    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/profile
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (existing) {
      res.status(409).json({ error: { code: 'PROFILE_EXISTS', message: 'Profile already exists. Use PUT to update.' } });
      return;
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const { fullName, university, graduationYear, targetRole, githubUrl, linkedinUrl, portfolioUrl } = parsed.data;

    const profile = await prisma.profile.create({
      data: {
        userId: req.userId!,
        fullName,
        university: university || null,
        graduationYear: graduationYear || null,
        targetRole: targetRole || null,
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
      },
    });

    res.status(201).json({ profile });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PUT /api/profile
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!existing) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile has not been created yet.' } });
      return;
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const { fullName, university, graduationYear, targetRole, githubUrl, linkedinUrl, portfolioUrl } = parsed.data;

    const profile = await prisma.profile.update({
      where: { userId: req.userId! },
      data: {
        fullName,
        university: university || null,
        graduationYear: graduationYear || null,
        targetRole: targetRole || null,
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.use('/projects', requireAuth, projectRoutes);
router.use('/skills', requireAuth, profileSkillsRoutes);

export default router;
