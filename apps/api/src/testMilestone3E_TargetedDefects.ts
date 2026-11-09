/**
 * Milestone 3E — Targeted Eligibility Defect Remediation Test Suite
 *
 * Verifies:
 * 1. Defect 1: Academic education duration is NOT extracted as professional experience
 *    - "At least 1 year of university education, or equivalent work experience." -> UNKNOWN experience
 *    - "At least 1 year of professional experience" -> min 12 months
 *    - "At least 2 years of software engineering experience" -> min 24 months
 *    - Student with 0 months experience is NOT rejected for internship
 *    - Maximum-only bounds remain intact (e.g. "no more than 18 months")
 *
 * 2. Defect 2: Ordinary English word "be" is NOT extracted as BE degree
 *    - "can be learned", "will be", "to be" -> NO degree extracted
 *    - "Bachelor of Engineering", "B.E.", "BE / B.Tech" -> correctly extracts BE
 *    - "B.Tech" -> correctly extracts BTECH
 *    - B.Tech candidate is NOT rejected for Stripe New Grad when no degree requirement is stated
 *    - Degree distinctness preserved (BTECH != BE when explicit requirement is stated)
 *
 * 3. Synthetic Candidate Scenarios
 *    - Stripe Intern (0 months exp): Not rejected
 *    - Stripe Intern (12 months exp): Not rejected
 *    - Stripe New Grad (2027 grad): ELIGIBLE
 *    - Stripe New Grad (2028 grad): NOT_ELIGIBLE (batch preserved)
 *    - Stripe New Grad (B.Tech candidate): ELIGIBLE (no false degree rejection)
 */

import assert from 'assert';
import {
  EarlyCareerClassifier,
  extractExperience,
  extractDegreesAndBranches,
} from './services/earlyCareerClassifier';
import {
  CandidateEligibilityEvaluator,
  CandidateProfileInput,
  OpportunityEligibilityInput,
} from './services/candidateEligibilityEvaluator';

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n================================================================');
console.log('  MILESTONE 3E: TARGETED ELIGIBILITY DEFECT REMEDIATION SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// SECTION 1: DEFECT 1 — ACADEMIC DURATION VS PROFESSIONAL EXPERIENCE
// -------------------------------------------------------------
console.log('--- Section 1: Defect 1 — Experience Extraction Tests ---');

it('"At least 1 year of university education" must not create a 12-month professional-experience requirement', () => {
  const text = 'At least 1 year of university education, or equivalent work experience.';
  const res = extractExperience('Software Engineer, Intern', text);
  assert.strictEqual(res.minMonths, null, `minMonths must be null (got ${res.minMonths})`);
  assert.strictEqual(res.maxMonths, null, `maxMonths must be null (got ${res.maxMonths})`);
  assert.strictEqual(res.boundType, null, `boundType must be null (got ${res.boundType})`);
  assert.strictEqual(res.constraint, 'UNKNOWN', `constraint must be UNKNOWN (got ${res.constraint})`);
});

it('Alternative academic phrasing (college, school, undergraduate study) must not create experience requirements', () => {
  const phrases = [
    'Minimum 2 years of college coursework or equivalent experience.',
    'At least 3 years of undergraduate study required.',
    'At least 1 year of education in a relevant field.',
    '1-2 years of university study.',
    'Min 1 year of school.',
  ];
  for (const phrase of phrases) {
    const res = extractExperience('Engineering Intern', phrase);
    assert.strictEqual(res.minMonths, null, `minMonths must be null for "${phrase}" (got ${res.minMonths})`);
    assert.strictEqual(res.constraint, 'UNKNOWN', `constraint must be UNKNOWN for "${phrase}" (got ${res.constraint})`);
  }
});

it('"At least 1 year of professional experience" must still create a 12-month minimum requirement', () => {
  const text = 'At least 1 year of professional experience in backend development.';
  const res = extractExperience('Junior Software Engineer', text);
  assert.strictEqual(res.minMonths, 12, `minMonths must be 12 (got ${res.minMonths})`);
  assert.strictEqual(res.maxMonths, null, `maxMonths must be null (got ${res.maxMonths})`);
  assert.strictEqual(res.boundType, 'MINIMUM_ONLY', `boundType must be MINIMUM_ONLY (got ${res.boundType})`);
  assert.strictEqual(res.constraint, 'RESTRICTED', `constraint must be RESTRICTED (got ${res.constraint})`);
});

it('"At least 2 years of software engineering experience" must still be extracted correctly as 24 months', () => {
  const text = 'At least 2 years of software engineering experience required.';
  const res = extractExperience('Software Engineer', text);
  assert.strictEqual(res.minMonths, 24, `minMonths must be 24 (got ${res.minMonths})`);
  assert.strictEqual(res.boundType, 'MINIMUM_ONLY', `boundType must be MINIMUM_ONLY (got ${res.boundType})`);
});

it('Dual text containing both academic duration and genuine professional experience extracts the genuine experience', () => {
  const text = 'At least 1 year of university education, or equivalent work experience. Also requires at least 2 years of professional software engineering experience.';
  const res = extractExperience('Software Engineer', text);
  assert.strictEqual(res.minMonths, 24, `minMonths must be 24 (got ${res.minMonths})`);
  assert.strictEqual(res.boundType, 'MINIMUM_ONLY', `boundType must be MINIMUM_ONLY`);
});

it('Existing maximum-only experience requirements remain unchanged (e.g. no more than 18 months)', () => {
  const text = 'Degree obtained by summer 2027 and no more than 18 months of non-internship professional experience.';
  const res = extractExperience('Software Engineer, New Grad', text);
  assert.strictEqual(res.maxMonths, 18, `maxMonths must be 18 (got ${res.maxMonths})`);
  assert.strictEqual(res.minMonths, null, `minMonths must be null (got ${res.minMonths})`);
  assert.strictEqual(res.boundType, 'MAXIMUM_ONLY', `boundType must be MAXIMUM_ONLY (got ${res.boundType})`);
});

// -------------------------------------------------------------
// SECTION 2: DEFECT 2 — DEGREE EXTRACTION TESTS
// -------------------------------------------------------------
console.log('\n--- Section 2: Defect 2 — Degree Extraction Tests ---');

it('Ordinary English "be" in description must not generate a BE degree requirement', () => {
  const desc = 'We believe new programming languages can be learned if the fundamentals and general knowledge are present. To be considered, candidates will be evaluated.';
  const res = extractDegreesAndBranches(desc);
  assert.deepStrictEqual(res.degrees, [], `degrees must be empty, found: ${JSON.stringify(res.degrees)}`);
  assert.strictEqual(res.degreeConstraint, 'UNKNOWN', `degreeConstraint must be UNKNOWN (got ${res.degreeConstraint})`);
});

it('Explicit "Bachelor of Engineering" must be recognized as BE', () => {
  const text = 'Candidates must hold a Bachelor of Engineering in Computer Science.';
  const res = extractDegreesAndBranches(text);
  assert.ok(res.degrees.includes('BE'), `Must extract BE (got ${JSON.stringify(res.degrees)})`);
  assert.strictEqual(res.degreeConstraint, 'RESTRICTED');
});

it('Explicit "B.E." with punctuation must be recognized as BE', () => {
  const text = 'Minimum qualification: B.E. from an accredited institution.';
  const res = extractDegreesAndBranches(text);
  assert.ok(res.degrees.includes('BE'), `Must extract BE (got ${JSON.stringify(res.degrees)})`);
  assert.strictEqual(res.degreeConstraint, 'RESTRICTED');
});

it('Explicit "BE / B.Tech" or "B.Tech/BE" must be recognized', () => {
  const text = 'Eligible degrees: BE / B.Tech in CSE or IT.';
  const res = extractDegreesAndBranches(text);
  assert.ok(res.degrees.includes('BE'), `Must extract BE (got ${JSON.stringify(res.degrees)})`);
  assert.ok(res.degrees.includes('BTECH'), `Must extract BTECH (got ${JSON.stringify(res.degrees)})`);
  assert.strictEqual(res.degreeConstraint, 'RESTRICTED');
});

it('Explicit "B.Tech" must be recognized as its own degree category', () => {
  const text = 'Requires B.Tech in Computer Science and Engineering.';
  const res = extractDegreesAndBranches(text);
  assert.deepStrictEqual(res.degrees, ['BTECH'], `Must extract only BTECH (got ${JSON.stringify(res.degrees)})`);
  assert.strictEqual(res.degreeConstraint, 'RESTRICTED');
});

it('Unrelated degree requirements (e.g. BBA) do not match engineering degree requirements', () => {
  const text = 'BBA degree required.';
  const res = extractDegreesAndBranches(text);
  assert.strictEqual(res.degrees.includes('BTECH'), false);
  assert.strictEqual(res.degrees.includes('BE'), false);
});

// -------------------------------------------------------------
// SECTION 3: CANDIDATE SCENARIOS (END-TO-END PIPELINE EVALUATION)
// -------------------------------------------------------------
console.log('\n--- Section 3: Candidate Eligibility Scenarios ---');

const evaluator = new CandidateEligibilityEvaluator();
const classifier = new EarlyCareerClassifier();

// Prepare classified Stripe Intern and New Grad objects via EarlyCareerClassifier
const stripeInternDesc = `
Experience and familiarity with programming, either through side projects or classwork.
We work mostly in Ruby, Java, Javascript, Go, and Scala.
Experience from previous internships or other multi-person projects.
At least 1 year of university education, or equivalent work experience.
Experience writing high quality pull requests.
`;
const stripeInternClassification = classifier.classify({
  title: 'Software Engineer, Intern',
  description: stripeInternDesc,
  employmentType: 'INTERNSHIP',
});

const stripeNewGradDesc = `
Degree obtained by summer 2027 and no more than 18 months of non-internship professional experience.
We believe new programming languages can be learned if the fundamentals are present.
`;
const stripeNewGradClassification = classifier.classify({
  title: 'Software Engineer, New Grad',
  description: stripeNewGradDesc,
  employmentType: 'FULL_TIME',
});

it('Stripe Intern: Category is INTERNSHIP and minExperienceMonths is null', () => {
  assert.strictEqual(stripeInternClassification.category, 'INTERNSHIP');
  assert.strictEqual(stripeInternClassification.minExperienceMonths, null);
  assert.strictEqual(stripeInternClassification.maxExperienceMonths, null);
  assert.strictEqual(stripeInternClassification.experienceConstraint, 'UNKNOWN');
});

it('Stripe Intern Scenario: Currently enrolled student with 0 professional experience is NOT rejected', () => {
  const candidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 0,
  };
  const oppEligibility: OpportunityEligibilityInput = {
    category: stripeInternClassification.category,
    experienceConstraint: stripeInternClassification.experienceConstraint,
    minExperienceMonths: stripeInternClassification.minExperienceMonths,
    maxExperienceMonths: stripeInternClassification.maxExperienceMonths,
    experienceBoundType: stripeInternClassification.experienceBoundType,
    batchConstraint: stripeInternClassification.batchConstraint,
    eligibleBatches: stripeInternClassification.eligibleBatches,
    degreeConstraint: stripeInternClassification.degreeConstraint,
    eligibleDegrees: stripeInternClassification.eligibleDegrees,
    branchConstraint: stripeInternClassification.branchConstraint,
    eligibleBranches: stripeInternClassification.eligibleBranches,
  };

  const evalRes = evaluator.evaluate(candidate, oppEligibility);
  assert.strictEqual(evalRes.criteria.experience.status, 'UNKNOWN', 'Experience status must be UNKNOWN (not restricted)');
  assert.strictEqual(evalRes.criteria.experience.mandatory, false, 'Experience must not be mandatory');
  assert.notStrictEqual(evalRes.overallStatus, 'NOT_ELIGIBLE', `Candidate must NOT be rejected due to experience (got ${evalRes.overallStatus})`);
});

it('Stripe Intern Scenario: Candidate with 12 months experience has no false rejection', () => {
  const candidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 12,
  };
  const oppEligibility: OpportunityEligibilityInput = {
    category: stripeInternClassification.category,
    experienceConstraint: stripeInternClassification.experienceConstraint,
    minExperienceMonths: stripeInternClassification.minExperienceMonths,
    maxExperienceMonths: stripeInternClassification.maxExperienceMonths,
    experienceBoundType: stripeInternClassification.experienceBoundType,
    batchConstraint: stripeInternClassification.batchConstraint,
    eligibleBatches: stripeInternClassification.eligibleBatches,
    degreeConstraint: stripeInternClassification.degreeConstraint,
    eligibleDegrees: stripeInternClassification.eligibleDegrees,
    branchConstraint: stripeInternClassification.branchConstraint,
    eligibleBranches: stripeInternClassification.eligibleBranches,
  };

  const evalRes = evaluator.evaluate(candidate, oppEligibility);
  assert.notStrictEqual(evalRes.overallStatus, 'NOT_ELIGIBLE', 'Candidate with 12 months experience must not be rejected');
});

it('Stripe New Grad: Ordinary word "be" produces NO BE degree evidence', () => {
  assert.deepStrictEqual(stripeNewGradClassification.eligibleDegrees, []);
  assert.strictEqual(stripeNewGradClassification.degreeConstraint, 'UNKNOWN');
  assert.strictEqual(stripeNewGradClassification.maxExperienceMonths, 18);
  assert.deepStrictEqual(stripeNewGradClassification.eligibleBatches, [2027]);
});

it('Stripe New Grad Scenario: B.Tech candidate is not rejected for degree mismatch', () => {
  const candidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 6,
  };
  const oppEligibility: OpportunityEligibilityInput = {
    category: stripeNewGradClassification.category,
    experienceConstraint: stripeNewGradClassification.experienceConstraint,
    minExperienceMonths: stripeNewGradClassification.minExperienceMonths,
    maxExperienceMonths: stripeNewGradClassification.maxExperienceMonths,
    experienceBoundType: stripeNewGradClassification.experienceBoundType,
    batchConstraint: stripeNewGradClassification.batchConstraint,
    eligibleBatches: stripeNewGradClassification.eligibleBatches,
    degreeConstraint: stripeNewGradClassification.degreeConstraint,
    eligibleDegrees: stripeNewGradClassification.eligibleDegrees,
    branchConstraint: stripeNewGradClassification.branchConstraint,
    eligibleBranches: stripeNewGradClassification.eligibleBranches,
  };

  const evalRes = evaluator.evaluate(candidate, oppEligibility);
  assert.strictEqual(evalRes.criteria.degree.status, 'UNKNOWN', 'Degree status must be UNKNOWN');
  assert.strictEqual(evalRes.criteria.degree.mandatory, false, 'Degree constraint must be non-mandatory');
  assert.strictEqual(evalRes.criteria.graduationBatch.status, 'ELIGIBLE', 'Batch 2027 must be ELIGIBLE');
  assert.strictEqual(evalRes.criteria.experience.status, 'ELIGIBLE', '6 months <= 18 months must be ELIGIBLE');
  assert.strictEqual(evalRes.overallStatus, 'ELIGIBLE', `B.Tech candidate must be ELIGIBLE overall (got ${evalRes.overallStatus})`);
});

it('Stripe New Grad Scenario: 2027 graduation year is ELIGIBLE', () => {
  const candidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 0,
  };
  const oppEligibility: OpportunityEligibilityInput = {
    category: stripeNewGradClassification.category,
    experienceConstraint: stripeNewGradClassification.experienceConstraint,
    minExperienceMonths: stripeNewGradClassification.minExperienceMonths,
    maxExperienceMonths: stripeNewGradClassification.maxExperienceMonths,
    experienceBoundType: stripeNewGradClassification.experienceBoundType,
    batchConstraint: stripeNewGradClassification.batchConstraint,
    eligibleBatches: stripeNewGradClassification.eligibleBatches,
    degreeConstraint: stripeNewGradClassification.degreeConstraint,
    eligibleDegrees: stripeNewGradClassification.eligibleDegrees,
  };
  const evalRes = evaluator.evaluate(candidate, oppEligibility);
  assert.strictEqual(evalRes.criteria.graduationBatch.status, 'ELIGIBLE');
  assert.strictEqual(evalRes.overallStatus, 'ELIGIBLE');
});

it('Stripe New Grad Scenario: 2028 graduation year is strictly NOT_ELIGIBLE (batch restriction preserved)', () => {
  const candidate: CandidateProfileInput = {
    graduationYear: 2028,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 0,
  };
  const oppEligibility: OpportunityEligibilityInput = {
    category: stripeNewGradClassification.category,
    experienceConstraint: stripeNewGradClassification.experienceConstraint,
    minExperienceMonths: stripeNewGradClassification.minExperienceMonths,
    maxExperienceMonths: stripeNewGradClassification.maxExperienceMonths,
    experienceBoundType: stripeNewGradClassification.experienceBoundType,
    batchConstraint: stripeNewGradClassification.batchConstraint,
    eligibleBatches: stripeNewGradClassification.eligibleBatches,
    degreeConstraint: stripeNewGradClassification.degreeConstraint,
    eligibleDegrees: stripeNewGradClassification.eligibleDegrees,
  };
  const evalRes = evaluator.evaluate(candidate, oppEligibility);
  assert.strictEqual(evalRes.criteria.graduationBatch.status, 'NOT_ELIGIBLE');
  assert.strictEqual(evalRes.overallStatus, 'NOT_ELIGIBLE');
});

it('Explicit BE requirement in job description is still extracted and enforced correctly', () => {
  const descWithExplicitBe = `
Job Title: Software Engineer
Minimum qualification: Bachelor of Engineering (B.E.) in Computer Science.
Degree obtained by summer 2027.
`;
  const classification = classifier.classify({
    title: 'Software Engineer',
    description: descWithExplicitBe,
  });
  assert.ok(classification.eligibleDegrees.includes('BE'), 'Explicit B.E. MUST be extracted');

  const btechCandidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.Tech',
    branch: 'Computer Science',
    experienceMonths: 0,
  };
  const evalBtech = evaluator.evaluate(btechCandidate, {
    category: classification.category,
    degreeConstraint: classification.degreeConstraint,
    eligibleDegrees: classification.eligibleDegrees,
  });
  // B.Tech candidate against explicit BE-only requirement is NOT_ELIGIBLE (strict taxonomy preserved)
  assert.strictEqual(evalBtech.criteria.degree.status, 'NOT_ELIGIBLE', 'Explicit BE-only requirement correctly flags B.Tech');

  const beCandidate: CandidateProfileInput = {
    graduationYear: 2027,
    degree: 'B.E.',
    branch: 'Computer Science',
    experienceMonths: 0,
  };
  const evalBe = evaluator.evaluate(beCandidate, {
    category: classification.category,
    degreeConstraint: classification.degreeConstraint,
    eligibleDegrees: classification.eligibleDegrees,
  });
  assert.strictEqual(evalBe.criteria.degree.status, 'ELIGIBLE', 'B.E. candidate against explicit BE requirement is ELIGIBLE');
});

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
