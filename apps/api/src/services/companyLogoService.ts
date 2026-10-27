/**
 * Company Brand & Logo Resolution Service
 *
 * Resolves high-resolution, verified company logo URLs from employer identity.
 * Uses Google's global multi-resolution Favicon CDN (128px) with zero paid API keys,
 * zero rate limits, and fallback resilience.
 */

// Curated map of known tech employers to their authoritative canonical domains
export const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  // Top employers in database
  databricks: 'databricks.com',
  cloudflare: 'cloudflare.com',
  palantir: 'palantir.com',
  'palantir technologies': 'palantir.com',
  spotify: 'spotify.com',
  snowflake: 'snowflake.com',
  ramp: 'ramp.com',
  roboflow: 'roboflow.com',
  dropbox: 'dropbox.com',
  clickup: 'clickup.com',
  instacart: 'instacart.com',
  sierra: 'sierra.ai',
  wpromote: 'wpromote.com',
  'ajax systems': 'ajax.systems',
  'netbox labs': 'netboxlabs.com',
  'help scout': 'helpscout.com',
  roofr: 'roofr.com',
  athena: 'athenahealth.com',
  athenahealth: 'athenahealth.com',
  reformation: 'thereformation.com',
  dutchie: 'dutchie.com',
  alphasense: 'alpha-sense.com',
  'alpha sense': 'alpha-sense.com',
  'manay cpa': 'manaycpa.com',
  'manay cpa inc': 'manaycpa.com',
  monzo: 'monzo.com',
  datadog: 'datadoghq.com',
  tailscale: 'tailscale.com',
  duckduckgo: 'duckduckgo.com',
  meta: 'meta.com',
  openai: 'openai.com',
  amazon: 'amazon.com',
  'amazon.com': 'amazon.com',
  elevenlabs: 'elevenlabs.io',
  mattermost: 'mattermost.com',
  deepl: 'deepl.com',
  launchdarkly: 'launchdarkly.com',
  'temporal technologies': 'temporal.io',
  temporal: 'temporal.io',
  cribl: 'cribl.io',
  mirantis: 'mirantis.com',
  'eight sleep': 'eightsleep.com',
  'chili piper': 'chilipiper.com',
  shopmonkey: 'shopmonkey.com',
  toptal: 'toptal.com',
  payoneer: 'payoneer.com',
  pointclickcare: 'pointclickcare.com',
  'clover health': 'cloverhealth.com',
  bloomreach: 'bloomreach.com',
  cresta: 'cresta.com',
  docplanner: 'docplanner.com',
  zuora: 'zuora.com',
  extraHop: 'extrahop.com',
  teamsnap: 'teamsnap.com',
  'icon plc': 'iconplc.com',
  'ruby labs': 'rubylabs.com',
  dispatch: 'dispatchit.com',
  oddball: 'oddball.io',
  articulate: 'articulate.com',
  quilter: 'quilter.com',
  'unite us': 'uniteus.com',
  karbon: 'karbonhq.com',
  natera: 'natera.com',
  nogigiddy: 'nogigiddy.com',
  emerchantpay: 'emerchantpay.com',
  instructure: 'instructure.com',
  'thermo fisher scientific': 'thermofisher.com',
  'thermo fisher': 'thermofisher.com',
  'welo global': 'weloglobal.com',
  stripe: 'stripe.com',
  vercel: 'vercel.com',
  figma: 'figma.com',
  airbnb: 'airbnb.com',
  google: 'google.com',
  microsoft: 'microsoft.com',
  apple: 'apple.com',
  netflix: 'netflix.com',
  uber: 'uber.com',
};

// Generic aggregator / board hosts that should not be used as company domains
const GENERIC_JOB_HOSTS = new Set([
  'jobicy.com',
  'greenhouse.io',
  'boards-api.greenhouse.io',
  'boards.greenhouse.io',
  'lever.co',
  'api.lever.co',
  'jobs.lever.co',
  'workday.com',
  'myworkdayjobs.com',
  'ashbyhq.com',
  'smartrecruiters.com',
  'breezy.hr',
  'ziprecruiter.com',
  'indeed.com',
  'linkedin.com',
]);

/**
 * Strips common corporate suffixes and symbols to find the core brand name.
 */
export function normalizeCompanyForLookup(companyName: string): string {
  if (!companyName) return '';
  return companyName
    .toLowerCase()
    .trim()
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|technology|systems|solutions|co|gmbh|sa|bv)\b\.?/gi, '')
    .replace(/[,\.]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Attempts to extract a company domain from external URLs when not a job board host.
 */
export function extractDomainFromUrl(urlStr?: string | null): string | null {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (GENERIC_JOB_HOSTS.has(hostname)) return null;

    // Reject generic hosting services
    if (hostname.endsWith('.github.io') || hostname.endsWith('.vercel.app') || hostname.endsWith('.herokuapp.com')) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

/**
 * Resolves the company logo image URL given the organization name and optional URLs.
 * Returns null if the company cannot be resolved to a reputable domain.
 */
export function resolveCompanyLogoUrl(
  organization: string,
  applicationUrl?: string | null,
  sourceUrl?: string | null,
): string | null {
  if (!organization || !organization.trim()) return null;

  const rawLower = organization.toLowerCase().trim();
  const cleaned = normalizeCompanyForLookup(organization);

  // 1. Direct match in curated dictionary
  if (KNOWN_COMPANY_DOMAINS[rawLower]) {
    return formatFaviconUrl(KNOWN_COMPANY_DOMAINS[rawLower]);
  }
  if (KNOWN_COMPANY_DOMAINS[cleaned]) {
    return formatFaviconUrl(KNOWN_COMPANY_DOMAINS[cleaned]);
  }

  // 2. Extract domain from non-generic applicationUrl or sourceUrl
  const urlDomain = extractDomainFromUrl(applicationUrl) || extractDomainFromUrl(sourceUrl);
  if (urlDomain) {
    return formatFaviconUrl(urlDomain);
  }

  // 3. Fallback: single alphanumeric brand word (e.g. "Linear", "Retool", "Notion")
  if (/^[a-z0-9\-]{3,30}$/.test(cleaned)) {
    return formatFaviconUrl(`${cleaned}.com`);
  }

  return null;
}

function formatFaviconUrl(domain: string): string {
  return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(domain)}&size=128`;
}
