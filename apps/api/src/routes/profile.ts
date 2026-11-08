import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { isProfileComplete } from '../lib/profileCompleteness';
import projectRoutes from './projects';
import profileSkillsRoutes from './profileSkills';

const router = Router();

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

const baseProfileFields = {
  fullName: z.string().min(1, 'Full name is required').trim(),
  university: optionalTrimmedString,
  graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
  targetRole: optionalTrimmedString,

  // M2.6: Academic Information
  degree: optionalTrimmedString,
  branch: optionalTrimmedString,
  cgpa: z.number().min(0, 'CGPA cannot be negative').nullable().optional(),
  cgpaScale: z.enum(['SCALE_10_0', 'SCALE_4_0', 'SCALE_7_0', 'SCALE_UNKNOWN']).nullable().optional(),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100').nullable().optional(),
  activeBacklogs: z.number().int('Active backlogs must be an integer').min(0, 'Active backlogs cannot be negative').nullable().optional(),
  hasBacklogHistory: z.boolean().nullable().optional(),

  // M2.6: Experience Information
  experienceMonths: z.number().int('Experience months must be an integer').min(0, 'Experience months cannot be negative').nullable().optional(),

  githubUrl: z.string().url().optional().or(z.literal('')).nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal('')).nullable(),
  portfolioUrl: z.string().url().optional().or(z.literal('')).nullable(),
};

function refineCgpaScale(data: any, ctx: z.RefinementCtx) {
  if (data.cgpa !== null && data.cgpa !== undefined) {
    if (!data.cgpaScale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cgpaScale'],
        message: 'CGPA scale must be selected when CGPA is entered',
      });
    } else if (data.cgpaScale === 'SCALE_4_0' && data.cgpa > 4.0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cgpa'],
        message: 'CGPA cannot exceed 4.0 for a 4-point scale',
      });
    } else if (data.cgpaScale === 'SCALE_7_0' && data.cgpa > 7.0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cgpa'],
        message: 'CGPA cannot exceed 7.0 for a 7-point scale',
      });
    } else if (data.cgpaScale === 'SCALE_10_0' && data.cgpa > 10.0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cgpa'],
        message: 'CGPA cannot exceed 10.0 for a 10-point scale',
      });
    }
  }
}

const profileCreateSchema = z.object({
  ...baseProfileFields,
}).superRefine(refineCgpaScale);

const profileUpdateSchema = z.object({
  ...baseProfileFields,
  fullName: z.string().min(1, 'Full name cannot be empty').trim().optional(),
}).superRefine(refineCgpaScale);

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

    res.json({ profile, profileComplete: isProfileComplete(profile) });
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

    const parsed = profileCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    const {
      fullName,
      university,
      graduationYear,
      targetRole,
      degree,
      branch,
      cgpa,
      cgpaScale,
      percentage,
      activeBacklogs,
      hasBacklogHistory,
      experienceMonths,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
    } = parsed.data;

    const profile = await prisma.profile.create({
      data: {
        userId: req.userId!,
        fullName,
        university: university ?? null,
        graduationYear: graduationYear ?? null,
        targetRole: targetRole ?? null,
        degree: degree ?? null,
        branch: branch ?? null,
        cgpa: cgpa ?? null,
        cgpaScale: cgpaScale ?? null,
        percentage: percentage ?? null,
        activeBacklogs: activeBacklogs ?? null,
        hasBacklogHistory: hasBacklogHistory ?? null,
        experienceMonths: experienceMonths ?? null,
        githubUrl: githubUrl ?? null,
        linkedinUrl: linkedinUrl ?? null,
        portfolioUrl: portfolioUrl ?? null,
      },
    });

    res.status(201).json({ profile, profileComplete: isProfileComplete(profile) });
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

    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
      return;
    }

    // Dynamic partial update:
    // - Omitted fields (undefined in parsed.data) are NOT present in updateData (preserved)
    // - Explicit null clears the field
    // - Values update the field
    const updateData: any = {};
    if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
    if (parsed.data.university !== undefined) updateData.university = parsed.data.university;
    if (parsed.data.graduationYear !== undefined) updateData.graduationYear = parsed.data.graduationYear;
    if (parsed.data.targetRole !== undefined) updateData.targetRole = parsed.data.targetRole;
    if (parsed.data.degree !== undefined) updateData.degree = parsed.data.degree;
    if (parsed.data.branch !== undefined) updateData.branch = parsed.data.branch;
    if (parsed.data.cgpa !== undefined) updateData.cgpa = parsed.data.cgpa;
    if (parsed.data.cgpaScale !== undefined) updateData.cgpaScale = parsed.data.cgpaScale;
    if (parsed.data.percentage !== undefined) updateData.percentage = parsed.data.percentage;
    if (parsed.data.activeBacklogs !== undefined) updateData.activeBacklogs = parsed.data.activeBacklogs;
    if (parsed.data.hasBacklogHistory !== undefined) updateData.hasBacklogHistory = parsed.data.hasBacklogHistory;
    if (parsed.data.experienceMonths !== undefined) updateData.experienceMonths = parsed.data.experienceMonths;
    if (parsed.data.githubUrl !== undefined) updateData.githubUrl = parsed.data.githubUrl;
    if (parsed.data.linkedinUrl !== undefined) updateData.linkedinUrl = parsed.data.linkedinUrl;
    if (parsed.data.portfolioUrl !== undefined) updateData.portfolioUrl = parsed.data.portfolioUrl;

    const profile = await prisma.profile.update({
      where: { userId: req.userId! },
      data: updateData,
    });

    res.json({ profile, profileComplete: isProfileComplete(profile) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.use('/projects', requireAuth, projectRoutes);
router.use('/skills', requireAuth, profileSkillsRoutes);

export default router;
