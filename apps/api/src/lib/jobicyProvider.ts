import type { ExternalJob, OpportunityProvider } from './opportunityProvider';

export interface JobicyFetchOptions {
  count?: number;
  geo?: string;
  industry?: string;
  tag?: string;
  signal?: AbortSignal;
}

export interface JobicyJobItem {
  id: number | string;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry?: string[] | string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
}

export interface JobicyApiResponse {
  apiVersion?: string;
  documentation?: string;
  jobCount?: number;
  jobs?: JobicyJobItem[];
  statusCode?: number;
  success?: boolean;
}

export class JobicyProvider implements OpportunityProvider {
  readonly name = 'Jobicy';
  private readonly baseUrl: string;
  private readonly defaultOptions: JobicyFetchOptions;

  constructor(
    config?: number | JobicyFetchOptions | string,
    baseUrl = 'https://jobicy.com/api/v2/remote-jobs',
  ) {
    if (typeof config === 'number') {
      this.defaultOptions = { count: config };
      this.baseUrl = baseUrl;
    } else if (typeof config === 'string') {
      this.baseUrl = config;
      this.defaultOptions = { count: 50 };
    } else if (typeof config === 'object' && config !== null) {
      this.defaultOptions = config;
      this.baseUrl = baseUrl;
    } else {
      this.baseUrl = baseUrl;
      this.defaultOptions = { count: 50 };
    }
  }

  async fetch(optionsOrSignal?: JobicyFetchOptions | AbortSignal): Promise<ExternalJob[]> {
    const isSignal = optionsOrSignal instanceof AbortSignal || (optionsOrSignal && typeof (optionsOrSignal as any).aborted === 'boolean');
    const signal = isSignal ? (optionsOrSignal as AbortSignal) : (optionsOrSignal as JobicyFetchOptions)?.signal;
    const options = isSignal ? undefined : (optionsOrSignal as JobicyFetchOptions);

    const effectiveOptions = { ...this.defaultOptions, ...options };
    const url = new URL(this.baseUrl);
    if (effectiveOptions.count !== undefined) url.searchParams.set('count', effectiveOptions.count.toString());
    if (effectiveOptions.geo) url.searchParams.set('geo', effectiveOptions.geo);
    if (effectiveOptions.industry) url.searchParams.set('industry', effectiveOptions.industry);
    if (effectiveOptions.tag) url.searchParams.set('tag', effectiveOptions.tag);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Career-Intelligence-Engine/1.0',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Jobicy API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as JobicyApiResponse;
    if (!data.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs.map((job) => this.transformJobicyJob(job));
  }

  transformJobicyJob(job: JobicyJobItem): ExternalJob {
    const employmentTypeStr = Array.isArray(job.jobType)
      ? job.jobType.join(', ')
      : job.jobType || '';

    const requiredSkills: string[] = [];
    if (Array.isArray(job.jobIndustry)) {
      requiredSkills.push(...job.jobIndustry);
    } else if (typeof job.jobIndustry === 'string' && job.jobIndustry) {
      requiredSkills.push(job.jobIndustry);
    }

    return {
      id: job.id !== undefined && job.id !== null ? String(job.id) : undefined,
      title: job.jobTitle || 'Untitled Opportunity',
      company: job.companyName || 'Unknown Organization',
      description: job.jobDescription || job.jobExcerpt || '',
      location: job.jobGeo || undefined,
      workMode: 'REMOTE',
      employmentType: employmentTypeStr || undefined,
      experienceLevel: job.jobLevel || undefined,
      applicationUrl: job.url || '',
      sourceUrl: job.url || undefined,
      source: 'Jobicy',
      postedDate: job.pubDate || undefined,
      requiredSkills,
    };
  }
}
