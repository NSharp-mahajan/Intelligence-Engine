import type { ExternalJob, OpportunityProvider, ProviderFetchStats } from './opportunityProvider';
import { extractOpportunitySkills } from '../services/opportunitySkillExtractor';
import { IndiaLocationClassifier } from '../services/indiaLocationClassifier';

export interface AshbyBoardConfig {
  boardToken: string;
  companyName: string;
}

export interface AshbyProviderOptions {
  boards?: AshbyBoardConfig[];
  timeoutMs?: number;
  maxJobsPerBoard?: number;
  maxScanLimit?: number;
}

export interface AshbyAddress {
  postalAddress?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
}

export interface AshbyJobItem {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: string[];
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  address?: AshbyAddress;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: unknown;
  customFields?: unknown[];
}

export interface AshbyApiResponse {
  apiVersion?: string;
  jobs?: AshbyJobItem[];
}

export const VERIFIED_INDIA_ASHBY_BOARDS: AshbyBoardConfig[] = [
  { boardToken: 'sarvam', companyName: 'Sarvam AI' },
  { boardToken: 'aiprise', companyName: 'AiPrise' },
  { boardToken: 'certifyos', companyName: 'CertifyOS' },
  { boardToken: 'ema', companyName: 'Ema' },
  { boardToken: 'smallest', companyName: 'Smallest.ai' },
];

export const DEFAULT_ASHBY_BOARDS: AshbyBoardConfig[] = [
  ...VERIFIED_INDIA_ASHBY_BOARDS,
];

/**
 * Safely decodes common HTML entities often returned in job descriptions.
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

/**
 * Validates whether a given URL string is non-empty and has a valid HTTP/HTTPS protocol.
 */
export function isValidHttpUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parses a date value into an epoch millisecond timestamp, returning null if invalid/missing.
 */
export function parsePublicationTimestamp(dateStr?: string | Date | null): number | null {
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  return isNaN(ts) ? null : ts;
}

/**
 * Deterministic comparator that orders jobs by publication timestamp newest-first,
 * placing items with valid dates before items with missing/invalid dates,
 * and breaking ties stably using id and title/name.
 */
export function deterministicJobSortComparator<T extends { id?: string | number; title?: string; name?: string }>(
  getDate: (item: T) => string | Date | undefined | null,
): (a: T, b: T) => number {
  return (a, b) => {
    const timeA = parsePublicationTimestamp(getDate(a));
    const timeB = parsePublicationTimestamp(getDate(b));

    if (timeA !== null && timeB !== null) {
      if (timeB !== timeA) {
        return timeB - timeA; // newest first
      }
    } else if (timeA !== null && timeB === null) {
      return -1; // valid date before missing date
    } else if (timeA === null && timeB !== null) {
      return 1; // missing date after valid date
    }

    // Stable fallback for identical dates or missing dates: sort by ID, then title/name
    const idA = String(a.id ?? '');
    const idB = String(b.id ?? '');
    if (idA !== idB) {
      return idA.localeCompare(idB);
    }
    const titleA = String(a.title ?? a.name ?? '');
    const titleB = String(b.title ?? b.name ?? '');
    return titleA.localeCompare(titleB);
  };
}

/**
 * Extracts all distinct valid location strings from an Ashby job item,
 * including primary location, postal address, and all secondary locations.
 */
export function extractAshbyAllLocations(job: AshbyJobItem): string[] {
  const locations: string[] = [];

  if (job.location && job.location.trim()) {
    locations.push(job.location.trim());
  } else if (job.address?.postalAddress) {
    const addr = job.address.postalAddress;
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .map((p) => p?.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      locations.push(parts.join(', '));
    }
  }

  if (Array.isArray(job.secondaryLocations)) {
    for (const sec of job.secondaryLocations) {
      if (typeof sec === 'string' && sec.trim() && !locations.includes(sec.trim())) {
        locations.push(sec.trim());
      }
    }
  }

  return locations;
}

/**
 * Determines whether an Ashby job is India-eligible by inspecting its primary
 * location, all secondary locations individually, and the combined location string.
 */
export function isAshbyJobIndiaEligible(job: AshbyJobItem, cleanDesc: string): boolean {
  const allLocations = extractAshbyAllLocations(job);

  if (allLocations.length === 0) {
    return IndiaLocationClassifier.classify(undefined, job.title || '', cleanDesc).isIndiaEligible;
  }

  // Check each individual location (e.g. secondary locations when primary is overseas)
  for (const loc of allLocations) {
    const classification = IndiaLocationClassifier.classify(loc, job.title || '', cleanDesc);
    if (classification.isIndiaEligible) {
      return true;
    }
  }

  // Also check combined location string if multiple exist
  if (allLocations.length > 1) {
    const combined = allLocations.join('; ');
    const combinedClassification = IndiaLocationClassifier.classify(combined, job.title || '', cleanDesc);
    if (combinedClassification.isIndiaEligible) {
      return true;
    }
  }

  return false;
}

export class AshbyProvider implements OpportunityProvider {
  readonly name = 'Ashby';
  private readonly boards: AshbyBoardConfig[];
  private readonly timeoutMs: number;
  private readonly maxJobsPerBoard?: number;
  private readonly maxScanLimit: number;
  private lastFetchStats: ProviderFetchStats = { successfulSources: [], failedSources: [] };

  constructor(options?: AshbyProviderOptions | AshbyBoardConfig[]) {
    if (Array.isArray(options)) {
      this.boards = options.length > 0 ? options : DEFAULT_ASHBY_BOARDS;
      this.timeoutMs = 30000;
      this.maxJobsPerBoard = 25;
      this.maxScanLimit = 500;
    } else {
      this.boards = options?.boards && options.boards.length > 0 ? options.boards : DEFAULT_ASHBY_BOARDS;
      this.timeoutMs = options?.timeoutMs ?? 30000;
      this.maxJobsPerBoard = options?.maxJobsPerBoard !== undefined ? options.maxJobsPerBoard : 25;
      this.maxScanLimit = options?.maxScanLimit !== undefined ? options.maxScanLimit : 500;
    }
  }

  getBoardConfigs(): readonly AshbyBoardConfig[] {
    return this.boards;
  }

  getLastFetchStats(): ProviderFetchStats {
    return this.lastFetchStats;
  }

  async fetch(signal?: AbortSignal): Promise<ExternalJob[]> {
    if (signal?.aborted) {
      throw new Error(`[AshbyProvider] Operation aborted before starting fetch`);
    }

    this.lastFetchStats = { successfulSources: [], failedSources: [] };
    const allJobs: ExternalJob[] = [];

    for (const board of this.boards) {
      if (signal?.aborted) {
        throw new Error(`[AshbyProvider] Operation aborted during board iteration`);
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
          `[AshbyProvider] Failed to fetch board "${board.boardToken}" (${board.companyName}):`,
          errMsg,
        );
      }
    }

    // If every configured board failed, propagate an error so the scheduler records a failure
    if (this.boards.length > 0 && this.lastFetchStats.failedSources.length === this.boards.length) {
      throw new Error(
        `All ${this.boards.length} configured Ashby boards failed: ${this.lastFetchStats.failedSources.map((f) => `${f.source} (${f.error})`).join('; ')}`,
      );
    }

    return allJobs;
  }

  /**
   * Fetches raw job postings from the Ashby Job Board API.
   * Overrideable for testing and mocking.
   */
  protected async fetchRawJobs(board: AshbyBoardConfig, signal?: AbortSignal): Promise<AshbyJobItem[]> {
    if (signal?.aborted) {
      throw new Error(`[AshbyProvider] Request aborted before sending for "${board.boardToken}"`);
    }

    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.boardToken)}`;
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Career-Intelligence-Engine/1.0',
      },
      signal: combinedSignal,
    });

    if (!response.ok) {
      throw new Error(`Ashby API error for "${board.boardToken}": ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AshbyApiResponse;
    if (!data || !Array.isArray(data.jobs)) {
      console.warn(`[AshbyProvider] Board "${board.boardToken}" returned empty or malformed payload.`);
      return [];
    }

    return data.jobs;
  }

  /**
   * Fetches and transforms jobs for a single Ashby board.
   *
   * 1. Inspects raw listings up to bounded scan limit (maxScanLimit, default 500).
   * 2. Partitions scanned listings into India-eligible vs other listings, inspecting all secondary locations.
   * 3. Sorts each group deterministically by publication date (newest first) with stable fallback.
   * 4. Retains discovered India jobs first, then fills remaining quota up to maxJobsPerBoard.
   */
  async fetchBoard(board: AshbyBoardConfig, signal?: AbortSignal): Promise<ExternalJob[]> {
    const rawJobs = await this.fetchRawJobs(board, signal);

    if (signal?.aborted) {
      throw new Error(`[AshbyProvider] Processing aborted after fetching raw jobs for "${board.boardToken}"`);
    }

    // Only process listed jobs if isListed is explicitly boolean, otherwise accept all
    const activeJobs = rawJobs.filter((job) => job && (job.isListed === undefined || job.isListed === true));

    const scanLimit = this.maxScanLimit > 0 ? Math.min(activeJobs.length, this.maxScanLimit) : activeJobs.length;
    const scannedJobs = activeJobs.slice(0, scanLimit);

    // Partition scanned jobs into India-eligible vs other listings
    const indiaJobs: AshbyJobItem[] = [];
    const otherJobs: AshbyJobItem[] = [];

    for (const job of scannedJobs) {
      const rawContent = job.descriptionPlain || job.descriptionHtml || '';
      const cleanDesc = decodeHtmlEntities(rawContent);

      if (isAshbyJobIndiaEligible(job, cleanDesc)) {
        indiaJobs.push(job);
      } else {
        otherJobs.push(job);
      }
    }

    // Sort both groups deterministically: publication date newest-first, with stable ID/title fallback
    const sortComparator = deterministicJobSortComparator<AshbyJobItem>((j) => j.publishedAt);
    indiaJobs.sort(sortComparator);
    otherJobs.sort(sortComparator);

    let retained: AshbyJobItem[];
    if (this.maxJobsPerBoard === undefined || this.maxJobsPerBoard <= 0) {
      retained = [...indiaJobs, ...otherJobs];
    } else {
      const selectedIndia = indiaJobs.slice(0, this.maxJobsPerBoard);
      const remainingQuota = Math.max(0, this.maxJobsPerBoard - selectedIndia.length);
      const selectedOther = remainingQuota > 0 ? otherJobs.slice(0, remainingQuota) : [];
      retained = [...selectedIndia, ...selectedOther];
    }

    return retained.map((job) => this.transformAshbyJob(job, board));
  }

  /**
   * Derives a comprehensive location string from Ashby job fields,
   * accurately preserving primary location and all secondary locations.
   */
  private extractLocationString(job: AshbyJobItem): string | undefined {
    const all = extractAshbyAllLocations(job);
    return all.length > 0 ? all.join('; ') : undefined;
  }

  /**
   * Maps a raw Ashby job payload item to the canonical ExternalJob representation.
   */
  transformAshbyJob(job: AshbyJobItem, board: AshbyBoardConfig): ExternalJob {
    const rawContent = job.descriptionHtml || job.descriptionPlain || '';
    const cleanDescription = decodeHtmlEntities(rawContent);

    // Derive company name
    const companyName = board.companyName || 'Unknown Organization';

    // Derive location string preserving all secondary locations accurately
    const locationStr = this.extractLocationString(job);

    // Infer work mode from workplaceType, isRemote, or location/title
    let workMode: string | undefined = undefined;
    const wp = (job.workplaceType || '').toLowerCase();
    if (wp === 'remote' || job.isRemote === true) {
      workMode = 'REMOTE';
    } else if (wp === 'hybrid') {
      workMode = 'HYBRID';
    } else if (wp === 'onsite') {
      workMode = 'ONSITE';
    } else {
      const locLower = (locationStr || '').toLowerCase();
      const titleLower = (job.title || '').toLowerCase();
      if (locLower.includes('remote') || titleLower.includes('remote')) {
        workMode = 'REMOTE';
      } else if (locLower.includes('hybrid') || titleLower.includes('hybrid')) {
        workMode = 'HYBRID';
      } else if (locationStr) {
        workMode = 'ONSITE';
      }
    }

    // Infer employment type strictly based on source data evidence:
    // 1. Only classify INTERNSHIP with actual intern / co-op evidence.
    // 2. Treat graduate / fresher / GET as potential full-time roles when supported by source data.
    // 3. Do not infer full-time employment when source provides no reliable evidence.
    let employmentType: string | undefined = undefined;
    const rawEmpType = (job.employmentType || '').toLowerCase();
    const rawTitle = job.title || '';

    const isInternEvidence =
      rawEmpType.includes('intern') ||
      rawEmpType.includes('coop') ||
      rawEmpType.includes('co-op') ||
      /\b(intern|internship|internships|summer intern|summer internship|co-op|coop)\b/i.test(rawTitle);

    const isContractEvidence =
      rawEmpType.includes('contract') ||
      rawEmpType.includes('temp') ||
      /\b(contract|contractor|temporary|temp)\b/i.test(rawTitle);

    const isPartTimeEvidence =
      rawEmpType.includes('parttime') ||
      rawEmpType.includes('part-time') ||
      /\bpart[- ]time\b/i.test(rawTitle);

    const isFullTimeEvidence =
      rawEmpType.includes('fulltime') ||
      rawEmpType.includes('full-time') ||
      /\bfull[- ]time\b/i.test(rawTitle);

    if (isInternEvidence) {
      employmentType = 'INTERNSHIP';
    } else if (isContractEvidence) {
      employmentType = 'CONTRACT';
    } else if (isPartTimeEvidence) {
      employmentType = 'PART_TIME';
    } else if (isFullTimeEvidence) {
      employmentType = 'FULL_TIME';
    }

    // Extract skills deterministically from title and description
    const extraction = extractOpportunitySkills(job.title || '', cleanDescription);

    // Publication date: Ashby provides publishedAt (ISO 8601 string)
    const postedDate = job.publishedAt ? job.publishedAt : undefined;

    // Direct application URL and public job page URL with HTTP/HTTPS scheme validation
    const validApplyUrl = isValidHttpUrl(job.applyUrl) ? job.applyUrl!.trim() : undefined;
    const validJobUrl = isValidHttpUrl(job.jobUrl) ? job.jobUrl!.trim() : undefined;

    const applicationUrl = validApplyUrl || validJobUrl || '';
    const sourceUrl = validJobUrl || validApplyUrl || undefined;

    return {
      id: job.id ? String(job.id) : undefined,
      title: job.title?.trim() || 'Untitled Opportunity',
      company: companyName,
      description: cleanDescription,
      location: locationStr,
      workMode,
      employmentType,
      applicationUrl,
      sourceUrl,
      source: 'Ashby',
      postedDate,
      requiredSkills: extraction.requiredSkills,
      preferredSkills: extraction.preferredSkills,
    };
  }
}
