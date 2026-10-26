import type { ExternalJob, OpportunityProvider } from './opportunityProvider';
import { extractOpportunitySkills } from '../services/opportunitySkillExtractor';

export interface LeverBoardConfig {
  site: string;
  companyName: string;
}

export interface LeverProviderOptions {
  boards?: LeverBoardConfig[];
  timeoutMs?: number;
  maxJobsPerBoard?: number;
}

export interface LeverCategoryData {
  commitment?: string;
  department?: string;
  team?: string;
  location?: string;
  allLocations?: string[];
}

export interface LeverJobListItem {
  text?: string;
  content?: string;
}

export interface LeverJobItem {
  id: string;
  text?: string;
  createdAt?: number | string;
  description?: string;
  descriptionPlain?: string;
  descriptionBody?: string;
  descriptionBodyPlain?: string;
  additional?: string;
  additionalPlain?: string;
  lists?: LeverJobListItem[];
  hostedUrl?: string;
  applyUrl?: string;
  workplaceType?: string;
  categories?: LeverCategoryData;
  country?: string;
  opening?: string;
  openingPlain?: string;
}

export const DEFAULT_LEVER_BOARDS: LeverBoardConfig[] = [
  { site: 'palantir', companyName: 'Palantir' },
  { site: 'spotify', companyName: 'Spotify' },
];

/**
 * Reconstructs the full HTML job description by assembling the role body,
 * structured lists (requirements, technologies, qualifications), and additional info.
 */
export function buildLeverFullDescription(job: LeverJobItem): string {
  const parts: string[] = [];

  // 1. Role / Overview body (fallback to description if descriptionBody is omitted)
  const body = (job.descriptionBody || job.description || '').trim();
  if (body) {
    parts.push(body);
  }

  // 2. Structured requirement / responsibility lists
  if (Array.isArray(job.lists) && job.lists.length > 0) {
    for (const list of job.lists) {
      const heading = list.text?.trim() ? `<h3>${list.text.trim()}</h3>` : '';
      const listContent = list.content?.trim() ? `<ul>${list.content.trim()}</ul>` : '';
      if (heading || listContent) {
        parts.push([heading, listContent].filter(Boolean).join('\n'));
      }
    }
  }

  // 3. Additional information / footer if provided
  const additional = (job.additional || '').trim();
  if (additional) {
    parts.push(additional);
  }

  return parts.join('\n\n');
}

export class LeverProvider implements OpportunityProvider {
  readonly name = 'Lever';
  private readonly boards: LeverBoardConfig[];
  private readonly timeoutMs: number;
  private readonly maxJobsPerBoard?: number;

  constructor(options?: LeverProviderOptions | LeverBoardConfig[]) {
    if (Array.isArray(options)) {
      this.boards = options.length > 0 ? options : DEFAULT_LEVER_BOARDS;
      this.timeoutMs = 15000;
    } else {
      this.boards = options?.boards && options.boards.length > 0 ? options.boards : DEFAULT_LEVER_BOARDS;
      this.timeoutMs = options?.timeoutMs ?? 15000;
      this.maxJobsPerBoard = options?.maxJobsPerBoard;
    }
  }

  getBoardConfigs(): readonly LeverBoardConfig[] {
    return this.boards;
  }

  async fetch(): Promise<ExternalJob[]> {
    const allJobs: ExternalJob[] = [];

    for (const board of this.boards) {
      try {
        const boardJobs = await this.fetchBoard(board);
        allJobs.push(...boardJobs);
      } catch (error) {
        console.error(
          `[LeverProvider] Failed to fetch board "${board.site}" (${board.companyName}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return allJobs;
  }

  /**
   * Fetches and transforms jobs for a single Lever site.
   */
  async fetchBoard(board: LeverBoardConfig): Promise<ExternalJob[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.site)}?mode=json`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Career-Intelligence-Engine/1.0',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Lever API error for "${board.site}": ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn(`[LeverProvider] Board "${board.site}" returned non-array payload.`);
      return [];
    }

    let jobsList: LeverJobItem[] = data as LeverJobItem[];
    if (this.maxJobsPerBoard !== undefined && this.maxJobsPerBoard > 0) {
      jobsList = jobsList.slice(0, this.maxJobsPerBoard);
    }

    return jobsList.map((job) => this.transformLeverJob(job, board));
  }

  /**
   * Maps a raw Lever job payload item to the canonical ExternalJob representation.
   */
  transformLeverJob(job: LeverJobItem, board: LeverBoardConfig): ExternalJob {
    const rawTitle = (job.text || '').trim();
    const fullDescription = buildLeverFullDescription(job);

    // Derive company name: board configuration guarantees employer identity
    const companyName = board.companyName || 'Unknown Organization';

    // Derive location string
    let locationStr: string | undefined = job.categories?.location?.trim() || undefined;
    if (!locationStr && Array.isArray(job.categories?.allLocations) && job.categories.allLocations.length > 0) {
      locationStr = job.categories.allLocations[0]?.trim() || undefined;
    }

    // Infer work mode using explicit Lever workplaceType and word-boundary location checks
    let workMode: string | undefined = undefined;
    const wpType = (job.workplaceType || '').toLowerCase().trim();
    const locLower = (locationStr || '').toLowerCase();
    const titleLower = rawTitle.toLowerCase();

    if (wpType === 'remote' || /\bremote\b/i.test(locLower) || /\bremote\b/i.test(titleLower)) {
      workMode = 'REMOTE';
    } else if (wpType === 'hybrid' || /\bhybrid\b/i.test(locLower) || /\bhybrid\b/i.test(titleLower)) {
      workMode = 'HYBRID';
    } else if (wpType === 'on-site' || wpType === 'onsite' || locationStr) {
      workMode = 'ONSITE';
    }

    // Infer employment type using commitment and word-boundary title checks
    let employmentType: string | undefined = undefined;
    const commitment = (job.categories?.commitment || '').trim();

    if (
      /\b(intern|internship|internships|co-op)\b/i.test(rawTitle) ||
      /\b(intern|internship|internships|co-op)\b/i.test(commitment)
    ) {
      employmentType = 'INTERNSHIP';
    } else if (
      /\b(contract|contractor|temporary|temp)\b/i.test(rawTitle) ||
      /\b(contract|contractor|temporary|temp)\b/i.test(commitment)
    ) {
      employmentType = 'CONTRACT';
    } else if (/\b(full[\s-]?time|permanent)\b/i.test(commitment)) {
      employmentType = 'FULL_TIME';
    } else if (/\b(part[\s-]?time)\b/i.test(commitment)) {
      employmentType = 'PART_TIME';
    }

    // Extract skills deterministically from title and reconstructed description
    const extraction = extractOpportunitySkills(rawTitle, fullDescription);

    // Publication date: createdAt is a millisecond epoch timestamp in Lever
    let postedDate: Date | undefined = undefined;
    if (typeof job.createdAt === 'number' && !isNaN(job.createdAt) && job.createdAt > 0) {
      postedDate = new Date(job.createdAt);
    } else if (typeof job.createdAt === 'string' && job.createdAt.trim()) {
      const parsed = new Date(job.createdAt);
      if (!isNaN(parsed.getTime())) {
        postedDate = parsed;
      }
    }

    return {
      id: job.id !== undefined && job.id !== null ? String(job.id).trim() : undefined,
      title: rawTitle || 'Untitled Opportunity',
      company: companyName,
      description: fullDescription,
      location: locationStr,
      workMode,
      employmentType,
      applicationUrl: job.applyUrl?.trim() || job.hostedUrl?.trim() || '',
      sourceUrl: job.hostedUrl?.trim() || undefined,
      source: 'Lever',
      postedDate,
      requiredSkills: extraction.requiredSkills,
      preferredSkills: extraction.preferredSkills,
    };
  }
}
