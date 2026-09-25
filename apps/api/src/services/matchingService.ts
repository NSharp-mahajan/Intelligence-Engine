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

export class MatchingService {
  constructor(private prisma: PrismaClient) {}

  async matchCandidateToOpportunity(profileId: string, opportunityId: string): Promise<MatchResult> {
    // Fetch candidate profile with skills and projects
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

    // Fetch opportunity with skills
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

    // Build candidate skill evidence map
    const evidenceMap = new Map<string, SkillEvidence[]>();

    // Add direct candidate skills
    for (const candidateSkill of candidate.candidateSkills) {
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

    // Add project-based skills
    for (const project of candidate.projects) {
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

    // Separate opportunity skills by requirement type
    const requiredSkills = opportunity.opportunitySkills
      .filter(os => os.requirementType === RequirementType.REQUIRED)
      .map(os => ({ skillId: os.skillId, skillName: os.skill.name }));

    const preferredSkills = opportunity.opportunitySkills
      .filter(os => os.requirementType === RequirementType.PREFERRED)
      .map(os => ({ skillId: os.skillId, skillName: os.skill.name }));

    // Check if there are any structured requirements
    const hasStructuredRequirements = requiredSkills.length > 0 || preferredSkills.length > 0;

    // If no structured requirements, return null score
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

    // Match required skills
    const requiredMatched: Array<{ skillId: string; skillName: string }> = [];
    const requiredMissing: Array<{ skillId: string; skillName: string }> = [];

    for (const skill of requiredSkills) {
      if (evidenceMap.has(skill.skillId)) {
        requiredMatched.push(skill);
      } else {
        requiredMissing.push(skill);
      }
    }

    // Match preferred skills
    const preferredMatched: Array<{ skillId: string; skillName: string }> = [];
    const preferredMissing: Array<{ skillId: string; skillName: string }> = [];

    for (const skill of preferredSkills) {
      if (evidenceMap.has(skill.skillId)) {
        preferredMatched.push(skill);
      } else {
        preferredMissing.push(skill);
      }
    }

    // Calculate score
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

  private calculateScore(
    matchedRequired: number,
    totalRequired: number,
    matchedPreferred: number,
    totalPreferred: number
  ): number {
    // If no required skills, calculate from preferred only
    if (totalRequired === 0) {
      if (totalPreferred === 0) {
        return 0; // Should not happen due to earlier check, but defensive
      }
      return (matchedPreferred / totalPreferred) * 100;
    }

    // Calculate coverage for required (80% weight) and preferred (20% weight)
    const requiredCoverage = matchedRequired / totalRequired;
    const preferredCoverage = totalPreferred > 0 ? matchedPreferred / totalPreferred : 1;

    // Weighted score: required 80%, preferred 20%
    const score = requiredCoverage * 80 + preferredCoverage * 20;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }
}
