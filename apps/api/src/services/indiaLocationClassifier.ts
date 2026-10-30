/**
 * India Location and Remote-Eligibility Classifier
 *
 * Deterministically classifies job listings for India discovery:
 * - Confirmed India Onsite (e.g. "Bengaluru, India", "Hyderabad", "Pune")
 * - Confirmed India Hybrid (e.g. "Bangalore (Hybrid)", "Mumbai (Hybrid)")
 * - Confirmed India-Eligible Remote (e.g. "Remote - India", "Anywhere in India", unrestricted "Worldwide")
 * - Overseas-Only (e.g. "New York, NY", "London, UK", "Remote - US", foreign residency restrictions)
 * - Ambiguous / Insufficient (e.g. plain "Remote" without region, conflicting signals, missing location)
 */

export type IndiaEligibility =
  | 'INDIA_ONSITE'
  | 'INDIA_HYBRID'
  | 'INDIA_REMOTE'
  | 'OVERSEAS_ONLY'
  | 'AMBIGUOUS';

export interface IndiaClassificationResult {
  isIndiaEligible: boolean;
  classification: IndiaEligibility;
  normalizedCity: string | null;     // Canonical city: "Bengaluru", "Hyderabad", "Pune", "Delhi-NCR", "Mumbai", "Chennai", etc.
  subCity: string | null;            // Specific sub-city if applicable: "Gurugram", "Noida", "New Delhi", "Navi Mumbai"
  state: string | null;              // Indian State: "Karnataka", "Telangana", "Maharashtra", etc.
  country: string | null;            // "India" or detected overseas country
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;                  // Deterministic explanation of why the role was classified
  effectiveWorkMode: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
}

interface CityRule {
  normalizedCity: string;
  defaultSubCity: string | null;
  state: string;
  regex: RegExp;
  subCityRules?: Array<{ subCity: string; regex: RegExp }>;
}

const INDIAN_CITY_RULES: CityRule[] = [
  {
    normalizedCity: 'Bengaluru',
    defaultSubCity: 'Bengaluru',
    state: 'Karnataka',
    regex: /\b(bengaluru|bangalore|bengaluru-vtp|bengaluru\s*vtp)\b/i,
  },
  {
    normalizedCity: 'Hyderabad',
    defaultSubCity: 'Hyderabad',
    state: 'Telangana',
    regex: /\b(hyderabad|secunderabad|cyberabad)\b/i,
  },
  {
    normalizedCity: 'Pune',
    defaultSubCity: 'Pune',
    state: 'Maharashtra',
    regex: /\b(pune|poona)\b/i,
  },
  {
    normalizedCity: 'Delhi-NCR',
    defaultSubCity: 'Delhi-NCR',
    state: 'Delhi / Haryana / UP',
    regex: /\b(delhi|new delhi|gurgaon|gurugram|noida|greater noida|faridabad|ghaziabad)\b/i,
    subCityRules: [
      { subCity: 'Gurugram', regex: /\b(gurgaon|gurugram)\b/i },
      { subCity: 'Noida', regex: /\b(noida|greater noida)\b/i },
      { subCity: 'New Delhi', regex: /\b(new delhi)\b/i },
      { subCity: 'Delhi', regex: /\b(delhi)\b/i },
      { subCity: 'Faridabad', regex: /\b(faridabad)\b/i },
    ],
  },
  {
    normalizedCity: 'Mumbai',
    defaultSubCity: 'Mumbai',
    state: 'Maharashtra',
    regex: /\b(mumbai|navi mumbai|bombay|thane)\b/i,
    subCityRules: [
      { subCity: 'Navi Mumbai', regex: /\b(navi mumbai)\b/i },
      { subCity: 'Thane', regex: /\b(thane)\b/i },
      { subCity: 'Mumbai', regex: /\b(mumbai|bombay)\b/i },
    ],
  },
  {
    normalizedCity: 'Chennai',
    defaultSubCity: 'Chennai',
    state: 'Tamil Nadu',
    regex: /\b(chennai|madras)\b/i,
  },
  {
    normalizedCity: 'Kolkata',
    defaultSubCity: 'Kolkata',
    state: 'West Bengal',
    regex: /\b(kolkata|calcutta)\b/i,
  },
  {
    normalizedCity: 'Ahmedabad',
    defaultSubCity: 'Ahmedabad',
    state: 'Gujarat',
    regex: /\b(ahmedabad|gandhinagar)\b/i,
  },
  {
    normalizedCity: 'Kochi',
    defaultSubCity: 'Kochi',
    state: 'Kerala',
    regex: /\b(kochi|cochin|ernakulam)\b/i,
  },
  {
    normalizedCity: 'Thiruvananthapuram',
    defaultSubCity: 'Thiruvananthapuram',
    state: 'Kerala',
    regex: /\b(thiruvananthapuram|trivandrum)\b/i,
  },
  {
    normalizedCity: 'Indore',
    defaultSubCity: 'Indore',
    state: 'Madhya Pradesh',
    regex: /\b(indore)\b/i,
  },
  {
    normalizedCity: 'Jaipur',
    defaultSubCity: 'Jaipur',
    state: 'Rajasthan',
    regex: /\b(jaipur)\b/i,
  },
  {
    normalizedCity: 'Chandigarh',
    defaultSubCity: 'Chandigarh',
    state: 'Punjab / Haryana',
    regex: /\b(chandigarh|mohali|panchkula)\b/i,
  },
  {
    normalizedCity: 'Coimbatore',
    defaultSubCity: 'Coimbatore',
    state: 'Tamil Nadu',
    regex: /\b(coimbatore)\b/i,
  },
  {
    normalizedCity: 'Bhubaneswar',
    defaultSubCity: 'Bhubaneswar',
    state: 'Odisha',
    regex: /\b(bhubaneswar|bhubaneshwar)\b/i,
  },
  {
    normalizedCity: 'Nagpur',
    defaultSubCity: 'Nagpur',
    state: 'Maharashtra',
    regex: /\b(nagpur)\b/i,
  },
];

// Explicit India-Remote indicators
export const INDIA_REMOTE_REGEX = /\b(remote[\s\-_/]+india|india[\s\-_/]+remote|remote\s*\(india\)|remote,\s*india|remote\s*-\s*in|anywhere in india|work from anywhere in india|all india remote|pan india remote)\b/i;

// Overseas country / regional restrictions that immediately disqualify a listing
export const OVERSEAS_RESTRICTIONS_REGEX = /\b(us only|u\.s\. only|usa only|united states only|uk only|canada only|emea only|americas only|europe only|latam only|australia only|must reside in the (?:us|united states|uk|canada|eu|europe)|authorized to work in the (?:us|united states|uk|canada|eu)|us citizenship required|security clearance required|active ts\/sci|right to work in the (?:uk|eu|united states))\b/i;

// Known overseas locations / countries / regions
export const OVERSEAS_LOCATION_REGEX = /\b(united states|usa|u\.s\.a\.|u\.s\.|us|united kingdom|uk|u\.k\.|great britain|england|emea|latam|europe|americas|california|new york|san francisco|london|canada|toronto|vancouver|seattle|austin|chicago|boston|berlin|munich|germany|france|paris|amsterdam|netherlands|dublin|ireland|singapore|sydney|melbourne|australia|tokyo|japan|warsaw|poland|brazil|mexico|spain|madrid|barcelona|switzerland|zurich|israel|tel aviv|belgrade|serbia)\b/i;

// Shared SQL regex patterns for PostgreSQL ~* predicates
export const OVERSEAS_LOCATION_SQL_PATTERN = 'United States|USA|U\\.S\\.A\\.|U\\.S\\.|US|United Kingdom|UK|U\\.K\\.|Great Britain|England|EMEA|LATAM|Europe|Americas|California|New York|San Francisco|London|Canada|Toronto|Vancouver|Seattle|Austin|Chicago|Boston|Berlin|Munich|Germany|France|Paris|Amsterdam|Netherlands|Dublin|Ireland|Singapore|Sydney|Melbourne|Australia|Tokyo|Japan|Warsaw|Poland|Brazil|Mexico|Spain|Madrid|Barcelona|Switzerland|Zurich|Israel|Tel Aviv|Belgrade|Serbia';

export const OVERSEAS_RESTRICTIONS_SQL_PATTERN = 'us only|u\\.s\\. only|usa only|united states only|uk only|canada only|emea only|americas only|europe only|latam only|australia only|must reside in the (?:us|united states|uk|canada|eu|europe)|authorized to work in the (?:us|united states|uk|canada|eu)|us citizenship required|security clearance required|active ts/sci|right to work in the (?:uk|eu|united states)';

export const INDIA_TECH_HUBS_SQL_PATTERN = 'India|Bengaluru|Bangalore|Hyderabad|Secunderabad|Cyberabad|Pune|Poona|Delhi|Gurgaon|Gurugram|Noida|Faridabad|Ghaziabad|Mumbai|Bombay|Navi Mumbai|Thane|Chennai|Madras|Kolkata|Calcutta|Ahmedabad|Gandhinagar|Kochi|Cochin|Ernakulam|Thiruvananthapuram|Trivandrum|Indore|Jaipur|Chandigarh|Mohali|Panchkula|Coimbatore|Bhubaneswar|Bhubaneshwar|Nagpur';

export class IndiaLocationClassifier {
  /**
   * Classifies an opportunity for India eligibility using deterministic rules.
   */
  static classify(
    rawLocation?: string | null,
    title?: string | null,
    description?: string | null,
    rawWorkMode?: string | null,
  ): IndiaClassificationResult {
    const loc = (rawLocation || '').trim();
    const ttl = (title || '').trim();
    const desc = (description || '').trim();
    const wm = (rawWorkMode || '').trim().toUpperCase();

    const locLower = loc.toLowerCase();
    const titleLower = ttl.toLowerCase();
    const combinedHeader = `${locLower} ${titleLower}`;

    // ─── Rule 1: Empty or Missing Location ─────────────────────────────────
    if (!loc) {
      // Check if title has explicit India location
      const titleIndiaRemote = INDIA_REMOTE_REGEX.test(titleLower);
      if (titleIndiaRemote) {
        return {
          isIndiaEligible: true,
          classification: 'INDIA_REMOTE',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: 'India',
          confidence: 'HIGH',
          evidence: 'Title specifies explicit India remote arrangement',
          effectiveWorkMode: 'REMOTE',
        };
      }

      // Check if title has explicit Indian city
      for (const rule of INDIAN_CITY_RULES) {
        if (rule.regex.test(titleLower)) {
          const isHybrid = /\bhybrid\b/i.test(combinedHeader) || wm === 'HYBRID';
          return {
            isIndiaEligible: true,
            classification: isHybrid ? 'INDIA_HYBRID' : 'INDIA_ONSITE',
            normalizedCity: rule.normalizedCity,
            subCity: rule.defaultSubCity,
            state: rule.state,
            country: 'India',
            confidence: 'HIGH',
            evidence: `Title specifies Indian city: ${rule.normalizedCity}`,
            effectiveWorkMode: isHybrid ? 'HYBRID' : 'ONSITE',
          };
        }
      }

      return {
        isIndiaEligible: false,
        classification: 'AMBIGUOUS',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: null,
        confidence: 'LOW',
        evidence: 'Location is empty and title contains no geographic signals',
        effectiveWorkMode: wm === 'REMOTE' ? 'REMOTE' : 'UNKNOWN',
      };
    }

    // ─── Rule 2: Explicit India Remote ─────────────────────────────────────
    if (INDIA_REMOTE_REGEX.test(combinedHeader)) {
      // Verify no conflicting overseas restrictions in description
      if (OVERSEAS_RESTRICTIONS_REGEX.test(desc)) {
        return {
          isIndiaEligible: false,
          classification: 'OVERSEAS_ONLY',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: null,
          confidence: 'HIGH',
          evidence: 'Listing header mentioned India remote, but description contains strict overseas residency/work-authorization restrictions',
          effectiveWorkMode: 'REMOTE',
        };
      }

      return {
        isIndiaEligible: true,
        classification: 'INDIA_REMOTE',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: 'India',
        confidence: 'HIGH',
        evidence: `Explicit India remote indicator: "${loc}"`,
        effectiveWorkMode: 'REMOTE',
      };
    }

    // ─── Rule 3: Confirmed Indian Cities (Onsite / Hybrid) ──────────────────
    // Reject if description specifies overseas residency/authorization restrictions
    if (OVERSEAS_RESTRICTIONS_REGEX.test(desc)) {
      return {
        isIndiaEligible: false,
        classification: 'OVERSEAS_ONLY',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: 'Overseas',
        confidence: 'HIGH',
        evidence: 'Description specifies strict overseas residency/work-authorization restrictions',
        effectiveWorkMode: wm === 'REMOTE' || /\bremote\b/i.test(combinedHeader) ? 'REMOTE' : 'ONSITE',
      };
    }

    // Reject if location specifies overseas jurisdiction without explicit India co-location (e.g. "Delhi, NY, USA")
    if (OVERSEAS_LOCATION_REGEX.test(locLower) && !/\bindia\b/i.test(locLower)) {
      return {
        isIndiaEligible: false,
        classification: 'OVERSEAS_ONLY',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: 'Overseas',
        confidence: 'HIGH',
        evidence: `Location specifies overseas jurisdiction without confirmed India co-location: "${loc}"`,
        effectiveWorkMode: wm === 'REMOTE' || /\bremote\b/i.test(locLower) ? 'REMOTE' : 'ONSITE',
      };
    }

    for (const rule of INDIAN_CITY_RULES) {
      if (rule.regex.test(combinedHeader)) {
        // Resolve sub-city if configured
        let matchedSubCity = rule.defaultSubCity;
        if (rule.subCityRules) {
          for (const sub of rule.subCityRules) {
            if (sub.regex.test(combinedHeader)) {
              matchedSubCity = sub.subCity;
              break;
            }
          }
        }

        // Determine effective work mode
        const isRemote = wm === 'REMOTE' || /\bremote\b/i.test(combinedHeader);
        const isHybrid = wm === 'HYBRID' || /\bhybrid\b/i.test(combinedHeader);

        if (isRemote) {
          return {
            isIndiaEligible: true,
            classification: 'INDIA_REMOTE',
            normalizedCity: rule.normalizedCity,
            subCity: matchedSubCity,
            state: rule.state,
            country: 'India',
            confidence: 'HIGH',
            evidence: `Remote role with Indian tech hub hub-base: ${rule.normalizedCity}`,
            effectiveWorkMode: 'REMOTE',
          };
        }

        if (isHybrid) {
          return {
            isIndiaEligible: true,
            classification: 'INDIA_HYBRID',
            normalizedCity: rule.normalizedCity,
            subCity: matchedSubCity,
            state: rule.state,
            country: 'India',
            confidence: 'HIGH',
            evidence: `Confirmed hybrid Indian tech hub: ${rule.normalizedCity}`,
            effectiveWorkMode: 'HYBRID',
          };
        }

        return {
          isIndiaEligible: true,
          classification: 'INDIA_ONSITE',
          normalizedCity: rule.normalizedCity,
          subCity: matchedSubCity,
          state: rule.state,
          country: 'India',
          confidence: 'HIGH',
          evidence: `Confirmed Indian tech hub: ${rule.normalizedCity}`,
          effectiveWorkMode: 'ONSITE',
        };
      }
    }

    // ─── Rule 4: Generic "India" Location ──────────────────────────────────
    if (/\bindia\b/i.test(combinedHeader)) {
      const isRemote = wm === 'REMOTE' || /\bremote\b/i.test(combinedHeader);
      const isHybrid = wm === 'HYBRID' || /\bhybrid\b/i.test(combinedHeader);

      if (isRemote) {
        return {
          isIndiaEligible: true,
          classification: 'INDIA_REMOTE',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: 'India',
          confidence: 'HIGH',
          evidence: 'Generic India location designated as Remote',
          effectiveWorkMode: 'REMOTE',
        };
      }

      if (isHybrid) {
        return {
          isIndiaEligible: true,
          classification: 'INDIA_HYBRID',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: 'India',
          confidence: 'HIGH',
          evidence: 'Generic India location designated as Hybrid',
          effectiveWorkMode: 'HYBRID',
        };
      }

      return {
        isIndiaEligible: true,
        classification: 'INDIA_ONSITE',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: 'India',
        confidence: 'HIGH',
        evidence: 'Location states "India" without specific city',
        effectiveWorkMode: 'ONSITE',
      };
    }

    // ─── Rule 5: Explicit Overseas Locations ───────────────────────────────
    if (OVERSEAS_LOCATION_REGEX.test(locLower) || OVERSEAS_RESTRICTIONS_REGEX.test(desc)) {
      return {
        isIndiaEligible: false,
        classification: 'OVERSEAS_ONLY',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: 'Overseas',
        confidence: 'HIGH',
        evidence: `Location or description specifies overseas jurisdiction: "${loc}"`,
        effectiveWorkMode: wm === 'REMOTE' || /\bremote\b/i.test(locLower) ? 'REMOTE' : 'ONSITE',
      };
    }

    // ─── Rule 6: Worldwide / Anywhere Remote ────────────────────────────────
    if (/\b(worldwide|anywhere|global remote)\b/i.test(locLower)) {
      // 6A: Reject if description has overseas restrictions
      if (OVERSEAS_RESTRICTIONS_REGEX.test(desc) || OVERSEAS_LOCATION_REGEX.test(desc.slice(0, 500))) {
        return {
          isIndiaEligible: false,
          classification: 'OVERSEAS_ONLY',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: null,
          confidence: 'HIGH',
          evidence: 'Listing states worldwide, but description has regional restrictions',
          effectiveWorkMode: 'REMOTE',
        };
      }

      // 6B: Require explicit verified hiring evidence for India
      const mentionsIndiaInDesc = /\b(india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|chennai)\b/i.test(desc);
      if (mentionsIndiaInDesc) {
        return {
          isIndiaEligible: true,
          classification: 'INDIA_REMOTE',
          normalizedCity: null,
          subCity: null,
          state: null,
          country: 'India',
          confidence: 'HIGH',
          evidence: 'Worldwide remote with verified explicit hiring presence/mention in India',
          effectiveWorkMode: 'REMOTE',
        };
      }

      // 6C: Generic worldwide without explicit India evidence is treated as Ambiguous (do not assume eligibility)
      return {
        isIndiaEligible: false,
        classification: 'AMBIGUOUS',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: null,
        confidence: 'LOW',
        evidence: 'Listing states Worldwide/Anywhere but lacks explicit hiring eligibility evidence for India',
        effectiveWorkMode: 'REMOTE',
      };
    }

    // ─── Rule 7: Bare "Remote" or Ambiguous Location ───────────────────────
    if (wm === 'REMOTE' || locLower === 'remote') {
      return {
        isIndiaEligible: false,
        classification: 'AMBIGUOUS',
        normalizedCity: null,
        subCity: null,
        state: null,
        country: null,
        confidence: 'LOW',
        evidence: 'Remote role without identifiable geographic eligibility',
        effectiveWorkMode: 'REMOTE',
      };
    }

    // ─── Default: Unrecognized Non-India Location ──────────────────────────
    return {
      isIndiaEligible: false,
      classification: 'AMBIGUOUS',
      normalizedCity: null,
      subCity: null,
      state: null,
      country: null,
      confidence: 'LOW',
      evidence: `Unrecognized location: "${loc}"`,
      effectiveWorkMode: wm === 'UNKNOWN' ? 'UNKNOWN' : (wm as any),
    };
  }

  /**
   * Generates a clean, standardized location string based on classification.
   */
  static formatNormalizedLocation(
    result: IndiaClassificationResult,
    originalLocation?: string | null,
  ): string {
    if (!result.isIndiaEligible) {
      return (originalLocation || '').trim() || 'Unknown';
    }

    if (result.classification === 'INDIA_REMOTE') {
      if (result.normalizedCity) {
        return `Remote - ${result.normalizedCity}, India`;
      }
      return 'Remote - India';
    }

    if (result.classification === 'INDIA_HYBRID') {
      if (result.normalizedCity) {
        return `${result.normalizedCity}, India (Hybrid)`;
      }
      return 'India (Hybrid)';
    }

    if (result.classification === 'INDIA_ONSITE') {
      if (result.normalizedCity) {
        return `${result.normalizedCity}, India`;
      }
      return 'India';
    }

    return (originalLocation || '').trim() || 'Unknown';
  }
}
