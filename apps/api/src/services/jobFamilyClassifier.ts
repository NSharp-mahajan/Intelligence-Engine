/**
 * Job Family Classification Service
 *
 * Deterministic classifier distinguishing Software Engineering roles
 * from non-software roles (Customer Support, Sales/BDR, HR, Marketing, Operations, etc.).
 */

export type JobFamily =
  | 'SOFTWARE_ENGINEERING'
  | 'PRODUCT_DESIGN'
  | 'DATA_ANALYTICS'
  | 'OPERATIONS_BUSINESS'
  | 'OTHER';

// Negative exclusion patterns (roles that are definitely NOT software engineering)
const NON_SOFTWARE_TITLE_PATTERNS: RegExp[] = [
  /\bcustomer\s+support\b/i,
  /\bcustomer\s+service\b/i,
  /\bsupport\s+specialist\b/i,
  /\btechnical\s+support\s+specialist\b/i,
  /\bhelp\s*desk\b/i,
  /\bservice\s*desk\b/i,
  /\bbusiness\s+development\b/i,
  /\b(bdr|sdr)\b/i,
  /\baccount\s+executive\b/i,
  /\baccount\s+manager\b/i,
  /\bsales\b/i,
  /\bmarketing\b/i,
  /\bcopywriter\b/i,
  /\bcontent\s+writer\b/i,
  /\bcontent\s+editor\b/i,
  /\bseo\b/i,
  /\bhuman\s+resources\b/i,
  /\b(hr|talent\s+acquisition|recruiter|recruiting)\b/i,
  /\bpeople\s+(team|partner|operations)\b/i,
  /\bcreative\s*(&|\+|and)\s*communications\b/i,
  /\bpayroll\b/i,
  /\baccounts\s+payable\b/i,
  /\baccounting\b/i,
  /\baccountant\b/i,
  /\bindustrial\s+trainee\b/i,
  /\bfinance\b/i,
  /\bfinancial\b/i,
  /\blegal\b/i,
  /\bcompliance\b/i,
  /\bcollections?\s+manager\b/i,
  /\bcluster\s+head\b/i,
  /\blast\s+mile\b/i,
  /\blogistics\b/i,
  /\bprocurement\b/i,
  /\bfacilities\b/i,
  /\boffice\s+manager\b/i,
  /\breceptionist\b/i,
  /\bcashier\b/i,
  /\bretail\b/i,
  /\binstructional\s+designer\b/i,
  /\bmonetization\b/i,
];

// Positive software engineering patterns
const SOFTWARE_ENGINEERING_TITLE_PATTERNS: RegExp[] = [
  /\b(sde|swe)\b/i,
  /\bsoftware\s+engineer(ing)?\b/i,
  /\bsoftware\s+developer\b/i,
  /\bsoftware\s+intern\b/i,
  /\bback\s*-?\s*end\b/i,
  /\bfront\s*-?\s*end\b/i,
  /\bfull\s*-?\s*stack\b/i,
  /\bweb\s+developer\b/i,
  /\bmobile\s+developer\b/i,
  /\bmobile\s+engineer\b/i,
  /\b(android|ios)\s+(developer|engineer|intern)\b/i,
  /\b(qa\s+automation|sdet|test\s+automation)\b/i,
  /\bquality\s+assurance\s+engineer\b/i,
  /\bplatform\s+engineer(ing)?\b/i,
  /\bdevops\b/i,
  /\bsite\s+reliability\b/i,
  /\bsre\b/i,
  /\bcloud\s+engineer\b/i,
  /\binfrastructure\s+engineer\b/i,
  /\bproduction\s+infrastructure\b/i,
  /\bsystems?\s+engineer\b/i,
  /\bnetwork\s+security\s+engineer\b/i,
  /\b(security|infosec|cybersecurity)\s+engineer\b/i,
  /\bdata\s+engineer(ing)?\b/i,
  /\banalytics\s+engineer(ing)?\b/i,
  /\bmachine\s+learning\s+engineer\b/i,
  /\bml\s+engineer\b/i,
  /\bai\s+engineer\b/i,
  /\bai\s+fde\b/i,
  /\bdata\s+scien(ce|tist)\b/i,
  /\bresearch\s+scientist\b/i,
  /\b(computer\s+vision|deep\s+learning|nlp)(\s+engineer)?\b/i,
  /\bforward\s+deployed\s+(software|infrastructure|ai)\b/i,
  /\bforward\s+deployed\s+engineer\b/i,
  /\bquery\s+engines?\b/i,
  /\bapplication\s+(developer|engineer)\b/i,
  /\bfirmware\s+engineer\b/i,
  /\bembedded\s+software\b/i,
  /\btech(nical)?\s+lead\b/i,
  /\bengineering\s+manager\b/i,
];

export interface RoleInput {
  title: string;
  department?: string | null;
  description?: string | null;
}

const PRODUCT_DESIGN_PATTERNS: RegExp[] = [
  /\b(product\s+manage(ment|r)|pm\s+intern|product\s+intern|associate\s+product\s+manager|apm)\b/i,
  /\b(ui[\/\s]?ux|product\s+design(er)?|ux\s+designer|design\s+intern|ux\s+research(er)?)\b/i,
  /\b(project\s+manager|program\s+manager|eng\s+project|program\s+intern|project\s+intern)\b/i,
];

const DATA_ANALYTICS_PATTERNS: RegExp[] = [
  /\b(data\s+analyst|business\s+analyst|bi\s+analyst|business\s+intelligence|analytics\s+specialist|data\s+analytics)\b/i,
];

const OPERATIONS_BUSINESS_PATTERNS: RegExp[] = [
  /\b(customer\s+support|customer\s+service|support\s+specialist|help\s*desk|service\s*desk)\b/i,
  /\b(business\s+development|bdr|sdr|sales|account\s+executive|account\s+manager)\b/i,
  /\b(marketing|copywriter|content\s+writer|content\s+editor|creative\s*(&|\+|and)\s*communications)\b/i,
  /\b(human\s+resources|hr|talent\s+acquisition|recruiter|recruiting|people\s+(team|partner|operations))\b/i,
  /\b(payroll|accounts\s+payable|accounting|accountant|finance|financial)\b/i,
  /\b(operations|apprentice(ship)?|industrial\s+trainee|commercial\s+trainee)\b/i,
  /\b(legal|compliance|procurement|facilities|office\s+manager|receptionist|logistics)\b/i,
];

/**
 * Classifies an opportunity as SOFTWARE_ENGINEERING, PRODUCT_DESIGN, DATA_ANALYTICS, OPERATIONS_BUSINESS, or OTHER.
 */
export function classifyJobFamily(role: RoleInput): JobFamily {
  const title = (role.title || '').trim();
  const department = (role.department || '').trim();

  // 1. Strict negative exclusion from software engineering
  let isExcludedFromSWE = false;
  for (const pattern of NON_SOFTWARE_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      isExcludedFromSWE = true;
      break;
    }
  }

  // 2. Positive SWE title match
  if (!isExcludedFromSWE) {
    for (const pattern of SOFTWARE_ENGINEERING_TITLE_PATTERNS) {
      if (pattern.test(title)) {
        return 'SOFTWARE_ENGINEERING';
      }
    }

    // 3. Department-level signals (if title is generic like "Engineering Intern" or "New Grad")
    const isGenericEngTitle = /\b(intern|engineering\s+intern|new\s+grad|graduate\s+trainee|associate)\b/i.test(title);
    if (isGenericEngTitle && department) {
      if (/\b(engineering|software|technology|tech|product\s+engineering|core\s+tech)\b/i.test(department)) {
        // Ensure department does not match non-tech functions
        if (!/\b(sales|marketing|hr|recruiting|finance|legal|operations|support)\b/i.test(department)) {
          return 'SOFTWARE_ENGINEERING';
        }
      }
    }
  }

  // 4. Product & Design classification
  if (isProductDesignRole(role)) {
    return 'PRODUCT_DESIGN';
  }

  // 5. Data & Analytics classification
  if (isDataAnalyticsRole(role)) {
    return 'DATA_ANALYTICS';
  }

  // 6. Operations & Business classification
  if (isOperationsBusinessRole(role)) {
    return 'OPERATIONS_BUSINESS';
  }

  // 7. Default to OTHER for non-engineering or unknown roles
  return 'OTHER';
}

/**
 * Convenience helper returning boolean for Software Engineering roles
 */
export function isSoftwareEngineeringRole(role: RoleInput): boolean {
  return classifyJobFamily(role) === 'SOFTWARE_ENGINEERING';
}

/**
 * Convenience helper returning boolean for Product & Design roles
 */
export function isProductDesignRole(role: RoleInput): boolean {
  const title = (role.title || '').trim();
  return PRODUCT_DESIGN_PATTERNS.some((pat) => pat.test(title));
}

/**
 * Convenience helper returning boolean for Data & Analytics roles
 */
export function isDataAnalyticsRole(role: RoleInput): boolean {
  const title = (role.title || '').trim();
  return DATA_ANALYTICS_PATTERNS.some((pat) => pat.test(title));
}

/**
 * Convenience helper returning boolean for Operations & Business roles
 */
export function isOperationsBusinessRole(role: RoleInput): boolean {
  const title = (role.title || '').trim();
  return OPERATIONS_BUSINESS_PATTERNS.some((pat) => pat.test(title));
}

// ─── Engineering Sub-Family Specializations ─────────────────────────────────

export type EngineeringSubFamily =
  | 'SOFTWARE_DEVELOPMENT'
  | 'DEVOPS_PLATFORM'
  | 'AI_ML_ENGINEERING'
  | 'SECURITY_ENGINEERING'
  | 'DATA_ENGINEERING'
  | 'QA_TESTING'
  | 'AMBIGUOUS';

const QA_TESTING_PATTERNS: RegExp[] = [
  /\b(qa\s+automation|sdet|test\s+automation|quality\s+assurance(\s+engineer)?|software\s+test(ing)?|test\s+engineer|qa\s+engineer)\b/i,
];

const DEVOPS_PLATFORM_PATTERNS: RegExp[] = [
  /\b(devops|platform\s+engineer(ing)?|site\s+reliability|sre|cloud\s+engineer|infrastructure\s+engineer|production\s+infrastructure|build\s+engineer|release\s+engineer|systems?\s+engineer)\b/i,
  /\bforward\s+deployed\s+infrastructure\b/i,
];

const SECURITY_ENGINEERING_PATTERNS: RegExp[] = [
  /\b(network\s+security\s+engineer|(security|infosec|cybersecurity|appsec|product\s+security|cloud\s+security)\s+engineer|threat\s+detection\s+engineer|penetration\s+tester)\b/i,
];

const DATA_ENGINEERING_PATTERNS: RegExp[] = [
  /\b(data\s+engineer(ing)?|analytics\s+engineer(ing)?|data\s+platform\s+engineer|etl\s+developer|database\s+engineer|big\s+data\s+engineer)\b/i,
];

const AI_ML_PATTERNS: RegExp[] = [
  /\b(machine\s+learning|ml\s+engineer|ai\s+engineer|ai\s+fde|data\s+scien(ce|tist)|research\s+scientist|deep\s+learning|nlp\s+engineer|computer\s+vision|genai)\b/i,
  /\bforward\s+deployed\s+ai\b/i,
];

const SOFTWARE_DEVELOPMENT_PATTERNS: RegExp[] = [
  /\b(sde|swe)\b/i,
  /\bsoftware\s+engineer(ing)?\b/i,
  /\bsoftware\s+developer\b/i,
  /\bsoftware\s+intern\b/i,
  /\bback\s*-?\s*end\b/i,
  /\bfront\s*-?\s*end\b/i,
  /\bfull\s*-?\s*stack\b/i,
  /\bweb\s+developer\b/i,
  /\bmobile\s+(developer|engineer)\b/i,
  /\b(android|ios)\s+(developer|engineer|intern)\b/i,
  /\bapplication\s+(developer|engineer)\b/i,
  /\bfirmware\s+engineer\b/i,
  /\bembedded\s+software\b/i,
  /\bforward\s+deployed\s+software\b/i,
  /\bquery\s+engines?\b/i,
];

/**
 * Classifies a role into an engineering sub-family specialization.
 * Returns null if the role is not software engineering.
 */
export function classifyEngineeringSubFamily(role: RoleInput): EngineeringSubFamily | null {
  // First, verify role belongs to SOFTWARE_ENGINEERING
  if (!isSoftwareEngineeringRole(role)) {
    return null;
  }

  const title = (role.title || '').trim();

  // 1. QA / SDET Testing
  for (const pat of QA_TESTING_PATTERNS) {
    if (pat.test(title)) return 'QA_TESTING';
  }

  // 2. DevOps & Infrastructure Platform
  for (const pat of DEVOPS_PLATFORM_PATTERNS) {
    if (pat.test(title)) return 'DEVOPS_PLATFORM';
  }

  // 3. Security Engineering
  for (const pat of SECURITY_ENGINEERING_PATTERNS) {
    if (pat.test(title)) return 'SECURITY_ENGINEERING';
  }

  // 4. Data Engineering
  for (const pat of DATA_ENGINEERING_PATTERNS) {
    if (pat.test(title)) return 'DATA_ENGINEERING';
  }

  // 5. AI / ML Engineering & Data Science
  for (const pat of AI_ML_PATTERNS) {
    if (pat.test(title)) return 'AI_ML_ENGINEERING';
  }

  // 6. Core Software Development (Frontend, Backend, Full Stack, SDE, Mobile, Systems)
  for (const pat of SOFTWARE_DEVELOPMENT_PATTERNS) {
    if (pat.test(title)) return 'SOFTWARE_DEVELOPMENT';
  }

  // 7. Generic or ambiguous titles that qualify as SWE via department/generic cues
  return 'AMBIGUOUS';
}
