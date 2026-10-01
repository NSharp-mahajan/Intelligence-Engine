import { PrismaClient } from '@prisma/client';
import { MatchingService } from './matchingService';
import { isProfileComplete } from '../lib/profileCompleteness';

export interface DashboardRecommendation {
  id: string;
  title: string;
  organization: string;
  location: string | null;
  workMode: string;
  match: {
    score: number;
    matchedCount: number;
    missingCount: number;
    hasStructuredRequirements: boolean;
  };
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  opportunityCount: number;
}

export interface DashboardData {
  hasProfile: boolean;
  profileComplete: boolean;
  hasSkillsOrEvidence: boolean;
  hasStructuredOpportunities: boolean;
  metrics: {
    skillsCount: number;
    projectsCount: number;
    matchedOpportunitiesCount: number;
  };
  recommendations: DashboardRecommendation[];
  skillGaps: SkillGap[];
}

export class DashboardService {
  private matchingService: MatchingService;

  constructor(private prisma: PrismaClient) {
    this.matchingService = new MatchingService(prisma);
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    // 1. Fetch user profile with candidate skills and projects in a single query
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
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
      return {
        hasProfile: false,
        profileComplete: false,
        hasSkillsOrEvidence: false,
        hasStructuredOpportunities: false,
        metrics: {
          skillsCount: 0,
          projectsCount: 0,
          matchedOpportunitiesCount: 0,
        },
        recommendations: [],
        skillGaps: [],
      };
    }

    const skillsCount = profile.candidateSkills?.length || 0;
    const projectsCount = profile.projects?.length || 0;
    const evidenceMap = this.matchingService.buildEvidenceMapFromProfile(profile);
    const hasSkillsOrEvidence = evidenceMap.size > 0;
    const profileCompleted = isProfileComplete(profile);

    // 2. Fetch all structured opportunities in a single query (avoid N+1)
    const structuredOpportunities = await this.prisma.opportunity.findMany({
      where: {
        opportunitySkills: {
          some: {},
        },
      },
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

    const hasStructuredOpportunities = structuredOpportunities.length > 0;

    if (!hasSkillsOrEvidence || !hasStructuredOpportunities) {
      return {
        hasProfile: true,
        profileComplete: profileCompleted,
        hasSkillsOrEvidence,
        hasStructuredOpportunities,
        metrics: {
          skillsCount,
          projectsCount,
          matchedOpportunitiesCount: 0,
        },
        recommendations: [],
        skillGaps: [],
      };
    }

    // 3. Evaluate matching in-memory using existing MatchingService
    const scoredList: Array<{
      opp: typeof structuredOpportunities[0];
      match: {
        score: number;
        matchedCount: number;
        missingCount: number;
        hasStructuredRequirements: boolean;
      };
    }> = [];

    const missingSkillCounts = new Map<string, { skillId: string; skillName: string; count: number }>();
    let matchedOpportunitiesCount = 0;

    for (const opp of structuredOpportunities) {
      const matchResult = this.matchingService.matchEvidenceToOpportunity(evidenceMap, opp);
      if (!matchResult.hasStructuredRequirements || matchResult.score === null) {
        continue;
      }

      const matchedCount = matchResult.requiredMatched.length + matchResult.preferredMatched.length;
      const missingCount = matchResult.requiredMissing.length + matchResult.preferredMissing.length;

      if (matchResult.score > 0) {
        matchedOpportunitiesCount++;
        scoredList.push({
          opp,
          match: {
            score: matchResult.score,
            matchedCount,
            missingCount,
            hasStructuredRequirements: true,
          },
        });
      }

      // Track missing skills across structured opportunities
      // De-duplicate per opportunity so each opportunity counts at most once per missing skill
      const oppMissingSkillIds = new Map<string, string>();
      for (const s of matchResult.requiredMissing) {
        if (s.skillId && s.skillName) oppMissingSkillIds.set(s.skillId, s.skillName);
      }
      for (const s of matchResult.preferredMissing) {
        if (s.skillId && s.skillName) oppMissingSkillIds.set(s.skillId, s.skillName);
      }

      for (const [skillId, skillName] of oppMissingSkillIds.entries()) {
        const existing = missingSkillCounts.get(skillId);
        if (existing) {
          existing.count += 1;
        } else {
          missingSkillCounts.set(skillId, { skillId, skillName, count: 1 });
        }
      }
    }

    // 4. Deterministic sorting for recommendations:
    // - Highest match score first
    // - Deterministic secondary ordering (postedDate desc, createdAt desc, id asc)
    scoredList.sort((a, b) => {
      if (b.match.score !== a.match.score) {
        return b.match.score - a.match.score;
      }
      const dateA = a.opp.postedDate ? new Date(a.opp.postedDate).getTime() : 0;
      const dateB = b.opp.postedDate ? new Date(b.opp.postedDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;

      const createdA = a.opp.createdAt ? new Date(a.opp.createdAt).getTime() : 0;
      const createdB = b.opp.createdAt ? new Date(b.opp.createdAt).getTime() : 0;
      if (createdA !== createdB) return createdB - createdA;

      return a.opp.id.localeCompare(b.opp.id);
    });

    const recommendations: DashboardRecommendation[] = scoredList.slice(0, 5).map(item => ({
      id: item.opp.id,
      title: item.opp.title,
      organization: item.opp.organization,
      location: item.opp.location,
      workMode: item.opp.workMode,
      match: item.match,
    }));

    // 5. Aggregate and sort skill gaps
    // - Highest opportunityCount first
    // - Deterministic secondary ordering (skillName asc)
    const skillGaps: SkillGap[] = Array.from(missingSkillCounts.values())
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.skillName.localeCompare(b.skillName);
      })
      .slice(0, 6)
      .map(item => ({
        skillId: item.skillId,
        skillName: item.skillName,
        opportunityCount: item.count,
      }));

    return {
      hasProfile: true,
      profileComplete: profileCompleted,
      hasSkillsOrEvidence,
      hasStructuredOpportunities,
      metrics: {
        skillsCount,
        projectsCount,
        matchedOpportunitiesCount,
      },
      recommendations,
      skillGaps,
    };
  }
}
