import type { ExternalJob, OpportunityProvider } from './opportunityProvider';
import { extractOpportunitySkills } from '../services/opportunitySkillExtractor';
import { IndiaLocationClassifier } from '../services/indiaLocationClassifier';

export interface LeverBoardConfig {
  site: string;
  companyName: string;
}

export interface LeverProviderOptions {
  boards?: LeverBoardConfig[];
  timeoutMs?: number;
  maxJobsPerBoard?: number;
  maxScanLimit?: number;
  pageSize?: number;
  maxRequestsPerBoard?: number;
  rateLimitDelayMs?: number;
  maxRetries?: number;
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

export const VERIFIED_INDIA_LEVER_BOARDS: LeverBoardConfig[] = [
  { site: 'meesho', companyName: 'Meesho' },
  { site: 'cred', companyName: 'CRED' },
  { site: 'spotify', companyName: 'Spotify' },
];

export const DEFAULT_LEVER_BOARDS: LeverBoardConfig[] = [
  { site: 'palantir', companyName: 'Palantir' },
  { site: 'spotify', companyName: 'Spotify' },
  { site: 'meesho', companyName: 'Meesho' },
  { site: 'cred', companyName: 'CRED' },
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
  private readonly maxScanLimit: number;
  private readonly pageSize: number;
  private readonly maxRequestsPerBoard: number;
  private readonly rateLimitDelayMs: number;
  private readonly maxRetries: number;

  constructor(options?: LeverProviderOptions | LeverBoardConfig[]) {
    if (Array.isArray(options)) {
      this.boards = options.length > 0 ? options : DEFAULT_LEVER_BOARDS;
      this.timeoutMs = 30000;
      this.maxJobsPerBoard = 25;
      this.maxScanLimit = 500;
      this.pageSize = 100;
      this.maxRequestsPerBoard = 10;
      this.rateLimitDelayMs = 150;
      this.maxRetries = 2;
    } else {
      this.boards = options?.boards && options.boards.length > 0 ? options.boards : DEFAULT_LEVER_BOARDS;
      this.timeoutMs = options?.timeoutMs ?? 30000;
      this.maxJobsPerBoard = options?.maxJobsPerBoard !== undefined ? options.maxJobsPerBoard : 25;
      this.maxScanLimit = options?.maxScanLimit !== undefined ? options.maxScanLimit : 500;
      this.pageSize = Math.min(Math.max(options?.pageSize ?? 100, 1), 100);
      this.maxRequestsPerBoard = options?.maxRequestsPerBoard !== undefined ? options.maxRequestsPerBoard : 10;
      this.rateLimitDelayMs = options?.rateLimitDelayMs !== undefined ? options.rateLimitDelayMs : 150;
      this.maxRetries = options?.maxRetries !== undefined ? options.maxRetries : 2;
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
   * Fetches a single page of postings from the Lever API with retry and backoff.
   */
  protected async fetchPage(
    site: string,
    limit: number,
    skip: number,
  ): Promise<LeverJobItem[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json&limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}`;

    let attempts = 0;
    const maxAttempts = 1 + this.maxRetries;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Career-Intelligence-Engine/1.0',
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 429) {
          if (attempts < maxAttempts) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0
              ? retryAfterSec * 1000
              : 1000 * Math.pow(2, attempts - 1);
            console.warn(`[LeverProvider] Rate limited (429) on "${site}" (skip=${skip}). Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`);
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
          throw new Error(`Lever API rate limit (429) exceeded for "${site}" after ${attempts} attempts`);
        }

        if (!response.ok) {
          if (response.status >= 500 && attempts < maxAttempts) {
            const delayMs = 1000 * Math.pow(2, attempts - 1);
            console.warn(`[LeverProvider] Server error (${response.status}) on "${site}" (skip=${skip}). Retrying in ${delayMs}ms...`);
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
          throw new Error(`Lever API error for "${site}": ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          console.warn(`[LeverProvider] Board "${site}" returned non-array payload at skip=${skip}.`);
          return [];
        }

        return data as LeverJobItem[];
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw error;
        }
        const delayMs = 1000 * Math.pow(2, attempts - 1);
        console.warn(`[LeverProvider] Request error for "${site}" (skip=${skip}): ${error instanceof Error ? error.message : error}. Retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return [];
  }

  /**
   * Fetches and transforms jobs for a single Lever site using bounded pagination.
   *
   * Lever supports offset pagination via &limit and &skip.
   * To prevent global employers with deep India listings from missing eligible roles:
   * 1. Iterates pages with bounded requests (maxRequestsPerBoard) and scan limit (maxScanLimit).
   * 2. Inspects and identifies India-eligible postings across all scanned pages.
   * 3. Early-terminates if India-eligible quota satisfies maxJobsPerBoard or end of listings is reached.
   * 4. Retains discovered India jobs first, then non-India jobs up to maxJobsPerBoard.
   */
  async fetchBoard(board: LeverBoardConfig): Promise<ExternalJob[]> {
    let skip = 0;
    let requestCount = 0;
    const scannedIndiaJobs: LeverJobItem[] = [];
    const scannedOtherJobs: LeverJobItem[] = [];
    let hasMore = true;

    while (
      hasMore &&
      requestCount < this.maxRequestsPerBoard &&
      (scannedIndiaJobs.length + scannedOtherJobs.length) < this.maxScanLimit
    ) {
      const remainingScanCapacity = this.maxScanLimit - (scannedIndiaJobs.length + scannedOtherJobs.length);
      const batchLimit = Math.min(this.pageSize, remainingScanCapacity);
      if (batchLimit <= 0) break;

      let batch: LeverJobItem[];
      try {
        batch = await this.fetchPage(board.site, batchLimit, skip);
        requestCount++;
      } catch (err) {
        if (scannedIndiaJobs.length + scannedOtherJobs.length > 0) {
          console.warn(
            `[LeverProvider] Error fetching page at skip=${skip} for "${board.site}": ${err instanceof Error ? err.message : err}. Continuing with ${scannedIndiaJobs.length + scannedOtherJobs.length} scanned jobs.`,
          );
          break;
        }
        throw err;
      }

      if (!Array.isArray(batch) || batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const job of batch) {
        let locationStr: string | undefined = job.categories?.location?.trim() || undefined;
        if (!locationStr && Array.isArray(job.categories?.allLocations) && job.categories.allLocations.length > 0) {
          locationStr = job.categories.allLocations[0]?.trim() || undefined;
        }
        const fullDesc = buildLeverFullDescription(job);
        const classification = IndiaLocationClassifier.classify(locationStr, job.text || '', fullDesc);

        if (classification.isIndiaEligible) {
          scannedIndiaJobs.push(job);
        } else {
          scannedOtherJobs.push(job);
        }
      }

      // If the batch returned fewer than requested, we reached the end of the ATS board
      if (batch.length < batchLimit) {
        hasMore = false;
        break;
      }

      // Early termination: if maxJobsPerBoard is set and we already collected enough India jobs
      if (this.maxJobsPerBoard !== undefined && this.maxJobsPerBoard > 0 && scannedIndiaJobs.length >= this.maxJobsPerBoard) {
        break;
      }

      skip += batch.length;

      // Polite rate-limit delay between paginated requests
      if (hasMore && this.rateLimitDelayMs > 0 && requestCount < this.maxRequestsPerBoard) {
        await new Promise((r) => setTimeout(r, this.rateLimitDelayMs));
      }
    }

    if (this.maxJobsPerBoard === undefined || this.maxJobsPerBoard <= 0) {
      return [...scannedIndiaJobs, ...scannedOtherJobs].map((job) => this.transformLeverJob(job, board));
    }

    const selectedIndia = scannedIndiaJobs.slice(0, this.maxJobsPerBoard);
    const remainingSlots = this.maxJobsPerBoard - selectedIndia.length;
    const selectedOther = remainingSlots > 0 ? scannedOtherJobs.slice(0, remainingSlots) : [];

    const retainedJobs = [...selectedIndia, ...selectedOther];
    return retainedJobs.map((job) => this.transformLeverJob(job, board));
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
