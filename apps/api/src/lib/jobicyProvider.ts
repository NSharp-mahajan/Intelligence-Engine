import { ExternalJob, OpportunityProvider } from './opportunityProvider';

export class JobicyProvider implements OpportunityProvider {
  name = 'Jobicy';
  
  constructor(private readonly count: number = 50) {}

  async fetch(): Promise<ExternalJob[]> {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=${this.count}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Jobicy API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.success || !Array.isArray(data.jobs)) {
        throw new Error('Malformed Jobicy response: missing or invalid jobs array');
      }

      const externalJobs: ExternalJob[] = [];

      for (const job of data.jobs) {
        // Skip if missing required fields (based on ExternalJob interface, title, company, description, applicationUrl, source are required)
        if (!job.jobTitle || !job.companyName || !job.jobDescription || !job.url) {
          console.warn(`JobicyProvider: Skipping job ${job.id} due to missing required fields`);
          continue;
        }

        const employmentType = Array.isArray(job.jobType) && job.jobType.length > 0 
          ? job.jobType.join(', ') 
          : undefined;

        externalJobs.push({
          id: String(job.id),
          title: job.jobTitle,
          company: job.companyName,
          description: job.jobDescription,
          location: job.jobGeo || undefined,
          workMode: 'Remote', // Jobicy is specifically for remote jobs
          employmentType: employmentType,
          experienceLevel: job.jobLevel || undefined,
          applicationUrl: job.url, // Respecting Jobicy's public feed URL rule
          sourceUrl: job.url,
          source: 'Jobicy',
          postedDate: job.pubDate || undefined,
          requiredSkills: [],
          preferredSkills: [],
        });
      }

      return externalJobs;
    } catch (error) {
      console.error('JobicyProvider: Error fetching jobs:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}
