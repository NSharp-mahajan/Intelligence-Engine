import type { ExternalJob, OpportunityProvider, ProviderFetchStats } from './opportunityProvider';
import { extractOpportunitySkills } from '../services/opportunitySkillExtractor';
import { IndiaLocationClassifier } from '../services/indiaLocationClassifier';

export interface GreenhouseBoardConfig {
  boardToken: string;
  companyName: string;
}

export interface GreenhouseProviderOptions {
  boards?: GreenhouseBoardConfig[];
  timeoutMs?: number;
  maxJobsPerBoard?: number;
  maxScanLimit?: number;
}

export interface GreenhouseDepartment {
  id: number;
  name: string;
  child_ids?: number[];
  parent_id?: number | null;
}

export interface GreenhouseOffice {
  id: number;
  name: string;
  location?: string | null;
  child_ids?: number[];
  parent_id?: number | null;
}

export interface GreenhouseJobItem {
  id: number | string;
  internal_job_id?: number | string;
  title: string;
  company_name?: string;
  content?: string;
  location?: {
    name?: string;
  } | null;
  absolute_url?: string;
  updated_at?: string;
  first_published?: string | null;
  application_deadline?: string | null;
  departments?: GreenhouseDepartment[];
  offices?: GreenhouseOffice[];
  requisition_id?: string | null;
  data_compliance?: unknown[];
  metadata?: unknown[];
}

export interface GreenhouseApiResponse {
  jobs?: GreenhouseJobItem[];
  meta?: {
    total?: number;
  };
}

export const VERIFIED_INDIA_GREENHOUSE_BOARDS: GreenhouseBoardConfig[] = [
  { boardToken: 'databricks', companyName: 'Databricks' },
  { boardToken: 'okta', companyName: 'Okta' },
  { boardToken: 'stripe', companyName: 'Stripe' },
  { boardToken: 'inmobi', companyName: 'InMobi' },
  { boardToken: 'rubrik', companyName: 'Rubrik' },
  { boardToken: 'mongodb', companyName: 'MongoDB' },
  { boardToken: 'elastic', companyName: 'Elastic' },
  { boardToken: 'druva', companyName: 'Druva' },
  { boardToken: 'groww', companyName: 'Groww' },
  { boardToken: 'coinbase', companyName: 'Coinbase' },
  { boardToken: 'cloudflare', companyName: 'Cloudflare' },
];

export const DEFAULT_GREENHOUSE_BOARDS: GreenhouseBoardConfig[] = [
  { boardToken: 'cloudflare', companyName: 'Cloudflare' },
  { boardToken: 'databricks', companyName: 'Databricks' },
  { boardToken: 'okta', companyName: 'Okta' },
  { boardToken: 'stripe', companyName: 'Stripe' },
  { boardToken: 'inmobi', companyName: 'InMobi' },
  { boardToken: 'rubrik', companyName: 'Rubrik' },
  { boardToken: 'mongodb', companyName: 'MongoDB' },
  { boardToken: 'elastic', companyName: 'Elastic' },
  { boardToken: 'druva', companyName: 'Druva' },
  { boardToken: 'groww', companyName: 'Groww' },
  { boardToken: 'coinbase', companyName: 'Coinbase' },
];

/**
 * Safely decodes common HTML entities often returned by Greenhouse API content fields.
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&nbsp;/g, ' ');
}

export class GreenhouseProvider implements OpportunityProvider {
  readonly name = 'Greenhouse';
  private readonly boards: GreenhouseBoardConfig[];
  private readonly timeoutMs: number;
  private readonly maxJobsPerBoard?: number;
  private readonly maxScanLimit: number;
  private lastFetchStats: ProviderFetchStats = { successfulSources: [], failedSources: [] };

  constructor(options?: GreenhouseProviderOptions | GreenhouseBoardConfig[]) {
    if (Array.isArray(options)) {
      this.boards = options.length > 0 ? options : DEFAULT_GREENHOUSE_BOARDS;
      this.timeoutMs = 30000;
      this.maxJobsPerBoard = 25;
      this.maxScanLimit = 500;
    } else {
      this.boards = options?.boards && options.boards.length > 0 ? options.boards : DEFAULT_GREENHOUSE_BOARDS;
      this.timeoutMs = options?.timeoutMs ?? 30000;
      this.maxJobsPerBoard = options?.maxJobsPerBoard !== undefined ? options.maxJobsPerBoard : 25;
      this.maxScanLimit = options?.maxScanLimit !== undefined ? options.maxScanLimit : 500;
    }
  }

  getBoardConfigs(): readonly GreenhouseBoardConfig[] {
    return this.boards;
  }

  getLastFetchStats(): ProviderFetchStats {
    return this.lastFetchStats;
  }

  async fetch(signal?: AbortSignal): Promise<ExternalJob[]> {
    if (signal?.aborted) {
      throw new Error(`[GreenhouseProvider] Operation aborted before starting fetch`);
    }

    this.lastFetchStats = { successfulSources: [], failedSources: [] };
    const allJobs: ExternalJob[] = [];

    for (const board of this.boards) {
      if (signal?.aborted) {
        throw new Error(`[GreenhouseProvider] Operation aborted during board iteration`);
      }

      try {
        const boardJobs = await this.fetchBoard(board, signal);
        allJobs.push(...boardJobs);
        this.lastFetchStats.successfulSources.push(board.boardToken);
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        const errMsg = error instanceof Error ? error.message : String(error);
        this.lastFetchStats.failedSources.push({ source: board.boardToken, error: errMsg });
        console.error(
          `[GreenhouseProvider] Failed to fetch board "${board.boardToken}" (${board.companyName}):`,
          errMsg,
        );
      }
    }

    // If every configured board failed, propagate error
    if (this.boards.length > 0 && this.lastFetchStats.failedSources.length === this.boards.length) {
      throw new Error(
        `All ${this.boards.length} configured Greenhouse boards failed: ${this.lastFetchStats.failedSources.map((f) => `${f.source} (${f.error})`).join('; ')}`,
      );
    }

    return allJobs;
  }

  /**
   * Fetches and transforms jobs for a single Greenhouse board.
   *
   * The public Greenhouse Job Board API returns all active jobs for a board in a single payload.
   * To prevent global employers (with hundreds of overseas listings ahead of India listings)
   * from missing India-eligible roles under a bounded retention limit, this method:
   * 1. Inspects raw listings up to bounded scan limit (maxScanLimit, default 500).
   * 2. Retains all India-eligible jobs discovered within that scanned window.
   * 3. Retains non-India jobs up to the remaining quota of maxJobsPerBoard, preserving
   *    the shared Opportunity table contract without truncation bias.
   */
  async fetchBoard(board: GreenhouseBoardConfig, signal?: AbortSignal): Promise<ExternalJob[]> {
    if (signal?.aborted) {
      throw new Error(`[GreenhouseProvider] Request aborted before sending for "${board.boardToken}"`);
    }

    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.boardToken)}/jobs?content=true`;
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Udaan/1.0',
      },
      signal: combinedSignal,
    });

    if (!response.ok) {
      throw new Error(`Greenhouse API error for "${board.boardToken}": ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GreenhouseApiResponse;
    if (!data || !Array.isArray(data.jobs)) {
      console.warn(`[GreenhouseProvider] Board "${board.boardToken}" returned empty or malformed payload.`);
      return [];
    }

    const scanLimit = this.maxScanLimit > 0 ? Math.min(data.jobs.length, this.maxScanLimit) : data.jobs.length;
    const scannedJobs = data.jobs.slice(0, scanLimit);

    if (this.maxJobsPerBoard === undefined || this.maxJobsPerBoard <= 0 || scannedJobs.length <= this.maxJobsPerBoard) {
      return scannedJobs.map((job) => this.transformGreenhouseJob(job, board));
    }

    // Partition scanned jobs into India-eligible vs other listings
    const indiaJobs: GreenhouseJobItem[] = [];
    const otherJobs: GreenhouseJobItem[] = [];

    for (const job of scannedJobs) {
      let locationStr = job.location?.name?.trim() || undefined;
      if (!locationStr && Array.isArray(job.offices) && job.offices.length > 0) {
        locationStr = job.offices[0].location?.trim() || job.offices[0].name?.trim() || undefined;
      }
      const rawContent = typeof job.content === 'string' ? job.content : '';
      const cleanDesc = decodeHtmlEntities(rawContent);

      const classification = IndiaLocationClassifier.classify(locationStr, job.title || '', cleanDesc);
      if (classification.isIndiaEligible) {
        indiaJobs.push(job);
      } else {
        otherJobs.push(job);
      }
    }

    // Retain India jobs first, then fill remaining capacity with other jobs up to maxJobsPerBoard
    const retained: GreenhouseJobItem[] = [...indiaJobs];
    const remainingQuota = Math.max(0, this.maxJobsPerBoard - retained.length);
    if (remainingQuota > 0) {
      retained.push(...otherJobs.slice(0, remainingQuota));
    }

    return retained.map((job) => this.transformGreenhouseJob(job, board));
  }

  /**
   * Maps a raw Greenhouse job payload item to the canonical ExternalJob representation.
   */
  transformGreenhouseJob(job: GreenhouseJobItem, board: GreenhouseBoardConfig): ExternalJob {
    const rawContent = typeof job.content === 'string' ? job.content : '';
    const cleanDescription = decodeHtmlEntities(rawContent);

    // Derive company name: payload takes priority, then board configuration, then fallback
    const companyName = job.company_name?.trim() || board.companyName || 'Unknown Organization';

    // Derive location string
    let locationStr: string | undefined = job.location?.name?.trim() || undefined;
    if (!locationStr && Array.isArray(job.offices) && job.offices.length > 0) {
      locationStr = job.offices[0].location?.trim() || job.offices[0].name?.trim() || undefined;
    }

    // Infer work mode if signaled in location or title
    let workMode: string | undefined = undefined;
    const locLower = (locationStr || '').toLowerCase();
    const titleLower = (job.title || '').toLowerCase();
    if (locLower.includes('remote') || titleLower.includes('remote')) {
      workMode = 'REMOTE';
    } else if (locLower.includes('hybrid') || titleLower.includes('hybrid')) {
      workMode = 'HYBRID';
    } else if (locationStr) {
      workMode = 'ONSITE';
    }

    // Infer employment type if signaled with word-boundary matching (e.g. Internships, Contracts)
    let employmentType: string | undefined = undefined;
    const rawTitle = job.title || '';
    if (/\b(intern|internship|internships|co-op)\b/i.test(rawTitle)) {
      employmentType = 'INTERNSHIP';
    } else if (/\b(contract|contractor|temporary|temp)\b/i.test(rawTitle)) {
      employmentType = 'CONTRACT';
    }

    // Extract skills deterministically from title and full description
    const extraction = extractOpportunitySkills(job.title || '', cleanDescription);

    // Publication date: ONLY use first_published if provided. Do not use updated_at as postedDate.
    const postedDate = job.first_published ? job.first_published : undefined;

    // Deadline: map application_deadline if provided
    const deadline = job.application_deadline ? job.application_deadline : undefined;

    return {
      id: job.id !== undefined && job.id !== null ? String(job.id) : undefined,
      title: job.title?.trim() || 'Untitled Opportunity',
      company: companyName,
      description: cleanDescription,
      location: locationStr,
      workMode,
      employmentType,
      applicationUrl: job.absolute_url || '',
      sourceUrl: job.absolute_url || undefined,
      source: 'Greenhouse',
      postedDate,
      deadline,
      requiredSkills: extraction.requiredSkills,
      preferredSkills: extraction.preferredSkills,
    };
  }
}
