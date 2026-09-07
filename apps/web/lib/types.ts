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

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  university: string | null;
  graduationYear: number | null;
  targetRole: string | null;
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
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OpportunityResponse {
  opportunity: Opportunity;
}
