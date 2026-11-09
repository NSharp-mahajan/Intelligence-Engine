import {
  CandidateEligibilityEvaluator,
  normalizeBranch,
  branchesMatch,
  type CandidateProfileInput,
  type OpportunityEligibilityInput,
} from './services/candidateEligibilityEvaluator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

function runMilestone2CTests() {
  console.log('\n================================================================');
  console.log('  MILESTONE 2C: BRANCH NORMALIZATION & CANDIDATE ELIGIBILITY');
  console.log('================================================================\n');

  const evaluator = new CandidateEligibilityEvaluator();

  // Baseline template for AiPrise SWE I opportunity eligibility
  const baseAiPriseEligibility: OpportunityEligibilityInput = {
    category: 'JUNIOR',
    overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
    experienceConstraint: 'RESTRICTED',
    experienceBoundType: 'EXACT_RANGE',
    minExperienceMonths: 0,
    maxExperienceMonths: 24,
    degreeConstraint: 'RESTRICTED',
    eligibleDegrees: ['BE', 'BTECH'],
    branchConstraint: 'RESTRICTED',
    eligibleBranches: ['COMPUTER_SCIENCE_IT'],
    batchConstraint: 'UNKNOWN',
    academicConstraint: 'UNKNOWN',
    backlogPolicy: 'UNKNOWN',
    hasConflict: false,
  };

  // -------------------------------------------------------------------------
  // SECTION 1: Direct Normalization & Matching Unit Tests
  // -------------------------------------------------------------------------
  console.log('--- Section 1: Normalization and Matching Functions ---');

  // Case 1: COMPUTER_SCIENCE_IT vs Computer Science
  assert(normalizeBranch('COMPUTER_SCIENCE_IT') === 'COMPUTER_SCIENCE_IT', 'normalizeBranch("COMPUTER_SCIENCE_IT") returns COMPUTER_SCIENCE_IT');
  assert(normalizeBranch('Computer Science') === 'CSE', 'normalizeBranch("Computer Science") returns CSE');
  assert(branchesMatch('Computer Science', ['COMPUTER_SCIENCE_IT']) === true, 'Computer Science matches [COMPUTER_SCIENCE_IT]');

  // Case 2: COMPUTER_SCIENCE_IT vs CSE
  assert(normalizeBranch('CSE') === 'CSE', 'normalizeBranch("CSE") returns CSE');
  assert(branchesMatch('CSE', ['COMPUTER_SCIENCE_IT']) === true, 'CSE matches [COMPUTER_SCIENCE_IT]');

  // Case 3: COMPUTER_SCIENCE_IT vs Computer Science and Engineering
  assert(normalizeBranch('Computer Science and Engineering') === 'CSE', 'normalizeBranch("Computer Science and Engineering") returns CSE');
  assert(branchesMatch('Computer Science and Engineering', ['COMPUTER_SCIENCE_IT']) === true, 'Computer Science and Engineering matches [COMPUTER_SCIENCE_IT]');

  // Case 4: INFORMATION_TECHNOLOGY vs IT
  assert(normalizeBranch('INFORMATION_TECHNOLOGY') === 'IT', 'normalizeBranch("INFORMATION_TECHNOLOGY") returns IT');
  assert(normalizeBranch('IT') === 'IT', 'normalizeBranch("IT") returns IT');
  assert(branchesMatch('IT', ['INFORMATION_TECHNOLOGY']) === true, 'IT matches [INFORMATION_TECHNOLOGY]');
  assert(branchesMatch('Information Technology', ['COMPUTER_SCIENCE_IT']) === true, 'Information Technology matches [COMPUTER_SCIENCE_IT]');
  assert(branchesMatch('INFORMATION_TECHNOLOGY', ['COMPUTER_SCIENCE_IT']) === true, 'INFORMATION_TECHNOLOGY matches [COMPUTER_SCIENCE_IT]');

  // Case 5: COMPUTER_SCIENCE_IT vs Mechanical Engineering
  assert(normalizeBranch('Mechanical Engineering') === 'MECH', 'normalizeBranch("Mechanical Engineering") returns MECH');
  assert(branchesMatch('Mechanical Engineering', ['COMPUTER_SCIENCE_IT']) === false, 'Mechanical Engineering DOES NOT match [COMPUTER_SCIENCE_IT]');
  assert(branchesMatch('Mechanical', ['COMPUTER_SCIENCE_IT']) === false, 'Mechanical DOES NOT match [COMPUTER_SCIENCE_IT]');

  // Case 6: COMPUTER_SCIENCE_IT vs Civil Engineering
  assert(normalizeBranch('Civil Engineering') === 'CIVIL', 'normalizeBranch("Civil Engineering") returns CIVIL');
  assert(branchesMatch('Civil Engineering', ['COMPUTER_SCIENCE_IT']) === false, 'Civil Engineering DOES NOT match [COMPUTER_SCIENCE_IT]');
  assert(branchesMatch('Civil', ['COMPUTER_SCIENCE_IT']) === false, 'Civil DOES NOT match [COMPUTER_SCIENCE_IT]');

  // Case 7: Null, empty and unknown branch values
  assert(normalizeBranch(null) === null, 'normalizeBranch(null) returns null');
  assert(normalizeBranch(undefined) === null, 'normalizeBranch(undefined) returns null');
  assert(normalizeBranch('') === null, 'normalizeBranch("") returns null');
  assert(normalizeBranch('   ') === null, 'normalizeBranch("   ") returns null');
  assert(normalizeBranch('---___') === null, 'normalizeBranch("---___") returns null');
  assert(branchesMatch(null as any, ['COMPUTER_SCIENCE_IT']) === false, 'null branch does not match');
  assert(branchesMatch('', ['COMPUTER_SCIENCE_IT']) === false, 'empty string branch does not match');
  assert(branchesMatch('Computer Science', []) === false, 'empty eligible branches list does not match');
  assert(branchesMatch('Computer Science', [null as any, '']) === false, 'null/empty elements in eligible list handled safely');

  // Case 8: Punctuation, dashes, underscores, and case variants
  assert(branchesMatch('cOMPuTER__science--and   engineering', ['computer_science_it']) === true, 'Mixed case, double underscores, hyphens match');
  assert(branchesMatch('computer-science-&-engineering', ['COMPUTER_SCIENCE_IT']) === true, 'Hyphens with ampersand match');
  assert(branchesMatch('information---technology', ['IT']) === true, 'Triple hyphens match');
  assert(branchesMatch('Software Engineering', ['COMPUTER_SCIENCE_IT']) === true, 'Software Engineering matches [COMPUTER_SCIENCE_IT]');

  // -------------------------------------------------------------------------
  // SECTION 2: Full Candidate Eligibility Evaluation Results
  // -------------------------------------------------------------------------
  console.log('\n--- Section 2: Complete Candidate Eligibility Evaluation Results ---');

  // Test A: Candidate with "Computer Science" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Computer Science',
      experienceMonths: 12,
      graduationYear: 2025,
      cgpa: 8.5,
      activeBacklogs: 0,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `Computer Science candidate is ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'ELIGIBLE', `Branch status is ELIGIBLE (got ${res.criteria.branch.status})`);
    assert(res.criteria.branch.reasonCode === 'VERIFIED', 'Branch reasonCode is VERIFIED');
    assert(res.criteria.degree.status === 'ELIGIBLE', 'Degree is ELIGIBLE');
    assert(res.criteria.experience.status === 'ELIGIBLE', 'Experience is ELIGIBLE');
  }

  // Test B: Candidate with "CSE" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'BTech',
      branch: 'CSE',
      experienceMonths: 6,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `CSE candidate is ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'ELIGIBLE', 'Branch status is ELIGIBLE');
  }

  // Test C: Candidate with "Computer Science and Engineering" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'Bachelor of Technology',
      branch: 'Computer Science and Engineering',
      experienceMonths: 18,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `Computer Science and Engineering candidate is ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'ELIGIBLE', 'Branch status is ELIGIBLE');
  }

  // Test D: Candidate with "Information Technology" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Information Technology',
      experienceMonths: 0,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `Information Technology candidate is ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'ELIGIBLE', 'Branch status is ELIGIBLE');
  }

  // Test E: Candidate with "IT" against employer requiring "INFORMATION_TECHNOLOGY"
  {
    const itEmployerEligibility: OpportunityEligibilityInput = {
      ...baseAiPriseEligibility,
      eligibleBranches: ['INFORMATION_TECHNOLOGY'],
    };
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'IT',
      experienceMonths: 10,
    };
    const res = evaluator.evaluate(candidate, itEmployerEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `IT candidate is ELIGIBLE for INFORMATION_TECHNOLOGY role (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'ELIGIBLE', 'Branch status is ELIGIBLE');
  }

  // Test F: Candidate with "Mechanical Engineering" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Mechanical Engineering',
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', `Mechanical Engineering candidate is NOT_ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'NOT_ELIGIBLE', 'Branch status is NOT_ELIGIBLE');
    assert(res.criteria.branch.reasonCode === 'VERIFIED', 'Branch reasonCode is VERIFIED (definite mismatch)');
  }

  // Test G: Candidate with "Civil Engineering" against AiPrise Software Engineer I
  {
    const candidate: CandidateProfileInput = {
      degree: 'B.Tech',
      branch: 'Civil Engineering',
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', `Civil Engineering candidate is NOT_ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'NOT_ELIGIBLE', 'Branch status is NOT_ELIGIBLE');
  }

  // Test H: Candidate with missing branch (null)
  {
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: null,
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'UNKNOWN', `Missing branch candidate is UNKNOWN overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'UNKNOWN', 'Branch status is UNKNOWN');
    assert(res.criteria.branch.reasonCode === 'CANDIDATE_DATA_MISSING', 'Branch reasonCode is CANDIDATE_DATA_MISSING');
  }

  // Test I: Employer with empty eligible branches list
  {
    const emptyBranchEligibility: OpportunityEligibilityInput = {
      ...baseAiPriseEligibility,
      eligibleBranches: [],
    };
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Computer Science',
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, emptyBranchEligibility);
    assert(res.overallStatus === 'UNKNOWN', `Empty employer branch list candidate is UNKNOWN overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'UNKNOWN', 'Branch status is UNKNOWN');
    assert(res.criteria.branch.reasonCode === 'EMPLOYER_DATA_MISSING', 'Branch reasonCode is EMPLOYER_DATA_MISSING');
  }

  // Test J: Employer with UNKNOWN branch constraint
  {
    const unknownBranchEligibility: OpportunityEligibilityInput = {
      ...baseAiPriseEligibility,
      branchConstraint: 'UNKNOWN',
      eligibleBranches: [],
    };
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Mechanical Engineering',
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, unknownBranchEligibility);
    assert(res.overallStatus === 'ELIGIBLE', `When branch constraint is UNKNOWN, candidate is ELIGIBLE overall (got ${res.overallStatus})`);
    assert(res.criteria.branch.status === 'UNKNOWN', 'Branch status is UNKNOWN');
    assert(res.criteria.branch.reasonCode === 'EMPLOYER_DATA_MISSING', 'Branch reasonCode is EMPLOYER_DATA_MISSING');
  }

  // Test K: Skill match does not influence eligibility
  {
    // A candidate with branch mismatch remains NOT_ELIGIBLE regardless of any hypothetical match score
    const candidate: CandidateProfileInput = {
      degree: 'B.E.',
      branch: 'Civil Engineering',
      experienceMonths: 12,
    };
    const res = evaluator.evaluate(candidate, baseAiPriseEligibility);
    assert(res.overallStatus === 'NOT_ELIGIBLE', 'Eligibility evaluator operates strictly on profile and opportunity criteria without skill match score input');
  }

  console.log('\n================================================================');
  console.log(`  MILESTONE 2C TESTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone2CTests();
