export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface CandidateSkill {
  profileId: string;
  skillId: string;
  proficiency: string | null;
  skill: Skill;
}

export interface ProjectSkill {
  projectId: string;
  skillId: string;
  skill: Skill;
}

export interface Project {
  id: string;
  profileId: string;
  name: string;
  description: string;
  githubUrl: string | null;
  liveUrl: string | null;
  createdAt: string;
  updatedAt: string;
  projectSkills: ProjectSkill[];
}

export type CgpaScale = 'SCALE_10_0' | 'SCALE_4_0' | 'SCALE_7_0' | 'SCALE_UNKNOWN';

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  university: string | null;
  graduationYear: number | null;
  targetRole: string | null;

  // M2.6: Academic Information
  degree?: string | null;
  branch?: string | null;
  cgpa?: number | null;
  cgpaScale?: CgpaScale | null;
  percentage?: number | null;
  activeBacklogs?: number | null;
  hasBacklogHistory?: boolean | null;

  // M2.6: Experience Information
  experienceMonths?: number | null;

  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  createdAt: string;
  updatedAt: string;
  candidateSkills?: CandidateSkill[];
  projects?: Project[];
}

export interface User {
  id: string;
  email: string;
  profile: Profile | null;
  profileComplete: boolean;
}

export interface ProfileResponse {
  profile: Profile;
  profileComplete: boolean;
}

export interface CandidateSkillsResponse {
  candidateSkills: CandidateSkill[];
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface OpportunitySkill {
  opportunityId: string;
  skillId: string;
  requirementType: 'REQUIRED' | 'PREFERRED';
  skill: Skill;
}

export interface OpportunityMatchSummary {
  score: number | null;
  hasStructuredRequirements: boolean;
  matchedCount: number;
  missingCount: number;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: 'INTERNSHIP' | 'JOB' | 'HACKATHON' | 'WORKSHOP' | 'OPEN_SOURCE' | 'MICRO_INTERNSHIP';
  location: string | null;
  workMode: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT' | 'UNKNOWN';
  experienceLevel: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'UNKNOWN';
  applicationUrl: string;
  source: string;
  sourceUrl: string | null;
  sourceJobId: string | null;
  postedDate: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  opportunitySkills: OpportunitySkill[];
  match?: OpportunityMatchSummary | null;
  companyLogoUrl?: string | null;
}

export interface CandidateContext {
  isAuthenticated: boolean;
  hasSkills: boolean;
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  candidateContext?: CandidateContext;
  filters?: {
    city?: string;
    workMode?: string;
    stage?: string;
  };
}

export type EarlyCareerCategory = 'INTERNSHIP' | 'FRESHER' | 'GRADUATE_TRAINEE' | 'ENTRY_LEVEL' | 'JUNIOR';

export interface EarlyCareerClassification {
  category: EarlyCareerCategory;
  verificationLevel: string;
  confidence: number;
  explanation: string;
  experienceConstraint: string;
  experienceBoundType: string | null;
  minExperienceMonths: number | null;
  maxExperienceMonths: number | null;
  batchConstraint: string;
  eligibleBatches: number[];
  relativeCohorts: string[];
  academicConstraint: string;
  academicEvaluationMode: string | null;
  minCgpa: number | null;
  cgpaScale: string | null;
  minPercentage: number | null;
  backlogPolicy: string;
  maxActiveBacklogs: number | null;
  degreeConstraint: string;
  eligibleDegrees: string[];
  branchConstraint: string;
  eligibleBranches: string[];
  hasConflict: boolean;
  conflictDetails: string[];
}

export type CriterionReasonCode =
  | 'VERIFIED'
  | 'CANDIDATE_DATA_MISSING'
  | 'EMPLOYER_DATA_MISSING'
  | 'CONFLICT';

export interface CriterionStatusDetail {
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
  reason: string;
  mandatory: boolean;
  reasonCode?: CriterionReasonCode;
  explanation?: string;
}

export interface CandidateEligibilitySummary {
  overallStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
  overallExplanation: string;
  hasConflict: boolean;
  verificationLevel: string;
  missingCandidateCount?: number;
  missingEmployerCount?: number;
  conflictCount?: number;
  criteria: {
    experience: CriterionStatusDetail;
    graduationBatch: CriterionStatusDetail;
    academics: CriterionStatusDetail;
    backlog: CriterionStatusDetail;
    degree: CriterionStatusDetail;
    branch: CriterionStatusDetail;
  };
}

export interface EarlyCareerSkillMatch {
  score: number | null;
  hasStructuredRequirements: boolean;
  matchedCount: number;
  missingCount: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export type EngineeringSubFamily =
  | 'SOFTWARE_DEVELOPMENT'
  | 'DEVOPS_PLATFORM'
  | 'AI_ML_ENGINEERING'
  | 'SECURITY_ENGINEERING'
  | 'DATA_ENGINEERING'
  | 'QA_TESTING'
  | 'AMBIGUOUS';

export interface OpportunityGeographicSummary {
  isIndiaEligible: boolean;
  classification: string;
  hasVisaSponsorship: boolean;
  geoScope: 'INDIA_DOMESTIC' | 'INTERNATIONAL_SPONSORED' | 'INTERNATIONAL_OTHER';
  locationLabel: string;
}

export interface EarlyCareerOpportunity {
  id: string;
  title: string;
  organization: string;
  companyLogoUrl?: string | null;
  location: string | null;
  workMode: string;
  type: string;
  employmentType: string;
  experienceLevel: string;
  postedDate: string | null;
  createdAt: string;
  applicationUrl: string | null;
  hasValidApplicationUrl: boolean;
  source: string;
  sourceUrl: string | null;
  jobFamily?: 'SOFTWARE_ENGINEERING' | 'OTHER';
  specialization?: EngineeringSubFamily | null;
  geographic?: OpportunityGeographicSummary;
  earlyCareer: EarlyCareerClassification;
  eligibility: CandidateEligibilitySummary | null;
  match: EarlyCareerSkillMatch | null;
}

export interface EarlyOpportunitiesResponse {
  opportunities: EarlyCareerOpportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  candidateContext: {
    isAuthenticated: boolean;
    hasProfile: boolean;
    profileComplete: boolean;
  };
  filters: {
    category?: string;
    city?: string | null;
    location?: string | null;
    workMode?: string;
    batch?: number | null;
    eligibility?: string;
    search?: string | null;
    skill?: string | null;
    jobFamily?: string;
    specialization?: string;
    indiaOnly?: boolean;
    geoScope?: string;
    sort?: string;
  };
}

export interface OpportunityEligibilityResponse {
  opportunityId: string;
  overallStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
  overallExplanation: string;
  category: string | null;
  overallVerificationLevel: string;
  hasConflict: boolean;
  missingCandidateCount?: number;
  missingEmployerCount?: number;
  conflictCount?: number;
  criteria: {
    experience: CriterionStatusDetail;
    graduationBatch: CriterionStatusDetail;
    academics: CriterionStatusDetail;
    backlog: CriterionStatusDetail;
    degree: CriterionStatusDetail;
    branch: CriterionStatusDetail;
  };
}

export interface OpportunityResponse {
  opportunity: Opportunity;
}

export interface SkillEvidenceItem {
  skillId: string;
  skillName: string;
  isDirect: boolean;
  projectName?: string;
  projectId?: string;
}

export interface MatchSkill {
  skillId: string;
  skillName: string;
}

export interface MatchResultResponse {
  score: number | null;
  requiredMatched: MatchSkill[];
  requiredMissing: MatchSkill[];
  preferredMatched: MatchSkill[];
  preferredMissing: MatchSkill[];
  evidence: Record<string, SkillEvidenceItem[]>;
  hasStructuredRequirements: boolean;
}

export interface DashboardRecommendation {
  id: string;
  title: string;
  organization: string;
  location: string | null;
  workMode: string;
  type?: string;
  experienceLevel?: string;
  source?: string;
  opportunitySkills?: Array<{
    skillId: string;
    requirementType: string;
    skill: {
      id?: string;
      name: string;
      category?: string;
    };
  }>;
  match: {
    score: number;
    matchedCount: number;
    missingCount: number;
    hasStructuredRequirements: boolean;
    matchedSkills?: string[];
    missingSkills?: string[];
  };
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  opportunityCount: number;
}

export interface DashboardResponse {
  hasProfile: boolean;
  profileComplete: boolean;
  profileCompleteness?: {
    percentage: number;
    completedSections: string[];
    missingSections: string[];
  };
  hasSkillsOrEvidence: boolean;
  hasStructuredOpportunities: boolean;
  metrics: {
    skillsCount: number;
    projectsCount: number;
    skillMatchedCount?: number;
    matchedOpportunitiesCount: number;
  };
  recommendations: DashboardRecommendation[];
  skillGaps: SkillGap[];
}
