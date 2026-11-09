'use client';

import React, { Suspense, useEffect, useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchApi, ApiError } from '../../../../lib/api';
import { CompanyLogo } from '../../../../components/CompanyLogo';
import { Button } from '../../../../components/ui/Button';
import type {
  EarlyCareerOpportunity,
  EarlyOpportunitiesResponse,
  EarlyCareerCategory,
  CriterionStatusDetail,
} from '../../../../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtEnum(value: string): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSourceName(source: string | null | undefined): string {
  if (!source) return 'Job Board';
  const s = source.trim().toLowerCase();
  if (s === 'jobicy') return 'Jobicy';
  if (s === 'greenhouse') return 'Greenhouse';
  if (s === 'lever') return 'Lever';
  if (s === 'ashby') return 'Ashby';
  if (s === 'smartrecruiters') return 'SmartRecruiters';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatCategory(cat: EarlyCareerCategory | string): string {
  switch (cat) {
    case 'INTERNSHIP':
      return 'Internship';
    case 'FRESHER':
      return 'Fresher';
    case 'GRADUATE_TRAINEE':
      return 'Graduate Trainee';
    case 'ENTRY_LEVEL':
      return 'Entry-Level';
    case 'JUNIOR':
      return 'Junior';
    default:
      return fmtEnum(cat);
  }
}

function formatSpecialization(spec?: string | null): string {
  if (!spec) return '';
  switch (spec) {
    case 'SOFTWARE_DEVELOPMENT':
      return 'Software Dev';
    case 'DEVOPS_PLATFORM':
      return 'DevOps';
    case 'AI_ML_ENGINEERING':
      return 'AI / ML';
    case 'DATA_ENGINEERING':
      return 'Data Eng';
    case 'SECURITY_ENGINEERING':
      return 'Security';
    case 'QA_TESTING':
      return 'QA / SDET';
    default:
      return fmtEnum(spec);
  }
}

// ─── Filter Constants ────────────────────────────────────────────────────────

const GEOGRAPHIC_SCOPE_OPTIONS = [
  { label: '🇮🇳 India Roles (Default)', value: 'INDIA_ONLY' },
  { label: '🌍 Verified Visa Sponsorship', value: 'VERIFIED_SPONSORSHIP' },
  { label: '🌐 All Opportunities', value: 'ALL' },
];

const SPECIALIZATION_OPTIONS = [
  { label: 'All Specializations', value: 'ALL' },
  { label: 'Software Development', value: 'SOFTWARE_DEVELOPMENT' },
  { label: 'DevOps & Platform', value: 'DEVOPS_PLATFORM' },
  { label: 'AI & Machine Learning', value: 'AI_ML_ENGINEERING' },
  { label: 'Data Engineering', value: 'DATA_ENGINEERING' },
  { label: 'Security Engineering', value: 'SECURITY_ENGINEERING' },
  { label: 'QA & Testing', value: 'QA_TESTING' },
];

const JOB_FAMILY_OPTIONS = [
  { label: 'Software Engineering', value: 'SOFTWARE_ENGINEERING' },
  { label: 'All Job Families', value: 'ALL' },
];

const CATEGORY_OPTIONS = [
  { label: 'All Early Career', value: 'ALL' },
  { label: 'Internships', value: 'INTERNSHIP' },
  { label: 'Fresher Roles', value: 'FRESHER' },
  { label: 'Graduate Trainee', value: 'GRADUATE_TRAINEE' },
  { label: 'Entry-Level', value: 'ENTRY_LEVEL' },
  { label: 'Junior (1-3 yrs)', value: 'JUNIOR' },
];

const CITY_OPTIONS = [
  { label: 'All Locations', value: '' },
  { label: 'Bengaluru', value: 'Bengaluru' },
  { label: 'Hyderabad', value: 'Hyderabad' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Delhi-NCR', value: 'Delhi-NCR' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Chennai', value: 'Chennai' },
];

const WORK_MODE_OPTIONS = [
  { label: 'All Work Modes', value: 'ALL' },
  { label: 'Remote', value: 'REMOTE' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'Onsite', value: 'ONSITE' },
];

const BATCH_OPTIONS = [
  { label: 'All Batches', value: '' },
  { label: '2026 Batch', value: '2026' },
  { label: '2025 Batch', value: '2025' },
  { label: '2024 Batch', value: '2024' },
  { label: '2027 Batch', value: '2027' },
];

const ELIGIBILITY_OPTIONS = [
  { label: 'All Opportunities', value: 'ALL' },
  { label: 'Eligible Only', value: 'ELIGIBLE' },
  { label: 'Needs Verification', value: 'UNKNOWN' },
  { label: 'Not Eligible', value: 'NOT_ELIGIBLE' },
];

const SORT_OPTIONS = [
  { label: 'Recommended (Default)', value: 'recommended' },
  { label: 'Newest Posted', value: 'posted_desc' },
  { label: 'Oldest Posted', value: 'posted_asc' },
  { label: 'Highest Skill Match', value: 'match_desc' },
];

// ─── Opportunity Card Component ─────────────────────────────────────────────

interface OpportunityCardProps {
  opp: EarlyCareerOpportunity;
  isAuthenticated: boolean;
}

function OpportunityCard({ opp, isAuthenticated }: OpportunityCardProps) {
  const [showCriteria, setShowCriteria] = useState(false);
  const postedLabel = formatDate(opp.postedDate);

  // Category chip styling (Warm Orange accent)
  const categoryLabel = formatCategory(opp.earlyCareer?.category || opp.type);

  // Experience text extraction
  let experienceLabel = 'Experience not specified';
  if (opp.earlyCareer?.experienceBoundType === 'NO_EXPERIENCE_REQ') {
    experienceLabel = '0 yrs (Freshers eligible)';
  } else if (
    opp.earlyCareer?.maxExperienceMonths !== null &&
    opp.earlyCareer?.maxExperienceMonths !== undefined
  ) {
    if (opp.earlyCareer.maxExperienceMonths === 0) {
      experienceLabel = '0 months experience';
    } else {
      const min = opp.earlyCareer.minExperienceMonths || 0;
      experienceLabel = `${min}–${opp.earlyCareer.maxExperienceMonths} mo experience`;
    }
  } else if (opp.earlyCareer?.experienceConstraint === 'UNRESTRICTED') {
    experienceLabel = 'Open experience';
  } else if (opp.earlyCareer?.category === 'INTERNSHIP') {
    experienceLabel = 'Internship role';
  }

  // Batch text extraction
  let batchLabel = '';
  if (
    opp.earlyCareer?.batchConstraint === 'RESTRICTED' &&
    opp.earlyCareer.eligibleBatches?.length > 0
  ) {
    batchLabel = `${opp.earlyCareer.eligibleBatches.join(', ')} Batch`;
  } else if (opp.earlyCareer?.batchConstraint === 'UNRESTRICTED') {
    batchLabel = 'All batches eligible';
  }

  // Eligibility Status styling
  const eligibility = opp.eligibility;
  const isEligible = eligibility?.overallStatus === 'ELIGIBLE';
  const isNotEligible = eligibility?.overallStatus === 'NOT_ELIGIBLE';
  const isUnknownElig = eligibility?.overallStatus === 'UNKNOWN';

  // Counts & Categories for Breakdown
  const criteriaEntries = eligibility?.criteria
    ? [
        { key: 'graduationBatch', label: 'Graduation Batch', detail: eligibility.criteria.graduationBatch },
        { key: 'experience', label: 'Experience', detail: eligibility.criteria.experience },
        { key: 'academics', label: 'Academics (CGPA/%)', detail: eligibility.criteria.academics },
        { key: 'backlog', label: 'Backlog Policy', detail: eligibility.criteria.backlog },
        { key: 'degree', label: 'Degree', detail: eligibility.criteria.degree },
        { key: 'branch', label: 'Branch / Discipline', detail: eligibility.criteria.branch },
      ]
    : [];

  const candidateMissing = criteriaEntries.filter((c) => c.detail?.reasonCode === 'CANDIDATE_DATA_MISSING');
  const employerMissing = criteriaEntries.filter((c) => c.detail?.reasonCode === 'EMPLOYER_DATA_MISSING');
  const conflictItems = criteriaEntries.filter((c) => c.detail?.reasonCode === 'CONFLICT');
  const verifiedItems = criteriaEntries.filter((c) => c.detail?.reasonCode === 'VERIFIED');

  const missingCandidateCount = eligibility?.missingCandidateCount ?? candidateMissing.length;
  const missingEmployerCount = eligibility?.missingEmployerCount ?? employerMissing.length;
  const conflictCount = eligibility?.conflictCount ?? conflictItems.length;

  // Skill Match styling
  const match = opp.match;
  const hasStructuredMatch = match && match.hasStructuredRequirements && match.score !== null;

  return (
    <article style={cardStyles.root} className="early-opp-card animate-fade-in">
      {/* Top Header Row */}
      <div style={cardStyles.headerRow}>
        <div style={cardStyles.identityGroup}>
          <CompanyLogo
            organization={opp.organization}
            logoUrl={opp.companyLogoUrl}
            size={48}
          />
          <div style={cardStyles.titleBlock}>
            <div style={cardStyles.titleRow}>
              <h2 style={cardStyles.title}>
                <Link href={`/opportunities/${opp.id}`} style={cardStyles.titleLink}>
                  {opp.title}
                </Link>
              </h2>
              {/* Category Badge */}
              <span style={cardStyles.categoryBadge}>{categoryLabel}</span>
              {/* Engineering Specialization Badge */}
              {opp.specialization && (
                <span style={cardStyles.specializationBadge}>
                  {formatSpecialization(opp.specialization)}
                </span>
              )}
            </div>

            <div style={cardStyles.orgLine}>
              <span style={cardStyles.company}>{opp.organization}</span>
              {opp.location && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.location}>{opp.location}</span>
                </>
              )}
              {opp.workMode && opp.workMode !== 'UNKNOWN' && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.workMode}>{fmtEnum(opp.workMode)}</span>
                </>
              )}
              {opp.source && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  <span style={cardStyles.sourceBadge}>via {formatSourceName(opp.source)}</span>
                </>
              )}
              {opp.geographic && (
                <>
                  <span style={cardStyles.dot}>·</span>
                  {opp.geographic.geoScope === 'INDIA_DOMESTIC' ? (
                    <span style={cardStyles.indiaBadge}>🇮🇳 India Eligible</span>
                  ) : opp.geographic.geoScope === 'INTERNATIONAL_SPONSORED' ? (
                    <span style={cardStyles.sponsorshipBadge}>🌍 Visa Sponsorship</span>
                  ) : (
                    <span style={cardStyles.internationalBadge}>🌐 International</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Side Badges (Eligibility & Skill Match) */}
        <div style={cardStyles.intelligenceBlock}>
          {/* 1. Eligibility Status Badge */}
          {isAuthenticated && eligibility ? (
            <div
              style={{
                ...cardStyles.eligibilityBadge,
                backgroundColor: isEligible
                  ? 'var(--success-bg)'
                  : isNotEligible
                  ? 'var(--error-bg)'
                  : missingCandidateCount > 0
                  ? '#fffbeb'
                  : '#f8fafc',
                borderColor: isEligible
                  ? 'var(--success-border)'
                  : isNotEligible
                  ? 'var(--error-border)'
                  : missingCandidateCount > 0
                  ? '#fde68a'
                  : 'var(--border-light)',
              }}
            >
              <div style={cardStyles.badgeHeader}>
                <span
                  style={{
                    ...cardStyles.eligibilityStatusText,
                    color: isEligible
                      ? 'var(--success-text)'
                      : isNotEligible
                      ? 'var(--error-text)'
                      : missingCandidateCount > 0
                      ? '#b45309'
                      : 'var(--text-secondary)',
                  }}
                >
                  {isEligible
                    ? '✓ Eligible'
                    : isNotEligible
                    ? '✕ Not Eligible'
                    : missingCandidateCount > 0
                    ? '⚠ Profile Incomplete'
                    : conflictCount > 0
                    ? '⚠ Needs Verification'
                    : 'ℹ Open Criteria'}
                </span>
              </div>
              <p style={cardStyles.eligibilitySummaryText}>
                {isEligible
                  ? 'Meets all stated criteria'
                  : isNotEligible
                  ? (eligibility.overallExplanation.length > 90 ? eligibility.overallExplanation.slice(0, 87) + '…' : eligibility.overallExplanation)
                  : missingCandidateCount > 0
                  ? `${missingCandidateCount} profile ${missingCandidateCount === 1 ? 'item' : 'items'} needed to verify`
                  : conflictCount > 0
                  ? 'Conflicting requirements require review'
                  : `${missingEmployerCount} criteria not restricted by employer`}
              </p>
              {isUnknownElig && missingCandidateCount > 0 && (
                <div style={{ marginBottom: '0.375rem' }}>
                  <Link href="/profile" style={cardStyles.inlineProfileLink}>
                    Update profile →
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowCriteria(!showCriteria)}
                style={cardStyles.toggleCriteriaBtn}
              >
                {showCriteria ? 'Hide criteria breakdown ▲' : 'View criteria breakdown ▼'}
              </button>
            </div>
          ) : (
            <div style={cardStyles.anonymousEligBadge}>
              <span style={cardStyles.anonymousEligTitle}>Eligibility Check</span>
              <Link href="/login" style={cardStyles.signInLink}>
                Sign in to evaluate
              </Link>
            </div>
          )}

          {/* 2. Skill Match Badge */}
          {isAuthenticated && match ? (
            hasStructuredMatch ? (
              <div style={cardStyles.matchBadge}>
                <div style={cardStyles.matchBadgeTop}>
                  <span style={cardStyles.matchScore}>{match.score}% Skill Match</span>
                </div>
                <span style={cardStyles.matchStats}>
                  {match.matchedCount} matched · {match.missingCount} missing
                </span>
              </div>
            ) : (
              <div style={cardStyles.matchUnavailableBadge}>
                <span style={cardStyles.matchUnavailableTitle}>Skills not specified</span>
                <span style={cardStyles.matchUnavailableSub}>Role requirements open</span>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Criteria Breakdown Accordion (Authenticated Only) */}
      {showCriteria && eligibility && (
        <div style={cardStyles.criteriaAccordion} className="animate-fade-in">
          {/* Section 1: Complete your profile (Candidate missing info) */}
          {candidateMissing.length > 0 && (
            <div style={cardStyles.breakdownGroup}>
              <div style={cardStyles.breakdownHeaderRow}>
                <div style={cardStyles.breakdownTitleWithBadge}>
                  <span style={cardStyles.breakdownSectionTitle}>Complete Your Profile</span>
                  <span style={cardStyles.missingCountBadge}>{candidateMissing.length} needed</span>
                </div>
                <Link href="/profile" style={cardStyles.profileLinkButton}>
                  Update profile →
                </Link>
              </div>
              <p style={cardStyles.breakdownGroupDesc}>
                These requirements cannot be evaluated because your candidate profile is missing this information:
              </p>
              <div style={cardStyles.criteriaGrid}>
                {candidateMissing.map((item) => (
                  <div key={item.key} style={cardStyles.candidateMissingItem}>
                    <div style={cardStyles.itemHeader}>
                      <span style={cardStyles.itemLabel}>{item.label}</span>
                      <span style={cardStyles.candidateMissingTag}>Missing from profile</span>
                    </div>
                    <p style={cardStyles.itemExplanation}>{item.detail.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Not specified by employer (Employer missing info) */}
          {employerMissing.length > 0 && (
            <div style={cardStyles.breakdownGroup}>
              <div style={cardStyles.breakdownHeaderRow}>
                <span style={cardStyles.breakdownSectionTitle}>Not Specified by Employer</span>
                <span style={cardStyles.unrestrictedBadge}>Open / No restrictions</span>
              </div>
              <p style={cardStyles.breakdownGroupDesc}>
                The employer did not set explicit restrictions for these criteria in the job description:
              </p>
              <div style={cardStyles.criteriaGrid}>
                {employerMissing.map((item) => (
                  <div key={item.key} style={cardStyles.employerMissingItem}>
                    <div style={cardStyles.itemHeader}>
                      <span style={cardStyles.itemLabel}>{item.label}</span>
                      <span style={cardStyles.employerMissingTag}>Not restricted</span>
                    </div>
                    <p style={cardStyles.itemExplanation}>{item.detail.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Needs verification (Conflicts or ambiguous evidence) */}
          {conflictItems.length > 0 && (
            <div style={cardStyles.breakdownGroup}>
              <div style={cardStyles.breakdownHeaderRow}>
                <span style={cardStyles.breakdownSectionTitle}>Needs Verification</span>
                <span style={cardStyles.conflictBadge}>Ambiguous requirement</span>
              </div>
              <p style={cardStyles.breakdownGroupDesc}>
                These criteria contain contradictory or non-deterministic evidence that requires manual review:
              </p>
              <div style={cardStyles.criteriaGrid}>
                {conflictItems.map((item) => (
                  <div key={item.key} style={cardStyles.conflictItem}>
                    <div style={cardStyles.itemHeader}>
                      <span style={cardStyles.itemLabel}>{item.label}</span>
                      <span style={cardStyles.conflictTag}>Conflict detected</span>
                    </div>
                    <p style={cardStyles.itemExplanation}>{item.detail.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Verified Requirements (Eligible or Failed) */}
          {verifiedItems.length > 0 && (
            <div style={cardStyles.breakdownGroup}>
              <div style={cardStyles.breakdownHeaderRow}>
                <span style={cardStyles.breakdownSectionTitle}>Verified Requirements</span>
              </div>
              <div style={cardStyles.criteriaGrid}>
                {verifiedItems.map((item) => {
                  const isElig = item.detail.status === 'ELIGIBLE';
                  return (
                    <div key={item.key} style={isElig ? cardStyles.verifiedEligibleItem : cardStyles.verifiedIneligibleItem}>
                      <div style={cardStyles.itemHeader}>
                        <span style={cardStyles.itemLabel}>{item.label}</span>
                        <span style={isElig ? cardStyles.verifiedEligTag : cardStyles.verifiedIneligTag}>
                          {isElig ? '✓ Satisfied' : '✕ Not Met'}
                        </span>
                      </div>
                      <p style={cardStyles.itemExplanation}>{item.detail.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Matched & Missing Skills Row */}
      {match && hasStructuredMatch && (match.matchedSkills.length > 0 || match.missingSkills.length > 0) && (
        <div style={cardStyles.skillsRow}>
          {match.matchedSkills.slice(0, 4).map((s) => (
            <span key={s} style={cardStyles.matchedSkillChip}>
              ✓ {s}
            </span>
          ))}
          {match.missingSkills.slice(0, 3).map((s) => (
            <span key={s} style={cardStyles.missingSkillChip}>
              – {s}
            </span>
          ))}
        </div>
      )}

      {/* Requirement Pills (Experience, Batch, Degree) */}
      <div style={cardStyles.requirementPillsRow}>
        <span style={cardStyles.reqPill}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          {experienceLabel}
        </span>

        {batchLabel && (
          <span style={cardStyles.reqPill}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            {batchLabel}
          </span>
        )}

        {opp.employmentType && opp.employmentType !== 'UNKNOWN' && (
          <span style={cardStyles.metaChip}>{fmtEnum(opp.employmentType)}</span>
        )}
      </div>

      {/* Footer Row: Provenance Date & Action Buttons */}
      <div style={cardStyles.footerRow}>
        <div style={cardStyles.provenanceGroup}>
          {postedLabel && <span>Posted {postedLabel}</span>}
          {postedLabel && <span style={cardStyles.dot}>·</span>}
          <span>Verified Early Career</span>
        </div>

        <div style={cardStyles.actionsGroup}>
          <Link href={`/opportunities/${opp.id}`} style={cardStyles.detailsLink} className="opp-view-link">
            <span>View details</span>
            <span>→</span>
          </Link>

          {/* Validated Application Link: Only shown when URL is confirmed valid */}
          {opp.hasValidApplicationUrl && opp.applicationUrl && (
            <a
              href={opp.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={cardStyles.applyBtn}
              className="opp-apply-btn"
            >
              <span>Apply</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function CriteriaItem({ label, detail }: { label: string; detail?: CriterionStatusDetail }) {
  if (!detail) return null;
  const status = detail.status;
  const isElig = status === 'ELIGIBLE';
  const isNotElig = status === 'NOT_ELIGIBLE';

  const statusColor = isElig ? 'var(--success-text)' : isNotElig ? 'var(--error-text)' : '#a16207';
  const statusIcon = isElig ? '✓' : isNotElig ? '✕' : '⚠';

  return (
    <div style={cardStyles.criteriaItem}>
      <div style={cardStyles.criteriaItemHeader}>
        <span style={cardStyles.criteriaLabel}>{label}</span>
        <span style={{ ...cardStyles.criteriaStatus, color: statusColor }}>
          {statusIcon} {status.replace('_', ' ')}
        </span>
      </div>
      <p style={cardStyles.criteriaReason}>{detail.reason}</p>
    </div>
  );
}

// ─── Main Early Opportunities Feed Component ───────────────────────────────

function EarlyOpportunitiesFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Query parameter state
  const categoryParam = searchParams.get('category') || 'ALL';
  const cityParam = searchParams.get('city') || '';
  const workModeParam = searchParams.get('workMode') || 'ALL';
  const batchParam = searchParams.get('batch') || '';
  const searchParam = searchParams.get('search') || '';
  const skillParam = searchParams.get('skill') || '';
  const jobFamilyParam = searchParams.get('jobFamily') || 'SOFTWARE_ENGINEERING';
  const specializationParam = searchParams.get('specialization') || 'ALL';
  const geoScopeParam = searchParams.get('geoScope') || 'INDIA_ONLY';
  const eligibilityParam = searchParams.get('eligibility') || 'ALL';
  const sortParam = searchParams.get('sort') || 'recommended';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local filter form state
  const [searchInput, setSearchInput] = useState(searchParam);
  const [skillInput, setSkillInput] = useState(skillParam);

  // Data fetching state
  const [data, setData] = useState<EarlyOpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
    setSkillInput(skillParam);
  }, [searchParam, skillParam]);

  // URL query updater
  const updateQuery = useCallback(
    (updates: Record<string, string | number | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (
          val === null ||
          val === '' ||
          val === 'ALL' ||
          (key === 'geoScope' && val === 'INDIA_ONLY') ||
          (key === 'jobFamily' && val === 'SOFTWARE_ENGINEERING')
        ) {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${current.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  // Fetch API feed
  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (categoryParam && categoryParam !== 'ALL') query.set('category', categoryParam);
    if (cityParam) query.set('city', cityParam);
    if (workModeParam && workModeParam !== 'ALL') query.set('workMode', workModeParam);
    if (batchParam) query.set('batch', batchParam);
    if (searchParam) query.set('search', searchParam);
    if (skillParam) query.set('skill', skillParam);
    if (jobFamilyParam && jobFamilyParam !== 'ALL') query.set('jobFamily', jobFamilyParam);
    if (specializationParam && specializationParam !== 'ALL') query.set('specialization', specializationParam);
    if (geoScopeParam && geoScopeParam !== 'INDIA_ONLY') {
      query.set('geoScope', geoScopeParam);
      if (geoScopeParam === 'ALL') {
        query.set('indiaOnly', 'false');
      }
    } else {
      query.set('geoScope', 'INDIA_ONLY');
      query.set('indiaOnly', 'true');
    }
    if (eligibilityParam && eligibilityParam !== 'ALL') query.set('eligibility', eligibilityParam);
    if (sortParam && sortParam !== 'recommended') query.set('sort', sortParam);
    query.set('page', String(pageParam));
    query.set('limit', '20');

    try {
      const response = await fetchApi<EarlyOpportunitiesResponse>(
        `/opportunities/early-career?${query.toString()}`
      );
      setData(response);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401 && eligibilityParam !== 'ALL') {
          setError('Candidate authentication is required to filter by eligibility.');
        } else {
          setError(err.message || 'Unable to load early career opportunities.');
        }
      } else {
        setError(
          'Unable to connect to the early opportunities feed. Please verify your connection and refresh.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    categoryParam,
    cityParam,
    workModeParam,
    batchParam,
    searchParam,
    skillParam,
    jobFamilyParam,
    specializationParam,
    geoScopeParam,
    eligibilityParam,
    sortParam,
    pageParam,
  ]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ search: searchInput.trim(), skill: skillInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSkillInput('');
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    (categoryParam && categoryParam !== 'ALL') ||
      cityParam ||
      (workModeParam && workModeParam !== 'ALL') ||
      batchParam ||
      searchParam ||
      skillParam ||
      (jobFamilyParam !== 'SOFTWARE_ENGINEERING') ||
      (specializationParam && specializationParam !== 'ALL') ||
      (geoScopeParam && geoScopeParam !== 'INDIA_ONLY') ||
      (eligibilityParam && eligibilityParam !== 'ALL') ||
      (sortParam && sortParam !== 'recommended')
  );

  const isAuthenticated = data?.candidateContext?.isAuthenticated ?? false;
  const totalOpps = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div style={feedStyles.pageContainer}>
      {/* ─── Hero Header ─────────────────────────────────────────────────── */}
      <header style={feedStyles.hero}>
        <div style={feedStyles.heroPillRow}>
          <span style={feedStyles.heroPill}>EARLY CAREER & GRADUATE FEED</span>
        </div>
        <h1 style={feedStyles.heroTitle}>Early Career Opportunities</h1>
        <p style={feedStyles.heroSubtitle}>
          Verified internships, fresher roles, and graduate trainee positions evaluated against your
          graduation batch, academic metrics, and project evidence.
        </p>

        {/* Authentication Context Banner */}
        {!isAuthenticated && (
          <div style={feedStyles.guestBanner}>
            <div style={feedStyles.guestBannerIcon}>ℹ</div>
            <div style={feedStyles.guestBannerContent}>
              <span style={feedStyles.guestBannerTitle}>Browsing as a guest</span>
              <p style={feedStyles.guestBannerText}>
                You can explore all early career listings. To see personalized eligibility verdicts and
                skill alignment, sign in to connect your candidate profile.
              </p>
            </div>
            <Link href="/login" style={feedStyles.guestBannerAction}>
              Sign In
            </Link>
          </div>
        )}
      </header>

      {/* ─── Category Tab Navigation ──────────────────────────────────────── */}
      <nav aria-label="Early career categories" style={feedStyles.categoryNav}>
        {CATEGORY_OPTIONS.map((cat) => {
          const isActive = categoryParam === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => updateQuery({ category: cat.value, page: 1 })}
              style={{
                ...feedStyles.categoryTab,
                ...(isActive ? feedStyles.categoryTabActive : {}),
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* ─── Search & Advanced Filter Bar ─────────────────────────────────── */}
      <section style={feedStyles.filterSection} aria-label="Filters">
        <form onSubmit={handleSearchSubmit} style={feedStyles.searchForm}>
          <div style={feedStyles.searchInputWrapper}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={feedStyles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by role title, employer, or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={feedStyles.searchInput}
            />
          </div>

          <div style={feedStyles.skillInputWrapper}>
            <input
              type="text"
              placeholder="Filter by skill (e.g. React, Python)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              style={feedStyles.skillInput}
            />
          </div>

          <Button type="submit" variant="primary" style={feedStyles.searchBtn}>
            Search
          </Button>
        </form>

        {/* Filter Dropdowns Row */}
        <div style={feedStyles.controlsRow}>
          {/* Geographic Scope */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Geographic Scope</label>
            <select
              value={geoScopeParam}
              onChange={(e) => updateQuery({ geoScope: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {GEOGRAPHIC_SCOPE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Engineering Specialization */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Specialization</label>
            <select
              value={specializationParam}
              onChange={(e) => updateQuery({ specialization: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {SPECIALIZATION_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Job Family */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Job Family</label>
            <select
              value={jobFamilyParam}
              onChange={(e) => updateQuery({ jobFamily: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {JOB_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* City / Hub */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Location</label>
            <select
              value={cityParam}
              onChange={(e) => updateQuery({ city: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Work Mode</label>
            <select
              value={workModeParam}
              onChange={(e) => updateQuery({ workMode: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {WORK_MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Graduation Batch */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Graduation Batch</label>
            <select
              value={batchParam}
              onChange={(e) => updateQuery({ batch: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {BATCH_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate Eligibility (Authenticated only) */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Eligibility</label>
            <select
              value={eligibilityParam}
              disabled={!isAuthenticated}
              onChange={(e) => updateQuery({ eligibility: e.target.value, page: 1 })}
              style={{
                ...feedStyles.select,
                ...(!isAuthenticated ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
              }}
              title={!isAuthenticated ? 'Sign in to filter by eligibility' : undefined}
            >
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div style={feedStyles.selectGroup}>
            <label style={feedStyles.selectLabel}>Sort By</label>
            <select
              value={sortParam}
              onChange={(e) => updateQuery({ sort: e.target.value, page: 1 })}
              style={feedStyles.select}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={feedStyles.clearFiltersBtn}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* ─── Opportunities List Feed ───────────────────────────────────────── */}
      <main style={feedStyles.feedContent}>
        {/* Count Header */}
        {!loading && !error && data && (
          <div style={feedStyles.countBar}>
            <span style={feedStyles.countText}>
              Showing <strong>{data.opportunities.length}</strong> of <strong>{totalOpps}</strong> early career roles
            </span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={feedStyles.loadingContainer}>
            <div style={feedStyles.spinner} />
            <span style={feedStyles.loadingText}>Evaluating verified early career opportunities...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={feedStyles.errorBox}>
            <div style={feedStyles.errorTitle}>Feed Unavailable</div>
            <p style={feedStyles.errorText}>{error}</p>
            <Button variant="outline" onClick={loadOpportunities}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data?.opportunities.length === 0 && (
          <div style={feedStyles.emptyBox}>
            <div style={feedStyles.emptyIcon}>🔍</div>
            <h3 style={feedStyles.emptyTitle}>No early career roles found</h3>
            <p style={feedStyles.emptyText}>
              We couldn&apos;t find any roles matching your active criteria. Try broadening your location, batch, or category filters.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                Reset all filters
              </Button>
            )}
          </div>
        )}

        {/* Feed Cards */}
        {!loading && !error && data && data.opportunities.length > 0 && (
          <div style={feedStyles.cardList}>
            {data.opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* ─── Pagination Control ────────────────────────────────────────── */}
        {!loading && !error && data && totalPages > 1 && (
          <nav aria-label="Pagination" style={feedStyles.paginationNav}>
            <button
              type="button"
              disabled={pageParam <= 1}
              onClick={() => updateQuery({ page: pageParam - 1 })}
              style={{
                ...feedStyles.pageBtn,
                ...(pageParam <= 1 ? feedStyles.pageBtnDisabled : {}),
              }}
            >
              ← Previous
            </button>

            <span style={feedStyles.pageIndicator}>
              Page {pageParam} of {totalPages}
            </span>

            <button
              type="button"
              disabled={pageParam >= totalPages}
              onClick={() => updateQuery({ page: pageParam + 1 })}
              style={{
                ...feedStyles.pageBtn,
                ...(pageParam >= totalPages ? feedStyles.pageBtnDisabled : {}),
              }}
            >
              Next →
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}

export default function EarlyOpportunitiesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading feed...</div>}>
      <EarlyOpportunitiesFeed />
    </Suspense>
  );
}

// ─── Styles Object ──────────────────────────────────────────────────────────

const feedStyles: Record<string, React.CSSProperties> = {
  pageContainer: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  hero: {
    marginBottom: '2rem',
  },
  heroPillRow: {
    marginBottom: '0.625rem',
  },
  heroPill: {
    display: 'inline-block',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    padding: '0.25rem 0.625rem',
    borderRadius: 'var(--radius-full)',
  },
  heroTitle: {
    fontSize: '2.25rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: 'var(--text-primary)',
    marginBottom: '0.625rem',
  },
  heroSubtitle: {
    fontSize: '1.0625rem',
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
    maxWidth: '780px',
    margin: 0,
  },
  guestBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.25rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 'var(--radius-md)',
  },
  guestBannerIcon: {
    fontSize: '1.25rem',
    color: 'var(--accent-primary)',
    fontWeight: 'bold',
  },
  guestBannerContent: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#9a3412',
    display: 'block',
    marginBottom: '0.125rem',
  },
  guestBannerText: {
    fontSize: '0.8125rem',
    color: '#7c2d12',
    margin: 0,
    lineHeight: 1.4,
  },
  guestBannerAction: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  },
  categoryNav: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--border-light)',
  },
  categoryTab: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
  },
  categoryTabActive: {
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent-hover)',
    borderColor: '#fed7aa',
    fontWeight: 600,
  },
  filterSection: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '2rem',
    boxShadow: 'var(--shadow-sm)',
  },
  searchForm: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    flex: '2 1 280px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.875rem',
    color: 'var(--text-tertiary)',
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 0.875rem 0.625rem 2.25rem',
    fontSize: '0.9375rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  skillInputWrapper: {
    flex: '1 1 200px',
  },
  skillInput: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  searchBtn: {
    minWidth: '100px',
  },
  controlsRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: '1 1 140px',
  },
  selectLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-tertiary)',
  },
  select: {
    padding: '0.5rem 0.625rem',
    fontSize: '0.875rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  clearFiltersBtn: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    alignSelf: 'center',
  },
  feedContent: {
    minHeight: '300px',
  },
  countBar: {
    marginBottom: '1rem',
  },
  countText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1rem',
    gap: '1rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderWidth: '3px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
  },
  errorBox: {
    padding: '2.5rem 1.5rem',
    backgroundColor: 'var(--error-bg)',
    border: '1px solid var(--error-border)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--error-text)',
    marginBottom: '0.5rem',
  },
  errorText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '1rem',
  },
  emptyBox: {
    padding: '4rem 1.5rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    maxWidth: '480px',
    margin: '0 auto 1.5rem auto',
    lineHeight: 1.5,
  },
  paginationNav: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '2.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--border-light)',
  },
  pageBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageIndicator: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  identityGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    flex: '1 1 360px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.1875rem',
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.3,
  },
  titleLink: {
    color: 'var(--text-primary)',
    textDecoration: 'none',
  },
  categoryBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fed7aa',
  },
  specializationBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
  },
  indiaBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
  },
  sponsorshipBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#f5f3ff',
    color: '#5b21b6',
    border: '1px solid #ddd6fe',
  },
  internationalBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.15rem 0.45rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
  },
  orgLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    flexWrap: 'wrap',
  },
  company: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dot: {
    color: 'var(--text-tertiary)',
  },
  location: {
    color: 'var(--text-secondary)',
  },
  workMode: {
    color: 'var(--text-secondary)',
  },
  sourceBadge: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  intelligenceBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.5rem',
    flex: '0 1 260px',
  },
  eligibilityBadge: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  badgeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  eligibilityStatusText: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  eligibilitySummaryText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: '0 0 0.375rem 0',
    lineHeight: 1.35,
  },
  toggleCriteriaBtn: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  anonymousEligBadge: {
    padding: '0.625rem 0.875rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px dashed var(--border-light)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    width: '100%',
  },
  anonymousEligTitle: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
  },
  signInLink: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
  matchBadge: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
  },
  matchBadgeTop: {
    marginBottom: '0.125rem',
  },
  matchScore: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#c2410c',
  },
  matchStats: {
    fontSize: '0.6875rem',
    color: '#9a3412',
    display: 'block',
  },
  matchUnavailableBadge: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
  },
  matchUnavailableTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    display: 'block',
  },
  matchUnavailableSub: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    display: 'block',
  },
  criteriaAccordion: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    marginBottom: '1rem',
  },
  breakdownGroup: {
    marginBottom: '1rem',
  },
  breakdownHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  breakdownTitleWithBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  breakdownSectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-primary)',
  },
  missingCountBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.15rem 0.4rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
  },
  unrestrictedBadge: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  conflictBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.15rem 0.4rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fed7aa',
  },
  profileLinkButton: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
  },
  inlineProfileLink: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
  },
  breakdownGroupDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: '0 0 0.5rem 0',
    lineHeight: 1.4,
  },
  candidateMissingItem: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  candidateMissingTag: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#b45309',
  },
  employerMissingItem: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  employerMissingTag: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  conflictItem: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  conflictTag: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#c2410c',
  },
  verifiedEligibleItem: {
    backgroundColor: 'var(--success-bg)',
    border: '1px solid var(--success-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  verifiedIneligibleItem: {
    backgroundColor: 'var(--error-bg)',
    border: '1px solid var(--error-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  verifiedEligTag: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--success-text)',
  },
  verifiedIneligTag: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--error-text)',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  itemLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  itemExplanation: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.35,
  },
  criteriaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.75rem',
  },
  skillsRow: {
    display: 'flex',
    gap: '0.375rem',
    flexWrap: 'wrap',
    marginBottom: '0.875rem',
  },
  matchedSkillChip: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    border: '1px solid var(--success-border)',
  },
  missingSkillChip: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-tertiary)',
    border: '1px dashed var(--border-light)',
  },
  requirementPillsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  reqPill: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.25rem 0.625rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
  },
  metaChip: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    padding: '0.25rem 0.5rem',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.875rem',
    borderTop: '1px solid var(--border-light)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  provenanceGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  detailsLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    padding: '0.375rem 0.625rem',
  },
  applyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    transition: 'background-color var(--transition-fast)',
  },
};
