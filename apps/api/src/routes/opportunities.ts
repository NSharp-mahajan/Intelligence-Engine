import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { MatchingService } from '../services/matchingService';

const router = Router();

// GET /api/opportunities - List opportunities with filtering and pagination
const listQuerySchema = z.object({
  search: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['INTERNSHIP', 'JOB', 'HACKATHON', 'WORKSHOP', 'OPEN_SOURCE', 'MICRO_INTERNSHIP']).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'UNKNOWN']).optional(),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'UNKNOWN']).optional(),
  source: z.string().optional(),
  skill: z.string().optional(),
  page: z.string().optional().transform(val => (val ? Number(val) : 1)).pipe(z.number().int().positive()),
  limit: z.string().optional().transform(val => (val ? Number(val) : 20)).pipe(z.number().int().positive().max(100)),
});

router.get('/', async (req: any, res: Response) => {
  try {
    // Handle potential array values from query params
    const normalizedQuery: any = {};
    for (const [key, value] of Object.entries(req.query)) {
      normalizedQuery[key] = Array.isArray(value) ? value[0] : value;
    }

    const parsed = listQuerySchema.safeParse(normalizedQuery);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: parsed.error.format() } });
      return;
    }

    const { search, title, location, type, workMode, employmentType, experienceLevel, source, skill, page = 1, limit = 20 } = parsed.data;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } }
      ];
    } else if (title) {
      where.title = { contains: title, mode: 'insensitive' };
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (type) {
      where.type = type;
    }

    if (workMode) {
      where.workMode = workMode;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    if (source) {
      where.source = source;
    }

    if (skill) {
      where.opportunitySkills = {
        some: {
          skill: {
            name: { contains: skill, mode: 'insensitive' }
          }
        }
      };
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          opportunitySkills: {
            include: {
              skill: true
            }
          }
        },
        orderBy: [
          { postedDate: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    res.json({
      opportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/opportunities/:opportunityId - Get single opportunity by ID
router.get('/:opportunityId', async (req: any, res: Response) => {
  try {
    const { opportunityId } = req.params;
    const id = Array.isArray(opportunityId) ? opportunityId[0] : opportunityId;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        opportunitySkills: {
          include: {
            skill: true
          }
        }
      },
    });

    if (!opportunity) {
      res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
      return;
    }

    res.json({ opportunity });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/opportunities/:opportunityId/match - Get match result for authenticated user
router.get('/:opportunityId/match', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { opportunityId } = req.params;
    const id = Array.isArray(opportunityId) ? opportunityId[0] : opportunityId;

    // Resolve user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found. Please create a profile first.' } });
      return;
    }

    // Verify opportunity exists
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
      return;
    }

    // Call matching service
    const matchingService = new MatchingService(prisma);
    const matchResult = await matchingService.matchCandidateToOpportunity(profile.id, id);

    // Convert Map to plain object for JSON serialization
    const response = {
      ...matchResult,
      evidence: Object.fromEntries(matchResult.evidence),
    };

    res.json(response);
  } catch (error) {
    console.error('Match opportunity error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
