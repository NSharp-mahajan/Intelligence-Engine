import { Router, Response } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { MatchingService, SkillEvidence, MatchSummary } from '../services/matchingService';

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
  matchFilter: z.enum(['80_plus', '60_plus', '40_plus', 'below_40', 'unavailable']).optional(),
  sort: z.enum(['match_desc', 'match_asc', 'posted_desc']).optional(),
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

    const {
      search,
      title,
      location,
      type,
      workMode,
      employmentType,
      experienceLevel,
      source,
      skill,
      matchFilter,
      sort,
      page = 1,
      limit = 20,
    } = parsed.data;

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

    // Optional match summary resolution for authenticated user with profile
    let evidenceMap: Map<string, SkillEvidence[]> | null = null;
    const matchingService = new MatchingService(prisma);

    try {
      const auth = getAuth(req);
      if (auth && auth.userId) {
        const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } });
        if (user) {
          evidenceMap = await matchingService.buildCandidateEvidenceMapByUserId(user.id);
        }
      }
    } catch {
      evidenceMap = null;
    }

    const isMatchFilteredOrSorted = Boolean(matchFilter || (sort && sort !== 'posted_desc'));

    let finalOpportunities: any[] = [];
    let totalCount = 0;

    if (isMatchFilteredOrSorted) {
      const allMatchingOpps = await prisma.opportunity.findMany({
        where,
        include: {
          opportunitySkills: {
            include: {
              skill: true,
            },
          },
        },
        orderBy: [
          { postedDate: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      });

      let oppsWithMatch = allMatchingOpps.map(opp => {
        let matchSummary: MatchSummary | null = null;
        if (evidenceMap) {
          const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
          matchSummary = matchingService.getMatchSummary(matchResult);
        }
        return {
          ...opp,
          match: matchSummary,
        };
      });

      // Apply matchFilter
      if (matchFilter) {
        oppsWithMatch = oppsWithMatch.filter(opp => {
          const score = opp.match?.score;
          const isStructured = opp.match?.hasStructuredRequirements === true && typeof score === 'number';

          if (matchFilter === 'unavailable') {
            return !isStructured;
          }

          if (!isStructured || typeof score !== 'number') {
            return false;
          }

          switch (matchFilter) {
            case '80_plus':
              return score >= 80;
            case '60_plus':
              return score >= 60;
            case '40_plus':
              return score >= 40;
            case 'below_40':
              return score < 40;
            default:
              return true;
          }
        });
      }

      // Apply sort
      if (sort === 'match_desc' || sort === 'match_asc') {
        oppsWithMatch.sort((a, b) => {
          const scoreA = a.match?.score;
          const scoreB = b.match?.score;

          const hasA = a.match?.hasStructuredRequirements === true && scoreA !== null;
          const hasB = b.match?.hasStructuredRequirements === true && scoreB !== null;

          if (hasA && hasB) {
            if (scoreA !== scoreB) {
              return sort === 'match_desc' ? scoreB! - scoreA! : scoreA! - scoreB!;
            }
          } else if (hasA && !hasB) {
            return -1;
          } else if (!hasA && hasB) {
            return 1;
          }

          const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;

          return a.id.localeCompare(b.id);
        });
      }

      totalCount = oppsWithMatch.length;
      finalOpportunities = oppsWithMatch.slice((page - 1) * limit, page * limit);
    } else {
      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          include: {
            opportunitySkills: {
              include: {
                skill: true,
              },
            },
          },
          orderBy: [
            { postedDate: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.opportunity.count({ where }),
      ]);

      totalCount = total;

      finalOpportunities = opportunities.map(opp => {
        let matchSummary: MatchSummary | null = null;
        if (evidenceMap) {
          const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
          matchSummary = matchingService.getMatchSummary(matchResult);
        }
        return {
          ...opp,
          match: matchSummary,
        };
      });
    }

    res.json({
      opportunities: finalOpportunities,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
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
