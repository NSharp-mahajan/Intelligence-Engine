import { PrismaClient, RequirementType } from '@prisma/client';
import { randomUUID } from 'crypto';

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

export interface ProviderSourceFailure {
  source: string;
  error: string;
}

export interface ProviderFetchStats {
  successfulSources: string[];
  failedSources: ProviderSourceFailure[];
}

export interface OpportunityProvider {
  name: string;
  fetch(optionsOrSignal?: AbortSignal | any): Promise<ExternalJob[]>;
  getLastFetchStats?(): ProviderFetchStats;
}

export * from './jobicyProvider';
export * from './greenhouseProvider';
export * from './leverProvider';
export {
  AshbyProvider,
  DEFAULT_ASHBY_BOARDS,
  VERIFIED_INDIA_ASHBY_BOARDS,
  type AshbyBoardConfig,
  type AshbyProviderOptions,
  type AshbyJobItem,
  type AshbyApiResponse,
} from './ashbyProvider';
export {
  SmartRecruitersProvider,
  DEFAULT_SMARTRECRUITERS_COMPANIES,
  VERIFIED_INDIA_SMARTRECRUITERS_COMPANIES,
  buildSmartRecruitersFullDescription,
  type SmartRecruitersCompanyConfig,
  type SmartRecruitersProviderOptions,
  type SmartRecruitersJobItem,
  type SmartRecruitersApiResponse,
  type SmartRecruitersPostingDetail,
} from './smartRecruitersProvider';
export * from '../services/indiaLocationClassifier';
import { IndiaLocationClassifier } from '../services/indiaLocationClassifier';

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

  normalizeEmploymentType(employmentType?: string, title?: string): EmploymentTypeValue {
    const rawTitle = (title || '').toLowerCase();
    if (/\b(intern|internship|industrial trainee|summer intern|co-op)\b/i.test(rawTitle)) {
      return EmploymentType.INTERNSHIP;
    }
    if (!employmentType) {
      if (/\b(graduate engineer trainee|graduate engineer|associate engineer|sde[- ]?1|sde[- ]?i)\b/i.test(rawTitle)) {
        return EmploymentType.FULL_TIME;
      }
      return EmploymentType.UNKNOWN;
    }
    const normalized = employmentType.toLowerCase();
    if (normalized.includes('full') && normalized.includes('time')) return EmploymentType.FULL_TIME;
    if (normalized.includes('part') && normalized.includes('time')) return EmploymentType.PART_TIME;
    if (normalized.includes('intern')) return EmploymentType.INTERNSHIP;
    if (normalized.includes('contract')) return EmploymentType.CONTRACT;
    return EmploymentType.UNKNOWN;
  }

  normalizeExperienceLevel(
    experienceLevel?: string,
    title?: string,
    description?: string,
  ): ExperienceLevelValue {
    const rawExp = (experienceLevel || '').toLowerCase().trim();
    const rawTitle = (title || '').toLowerCase().trim();
    const rawDesc = (description || '').toLowerCase();

    // ─── Rule 1: Explicit Seniority in Title ─────────────────────────────────
    // Senior keywords strictly take precedence over lower-tier keywords (e.g. "Senior Associate", "Lead Analyst")
    if (
      /\b(senior|sr\.?|staff|lead|principal|architect|director|vp|vice president|head of|engineering manager|engineering lead)\b/i.test(rawTitle) ||
      /\b(sde[- ]?3|sde[- ]?iii|mts[- ]?3|mts[- ]?iii|software engineer[- ]?3|software engineer[- ]?iii)\b/i.test(rawTitle)
    ) {
      if (!/\b(industrial trainee|intern)\b/i.test(rawTitle)) {
        return ExperienceLevel.SENIOR;
      }
    }

    // ─── Rule 2: Explicit Experience Level Input Parameter ───────────────────
    if (rawExp) {
      if (rawExp.includes('senior') || rawExp.includes('lead') || rawExp.includes('staff')) {
        return ExperienceLevel.SENIOR;
      }
      if (rawExp.includes('mid') || rawExp.includes('middle') || rawExp.includes('intermediate')) {
        return ExperienceLevel.MID;
      }
      if (rawExp.includes('entry') || rawExp.includes('junior')) {
        return rawExp.includes('junior') ? ExperienceLevel.JUNIOR : ExperienceLevel.ENTRY;
      }
    }

    // ─── Rule 3: Explicit Years of Experience in Description ─────────────────
    if (
      /\b(?:minimum of\s+)?(?:5\+|6\+|7\+|8\+|9\+|10\+|[5-9]\s*[-–]\s*\d+)\s*(?:years?|yrs?)\b/i.test(rawDesc) ||
      /\b(?:5|6|7|8|9|10)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:(?:production|work|relevant|hands-on|industry|software)\s+)?experience\b/i.test(rawDesc)
    ) {
      return ExperienceLevel.SENIOR;
    }

    if (
      /\b(?:[2-4]\s*[-–]\s*[4-6]|3\+|4\+)\s*(?:years?|yrs?)\b/i.test(rawDesc) ||
      /\b(?:2|3|4)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:(?:production|work|relevant|hands-on|industry|software)\s+)?experience\b/i.test(rawDesc)
    ) {
      return ExperienceLevel.MID;
    }

    if (
      /\b(?:0\s*[-–]\s*[1-2]|0\s*[-–]\s*1|1\s*[-–]\s*2|[0-1]\+|0\+)\s*(?:years?|yrs?)\b/i.test(rawDesc) ||
      /\b(?:0|1)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:(?:production|work|relevant|hands-on|industry|software)\s+)?experience\b/i.test(rawDesc)
    ) {
      return ExperienceLevel.ENTRY;
    }

    // ─── Rule 4: Internship / Traineeship in Title ───────────────────────────
    if (/\b(intern|internship|industrial trainee|summer intern|co-op)\b/i.test(rawTitle)) {
      return ExperienceLevel.ENTRY;
    }

    // ─── Rule 5: Mid-Level Technical Titles & Roman Numerals (Check before Entry) ───
    if (
      /\b(sde[- ]?2|sde[- ]?ii|software engineer[- ]?2|software engineer[- ]?ii|software development engineer[- ]?2|software development engineer[- ]?ii|associate tse[- ]?2|associate tse[- ]?ii|tse[- ]?2|tse[- ]?ii)\b/i.test(rawTitle) ||
      /\b(mid[- ]level|intermediate|assistant manager)\b/i.test(rawTitle)
    ) {
      return ExperienceLevel.MID;
    }

    // ─── Rule 6: Entry-Level / Graduate / SDE-1 Technical Titles ─────────────
    if (
      /\b(sde[- ]?1|sde[- ]?i|sde[- ]?0|software engineer[- ]?1|software engineer[- ]?i|software development engineer[- ]?1|software development engineer[- ]?i)\b/i.test(rawTitle) ||
      /\b(graduate engineer trainee|graduate engineer|graduate software engineer|graduate trainee|campus hire|university graduate|new grad|new graduate|fresher)\b/i.test(rawTitle) ||
      /\b(associate software engineer|associate engineer|associate developer|associate technical solutions engineer|associate tse)\b/i.test(rawTitle) ||
      /\b(entry[- ]level|junior developer|junior engineer|junior software engineer)\b/i.test(rawTitle)
    ) {
      return ExperienceLevel.ENTRY;
    }

    // ─── Rule 7: Conservative Fallback ───────────────────────────────────────
    return ExperienceLevel.UNKNOWN;
  }

  normalizeOpportunityType(type?: string, title?: string): OpportunityTypeValue {
    const rawTitle = (title || '').toLowerCase();
    if (/\b(intern|internship|industrial trainee|summer intern|co-op)\b/i.test(rawTitle)) {
      return OpportunityType.INTERNSHIP;
    }
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
    const rawTitle = job.title.trim();
    const rawDesc = job.description.trim();

    const indiaClassification = IndiaLocationClassifier.classify(
      job.location,
      rawTitle,
      rawDesc,
      job.workMode,
    );

    // Format location when India-eligible; otherwise preserve original location
    const normalizedLocation = indiaClassification.isIndiaEligible
      ? IndiaLocationClassifier.formatNormalizedLocation(indiaClassification, job.location)
      : (job.location?.trim() || null);

    // Resolve effective workMode
    const rawWorkModeNorm = this.normalizeWorkMode(job.workMode);
    const effectiveWorkMode = rawWorkModeNorm !== WorkMode.UNKNOWN
      ? rawWorkModeNorm
      : (indiaClassification.effectiveWorkMode !== 'UNKNOWN'
          ? (indiaClassification.effectiveWorkMode as WorkModeValue)
          : WorkMode.UNKNOWN);

    return {
      title: rawTitle,
      organization: job.company.trim(),
      description: rawDesc,
      type: this.normalizeOpportunityType(job.employmentType, rawTitle),
      location: normalizedLocation,
      workMode: effectiveWorkMode,
      employmentType: this.normalizeEmploymentType(job.employmentType, rawTitle),
      experienceLevel: this.normalizeExperienceLevel(job.experienceLevel, rawTitle, rawDesc),
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

  async ingest(
    provider: OpportunityProvider,
    signal?: AbortSignal,
  ): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
    if (signal?.aborted) {
      throw new Error(`Ingestion aborted for ${provider.name}: Operation cancelled`);
    }

    const jobs = await provider.fetch(signal);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const job of jobs) {
      if (signal?.aborted) {
        throw new Error(`Ingestion aborted for ${provider.name}: Operation cancelled before database write`);
      }
      try {
        const normalized = this.normalizer.normalize(job);
        const now = new Date();

        const existingId = await this.deduplicator.findExisting(this.prisma, normalized);

        if (existingId) {
          await this.prisma.$transaction(async (tx) => {
            const existing = await tx.opportunity.findUnique({
              where: { id: existingId },
            });

            if (existing) {
              await tx.opportunity.update({
                where: { id: existingId },
                data: {
                  title: normalized.title,
                  organization: normalized.organization,
                  description: normalized.description,
                  type: normalized.type !== OpportunityType.JOB ? normalized.type : existing.type,
                  location: normalized.location !== null ? normalized.location : existing.location,
                  workMode: normalized.workMode !== WorkMode.UNKNOWN ? normalized.workMode : existing.workMode,
                  employmentType: normalized.employmentType !== EmploymentType.UNKNOWN ? normalized.employmentType : existing.employmentType,
                  experienceLevel: normalized.experienceLevel !== ExperienceLevel.UNKNOWN ? normalized.experienceLevel : existing.experienceLevel,
                  applicationUrl: normalized.applicationUrl,
                  sourceUrl: normalized.sourceUrl !== null ? normalized.sourceUrl : existing.sourceUrl,
                  postedDate: normalized.postedDate !== null ? normalized.postedDate : existing.postedDate,
                  deadline: normalized.deadline !== null ? normalized.deadline : existing.deadline,
                  lastSeenAt: now,
                  updatedAt: now,
                },
              });

              // Refresh OpportunitySkill relations when source requirements are provided
              const hasSkills = (normalized.requiredSkills && normalized.requiredSkills.length > 0) ||
                                (normalized.preferredSkills && normalized.preferredSkills.length > 0);

              if (hasSkills) {
                await tx.opportunitySkill.deleteMany({
                  where: { opportunityId: existingId },
                });

                const reqSkillIds: string[] = [];
                for (const skillName of normalized.requiredSkills) {
                  const skill = await tx.skill.upsert({
                    where: { name: skillName },
                    update: {},
                    create: {
                      id: randomUUID(),
                      name: skillName,
                      category: 'TOOL',
                    },
                  });
                  if (!reqSkillIds.includes(skill.id)) {
                    reqSkillIds.push(skill.id);
                  }
                }

                for (const skillId of reqSkillIds) {
                  await tx.opportunitySkill.create({
                    data: {
                      opportunityId: existingId,
                      skillId,
                      requirementType: RequirementType.REQUIRED,
                    },
                  });
                }

                const prefSkillIds: string[] = [];
                for (const skillName of normalized.preferredSkills) {
                  const skill = await tx.skill.upsert({
                    where: { name: skillName },
                    update: {},
                    create: {
                      id: randomUUID(),
                      name: skillName,
                      category: 'TOOL',
                    },
                  });
                  if (!prefSkillIds.includes(skill.id) && !reqSkillIds.includes(skill.id)) {
                    prefSkillIds.push(skill.id);
                  }
                }

                for (const skillId of prefSkillIds) {
                  await tx.opportunitySkill.create({
                    data: {
                      opportunityId: existingId,
                      skillId,
                      requirementType: RequirementType.PREFERRED,
                    },
                  });
                }
              }
            }
          });

          updated++;
          skipped++;
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const opportunity = await tx.opportunity.create({
            data: {
              id: randomUUID(),
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
              lastSeenAt: now,
              updatedAt: now,
            },
          });

          const createdReqSkillIds: string[] = [];
          for (const skillName of normalized.requiredSkills) {
            const skill = await tx.skill.upsert({
              where: { name: skillName },
              update: {},
              create: {
                id: randomUUID(),
                name: skillName,
                category: 'TOOL',
              },
            });
            if (!createdReqSkillIds.includes(skill.id)) {
              createdReqSkillIds.push(skill.id);
            }
          }

          for (const skillId of createdReqSkillIds) {
            await tx.opportunitySkill.create({
              data: {
                opportunityId: opportunity.id,
                skillId,
                requirementType: RequirementType.REQUIRED,
              },
            });
          }

          const createdPrefSkillIds: string[] = [];
          for (const skillName of normalized.preferredSkills) {
            const skill = await tx.skill.upsert({
              where: { name: skillName },
              update: {},
              create: {
                id: randomUUID(),
                name: skillName,
                category: 'TOOL',
              },
            });
            if (!createdPrefSkillIds.includes(skill.id) && !createdReqSkillIds.includes(skill.id)) {
              createdPrefSkillIds.push(skill.id);
            }
          }

          for (const skillId of createdPrefSkillIds) {
            await tx.opportunitySkill.create({
              data: {
                opportunityId: opportunity.id,
                skillId,
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

    return { created, updated, skipped, errors };
  }
}
