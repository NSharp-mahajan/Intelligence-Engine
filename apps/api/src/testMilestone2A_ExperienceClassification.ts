/**
 * Milestone 2A: Experience Range Classification & Regression Test Suite
 *
 * Specifically verifies all 10 cases requested in Milestone 2A Part B:
 * 1. 0–12 months -> ENTRY_LEVEL
 * 2. 0–24 months -> JUNIOR (fits within early-career ceiling, not coerced to ENTRY_LEVEL)
 * 3. 12–24 months -> JUNIOR
 * 4. 13–36 months -> JUNIOR
 * 5. 24–48 months -> NOT eligible / UNKNOWN (exceeds 36-month ceiling)
 * 6. 36+ months -> NOT_EARLY_CAREER (senior threshold)
 * 7. Unspecified experience -> UNKNOWN (not treated as zero years)
 * 8. Conflicting experience requirements -> UNKNOWN (hasConflict=true, confidence=0)
 * 9. Engineer I with explicit 0–2 years -> JUNIOR (Early-career eligible)
 * 10. Engineer I without experience evidence -> UNKNOWN (not automatically classified as early-career)
 *
 * Non-regression checks:
 * - Candidate eligibility evaluation works cleanly for JUNIOR roles with [0, 24] mo
 * - Freshers (0 exp) are evaluated as ELIGIBLE for [0, 24] mo roles
 * - Juniors (18 mo exp) are evaluated as ELIGIBLE for [0, 24] mo roles
 * - Experienced (48 mo exp) are evaluated as NOT_ELIGIBLE
 */

import { earlyCareerClassifier, OpportunityClassificationInput } from './services/earlyCareerClassifier';
import { candidateEligibilityEvaluator } from './services/candidateEligibilityEvaluator';

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

function runTests() {
  console.log('\n================================================================');
  console.log('  MILESTONE 2A: EXPERIENCE CLASSIFICATION & REGRESSION SUITE');
  console.log('================================================================\n');

  // Case 1: 0–12 months -> ENTRY_LEVEL
  console.log('--- Case 1: 0–12 months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Junior Software Engineer',
      description: 'Requirements: 0 to 12 months of software engineering experience or relevant projects.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'ENTRY_LEVEL', `0–12 months classified as ENTRY_LEVEL (got ${res.category})`);
    assert(res.minExperienceMonths === 0, `minExperienceMonths is 0 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 12, `maxExperienceMonths is 12 (got ${res.maxExperienceMonths})`);
  }

  // Case 2: 0–24 months -> JUNIOR (Early-career ceiling <= 36 months)
  console.log('\n--- Case 2: 0–24 months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Developer',
      description: 'Looking for developers with 0 to 24 months of experience in TypeScript or React.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'JUNIOR', `0–24 months classified as JUNIOR (got ${res.category})`);
    assert(res.category !== 'ENTRY_LEVEL', '0–24 months is NOT labeled ENTRY_LEVEL');
    assert(res.minExperienceMonths === 0, `minExperienceMonths is 0 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 24, `maxExperienceMonths is 24 (got ${res.maxExperienceMonths})`);
    assert(res.hasConflict === false, 'No conflict flagged for valid early-career range');
  }

  // Case 3: 12–24 months -> JUNIOR
  console.log('\n--- Case 3: 12–24 months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Backend Engineer',
      description: 'Requires 12 to 24 months of experience building APIs.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'JUNIOR', `12–24 months classified as JUNIOR (got ${res.category})`);
    assert(res.minExperienceMonths === 12, `minExperienceMonths is 12 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 24, `maxExperienceMonths is 24 (got ${res.maxExperienceMonths})`);
  }

  // Case 4: 13–36 months -> JUNIOR
  console.log('\n--- Case 4: 13–36 months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Associate Platform Engineer',
      description: 'Candidates should have 1.5 to 3 years of experience (18 to 36 months).',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'JUNIOR', `13–36 months classified as JUNIOR (got ${res.category})`);
    assert(res.minExperienceMonths === 18, `minExperienceMonths is 18 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 36, `maxExperienceMonths is 36 (got ${res.maxExperienceMonths})`);
  }

  // Case 5: 24–48 months -> NOT Early Career (exceeds 36-month ceiling)
  console.log('\n--- Case 5: 24–48 months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Full Stack Engineer',
      description: 'Requires 2 to 4 years of experience (24 to 48 months).',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(
      res.category === 'UNKNOWN' || res.category === 'NOT_EARLY_CAREER',
      `24–48 months exceeds 36-month ceiling, NOT early career (got ${res.category})`
    );
    assert(res.category !== 'ENTRY_LEVEL' && res.category !== 'JUNIOR', '24–48 months is neither ENTRY nor JUNIOR');
  }

  // Case 6: 36+ months -> NOT_EARLY_CAREER (senior threshold)
  console.log('\n--- Case 6: 36+ months ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Senior DevOps Engineer',
      description: 'Requires minimum 4+ years (48 months) of hands-on cloud experience.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'NOT_EARLY_CAREER', `36+ months classified as NOT_EARLY_CAREER (got ${res.category})`);
  }

  // Case 7: Unspecified experience -> UNKNOWN (not treated as zero years)
  console.log('\n--- Case 7: Unspecified experience ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineer',
      description: 'Join our engineering team to build scalable microservices and tools.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'UNKNOWN', `Unspecified experience classified as UNKNOWN (got ${res.category})`);
    assert(res.minExperienceMonths === null, 'minExperienceMonths is null, NOT coerced to 0');
    assert(res.maxExperienceMonths === null, 'maxExperienceMonths is null');
    assert(res.experienceBoundType === null, 'experienceBoundType is null');
  }

  // Case 8: Conflicting experience requirements -> UNKNOWN with hasConflict
  console.log('\n--- Case 8: Conflicting experience requirements ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineering Intern',
      description: 'Summer internship role. Candidate must possess 5+ years of production experience in Kubernetes.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.hasConflict === true, 'Material conflict detected between internship title and 5+ years experience');
    assert(res.category === 'UNKNOWN', `Conflict classified conservatively as UNKNOWN (got ${res.category})`);
    assert(res.confidence === 0.0, 'Confidence is 0.0 on conflict');
  }

  // Case 9: Engineer I with explicit 0–2 years (AiPrise pattern)
  console.log('\n--- Case 9: Engineer I with explicit 0–2 years ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineer I (Bangalore, India)',
      company: 'AiPrise',
      description: 'AiPrise is looking for a Software Engineer I. 0-2 years of software engineering experience or relevant academic projects.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(res.category === 'JUNIOR', `Engineer I with 0-2 years classified as JUNIOR (got ${res.category})`);
    assert(res.category !== 'ENTRY_LEVEL', 'Not labeled ENTRY_LEVEL');
    assert(res.minExperienceMonths === 0, `minExperienceMonths is 0 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 24, `maxExperienceMonths is 24 (got ${res.maxExperienceMonths})`);
    assert(res.experienceBoundType === 'EXACT_RANGE', 'Bound type is EXACT_RANGE');
    assert(
      ['INTERNSHIP', 'FRESHER', 'GRADUATE_TRAINEE', 'ENTRY_LEVEL', 'JUNIOR'].includes(res.category),
      'Qualifies for Early Opportunities feed'
    );
  }

  // Case 10: Engineer I without experience evidence -> UNKNOWN
  console.log('\n--- Case 10: Engineer I without experience evidence ---');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineer I',
      company: 'TechCorp',
      description: 'Looking for a Software Engineer I to write clean, well-tested Python backend services.',
    };
    const res = earlyCareerClassifier.classify(input);
    assert(
      res.category === 'UNKNOWN',
      `Engineer I without experience evidence remains UNKNOWN (got ${res.category})`
    );
    assert(
      res.minExperienceMonths === null,
      'minExperienceMonths is not assumed to be zero without evidence'
    );
  }

  // Candidate Eligibility Integration Verification for [0, 24] JUNIOR role
  console.log('\n--- Candidate Eligibility Evaluation for [0, 24] Role ---');
  {
    const mockOppEligibility: any = {
      id: 'el-test-aiprise',
      category: 'JUNIOR',
      overallVerificationLevel: 'AUTOMATED_HIGH_CONFIDENCE',
      experienceBoundType: 'EXACT_RANGE',
      minExperienceMonths: 0,
      maxExperienceMonths: 24,
      experienceConstraint: 'RESTRICTED',
      batchConstraint: 'UNRESTRICTED',
      eligibleBatches: [],
      cgpaCutoff: null,
      percentageCutoff: null,
      backlogPolicy: 'NO_BACKLOG_RESTRICTION',
      eligibleDegrees: [],
      eligibleBranches: [],
      hasConflict: false,
      conflictDetails: [],
    };

    // Fresher (0 months experience)
    const fresherCandidate: any = {
      graduationYear: 2026,
      experienceMonths: 0,
    };
    const fresherEval = candidateEligibilityEvaluator.evaluate(fresherCandidate, mockOppEligibility);
    assert(fresherEval.criteria.experience.status === 'ELIGIBLE', 'Fresher with 0 months is ELIGIBLE for 0-24 mo role');

    // Junior (18 months experience)
    const juniorCandidate: any = {
      graduationYear: 2024,
      experienceMonths: 18,
    };
    const juniorEval = candidateEligibilityEvaluator.evaluate(juniorCandidate, mockOppEligibility);
    assert(juniorEval.criteria.experience.status === 'ELIGIBLE', 'Junior with 18 months is ELIGIBLE for 0-24 mo role');

    // Over-experienced (48 months experience)
    const seniorCandidate: any = {
      graduationYear: 2022,
      experienceMonths: 48,
    };
    const seniorEval = candidateEligibilityEvaluator.evaluate(seniorCandidate, mockOppEligibility);
    assert(seniorEval.criteria.experience.status === 'NOT_ELIGIBLE', 'Candidate with 48 months is NOT_ELIGIBLE');
  }

  console.log('\n================================================================');
  console.log(`  MILESTONE 2A TESTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
