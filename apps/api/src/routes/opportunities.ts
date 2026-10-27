import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { MatchingService } from '../services/matchingService';
import { resolveCompanyLogoUrl } from '../services/companyLogoService';

const router = Router();

// GET /api/opportunities - List opportunities with filtering, matching intelligence, and pagination
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
  sort: z.string().optional(),
  excludeExpired: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

router.get('/', async (req: Request, res: Response) => {
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
      excludeExpired,
      page = 1,
      limit = 20,
    } = parsed.data;

    // Resolve optional candidate authentication
    let userId: string | null = (req as any).userId || null;
    if (!userId) {
      try {
        const auth = getAuth(req);
        if (auth && auth.userId) {
          const user = await prisma.user.findUnique({
            where: { clerkId: auth.userId },
            select: { id: true },
          });
          if (user) {
            userId = user.id;
          }
        }
      } catch {
        // Optional auth failure should not block public opportunity browsing
      }
    }

    const matchingService = new MatchingService(prisma);
    const evidenceMap = userId ? await matchingService.buildCandidateEvidenceMapByUserId(userId) : null;

    const where: any = {};
    const andConditions: any[] = [];

    const searchTerm = search || title;
    if (searchTerm) {
      andConditions.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { organization: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
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
      where.source = { equals: source, mode: 'insensitive' };
    }

    if (excludeExpired) {
      andConditions.push({
        OR: [
          { deadline: null },
          { deadline: { gte: new Date() } },
        ],
      });
    }

    if (skill) {
      where.opportunitySkills = {
        some: {
          skill: {
            name: { contains: skill, mode: 'insensitive' },
          },
        },
      };
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Branch 1: If candidate evidence is available AND client requests match-based filtering or sorting
    if (evidenceMap && (matchFilter || sort === 'match_desc' || sort === 'match_asc')) {
      const allOpps = await prisma.opportunity.findMany({
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

      let scoredOpps = allOpps.map((opp) => {
        const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
        return {
          ...opp,
          companyLogoUrl: resolveCompanyLogoUrl(opp.organization, opp.applicationUrl, opp.sourceUrl),
          match: matchingService.getMatchSummary(matchResult),
        };
      });

      if (matchFilter) {
        switch (matchFilter) {
          case '80_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match.hasStructuredRequirements && o.match.score !== null && o.match.score >= 80
            );
            break;
          case '60_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match.hasStructuredRequirements && o.match.score !== null && o.match.score >= 60
            );
            break;
          case '40_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match.hasStructuredRequirements && o.match.score !== null && o.match.score >= 40
            );
            break;
          case 'below_40':
            scoredOpps = scoredOpps.filter(
              (o) => o.match.hasStructuredRequirements && o.match.score !== null && o.match.score < 40
            );
            break;
          case 'unavailable':
            scoredOpps = scoredOpps.filter(
              (o) => !o.match.hasStructuredRequirements || o.match.score === null
            );
            break;
        }
      }

      if (sort === 'match_desc') {
        scoredOpps.sort((a, b) => {
          const scoreA = a.match.score ?? -1;
          const scoreB = b.match.score ?? -1;
          if (scoreB !== scoreA) return scoreB - scoreA;

          const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;

          return a.id.localeCompare(b.id);
        });
      } else if (sort === 'match_asc') {
        scoredOpps.sort((a, b) => {
          const scoreA = a.match.score !== null ? a.match.score : 999;
          const scoreB = b.match.score !== null ? b.match.score : 999;
          if (scoreA !== scoreB) return scoreA - scoreB;

          const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;

          return a.id.localeCompare(b.id);
        });
      }

      const total = scoredOpps.length;
      const paginatedOpps = scoredOpps.slice((page - 1) * limit, page * limit);

      res.json({
        opportunities: paginatedOpps,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
      return;
    }

    // Branch 2: Standard database sorting OR Balanced Source Discovery
    let opportunities: any[] = [];
    let total = 0;

    const isExplicitDateSort = sort === 'posted_asc' || sort === 'posted_desc';

    if (isExplicitDateSort) {
      const sortOrder: Prisma.SortOrder = sort === 'posted_asc' ? 'asc' : 'desc';
      const orderBy = { postedDate: sortOrder };
      const [opps, count] = await Promise.all([
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
            orderBy,
            { createdAt: sortOrder },
            { id: 'asc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.opportunity.count({ where }),
      ]);
      opportunities = opps;
      total = count;
    } else {
      // Default / "balanced": Balanced Round-Robin Feed across sources
      const sqlConditions: Prisma.Sql[] = [];
      if (searchTerm) {
        sqlConditions.push(Prisma.sql`("title" ILIKE ${'%' + searchTerm + '%'} OR "organization" ILIKE ${'%' + searchTerm + '%'})`);
      }
      if (location) {
        sqlConditions.push(Prisma.sql`"location" ILIKE ${'%' + location + '%'}`);
      }
      if (type) {
        sqlConditions.push(Prisma.sql`"type" = ${type}::"OpportunityType"`);
      }
      if (workMode) {
        sqlConditions.push(Prisma.sql`"workMode" = ${workMode}::"WorkMode"`);
      }
      if (employmentType) {
        sqlConditions.push(Prisma.sql`"employmentType" = ${employmentType}::"EmploymentType"`);
      }
      if (experienceLevel) {
        sqlConditions.push(Prisma.sql`"experienceLevel" = ${experienceLevel}::"ExperienceLevel"`);
      }
      if (source) {
        sqlConditions.push(Prisma.sql`"source" ILIKE ${source}`);
      }
      if (excludeExpired) {
        sqlConditions.push(Prisma.sql`("deadline" IS NULL OR "deadline" >= NOW())`);
      }
      if (skill) {
        sqlConditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM "OpportunitySkill" os
          JOIN "Skill" s ON os."skillId" = s."id"
          WHERE os."opportunityId" = "Opportunity"."id" AND s."name" ILIKE ${'%' + skill + '%'}
        )`);
      }

      const whereClause = sqlConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(sqlConditions, ' AND ')}`
        : Prisma.empty;

      const rankedQuery = Prisma.sql`
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY source
                   ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
                 ) as source_rank,
                 source
          FROM "Opportunity"
          ${whereClause}
        ) ranked
        ORDER BY source_rank ASC, source ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `;

      const [idRows, count] = await Promise.all([
        prisma.$queryRaw<Array<{ id: string }>>(rankedQuery),
        prisma.opportunity.count({ where }),
      ]);

      total = count;
      const ids = idRows.map((r) => r.id);

      if (ids.length > 0) {
        const opps = await prisma.opportunity.findMany({
          where: { id: { in: ids } },
          include: {
            opportunitySkills: {
              include: {
                skill: true,
              },
            },
          },
        });
        const idMap = new Map(opps.map((o) => [o.id, o]));
        opportunities = ids.map((id) => idMap.get(id)).filter(Boolean);
      } else {
        opportunities = [];
      }
    }

    const enrichedOpportunities = opportunities.map((opp) => {
      const companyLogoUrl = resolveCompanyLogoUrl(opp.organization, opp.applicationUrl, opp.sourceUrl);
      if (evidenceMap) {
        const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
        return {
          ...opp,
          companyLogoUrl,
          match: matchingService.getMatchSummary(matchResult),
        };
      }
      return {
        ...opp,
        companyLogoUrl,
        match: null,
      };
    });

    res.json({
      opportunities: enrichedOpportunities,
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

// GET /api/opportunities/:opportunityId/match - Calculate match for the authenticated candidate
router.get('/:opportunityId/match', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const opportunityId = String(req.params.opportunityId);

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        opportunitySkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!opportunity) {
      res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
      return;
    }

    const matchingService = new MatchingService(prisma);
    const evidenceMap = (await matchingService.buildCandidateEvidenceMapByUserId(req.userId!)) || new Map();
    const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opportunity);

    // Convert Map<string, SkillEvidence[]> to JSON-serializable Record<string, SkillEvidence[]>
    const evidenceObj: Record<string, any[]> = {};
    for (const [key, value] of matchResult.evidence.entries()) {
      evidenceObj[key] = value;
    }

    res.json({
      score: matchResult.score,
      requiredMatched: matchResult.requiredMatched,
      requiredMissing: matchResult.requiredMissing,
      preferredMatched: matchResult.preferredMatched,
      preferredMissing: matchResult.preferredMissing,
      evidence: evidenceObj,
      hasStructuredRequirements: matchResult.hasStructuredRequirements,
    });
  } catch (error) {
    console.error('Get opportunity match error:', error);
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

    res.json({
      opportunity: {
        ...opportunity,
        companyLogoUrl: resolveCompanyLogoUrl(opportunity.organization, opportunity.applicationUrl, opportunity.sourceUrl),
      },
    });
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
