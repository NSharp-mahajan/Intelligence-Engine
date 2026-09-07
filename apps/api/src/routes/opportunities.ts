import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/opportunities - List opportunities with filtering and pagination
const listQuerySchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['INTERNSHIP', 'JOB', 'HACKATHON', 'WORKSHOP', 'OPEN_SOURCE', 'MICRO_INTERNSHIP']).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'UNKNOWN']).optional(),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'UNKNOWN']).optional(),
  source: z.string().optional(),
  skill: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

router.get('/', async (req: any, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: parsed.error.format() } });
      return;
    }

    const { title, location, type, workMode, employmentType, experienceLevel, source, skill, page = 1, limit = 20 } = parsed.data;

    const where: any = {};

    if (title) {
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
        orderBy: { postedDate: 'desc' },
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

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
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

export default router;
