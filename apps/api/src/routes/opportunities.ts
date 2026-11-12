import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';
import { MatchingService } from '../services/matchingService';
import { resolveCompanyLogoUrl } from '../services/companyLogoService';
import {
  IndiaLocationClassifier,
  OVERSEAS_LOCATION_SQL_PATTERN,
  OVERSEAS_RESTRICTIONS_SQL_PATTERN,
  INDIA_TECH_HUBS_SQL_PATTERN,
  getOpportunityGeographicScope,
  detectVisaSponsorship,
} from '../services/indiaLocationClassifier';
import { interleaveOpportunitiesByEmployer } from '../services/employerInterleaving';
import { earlyCareerClassifier } from '../services/earlyCareerClassifier';
import { candidateEligibilityEvaluator } from '../services/candidateEligibilityEvaluator';
import {
  classifyJobFamily,
  isSoftwareEngineeringRole,
  isProductDesignRole,
  isDataAnalyticsRole,
  isOperationsBusinessRole,
  classifyEngineeringSubFamily,
  EngineeringSubFamily,
} from '../services/jobFamilyClassifier';
import { isValidHttpUrl } from '../lib/opportunityProvider';
import { isProfileComplete } from '../lib/profileCompleteness';
import {
  getNonTestOpportunityWhere,
  getNonTestOpportunitySqlCondition,
  EXCLUDED_TEST_SOURCES,
  EXCLUDED_TEST_ORGS,
} from '../lib/opportunityFilters';

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
  jobFamily: z.enum(['SOFTWARE_ENGINEERING', 'PRODUCT_DESIGN', 'DATA_ANALYTICS', 'OPERATIONS_BUSINESS', 'ALL']).optional(),
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

    if (normalizedQuery.jobFamily) {
      normalizedQuery.jobFamily = normalizedQuery.jobFamily.toUpperCase();
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
      jobFamily,
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
    const andConditions: any[] = [getNonTestOpportunityWhere()];

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

      if (jobFamily === 'SOFTWARE_ENGINEERING') {
        scoredOpps = scoredOpps.filter((opp) => isSoftwareEngineeringRole(opp));
      } else if (jobFamily === 'PRODUCT_DESIGN') {
        scoredOpps = scoredOpps.filter((opp) => isProductDesignRole(opp));
      } else if (jobFamily === 'DATA_ANALYTICS') {
        scoredOpps = scoredOpps.filter((opp) => isDataAnalyticsRole(opp));
      } else if (jobFamily === 'OPERATIONS_BUSINESS') {
        scoredOpps = scoredOpps.filter((opp) => isOperationsBusinessRole(opp));
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
      const sqlConditions: Prisma.Sql[] = [getNonTestOpportunitySqlCondition()];
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

// GET /api/opportunities/india - Dedicated India Opportunities Feed
const indiaListQuerySchema = z.object({
  city: z.enum(['Bengaluru', 'Hyderabad', 'Pune', 'Delhi-NCR', 'Mumbai', 'Chennai', 'All']).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']).optional(),
  stage: z.enum(['INTERNSHIP', 'ENTRY', 'ALL']).optional(),
  search: z.string().optional(),
  skill: z.string().optional(),
  jobFamily: z.enum(['SOFTWARE_ENGINEERING', 'PRODUCT_DESIGN', 'DATA_ANALYTICS', 'OPERATIONS_BUSINESS', 'ALL']).optional(),
  matchFilter: z.enum(['80_plus', '60_plus', '40_plus', 'below_40', 'unavailable']).optional(),
  sort: z.enum(['balanced', 'posted_desc', 'posted_asc', 'match_desc', 'match_asc', '']).optional(),
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

function normalizeCityQuery(rawCity?: string): string | undefined {
  if (!rawCity) return undefined;
  const trimmed = rawCity.trim().toLowerCase();
  if (!trimmed || trimmed === 'all') return 'All';
  if (['bengaluru', 'bangalore', 'bengaluru-vtp', 'bengaluru vtp'].includes(trimmed)) return 'Bengaluru';
  if (['hyderabad', 'secunderabad', 'cyberabad'].includes(trimmed)) return 'Hyderabad';
  if (['pune', 'poona'].includes(trimmed)) return 'Pune';
  if (['delhi-ncr', 'delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'greater noida', 'faridabad', 'ghaziabad', 'ncr'].includes(trimmed)) return 'Delhi-NCR';
  if (['mumbai', 'bombay', 'navi mumbai', 'thane'].includes(trimmed)) return 'Mumbai';
  if (['chennai', 'madras'].includes(trimmed)) return 'Chennai';
  return rawCity; // Pass raw value so Zod enum will reject unrecognized cities with 400 VALIDATION_ERROR
}

router.get('/india', async (req: Request, res: Response) => {
  try {
    const normalizedQuery: any = {};
    for (const [key, value] of Object.entries(req.query)) {
      normalizedQuery[key] = Array.isArray(value) ? value[0] : value;
    }

    if (normalizedQuery.city) {
      normalizedQuery.city = normalizeCityQuery(normalizedQuery.city);
    }
    if (normalizedQuery.jobFamily) {
      normalizedQuery.jobFamily = normalizedQuery.jobFamily.toUpperCase();
    }

    const parsed = indiaListQuerySchema.safeParse(normalizedQuery);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const {
      city,
      workMode,
      stage,
      search,
      skill,
      jobFamily,
      matchFilter,
      sort,
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
        // Optional auth failure should not block public browsing
      }
    }

    const matchingService = new MatchingService(prisma);
    const evidenceMap = userId ? await matchingService.buildCandidateEvidenceMapByUserId(userId) : null;

    // Build SQL conditions for strict India eligibility & filtering
    const sqlConditions: Prisma.Sql[] = [getNonTestOpportunitySqlCondition()];

    // 1. Overseas exclusion (strictly disqualify non-India jobs)
    // Exclude overseas jurisdictions unless explicit India co-location is present in location header
    sqlConditions.push(Prisma.sql`NOT (
      COALESCE("location", '') ~* '\\y(United States|USA|U\\.S\\.A\\.|U\\.S\\.|US|United Kingdom|UK|U\\.K\\.|Great Britain|England|EMEA|LATAM|Europe|Americas|California|New York|San Francisco|London|Canada|Toronto|Vancouver|Seattle|Austin|Chicago|Boston|Berlin|Munich|Germany|France|Paris|Amsterdam|Netherlands|Dublin|Ireland|Singapore|Sydney|Melbourne|Australia|Tokyo|Japan|Warsaw|Poland|Brazil|Mexico|Spain|Madrid|Barcelona|Switzerland|Zurich|Israel|Tel Aviv|Belgrade|Serbia)\\y'
      AND NOT COALESCE("location", '') ~* '\\y(India)\\y'
    )`);

    // Exclude overseas residency, citizenship, clearance, and right-to-work clauses
    sqlConditions.push(Prisma.sql`NOT (
      COALESCE("description", '') ~* '\\y(us only|u\\.s\\. only|usa only|united states only|uk only|canada only|emea only|americas only|europe only|latam only|australia only|must reside in the (?:us|united states|uk|canada|eu|europe)|authorized to work in the (?:us|united states|uk|canada|eu)|us citizenship required|security clearance required|active ts/sci|right to work in the (?:uk|eu|united states))\\y'
    )`);

    // Exclude bare unanchored remote or unknown locations unless title specifies confirmed India hub
    sqlConditions.push(Prisma.sql`NOT (
      COALESCE("location", '') ~* '^(\\s*remote|\\s*unknown|\\s*telecommute)\\s*$'
      AND NOT COALESCE("title", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Gurgaon|Gurugram|Noida|Mumbai|Chennai)\\y'
    )`);

    // 2. City Filter Condition
    if (city && city !== 'All') {
      if (city === 'Bengaluru') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Bengaluru|Bangalore|Bengaluru-VTP)\\y' OR COALESCE("title", '') ~* '\\y(Bengaluru|Bangalore)\\y')`);
      } else if (city === 'Hyderabad') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Hyderabad|Secunderabad|Cyberabad)\\y' OR COALESCE("title", '') ~* '\\y(Hyderabad|Secunderabad|Cyberabad)\\y')`);
      } else if (city === 'Pune') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Pune|Poona)\\y' OR COALESCE("title", '') ~* '\\y(Pune|Poona)\\y')`);
      } else if (city === 'Delhi-NCR') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Delhi|New Delhi|Gurgaon|Gurugram|Noida|Greater Noida|Faridabad|Ghaziabad)\\y' OR COALESCE("title", '') ~* '\\y(Delhi|New Delhi|Gurgaon|Gurugram|Noida)\\y')`);
      } else if (city === 'Mumbai') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Mumbai|Bombay|Navi Mumbai|Thane)\\y' OR COALESCE("title", '') ~* '\\y(Mumbai|Bombay|Navi Mumbai|Thane)\\y')`);
      } else if (city === 'Chennai') {
        sqlConditions.push(Prisma.sql`(COALESCE("location", '') ~* '\\y(Chennai|Madras)\\y' OR COALESCE("title", '') ~* '\\y(Chennai|Madras)\\y')`);
      }
    } else {
      // General India Inclusion (must possess confirmed Indian city, state, or verified India remote presence)
      sqlConditions.push(Prisma.sql`(
        COALESCE("location", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Secunderabad|Cyberabad|Pune|Poona|Delhi|Gurgaon|Gurugram|Noida|Faridabad|Ghaziabad|Mumbai|Bombay|Navi Mumbai|Thane|Chennai|Madras|Kolkata|Calcutta|Ahmedabad|Gandhinagar|Kochi|Cochin|Ernakulam|Thiruvananthapuram|Trivandrum|Indore|Jaipur|Chandigarh|Mohali|Panchkula|Coimbatore|Bhubaneswar|Bhubaneshwar|Nagpur)\\y'
        OR COALESCE("title", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Gurgaon|Gurugram|Noida|Mumbai|Chennai)\\y'
        OR (COALESCE("location", '') ~* '\\y(Worldwide|Anywhere|Global Remote)\\y' AND COALESCE("description", '') ~* '\\y(India|Bengaluru|Bangalore|Hyderabad|Pune|Delhi|Mumbai|Chennai)\\y')
      )`);
    }

    // 3. WorkMode Filter Condition
    if (workMode) {
      sqlConditions.push(Prisma.sql`"workMode" = ${workMode}::"WorkMode"`);
    }

    // 4. Stage Filter Condition
    if (stage === 'INTERNSHIP') {
      sqlConditions.push(Prisma.sql`("type" = 'INTERNSHIP'::"OpportunityType" OR "employmentType" = 'INTERNSHIP'::"EmploymentType")`);
    } else if (stage === 'ENTRY') {
      sqlConditions.push(Prisma.sql`("experienceLevel" = 'ENTRY'::"ExperienceLevel" AND "type" != 'INTERNSHIP'::"OpportunityType" AND "employmentType" != 'INTERNSHIP'::"EmploymentType")`);
    }

    // 5. Search Filter Condition (Title or Organization)
    if (search && search.trim()) {
      const term = search.trim();
      sqlConditions.push(Prisma.sql`("title" ILIKE ${'%' + term + '%'} OR "organization" ILIKE ${'%' + term + '%'})`);
    }

    // 6. Skill Filter Condition
    if (skill && skill.trim()) {
      const skillTerm = skill.trim();
      sqlConditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "OpportunitySkill" os
        JOIN "Skill" s ON os."skillId" = s."id"
        WHERE os."opportunityId" = "Opportunity"."id" AND s."name" ILIKE ${'%' + skillTerm + '%'}
      )`);
    }

    // 7. Job Family Filter Condition
    if (jobFamily === 'SOFTWARE_ENGINEERING') {
      sqlConditions.push(Prisma.sql`"title" ~* '\\y(sde|swe|software|developer|engineer|fullstack|full-stack|frontend|front-end|backend|back-end|web dev|mobile dev|android|ios|devops|sre|platform engineer|infrastructure|systems engineer|qa automation|sdet|test automation|machine learning|data engineer|analytics engineer|ai engineer|data scientist)\\y'`);
      sqlConditions.push(Prisma.sql`"title" !~* '\\y(customer support|customer service|support specialist|technical support|helpdesk|service desk|business development|bdr|sdr|account executive|account manager|sales|marketing|copywriter|content writer|human resources|hr|recruiter|recruiting|talent acquisition|payroll|accounts payable|accounting|accountant|industrial trainee|commercial trainee|finance|financial|legal|compliance|procurement|facilities|office manager|receptionist|cashier|retail)\\y'`);
    } else if (jobFamily === 'PRODUCT_DESIGN') {
      sqlConditions.push(Prisma.sql`"title" ~* '\\y(product manage|product manager|pm intern|product intern|associate product manager|apm|ui[\\/\\s]?ux|product design|ux designer|design intern|ux research|project manager|program manager|eng project|program intern|project intern)\\y'`);
    } else if (jobFamily === 'DATA_ANALYTICS') {
      sqlConditions.push(Prisma.sql`"title" ~* '\\y(data analyst|business analyst|bi analyst|business intelligence|analytics specialist|data analytics)\\y'`);
    } else if (jobFamily === 'OPERATIONS_BUSINESS') {
      sqlConditions.push(Prisma.sql`"title" ~* '\\y(customer support|customer service|support specialist|technical support|helpdesk|service desk|business development|bdr|sdr|account executive|account manager|sales|marketing|copywriter|content writer|human resources|hr|recruiter|recruiting|talent acquisition|payroll|accounts payable|accounting|accountant|industrial trainee|commercial trainee|finance|financial|legal|compliance|procurement|facilities|office manager|receptionist|cashier|retail|operations|apprentice)\\y'`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(sqlConditions, ' AND ')}`;

    const isMatchFiltered = Boolean(matchFilter);
    const isMatchSorted = sort === 'match_desc' || sort === 'match_asc';

    // Branch 1: Match score filtering or sorting
    if (isMatchFiltered || isMatchSorted) {
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Candidate authentication is required for match-based filtering and sorting',
          },
        });
        return;
      }

      const candidateEvidenceMap = (await matchingService.buildCandidateEvidenceMapByUserId(userId)) || new Map();

      const allCandidateIds = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM "Opportunity" ${whereClause}
      `);

      const ids = allCandidateIds.map((r) => r.id);
      let opps: any[] = [];
      if (ids.length > 0) {
        opps = await prisma.opportunity.findMany({
          where: { id: { in: ids } },
          include: {
            opportunitySkills: {
              include: {
                skill: true,
              },
            },
          },
        });
      }

      let scoredOpps = opps.map((opp) => {
        const companyLogoUrl = resolveCompanyLogoUrl(opp.organization, opp.applicationUrl, opp.sourceUrl);
        const matchResult = matchingService.matchEvidenceToOpportunity(candidateEvidenceMap, opp);
        return {
          ...opp,
          companyLogoUrl,
          match: matchingService.getMatchSummary(matchResult),
        };
      });

      if (matchFilter) {
        switch (matchFilter) {
          case '80_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match?.hasStructuredRequirements && o.match?.score !== null && o.match.score >= 80
            );
            break;
          case '60_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match?.hasStructuredRequirements && o.match?.score !== null && o.match.score >= 60
            );
            break;
          case '40_plus':
            scoredOpps = scoredOpps.filter(
              (o) => o.match?.hasStructuredRequirements && o.match?.score !== null && o.match.score >= 40
            );
            break;
          case 'below_40':
            scoredOpps = scoredOpps.filter(
              (o) => o.match?.hasStructuredRequirements && o.match?.score !== null && o.match.score < 40
            );
            break;
          case 'unavailable':
            scoredOpps = scoredOpps.filter(
              (o) => !o.match?.hasStructuredRequirements || o.match?.score === null
            );
            break;
        }
      }

      if (jobFamily === 'SOFTWARE_ENGINEERING') {
        scoredOpps = scoredOpps.filter((opp) => isSoftwareEngineeringRole(opp));
      } else if (jobFamily === 'PRODUCT_DESIGN') {
        scoredOpps = scoredOpps.filter((opp) => isProductDesignRole(opp));
      } else if (jobFamily === 'DATA_ANALYTICS') {
        scoredOpps = scoredOpps.filter((opp) => isDataAnalyticsRole(opp));
      } else if (jobFamily === 'OPERATIONS_BUSINESS') {
        scoredOpps = scoredOpps.filter((opp) => isOperationsBusinessRole(opp));
      }

      if (sort === 'match_desc') {
        scoredOpps.sort((a, b) => {
          const scoreA = a.match?.score ?? -1;
          const scoreB = b.match?.score ?? -1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return a.id.localeCompare(b.id);
        });
      } else if (sort === 'match_asc') {
        scoredOpps.sort((a, b) => {
          const scoreA = a.match?.score !== null && a.match?.score !== undefined ? a.match.score : 999;
          const scoreB = b.match?.score !== null && b.match?.score !== undefined ? b.match.score : 999;
          if (scoreA !== scoreB) return scoreA - scoreB;
          const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return a.id.localeCompare(b.id);
        });
      }

      const total = scoredOpps.length;
      let paginatedOpps = scoredOpps.slice((page - 1) * limit, page * limit);

      // Apply employer interleaving only if sorting is balanced/default
      if (!isMatchSorted && !sort) {
        paginatedOpps = interleaveOpportunitiesByEmployer(paginatedOpps);
      }

      res.json({
        opportunities: paginatedOpps,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        candidateContext: userId
          ? { isAuthenticated: true, hasSkills: (candidateEvidenceMap?.size || 0) > 0 }
          : { isAuthenticated: false, hasSkills: false },
        filters: {
          city: city || 'All',
          workMode: workMode || 'ALL',
          stage: stage || 'ALL',
        },
      });
      return;
    }

    // Branch 2: Standard database sorting OR Balanced Employer Interleaving
    let idRows: Array<{ id: string }> = [];
    const countRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int as count FROM "Opportunity" ${whereClause}
    `);
    const total = countRows.length > 0 ? Number(countRows[0].count) : 0;

    const isExplicitDateSort = sort === 'posted_asc' || sort === 'posted_desc';

    if (isExplicitDateSort) {
      if (sort === 'posted_asc') {
        idRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id FROM "Opportunity"
          ${whereClause}
          ORDER BY "postedDate" ASC NULLS LAST, "createdAt" ASC, id ASC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `);
      } else {
        idRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id FROM "Opportunity"
          ${whereClause}
          ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `);
      }
    } else {
      // Default: Balanced Employer Round-Robin Interleaving
      idRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM("organization"))
                   ORDER BY "postedDate" DESC NULLS LAST, "createdAt" DESC, id ASC
                 ) as employer_rank,
                 LOWER(TRIM("organization")) as employer_key
          FROM "Opportunity"
          ${whereClause}
        ) ranked
        ORDER BY employer_rank ASC, employer_key ASC, id ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `);
    }

    const ids = idRows.map((r) => r.id);
    let opportunities: any[] = [];
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
    }

    // Apply balanced employer interleaving across the page items when not explicitly sorted
    if (!isExplicitDateSort) {
      opportunities = interleaveOpportunitiesByEmployer(opportunities);
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
      candidateContext: userId
        ? { isAuthenticated: true, hasSkills: (evidenceMap?.size || 0) > 0 }
        : { isAuthenticated: false, hasSkills: false },
      filters: {
        city: city || 'All',
        workMode: workMode || 'ALL',
        stage: stage || 'ALL',
      },
    });
  } catch (error) {
    console.error('Get India opportunities error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// ── M2.7: Dedicated Early Opportunities Feed ─────────────────────────────────

const ALLOWED_EARLY_CAREER_CATEGORIES = [
  'INTERNSHIP',
  'FRESHER',
  'GRADUATE_TRAINEE',
  'ENTRY_LEVEL',
  'JUNIOR',
] as const;

const earlyCareerListQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN', 'ALL']).optional(),
  batch: z.string().optional(),
  search: z.string().optional(),
  skill: z.string().optional(),
  jobFamily: z.enum(['SOFTWARE_ENGINEERING', 'PRODUCT_DESIGN', 'DATA_ANALYTICS', 'OPERATIONS_BUSINESS', 'ALL']).optional(),
  specialization: z.string().optional(),
  indiaOnly: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'false' || lower === '0') return false;
      return true;
    }
    return true;
  }, z.boolean()),
  geoScope: z.enum(['INDIA_ONLY', 'VERIFIED_SPONSORSHIP', 'ALL_INTERNATIONAL', 'ALL']).optional(),
  eligibility: z.enum(['ELIGIBLE', 'NOT_ELIGIBLE', 'UNKNOWN', 'ALL']).optional(),
  sort: z.enum(['recommended', 'posted_desc', 'posted_asc', 'match_desc', '']).optional(),
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

function getVerificationTier(level?: string | null): number {
  if (level === 'MANUALLY_AUDITED' || level === 'AUTOMATED_HIGH_CONFIDENCE') return 1;
  if (level === 'INFERRED_HEURISTIC') return 2;
  if (level === 'REVIEW_REQUIRED') return 3;
  return 4; // UNVERIFIED or unknown
}

function getEligibilityTier(status?: string | null): number {
  if (status === 'ELIGIBLE') return 1;
  if (status === 'UNKNOWN') return 2;
  if (status === 'NOT_ELIGIBLE') return 3;
  return 2; // neutral
}

// GET /api/opportunities/early-career - Early Opportunities Feed with Eligibility & Matching Integration
router.get('/early-career', async (req: Request, res: Response) => {
  try {
    const normalizedQuery: any = {};
    for (const [key, value] of Object.entries(req.query)) {
      normalizedQuery[key] = Array.isArray(value) ? value[0] : value;
    }

    if (normalizedQuery.jobFamily) {
      normalizedQuery.jobFamily = normalizedQuery.jobFamily.toUpperCase();
    }

    const parsed = earlyCareerListQuerySchema.safeParse(normalizedQuery);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const {
      category,
      city,
      location,
      workMode,
      batch: rawBatch,
      search,
      skill,
      jobFamily,
      specialization,
      indiaOnly,
      geoScope,
      eligibility,
      sort = 'recommended',
      page = 1,
      limit = 20,
    } = parsed.data;

    // Validate category parameter
    let selectedCategories: string[] = [...ALLOWED_EARLY_CAREER_CATEGORIES];
    if (category && category.trim() && category.trim().toUpperCase() !== 'ALL') {
      const parts = category.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
      for (const part of parts) {
        if (!ALLOWED_EARLY_CAREER_CATEGORIES.includes(part as any)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid early-career category: '${part}'. Allowed categories: ${ALLOWED_EARLY_CAREER_CATEGORIES.join(', ')}`,
            },
          });
          return;
        }
      }
      selectedCategories = parts;
    }

    // Validate batch parameter
    let parsedBatch: number | undefined;
    if (rawBatch !== undefined && rawBatch.trim() !== '') {
      const trimmed = rawBatch.trim();
      if (!/^\d{4}$/.test(trimmed)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Graduation batch must be a valid 4-digit integer year between 1950 and 2100',
          },
        });
        return;
      }
      const b = Number(trimmed);
      if (b < 1950 || b > 2100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Graduation batch must be a valid 4-digit integer year between 1950 and 2100',
          },
        });
        return;
      }
      parsedBatch = b;
    }

    // Compose database filter criteria
    const andConditions: any[] = [
      getNonTestOpportunityWhere(),
      {
        eligibility: {
          category: {
            in: selectedCategories,
          },
        },
      },
    ];

    if (parsedBatch !== undefined) {
      andConditions.push({
        eligibility: {
          OR: [
            { batchConstraint: 'UNRESTRICTED' },
            {
              batchConstraint: 'RESTRICTED',
              eligibleBatches: { has: parsedBatch },
            },
          ],
        },
      });
    }

    if (workMode && workMode !== 'ALL') {
      andConditions.push({ workMode });
    }

    const locTerm = (city && city !== 'All' ? city : location)?.trim();
    if (locTerm) {
      andConditions.push({
        OR: [
          { location: { contains: locTerm, mode: 'insensitive' } },
          { title: { contains: locTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (search && search.trim()) {
      const term = search.trim();
      andConditions.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { organization: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    if (skill && skill.trim()) {
      const skillTerm = skill.trim();
      andConditions.push({
        opportunitySkills: {
          some: {
            skill: {
              name: { contains: skillTerm, mode: 'insensitive' },
            },
          },
        },
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    // Resolve optional candidate authentication & profile
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

    let profile: any = null;
    let candidateInput: any = null;
    let evidenceMap: Map<string, any> | null = null;
    const matchingService = new MatchingService(prisma);

    if (userId) {
      profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          candidateSkills: {
            include: { skill: true },
          },
          projects: {
            include: {
              projectSkills: {
                include: { skill: true },
              },
            },
          },
        },
      });

      if (profile) {
        candidateInput = {
          graduationYear: profile.graduationYear ?? null,
          university: profile.university ?? null,
          degree: profile.degree ?? null,
          branch: profile.branch ?? null,
          cgpa: profile.cgpa !== null && profile.cgpa !== undefined ? Number(profile.cgpa) : null,
          cgpaScale: profile.cgpaScale ?? null,
          percentage: profile.percentage !== null && profile.percentage !== undefined ? Number(profile.percentage) : null,
          activeBacklogs: profile.activeBacklogs !== null && profile.activeBacklogs !== undefined ? Number(profile.activeBacklogs) : null,
          hasBacklogHistory: profile.hasBacklogHistory ?? null,
          experienceMonths: profile.experienceMonths !== null && profile.experienceMonths !== undefined ? Number(profile.experienceMonths) : null,
        };

        evidenceMap = matchingService.buildEvidenceMapFromProfile(profile);
      }
    }

    const hasCandidateProfile = Boolean(candidateInput);

    if (eligibility && eligibility !== 'ALL' && !hasCandidateProfile) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Candidate authentication with an existing profile is required to filter by eligibility',
        },
      });
      return;
    }

    // Query opportunities with structured eligibility and required skills
    const rawOpps = await prisma.opportunity.findMany({
      where,
      include: {
        eligibility: true,
        opportunitySkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    // Transform and evaluate each opportunity
    let eligibleOpps = rawOpps.filter((opp) => Boolean(opp.eligibility));

    // 1. Job Family filter (e.g. SOFTWARE_ENGINEERING vs ALL)
    if (jobFamily === 'SOFTWARE_ENGINEERING') {
      eligibleOpps = eligibleOpps.filter((opp) => isSoftwareEngineeringRole(opp));
    } else if (jobFamily === 'PRODUCT_DESIGN') {
      eligibleOpps = eligibleOpps.filter((opp) => isProductDesignRole(opp));
    } else if (jobFamily === 'DATA_ANALYTICS') {
      eligibleOpps = eligibleOpps.filter((opp) => isDataAnalyticsRole(opp));
    } else if (jobFamily === 'OPERATIONS_BUSINESS') {
      eligibleOpps = eligibleOpps.filter((opp) => isOperationsBusinessRole(opp));
    }

    // 2. Engineering Sub-Family Specialization filter
    if (specialization && specialization.trim().toUpperCase() !== 'ALL') {
      const requestedSpecs = specialization.split(',').map((s) => s.trim().toUpperCase());
      eligibleOpps = eligibleOpps.filter((opp) => {
        const subFam = classifyEngineeringSubFamily(opp);
        return subFam && requestedSpecs.includes(subFam);
      });
    }

    // 3. Geographic Relevance & Scope filter
    // Default: indiaOnly is true, mapping to INDIA_ONLY scope
    const effectiveGeoScope = geoScope || (indiaOnly ? 'INDIA_ONLY' : 'ALL');
    if (effectiveGeoScope === 'INDIA_ONLY') {
      eligibleOpps = eligibleOpps.filter((opp) => {
        const geo = getOpportunityGeographicScope(opp);
        return geo.isIndiaEligible;
      });
    } else if (effectiveGeoScope === 'VERIFIED_SPONSORSHIP') {
      eligibleOpps = eligibleOpps.filter((opp) => {
        const geo = getOpportunityGeographicScope(opp);
        return geo.hasVisaSponsorship;
      });
    } else if (effectiveGeoScope === 'ALL_INTERNATIONAL') {
      eligibleOpps = eligibleOpps.filter((opp) => {
        const geo = getOpportunityGeographicScope(opp);
        return !geo.isIndiaEligible;
      });
    }

    let scoredItems = eligibleOpps.map((opp) => {
      const hasValid = isValidHttpUrl(opp.applicationUrl);
      const applicationUrl = hasValid ? opp.applicationUrl : null;
      const companyLogoUrl = resolveCompanyLogoUrl(opp.organization, opp.applicationUrl, opp.sourceUrl);

      // Persisted early-career classification details (excluding internal hashes/history)
      const el = opp.eligibility!;
      const earlyCareer = {
        category: el.category,
        verificationLevel: el.overallVerificationLevel,
        confidence: el.confidence,
        explanation: el.explanation,
        experienceConstraint: el.experienceConstraint,
        experienceBoundType: el.experienceBoundType,
        minExperienceMonths: el.minExperienceMonths,
        maxExperienceMonths: el.maxExperienceMonths,
        batchConstraint: el.batchConstraint,
        eligibleBatches: el.eligibleBatches || [],
        relativeCohorts: el.relativeCohorts || [],
        academicConstraint: el.academicConstraint,
        academicEvaluationMode: el.academicEvaluationMode,
        minCgpa: el.minCgpa,
        cgpaScale: el.cgpaScale,
        minPercentage: el.minPercentage,
        backlogPolicy: el.backlogPolicy,
        maxActiveBacklogs: el.maxActiveBacklogs,
        degreeConstraint: el.degreeConstraint,
        eligibleDegrees: el.eligibleDegrees || [],
        branchConstraint: el.branchConstraint,
        eligibleBranches: el.eligibleBranches || [],
        hasConflict: el.hasConflict,
        conflictDetails: el.conflictDetails || [],
      };

      // Candidate eligibility evaluation (null if anonymous or no profile)
      let candidateEligibility: any = null;
      if (candidateInput) {
        const evaluation = candidateEligibilityEvaluator.evaluate(candidateInput, el);
        candidateEligibility = {
          overallStatus: evaluation.overallStatus,
          overallExplanation: evaluation.overallExplanation,
          hasConflict: evaluation.hasConflict,
          verificationLevel: el.overallVerificationLevel,
          missingCandidateCount: evaluation.missingCandidateCount,
          missingEmployerCount: evaluation.missingEmployerCount,
          conflictCount: evaluation.conflictCount,
          criteria: {
            experience: {
              status: evaluation.criteria.experience.status,
              reason: evaluation.criteria.experience.explanation,
              mandatory: evaluation.criteria.experience.mandatory,
              reasonCode: evaluation.criteria.experience.reasonCode,
            },
            graduationBatch: {
              status: evaluation.criteria.graduationBatch.status,
              reason: evaluation.criteria.graduationBatch.explanation,
              mandatory: evaluation.criteria.graduationBatch.mandatory,
              reasonCode: evaluation.criteria.graduationBatch.reasonCode,
            },
            academics: {
              status: evaluation.criteria.academics.status,
              reason: evaluation.criteria.academics.explanation,
              mandatory: evaluation.criteria.academics.mandatory,
              reasonCode: evaluation.criteria.academics.reasonCode,
            },
            backlog: {
              status: evaluation.criteria.backlog.status,
              reason: evaluation.criteria.backlog.explanation,
              mandatory: evaluation.criteria.backlog.mandatory,
              reasonCode: evaluation.criteria.backlog.reasonCode,
            },
            degree: {
              status: evaluation.criteria.degree.status,
              reason: evaluation.criteria.degree.explanation,
              mandatory: evaluation.criteria.degree.mandatory,
              reasonCode: evaluation.criteria.degree.reasonCode,
            },
            branch: {
              status: evaluation.criteria.branch.status,
              reason: evaluation.criteria.branch.explanation,
              mandatory: evaluation.criteria.branch.mandatory,
              reasonCode: evaluation.criteria.branch.reasonCode,
            },
          },
        };
      }

      // Candidate skill match summary (null if anonymous or no profile)
      let matchSummary: any = null;
      if (evidenceMap) {
        const matchResult = matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
        matchSummary = {
          score: matchResult.score,
          hasStructuredRequirements: matchResult.hasStructuredRequirements,
          matchedCount: matchResult.requiredMatched.length + matchResult.preferredMatched.length,
          missingCount: matchResult.requiredMissing.length + matchResult.preferredMissing.length,
          matchedSkills: [
            ...matchResult.requiredMatched.map((s) => s.skillName),
            ...matchResult.preferredMatched.map((s) => s.skillName),
          ].filter(Boolean),
          missingSkills: [
            ...matchResult.requiredMissing.map((s) => s.skillName),
            ...matchResult.preferredMissing.map((s) => s.skillName),
          ].filter(Boolean),
        };
      }

      return {
        id: opp.id,
        title: opp.title,
        organization: opp.organization,
        companyLogoUrl,
        location: opp.location,
        workMode: opp.workMode,
        type: opp.type,
        employmentType: opp.employmentType,
        experienceLevel: opp.experienceLevel,
        postedDate: opp.postedDate ? new Date(opp.postedDate).toISOString() : null,
        createdAt: opp.createdAt ? new Date(opp.createdAt).toISOString() : new Date().toISOString(),
        applicationUrl,
        hasValidApplicationUrl: hasValid,
        source: opp.source,
        sourceUrl: opp.sourceUrl || null,
        jobFamily: classifyJobFamily(opp),
        specialization: classifyEngineeringSubFamily(opp),
        geographic: {
          isIndiaEligible: getOpportunityGeographicScope(opp).isIndiaEligible,
          classification: getOpportunityGeographicScope(opp).classification,
          hasVisaSponsorship: getOpportunityGeographicScope(opp).hasVisaSponsorship,
          geoScope: getOpportunityGeographicScope(opp).geoScope,
          locationLabel: getOpportunityGeographicScope(opp).locationLabel,
        },
        earlyCareer,
        eligibility: candidateEligibility,
        match: matchSummary,
      };
    });

    // Optional Candidate Eligibility Filter
    if (eligibility && eligibility !== 'ALL') {
      scoredItems = scoredItems.filter((item) => item.eligibility?.overallStatus === eligibility);
    }

    // Deterministic Multi-Tier Ranking
    if (sort === 'posted_desc') {
      scoredItems.sort((a, b) => {
        const tA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        if (tB !== tA) return tB - tA;
        const cA = new Date(a.createdAt).getTime();
        const cB = new Date(b.createdAt).getTime();
        if (cB !== cA) return cB - cA;
        return a.id.localeCompare(b.id);
      });
    } else if (sort === 'posted_asc') {
      scoredItems.sort((a, b) => {
        const tA = a.postedDate ? new Date(a.postedDate).getTime() : Number.MAX_SAFE_INTEGER;
        const tB = b.postedDate ? new Date(b.postedDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (tA !== tB) return tA - tB;
        const cA = new Date(a.createdAt).getTime();
        const cB = new Date(b.createdAt).getTime();
        if (cA !== cB) return cA - cB;
        return a.id.localeCompare(b.id);
      });
    } else if (sort === 'match_desc') {
      scoredItems.sort((a, b) => {
        const sA = a.match?.hasStructuredRequirements && a.match.score !== null ? a.match.score : -1;
        const sB = b.match?.hasStructuredRequirements && b.match.score !== null ? b.match.score : -1;
        if (sB !== sA) return sB - sA;
        const tA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        if (tB !== tA) return tB - tA;
        return a.id.localeCompare(b.id);
      });
    } else {
      // Default ranking: 'recommended'
      // 1. Verified early-career opportunities before uncertain classifications
      // 2. Eligible candidates before UNKNOWN candidates before NOT_ELIGIBLE
      // 3. Higher skill match among otherwise comparable opportunities
      // 4. Newer opportunities as a tie-breaker
      // 5. Deterministic ID tie-breaker
      scoredItems.sort((a, b) => {
        // Tier 1: Classification verification
        const vA = getVerificationTier(a.earlyCareer.verificationLevel);
        const vB = getVerificationTier(b.earlyCareer.verificationLevel);
        if (vA !== vB) return vA - vB;

        // Tier 2: Candidate eligibility
        if (hasCandidateProfile) {
          const eA = getEligibilityTier(a.eligibility?.overallStatus);
          const eB = getEligibilityTier(b.eligibility?.overallStatus);
          if (eA !== eB) return eA - eB;

          // Tier 3: Skill match
          const sA = a.match?.hasStructuredRequirements && a.match.score !== null ? a.match.score : -1;
          const sB = b.match?.hasStructuredRequirements && b.match.score !== null ? b.match.score : -1;
          if (sB !== sA) return sB - sA;
        }

        // Tier 4: Newer opportunities
        const tA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        if (tB !== tA) return tB - tA;
        const cA = new Date(a.createdAt).getTime();
        const cB = new Date(b.createdAt).getTime();
        if (cB !== cA) return cB - cA;

        // Tier 5: ID stability
        return a.id.localeCompare(b.id);
      });
    }

    // Pagination
    const total = scoredItems.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedItems = scoredItems.slice((page - 1) * limit, page * limit);

    res.json({
      opportunities: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      candidateContext: {
        isAuthenticated: Boolean(userId),
        hasProfile: Boolean(profile),
        profileComplete: Boolean(profile && isProfileComplete(profile)),
      },
      filters: {
        category: category || 'ALL',
        city: city || null,
        location: location || null,
        workMode: workMode || 'ALL',
        batch: parsedBatch ?? null,
        jobFamily: jobFamily || 'ALL',
        specialization: specialization || 'ALL',
        indiaOnly: effectiveGeoScope === 'INDIA_ONLY',
        geoScope: effectiveGeoScope,
        eligibility: eligibility || 'ALL',
        search: search || null,
        skill: skill || null,
        sort: sort || 'recommended',
      },
    });
  } catch (error) {
    console.error('Get early career opportunities error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/opportunities/early-career/preview - Read-only early career classification preview (no DB writes)
const previewInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  company: z.string().optional(),
  location: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  sourceUrl: z.string().nullable().optional(),
});

router.post('/early-career/preview', async (req: Request, res: Response) => {
  try {
    const parsed = previewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid opportunity preview payload',
          details: parsed.error.format(),
        },
      });
      return;
    }

    const result = earlyCareerClassifier.classify(parsed.data);

    // Guaranteed read-only: absolutely no database queries, writes or mutations
    res.status(200).json({
      success: true,
      data: result,
      readOnly: true,
    });
  } catch (error: any) {
    console.error('Early career preview error:', error);
    res.status(500).json({
      error: {
        code: 'CLASSIFICATION_ERROR',
        message: 'Failed to preview early-career classification',
        details: error?.message,
      },
    });
  }
});

// GET /api/opportunities/:opportunityId/match - Calculate match for the authenticated candidate
router.get('/:opportunityId/match', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const opportunityId = String(req.params.opportunityId);

    // 1. Resolve candidate profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
      include: {
        candidateSkills: {
          include: {
            skill: true,
          },
        },
        projects: {
          include: {
            projectSkills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found. Please create a profile first.' } });
      return;
    }

    // 2. Fetch opportunity with required & preferred skills
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

    if (
      !opportunity ||
      EXCLUDED_TEST_SOURCES.includes(opportunity.source as any) ||
      EXCLUDED_TEST_ORGS.includes(opportunity.organization as any)
    ) {
      res.status(404).json({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
      return;
    }

    const matchingService = new MatchingService(prisma);
    const evidenceMap = matchingService.buildEvidenceMapFromProfile(profile);
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

// GET /api/opportunities/:opportunityId/eligibility - Evaluate candidate eligibility for the opportunity
router.get('/:opportunityId/eligibility', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const opportunityId = String(req.params.opportunityId);

    // 1. Resolve user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
    });

    if (!profile) {
      res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found. Please create a profile first.',
        },
      });
      return;
    }

    // 2. Fetch opportunity and persisted eligibility
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        eligibility: {
          include: {
            evidenceRecords: true,
          },
        },
      },
    });

    if (
      !opportunity ||
      EXCLUDED_TEST_SOURCES.includes(opportunity.source as any) ||
      EXCLUDED_TEST_ORGS.includes(opportunity.organization as any)
    ) {
      res.status(404).json({
        error: {
          code: 'OPPORTUNITY_NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
      return;
    }

    // 3. Map candidate facts from real profile fields (M2.6)
    const candidateInput = {
      graduationYear: profile.graduationYear ?? null,
      university: profile.university ?? null,
      degree: profile.degree ?? null,
      branch: profile.branch ?? null,
      cgpa: profile.cgpa !== null && profile.cgpa !== undefined ? Number(profile.cgpa) : null,
      cgpaScale: profile.cgpaScale ?? null,
      percentage: profile.percentage !== null && profile.percentage !== undefined ? Number(profile.percentage) : null,
      activeBacklogs: profile.activeBacklogs !== null && profile.activeBacklogs !== undefined ? Number(profile.activeBacklogs) : null,
      hasBacklogHistory: profile.hasBacklogHistory ?? null,
      experienceMonths: profile.experienceMonths !== null && profile.experienceMonths !== undefined ? Number(profile.experienceMonths) : null,
    };

    // 4. Pure evaluation
    const evaluation = candidateEligibilityEvaluator.evaluate(
      candidateInput,
      opportunity.eligibility
    );

    // 5. Return sanitized response
    res.json({
      opportunityId: opportunity.id,
      overallStatus: evaluation.overallStatus,
      overallExplanation: evaluation.overallExplanation,
      category: opportunity.eligibility?.category || null,
      overallVerificationLevel: opportunity.eligibility?.overallVerificationLevel || 'UNVERIFIED',
      hasConflict: evaluation.hasConflict,
      missingCandidateCount: evaluation.missingCandidateCount,
      missingEmployerCount: evaluation.missingEmployerCount,
      conflictCount: evaluation.conflictCount,
      criteria: evaluation.criteria,
    });
  } catch (error) {
    console.error('Evaluate opportunity eligibility error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
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

    if (
      !opportunity ||
      EXCLUDED_TEST_SOURCES.includes(opportunity.source as any) ||
      EXCLUDED_TEST_ORGS.includes(opportunity.organization as any)
    ) {
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

export default router;
