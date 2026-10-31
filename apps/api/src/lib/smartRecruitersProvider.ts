import type { ExternalJob, OpportunityProvider, ProviderFetchStats } from './opportunityProvider';
import { extractOpportunitySkills } from '../services/opportunitySkillExtractor';
import { IndiaLocationClassifier } from '../services/indiaLocationClassifier';

export interface SmartRecruitersCompanyConfig {
  companyIdentifier: string;
  companyName: string;
}

export interface SmartRecruitersProviderOptions {
  companies?: SmartRecruitersCompanyConfig[];
  timeoutMs?: number;
  maxJobsPerBoard?: number;
  maxScanLimit?: number;
  pageSize?: number;
  maxRequestsPerBoard?: number;
  rateLimitDelayMs?: number;
  maxRetries?: number;
  fetchDetailsForRetained?: boolean;
}

export interface SmartRecruitersLocation {
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  remote?: boolean;
  hybrid?: boolean;
  fullLocation?: string;
}

export interface SmartRecruitersJobItem {
  id: string;
  name: string;
  uuid?: string;
  refNumber?: string;
  releasedDate?: string;
  location?: SmartRecruitersLocation;
  industry?: { id?: string; label?: string };
  department?: { id?: string; label?: string };
  function?: { id?: string; label?: string };
  typeOfEmployment?: { id?: string; label?: string };
  experienceLevel?: { id?: string; label?: string };
  ref?: string;
  company?: {
    identifier?: string;
    name?: string;
  };
}

export interface SmartRecruitersApiResponse {
  offset?: number;
  limit?: number;
  totalFound?: number;
  content?: SmartRecruitersJobItem[];
}

export interface SmartRecruitersJobAdSection {
  title?: string;
  text?: string;
}

export interface SmartRecruitersPostingDetail {
  id: string;
  name?: string;
  uuid?: string;
  refNumber?: string;
  releasedDate?: string;
  location?: SmartRecruitersLocation;
  typeOfEmployment?: { id?: string; label?: string };
  experienceLevel?: { id?: string; label?: string };
  postingUrl?: string;
  applyUrl?: string;
  jobAd?: {
    sections?: {
      companyDescription?: SmartRecruitersJobAdSection;
      jobDescription?: SmartRecruitersJobAdSection;
      qualifications?: SmartRecruitersJobAdSection;
      additionalInformation?: SmartRecruitersJobAdSection;
    };
  };
}

export const VERIFIED_INDIA_SMARTRECRUITERS_COMPANIES: SmartRecruitersCompanyConfig[] = [
  { companyIdentifier: 'Freshworks', companyName: 'Freshworks' },
  { companyIdentifier: 'TheNielsenCompany', companyName: 'The Nielsen Company' },
];

export const DEFAULT_SMARTRECRUITERS_COMPANIES: SmartRecruitersCompanyConfig[] = [
  ...VERIFIED_INDIA_SMARTRECRUITERS_COMPANIES,
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
 * and breaking ties stably using id and name/title.
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

    // Stable fallback for identical dates or missing dates: sort by ID, then name/title
    const idA = String(a.id ?? '');
    const idB = String(b.id ?? '');
    if (idA !== idB) {
      return idA.localeCompare(idB);
    }
    const titleA = String(a.name ?? a.title ?? '');
    const titleB = String(b.name ?? b.title ?? '');
    return titleA.localeCompare(titleB);
  };
}

/**
 * Cancellable sleep helper that rejects immediately if an AbortSignal fires.
 */
export async function cancellableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  if (signal?.aborted) {
    throw new Error('Operation aborted');
  }
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new Error('Operation aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Reconstructs the full HTML job description by assembling the job description,
 * qualifications, additional information, and company description sections.
 */
export function buildSmartRecruitersFullDescription(
  detail?: SmartRecruitersPostingDetail | null,
  listItem?: SmartRecruitersJobItem,
): string {
  const parts: string[] = [];
  const sections = detail?.jobAd?.sections;

  if (sections) {
    if (sections.jobDescription?.text?.trim()) {
      parts.push(sections.jobDescription.text.trim());
    }
    if (sections.qualifications?.text?.trim()) {
      const heading = sections.qualifications.title
        ? `<h3>${sections.qualifications.title.trim()}</h3>`
        : '<h3>Qualifications</h3>';
      parts.push(`${heading}\n${sections.qualifications.text.trim()}`);
    }
    if (sections.additionalInformation?.text?.trim()) {
      const heading = sections.additionalInformation.title
        ? `<h3>${sections.additionalInformation.title.trim()}</h3>`
        : '<h3>Additional Information</h3>';
      parts.push(`${heading}\n${sections.additionalInformation.text.trim()}`);
    }
    if (sections.companyDescription?.text?.trim()) {
      parts.push(sections.companyDescription.text.trim());
    }
  }

  if (parts.length === 0) {
    const summaryLines = [
      listItem?.name,
      listItem?.department?.label ? `Department: ${listItem.department.label}` : '',
      listItem?.typeOfEmployment?.label ? `Employment Type: ${listItem.typeOfEmployment.label}` : '',
      listItem?.location?.fullLocation ? `Location: ${listItem.location.fullLocation}` : '',
    ].filter(Boolean);
    return summaryLines.join('\n');
  }

  return parts.join('\n\n');
}

export class SmartRecruitersProvider implements OpportunityProvider {
  readonly name = 'SmartRecruiters';
  private readonly companies: SmartRecruitersCompanyConfig[];
  private readonly timeoutMs: number;
  private readonly maxJobsPerBoard?: number;
  private readonly maxScanLimit: number;
  private readonly pageSize: number;
  private readonly maxRequestsPerBoard: number;
  private readonly rateLimitDelayMs: number;
  private readonly maxRetries: number;
  private readonly fetchDetailsForRetained: boolean;
  private lastFetchStats: ProviderFetchStats = { successfulSources: [], failedSources: [] };

  constructor(options?: SmartRecruitersProviderOptions | SmartRecruitersCompanyConfig[]) {
    if (Array.isArray(options)) {
      this.companies = options.length > 0 ? options : DEFAULT_SMARTRECRUITERS_COMPANIES;
      this.timeoutMs = 30000;
      this.maxJobsPerBoard = 25;
      this.maxScanLimit = 500;
      this.pageSize = 100;
      this.maxRequestsPerBoard = 10;
      this.rateLimitDelayMs = 150;
      this.maxRetries = 2;
      this.fetchDetailsForRetained = true;
    } else {
      this.companies = options?.companies && options.companies.length > 0
        ? options.companies
        : DEFAULT_SMARTRECRUITERS_COMPANIES;
      this.timeoutMs = options?.timeoutMs ?? 30000;
      this.maxJobsPerBoard = options?.maxJobsPerBoard !== undefined ? options.maxJobsPerBoard : 25;
      this.maxScanLimit = options?.maxScanLimit !== undefined ? options.maxScanLimit : 500;
      this.pageSize = Math.min(Math.max(options?.pageSize ?? 100, 1), 100);
      this.maxRequestsPerBoard = options?.maxRequestsPerBoard !== undefined ? options.maxRequestsPerBoard : 10;
      this.rateLimitDelayMs = options?.rateLimitDelayMs !== undefined ? options.rateLimitDelayMs : 150;
      this.maxRetries = options?.maxRetries !== undefined ? options.maxRetries : 2;
      this.fetchDetailsForRetained = options?.fetchDetailsForRetained ?? true;
    }
  }

  getCompanyConfigs(): readonly SmartRecruitersCompanyConfig[] {
    return this.companies;
  }

  getLastFetchStats(): ProviderFetchStats {
    return this.lastFetchStats;
  }

  async fetch(signal?: AbortSignal): Promise<ExternalJob[]> {
    if (signal?.aborted) {
      throw new Error(`[SmartRecruitersProvider] Operation aborted before starting fetch`);
    }

    this.lastFetchStats = { successfulSources: [], failedSources: [] };
    const allJobs: ExternalJob[] = [];

    for (const company of this.companies) {
      if (signal?.aborted) {
        throw new Error(`[SmartRecruitersProvider] Operation aborted during company iteration`);
      }

      try {
        const companyJobs = await this.fetchCompany(company, signal);
        allJobs.push(...companyJobs);
        this.lastFetchStats.successfulSources.push(company.companyIdentifier);
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        const errMsg = error instanceof Error ? error.message : String(error);
        this.lastFetchStats.failedSources.push({ source: company.companyIdentifier, error: errMsg });
        console.error(
          `[SmartRecruitersProvider] Failed to fetch company "${company.companyIdentifier}" (${company.companyName}):`,
          errMsg,
        );
      }
    }

    // If every configured company failed, propagate an error so the scheduler records a failure
    if (this.companies.length > 0 && this.lastFetchStats.failedSources.length === this.companies.length) {
      throw new Error(
        `All ${this.companies.length} configured SmartRecruiters companies failed: ${this.lastFetchStats.failedSources.map((f) => `${f.source} (${f.error})`).join('; ')}`,
      );
    }

    return allJobs;
  }

  /**
   * Fetches a single page of postings from the SmartRecruiters API with retry and backoff.
   */
  protected async fetchPage(
    companyIdentifier: string,
    limit: number,
    offset: number,
    signal?: AbortSignal,
  ): Promise<SmartRecruitersApiResponse> {
    if (signal?.aborted) {
      throw new Error(`[SmartRecruitersProvider] Request aborted before page fetch for "${companyIdentifier}"`);
    }

    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;

    let attempts = 0;
    const maxAttempts = 1 + this.maxRetries;

    while (attempts < maxAttempts) {
      if (signal?.aborted) {
        throw new Error(`[SmartRecruitersProvider] Request aborted during retry loop for "${companyIdentifier}"`);
      }

      attempts++;
      try {
        const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
        const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Career-Intelligence-Engine/1.0',
          },
          signal: combinedSignal,
        });

        if (response.status === 429) {
          if (attempts < maxAttempts) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0
              ? retryAfterSec * 1000
              : 1000 * Math.pow(2, attempts - 1);
            console.warn(
              `[SmartRecruitersProvider] Rate limited (429) on "${companyIdentifier}" (offset=${offset}). Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`,
            );
            await cancellableSleep(delayMs, signal);
            continue;
          }
          throw new Error(`SmartRecruiters API rate limit (429) exceeded for "${companyIdentifier}" after ${attempts} attempts`);
        }

        if (!response.ok) {
          if (response.status >= 500 && attempts < maxAttempts) {
            const delayMs = 1000 * Math.pow(2, attempts - 1);
            console.warn(
              `[SmartRecruitersProvider] Server error (${response.status}) on "${companyIdentifier}" (offset=${offset}). Retrying in ${delayMs}ms...`,
            );
            await cancellableSleep(delayMs, signal);
            continue;
          }
          throw new Error(`SmartRecruiters API error for "${companyIdentifier}": ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as SmartRecruitersApiResponse;
        if (!data || !Array.isArray(data.content)) {
          console.warn(`[SmartRecruitersProvider] Company "${companyIdentifier}" returned non-array content at offset=${offset}.`);
          return { offset, limit, totalFound: 0, content: [] };
        }

        return data;
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        if (attempts >= maxAttempts) {
          throw error;
        }
        const delayMs = 1000 * Math.pow(2, attempts - 1);
        console.warn(
          `[SmartRecruitersProvider] Request error for "${companyIdentifier}" (offset=${offset}): ${error instanceof Error ? error.message : error}. Retrying in ${delayMs}ms...`,
        );
        await cancellableSleep(delayMs, signal);
      }
    }

    return { offset, limit, totalFound: 0, content: [] };
  }

  /**
   * Fetches detailed posting information for a specific job ID.
   */
  protected async fetchPostingDetail(
    companyIdentifier: string,
    postingId: string,
    signal?: AbortSignal,
  ): Promise<SmartRecruitersPostingDetail | null> {
    if (signal?.aborted) {
      throw new Error(`[SmartRecruitersProvider] Request aborted before detail fetch for "${postingId}"`);
    }

    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings/${encodeURIComponent(postingId)}`;

    try {
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
        return null;
      }

      return (await response.json()) as SmartRecruitersPostingDetail;
    } catch {
      return null;
    }
  }

  /**
   * Fetches and transforms jobs for a single SmartRecruiters company using bounded pagination.
   */
  async fetchCompany(company: SmartRecruitersCompanyConfig, signal?: AbortSignal): Promise<ExternalJob[]> {
    let offset = 0;
    let requestCount = 0;
    const scannedIndiaJobs: SmartRecruitersJobItem[] = [];
    const scannedOtherJobs: SmartRecruitersJobItem[] = [];
    let hasMore = true;

    while (
      hasMore &&
      requestCount < this.maxRequestsPerBoard &&
      (scannedIndiaJobs.length + scannedOtherJobs.length) < this.maxScanLimit
    ) {
      if (signal?.aborted) {
        throw new Error(`[SmartRecruitersProvider] Operation aborted during pagination for "${company.companyIdentifier}"`);
      }

      const remainingScanCapacity = this.maxScanLimit - (scannedIndiaJobs.length + scannedOtherJobs.length);
      const batchLimit = Math.min(this.pageSize, remainingScanCapacity);
      if (batchLimit <= 0) break;

      let pageData: SmartRecruitersApiResponse;
      try {
        pageData = await this.fetchPage(company.companyIdentifier, batchLimit, offset, signal);
        requestCount++;
      } catch (err) {
        if (signal?.aborted) {
          throw err;
        }
        if (scannedIndiaJobs.length + scannedOtherJobs.length > 0) {
          console.warn(
            `[SmartRecruitersProvider] Error fetching page at offset=${offset} for "${company.companyIdentifier}": ${err instanceof Error ? err.message : err}. Continuing with scanned jobs.`,
          );
          break;
        }
        throw err;
      }

      const batch = pageData.content || [];
      if (batch.length === 0) {
        break;
      }

      for (const item of batch) {
        const locationStr = this.extractLocationString(item.location);
        const classification = IndiaLocationClassifier.classify(locationStr, item.name || '', '');

        if (classification.isIndiaEligible) {
          scannedIndiaJobs.push(item);
        } else {
          scannedOtherJobs.push(item);
        }
      }

      // If India quota already met and maxJobsPerBoard is configured, we can stop scanning
      if (this.maxJobsPerBoard && scannedIndiaJobs.length >= this.maxJobsPerBoard) {
        break;
      }

      if (batch.length < batchLimit) {
        hasMore = false;
        break;
      }

      if (pageData.totalFound !== undefined && offset + batch.length >= pageData.totalFound) {
        hasMore = false;
        break;
      }

      offset += batch.length;

      if (this.rateLimitDelayMs > 0 && hasMore) {
        await cancellableSleep(this.rateLimitDelayMs, signal);
      }
    }

    // Sort both groups deterministically: publication date newest-first, with stable fallback
    const sortComparator = deterministicJobSortComparator<SmartRecruitersJobItem>((j) => j.releasedDate);
    scannedIndiaJobs.sort(sortComparator);
    scannedOtherJobs.sort(sortComparator);

    // Partition and retain India jobs first, then non-India quota
    let retained: SmartRecruitersJobItem[];
    if (this.maxJobsPerBoard === undefined || this.maxJobsPerBoard <= 0) {
      retained = [...scannedIndiaJobs, ...scannedOtherJobs];
    } else {
      const selectedIndia = scannedIndiaJobs.slice(0, this.maxJobsPerBoard);
      const remainingCapacity = Math.max(0, this.maxJobsPerBoard - selectedIndia.length);
      const selectedOther = remainingCapacity > 0 ? scannedOtherJobs.slice(0, remainingCapacity) : [];
      retained = [...selectedIndia, ...selectedOther];
    }

    // Transform retained items into ExternalJob
    const results: ExternalJob[] = [];
    for (const item of retained) {
      if (signal?.aborted) {
        throw new Error(`[SmartRecruitersProvider] Operation aborted during detail retrieval for "${company.companyIdentifier}"`);
      }

      let detail: SmartRecruitersPostingDetail | null = null;
      if (this.fetchDetailsForRetained && item.id) {
        detail = await this.fetchPostingDetail(company.companyIdentifier, item.id, signal);
      }
      results.push(this.transformSmartRecruitersJob(item, detail, company));
    }

    return results;
  }

  /**
   * Derives a location string from SmartRecruiters location object.
   */
  private extractLocationString(loc?: SmartRecruitersLocation): string | undefined {
    if (!loc) return undefined;
    if (loc.fullLocation && loc.fullLocation.trim()) {
      return loc.fullLocation.trim();
    }
    const parts = [loc.city, loc.region, loc.country].map((s) => s?.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Maps SmartRecruiters list item + optional detail to ExternalJob.
   */
  transformSmartRecruitersJob(
    item: SmartRecruitersJobItem,
    detail: SmartRecruitersPostingDetail | null,
    company: SmartRecruitersCompanyConfig,
  ): ExternalJob {
    const fullHtml = buildSmartRecruitersFullDescription(detail, item);
    const cleanDescription = decodeHtmlEntities(fullHtml);

    const companyName = company.companyName || item.company?.name || 'Unknown Organization';
    const locationStr = this.extractLocationString(detail?.location || item.location);

    // Infer work mode
    let workMode: string | undefined = undefined;
    const loc = detail?.location || item.location;
    if (loc?.remote === true) {
      workMode = 'REMOTE';
    } else if (loc?.hybrid === true) {
      workMode = 'HYBRID';
    } else {
      const locLower = (locationStr || '').toLowerCase();
      const titleLower = (item.name || '').toLowerCase();
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
    const typeLabel = (detail?.typeOfEmployment?.label || item.typeOfEmployment?.label || '').toLowerCase();
    const typeId = (detail?.typeOfEmployment?.id || item.typeOfEmployment?.id || '').toLowerCase();
    const rawTitle = item.name || '';

    const isInternEvidence =
      typeLabel.includes('intern') ||
      typeId.includes('intern') ||
      typeLabel.includes('coop') ||
      typeId.includes('coop') ||
      typeLabel.includes('co-op') ||
      typeId.includes('co-op') ||
      /\b(intern|internship|internships|summer intern|summer internship|co-op|coop)\b/i.test(rawTitle);

    const isContractEvidence =
      typeLabel.includes('contract') ||
      typeId.includes('contract') ||
      typeLabel.includes('temporary') ||
      typeId.includes('temporary') ||
      /\b(contract|contractor|temporary|temp)\b/i.test(rawTitle);

    const isPartTimeEvidence =
      typeLabel.includes('part-time') ||
      typeId.includes('part_time') ||
      /\bpart[- ]time\b/i.test(rawTitle);

    const isFullTimeEvidence =
      typeLabel.includes('full-time') ||
      typeId.includes('permanent') ||
      typeId.includes('full_time') ||
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

    // Infer experience level
    let experienceLevel: string | undefined = undefined;
    const expId = (detail?.experienceLevel?.id || item.experienceLevel?.id || '').toLowerCase();
    const expLabel = (detail?.experienceLevel?.label || item.experienceLevel?.label || '').toLowerCase();
    if (expId.includes('entry') || expLabel.includes('entry') || expId.includes('intern')) {
      experienceLevel = 'ENTRY';
    } else if (expId.includes('junior') || expLabel.includes('junior')) {
      experienceLevel = 'JUNIOR';
    } else if (expId.includes('senior') || expLabel.includes('senior')) {
      experienceLevel = 'SENIOR';
    } else if (expId.includes('mid')) {
      experienceLevel = 'MID';
    }

    // Skills extraction
    const extraction = extractOpportunitySkills(item.name || '', cleanDescription);

    // Publication date
    const postedDate = detail?.releasedDate || item.releasedDate || undefined;

    // Direct application URL & Public job URL with HTTP/HTTPS validation:
    // Prefer actual API-provided applyUrl. If unavailable, use verified public posting URL.
    // Do not blindly construct `${postingUrl}/apply`.
    const defaultPostingUrl = `https://jobs.smartrecruiters.com/${encodeURIComponent(company.companyIdentifier)}/${encodeURIComponent(item.id)}`;
    const candidatePostingUrl = detail?.postingUrl || item.ref || defaultPostingUrl;
    const validPostingUrl = isValidHttpUrl(candidatePostingUrl) ? candidatePostingUrl.trim() : defaultPostingUrl;

    const validApplyUrl = isValidHttpUrl(detail?.applyUrl) ? detail!.applyUrl!.trim() : undefined;
    const applicationUrl = validApplyUrl || validPostingUrl;
    const sourceUrl = validPostingUrl;

    return {
      id: item.id ? String(item.id) : undefined,
      title: item.name?.trim() || 'Untitled Opportunity',
      company: companyName,
      description: cleanDescription,
      location: locationStr,
      workMode,
      employmentType,
      experienceLevel,
      applicationUrl,
      sourceUrl,
      source: 'SmartRecruiters',
      postedDate,
      requiredSkills: extraction.requiredSkills,
      preferredSkills: extraction.preferredSkills,
    };
  }
}
