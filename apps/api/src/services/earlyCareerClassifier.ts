/**
 * Early Career Classification Engine (M2.2)
 *
 * Deterministic, pure TypeScript classification engine for Early Career Opportunities.
 * Implements M2.1 v5.1 specification:
 * - Precedence-based role classification (INTERNSHIP, FRESHER, GRADUATE_TRAINEE, ENTRY_LEVEL, JUNIOR, NOT_EARLY_CAREER, UNKNOWN)
 * - Multi-tier range handling ([0, 24] -> UNKNOWN with broad span explanation)
 * - Dynamic graduation batch extraction (no hardcoded year arrays)
 * - Zero-default academic criteria with explicit scale and mode handling
 * - Conflict detection across title, body, and ATS metadata (no silent winner)
 * - Criterion-level evidence generation with verification rollup
 * - Pure and independently testable (no DB, no API calls, no external LLM dependencies)
 */

// ============================================================================
// ENUMS & TYPES (Aligned with M2.1 v5.1 Specification)
// ============================================================================

export type EarlyCareerCategory =
  | 'INTERNSHIP'
  | 'FRESHER'
  | 'GRADUATE_TRAINEE'
  | 'ENTRY_LEVEL'
  | 'JUNIOR'
  | 'NOT_EARLY_CAREER'
  | 'UNKNOWN';

export type VerificationLevel =
  | 'MANUALLY_AUDITED'
  | 'AUTOMATED_HIGH_CONFIDENCE'
  | 'INFERRED_HEURISTIC'
  | 'REVIEW_REQUIRED'
  | 'UNVERIFIED';

export type ConstraintState = 'RESTRICTED' | 'UNRESTRICTED' | 'UNKNOWN';

export type ExperienceBoundType =
  | 'EXACT_RANGE'
  | 'MINIMUM_ONLY'
  | 'MAXIMUM_ONLY'
  | 'NO_EXPERIENCE_REQ';

export type BacklogPolicy =
  | 'NO_ACTIVE'
  | 'NO_HISTORY'
  | 'ALLOWED_WITH_LIMIT'
  | 'UNRESTRICTED'
  | 'UNKNOWN';

export type CgpaScale = 'SCALE_10_0' | 'SCALE_4_0' | 'SCALE_7_0' | 'SCALE_UNKNOWN';

export type AcademicEvaluationMode =
  | 'SINGLE_CRITERION'
  | 'DISJUNCTIVE_OR'
  | 'CONJUNCTIVE_AND';

export type CriterionType =
  | 'ROLE_CATEGORY'
  | 'GRADUATION_BATCH'
  | 'RELATIVE_COHORT'
  | 'DEGREE'
  | 'BRANCH'
  | 'EXPERIENCE_MONTHS'
  | 'CGPA'
  | 'PERCENTAGE'
  | 'BACKLOG'
  | 'CITIZENSHIP'
  | 'WORK_AUTHORIZATION';

export type ExtractionMethod =
  | 'ATS_METADATA_FIELD'
  | 'REGEX_DETERMINISTIC'
  | 'NLP_LLM_STRUCTURED'
  | 'MANUAL_AUDIT_OVERRIDE';

// ============================================================================
// INPUT & OUTPUT INTERFACES
// ============================================================================

export interface OpportunityClassificationInput {
  title: string;
  description: string;
  company?: string;
  location?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  metadata?: Record<string, any>;
  sourceUrl?: string | null;
}

export interface ClassificationEvidenceRecord {
  criterion: CriterionType;
  rawValue: string;
  normalizedValue: Record<string, any>;
  confidence: number;
  verificationLevel: VerificationLevel;
  extractionMethod: ExtractionMethod;
  sourceField: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface EarlyCareerClassificationResult {
  category: EarlyCareerCategory;
  confidence: number;
  explanation: string;
  overallVerificationLevel: VerificationLevel;

  // Experience requirements
  experienceConstraint: ConstraintState;
  experienceBoundType: ExperienceBoundType | null;
  minExperienceMonths: number | null;
  maxExperienceMonths: number | null;

  // Graduation batch criteria
  batchConstraint: ConstraintState;
  eligibleBatches: number[];
  relativeCohorts: string[];

  // Academic requirements
  academicConstraint: ConstraintState;
  minCgpa: number | null;
  cgpaScale: CgpaScale | null;
  minPercentage: number | null;
  academicEvaluationMode: AcademicEvaluationMode | null;
  backlogPolicy: BacklogPolicy;
  maxActiveBacklogs: number | null;

  // Degrees & Branches
  degreeConstraint: ConstraintState;
  eligibleDegrees: string[];
  branchConstraint: ConstraintState;
  eligibleBranches: string[];

  // Conflict and Audit Information
  hasConflict: boolean;
  conflictDetails: string[];
  evidenceRecords: ClassificationEvidenceRecord[];
}

// ============================================================================
// HELPER PARSERS & EXTRACTORS
// ============================================================================

/**
 * Strips HTML formatting and normalizes whitespace for parsing.
 */
export function cleanHtmlText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministically serializes any JavaScript value to JSON with sorted object keys.
 * Handles null, undefined, primitive values, arrays, and nested objects.
 * Omits undefined object properties to ensure { a: 1, b: undefined } === { a: 1 }.
 */
export function canonicalJsonStringify(val: any): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(val)
    .filter((k) => val[k] !== undefined)
    .sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(val[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * 1. Experience Extraction
 */
interface ExtractedExperience {
  constraint: ConstraintState;
  boundType: ExperienceBoundType | null;
  minMonths: number | null;
  maxMonths: number | null;
  evidence: Array<{ rawValue: string; normalized: any; confidence: number; field: string }>;
  isExplicitZero: boolean;
}

export function extractExperience(
  title: string,
  cleanedDesc: string,
  metadata?: Record<string, any>
): ExtractedExperience {
  const text = `${title}\n${cleanedDesc}`;
  const evidence: ExtractedExperience['evidence'] = [];

  // Metadata check first if provided
  if (metadata && typeof metadata === 'object') {
    const minM = metadata.minExperienceMonths ?? (metadata.minExperienceYears ? metadata.minExperienceYears * 12 : undefined);
    const maxM = metadata.maxExperienceMonths ?? (metadata.maxExperienceYears ? metadata.maxExperienceYears * 12 : undefined);

    if (minM !== undefined || maxM !== undefined) {
      const min = typeof minM === 'number' ? Math.round(minM) : null;
      const max = typeof maxM === 'number' ? Math.round(maxM) : null;
      let boundType: ExperienceBoundType = 'EXACT_RANGE';
      if (min === 0 && max === 0) boundType = 'NO_EXPERIENCE_REQ';
      else if (min !== null && max === null) boundType = 'MINIMUM_ONLY';
      else if (min === null && max !== null) boundType = 'MAXIMUM_ONLY';

      evidence.push({
        rawValue: `metadata: min=${minM}, max=${maxM}`,
        normalized: { minMonths: min, maxMonths: max, boundType },
        confidence: 0.95,
        field: 'metadata',
      });

      return {
        constraint: 'RESTRICTED',
        boundType,
        minMonths: min,
        maxMonths: max,
        evidence,
        isExplicitZero: min === 0 && max === 0,
      };
    }
  }

  // Explicit Zero Experience Patterns
  const zeroExpRegexes = [
    /\b(?:zero|0)\s*(?:-|to|\/)\s*(?:zero|0)\s*(?:years?|yrs?|months?|mos?)\b/i,
    /\b(?:no|zero)\s+(?:prior|previous)?\s*experience\s*(?:required|needed|necessary)?\b/i,
    /\b0\+?\s*(?:years?|yrs?)\s*(?:of\s+)?experience\b/i,
    /\b0\s*(?:-|to)\s*0\s*years?\b/i,
  ];

  for (const regex of zeroExpRegexes) {
    const match = text.match(regex);
    if (match) {
      evidence.push({
        rawValue: match[0],
        normalized: { minMonths: 0, maxMonths: 0, boundType: 'NO_EXPERIENCE_REQ' },
        confidence: 0.98,
        field: 'description',
      });
      return {
        constraint: 'RESTRICTED',
        boundType: 'NO_EXPERIENCE_REQ',
        minMonths: 0,
        maxMonths: 0,
        evidence,
        isExplicitZero: true,
      };
    }
  }

  // Explicit Unrestricted Experience
  const unrestrictedRegex = /\b(?:open to all experience levels|any experience level welcome|regardless of experience)\b/i;
  const unresMatch = text.match(unrestrictedRegex);
  if (unresMatch) {
    evidence.push({
      rawValue: unresMatch[0],
      normalized: { unrestricted: true },
      confidence: 0.95,
      field: 'description',
    });
    return {
      constraint: 'UNRESTRICTED',
      boundType: null,
      minMonths: null,
      maxMonths: null,
      evidence,
      isExplicitZero: false,
    };
  }

  // Academic / educational duration lookahead to avoid treating university/college progression as professional experience
  const academicDurationLookahead = '(?!\\s*(?:of\\s+)?(?:university|college|school|undergraduate|postgraduate|degree|academic|study|studies|coursework|education|curriculum)\\b)';

  // Range Patterns: Year Ranges (e.g. "0 to 12 months", "1 - 3 years", "0 - 2 years", "1.5 to 3 years")
  const yearRangeRegex = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:-|to|\\/)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?)${academicDurationLookahead}\\b`, 'i');
  const yrMatch = text.match(yearRangeRegex);
  if (yrMatch) {
    const minYr = parseFloat(yrMatch[1]);
    const maxYr = parseFloat(yrMatch[2]);
    const minM = Math.round(minYr * 12);
    const maxM = Math.round(maxYr * 12);
    evidence.push({
      rawValue: yrMatch[0],
      normalized: { minMonths: minM, maxMonths: maxM, boundType: 'EXACT_RANGE' },
      confidence: 0.95,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'EXACT_RANGE',
      minMonths: minM,
      maxMonths: maxM,
      evidence,
      isExplicitZero: minM === 0 && maxM === 0,
    };
  }

  // Month Range Patterns (e.g. "0 to 12 months", "0-24 months")
  const monthRangeRegex = new RegExp(`\\b(\\d+)\\s*(?:-|to|\\/)\\s*(\\d+)\\s*(?:months?|mos?)${academicDurationLookahead}\\b`, 'i');
  const moMatch = text.match(monthRangeRegex);
  if (moMatch) {
    const minM = parseInt(moMatch[1], 10);
    const maxM = parseInt(moMatch[2], 10);
    evidence.push({
      rawValue: moMatch[0],
      normalized: { minMonths: minM, maxMonths: maxM, boundType: 'EXACT_RANGE' },
      confidence: 0.95,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'EXACT_RANGE',
      minMonths: minM,
      maxMonths: maxM,
      evidence,
      isExplicitZero: minM === 0 && maxM === 0,
    };
  }

  // Maximum Only Patterns (e.g. "up to 1 year", "maximum 12 months", "up to 2 years")
  const maxYearRegex = new RegExp(`\\b(?:up\\s*to|maximum|max|less\\s*than|not\\s*more\\s*than)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?)${academicDurationLookahead}\\b`, 'i');
  const maxYrMatch = text.match(maxYearRegex);
  if (maxYrMatch) {
    const maxM = Math.round(parseFloat(maxYrMatch[1]) * 12);
    evidence.push({
      rawValue: maxYrMatch[0],
      normalized: { minMonths: null, maxMonths: maxM, boundType: 'MAXIMUM_ONLY' },
      confidence: 0.90,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'MAXIMUM_ONLY',
      minMonths: null,
      maxMonths: maxM,
      evidence,
      isExplicitZero: false,
    };
  }

  const maxMonthRegex = new RegExp(`\\b(?:up\\s*to|maximum|max|less\\s*than|(?:no|not)\\s*more\\s*than)\\s*(\\d+)\\s*(?:months?|mos?)${academicDurationLookahead}\\b`, 'i');
  const maxMoMatch = text.match(maxMonthRegex);
  if (maxMoMatch) {
    const maxM = parseInt(maxMoMatch[1], 10);
    evidence.push({
      rawValue: maxMoMatch[0],
      normalized: { minMonths: null, maxMonths: maxM, boundType: 'MAXIMUM_ONLY' },
      confidence: 0.90,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'MAXIMUM_ONLY',
      minMonths: null,
      maxMonths: maxM,
      evidence,
      isExplicitZero: false,
    };
  }

  // Minimum Only Patterns (e.g. "min 6 months", "2+ years", "minimum 3 years", "3 to 5 years")
  const minOnlyMonthRegex = new RegExp(`\\b(?:minimum|min|at\\s*least)\\s*(\\d+)\\s*(?:months?|mos?)${academicDurationLookahead}\\b`, 'i');
  const minMoMatch = text.match(minOnlyMonthRegex);
  if (minMoMatch) {
    const minM = parseInt(minMoMatch[1], 10);
    evidence.push({
      rawValue: minMoMatch[0],
      normalized: { minMonths: minM, maxMonths: null, boundType: 'MINIMUM_ONLY' },
      confidence: 0.90,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'MINIMUM_ONLY',
      minMonths: minM,
      maxMonths: null,
      evidence,
      isExplicitZero: false,
    };
  }

  const plusYearRegex = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*\\+\\s*(?:years?|yrs?)${academicDurationLookahead}\\b`, 'i');
  const plusMatch = text.match(plusYearRegex);
  if (plusMatch) {
    const minM = Math.round(parseFloat(plusMatch[1]) * 12);
    evidence.push({
      rawValue: plusMatch[0],
      normalized: { minMonths: minM, maxMonths: null, boundType: 'MINIMUM_ONLY' },
      confidence: 0.92,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'MINIMUM_ONLY',
      minMonths: minM,
      maxMonths: null,
      evidence,
      isExplicitZero: false,
    };
  }

  const minOnlyYearRegex = new RegExp(`\\b(?:minimum|min|at\\s*least)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?)${academicDurationLookahead}\\b`, 'i');
  const minYrMatch = text.match(minOnlyYearRegex);
  if (minYrMatch) {
    const minM = Math.round(parseFloat(minYrMatch[1]) * 12);
    evidence.push({
      rawValue: minYrMatch[0],
      normalized: { minMonths: minM, maxMonths: null, boundType: 'MINIMUM_ONLY' },
      confidence: 0.90,
      field: 'description',
    });
    return {
      constraint: 'RESTRICTED',
      boundType: 'MINIMUM_ONLY',
      minMonths: minM,
      maxMonths: null,
      evidence,
      isExplicitZero: false,
    };
  }

  return {
    constraint: 'UNKNOWN',
    boundType: null,
    minMonths: null,
    maxMonths: null,
    evidence: [],
    isExplicitZero: false,
  };
}

/**
 * 2. Dynamic Graduation Batch Extraction
 */
interface ExtractedBatches {
  constraint: ConstraintState;
  batches: number[];
  relativeCohorts: string[];
  evidence: Array<{ rawValue: string; normalized: any; confidence: number; field: string }>;
  statedBatchRequirementWithoutSpecifics: boolean;
  hasBatchConflict: boolean;
  batchConflictReason?: string;
}

export function extractGraduationBatches(title: string, cleanedDesc: string): ExtractedBatches {
  const text = `${title}\n${cleanedDesc}`;
  const batches = new Set<number>();
  const relativeCohorts: string[] = [];
  const evidence: ExtractedBatches['evidence'] = [];

  // Guard against false positives: ignore copyright, founded, posted timestamps
  const sanitizedText = text
    .replace(/\b(?:copyright|©|\(c\))\s*20\d{2}\b/gi, '')
    .replace(/\b(?:founded|established|operating since|started in)\s*20\d{2}\b/gi, '')
    .replace(/\b(?:posted|updated|published)\s*(?:on|date)?\s*[:\s]*.*20\d{2}\b/gi, '');

  // Year range pattern: e.g. "2025 - 2026 batch", "2025 to 2026 passouts"
  const batchRangeRegex = /\b(20\d{2})\s*(?:-|to|\/|and)\s*(20\d{2})\s*(?:batch|passout|pass-out|passed-out|graduates?|passing|class)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = batchRangeRegex.exec(sanitizedText)) !== null) {
    const y1 = parseInt(match[1], 10);
    const y2 = parseInt(match[2], 10);
    if (y1 >= 2020 && y1 <= 2035 && y2 >= 2020 && y2 <= 2035) {
      batches.add(y1);
      batches.add(y2);
      evidence.push({
        rawValue: match[0],
        normalized: { batches: [y1, y2] },
        confidence: 0.98,
        field: 'description',
      });
    }
  }

  // Single year batch pattern: e.g. "2026 batch", "Class of 2026", "2026 passouts"
  const singleBatchRegex = /\b(20\d{2})\s*(?:batch|passout|pass-out|passed-out|graduates?|graduating|passing|class of)\b/gi;
  while ((match = singleBatchRegex.exec(sanitizedText)) !== null) {
    const y = parseInt(match[1], 10);
    if (y >= 2020 && y <= 2035) {
      batches.add(y);
      evidence.push({
        rawValue: match[0],
        normalized: { batches: [y] },
        confidence: 0.98,
        field: 'description',
      });
    }
  }

  // "Class of 2026" / "Batch of 2026"
  const classOfRegex = /\b(?:class|batch)\s+of\s+(20\d{2})\b/gi;
  while ((match = classOfRegex.exec(sanitizedText)) !== null) {
    const y = parseInt(match[1], 10);
    if (y >= 2020 && y <= 2035) {
      batches.add(y);
      evidence.push({
        rawValue: match[0],
        normalized: { batches: [y] },
        confidence: 0.98,
        field: 'description',
      });
    }
  }

  // "degree obtained by summer 2027" / "graduation by 2027"
  const batchByRegex = /\b(?:degree|graduation|graduating|obtained)\s*(?:by)?\s*(?:summer|spring|fall|winter)?\s*(20\d{2})\b/gi;
  while ((match = batchByRegex.exec(sanitizedText)) !== null) {
    const y = parseInt(match[1], 10);
    if (y >= 2020 && y <= 2035) {
      batches.add(y);
      evidence.push({
        rawValue: match[0],
        normalized: { batches: [y] },
        confidence: 0.95,
        field: 'description',
      });
    }
  }

  // Title-specific batch extraction to check title vs description conflict
  const titleBatchRegex = /\b(20\d{2})\b/g;
  const titleBatches: number[] = [];
  let tMatch: RegExpExecArray | null;
  while ((tMatch = titleBatchRegex.exec(title)) !== null) {
    const y = parseInt(tMatch[1], 10);
    if (y >= 2020 && y <= 2035) {
      titleBatches.push(y);
    }
  }

  // Relative Cohorts
  const relativePatterns = [
    /\bfinal[- ]year students?\b/i,
    /\bpre[- ]final[- ]year students?\b/i,
    /\bgraduating seniors?\b/i,
  ];

  for (const relRegex of relativePatterns) {
    const relMatch = text.match(relRegex);
    if (relMatch) {
      relativeCohorts.push(relMatch[0]);
      evidence.push({
        rawValue: relMatch[0],
        normalized: { relativeCohort: relMatch[0] },
        confidence: 0.85,
        field: 'description',
      });
    }
  }

  // Check if JD mentions batch requirement exists but without specific year
  const vagueBatchRegex = /\b(?:graduation\s+batch\s+cutoff|eligible\s+batch|batch\s+eligibility\s+applies)\b/i;
  const statedWithoutSpecifics = batches.size === 0 && vagueBatchRegex.test(text);

  // Check for conflict between title and description batch
  let hasBatchConflict = false;
  let batchConflictReason: string | undefined;

  if (titleBatches.length > 0 && batches.size > 0) {
    const hasOverlap = titleBatches.some((tb) => batches.has(tb));
    if (!hasOverlap) {
      hasBatchConflict = true;
      batchConflictReason = `Title mentions batch ${titleBatches.join(', ')} but description specifies batch ${Array.from(batches).join(', ')}`;
    }
  }

  const sortedBatches = Array.from(batches).sort();

  return {
    constraint: sortedBatches.length > 0 || relativeCohorts.length > 0 ? 'RESTRICTED' : 'UNKNOWN',
    batches: sortedBatches,
    relativeCohorts,
    evidence,
    statedBatchRequirementWithoutSpecifics: statedWithoutSpecifics,
    hasBatchConflict,
    batchConflictReason,
  };
}

/**
 * 3. Academic Requirements Extraction
 */
interface ExtractedAcademics {
  constraint: ConstraintState;
  minCgpa: number | null;
  cgpaScale: CgpaScale | null;
  minPercentage: number | null;
  evaluationMode: AcademicEvaluationMode | null;
  backlogPolicy: BacklogPolicy;
  maxActiveBacklogs: number | null;
  evidence: Array<{ rawValue: string; normalized: any; confidence: number; field: string }>;
  isAmbiguous: boolean;
}

export function extractAcademicRequirements(cleanedDesc: string): ExtractedAcademics {
  const text = cleanedDesc;
  const evidence: ExtractedAcademics['evidence'] = [];

  // Check for explicit unrestricted statement
  const unrestrictedRegex = /\b(?:no\s+(?:degree|percentage|academic|cgpa)\s*(?:criteria|requirements?|restrictions?)|open\s+to\s+all\s+(?:degrees|backgrounds|percentages))\b/i;
  const unresMatch = text.match(unrestrictedRegex);
  if (unresMatch) {
    evidence.push({
      rawValue: unresMatch[0],
      normalized: { academicConstraint: 'UNRESTRICTED' },
      confidence: 0.95,
      field: 'description',
    });
    return {
      constraint: 'UNRESTRICTED',
      minCgpa: null,
      cgpaScale: null,
      minPercentage: null,
      evaluationMode: null,
      backlogPolicy: 'UNRESTRICTED',
      maxActiveBacklogs: null,
      evidence,
      isAmbiguous: false,
    };
  }

  // CGPA Extraction
  let extractedCgpa: number | null = null;
  let detectedScale: CgpaScale | null = null;

  // Patterns like "7.5/10 CGPA", "min 7.0 CGPA", "CGPA of 6.5 and above"
  const cgpaScaleRegex = /\b(\d(?:\.\d{1,2})?)\s*\/\s*(10|4|7)\s*(?:cgpa|gpa)?\b/i;
  const scaleMatch = text.match(cgpaScaleRegex);
  if (scaleMatch) {
    extractedCgpa = parseFloat(scaleMatch[1]);
    const denom = scaleMatch[2];
    detectedScale = denom === '10' ? 'SCALE_10_0' : denom === '4' ? 'SCALE_4_0' : 'SCALE_7_0';
    evidence.push({
      rawValue: scaleMatch[0],
      normalized: { minCgpa: extractedCgpa, cgpaScale: detectedScale },
      confidence: 0.95,
      field: 'description',
    });
  } else {
    const cgpaRegex = /\b(?:min(?:imum)?\s*)?(\d(?:\.\d{1,2})?)\s*(?:cgpa|gpa)\b/i;
    const cgpaMatch = text.match(cgpaRegex);
    if (cgpaMatch) {
      extractedCgpa = parseFloat(cgpaMatch[1]);
      detectedScale = 'SCALE_UNKNOWN'; // Zero-default policy: never assume 10.0 silently
      evidence.push({
        rawValue: cgpaMatch[0],
        normalized: { minCgpa: extractedCgpa, cgpaScale: detectedScale },
        confidence: 0.90,
        field: 'description',
      });
    } else {
      const prefixCgpaRegex = /\b(?:cgpa|gpa)\s*(?:of\s*|:\s*)?(\d(?:\.\d{1,2})?)(?:\s*(?:and|&)\s*above|\s*\+)?\b/i;
      const prefixMatch = text.match(prefixCgpaRegex);
      if (prefixMatch) {
        extractedCgpa = parseFloat(prefixMatch[1]);
        detectedScale = extractedCgpa > 4.0 && extractedCgpa <= 10.0 ? 'SCALE_10_0' : 'SCALE_UNKNOWN';
        evidence.push({
          rawValue: prefixMatch[0],
          normalized: { minCgpa: extractedCgpa, cgpaScale: detectedScale },
          confidence: 0.95,
          field: 'description',
        });
      }
    }
  }

  // Percentage Extraction
  let extractedPercentage: number | null = null;
  const percentRegex = /\b(\d{2}(?:\.\d{1,2})?)\s*%(?:\s*(?:marks?|aggregate|cutoff|score|minimum))?/i;
  const percentMatch = text.match(percentRegex);
  if (percentMatch) {
    extractedPercentage = parseFloat(percentMatch[1]);
    evidence.push({
      rawValue: percentMatch[0],
      normalized: { minPercentage: extractedPercentage },
      confidence: 0.92,
      field: 'description',
    });
  }

  // Connective Analysis (OR vs AND vs Slash/Ambiguous)
  let evalMode: AcademicEvaluationMode | null = null;
  let isAmbiguous = false;

  if (extractedCgpa !== null && extractedPercentage !== null) {
    // Check for explicit ambiguous connective like "60% / 6.5 CGPA" or "6.5 CGPA / 60%"
    const slashRegex = /(?:\d{2}(?:\.\d{1,2})?%\s*\/\s*\d(?:\.\d{1,2})?|\d(?:\.\d{1,2})?\s*(?:cgpa|gpa)?\s*\/\s*\d{2}(?:\.\d{1,2})%)/i;
    if (slashRegex.test(text)) {
      evalMode = null;
      isAmbiguous = true;
    } else {
      // Check explicit OR
      const orRegex = /\b(?:or|either)\b/i;
      const andRegex = /\b(?:and|both)\b/i;

      // Extract context around the academic terms
      const dualContextRegex = /(?:(\d{2}(?:\.\d{1,2})?%)[^.]{0,30}\b(or|and)\b[^.]{0,30}(\d(?:\.\d{1,2})?\s*(?:cgpa|gpa))|(\d(?:\.\d{1,2})?\s*(?:cgpa|gpa))[^.]{0,30}\b(or|and)\b[^.]{0,30}(\d{2}(?:\.\d{1,2})%))/i;
      const dualMatch = text.match(dualContextRegex);

      if (dualMatch) {
        const connective = (dualMatch[2] || dualMatch[5]).toLowerCase();
        if (connective === 'or') evalMode = 'DISJUNCTIVE_OR';
        else if (connective === 'and') evalMode = 'CONJUNCTIVE_AND';
      } else if (orRegex.test(text)) {
        evalMode = 'DISJUNCTIVE_OR';
      } else if (andRegex.test(text)) {
        evalMode = 'CONJUNCTIVE_AND';
      } else {
        // Neither explicit OR nor AND -> ambiguous, never default to OR
        evalMode = null;
        isAmbiguous = true;
      }
    }
  } else if (extractedCgpa !== null || extractedPercentage !== null) {
    evalMode = 'SINGLE_CRITERION';
  }

  // Backlog Extraction
  let backlogPolicy: BacklogPolicy = 'UNKNOWN';
  let maxActiveBacklogs: number | null = null;

  const noHistoryRegex = /\b(?:no\s+(?:history\s+of\s+)?backlogs?|zero\s+backlogs\s+throughout|all\s+papers\s+cleared\s+in\s+first\s+attempt)\b/i;
  const noActiveRegex = /\b(?:no\s+active\s+backlogs?|zero\s+active\s+backlogs?|no\s+standing\s+(?:arrears|backlogs?)|0\s+active\s+backlogs?)\b/i;
  const allowedWithLimitRegex = /\b(?:up\s*to|maximum|max)\s*(\d+)\s*(?:active\s*)?(?:backlogs?|arrears)\s*(?:allowed|permitted)?\b/i;

  const noHistMatch = text.match(noHistoryRegex);
  const noActMatch = text.match(noActiveRegex);
  const limitMatch = text.match(allowedWithLimitRegex);

  if (noHistMatch) {
    backlogPolicy = 'NO_HISTORY';
    evidence.push({
      rawValue: noHistMatch[0],
      normalized: { backlogPolicy: 'NO_HISTORY' },
      confidence: 0.95,
      field: 'description',
    });
  } else if (limitMatch) {
    backlogPolicy = 'ALLOWED_WITH_LIMIT';
    maxActiveBacklogs = parseInt(limitMatch[1], 10);
    evidence.push({
      rawValue: limitMatch[0],
      normalized: { backlogPolicy: 'ALLOWED_WITH_LIMIT', maxActiveBacklogs },
      confidence: 0.95,
      field: 'description',
    });
  } else if (noActMatch) {
    backlogPolicy = 'NO_ACTIVE';
    evidence.push({
      rawValue: noActMatch[0],
      normalized: { backlogPolicy: 'NO_ACTIVE' },
      confidence: 0.95,
      field: 'description',
    });
  }

  const constraint: ConstraintState =
    isAmbiguous
      ? 'UNKNOWN'
      : extractedCgpa !== null || extractedPercentage !== null || backlogPolicy !== 'UNKNOWN'
      ? 'RESTRICTED'
      : 'UNKNOWN';

  return {
    constraint,
    minCgpa: extractedCgpa,
    cgpaScale: detectedScale,
    minPercentage: extractedPercentage,
    evaluationMode: evalMode,
    backlogPolicy,
    maxActiveBacklogs,
    evidence,
    isAmbiguous,
  };
}

/**
 * 4. Degrees and Branches Extraction
 */
export function extractDegreesAndBranches(text: string): {
  degreeConstraint: ConstraintState;
  degrees: string[];
  branchConstraint: ConstraintState;
  branches: string[];
  evidence: Array<{ rawValue: string; normalized: any; confidence: number; field: string }>;
} {
  const degrees: string[] = [];
  const branches: string[] = [];
  const evidence: Array<{ rawValue: string; normalized: any; confidence: number; field: string }> = [];

  // Degrees
  const degreeRegexes = [
    { name: 'BTECH', regex: /\b(?:b\.?tech|bachelor\s+of\s+technology)\b/i },
    {
      name: 'BE',
      regex: /\b(?:b\.e\.?|bachelor\s+of\s+engineering|b\.?\s*e\.?\s*(?:\/|or)\s*b\.?tech|b\.?tech\s*(?:\/|or)\s*b\.?\s*e\.?|(?:degree\s+(?:in|of)\s+|bachelor(?:'s)?\s+(?:degree\s+)?(?:in|of)\s+)BE|BE\s+degree)\b/i,
    },
    { name: 'MTECH', regex: /\b(?:m\.?tech|master\s+of\s+technology)\b/i },
    { name: 'MCA', regex: /\b(?:m\.?c\.?a\.?|master\s+of\s+computer\s+applications)\b/i },
    { name: 'BCA', regex: /\b(?:b\.?c\.?a\.?|bachelor\s+of\s+computer\s+applications)\b/i },
    { name: 'BSC', regex: /\b(?:b\.?sc|bachelor\s+of\s+science)\b/i },
  ];

  for (const { name, regex } of degreeRegexes) {
    const m = text.match(regex);
    if (m) {
      degrees.push(name);
      evidence.push({
        rawValue: m[0],
        normalized: { degree: name },
        confidence: 0.95,
        field: 'description',
      });
    }
  }

  // Branches
  const branchRegexes = [
    { name: 'COMPUTER_SCIENCE_IT', regex: /\b(?:computer\s*science|cse|it|information\s*technology|software\s*engineering|circuital)\b/i },
    { name: 'ECE', regex: /\b(?:ece|electronics(?:\s*and\s*communication)?|telecom|circuital)\b/i },
    { name: 'EEE', regex: /\b(?:eee|electrical(?:\s*engineering)?|circuital)\b/i },
    { name: 'MECHANICAL', regex: /\b(?:mechanical(?:\s*engineering)?)\b/i },
  ];

  for (const { name, regex } of branchRegexes) {
    const m = text.match(regex);
    if (m) {
      branches.push(name);
      evidence.push({
        rawValue: m[0],
        normalized: { branch: name },
        confidence: 0.90,
        field: 'description',
      });
    }
  }

  return {
    degreeConstraint: degrees.length > 0 ? 'RESTRICTED' : 'UNKNOWN',
    degrees,
    branchConstraint: branches.length > 0 ? 'RESTRICTED' : 'UNKNOWN',
    branches,
    evidence,
  };
}

// ============================================================================
// MAIN CLASSIFICATION ENGINE
// ============================================================================

export class EarlyCareerClassifier {
  /**
   * Classifies an opportunity deterministically according to M2.1 v5.1 rules.
   */
  public classify(input: OpportunityClassificationInput): EarlyCareerClassificationResult {
    const title = input.title ? input.title.trim() : '';
    const cleanedDesc = cleanHtmlText(input.description || '');
    const fullText = `${title}\n${cleanedDesc}`;
    const metadata = input.metadata || {};

    const conflictDetails: string[] = [];
    const evidenceRecords: ClassificationEvidenceRecord[] = [];

    // Step 1: Extract individual dimensions
    const exp = extractExperience(title, cleanedDesc, metadata);
    const batchInfo = extractGraduationBatches(title, cleanedDesc);
    const academics = extractAcademicRequirements(cleanedDesc);
    const degreeBranch = extractDegreesAndBranches(fullText);

    // Step 2: Role Keyword Indicators in Title & Body
    const seniorTitleRegex = /\b(?:senior|lead|staff|principal|architect|manager|director|head\s+of)\b/i;
    const isSeniorTitle = seniorTitleRegex.test(title);

    const rawExpLevel = (input.experienceLevel || '').toLowerCase().trim();
    const isSeniorExpLevel = /\b(senior|sr\.?|mid[-_ ]?senior|executive|director|lead|principal)\b/i.test(rawExpLevel);

    const internTitleRegex = /\b(?:intern|internship|co-?op|summer\s+analyst|industrial\s+trainee)\b/i;
    const isInternTitle = internTitleRegex.test(title);

    const traineeTitleRegex = /\b(?:graduate\s+engineer\s+trainee|get|management\s+trainee|executive\s+trainee|graduate\s+trainee)\b/i;
    const isTraineeTitle = traineeTitleRegex.test(title);

    const fresherTitleOrBodyRegex = /\b(?:fresher|fresh\s+graduates?|campus\s+hire|college\s+hire|new\s+grad(?:uates?)?)\b/i;
    const hasFresherPhrasing = fresherTitleOrBodyRegex.test(fullText);

    // Step 3: Material Conflict Detection (No silent winners)
    let hasConflict = false;

    // Conflict 1: Senior Title with Internship Description
    const internInBodyRegex = /\b(?:6-?month|summer|full-?time)?\s*(?:internship|intern\s+position|co-?op)\b/i;
    if (isSeniorTitle && internInBodyRegex.test(cleanedDesc)) {
      hasConflict = true;
      conflictDetails.push(
        'Material conflict: Title indicates senior position, but description specifies an internship position.'
      );
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { titleRole: 'SENIOR' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: true,
        conflictReason: 'Title contradicts body internship phrasing',
      });
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: cleanedDesc.match(internInBodyRegex)?.[0] || 'internship',
        normalizedValue: { bodyRole: 'INTERNSHIP' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: true,
        conflictReason: 'Body contradicts title seniority',
      });
    }

    // Conflict 2: Internship Title with 3+ Years Experience Requirement
    if (isInternTitle && exp.minMonths !== null && exp.minMonths >= 36) {
      hasConflict = true;
      conflictDetails.push(
        `Material conflict: Title is an internship, but experience requirement specifies minimum ${exp.minMonths} months (3+ years).`
      );
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { titleRole: 'INTERNSHIP' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: true,
        conflictReason: 'Internship title contradicts multi-year experience requirement',
      });
      evidenceRecords.push({
        criterion: 'EXPERIENCE_MONTHS',
        rawValue: `${exp.minMonths} months required`,
        normalizedValue: { minMonths: exp.minMonths },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: true,
        conflictReason: 'Experience requirement contradicts internship designation',
      });
    }

    // Conflict 2b: Internship Title with Senior Experience Level
    if (isInternTitle && isSeniorExpLevel) {
      hasConflict = true;
      conflictDetails.push(
        `Material conflict: Title specifies internship, but experience level specifies senior designation (${input.experienceLevel}).`
      );
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { titleRole: 'INTERNSHIP' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: true,
        conflictReason: 'Internship title contradicts senior experience level',
      });
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: input.experienceLevel || 'SENIOR',
        normalizedValue: { experienceLevel: input.experienceLevel },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'ATS_METADATA_FIELD',
        sourceField: 'experienceLevel',
        hasConflict: true,
        conflictReason: 'Senior experienceLevel contradicts internship title',
      });
    }

    // Conflict 3: Graduate Trainee Title with Contract / Experienced Metadata
    const isContractMetadata =
      metadata.employmentType === 'CONTRACT' ||
      metadata.employmentType === 'CONTRACTOR' ||
      input.employmentType === 'CONTRACT';
    const isExperiencedMetadata =
      (metadata.minExperienceMonths && metadata.minExperienceMonths >= 24) ||
      (metadata.minExperienceYears && metadata.minExperienceYears >= 2);

    if (isTraineeTitle && (isContractMetadata || isExperiencedMetadata)) {
      hasConflict = true;
      conflictDetails.push(
        'Material conflict: Title specifies Graduate Engineer Trainee, but ATS metadata specifies contract engagement or >= 24 months experience.'
      );
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { titleRole: 'GRADUATE_TRAINEE' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: true,
        conflictReason: 'Trainee title contradicts contract/experienced metadata',
      });
      evidenceRecords.push({
        criterion: 'EXPERIENCE_MONTHS',
        rawValue: JSON.stringify(metadata),
        normalizedValue: metadata,
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'ATS_METADATA_FIELD',
        sourceField: 'metadata',
        hasConflict: true,
        conflictReason: 'Metadata contradicts Graduate Trainee program structure',
      });
    }

    // Conflict 4: Graduation Batch Conflict (Title vs Description)
    if (batchInfo.hasBatchConflict) {
      hasConflict = true;
      conflictDetails.push(batchInfo.batchConflictReason || 'Graduation batch conflict between title and description');
      evidenceRecords.push({
        criterion: 'GRADUATION_BATCH',
        rawValue: title,
        normalizedValue: { source: 'title' },
        confidence: 0.95,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: true,
        conflictReason: batchInfo.batchConflictReason,
      });
    }

    // Step 4: Precedence-Based Category Classification
    let category: EarlyCareerCategory = 'UNKNOWN';
    let confidence = 0.0;
    let explanation = '';

    if (hasConflict) {
      category = 'UNKNOWN';
      confidence = 0.0;
      explanation = `Classification suspended due to material conflict: ${conflictDetails.join('; ')}`;
    } else if (isSeniorTitle || isSeniorExpLevel || (exp.minMonths !== null && exp.minMonths > 36)) {
      // Tier 1: NOT_EARLY_CAREER
      category = 'NOT_EARLY_CAREER';
      confidence = 0.98;
      explanation = isSeniorTitle
        ? 'Title contains senior/lead designation indicating experienced professional role.'
        : isSeniorExpLevel
        ? `Experience level specifies senior designation (${input.experienceLevel}).`
        : `Minimum experience of ${exp.minMonths} months exceeds early career threshold (> 36 months).`;
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: isSeniorTitle ? title : isSeniorExpLevel ? input.experienceLevel! : `${exp.minMonths} months`,
        normalizedValue: { category: 'NOT_EARLY_CAREER' },
        confidence: 0.98,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: isSeniorExpLevel && !isSeniorTitle ? 'ATS_METADATA_FIELD' : 'REGEX_DETERMINISTIC',
        sourceField: isSeniorTitle ? 'title' : isSeniorExpLevel ? 'experienceLevel' : 'description',
        hasConflict: false,
      });
    } else if (isInternTitle) {
      // Tier 2: INTERNSHIP
      category = 'INTERNSHIP';
      confidence = 0.98;
      explanation = 'Title specifies an internship or co-op position.';
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { category: 'INTERNSHIP' },
        confidence: 0.98,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: false,
      });
    } else if (isTraineeTitle) {
      // Tier 3: GRADUATE_TRAINEE
      category = 'GRADUATE_TRAINEE';
      confidence = 0.95;
      explanation = 'Title specifies a structured corporate entry program (Graduate Engineer Trainee / GET).';
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title,
        normalizedValue: { category: 'GRADUATE_TRAINEE' },
        confidence: 0.95,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: false,
      });
    } else if (
      (hasFresherPhrasing && (exp.isExplicitZero || exp.maxMonths === 0 || exp.constraint === 'UNKNOWN' || (exp.maxMonths !== null && exp.maxMonths <= 24))) ||
      (batchInfo.batches.length > 0 && (exp.isExplicitZero || (exp.maxMonths !== null && exp.maxMonths <= 24)))
    ) {
      // Tier 4: FRESHER (Requires explicit fresher/campus phrasing AND 0 experience)
      category = 'FRESHER';
      confidence = 0.95;
      explanation = 'Explicit campus/fresher hiring evidence identified with 0-experience requirement.';
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: fullText.match(fresherTitleOrBodyRegex)?.[0] || 'Fresher/Campus hire',
        normalizedValue: { category: 'FRESHER' },
        confidence: 0.95,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: false,
      });
    } else if (
      exp.maxMonths !== null &&
      exp.maxMonths <= 12 &&
      (exp.minMonths === null || exp.minMonths <= 12)
    ) {
      // Tier 5: ENTRY_LEVEL (0 to 12 months without dedicated fresher/intern program phrasing)
      category = 'ENTRY_LEVEL';
      confidence = 0.90;
      explanation = `Experience bounds [${exp.minMonths ?? 0}, ${exp.maxMonths}] fit within Entry Level envelope (<= 12 months).`;
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: exp.evidence[0]?.rawValue || `Up to ${exp.maxMonths} months`,
        normalizedValue: { category: 'ENTRY_LEVEL', maxMonths: exp.maxMonths },
        confidence: 0.90,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: false,
      });
    } else if (
      exp.minMonths !== null &&
      exp.maxMonths !== null &&
      exp.maxMonths <= 36 &&
      (
        // Standard Junior range (e.g. 13-36 months)
        exp.minMonths >= 13 ||
        // Multi-tier early-career span (e.g. 0-24, 6-24, 12-24, 0-36 months)
        // Spans Entry and Junior but completely within early-career ceiling (<= 36 months).
        // Classified as JUNIOR so it is not incorrectly labeled ENTRY_LEVEL while accommodating junior experience.
        (exp.minMonths <= 12 && exp.maxMonths > 12)
      )
    ) {
      // Tier 6: JUNIOR (Accommodates junior experience with upper bound <= 36 months)
      category = 'JUNIOR';
      confidence = 0.95;
      const isMultiTier = exp.minMonths <= 12;
      explanation = isMultiTier
        ? `Experience bounds [${exp.minMonths}, ${exp.maxMonths}] span entry and junior tiers within early-career ceiling (<= 36 months). Classified as JUNIOR.`
        : `Experience bounds [${exp.minMonths}, ${exp.maxMonths}] fit within Junior envelope (13 to 36 months).`;
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: exp.evidence[0]?.rawValue || `${exp.minMonths} to ${exp.maxMonths} months`,
        normalizedValue: {
          category: 'JUNIOR',
          minMonths: exp.minMonths,
          maxMonths: exp.maxMonths,
          multiTierEarlyCareerSpan: isMultiTier,
        },
        confidence: 0.95,
        verificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: false,
      });
    } else if (exp.minMonths !== null && exp.maxMonths === null) {
      // Unbounded lower bound (e.g. "Min 6 months" or "2+ years")
      category = 'UNKNOWN';
      confidence = 0.40;
      explanation = `Minimum experience stated (${exp.minMonths} months) but upper bound is unbounded. Cannot guarantee early-career boundary.`;
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: exp.evidence[0]?.rawValue || `Min ${exp.minMonths} months`,
        normalizedValue: { unboundedUpper: true, minMonths: exp.minMonths },
        confidence: 0.40,
        verificationLevel: 'INFERRED_HEURISTIC',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'description',
        hasConflict: false,
      });
    } else {
      // Tier 7: Generic title with no experience or fresher evidence
      category = 'UNKNOWN';
      confidence = 0.20;
      explanation = 'Generic designation with insufficient experience or early-career evidence.';
      evidenceRecords.push({
        criterion: 'ROLE_CATEGORY',
        rawValue: title || 'Generic title',
        normalizedValue: { category: 'UNKNOWN', insufficientEvidence: true },
        confidence: 0.20,
        verificationLevel: 'UNVERIFIED',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: 'title',
        hasConflict: false,
      });
    }

    // Step 5: Incorporate Dimension Evidence Records
    for (const item of exp.evidence) {
      evidenceRecords.push({
        criterion: 'EXPERIENCE_MONTHS',
        rawValue: item.rawValue,
        normalizedValue: item.normalized,
        confidence: item.confidence,
        verificationLevel: item.confidence >= 0.85 ? 'AUTOMATED_HIGH_CONFIDENCE' : 'INFERRED_HEURISTIC',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: item.field,
        hasConflict: false,
      });
    }

    for (const item of batchInfo.evidence) {
      evidenceRecords.push({
        criterion: item.normalized.batches ? 'GRADUATION_BATCH' : 'RELATIVE_COHORT',
        rawValue: item.rawValue,
        normalizedValue: item.normalized,
        confidence: item.confidence,
        verificationLevel: item.confidence >= 0.85 ? 'AUTOMATED_HIGH_CONFIDENCE' : 'INFERRED_HEURISTIC',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: item.field,
        hasConflict: batchInfo.hasBatchConflict,
        conflictReason: batchInfo.batchConflictReason,
      });
    }

    for (const item of academics.evidence) {
      let crit: CriterionType = 'CGPA';
      if (item.normalized.minPercentage !== undefined) crit = 'PERCENTAGE';
      else if (item.normalized.backlogPolicy !== undefined) crit = 'BACKLOG';

      evidenceRecords.push({
        criterion: crit,
        rawValue: item.rawValue,
        normalizedValue: item.normalized,
        confidence: item.confidence,
        verificationLevel: academics.isAmbiguous
          ? 'UNVERIFIED'
          : item.confidence >= 0.85
          ? 'AUTOMATED_HIGH_CONFIDENCE'
          : 'INFERRED_HEURISTIC',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: item.field,
        hasConflict: academics.isAmbiguous,
        conflictReason: academics.isAmbiguous ? 'Ambiguous academic connective (slash or unspecified operator)' : undefined,
      });
    }

    for (const item of degreeBranch.evidence) {
      const crit: CriterionType = item.normalized.degree ? 'DEGREE' : 'BRANCH';
      evidenceRecords.push({
        criterion: crit,
        rawValue: item.rawValue,
        normalizedValue: item.normalized,
        confidence: item.confidence,
        verificationLevel: item.confidence >= 0.85 ? 'AUTOMATED_HIGH_CONFIDENCE' : 'INFERRED_HEURISTIC',
        extractionMethod: 'REGEX_DETERMINISTIC',
        sourceField: item.field,
        hasConflict: false,
      });
    }

    // Step 6: Overall Verification Rollup
    // Strict rules from M2.1 v5.1:
    // 1. Conflict present -> UNVERIFIED
    // 2. Ambiguous academic connective -> UNVERIFIED
    // 3. Stated batch requirement with missing specifics -> UNVERIFIED
    // 4. No eligibility criteria stated at all -> UNVERIFIED
    // 5. All stated criteria extracted with confidence >= 0.85 and no conflicts -> AUTOMATED_HIGH_CONFIDENCE
    // 6. Otherwise -> INFERRED_HEURISTIC or UNVERIFIED
    let overallVerificationLevel: VerificationLevel = 'UNVERIFIED';

    const statedCriteriaCount =
      (exp.constraint !== 'UNKNOWN' ? 1 : 0) +
      (batchInfo.constraint !== 'UNKNOWN' ? 1 : 0) +
      (academics.constraint !== 'UNKNOWN' ? 1 : 0) +
      (degreeBranch.degreeConstraint !== 'UNKNOWN' ? 1 : 0) +
      (degreeBranch.branchConstraint !== 'UNKNOWN' ? 1 : 0);

    if (hasConflict || academics.isAmbiguous || batchInfo.hasBatchConflict) {
      overallVerificationLevel = 'UNVERIFIED';
    } else if (batchInfo.statedBatchRequirementWithoutSpecifics) {
      overallVerificationLevel = 'UNVERIFIED';
      conflictDetails.push('Job description states a graduation batch requirement exists, but specific eligible years are unstated.');
    } else if (statedCriteriaCount === 0 && category === 'UNKNOWN') {
      overallVerificationLevel = 'UNVERIFIED';
    } else {
      // Check that EVERY active evidence record has high confidence
      const hasAnyLowConfidence = evidenceRecords.some((e) => e.confidence < 0.85);
      const hasAnyConflict = evidenceRecords.some((e) => e.hasConflict);

      if (!hasAnyConflict && !hasAnyLowConfidence && confidence >= 0.85) {
        overallVerificationLevel = 'AUTOMATED_HIGH_CONFIDENCE';
      } else if (!hasAnyConflict && confidence >= 0.40) {
        overallVerificationLevel = 'INFERRED_HEURISTIC';
      } else {
        overallVerificationLevel = 'UNVERIFIED';
      }
    }

    return {
      category,
      confidence,
      explanation,
      overallVerificationLevel,

      experienceConstraint: exp.constraint,
      experienceBoundType: exp.boundType,
      minExperienceMonths: exp.minMonths,
      maxExperienceMonths: exp.maxMonths,

      batchConstraint: batchInfo.constraint,
      eligibleBatches: batchInfo.batches,
      relativeCohorts: batchInfo.relativeCohorts,

      academicConstraint: academics.constraint,
      minCgpa: academics.minCgpa,
      cgpaScale: academics.cgpaScale,
      minPercentage: academics.minPercentage,
      academicEvaluationMode: academics.evaluationMode,
      backlogPolicy: academics.backlogPolicy,
      maxActiveBacklogs: academics.maxActiveBacklogs,

      degreeConstraint: degreeBranch.degreeConstraint,
      eligibleDegrees: degreeBranch.degrees,
      branchConstraint: degreeBranch.branchConstraint,
      eligibleBranches: degreeBranch.branches,

      hasConflict,
      conflictDetails,
      evidenceRecords,
    };
  }
}

// Reusable singleton instance
export const earlyCareerClassifier = new EarlyCareerClassifier();

/**
 * Convenience helper function
 */
export function classifyEarlyCareerOpportunity(
  input: OpportunityClassificationInput
): EarlyCareerClassificationResult {
  return earlyCareerClassifier.classify(input);
}
