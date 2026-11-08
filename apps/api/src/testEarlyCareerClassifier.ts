/**
 * M2.2: Automated Test Suite for Early Career Classification Engine
 *
 * Verifies all 24 mandatory test cases specified in M2.1 v5.1:
 *  1. Explicit 2026 fresher role with zero experience
 *  2. Generic Software Engineer title with explicit fresher eligibility
 *  3. Explicit six-month internship
 *  4. Graduate Engineer Trainee
 *  5. Entry-level role requiring 0–12 months
 *  6. Junior role requiring 13–36 months
 *  7. Senior role requiring more than 36 months
 *  8. Broad 0–24-month requirement
 *  9. Minimum six months with no upper bound
 * 10. Maximum 12 months with no stated lower bound
 * 11. Senior title conflicting with internship description
 * 12. Internship title conflicting with three years of experience
 * 13. Graduate trainee title conflicting with ATS contract metadata
 * 14. Generic title without any eligibility information
 * 15. Explicit CGPA-only requirement
 * 16. Explicit percentage-only requirement
 * 17. Explicit academic OR requirement
 * 18. Explicit academic AND requirement
 * 19. Ambiguous academic slash requirement
 * 20. Missing evidence for a stated criterion
 * 21. Conflicting graduation batch information
 * 22. Low-confidence extraction
 * 23. No academic restrictions
 * 24. Repeated classification of identical input produces identical output
 */

import {
  EarlyCareerClassifier,
  classifyEarlyCareerOpportunity,
  type OpportunityClassificationInput,
} from './services/earlyCareerClassifier';

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

async function runTests() {
  console.log('\n================================================================');
  console.log('  M2.2: EARLY CAREER CLASSIFICATION ENGINE TEST SUITE');
  console.log('================================================================\n');

  const classifier = new EarlyCareerClassifier();

  // Test 1: Explicit 2026 fresher role with zero experience
  console.log('Test 1: Explicit 2026 fresher role with zero experience');
  {
    const input: OpportunityClassificationInput = {
      title: 'Graduate Software Engineer — Campus 2026',
      description: 'Open exclusively to 2026 batch fresh graduates. Zero prior experience required. Basic Java skills.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'FRESHER', `Category is FRESHER (got ${res.category})`);
    assert(res.confidence >= 0.85, `Confidence >= 0.85 (got ${res.confidence})`);
    assert(res.minExperienceMonths === 0 && res.maxExperienceMonths === 0, 'Experience bounds are [0, 0]');
    assert(res.experienceBoundType === 'NO_EXPERIENCE_REQ', 'Bound type is NO_EXPERIENCE_REQ');
    assert(res.eligibleBatches.includes(2026), 'Eligible batches includes 2026');
    assert(!res.hasConflict, 'No conflicts detected');
    assert(res.overallVerificationLevel === 'AUTOMATED_HIGH_CONFIDENCE', `Overall verification is AUTOMATED_HIGH_CONFIDENCE (got ${res.overallVerificationLevel})`);
  }

  // Test 2: Generic Software Engineer title with explicit fresher eligibility
  console.log('\nTest 2: Generic Software Engineer title with explicit fresher eligibility');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineer',
      description: 'Open exclusively to 2026 batch fresh graduates. Zero prior experience required. Looking for enthusiastic college hires.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'FRESHER', `Category is FRESHER (got ${res.category})`);
    assert(res.eligibleBatches.includes(2026), 'Eligible batches includes 2026');
    assert(res.minExperienceMonths === 0 && res.maxExperienceMonths === 0, 'Experience is [0, 0]');
    assert(res.evidenceRecords.some((e) => e.criterion === 'ROLE_CATEGORY'), 'Contains ROLE_CATEGORY evidence');
    assert(res.evidenceRecords.some((e) => e.criterion === 'GRADUATION_BATCH'), 'Contains GRADUATION_BATCH evidence');
    assert(res.evidenceRecords.some((e) => e.criterion === 'EXPERIENCE_MONTHS'), 'Contains EXPERIENCE_MONTHS evidence');
    assert(res.overallVerificationLevel === 'AUTOMATED_HIGH_CONFIDENCE', `Rollup verification is AUTOMATED_HIGH_CONFIDENCE (got ${res.overallVerificationLevel})`);
  }

  // Test 3: Explicit six-month internship
  console.log('\nTest 3: Explicit six-month internship');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineering Intern',
      description: '6-month full-time internship for engineering students. You will work on real-world cloud applications.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'INTERNSHIP', `Category is INTERNSHIP (got ${res.category})`);
    assert(res.confidence >= 0.95, `Confidence >= 0.95 (got ${res.confidence})`);
    assert(!res.hasConflict, 'No conflict in pure internship');
    assert(res.overallVerificationLevel === 'AUTOMATED_HIGH_CONFIDENCE', 'Rollup is AUTOMATED_HIGH_CONFIDENCE');
  }

  // Test 4: Graduate Engineer Trainee (GET)
  console.log('\nTest 4: Graduate Engineer Trainee (GET)');
  {
    const input: OpportunityClassificationInput = {
      title: 'Graduate Engineer Trainee (GET) - Embedded Systems',
      description: 'Candidates will undergo 12 months classroom and on-the-job technical training with full benefits.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'GRADUATE_TRAINEE', `Category is GRADUATE_TRAINEE (got ${res.category})`);
    assert(res.confidence >= 0.90, `Confidence >= 0.90 (got ${res.confidence})`);
    assert(!res.hasConflict, 'No conflict for GET');
    assert(res.overallVerificationLevel === 'AUTOMATED_HIGH_CONFIDENCE', 'Rollup is AUTOMATED_HIGH_CONFIDENCE');
  }

  // Test 5: Entry-level role requiring 0–12 months
  console.log('\nTest 5: Entry-level role requiring 0–12 months');
  {
    const input: OpportunityClassificationInput = {
      title: 'Associate QA Engineer',
      description: 'Requirements: 0 to 12 months experience or demonstrated testing projects. Immediate joiners preferred.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'ENTRY_LEVEL', `Category is ENTRY_LEVEL (got ${res.category})`);
    assert(res.minExperienceMonths === 0, `minExperienceMonths is 0 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 12, `maxExperienceMonths is 12 (got ${res.maxExperienceMonths})`);
    assert(res.experienceBoundType === 'EXACT_RANGE', `experienceBoundType is EXACT_RANGE (got ${res.experienceBoundType})`);
    assert(!res.hasConflict, 'No conflict');
    assert(res.overallVerificationLevel === 'AUTOMATED_HIGH_CONFIDENCE', 'Rollup is AUTOMATED_HIGH_CONFIDENCE');
  }

  // Test 6: Junior role requiring 13–36 months
  console.log('\nTest 6: Junior role requiring 13–36 months (e.g. 1.5 to 3 years)');
  {
    const input: OpportunityClassificationInput = {
      title: 'SDE 1 - Backend',
      description: 'Requires 1.5 to 3 years experience in production Go or Java development.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'JUNIOR', `Category is JUNIOR (got ${res.category})`);
    assert(res.minExperienceMonths === 18, `minExperienceMonths is 18 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 36, `maxExperienceMonths is 36 (got ${res.maxExperienceMonths})`);
    assert(res.experienceBoundType === 'EXACT_RANGE', 'Bound type is EXACT_RANGE');
    assert(res.confidence >= 0.90, `Confidence >= 0.90 (got ${res.confidence})`);
  }

  // Test 7: Senior role requiring more than 36 months
  console.log('\nTest 7: Senior role requiring more than 36 months');
  {
    const input: OpportunityClassificationInput = {
      title: 'Senior Software Engineer',
      description: 'Minimum 5+ years of production experience in Kubernetes, distributed consensus, and microservices.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'NOT_EARLY_CAREER', `Category is NOT_EARLY_CAREER (got ${res.category})`);
    assert(res.confidence >= 0.95, `Confidence >= 0.95 (got ${res.confidence})`);
    assert(res.minExperienceMonths === 60, `minExperienceMonths is 60 (got ${res.minExperienceMonths})`);
    assert(res.experienceBoundType === 'MINIMUM_ONLY', 'Bound type is MINIMUM_ONLY');
  }

  // Test 8: Broad 0–24-month requirement (Milestone 2A: classified as JUNIOR to fit early-career ceiling)
  console.log('\nTest 8: Broad 0–24-month requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Technical Operations Specialist',
      description: 'Requires 0 to 24 months experience. Freshers and candidates with early experience welcome.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'JUNIOR', `Category is JUNIOR due to early-career ceiling (got ${res.category})`);
    assert(res.minExperienceMonths === 0, `minExperienceMonths is 0 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === 24, `maxExperienceMonths is 24 (got ${res.maxExperienceMonths})`);
    assert(res.explanation.includes('span entry and junior tiers within early-career ceiling'), 'Explanation describes multi-tier early career span');
  }

  // Test 9: Minimum six months with no upper bound
  console.log('\nTest 9: Minimum six months with no upper bound');
  {
    const input: OpportunityClassificationInput = {
      title: 'Backend Engineer',
      description: 'Minimum 6 months experience in Node.js and SQL databases.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN due to unbounded upper bound (got ${res.category})`);
    assert(res.minExperienceMonths === 6, `minExperienceMonths is 6 (got ${res.minExperienceMonths})`);
    assert(res.maxExperienceMonths === null, 'maxExperienceMonths is null');
    assert(res.experienceBoundType === 'MINIMUM_ONLY', 'Bound type is MINIMUM_ONLY');
  }

  // Test 10: Maximum 12 months with no stated lower bound
  console.log('\nTest 10: Maximum 12 months with no stated lower bound');
  {
    const input: OpportunityClassificationInput = {
      title: 'Customer Support Associate',
      description: 'Qualifications: Up to 1 year experience in technical support or customer success.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'ENTRY_LEVEL', `Category is ENTRY_LEVEL (got ${res.category})`);
    assert(res.minExperienceMonths === null, 'minExperienceMonths is null');
    assert(res.maxExperienceMonths === 12, `maxExperienceMonths is 12 (got ${res.maxExperienceMonths})`);
    assert(res.experienceBoundType === 'MAXIMUM_ONLY', 'Bound type is MAXIMUM_ONLY');
  }

  // Test 11: Senior title conflicting with internship description
  console.log('\nTest 11: Senior title conflicting with internship description');
  {
    const input: OpportunityClassificationInput = {
      title: 'Senior Software Engineer',
      description: 'This is a 6-month full-time internship for students currently enrolled in college.',
    };
    const res = classifier.classify(input);
    assert(res.hasConflict === true, 'Conflict detected');
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN on material conflict (got ${res.category})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `Overall verification is UNVERIFIED (got ${res.overallVerificationLevel})`);
    assert(res.evidenceRecords.filter((e) => e.hasConflict).length >= 2, 'Preserved both conflicting evidence records');
  }

  // Test 12: Internship title conflicting with three years of experience
  console.log('\nTest 12: Internship title conflicting with three years of experience');
  {
    const input: OpportunityClassificationInput = {
      title: 'Machine Learning Intern',
      description: 'Requires minimum 3 to 5 years experience in machine learning pipelines and deep learning frameworks.',
    };
    const res = classifier.classify(input);
    assert(res.hasConflict === true, 'Conflict detected');
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN on material conflict (got ${res.category})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `Overall verification is UNVERIFIED (got ${res.overallVerificationLevel})`);
    assert(res.conflictDetails.some((d) => d.includes('internship') && d.includes('36 months')), 'Conflict details document the contradiction');
  }

  // Test 13: Graduate trainee title conflicting with ATS contract metadata
  console.log('\nTest 13: Graduate trainee title conflicting with ATS contract metadata');
  {
    const input: OpportunityClassificationInput = {
      title: 'Graduate Engineer Trainee (GET)',
      description: 'Join our trainee cohort. Real projects and cross-functional rotations.',
      metadata: {
        employmentType: 'CONTRACT',
        minExperienceMonths: 24,
      },
    };
    const res = classifier.classify(input);
    assert(res.hasConflict === true, 'Conflict detected');
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN on metadata conflict (got ${res.category})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `Overall verification is UNVERIFIED (got ${res.overallVerificationLevel})`);
    assert(res.conflictDetails.some((d) => d.includes('metadata specifies contract')), 'Conflict details mention contract metadata');
  }

  // Test 14: Generic title without any eligibility information
  console.log('\nTest 14: Generic title without any eligibility information');
  {
    const input: OpportunityClassificationInput = {
      title: 'Developer',
      description: 'Looking for a self-motivated developer skilled in React, Tailwind, and Supabase. Contact us with your portfolio.',
    };
    const res = classifier.classify(input);
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN (got ${res.category})`);
    assert(res.confidence <= 0.30, `Confidence is low <= 0.30 (got ${res.confidence})`);
    assert(res.experienceConstraint === 'UNKNOWN', 'Experience constraint is UNKNOWN');
    assert(res.batchConstraint === 'UNKNOWN', 'Batch constraint is UNKNOWN');
    assert(res.overallVerificationLevel === 'UNVERIFIED', 'Verification rollup is UNVERIFIED');
  }

  // Test 15: Explicit CGPA-only requirement
  console.log('\nTest 15: Explicit CGPA-only requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Associate Software Engineer',
      description: 'Candidates must possess at least 7.5 CGPA in engineering. 0 to 12 months experience.',
    };
    const res = classifier.classify(input);
    assert(res.minCgpa === 7.5, `minCgpa is 7.5 (got ${res.minCgpa})`);
    assert(res.cgpaScale === 'SCALE_UNKNOWN', `cgpaScale is SCALE_UNKNOWN (got ${res.cgpaScale})`);
    assert(res.minPercentage === null, 'minPercentage is null');
    assert(res.academicEvaluationMode === 'SINGLE_CRITERION', `Mode is SINGLE_CRITERION (got ${res.academicEvaluationMode})`);
  }

  // Test 16: Explicit percentage-only requirement
  console.log('\nTest 16: Explicit percentage-only requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Associate Software Engineer',
      description: 'Candidates must possess at least 65% aggregate in graduation. 0 to 12 months experience.',
    };
    const res = classifier.classify(input);
    assert(res.minPercentage === 65.0, `minPercentage is 65.0 (got ${res.minPercentage})`);
    assert(res.minCgpa === null, 'minCgpa is null');
    assert(res.cgpaScale === null, 'cgpaScale is null');
    assert(res.academicEvaluationMode === 'SINGLE_CRITERION', `Mode is SINGLE_CRITERION (got ${res.academicEvaluationMode})`);
  }

  // Test 17: Explicit academic OR requirement
  console.log('\nTest 17: Explicit academic OR requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Graduate Engineer Trainee',
      description: 'Eligibility: Minimum 60% aggregate OR 6.5 CGPA in B.Tech/B.E.',
    };
    const res = classifier.classify(input);
    assert(res.minPercentage === 60.0, `minPercentage is 60.0 (got ${res.minPercentage})`);
    assert(res.minCgpa === 6.5, `minCgpa is 6.5 (got ${res.minCgpa})`);
    assert(res.academicEvaluationMode === 'DISJUNCTIVE_OR', `Mode is DISJUNCTIVE_OR (got ${res.academicEvaluationMode})`);
  }

  // Test 18: Explicit academic AND requirement
  console.log('\nTest 18: Explicit academic AND requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Campus Analyst',
      description: 'Eligibility: Minimum 70% in Class 12th AND 7.5 CGPA in B.Tech.',
    };
    const res = classifier.classify(input);
    assert(res.minPercentage === 70.0, `minPercentage is 70.0 (got ${res.minPercentage})`);
    assert(res.minCgpa === 7.5, `minCgpa is 7.5 (got ${res.minCgpa})`);
    assert(res.academicEvaluationMode === 'CONJUNCTIVE_AND', `Mode is CONJUNCTIVE_AND (got ${res.academicEvaluationMode})`);
  }

  // Test 19: Ambiguous academic slash requirement
  console.log('\nTest 19: Ambiguous academic slash requirement');
  {
    const input: OpportunityClassificationInput = {
      title: 'Junior QA',
      description: 'Eligibility criteria: 60% / 6.5 CGPA. Apply now.',
    };
    const res = classifier.classify(input);
    assert(res.minPercentage === 60.0, `minPercentage extracted (got ${res.minPercentage})`);
    assert(res.minCgpa === 6.5, `minCgpa extracted (got ${res.minCgpa})`);
    assert(res.academicEvaluationMode === null, `academicEvaluationMode is null for ambiguous slash (got ${res.academicEvaluationMode})`);
    assert(res.academicConstraint === 'UNKNOWN', `academicConstraint is UNKNOWN for ambiguous slash (got ${res.academicConstraint})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `overallVerificationLevel is UNVERIFIED (got ${res.overallVerificationLevel})`);
  }

  // Test 20: Missing evidence for a stated criterion
  console.log('\nTest 20: Missing evidence for a stated criterion');
  {
    const input: OpportunityClassificationInput = {
      title: 'Software Engineer',
      description: 'Degree requirement: B.Tech. Graduation batch cutoff applies. Open to freshers with 0 to 0 years experience.',
    };
    const res = classifier.classify(input);
    assert(res.batchConstraint === 'UNKNOWN', `Batch constraint is UNKNOWN due to missing specific years (got ${res.batchConstraint})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `Overall verification is UNVERIFIED when stated criterion is missing specifics (got ${res.overallVerificationLevel})`);
    assert(res.conflictDetails.some((d) => d.includes('batch requirement exists, but specific eligible years are unstated')), 'Conflict details document the missing batch specifics');
  }

  // Test 21: Conflicting graduation batch information
  console.log('\nTest 21: Conflicting graduation batch information');
  {
    const input: OpportunityClassificationInput = {
      title: 'Campus Hiring Drive 2025',
      description: 'Welcome students. This event is open strictly for 2026 batch passouts.',
    };
    const res = classifier.classify(input);
    assert(res.hasConflict === true, 'Conflict detected between title batch (2025) and body batch (2026)');
    assert(res.category === 'UNKNOWN', `Category is UNKNOWN (got ${res.category})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', 'Verification is UNVERIFIED');
  }

  // Test 22: Low-confidence extraction
  console.log('\nTest 22: Low-confidence extraction');
  {
    const input: OpportunityClassificationInput = {
      title: 'Frontend Helper',
      description: 'Could be good for someone starting out in web development.',
    };
    const res = classifier.classify(input);
    assert(res.confidence < 0.50, `Confidence is low < 0.50 (got ${res.confidence})`);
    assert(res.overallVerificationLevel === 'UNVERIFIED', `Overall verification is UNVERIFIED (got ${res.overallVerificationLevel})`);
  }

  // Test 23: No academic restrictions
  console.log('\nTest 23: No academic restrictions');
  {
    const input: OpportunityClassificationInput = {
      title: 'Junior Web Developer',
      description: 'No degree or percentage criteria. Open to all backgrounds with 0 to 12 months experience.',
    };
    const res = classifier.classify(input);
    assert(res.academicConstraint === 'UNRESTRICTED', `Academic constraint is UNRESTRICTED (got ${res.academicConstraint})`);
    assert(res.minCgpa === null, 'minCgpa is null');
    assert(res.minPercentage === null, 'minPercentage is null');
    assert(res.backlogPolicy === 'UNRESTRICTED', `backlogPolicy is UNRESTRICTED (got ${res.backlogPolicy})`);
  }

  // Test 24: Repeated classification of identical input produces identical output (Determinism)
  console.log('\nTest 24: Repeated classification of identical input produces identical output');
  {
    const input: OpportunityClassificationInput = {
      title: 'Graduate Engineer Trainee (GET)',
      description: 'Eligibility: B.Tech Computer Science 2026 batch with min 7.0 CGPA and no active backlogs. 0 experience.',
    };
    const firstResult = JSON.stringify(classifier.classify(input));
    let allIdentical = true;
    for (let i = 0; i < 10; i++) {
      const subsequentResult = JSON.stringify(classifier.classify(input));
      if (firstResult !== subsequentResult) {
        allIdentical = false;
        break;
      }
    }
    assert(allIdentical === true, 'Classifier executed 10 consecutive times produced 100% byte-identical JSON output');
  }

  console.log('\n================================================================');
  console.log(`  Test Suite Completed: ${passed} passed, ${failed} failed.`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
