import { PrismaClient, RequirementType } from '@prisma/client';

// Define enum values locally to avoid Prisma client generation issues
const OpportunityType = {
  INTERNSHIP: 'INTERNSHIP',
  JOB: 'JOB',
  HACKATHON: 'HACKATHON',
  WORKSHOP: 'WORKSHOP',
  OPEN_SOURCE: 'OPEN_SOURCE',
  MICRO_INTERNSHIP: 'MICRO_INTERNSHIP',
} as const;

const WorkMode = {
  REMOTE: 'REMOTE',
  HYBRID: 'HYBRID',
  ONSITE: 'ONSITE',
  UNKNOWN: 'UNKNOWN',
} as const;

const EmploymentType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  INTERNSHIP: 'INTERNSHIP',
  CONTRACT: 'CONTRACT',
  UNKNOWN: 'UNKNOWN',
} as const;

const ExperienceLevel = {
  ENTRY: 'ENTRY',
  JUNIOR: 'JUNIOR',
  MID: 'MID',
  SENIOR: 'SENIOR',
  UNKNOWN: 'UNKNOWN',
} as const;

type OpportunityTypeValue = typeof OpportunityType[keyof typeof OpportunityType];
type WorkModeValue = typeof WorkMode[keyof typeof WorkMode];
type EmploymentTypeValue = typeof EmploymentType[keyof typeof EmploymentType];
type ExperienceLevelValue = typeof ExperienceLevel[keyof typeof ExperienceLevel];

export interface ExternalJob {
  id?: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  experienceLevel?: string;
  applicationUrl: string;
  sourceUrl?: string;
  source: string;
  postedDate?: string | Date;
  deadline?: string | Date;
  requiredSkills?: string[];
  preferredSkills?: string[];
}

export interface NormalizedOpportunity {
  title: string;
  organization: string;
  description: string;
  type: OpportunityTypeValue;
  location: string | null;
  workMode: WorkModeValue;
  employmentType: EmploymentTypeValue;
  experienceLevel: ExperienceLevelValue;
  applicationUrl: string;
  source: string;
  sourceUrl: string | null;
  sourceJobId: string | null;
  postedDate: Date | null;
  deadline: Date | null;
  requiredSkills: string[];
  preferredSkills: string[];
}

export interface OpportunityProvider {
  name: string;
  fetch(): Promise<ExternalJob[]>;
}

export class OpportunityNormalizer {
  private skillNormalizationMap: Map<string, string> = new Map([
    ['react.js', 'react'],
    ['reactjs', 'react'],
    ['reactjs', 'react'],
    ['vue.js', 'vue'],
    ['vuejs', 'vue'],
    ['angularjs', 'angular'],
    ['node.js', 'node'],
    ['nodejs', 'node'],
    ['typescript', 'typescript'],
    ['ts', 'typescript'],
    ['javascript', 'javascript'],
    ['js', 'javascript'],
    ['python', 'python'],
    ['py', 'python'],
    ['java', 'java'],
    ['c++', 'cpp'],
    ['c#', 'csharp'],
    ['csharp', 'csharp'],
    ['go', 'go'],
    ['golang', 'go'],
    ['rust', 'rust'],
    ['swift', 'swift'],
    ['kotlin', 'kotlin'],
    ['ruby', 'ruby'],
    ['php', 'php'],
    ['sql', 'sql'],
    ['postgresql', 'postgresql'],
    ['postgres', 'postgresql'],
    ['mysql', 'mysql'],
    ['mongodb', 'mongodb'],
    ['mongo', 'mongodb'],
    ['redis', 'redis'],
    ['docker', 'docker'],
    ['kubernetes', 'kubernetes'],
    ['k8s', 'kubernetes'],
    ['aws', 'aws'],
    ['amazon web services', 'aws'],
    ['azure', 'azure'],
    ['gcp', 'gcp'],
    ['google cloud', 'gcp'],
    ['git', 'git'],
    ['github', 'github'],
    ['gitlab', 'gitlab'],
    ['linux', 'linux'],
    ['unix', 'linux'],
    ['html', 'html'],
    ['css', 'css'],
    ['sass', 'sass'],
    ['scss', 'scss'],
    ['tailwind', 'tailwind'],
    ['bootstrap', 'bootstrap'],
    ['jquery', 'jquery'],
    ['next.js', 'next'],
    ['nextjs', 'next'],
    ['nuxt.js', 'nuxt'],
    ['nuxtjs', 'nuxt'],
    ['express', 'express'],
    ['nestjs', 'nestjs'],
    ['django', 'django'],
    ['flask', 'flask'],
    ['spring', 'spring'],
    ['laravel', 'laravel'],
    ['rails', 'rails'],
  ]);

  normalizeSkill(skillName: string): string {
    const normalized = skillName.toLowerCase().trim();
    return this.skillNormalizationMap.get(normalized) || normalized;
  }

  normalizeWorkMode(workMode?: string): WorkModeValue {
    if (!workMode) return WorkMode.UNKNOWN;
    const normalized = workMode.toLowerCase();
    if (normalized.includes('remote')) return WorkMode.REMOTE;
    if (normalized.includes('hybrid')) return WorkMode.HYBRID;
    if (normalized.includes('onsite') || normalized.includes('on-site') || normalized.includes('office')) return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  normalizeEmploymentType(employmentType?: string): EmploymentTypeValue {
    if (!employmentType) return EmploymentType.UNKNOWN;
    const normalized = employmentType.toLowerCase();
    if (normalized.includes('full') && normalized.includes('time')) return EmploymentType.FULL_TIME;
    if (normalized.includes('part') && normalized.includes('time')) return EmploymentType.PART_TIME;
    if (normalized.includes('intern')) return EmploymentType.INTERNSHIP;
    if (normalized.includes('contract')) return EmploymentType.CONTRACT;
    return EmploymentType.UNKNOWN;
  }

  normalizeExperienceLevel(experienceLevel?: string): ExperienceLevelValue {
    if (!experienceLevel) return ExperienceLevel.UNKNOWN;
    const normalized = experienceLevel.toLowerCase();
    if (normalized.includes('entry') || normalized.includes('junior') && !normalized.includes('mid')) return ExperienceLevel.ENTRY;
    if (normalized.includes('junior')) return ExperienceLevel.JUNIOR;
    if (normalized.includes('mid') || normalized.includes('middle')) return ExperienceLevel.MID;
    if (normalized.includes('senior') || normalized.includes('lead') || normalized.includes('staff')) return ExperienceLevel.SENIOR;
    return ExperienceLevel.UNKNOWN;
  }

  normalizeOpportunityType(type?: string): OpportunityTypeValue {
    if (!type) return OpportunityType.JOB;
    const normalized = type.toLowerCase();
    if (normalized.includes('intern')) return OpportunityType.INTERNSHIP;
    if (normalized.includes('hackathon')) return OpportunityType.HACKATHON;
    if (normalized.includes('workshop')) return OpportunityType.WORKSHOP;
    if (normalized.includes('open') && normalized.includes('source')) return OpportunityType.OPEN_SOURCE;
    if (normalized.includes('micro') && normalized.includes('intern')) return OpportunityType.MICRO_INTERNSHIP;
    return OpportunityType.JOB;
  }

  normalize(job: ExternalJob): NormalizedOpportunity {
    return {
      title: job.title.trim(),
      organization: job.company.trim(),
      description: job.description.trim(),
      type: this.normalizeOpportunityType(job.employmentType),
      location: job.location?.trim() || null,
      workMode: this.normalizeWorkMode(job.workMode),
      employmentType: this.normalizeEmploymentType(job.employmentType),
      experienceLevel: this.normalizeExperienceLevel(job.experienceLevel),
      applicationUrl: job.applicationUrl.trim(),
      source: job.source.trim(),
      sourceUrl: job.sourceUrl?.trim() || null,
      sourceJobId: job.id?.trim() || null,
      postedDate: job.postedDate ? new Date(job.postedDate) : null,
      deadline: job.deadline ? new Date(job.deadline) : null,
      requiredSkills: (job.requiredSkills || []).map(s => this.normalizeSkill(s)),
      preferredSkills: (job.preferredSkills || []).map(s => this.normalizeSkill(s)),
    };
  }
}

export class OpportunityDeduplicator {
  async findExisting(prisma: PrismaClient, normalized: NormalizedOpportunity): Promise<string | null> {
    if (normalized.sourceJobId) {
      const existing = await prisma.opportunity.findFirst({
        where: {
          source: normalized.source,
          sourceJobId: normalized.sourceJobId,
        },
      });
      return existing?.id || null;
    }

    return null;
  }

  generateDeduplicationKey(normalized: NormalizedOpportunity): string {
    const keyParts = [
      normalized.source,
      normalized.sourceJobId || '',
      normalized.organization.toLowerCase(),
      normalized.title.toLowerCase(),
      normalized.applicationUrl.toLowerCase(),
    ];
    return keyParts.join('|||');
  }
}

export class OpportunityIngestor {
  constructor(
    private prisma: PrismaClient,
    private normalizer: OpportunityNormalizer = new OpportunityNormalizer(),
    private deduplicator: OpportunityDeduplicator = new OpportunityDeduplicator(),
  ) {}

  async ingest(provider: OpportunityProvider): Promise<{ created: number; skipped: number; errors: number }> {
    const jobs = await provider.fetch();
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const job of jobs) {
      try {
        const normalized = this.normalizer.normalize(job);

        const existingId = await this.deduplicator.findExisting(this.prisma, normalized);
        if (existingId) {
          skipped++;
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const opportunity = await tx.opportunity.create({
            data: {
              title: normalized.title,
              organization: normalized.organization,
              description: normalized.description,
              type: normalized.type,
              location: normalized.location,
              workMode: normalized.workMode,
              employmentType: normalized.employmentType,
              experienceLevel: normalized.experienceLevel,
              applicationUrl: normalized.applicationUrl,
              source: normalized.source,
              sourceUrl: normalized.sourceUrl,
              sourceJobId: normalized.sourceJobId,
              postedDate: normalized.postedDate,
              deadline: normalized.deadline,
            },
          });

          for (const skillName of normalized.requiredSkills) {
            const skill = await tx.skill.upsert({
              where: { name: skillName },
              update: {},
              create: { name: skillName, category: 'TOOL' },
            });

            await tx.opportunitySkill.create({
              data: {
                opportunityId: opportunity.id,
                skillId: skill.id,
                requirementType: RequirementType.REQUIRED,
              },
            });
          }

          for (const skillName of normalized.preferredSkills) {
            const skill = await tx.skill.upsert({
              where: { name: skillName },
              update: {},
              create: { name: skillName, category: 'TOOL' },
            });

            await tx.opportunitySkill.create({
              data: {
                opportunityId: opportunity.id,
                skillId: skill.id,
                requirementType: RequirementType.PREFERRED,
              },
            });
          }
        });

        created++;
      } catch (error) {
        console.error('Error ingesting opportunity:', error);
        errors++;
      }
    }

    return { created, skipped, errors };
  }
}
