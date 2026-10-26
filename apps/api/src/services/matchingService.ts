import { PrismaClient, RequirementType } from '@prisma/client';

export interface SkillEvidence {
  skillId: string;
  skillName: string;
  isDirect: boolean;
  projectName?: string;
  projectId?: string;
}

export interface MatchResult {
  score: number | null;
  requiredMatched: Array<{ skillId: string; skillName: string }>;
  requiredMissing: Array<{ skillId: string; skillName: string }>;
  preferredMatched: Array<{ skillId: string; skillName: string }>;
  preferredMissing: Array<{ skillId: string; skillName: string }>;
  evidence: Map<string, SkillEvidence[]>;
  hasStructuredRequirements: boolean;
}

export interface MatchSummary {
  score: number | null;
  hasStructuredRequirements: boolean;
  matchedCount: number;
  missingCount: number;
}

export class MatchingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetches candidate profile by internal userId and builds evidence map.
   */
  async buildCandidateEvidenceMapByUserId(userId: string): Promise<Map<string, SkillEvidence[]> | null> {
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
      return null;
    }

    return this.buildEvidenceMapFromProfile(profile);
  }

  /**
   * Helper to build evidence map from candidate profile data.
   */
  buildEvidenceMapFromProfile(profile: {
    candidateSkills: Array<{ skillId: string; skill: { name: string } }>;
    projects: Array<{
      id: string;
      name: string;
      projectSkills: Array<{ skillId: string; skill: { name: string } }>;
    }>;
  }): Map<string, SkillEvidence[]> {
    const evidenceMap = new Map<string, SkillEvidence[]>();

    for (const candidateSkill of profile.candidateSkills) {
      const skillId = candidateSkill.skillId;
      const evidence: SkillEvidence = {
        skillId,
        skillName: candidateSkill.skill.name,
        isDirect: true,
      };

      if (!evidenceMap.has(skillId)) {
        evidenceMap.set(skillId, []);
      }
      evidenceMap.get(skillId)!.push(evidence);
    }

    for (const project of profile.projects) {
      for (const projectSkill of project.projectSkills) {
        const skillId = projectSkill.skillId;
        const evidence: SkillEvidence = {
          skillId,
          skillName: projectSkill.skill.name,
          isDirect: false,
          projectName: project.name,
          projectId: project.id,
        };

        if (!evidenceMap.has(skillId)) {
          evidenceMap.set(skillId, []);
        }
        evidenceMap.get(skillId)!.push(evidence);
      }
    }

    return evidenceMap;
  }

  /**
   * Matches candidate evidence map against an opportunity in-memory.
   */
  matchEvidenceToOpportunity(
    evidenceMap: Map<string, SkillEvidence[]>,
    opportunity: {
      opportunitySkills: Array<{
        skillId: string;
        requirementType: RequirementType;
        skill: { name: string };
      }>;
    }
  ): MatchResult {
    const oppSkills = opportunity.opportunitySkills || [];
    const requiredSkills = oppSkills
      .filter(os => os.requirementType === RequirementType.REQUIRED)
      .map(os => ({ skillId: os.skillId, skillName: os.skill ? os.skill.name : '' }));

    const preferredSkills = oppSkills
      .filter(os => os.requirementType === RequirementType.PREFERRED)
      .map(os => ({ skillId: os.skillId, skillName: os.skill ? os.skill.name : '' }));

    const hasStructuredRequirements = requiredSkills.length > 0 || preferredSkills.length > 0;

    if (!hasStructuredRequirements) {
      return {
        score: null,
        requiredMatched: [],
        requiredMissing: [],
        preferredMatched: [],
        preferredMissing: [],
        evidence: evidenceMap,
        hasStructuredRequirements: false,
      };
    }

    const requiredMatched: Array<{ skillId: string; skillName: string }> = [];
    const requiredMissing: Array<{ skillId: string; skillName: string }> = [];

    for (const skill of requiredSkills) {
      if (evidenceMap.has(skill.skillId)) {
        requiredMatched.push(skill);
      } else {
        requiredMissing.push(skill);
      }
    }

    const preferredMatched: Array<{ skillId: string; skillName: string }> = [];
    const preferredMissing: Array<{ skillId: string; skillName: string }> = [];

    for (const skill of preferredSkills) {
      if (evidenceMap.has(skill.skillId)) {
        preferredMatched.push(skill);
      } else {
        preferredMissing.push(skill);
      }
    }

    const score = this.calculateScore(
      requiredMatched.length,
      requiredSkills.length,
      preferredMatched.length,
      preferredSkills.length
    );

    return {
      score,
      requiredMatched,
      requiredMissing,
      preferredMatched,
      preferredMissing,
      evidence: evidenceMap,
      hasStructuredRequirements: true,
    };
  }

  /**
   * Generates a compact MatchSummary from a MatchResult.
   */
  getMatchSummary(matchResult: MatchResult): MatchSummary {
    if (!matchResult.hasStructuredRequirements || matchResult.score === null) {
      return {
        score: null,
        hasStructuredRequirements: false,
        matchedCount: 0,
        missingCount: 0,
      };
    }

    const matchedCount = matchResult.requiredMatched.length + matchResult.preferredMatched.length;
    const missingCount = matchResult.requiredMissing.length + matchResult.preferredMissing.length;

    return {
      score: matchResult.score,
      hasStructuredRequirements: true,
      matchedCount,
      missingCount,
    };
  }

  async matchCandidateToOpportunity(profileId: string, opportunityId: string): Promise<MatchResult> {
    const candidate = await this.prisma.profile.findUnique({
      where: { id: profileId },
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

    if (!candidate) {
      throw new Error(`Candidate profile not found: ${profileId}`);
    }

    const opportunity = await this.prisma.opportunity.findUnique({
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
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const evidenceMap = this.buildEvidenceMapFromProfile(candidate);
    return this.matchEvidenceToOpportunity(evidenceMap, opportunity);
  }

  private calculateScore(
    matchedRequired: number,
    totalRequired: number,
    matchedPreferred: number,
    totalPreferred: number
  ): number | null {
    if (totalRequired === 0 && totalPreferred === 0) {
      return null;
    }

    if (totalRequired > 0 && totalPreferred === 0) {
      return Math.round((matchedRequired / totalRequired) * 100 * 100) / 100;
    }

    if (totalRequired === 0 && totalPreferred > 0) {
      return Math.round((matchedPreferred / totalPreferred) * 100 * 100) / 100;
    }

    // Weighted score: required 80%, preferred 20%
    const requiredCoverage = matchedRequired / totalRequired;
    const preferredCoverage = matchedPreferred / totalPreferred;
    const score = requiredCoverage * 80 + preferredCoverage * 20;

    return Math.round(score * 100) / 100;
  }
}
