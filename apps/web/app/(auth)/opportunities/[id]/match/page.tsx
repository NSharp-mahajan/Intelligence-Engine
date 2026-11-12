'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../../../lib/api';
import { Badge } from '../../../../../components/ui/Badge';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../../../components/ui/Card';
import { CompanyLogo } from '../../../../../components/CompanyLogo';
import type {
  OpportunityResponse,
  Opportunity,
  MatchResultResponse,
  OpportunityEligibilityResponse,
  ProfileResponse,
  Profile,
  ProjectsResponse,
  Project,
} from '../../../../../lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEnum(value: string | null | undefined): string {
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

function isValidHttpUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OpportunityMatchAnalysisPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const opportunityId = unwrappedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Core Data
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultResponse | null>(null);
  const [eligibility, setEligibility] = useState<OpportunityEligibilityResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        // Fetch opportunity details (publicly accessible)
        const oppRes = await fetchApi<OpportunityResponse>(`/opportunities/${opportunityId}`);
        if (cancelled) return;
        setOpportunity(oppRes.opportunity);

        // Fetch candidate-specific data in parallel
        const [matchRes, eligRes, profileRes, projectsRes] = await Promise.all([
          fetchApi<MatchResultResponse>(`/opportunities/${opportunityId}/match`).catch(() => null),
          fetchApi<OpportunityEligibilityResponse>(`/opportunities/${opportunityId}/eligibility`).catch(() => null),
          fetchApi<ProfileResponse>('/profile').catch(() => null),
          fetchApi<ProjectsResponse>('/profile/projects').catch(() => null),
        ]);

        if (cancelled) return;

        if (!matchRes && !profileRes) {
          // Unauthenticated or no profile
          setIsAnonymous(true);
        } else {
          setMatchResult(matchRes);
          setEligibility(eligRes);
          if (profileRes?.profile) setProfile(profileRes.profile);
          if (projectsRes?.projects) setProjects(projectsRes.projects);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load opportunity analysis.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  // ─── Loading View ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Running semantic match & eligibility analysis…</span>
      </div>
    );
  }

  // ─── Error View ─────────────────────────────────────────────────────────────
  if (error || !opportunity) {
    return (
      <div style={styles.pageContainer}>
        <Link href={`/opportunities/${opportunityId}`} style={styles.backLink}>
          ← Back to Opportunity
        </Link>
        <div style={styles.errorAlert}>
          <strong>Analysis Unavailable:</strong> {error || 'Opportunity could not be found.'}
        </div>
      </div>
    );
  }

  // ─── Anonymous Guest View ───────────────────────────────────────────────────
  if (isAnonymous) {
    return (
      <div style={styles.pageContainer} className="animate-fade-in">
        <Link href={`/opportunities/${opportunityId}`} style={styles.backLink}>
          ← Back to Opportunity Details
        </Link>
        <div style={styles.guestHero}>
          <div style={styles.guestIconCircle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
              <path d="M20 21v-2a7 7 0 0 0-14 0v2" />
            </svg>
          </div>
          <h1 style={styles.guestTitle}>Sign in to view Candidate Match Analysis</h1>
          <p style={styles.guestSubtitle}>
            See personalized skill alignment, project evidence validation, and verified early-career eligibility for{' '}
            <strong>{opportunity.title}</strong> at <strong>{opportunity.organization}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="primary" onClick={() => router.push('/login')}>
              Sign In to Your Workspace
            </Button>
            <Button variant="outline" onClick={() => router.push(`/opportunities/${opportunityId}`)}>
              View Job Description
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Derived Calculations ───────────────────────────────────────────────────

  const score = matchResult?.score ?? null;
  const hasStructuredRequirements = matchResult?.hasStructuredRequirements ?? false;

  const requiredMatched = matchResult?.requiredMatched || [];
  const requiredMissing = matchResult?.requiredMissing || [];
  const preferredMatched = matchResult?.preferredMatched || [];
  const preferredMissing = matchResult?.preferredMissing || [];

  const totalRequired = requiredMatched.length + requiredMissing.length;
  const totalPreferred = preferredMatched.length + preferredMissing.length;
  const totalSkillsEvaluated = totalRequired + totalPreferred;
  const totalMatchedCount = requiredMatched.length + preferredMatched.length;

  const evidenceMap = matchResult?.evidence || {};

  // Find all candidate projects that provided evidence for matched skills
  const projectContributions = new Map<string, string[]>(); // projectName -> matched skill names
  for (const skill of [...requiredMatched, ...preferredMatched]) {
    const evList = evidenceMap[skill.skillId] || [];
    for (const ev of evList) {
      if (ev.projectName) {
        const existing = projectContributions.get(ev.projectName) || [];
        if (!existing.includes(skill.skillName)) existing.push(skill.skillName);
        projectContributions.set(ev.projectName, existing);
      }
    }
  }

  // Count skills with project-backed evidence
  const projectBackedMatchedSkills = [...requiredMatched, ...preferredMatched].filter((s) => {
    const evList = evidenceMap[s.skillId] || [];
    return evList.some((e) => Boolean(e.projectName));
  });

  // Eligibility Status Details
  const overallEligibility = eligibility?.overallStatus || 'UNKNOWN';
  const criteriaList = eligibility?.criteria
    ? [
        { key: 'graduationBatch', label: 'Graduation Batch', detail: eligibility.criteria.graduationBatch },
        { key: 'experience', label: 'Experience Level', detail: eligibility.criteria.experience },
        { key: 'degree', label: 'Degree Requirements', detail: eligibility.criteria.degree },
        { key: 'branch', label: 'Branch / Discipline', detail: eligibility.criteria.branch },
        { key: 'academics', label: 'Academic Standing (CGPA/%)', detail: eligibility.criteria.academics },
      ]
    : [];

  const hasApplicationUrl = isValidHttpUrl(opportunity.applicationUrl);

  return (
    <div style={styles.pageContainer} className="animate-fade-in">

      {/* ─── Breadcrumb Navigation & Top Action Bar ─────────────────────────── */}
      <div style={styles.topBar}>
        <div style={styles.breadcrumbGroup}>
          <Link href={`/opportunities/${opportunityId}`} style={styles.backLink}>
            ← Back to Opportunity
          </Link>
          <span style={styles.sep}>/</span>
          <span style={styles.breadcrumbActive}>Match Analysis</span>
        </div>

        <div style={styles.topActionGroup}>
          {hasApplicationUrl && (
            <a
              href={opportunity.applicationUrl!}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.applyButtonLink}
            >
              Apply on Company Site ↗
            </a>
          )}
        </div>
      </div>

      {/* ─── Page Heading Strip ────────────────────────────────────────────── */}
      <div style={styles.headingStrip}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.analysisTag}>Candidate Match Analysis</span>
            {opportunity.type && <Badge variant="neutral">{fmtEnum(opportunity.type)}</Badge>}
            {opportunity.workMode && <Badge variant="neutral">{fmtEnum(opportunity.workMode)}</Badge>}
          </div>
          <h1 style={styles.pageTitle}>{opportunity.title}</h1>
          <p style={styles.pageSubtitle}>
            Detailed evaluation comparing your profile skills and project evidence against verified employer requirements.
          </p>
        </div>
      </div>

      {/* ─── Three-Column Layout ───────────────────────────────────────────── */}
      <div style={styles.threeColumnGrid}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: Opportunity & Candidate Context                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={styles.column}>

          {/* 1. Opportunity Snapshot Card */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <div style={styles.oppHeaderIdentity}>
                <CompanyLogo
                  organization={opportunity.organization}
                  logoUrl={opportunity.companyLogoUrl}
                  size={46}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.oppOrg}>{opportunity.organization}</div>
                  <div style={styles.oppLocation}>
                    {opportunity.location || 'Location Not Specified'}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              <div style={styles.metaTable}>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>Experience Level</span>
                  <span style={styles.metaVal}>{fmtEnum(opportunity.experienceLevel || 'Entry Level')}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>Work Mode</span>
                  <span style={styles.metaVal}>{fmtEnum(opportunity.workMode)}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>Source</span>
                  <span style={styles.metaVal}>via {formatSourceName(opportunity.source)}</span>
                </div>
                {opportunity.postedDate && (
                  <div style={{ ...styles.metaRow, borderBottom: 'none' }}>
                    <span style={styles.metaKey}>Posted Date</span>
                    <span style={styles.metaVal}>{new Date(opportunity.postedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {hasApplicationUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <a
                    href={opportunity.applicationUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.applyButtonLink, display: 'block', textAlign: 'center' }}
                  >
                    Apply on Official Site ↗
                  </a>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 2. Employer Job Requirements */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <h2 style={styles.cardSectionTitle}>Job Requirements</h2>
              <span style={styles.cardSectionSub}>Structured criteria from listing</span>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              {/* Required Skills */}
              <div style={styles.requirementGroup}>
                <span style={styles.requirementGroupLabel}>Required Technical Skills:</span>
                {requiredMatched.length + requiredMissing.length === 0 ? (
                  <span style={styles.subtleText}>No mandatory technical skills extracted.</span>
                ) : (
                  <div style={styles.chipsWrap}>
                    {[...requiredMatched, ...requiredMissing].map((s) => (
                      <span key={s.skillId} style={styles.reqChip}>
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Skills */}
              {totalPreferred > 0 && (
                <div style={styles.requirementGroup}>
                  <span style={styles.requirementGroupLabel}>Preferred / Bonus Skills:</span>
                  <div style={styles.chipsWrap}>
                    {[...preferredMatched, ...preferredMissing].map((s) => (
                      <span key={s.skillId} style={{ ...styles.reqChip, borderColor: '#e5e5e5', backgroundColor: '#f4f4f5' }}>
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education & Experience Criteria from Persisted Eligibility */}
              <div style={styles.requirementGroup}>
                <span style={styles.requirementGroupLabel}>Academic & Batch Criteria:</span>
                <div style={styles.criteriaMiniList}>
                  {criteriaList.map(({ key, label, detail }) => (
                    <div key={key} style={styles.criteriaMiniRow}>
                      <span style={styles.criteriaMiniKey}>{label}</span>
                      <span style={styles.criteriaMiniVal}>{detail.reason || fmtEnum(detail.status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 3. Candidate Snapshot */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.cardSectionTitle}>Your Candidate Profile</h2>
                <Link href="/profile" style={styles.inlineEditLink}>
                  Edit Profile →
                </Link>
              </div>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              <div style={styles.candidateSnapshot}>
                <div style={styles.candidateAvatar}>
                  {(profile?.fullName || 'Candidate').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.candidateName}>{profile?.fullName || 'Candidate'}</div>
                  <div style={styles.candidateRole}>{profile?.targetRole || 'Engineering Candidate'}</div>
                </div>
              </div>

              <div style={styles.metaTable}>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>Target Class</span>
                  <span style={styles.metaVal}>
                    {profile?.graduationYear ? `Class of ${profile.graduationYear}` : 'Not specified'}
                  </span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>University</span>
                  <span style={styles.metaVal}>{profile?.university || 'Not specified'}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>Degree & Branch</span>
                  <span style={styles.metaVal}>
                    {profile?.degree || '—'} {profile?.branch ? `(${profile.branch})` : ''}
                  </span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaKey}>CGPA / Percentage</span>
                  <span style={styles.metaVal}>
                    {profile?.cgpa ? `${profile.cgpa} / 10.0` : profile?.percentage ? `${profile.percentage}%` : 'Not specified'}
                  </span>
                </div>
                <div style={{ ...styles.metaRow, borderBottom: 'none' }}>
                  <span style={styles.metaKey}>Projects in Portfolio</span>
                  <span style={styles.metaVal}>{projects.length} project(s)</span>
                </div>
              </div>
            </CardBody>
          </Card>

        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CENTER COLUMN: Match Analysis & Requirement Comparison              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={styles.columnCenter}>

          {/* 1. Match Overview Card */}
          <Card style={styles.surfaceCard}>
            <CardBody style={{ padding: '1.75rem' }}>
              <div style={styles.matchScoreHero}>
                <div style={styles.scoreCircle}>
                  <span style={styles.scoreNumber}>
                    {score !== null ? `${score}%` : '—'}
                  </span>
                  <span style={styles.scoreMetricLabel}>Skill Match</span>
                </div>

                <div style={styles.matchHeadlineBox}>
                  <h2 style={styles.matchHeadline}>
                    {score === null
                      ? 'Unstructured Requirements'
                      : score === 100
                      ? 'Exceptional Skill Alignment'
                      : score >= 75
                      ? 'Strong Skill Alignment'
                      : score >= 50
                      ? 'Moderate Skill Match'
                      : 'Significant Skill Gap'}
                  </h2>
                  <p style={styles.matchExplainer}>
                    {hasStructuredRequirements
                      ? `Evaluated against ${totalSkillsEvaluated} structured technical requirements. Direct candidate skills and supporting project evidence were matched.`
                      : 'This opportunity does not have structured technical requirement chips; matching cannot be accurately calculated.'}
                  </p>

                  <div style={styles.scoreBreakdownBar}>
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownNum}>{requiredMatched.length} / {totalRequired}</span>
                      <span style={styles.breakdownText}>Required Skills</span>
                    </div>
                    <div style={styles.breakdownDivider} />
                    <div style={styles.breakdownItem}>
                      <span style={styles.breakdownNum}>{preferredMatched.length} / {Math.max(1, totalPreferred)}</span>
                      <span style={styles.breakdownText}>Preferred Skills</span>
                    </div>
                    <div style={styles.breakdownDivider} />
                    <div style={styles.breakdownItem}>
                      <span style={{ ...styles.breakdownNum, color: '#15803d' }}>
                        {projectBackedMatchedSkills.length}
                      </span>
                      <span style={styles.breakdownText}>Project-Backed</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 2. Detailed Requirement Comparison List */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={styles.cardSectionTitle}>Requirement Comparison</h2>
                  <span style={styles.cardSectionSub}>
                    Direct breakdown of what the employer requests vs your documented evidence
                  </span>
                </div>
                <span style={styles.countBadge}>
                  {totalMatchedCount} of {totalSkillsEvaluated} Satisfied
                </span>
              </div>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>

              {!hasStructuredRequirements ? (
                <div style={styles.emptyStateBox}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    No structured skill tags were extracted for this posting. Check the official job description on the left.
                  </p>
                </div>
              ) : (
                <div style={styles.comparisonList}>
                  {/* Required Skills Section */}
                  <div style={styles.comparisonGroupHeader}>
                    <span>MANDATORY REQUIREMENTS ({totalRequired})</span>
                  </div>

                  {requiredMatched.map((skill) => {
                    const evList = evidenceMap[skill.skillId] || [];
                    const projectNames = evList.filter((e) => e.projectName).map((e) => e.projectName);
                    const hasProjectEvidence = projectNames.length > 0;

                    return (
                      <div key={skill.skillId} style={styles.comparisonItemMatched}>
                        <div style={styles.comparisonStatusIconMatched}>✓</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.reqTitleRow}>
                            <span style={styles.reqSkillName}>{skill.skillName}</span>
                            <span style={styles.mandatoryBadge}>REQUIRED</span>
                          </div>
                          <div style={styles.evidenceDetailText}>
                            {hasProjectEvidence ? (
                              <span style={styles.backedProjectText}>
                                Demonstrated in project: <strong>{projectNames.join(', ')}</strong>
                              </span>
                            ) : (
                              <span style={styles.inventoryOnlyText}>
                                Documented in technical skills inventory (no project attached yet)
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={styles.matchPillVerified}>
                          {hasProjectEvidence ? 'Project Verified' : 'Documented'}
                        </div>
                      </div>
                    );
                  })}

                  {requiredMissing.map((skill) => (
                    <div key={skill.skillId} style={styles.comparisonItemMissing}>
                      <div style={styles.comparisonStatusIconMissing}>✕</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.reqTitleRow}>
                          <span style={styles.reqSkillName}>{skill.skillName}</span>
                          <span style={styles.mandatoryBadge}>REQUIRED</span>
                        </div>
                        <div style={styles.missingDetailText}>
                          Missing from your candidate profile and project portfolio.
                        </div>
                      </div>
                      <div style={styles.matchPillMissing}>Not Found</div>
                    </div>
                  ))}

                  {/* Preferred Skills Section */}
                  {totalPreferred > 0 && (
                    <>
                      <div style={{ ...styles.comparisonGroupHeader, marginTop: '1.25rem' }}>
                        <span>PREFERRED / BONUS REQUIREMENTS ({totalPreferred})</span>
                      </div>

                      {preferredMatched.map((skill) => {
                        const evList = evidenceMap[skill.skillId] || [];
                        const projectNames = evList.filter((e) => e.projectName).map((e) => e.projectName);

                        return (
                          <div key={skill.skillId} style={styles.comparisonItemMatched}>
                            <div style={styles.comparisonStatusIconMatched}>✓</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={styles.reqTitleRow}>
                                <span style={styles.reqSkillName}>{skill.skillName}</span>
                                <span style={styles.preferredBadge}>PREFERRED</span>
                              </div>
                              <div style={styles.evidenceDetailText}>
                                {projectNames.length > 0
                                  ? `Demonstrated in: ${projectNames.join(', ')}`
                                  : 'Documented in technical skills inventory'}
                              </div>
                            </div>
                            <div style={styles.matchPillVerified}>Bonus Matched</div>
                          </div>
                        );
                      })}

                      {preferredMissing.map((skill) => (
                        <div key={skill.skillId} style={styles.comparisonItemMissing}>
                          <div style={{ ...styles.comparisonStatusIconMissing, color: 'var(--text-tertiary)', backgroundColor: '#f4f4f5' }}>
                            ○
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.reqTitleRow}>
                              <span style={styles.reqSkillName}>{skill.skillName}</span>
                              <span style={styles.preferredBadge}>PREFERRED</span>
                            </div>
                            <div style={styles.missingDetailText}>
                              Not in profile (optional bonus qualification).
                            </div>
                          </div>
                          <div style={{ ...styles.matchPillMissing, color: 'var(--text-tertiary)', borderColor: '#e5e5e5', backgroundColor: '#f4f4f5' }}>
                            Optional
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: Explanations, Eligibility & Actions                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={styles.column}>

          {/* 1. Verified Eligibility Card */}
          <Card style={{
            ...styles.surfaceCard,
            borderColor: overallEligibility === 'ELIGIBLE'
              ? 'var(--success-border)'
              : overallEligibility === 'NOT_ELIGIBLE'
              ? 'var(--error-border)'
              : '#fed7aa',
          }}>
            <CardHeader style={{
              ...styles.cardHeaderClean,
              backgroundColor: overallEligibility === 'ELIGIBLE'
                ? '#f0fdf4'
                : overallEligibility === 'NOT_ELIGIBLE'
                ? '#fef2f2'
                : '#fff7ed',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.cardSectionTitle}>Candidate Eligibility</span>
                <span style={{
                  ...styles.eligibilityVerdictPill,
                  backgroundColor: overallEligibility === 'ELIGIBLE'
                    ? '#dcfce7'
                    : overallEligibility === 'NOT_ELIGIBLE'
                    ? '#fee2e2'
                    : '#ffedd5',
                  color: overallEligibility === 'ELIGIBLE'
                    ? '#15803d'
                    : overallEligibility === 'NOT_ELIGIBLE'
                    ? '#b91c1c'
                    : '#9a3412',
                }}>
                  {overallEligibility === 'ELIGIBLE'
                    ? '✓ ELIGIBLE'
                    : overallEligibility === 'NOT_ELIGIBLE'
                    ? '✕ NOT ELIGIBLE'
                    : '⚠ UNVERIFIED'}
                </span>
              </div>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              <p style={styles.eligibilityExplanation}>
                {eligibility?.overallExplanation || 'Eligibility criteria have not been evaluated for this posting.'}
              </p>

              {/* Strict Disclaimer Notice */}
              <div style={styles.strictBoundaryNotice}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  <strong>Eligibility Invariance:</strong> High skill-match score ({score !== null ? `${score}%` : '—'}) does <em>not</em> override graduation batch, academic, or work authorization rules.
                </span>
              </div>

              {/* Criteria List */}
              <div style={styles.criteriaChecklist}>
                {criteriaList.map(({ key, label, detail }) => (
                  <div key={key} style={styles.criteriaRow}>
                    <div style={styles.criteriaMain}>
                      <span style={{
                        ...styles.criteriaDot,
                        backgroundColor: detail.status === 'ELIGIBLE'
                          ? '#16a34a'
                          : detail.status === 'NOT_ELIGIBLE'
                          ? '#dc2626'
                          : '#ea580c',
                      }} />
                      <span style={styles.criteriaLabel}>{label}</span>
                    </div>
                    <span style={styles.criteriaStatusText}>
                      {detail.status === 'ELIGIBLE'
                        ? 'Passed'
                        : detail.status === 'NOT_ELIGIBLE'
                        ? 'Failed'
                        : 'Needs Info'}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* 2. Project Evidence Contributions */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <h2 style={styles.cardSectionTitle}>Supporting Project Evidence</h2>
              <span style={styles.cardSectionSub}>Verifiable proof from your portfolio</span>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              {projectContributions.size === 0 ? (
                <div style={styles.emptyStateBox}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                    None of your current projects demonstrate the technical skills required by this role.
                  </p>
                  <Link href="/evidence" style={styles.evidenceCtaLink}>
                    + Add Project in Evidence Workspace →
                  </Link>
                </div>
              ) : (
                <div style={styles.projectContribList}>
                  {Array.from(projectContributions.entries()).map(([pName, skills]) => (
                    <div key={pName} style={styles.projectContribItem}>
                      <div style={styles.projectContribName}>{pName}</div>
                      <div style={styles.projectContribSkills}>
                        {skills.map((s) => (
                          <span key={s} style={styles.projectContribChip}>
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 3. Actionable Next Steps */}
          <Card style={styles.surfaceCard}>
            <CardHeader style={styles.cardHeaderClean}>
              <h2 style={styles.cardSectionTitle}>Actionable Recommendations</h2>
              <span style={styles.cardSectionSub}>What to improve before applying</span>
            </CardHeader>
            <CardBody style={styles.cardBodyCompact}>
              <div style={styles.nextActionsList}>
                {requiredMissing.length > 0 && (
                  <div style={styles.actionItem}>
                    <span style={styles.actionNumber}>1</span>
                    <div style={styles.actionText}>
                      <strong>Address Skill Gaps:</strong> Review missing required skills:{' '}
                      <em>{requiredMissing.map((s) => s.skillName).join(', ')}</em>. Add them to your profile if you have practical experience.
                    </div>
                  </div>
                )}

                {projectBackedMatchedSkills.length < requiredMatched.length && (
                  <div style={styles.actionItem}>
                    <span style={styles.actionNumber}>2</span>
                    <div style={styles.actionText}>
                      <strong>Attach Project Proof:</strong> You have documented skills without project attachments. Link them to real repositories in{' '}
                      <Link href="/evidence" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Skills & Projects
                      </Link>.
                    </div>
                  </div>
                )}

                {overallEligibility === 'UNKNOWN' && (
                  <div style={styles.actionItem}>
                    <span style={styles.actionNumber}>3</span>
                    <div style={styles.actionText}>
                      <strong>Complete Academic Profile:</strong> Enter your CGPA, graduation batch, and branch in{' '}
                      <Link href="/profile" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Profile Settings
                      </Link>{' '}
                      to unlock automated eligibility verification.
                    </div>
                  </div>
                )}

                <div style={styles.actionItem}>
                  <span style={styles.actionNumber}>4</span>
                  <div style={styles.actionText}>
                    <strong>Review Official Job Post:</strong> Ensure your resume explicitly highlights the verified keywords before submitting.
                  </div>
                </div>
              </div>

              {hasApplicationUrl && (
                <div style={{ marginTop: '1.25rem' }}>
                  <a
                    href={opportunity.applicationUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.applyButtonLink, display: 'block', textAlign: 'center' }}
                  >
                    Proceed to Application ↗
                  </a>
                </div>
              )}
            </CardBody>
          </Card>

        </div>

      </div>
    </div>
  );
}

// ─── Design System & Styling ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    maxWidth: '1320px',
    margin: '0 auto',
    width: '100%',
    paddingBottom: '3rem',
  },

  // Loading & Error
  loadingContainer: {
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.875rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    borderWidth: '2.5px',
    borderStyle: 'solid',
    borderColor: '#e5e5e5',
    borderTopColor: 'var(--accent-primary)',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--error-border)',
    fontSize: '0.9375rem',
  },

  // Anonymous Hero
  guestHero: {
    backgroundColor: 'var(--bg-surface)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '3.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '1rem',
    boxShadow: 'var(--shadow-sm)',
  },
  guestIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: '#ffedd5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  guestTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  guestSubtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    maxWidth: '560px',
    lineHeight: 1.55,
    margin: 0,
  },

  // Top Bar
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  breadcrumbGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  backLink: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
    textDecoration: 'none',
  },
  sep: {
    color: 'var(--text-tertiary)',
  },
  breadcrumbActive: {
    color: 'var(--text-primary)',
    fontWeight: 650,
  },
  topActionGroup: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  applyButtonLink: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '0.875rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background-color 150ms ease',
  },

  // Heading Strip
  headingStrip: {
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '1.25rem',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
  },
  analysisTag: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#ea580c',
    backgroundColor: '#ffedd5',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  pageTitle: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
    margin: '0 0 0.375rem 0',
  },
  pageSubtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.5,
  },

  // Three Column Layout
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.4fr) minmax(280px, 1fr)',
    gap: '1.5rem',
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  columnCenter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },

  // Shared Surface Cards
  surfaceCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  cardHeaderClean: {
    padding: '1.125rem 1.25rem',
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: 'var(--bg-surface)',
  },
  cardBodyCompact: {
    padding: '1.25rem',
  },
  cardSectionTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  cardSectionSub: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    marginTop: '0.125rem',
    display: 'block',
  },
  countBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    backgroundColor: '#f4f4f5',
    color: 'var(--text-secondary)',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
  },

  // Left Column: Opportunity & Candidate Info
  oppHeaderIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  oppOrg: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  oppLocation: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    marginTop: '0.125rem',
  },
  metaTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 0',
    borderBottom: '1px solid var(--border-light)',
    gap: '0.5rem',
  },
  metaKey: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  metaVal: {
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    fontWeight: 600,
    textAlign: 'right',
  },
  requirementGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  requirementGroupLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  chipsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  reqChip: {
    display: 'inline-flex',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
  },
  subtleText: {
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  criteriaMiniList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  criteriaMiniRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    padding: '0.25rem 0',
    borderBottom: '1px dotted var(--border-light)',
  },
  criteriaMiniKey: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  criteriaMiniVal: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    textAlign: 'right',
  },

  // Candidate Snapshot
  candidateSnapshot: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingBottom: '0.875rem',
    borderBottom: '1px solid var(--border-light)',
  },
  candidateAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: '#121212',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
  },
  candidateName: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  candidateRole: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  inlineEditLink: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
  },

  // Center Column: Match Score Hero
  matchScoreHero: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  scoreCircle: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#ffedd5',
    border: '3px solid #ea580c',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#9a3412',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  scoreMetricLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#c2410c',
    letterSpacing: '0.04em',
    marginTop: '2px',
  },
  matchHeadlineBox: {
    flex: 1,
    minWidth: '220px',
  },
  matchHeadline: {
    fontSize: '1.25rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: '0 0 0.25rem 0',
  },
  matchExplainer: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0 0 1rem 0',
  },
  scoreBreakdownBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 0.875rem',
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  breakdownNum: {
    fontSize: '0.9375rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  breakdownText: {
    fontSize: '0.625rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 650,
  },
  breakdownDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--border-light)',
  },

  // Comparison List
  comparisonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  comparisonGroupHeader: {
    fontSize: '0.6875rem',
    fontWeight: 750,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  comparisonItemMatched: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 0.875rem',
    backgroundColor: '#f0fdf4',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#bbf7d0',
    borderRadius: 'var(--radius-md)',
  },
  comparisonItemMissing: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 0.875rem',
    backgroundColor: '#fef2f2',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#fecaca',
    borderRadius: 'var(--radius-md)',
  },
  comparisonStatusIconMatched: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  comparisonStatusIconMissing: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  reqTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  reqSkillName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  mandatoryBadge: {
    fontSize: '0.625rem',
    fontWeight: 700,
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: '0.125rem 0.375rem',
    borderRadius: '3px',
  },
  preferredBadge: {
    fontSize: '0.625rem',
    fontWeight: 650,
    color: 'var(--text-secondary)',
    backgroundColor: '#e4e4e7',
    padding: '0.125rem 0.375rem',
    borderRadius: '3px',
  },
  evidenceDetailText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '0.2rem',
    lineHeight: 1.4,
  },
  missingDetailText: {
    fontSize: '0.75rem',
    color: '#991b1b',
    marginTop: '0.2rem',
  },
  backedProjectText: {
    color: '#166534',
  },
  inventoryOnlyText: {
    color: 'var(--text-secondary)',
  },
  matchPillVerified: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
  },
  matchPillMissing: {
    fontSize: '0.6875rem',
    fontWeight: 650,
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
  },

  // Right Column: Eligibility Card
  eligibilityVerdictPill: {
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '0.25rem 0.625rem',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  eligibilityExplanation: {
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    margin: '0 0 0.875rem 0',
  },
  strictBoundaryNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.625rem 0.75rem',
    backgroundColor: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
    marginBottom: '1rem',
  },
  criteriaChecklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  criteriaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.375rem 0',
    borderBottom: '1px solid var(--border-light)',
  },
  criteriaMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  criteriaDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  criteriaLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  criteriaStatusText: {
    fontSize: '0.75rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
  },

  // Supporting Projects
  projectContribList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  projectContribItem: {
    backgroundColor: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 0.875rem',
  },
  projectContribName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.375rem',
  },
  projectContribSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  projectContribChip: {
    fontSize: '0.6875rem',
    fontWeight: 650,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '0.125rem 0.375rem',
    borderRadius: '3px',
  },

  // Action Items
  nextActionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
  },
  actionNumber: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffedd5',
    color: '#ea580c',
    fontSize: '0.6875rem',
    fontWeight: 750,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '1px',
  },
  actionText: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },

  emptyStateBox: {
    padding: '1.25rem 0',
    textAlign: 'center',
  },
  evidenceCtaLink: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: 650,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    marginTop: '0.5rem',
  },
};
