/**
 * Client-Side Company Logo Resolver
 */

export const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
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
  extrahop: 'extrahop.com',
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

export function resolveClientCompanyLogo(organization: string): string | null {
  if (!organization || !organization.trim()) return null;
  const rawLower = organization.toLowerCase().trim();
  const cleaned = normalizeCompanyForLookup(organization);

  let domain = KNOWN_COMPANY_DOMAINS[rawLower] || KNOWN_COMPANY_DOMAINS[cleaned];
  if (!domain && /^[a-z0-9\-]{3,30}$/.test(cleaned)) {
    domain = `${cleaned}.com`;
  }

  if (domain) {
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(domain)}&size=128`;
  }

  return null;
}
