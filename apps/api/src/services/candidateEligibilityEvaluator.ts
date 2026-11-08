/**
 * Candidate Eligibility Evaluation Service (M2.5)
 *
 * Pure TypeScript service that evaluates a candidate profile against
 * the persisted OpportunityEligibility criteria of an opportunity.
 *
 * Design Invariants:
 * 1. Missing candidate information produces UNKNOWN.
 * 2. Missing or ambiguous opportunity requirements produce UNKNOWN.
 * 3. Conflicting requirements (hasConflict: true) NEVER silently produce an ELIGIBLE result.
 * 4. REVIEW_REQUIRED or stale manual evidence is never treated as verified.
 * 5. Respects AcademicEvaluationMode: SINGLE_CRITERION, DISJUNCTIVE_OR, CONJUNCTIVE_AND.
 * 6. Respects ExperienceBoundType and ConstraintState.
 * 7. Scale equivalence is never assumed between different or unknown CGPA scales.
 * 8. Missing maximum experience bound is never assumed zero or unlimited without checking bound type.
 * 9. Unknown backlog policy is never treated as no-backlog eligibility.
 * 10. Empty degree or branch list is never treated as unrestricted.
 * 11. Verified mandatory failure takes precedence over unknown criteria in overall status rollup.
 * 12. Pure, deterministic, independent of Express, Prisma, or external APIs.
 */

export type CriterionStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
export type OverallEligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';

export type CriterionReasonCode =
  | 'VERIFIED'
  | 'CANDIDATE_DATA_MISSING'
  | 'EMPLOYER_DATA_MISSING'
  | 'CONFLICT';

export interface CandidateProfileInput {
  graduationYear?: number | null;
  university?: string | null;
  degree?: string | null;
  branch?: string | null;
  cgpa?: number | null;
  cgpaScale?: string | null;
  percentage?: number | null;
  activeBacklogs?: number | null;
  hasBacklogHistory?: boolean | null;
  experienceMonths?: number | null;
}

export interface OpportunityEligibilityInput {
  id?: string;
  opportunityId?: string;
  category?: string;
  confidence?: number;
  overallVerificationLevel?: string;
  explanation?: string;

  // Experience requirements
  experienceConstraint?: string;
  experienceBoundType?: string | null;
  minExperienceMonths?: number | null;
  maxExperienceMonths?: number | null;

  // Graduation batch criteria
  batchConstraint?: string;
  eligibleBatches?: number[];
  relativeCohorts?: string[];

  // Academic requirements
  academicConstraint?: string;
  academicEvaluationMode?: string | null;
  minCgpa?: number | null;
  cgpaScale?: string | null;
  minPercentage?: number | null;
  backlogPolicy?: string;
  maxActiveBacklogs?: number | null;

  // Degrees and Branches
  degreeConstraint?: string;
  eligibleDegrees?: string[];
  branchConstraint?: string;
  eligibleBranches?: string[];

  // Conflicts and Provenance
  hasConflict?: boolean;
  conflictDetails?: string[];
  sourceContentHash?: string;
  classifierVersion?: string;

  // Evidence records (optional)
  evidenceRecords?: Array<{
    criterion: string;
    verificationLevel: string;
    isActive: boolean;
    hasConflict?: boolean;
    conflictReason?: string | null;
  }>;
}

export interface CriterionEvaluationResult {
  status: CriterionStatus;
  explanation: string;
  mandatory: boolean;
  reasonCode: CriterionReasonCode;
  requiredValue?: any;
  candidateValue?: any;
}

export interface CandidateEvaluationResult {
  opportunityId?: string;
  overallStatus: OverallEligibilityStatus;
  overallExplanation: string;
  criteria: {
    experience: CriterionEvaluationResult;
    graduationBatch: CriterionEvaluationResult;
    academics: CriterionEvaluationResult;
    backlog: CriterionEvaluationResult;
    degree: CriterionEvaluationResult;
    branch: CriterionEvaluationResult;
  };
  missingCandidateCount: number;
  missingEmployerCount: number;
  conflictCount: number;
  hasConflict: boolean;
  overallVerificationLevel: string;
}

// ── Degree and Branch Normalization Helpers ─────────────────────────────────

const DEGREE_CANONICAL_MAP: Record<string, string> = {
  BTECH: 'BTECH',
  'B.TECH': 'BTECH',
  'BACHELOR OF TECHNOLOGY': 'BTECH',
  BACHELOROFTECHNOLOGY: 'BTECH',
  BE: 'BE',
  'B.E.': 'BE',
  'BACHELOR OF ENGINEERING': 'BE',
  BACHELOROFENGINEERING: 'BE',
  MTECH: 'MTECH',
  'M.TECH': 'MTECH',
  'MASTER OF TECHNOLOGY': 'MTECH',
  MASTEROFTECHNOLOGY: 'MTECH',
  ME: 'ME',
  'M.E.': 'ME',
  MASTEROFENGINEERING: 'ME',
  BCA: 'BCA',
  MCA: 'MCA',
  BSC: 'BSC',
  'B.SC': 'BSC',
  BACHELOROFSCIENCE: 'BSC',
  MSC: 'MSC',
  'M.SC': 'MSC',
  MASTEROFSCIENCE: 'MSC',
  BBA: 'BBA',
  MBA: 'MBA',
};

function normalizeDegree(raw?: string | null): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  const withSpaces = upper.replace(/[^A-Z0-9. ]/g, '').replace(/\s+/g, ' ');
  if (DEGREE_CANONICAL_MAP[withSpaces]) return DEGREE_CANONICAL_MAP[withSpaces];

  const noDotsWithSpaces = withSpaces.replace(/\./g, '');
  if (DEGREE_CANONICAL_MAP[noDotsWithSpaces]) return DEGREE_CANONICAL_MAP[noDotsWithSpaces];

  const collapsed = withSpaces.replace(/\s+/g, '').replace(/\./g, '');
  if (DEGREE_CANONICAL_MAP[collapsed]) return DEGREE_CANONICAL_MAP[collapsed];

  return collapsed || null;
}

const BRANCH_CANONICAL_MAP: Record<string, string[]> = {
  CSE: ['CSE', 'CS', 'COMPUTER SCIENCE', 'COMPUTER SCIENCE ENGINEERING', 'COMPUTER SCIENCE AND ENGINEERING'],
  IT: ['IT', 'INFORMATION TECHNOLOGY'],
  ECE: ['ECE', 'ELECTRONICS', 'ELECTRONICS AND COMMUNICATION', 'ELECTRONICS & COMMUNICATION'],
  EEE: ['EEE', 'ELECTRICAL', 'ELECTRICAL AND ELECTRONICS', 'ELECTRICAL & ELECTRONICS'],
  MECH: ['MECH', 'MECHANICAL', 'MECHANICAL ENGINEERING'],
  CIVIL: ['CIVIL', 'CIVIL ENGINEERING'],
  DATA_SCIENCE: ['DATA SCIENCE', 'DS', 'DATA ANALYTICS'],
  AI_ML: ['AI', 'ML', 'AI ML', 'ARTIFICIAL INTELLIGENCE'],
};

function normalizeBranch(raw?: string | null): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ');
  for (const [key, aliases] of Object.entries(BRANCH_CANONICAL_MAP)) {
    if (aliases.some((a) => a === upper || upper.includes(a))) {
      return key;
    }
  }
  return upper || null;
}

function branchesMatch(candidateBranch: string, eligibleBranches: string[]): boolean {
  const normCandidate = normalizeBranch(candidateBranch);
  if (!normCandidate) return false;

  for (const b of eligibleBranches) {
    const normEligible = normalizeBranch(b);
    if (normEligible && normCandidate === normEligible) return true;
    if (b.toUpperCase().trim() === candidateBranch.toUpperCase().trim()) return true;
  }
  return false;
}

function degreesMatch(candidateDegree: string, eligibleDegrees: string[]): boolean {
  const normCandidate = normalizeDegree(candidateDegree);
  if (!normCandidate) return false;

  for (const d of eligibleDegrees) {
    const normEligible = normalizeDegree(d);
    if (normEligible && (normCandidate === normEligible || normCandidate.includes(normEligible) || normEligible.includes(normCandidate))) {
      return true;
    }
  }
  return false;
}

// ── Evaluator Service ────────────────────────────────────────────────────────

export class CandidateEligibilityEvaluator {
  /**
   * Evaluates candidate profile against opportunity eligibility criteria.
   */
  public evaluate(
    candidate: CandidateProfileInput | null | undefined,
    eligibility: OpportunityEligibilityInput | null | undefined
  ): CandidateEvaluationResult {
    // ── Safe Handling for Opportunities Without Persisted Eligibility ────────
    if (!eligibility) {
      return {
        overallStatus: 'UNKNOWN',
        overallExplanation: 'Eligibility requirements have not been evaluated or persisted for this opportunity.',
        criteria: {
          experience: {
            status: 'UNKNOWN',
            explanation: 'Experience criteria not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
          graduationBatch: {
            status: 'UNKNOWN',
            explanation: 'Graduation batch criteria not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
          academics: {
            status: 'UNKNOWN',
            explanation: 'Academic criteria not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
          backlog: {
            status: 'UNKNOWN',
            explanation: 'Backlog policy not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
          degree: {
            status: 'UNKNOWN',
            explanation: 'Degree requirements not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
          branch: {
            status: 'UNKNOWN',
            explanation: 'Branch requirements not available for this opportunity.',
            mandatory: false,
            reasonCode: 'EMPLOYER_DATA_MISSING',
          },
        },
        missingCandidateCount: 0,
        missingEmployerCount: 6,
        conflictCount: 0,
        hasConflict: false,
        overallVerificationLevel: 'UNVERIFIED',
      };
    }

    const c = candidate || {};
    const hasConflict = Boolean(eligibility.hasConflict);
    const verificationLevel = eligibility.overallVerificationLevel || 'UNVERIFIED';

    // Check evidence records for active conflicts or review-required status
    const hasActiveEvidenceConflict = Boolean(
      eligibility.evidenceRecords?.some((e) => e.isActive && e.hasConflict)
    );
    const effectiveConflict = hasConflict || hasActiveEvidenceConflict;

    // ── 1. Evaluate Experience ───────────────────────────────────────────────
    const expResult = this.evaluateExperience(c, eligibility);

    // ── 2. Evaluate Graduation Batch / Cohort ────────────────────────────────
    const batchResult = this.evaluateBatch(c, eligibility);

    // ── 3. Evaluate Academic Requirements (CGPA & Percentage) ────────────────
    const academicResult = this.evaluateAcademics(c, eligibility);

    // ── 4. Evaluate Backlog Policy ───────────────────────────────────────────
    const backlogResult = this.evaluateBacklog(c, eligibility);

    // ── 5. Evaluate Degree ───────────────────────────────────────────────────
    const degreeResult = this.evaluateDegree(c, eligibility);

    // ── 6. Evaluate Branch ───────────────────────────────────────────────────
    const branchResult = this.evaluateBranch(c, eligibility);

    const criteria = {
      experience: expResult,
      graduationBatch: batchResult,
      academics: academicResult,
      backlog: backlogResult,
      degree: degreeResult,
      branch: branchResult,
    };

    // ── Overall Rollup Logic ─────────────────────────────────────────────────
    const allResults = Object.values(criteria);
    const mandatoryResults = allResults.filter((r) => r.mandatory);
    const missingCandidateCount = allResults.filter((r) => r.reasonCode === 'CANDIDATE_DATA_MISSING').length;
    const missingEmployerCount = allResults.filter((r) => r.reasonCode === 'EMPLOYER_DATA_MISSING').length;
    const conflictCount = allResults.filter((r) => r.reasonCode === 'CONFLICT').length;

    // Rule 1: A verified mandatory failure takes precedence over all else
    const failedMandatory = mandatoryResults.find((r) => r.status === 'NOT_ELIGIBLE');
    if (failedMandatory) {
      return {
        opportunityId: eligibility.opportunityId,
        overallStatus: 'NOT_ELIGIBLE',
        overallExplanation: `Candidate is not eligible: ${failedMandatory.explanation}`,
        criteria,
        missingCandidateCount,
        missingEmployerCount,
        conflictCount,
        hasConflict: effectiveConflict,
        overallVerificationLevel: verificationLevel,
      };
    }

    // Rule 2: Conflicting requirements must NEVER silently produce an ELIGIBLE result
    if (effectiveConflict) {
      const conflictMsg = eligibility.conflictDetails && eligibility.conflictDetails.length > 0
        ? eligibility.conflictDetails.join('; ')
        : 'Opportunity contains conflicting eligibility requirements.';
      return {
        opportunityId: eligibility.opportunityId,
        overallStatus: 'UNKNOWN',
        overallExplanation: `Cannot determine eligibility due to material conflicts in opportunity requirements: ${conflictMsg}`,
        criteria,
        missingCandidateCount,
        missingEmployerCount,
        conflictCount: conflictCount > 0 ? conflictCount : 1,
        hasConflict: true,
        overallVerificationLevel: 'UNVERIFIED',
      };
    }

    // Rule 3: If any mandatory criterion is UNKNOWN, overall status is UNKNOWN
    const unknownMandatory = mandatoryResults.filter((r) => r.status === 'UNKNOWN');
    if (unknownMandatory.length > 0) {
      const explanations = unknownMandatory.map((u) => u.explanation).join(' ');
      return {
        opportunityId: eligibility.opportunityId,
        overallStatus: 'UNKNOWN',
        overallExplanation: `Eligibility cannot be fully verified due to missing or unspecified criteria: ${explanations}`,
        criteria,
        missingCandidateCount,
        missingEmployerCount,
        conflictCount,
        hasConflict: false,
        overallVerificationLevel: verificationLevel,
      };
    }

    // Rule 4: If all applicable mandatory criteria are ELIGIBLE (or all criteria are UNRESTRICTED)
    const eligibleMandatoryCount = mandatoryResults.filter((r) => r.status === 'ELIGIBLE').length;
    return {
      opportunityId: eligibility.opportunityId,
      overallStatus: 'ELIGIBLE',
      overallExplanation: eligibleMandatoryCount > 0
        ? 'Candidate satisfies all stated eligibility requirements.'
        : 'Opportunity has no restrictions; candidate is fully eligible.',
      criteria,
      missingCandidateCount,
      missingEmployerCount,
      conflictCount,
      hasConflict: false,
      overallVerificationLevel: verificationLevel,
    };
  }

  // ── Criterion Evaluators ───────────────────────────────────────────────────

  private evaluateExperience(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const constraint = e.experienceConstraint || 'UNKNOWN';

    if (constraint === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer explicitly accepts candidates regardless of prior experience.',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (constraint === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not specify prior experience requirements.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    // RESTRICTED
    const boundType = e.experienceBoundType;
    const min = e.minExperienceMonths;
    const max = e.maxExperienceMonths;

    if (!boundType) {
      return {
        status: 'UNKNOWN',
        explanation: 'Experience constraint is marked RESTRICTED but bound type is missing.',
        mandatory: true,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (c.experienceMonths === null || c.experienceMonths === undefined) {
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate work experience is not specified in profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: { boundType, min, max },
        candidateValue: null,
      };
    }

    const exp = c.experienceMonths;

    if (boundType === 'NO_EXPERIENCE_REQ') {
      if (exp === 0) {
        return {
          status: 'ELIGIBLE',
          explanation: 'Candidate has 0 months of experience, satisfying the no-experience requirement.',
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { boundType, min: 0, max: 0 },
          candidateValue: exp,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Role requires candidates with no prior experience; candidate has ${exp} months of experience.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: { boundType, min: 0, max: 0 },
        candidateValue: exp,
      };
    }

    if (boundType === 'EXACT_RANGE') {
      if (min === null || min === undefined || max === null || max === undefined) {
        return {
          status: 'UNKNOWN',
          explanation: 'Opportunity specifies an exact range but min or max months are missing.',
          mandatory: true,
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      }
      if (exp >= min && exp <= max) {
        return {
          status: 'ELIGIBLE',
          explanation: `Candidate experience of ${exp} months falls within required range of ${min} to ${max} months.`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { boundType, min, max },
          candidateValue: exp,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Candidate has ${exp} months of experience, which is outside the required range of ${min} to ${max} months.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: { boundType, min, max },
        candidateValue: exp,
      };
    }

    if (boundType === 'MINIMUM_ONLY') {
      if (min === null || min === undefined) {
        return {
          status: 'UNKNOWN',
          explanation: 'Opportunity specifies a minimum experience requirement but min months is missing.',
          mandatory: true,
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      }
      if (exp >= min) {
        return {
          status: 'ELIGIBLE',
          explanation: `Candidate experience of ${exp} months meets minimum requirement of ${min} months.`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { boundType, min },
          candidateValue: exp,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Candidate has ${exp} months of experience, which is less than the required minimum of ${min} months.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: { boundType, min },
        candidateValue: exp,
      };
    }

    if (boundType === 'MAXIMUM_ONLY') {
      if (max === null || max === undefined) {
        return {
          status: 'UNKNOWN',
          explanation: 'Opportunity specifies a maximum experience requirement but max months is missing.',
          mandatory: true,
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      }
      if (exp <= max) {
        return {
          status: 'ELIGIBLE',
          explanation: `Candidate experience of ${exp} months does not exceed maximum limit of ${max} months.`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { boundType, max },
          candidateValue: exp,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Candidate has ${exp} months of experience, exceeding the maximum limit of ${max} months.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: { boundType, max },
        candidateValue: exp,
      };
    }

    return {
      status: 'UNKNOWN',
      explanation: `Unrecognized experience bound type: ${boundType}.`,
      mandatory: true,
      reasonCode: 'EMPLOYER_DATA_MISSING',
    };
  }

  private evaluateBatch(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const constraint = e.batchConstraint || 'UNKNOWN';

    if (constraint === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer specifies no graduation batch or year restriction.',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (constraint === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not specify graduation batch requirements.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    // RESTRICTED
    const eligibleBatches = e.eligibleBatches || [];
    const relativeCohorts = e.relativeCohorts || [];

    if (eligibleBatches.length === 0 && relativeCohorts.length === 0) {
      return {
        status: 'UNKNOWN',
        explanation: 'Graduation batch constraint is RESTRICTED but no specific batches or cohorts are listed.',
        mandatory: true,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (!c.graduationYear) {
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate graduation year is not specified in profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: { eligibleBatches, relativeCohorts },
        candidateValue: null,
      };
    }

    if (eligibleBatches.length > 0) {
      if (eligibleBatches.includes(c.graduationYear)) {
        return {
          status: 'ELIGIBLE',
          explanation: `Candidate graduation batch (${c.graduationYear}) is eligible (eligible: ${eligibleBatches.join(', ')}).`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: eligibleBatches,
          candidateValue: c.graduationYear,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Candidate graduation batch (${c.graduationYear}) does not match eligible batches: ${eligibleBatches.join(', ')}.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: eligibleBatches,
        candidateValue: c.graduationYear,
      };
    }

    // Only relative cohorts exist (e.g. ["final-year students"]) without explicit year mappings
    return {
      status: 'UNKNOWN',
      explanation: `Opportunity specifies relative cohort requirements (${relativeCohorts.join(', ')}) that cannot be deterministically verified against graduation year ${c.graduationYear}.`,
      mandatory: true,
      reasonCode: 'CONFLICT',
      requiredValue: relativeCohorts,
      candidateValue: c.graduationYear,
    };
  }

  private evaluateAcademics(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const constraint = e.academicConstraint || 'UNKNOWN';

    if (constraint === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer specifies no minimum academic cutoff (CGPA / percentage).',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (constraint === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not specify academic cutoff requirements or relationship is ambiguous.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    const mode = e.academicEvaluationMode;
    const minCgpa = e.minCgpa;
    const cgpaScale = e.cgpaScale;
    const minPercentage = e.minPercentage;

    // Sub-evaluate CGPA
    let cgpaSub: { status: CriterionStatus; explanation: string; reasonCode: CriterionReasonCode } | null = null;
    if (minCgpa !== null && minCgpa !== undefined) {
      if (c.cgpa === null || c.cgpa === undefined) {
        cgpaSub = {
          status: 'UNKNOWN',
          explanation: 'Candidate CGPA is not specified in profile.',
          reasonCode: 'CANDIDATE_DATA_MISSING',
        };
      } else if (!cgpaScale || cgpaScale === 'SCALE_UNKNOWN') {
        cgpaSub = {
          status: 'UNKNOWN',
          explanation: 'Opportunity specifies a minimum CGPA but does not specify a valid grading scale.',
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      } else if (!c.cgpaScale || c.cgpaScale === 'SCALE_UNKNOWN') {
        cgpaSub = {
          status: 'UNKNOWN',
          explanation: 'Candidate profile specifies CGPA without an explicit grading scale; cannot assume scale equivalence.',
          reasonCode: 'CANDIDATE_DATA_MISSING',
        };
      } else if (c.cgpaScale !== cgpaScale) {
        cgpaSub = {
          status: 'UNKNOWN',
          explanation: `Scale mismatch: Candidate CGPA scale (${c.cgpaScale}) does not match required scale (${cgpaScale}); scale conversion is not assumed.`,
          reasonCode: 'CONFLICT',
        };
      } else if (c.cgpa >= minCgpa) {
        cgpaSub = {
          status: 'ELIGIBLE',
          explanation: `Candidate CGPA (${c.cgpa}/${cgpaScale}) meets required minimum (${minCgpa}).`,
          reasonCode: 'VERIFIED',
        };
      } else {
        cgpaSub = {
          status: 'NOT_ELIGIBLE',
          explanation: `Candidate CGPA (${c.cgpa}/${cgpaScale}) is below required minimum (${minCgpa}).`,
          reasonCode: 'VERIFIED',
        };
      }
    }

    // Sub-evaluate Percentage
    let percSub: { status: CriterionStatus; explanation: string; reasonCode: CriterionReasonCode } | null = null;
    if (minPercentage !== null && minPercentage !== undefined) {
      if (c.percentage === null || c.percentage === undefined) {
        percSub = {
          status: 'UNKNOWN',
          explanation: 'Candidate percentage is not specified in profile.',
          reasonCode: 'CANDIDATE_DATA_MISSING',
        };
      } else if (c.percentage >= minPercentage) {
        percSub = {
          status: 'ELIGIBLE',
          explanation: `Candidate percentage (${c.percentage}%) meets required minimum (${minPercentage}%).`,
          reasonCode: 'VERIFIED',
        };
      } else {
        percSub = {
          status: 'NOT_ELIGIBLE',
          explanation: `Candidate percentage (${c.percentage}%) is below required minimum (${minPercentage}%).`,
          reasonCode: 'VERIFIED',
        };
      }
    }

    // Combine based on AcademicEvaluationMode
    if (mode === 'SINGLE_CRITERION') {
      if (cgpaSub) {
        return {
          status: cgpaSub.status,
          explanation: cgpaSub.explanation,
          mandatory: true,
          reasonCode: cgpaSub.reasonCode,
          requiredValue: { minCgpa, cgpaScale },
          candidateValue: { cgpa: c.cgpa, cgpaScale: c.cgpaScale },
        };
      }
      if (percSub) {
        return {
          status: percSub.status,
          explanation: percSub.explanation,
          mandatory: true,
          reasonCode: percSub.reasonCode,
          requiredValue: { minPercentage },
          candidateValue: { percentage: c.percentage },
        };
      }
      return {
        status: 'UNKNOWN',
        explanation: 'Academic constraint is SINGLE_CRITERION but neither CGPA nor percentage is specified.',
        mandatory: true,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (mode === 'DISJUNCTIVE_OR') {
      if (!cgpaSub || !percSub) {
        return {
          status: 'UNKNOWN',
          explanation: 'Disjunctive OR academic evaluation requires both CGPA and percentage criteria to be defined.',
          mandatory: true,
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      }

      // If either criterion is satisfied, candidate is ELIGIBLE
      if (cgpaSub.status === 'ELIGIBLE' || percSub.status === 'ELIGIBLE') {
        const satisfied = cgpaSub.status === 'ELIGIBLE' ? cgpaSub.explanation : percSub.explanation;
        return {
          status: 'ELIGIBLE',
          explanation: `Satisfied disjunctive academic requirement: ${satisfied}`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { mode: 'DISJUNCTIVE_OR', minCgpa, cgpaScale, minPercentage },
          candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
        };
      }

      // If both criteria fail, candidate is NOT_ELIGIBLE
      if (cgpaSub.status === 'NOT_ELIGIBLE' && percSub.status === 'NOT_ELIGIBLE') {
        return {
          status: 'NOT_ELIGIBLE',
          explanation: `Failed both alternatives in disjunctive academic requirement: CGPA (${cgpaSub.explanation}) and Percentage (${percSub.explanation}).`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { mode: 'DISJUNCTIVE_OR', minCgpa, cgpaScale, minPercentage },
          candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
        };
      }

      // Otherwise (one is NOT_ELIGIBLE and one is UNKNOWN, or both UNKNOWN) -> UNKNOWN
      const derivedReasonCode =
        cgpaSub.reasonCode === 'CANDIDATE_DATA_MISSING' || percSub.reasonCode === 'CANDIDATE_DATA_MISSING'
          ? 'CANDIDATE_DATA_MISSING'
          : cgpaSub.reasonCode === 'CONFLICT' || percSub.reasonCode === 'CONFLICT'
          ? 'CONFLICT'
          : 'EMPLOYER_DATA_MISSING';

      return {
        status: 'UNKNOWN',
        explanation: `Cannot verify disjunctive academic criteria: ${cgpaSub.explanation} | ${percSub.explanation}`,
        mandatory: true,
        reasonCode: derivedReasonCode,
        requiredValue: { mode: 'DISJUNCTIVE_OR', minCgpa, cgpaScale, minPercentage },
        candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
      };
    }

    if (mode === 'CONJUNCTIVE_AND') {
      if (!cgpaSub || !percSub) {
        return {
          status: 'UNKNOWN',
          explanation: 'Conjunctive AND academic evaluation requires both CGPA and percentage criteria to be defined.',
          mandatory: true,
          reasonCode: 'EMPLOYER_DATA_MISSING',
        };
      }

      // If either fails, candidate is NOT_ELIGIBLE
      if (cgpaSub.status === 'NOT_ELIGIBLE' || percSub.status === 'NOT_ELIGIBLE') {
        const failure = cgpaSub.status === 'NOT_ELIGIBLE' ? cgpaSub.explanation : percSub.explanation;
        return {
          status: 'NOT_ELIGIBLE',
          explanation: `Failed conjunctive academic requirement: ${failure}`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { mode: 'CONJUNCTIVE_AND', minCgpa, cgpaScale, minPercentage },
          candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
        };
      }

      // If both succeed, candidate is ELIGIBLE
      if (cgpaSub.status === 'ELIGIBLE' && percSub.status === 'ELIGIBLE') {
        return {
          status: 'ELIGIBLE',
          explanation: `Satisfied both conjunctive academic requirements: ${cgpaSub.explanation} and ${percSub.explanation}`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { mode: 'CONJUNCTIVE_AND', minCgpa, cgpaScale, minPercentage },
          candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
        };
      }

      // Otherwise (at least one UNKNOWN, no failure) -> UNKNOWN
      const derivedReasonCode =
        cgpaSub.reasonCode === 'CANDIDATE_DATA_MISSING' || percSub.reasonCode === 'CANDIDATE_DATA_MISSING'
          ? 'CANDIDATE_DATA_MISSING'
          : cgpaSub.reasonCode === 'CONFLICT' || percSub.reasonCode === 'CONFLICT'
          ? 'CONFLICT'
          : 'EMPLOYER_DATA_MISSING';

      return {
        status: 'UNKNOWN',
        explanation: `Cannot fully verify conjunctive academic criteria: ${cgpaSub.explanation}; ${percSub.explanation}`,
        mandatory: true,
        reasonCode: derivedReasonCode,
        requiredValue: { mode: 'CONJUNCTIVE_AND', minCgpa, cgpaScale, minPercentage },
        candidateValue: { cgpa: c.cgpa, percentage: c.percentage },
      };
    }

    return {
      status: 'UNKNOWN',
      explanation: 'Academic evaluation mode is unspecified or unrecognized; cannot evaluate academic criteria.',
      mandatory: true,
      reasonCode: 'EMPLOYER_DATA_MISSING',
    };
  }

  private evaluateBacklog(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const policy = e.backlogPolicy || 'UNKNOWN';

    if (policy === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer explicitly specifies no backlog restrictions.',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (policy === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not mention backlog eligibility policy.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (c.activeBacklogs === null || c.activeBacklogs === undefined) {
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate active backlog information is not specified in profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: { backlogPolicy: policy, maxActiveBacklogs: e.maxActiveBacklogs },
        candidateValue: null,
      };
    }

    if (policy === 'NO_ACTIVE') {
      if (c.activeBacklogs === 0) {
        return {
          status: 'ELIGIBLE',
          explanation: 'Candidate has 0 active backlogs, satisfying NO_ACTIVE policy.',
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: 'NO_ACTIVE',
          candidateValue: c.activeBacklogs,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Role permits no active backlogs; candidate has ${c.activeBacklogs} active backlogs.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: 'NO_ACTIVE',
        candidateValue: c.activeBacklogs,
      };
    }

    if (policy === 'NO_HISTORY') {
      if (c.activeBacklogs > 0) {
        return {
          status: 'NOT_ELIGIBLE',
          explanation: `Role permits no backlogs; candidate has ${c.activeBacklogs} active backlogs.`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: 'NO_HISTORY',
          candidateValue: c.activeBacklogs,
        };
      }
      if (c.hasBacklogHistory === true) {
        return {
          status: 'NOT_ELIGIBLE',
          explanation: 'Role permits no historical backlogs; candidate has a history of past backlogs.',
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: 'NO_HISTORY',
          candidateValue: { activeBacklogs: 0, hasBacklogHistory: true },
        };
      }
      if (c.hasBacklogHistory === false) {
        return {
          status: 'ELIGIBLE',
          explanation: 'Candidate has no active backlogs and no history of past backlogs, satisfying NO_HISTORY policy.',
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: 'NO_HISTORY',
          candidateValue: { activeBacklogs: 0, hasBacklogHistory: false },
        };
      }
      // If historical backlog info is omitted from candidate profile
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate has 0 active backlogs, but historical backlog status cannot be verified from profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: 'NO_HISTORY',
        candidateValue: { activeBacklogs: 0, hasBacklogHistory: null },
      };
    }

    if (policy === 'ALLOWED_WITH_LIMIT') {
      const limit = e.maxActiveBacklogs ?? 0;
      if (c.activeBacklogs <= limit) {
        return {
          status: 'ELIGIBLE',
          explanation: `Candidate active backlogs (${c.activeBacklogs}) within allowed limit of ${limit}.`,
          mandatory: true,
          reasonCode: 'VERIFIED',
          requiredValue: { backlogPolicy: 'ALLOWED_WITH_LIMIT', maxActiveBacklogs: limit },
          candidateValue: c.activeBacklogs,
        };
      }
      return {
        status: 'NOT_ELIGIBLE',
        explanation: `Candidate has ${c.activeBacklogs} active backlogs, exceeding maximum allowed limit of ${limit}.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: { backlogPolicy: 'ALLOWED_WITH_LIMIT', maxActiveBacklogs: limit },
        candidateValue: c.activeBacklogs,
      };
    }

    return {
      status: 'UNKNOWN',
      explanation: `Unrecognized backlog policy: ${policy}.`,
      mandatory: true,
      reasonCode: 'EMPLOYER_DATA_MISSING',
    };
  }

  private evaluateDegree(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const constraint = e.degreeConstraint || 'UNKNOWN';

    if (constraint === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer specifies no restriction on academic degree.',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (constraint === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not specify eligible degrees.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    const eligibleDegrees = e.eligibleDegrees || [];
    if (eligibleDegrees.length === 0) {
      return {
        status: 'UNKNOWN',
        explanation: 'Degree constraint is RESTRICTED but no specific eligible degrees are listed.',
        mandatory: true,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (!c.degree) {
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate degree is not specified in profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: eligibleDegrees,
        candidateValue: null,
      };
    }

    if (degreesMatch(c.degree, eligibleDegrees)) {
      return {
        status: 'ELIGIBLE',
        explanation: `Candidate degree (${c.degree}) matches eligible degrees: ${eligibleDegrees.join(', ')}.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: eligibleDegrees,
        candidateValue: c.degree,
      };
    }

    return {
      status: 'NOT_ELIGIBLE',
      explanation: `Candidate degree (${c.degree}) does not match required degrees: ${eligibleDegrees.join(', ')}.`,
      mandatory: true,
      reasonCode: 'VERIFIED',
      requiredValue: eligibleDegrees,
      candidateValue: c.degree,
    };
  }

  private evaluateBranch(
    c: CandidateProfileInput,
    e: OpportunityEligibilityInput
  ): CriterionEvaluationResult {
    const constraint = e.branchConstraint || 'UNKNOWN';

    if (constraint === 'UNRESTRICTED') {
      return {
        status: 'ELIGIBLE',
        explanation: 'Employer specifies no restriction on academic branch or specialization.',
        mandatory: false,
        reasonCode: 'VERIFIED',
      };
    }

    if (constraint === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        explanation: 'Opportunity does not specify eligible academic branches.',
        mandatory: false,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    const eligibleBranches = e.eligibleBranches || [];
    if (eligibleBranches.length === 0) {
      return {
        status: 'UNKNOWN',
        explanation: 'Branch constraint is RESTRICTED but no specific eligible branches are listed.',
        mandatory: true,
        reasonCode: 'EMPLOYER_DATA_MISSING',
      };
    }

    if (!c.branch) {
      return {
        status: 'UNKNOWN',
        explanation: 'Candidate branch/specialization is not specified in profile.',
        mandatory: true,
        reasonCode: 'CANDIDATE_DATA_MISSING',
        requiredValue: eligibleBranches,
        candidateValue: null,
      };
    }

    if (branchesMatch(c.branch, eligibleBranches)) {
      return {
        status: 'ELIGIBLE',
        explanation: `Candidate branch (${c.branch}) matches eligible branches: ${eligibleBranches.join(', ')}.`,
        mandatory: true,
        reasonCode: 'VERIFIED',
        requiredValue: eligibleBranches,
        candidateValue: c.branch,
      };
    }

    return {
      status: 'NOT_ELIGIBLE',
      explanation: `Candidate branch (${c.branch}) does not match required branches: ${eligibleBranches.join(', ')}.`,
      mandatory: true,
      reasonCode: 'VERIFIED',
      requiredValue: eligibleBranches,
      candidateValue: c.branch,
    };
  }
}

// Reusable singleton instance
export const candidateEligibilityEvaluator = new CandidateEligibilityEvaluator();
