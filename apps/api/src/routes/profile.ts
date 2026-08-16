import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  university: z.string().min(1, 'University is required').trim(),
  graduationYear: z.number().int().min(1950).max(2100),
  targetRole: z.string().min(1, 'Target role is required').trim(),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

// GET /api/profile
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/profile (also used for creation during onboarding)
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
      return;
    }

    const { fullName, university, graduationYear, targetRole, githubUrl, linkedinUrl, portfolioUrl } = parsed.data;

    const profileData = {
      fullName,
      university,
      graduationYear,
      targetRole,
      githubUrl: githubUrl || null,
      linkedinUrl: linkedinUrl || null,
      portfolioUrl: portfolioUrl || null,
    };

    const profile = await prisma.profile.upsert({
      where: { userId: req.userId! },
      update: profileData,
      create: {
        userId: req.userId!,
        ...profileData,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
