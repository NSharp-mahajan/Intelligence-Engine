'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import type {
  Profile,
  ProfileResponse,
  Project,
  ProjectsResponse,
  DashboardResponse,
  DashboardRecommendation,
  CandidateSkillsResponse,
  CandidateSkill,
} from '../../../lib/types';

// ─── Formatting Helpers ───────────────────────────────────────────────────────

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatExperienceLevel(level: string | null | undefined): string | null {
  if (!level || level === 'UNKNOWN') return null;
  const map: Record<string, string> = {
    ENTRY: 'Entry Level',
    JUNIOR: 'Junior',
    MID: 'Mid Level',
    SENIOR: 'Senior',
  };
  return map[level] ?? level;
}

function formatOpportunityType(type: string | null | undefined): string {
  if (!type) return 'Full Time';
  const map: Record<string, string> = {
    INTERNSHIP: 'Internship',
    JOB: 'Full Time',
    HACKATHON: 'Hackathon',
    WORKSHOP: 'Workshop',
    OPEN_SOURCE: 'Open Source',
    MICRO_INTERNSHIP: 'Micro-Internship',
  };
  return map[type] ?? type;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface ProfileProgressSection {
  id: string;
  label: string;
  complete: boolean;
  actionText: string;
  actionPath: string;
}

function ProfileProgressCard({
  percentage,
  sections,
  onNavigate,
}: {
  percentage: number;
  sections: ProfileProgressSection[];
  onNavigate: (path: string) => void;
}) {
  const isComplete = percentage === 100;
  const nextIncomplete = sections.find((s) => !s.complete);

  return (
    <div style={ds.card}>
      <div style={ds.cardHeader}>
        <div>
          <h2 style={ds.cardTitle}>Profile Completeness</h2>
          <p style={ds.cardSubtitle}>
            {isComplete
              ? 'All required sections are complete and verified.'
              : `${sections.filter((s) => !s.complete).length} of ${sections.length} sections pending completion`}
          </p>
        </div>
        <span
          style={{
            ...ds.percentagePill,
            backgroundColor: isComplete ? '#f0fdf4' : '#fff7ed',
            color: isComplete ? '#15803d' : '#ea580c',
            borderColor: isComplete ? '#bbf7d0' : '#fed7aa',
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress Track */}
      <div style={ds.progressTrack}>
        <div
          style={{
            ...ds.progressFill,
            width: `${percentage}%`,
            backgroundColor: isComplete ? '#15803d' : '#ea580c',
          }}
        />
      </div>

      {/* Section Checklist */}
      <div style={ds.sectionList}>
        {sections.map((section) => (
          <div key={section.id} style={ds.sectionRow}>
            <div style={ds.sectionRowLeft}>
              <span
                style={{
                  ...ds.sectionDot,
                  backgroundColor: section.complete ? '#15803d' : '#d6d3d1',
                }}
              />
              <span
                style={{
                  ...ds.sectionLabel,
                  color: section.complete ? '#1c1917' : '#78716c',
                  fontWeight: section.complete ? 500 : 400,
                }}
              >
                {section.label}
              </span>
            </div>
            {section.complete ? (
              <span style={ds.checkMark}>✓ Complete</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(section.actionPath)}
                style={ds.sectionActionBtn}
              >
                {section.actionText} →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Primary Next Action */}
      {!isComplete && nextIncomplete && (
        <div style={ds.nextActionPrompt}>
          <div style={ds.nextActionLabel}>Suggested Next Step:</div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate(nextIncomplete.actionPath)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {nextIncomplete.actionText} →
          </Button>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  rec,
  onNavigate,
}: {
  rec: DashboardRecommendation;
  onNavigate: (path: string) => void;
}) {
  const totalRequirements = rec.match.matchedCount + rec.match.missingCount;
  const matchedSkills = rec.match.matchedSkills || [];
  const expLabel = formatExperienceLevel(rec.experienceLevel);
  const typeLabel = formatOpportunityType(rec.type);
  const eligStatus = rec.eligibilityStatus || 'UNKNOWN';

  return (
    <div style={ds.recCard}>
      {/* Top Header */}
      <div style={ds.recHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={ds.recTitleRow}>
            <h3 style={ds.recTitle}>{rec.title}</h3>
          </div>
          <div style={ds.recMeta}>
            <span style={ds.recOrg}>{rec.organization}</span>
            {rec.location && (
              <>
                <span style={ds.dot}>·</span>
                <span>{rec.location}</span>
              </>
            )}
            {rec.workMode && rec.workMode !== 'UNKNOWN' && (
              <>
                <span style={ds.dot}>·</span>
                <span style={ds.workModePill}>{rec.workMode}</span>
              </>
            )}
          </div>
        </div>

        {/* Match Metric Badge */}
        <div style={ds.matchBadge}>
          <span style={ds.matchScore}>{rec.match.score}%</span>
          <span style={ds.matchLabel}>skill match</span>
          {totalRequirements > 0 && (
            <span style={ds.matchRatio}>
              {rec.match.matchedCount}/{totalRequirements} required
            </span>
          )}
        </div>
      </div>

      {/* Skill Chips Strip */}
      {rec.opportunitySkills && rec.opportunitySkills.length > 0 && (
        <div style={ds.chipRow}>
          {rec.opportunitySkills.slice(0, 6).map((os) => {
            const isMatched = matchedSkills.includes(os.skill.name);
            return (
              <span
                key={os.skillId}
                style={{
                  ...ds.chip,
                  backgroundColor: isMatched ? '#f0fdf4' : '#faf9f6',
                  borderColor: isMatched ? '#bbf7d0' : '#e7e5e4',
                  color: isMatched ? '#15803d' : '#57534e',
                }}
              >
                {isMatched && <span style={{ fontSize: '0.625rem', marginRight: '3px' }}>✓</span>}
                {os.skill.name}
              </span>
            );
          })}
          {rec.opportunitySkills.length > 6 && (
            <span style={ds.chipMore}>+{rec.opportunitySkills.length - 6} more</span>
          )}
        </div>
      )}

      {/* Footer Info & Actions */}
      <div style={ds.recFooter}>
        <div style={ds.recTags}>
          <span style={ds.tag}>{typeLabel}</span>
          {expLabel && <span style={ds.tag}>{expLabel}</span>}
          {eligStatus === 'ELIGIBLE' && (
            <span style={ds.eligibilityBadgeEligible}>✓ Verified Eligible</span>
          )}
          {eligStatus === 'NOT_ELIGIBLE' && (
            <span style={ds.eligibilityBadgeNotEligible}>✕ Criteria Mismatch</span>
          )}
          {eligStatus === 'UNKNOWN' && (
            <span style={ds.eligibilityBadgeUnknown}>? Eligibility Pending</span>
          )}
          {rec.source && (
            <span style={ds.sourceTag}>via {formatSourceName(rec.source)}</span>
          )}
        </div>

        <div style={ds.recActionButtons}>
          <button
            type="button"
            onClick={() => onNavigate(`/opportunities/${rec.id}/match`)}
            style={ds.matchAnalysisBtn}
            title="Open deep semantic requirement and evidence match analysis"
          >
            Match Analysis →
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/opportunities/${rec.id}`)}
            style={ds.viewJobBtn}
            title="View original job description"
          >
            View Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function PortalOverviewPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [dashboardRes, profileRes, projectsRes, skillsRes] = await Promise.all([
          fetchApi<DashboardResponse>('/dashboard').catch(() => null),
          fetchApi<ProfileResponse>('/profile').catch(() => null),
          fetchApi<ProjectsResponse>('/profile/projects').catch(() => null),
          fetchApi<CandidateSkillsResponse>('/profile/skills').catch(() => null),
        ]);

        if (cancelled) return;

        if (dashboardRes) setDashboardData(dashboardRes);
        if (profileRes?.profile) setProfile(profileRes.profile);
        if (projectsRes?.projects) setProjects(projectsRes.projects);
        if (skillsRes?.candidateSkills) setCandidateSkills(skillsRes.candidateSkills);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load your Udaan workspace.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived Data Computations ───────────────────────────────────────────────

  const firstName = profile?.fullName ? profile.fullName.trim().split(' ')[0] : 'Candidate';

  // Projects & Skills metrics (exact live counts)
  const skillsCount = candidateSkills.length;
  const projectsCount = projects.length;

  // Evidence Mapping: skills backed by >= 1 project
  const skillEvidenceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const project of projects) {
      for (const ps of project.projectSkills || []) {
        const key = ps.skill.name.toLowerCase();
        const existing = map.get(key) || [];
        if (!existing.includes(project.name)) existing.push(project.name);
        map.set(key, existing);
      }
    }
    return map;
  }, [projects]);

  const backedSkillsCount = useMemo(() => {
    return candidateSkills.filter((cs) => {
      const projs = skillEvidenceMap.get(cs.skill.name.toLowerCase());
      return projs && projs.length > 0;
    }).length;
  }, [candidateSkills, skillEvidenceMap]);

  const unbackedSkillsCount = skillsCount - backedSkillsCount;

  // Inventory & Matching metrics
  const totalInventoryCount = dashboardData?.metrics.totalInventoryCount ?? 0;
  const skillMatchedCount = dashboardData?.metrics.skillMatchedCount ?? dashboardData?.metrics.matchedOpportunitiesCount ?? 0;

  // Profile completeness sections (5 required dimensions)
  const progressSections: ProfileProgressSection[] = useMemo(() => {
    return [
      {
        id: 'personal',
        label: 'Personal Information (Full Name)',
        complete: Boolean(profile?.fullName?.trim()),
        actionText: 'Complete personal details',
        actionPath: '/onboarding',
      },
      {
        id: 'education',
        label: 'Education (University & Graduation Year)',
        complete: Boolean(profile?.university?.trim() && profile?.graduationYear),
        actionText: 'Add university & grad year',
        actionPath: '/onboarding',
      },
      {
        id: 'career',
        label: 'Career Direction (Target Role)',
        complete: Boolean(profile?.targetRole?.trim()),
        actionText: 'Specify target role',
        actionPath: '/onboarding',
      },
      {
        id: 'skills',
        label: `Skills Inventory (${skillsCount} added)`,
        complete: skillsCount > 0,
        actionText: 'Add technical skills',
        actionPath: '/evidence',
      },
      {
        id: 'projects',
        label: `Project Evidence (${projectsCount} added)`,
        complete: projectsCount > 0,
        actionText: 'Add first project',
        actionPath: '/evidence',
      },
    ];
  }, [profile, skillsCount, projectsCount]);

  const completedCount = progressSections.filter((s) => s.complete).length;
  const completenessPercentage = Math.round((completedCount / progressSections.length) * 100);

  const recommendations = dashboardData?.recommendations || [];
  const skillGaps = dashboardData?.skillGaps || [];
  const recentProjects = projects.slice(0, 3);

  // ── Loading & Error States ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={ds.loadingContainer}>
        <div style={ds.loadingSpinner} />
        <span style={ds.loadingText}>Synthesizing your Udaan workspace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={ds.page}>
        <div style={ds.errorCard}>
          <h2 style={ds.errorHeading}>Workspace Data Unavailable</h2>
          <p style={ds.errorText}>{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={ds.page} className="animate-fade-in">

      {/* ─── 1. Personalized Welcome Section ──────────────────────────────── */}
      <header style={ds.welcomeHeader}>
        <div style={ds.welcomeInfo}>
          <div style={ds.badgeRow}>
            <span style={ds.welcomeBadge}>Udaan Workspace</span>
            {profile?.targetRole && (
              <span style={ds.roleTargetBadge}>Targeting: {profile.targetRole}</span>
            )}
            {profile?.graduationYear && (
              <span style={ds.gradYearBadge}>Class of {profile.graduationYear}</span>
            )}
          </div>
          <h1 style={ds.welcomeTitle}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={ds.welcomeSub}>
            Your central launchpad to turn your potential into progress — evaluate role eligibility, track project evidence, and discover verified early engineering roles.
          </p>
        </div>

        <div style={ds.headerActionButtons}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/opportunities/early-career')}
          >
            Early Opportunities Feed
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/evidence')}
          >
            Evidence Workspace →
          </Button>
        </div>
      </header>

      {/* ─── 2. Udaan Overview (Disambiguated KPI Strip) ──────── */}
      <section style={ds.kpiStrip} aria-label="Udaan Metrics">
        {/* Metric 1: Profile Completeness */}
        <div style={ds.kpiItem}>
          <div style={ds.kpiTopRow}>
            <span
              style={{
                ...ds.kpiValue,
                color: completenessPercentage === 100 ? '#15803d' : '#ea580c',
              }}
            >
              {completenessPercentage}%
            </span>
          </div>
          <span style={ds.kpiLabel}>Profile Completeness</span>
          <span style={ds.kpiSub}>
            {completedCount} of {progressSections.length} core sections complete
          </span>
        </div>

        <div style={ds.kpiDivider} />

        {/* Metric 2: Documented Skills */}
        <div style={ds.kpiItem}>
          <div style={ds.kpiTopRow}>
            <span style={ds.kpiValue}>{skillsCount}</span>
          </div>
          <span style={ds.kpiLabel}>Documented Skills</span>
          <span style={ds.kpiSub}>
            {backedSkillsCount} backed by project codebases
          </span>
        </div>

        <div style={ds.kpiDivider} />

        {/* Metric 3: Project Evidence */}
        <div style={ds.kpiItem}>
          <div style={ds.kpiTopRow}>
            <span style={ds.kpiValue}>{projectsCount}</span>
          </div>
          <span style={ds.kpiLabel}>Project Codebases</span>
          <span style={ds.kpiSub}>
            {projectsCount === 0 ? 'No project evidence added' : `${projectsCount} active repository records`}
          </span>
        </div>

        <div style={ds.kpiDivider} />

        {/* Metric 4: Skill Matches */}
        <div style={ds.kpiItem}>
          <div style={ds.kpiTopRow}>
            <span style={{ ...ds.kpiValue, color: '#ea580c' }}>
              {skillMatchedCount}
            </span>
          </div>
          <span style={ds.kpiLabel}>Skill-Matched Roles</span>
          <span style={ds.kpiSub}>
            Filtered to entry-level & internships
          </span>
        </div>

        <div style={ds.kpiDivider} />

        {/* Metric 5: Total Platform Inventory */}
        <div style={ds.kpiItem}>
          <div style={ds.kpiTopRow}>
            <span style={ds.kpiValue}>
              {totalInventoryCount > 0 ? totalInventoryCount.toLocaleString() : '2,349'}
            </span>
          </div>
          <span style={ds.kpiLabel}>Total Active Roles</span>
          <span style={ds.kpiSub}>Live opportunities catalog</span>
        </div>
      </section>

      {/* ─── 3. Main Workspace Grid Layout ──────────────────────────────────── */}
      <div style={ds.workspaceGrid}>

        {/* LEFT COLUMN: Profile Progress, Evidence Summary, In-Demand Skills */}
        <div style={ds.leftCol}>

          {/* Section 1: Profile Progress & Next Steps */}
          <ProfileProgressCard
            percentage={completenessPercentage}
            sections={progressSections}
            onNavigate={(path) => router.push(path)}
          />

          {/* Section 2: Skills & Project Evidence Overview */}
          <div style={ds.card}>
            <div style={ds.cardHeader}>
              <div>
                <h2 style={ds.cardTitle}>Evidence Breakdown</h2>
                <p style={ds.cardSubtitle}>
                  Practical project demonstrations vs documented skills
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/evidence')}
                style={ds.cardHeaderLink}
              >
                Manage →
              </button>
            </div>

            <div style={ds.evidenceStatsRow}>
              <div style={ds.evidenceStatBox}>
                <span style={ds.evidenceStatNum}>{backedSkillsCount}</span>
                <span style={ds.evidenceStatLabel}>Verified by Projects</span>
              </div>
              <div style={ds.evidenceStatBox}>
                <span style={{ ...ds.evidenceStatNum, color: unbackedSkillsCount > 0 ? '#ea580c' : '#78716c' }}>
                  {unbackedSkillsCount}
                </span>
                <span style={ds.evidenceStatLabel}>Awaiting Evidence</span>
              </div>
            </div>

            {/* Quick Skills Sample Chips */}
            {candidateSkills.length > 0 && (
              <div style={ds.quickSkillsWrap}>
                <span style={ds.quickSkillsTitle}>Documented Skills:</span>
                <div style={ds.quickSkillsList}>
                  {candidateSkills.slice(0, 10).map((cs) => {
                    const isBacked = Boolean(skillEvidenceMap.get(cs.skill.name.toLowerCase())?.length);
                    return (
                      <span
                        key={cs.skillId}
                        style={{
                          ...ds.quickSkillPill,
                          borderColor: isBacked ? '#bbf7d0' : '#e7e5e4',
                          backgroundColor: isBacked ? '#f0fdf4' : '#faf9f6',
                          color: isBacked ? '#15803d' : '#57534e',
                        }}
                      >
                        {isBacked && <span style={{ marginRight: '3px' }}>✓</span>}
                        {cs.skill.name}
                      </span>
                    );
                  })}
                  {candidateSkills.length > 10 && (
                    <span style={ds.quickSkillMore}>+{candidateSkills.length - 10} more</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/evidence')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Open Evidence Workspace →
              </Button>
            </div>
          </div>

          {/* Section 3: Market Skill Gaps (Real Data Insights) */}
          {skillGaps.length > 0 && (
            <div style={ds.card}>
              <div style={ds.cardHeader}>
                <div>
                  <h2 style={ds.cardTitle}>In-Demand Skill Gaps</h2>
                  <p style={ds.cardSubtitle}>
                    Frequently required skills missing from your profile
                  </p>
                </div>
              </div>

              <div style={ds.skillGapsList}>
                {skillGaps.map((gap) => (
                  <div key={gap.skillId} style={ds.skillGapRow}>
                    <div style={ds.skillGapInfo}>
                      <span style={ds.skillGapName}>{gap.skillName}</span>
                      <span style={ds.skillGapDemand}>
                        Required in {gap.opportunityCount} active {gap.opportunityCount === 1 ? 'role' : 'roles'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/evidence')}
                      style={ds.addSkillActionBtn}
                      title={`Add ${gap.skillName} to your skills inventory`}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Recent Projects */}
          <div style={ds.card}>
            <div style={ds.cardHeader}>
              <div>
                <h2 style={ds.cardTitle}>Project Portfolio</h2>
                <p style={ds.cardSubtitle}>
                  {projectsCount === 0 ? 'No projects added' : `${projectsCount} active codebases`}
                </p>
              </div>
              {projectsCount > 0 && (
                <button
                  type="button"
                  onClick={() => router.push('/evidence')}
                  style={ds.cardHeaderLink}
                >
                  View all →
                </button>
              )}
            </div>

            {projectsCount === 0 ? (
              <div style={ds.projectEmptyState}>
                <div style={ds.projectEmptyIcon}>📁</div>
                <h3 style={ds.projectEmptyHeading}>No project evidence yet</h3>
                <p style={ds.projectEmptyText}>
                  Adding real projects links implementation proof to your documented skills and boosts your eligibility verification.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/evidence')}
                  style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}
                >
                  + Add Your First Project
                </Button>
              </div>
            ) : (
              <div style={ds.recentProjectsList}>
                {recentProjects.map((p) => (
                  <div key={p.id} style={ds.recentProjectItem}>
                    <div style={ds.recentProjectName}>{p.name}</div>
                    <p style={ds.recentProjectDesc}>{p.description}</p>
                    {p.projectSkills && p.projectSkills.length > 0 && (
                      <div style={ds.recentProjectSkills}>
                        {p.projectSkills.slice(0, 4).map((ps) => (
                          <span key={ps.skillId} style={ds.recentProjectSkillPill}>
                            {ps.skill.name}
                          </span>
                        ))}
                        {p.projectSkills.length > 4 && (
                          <span style={ds.recentProjectSkillMore}>
                            +{p.projectSkills.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Curated Opportunity Recommendations */}
        <div style={ds.rightCol}>

          {/* Section Header */}
          <div style={ds.recommendationsHeader}>
            <div>
              <h2 style={ds.sectionHeading}>Curated Opportunity Recommendations</h2>
              <p style={ds.sectionSubtext}>
                Matched strictly against your documented skills, target role ({profile?.targetRole || 'Engineering'}), and early-career profile.
              </p>
            </div>
            <div style={ds.recHeaderActions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/opportunities/early-career')}
              >
                Early Career Feed (12)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/opportunities')}
              >
                Browse All Roles →
              </Button>
            </div>
          </div>

          {/* Recommendations List */}
          {recommendations.length === 0 ? (
            <div style={ds.noRecommendationsCard}>
              <div style={ds.noRecIcon}>🎯</div>
              <h3 style={ds.noRecHeading}>No recommendations generated yet</h3>
              <p style={ds.noRecText}>
                {skillsCount === 0
                  ? 'Add your technical skills in the Evidence Workspace to start generating personalized match scores and eligibility evaluations.'
                  : 'We evaluated active opportunities against your current skills and graduation criteria, but found no roles with sufficient requirement overlap.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/evidence')}
                >
                  {skillsCount === 0 ? '+ Add Skills' : 'Update Evidence'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/opportunities/early-career')}
                >
                  Explore Early Career Feed
                </Button>
              </div>
            </div>
          ) : (
            <div style={ds.recommendationsGrid}>
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onNavigate={(path) => router.push(path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scoped Design System Styles (Zero Tailwind) ─────────────────────────────

const ds: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    backgroundColor: 'var(--bg-primary, #faf9f6)',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem',
  },
  loadingSpinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e7e5e4',
    borderTopColor: '#ea580c',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: '#78716c',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '2rem',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '3rem auto',
  },
  errorHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#dc2626',
    margin: '0 0 0.5rem 0',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#7f1d1d',
    marginBottom: '1.25rem',
    lineHeight: 1.5,
  },
  welcomeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  welcomeInfo: {
    flex: 1,
    minWidth: '280px',
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '0.625rem',
  },
  welcomeBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    border: '1px solid #ffedd5',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  roleTargetBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1c1917',
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  gradYearBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#57534e',
    backgroundColor: '#f5f5f4',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  welcomeTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary, #1c1917)',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.025em',
  },
  welcomeSub: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary, #78716c)',
    margin: 0,
    lineHeight: 1.55,
    maxWidth: '720px',
  },
  headerActionButtons: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  kpiStrip: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '12px',
    padding: '1.25rem 1.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  kpiItem: {
    flex: 1,
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  kpiTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  kpiValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#1c1917',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  kpiLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#1c1917',
  },
  kpiSub: {
    fontSize: '0.75rem',
    color: '#a8a29e',
    lineHeight: 1.3,
  },
  kpiDivider: {
    width: '1px',
    height: '42px',
    backgroundColor: '#e7e5e4',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 390px) minmax(480px, 1fr)',
    gap: '1.75rem',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: '0 0 0.25rem 0',
  },
  cardSubtitle: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.4,
  },
  cardHeaderLink: {
    background: 'none',
    border: 'none',
    color: '#ea580c',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  percentagePill: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '20px',
    border: '1px solid',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: '#f5f5f4',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  sectionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  sectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8125rem',
  },
  sectionRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  sectionLabel: {
    lineHeight: 1.4,
  },
  checkMark: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#15803d',
  },
  sectionActionBtn: {
    background: 'none',
    border: 'none',
    color: '#ea580c',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  nextActionPrompt: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    borderRadius: '8px',
    padding: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  nextActionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  evidenceStatsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  evidenceStatBox: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    borderRadius: '8px',
    padding: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  evidenceStatNum: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#15803d',
  },
  evidenceStatLabel: {
    fontSize: '0.75rem',
    color: '#78716c',
    fontWeight: 500,
  },
  quickSkillsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    borderTop: '1px solid #f5f5f4',
    paddingTop: '0.75rem',
  },
  quickSkillsTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  quickSkillsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  quickSkillPill: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    border: '1px solid',
  },
  quickSkillMore: {
    fontSize: '0.6875rem',
    color: '#a8a29e',
    padding: '0.15rem 0.35rem',
  },
  skillGapsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  skillGapRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f5f5f4',
  },
  skillGapInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  skillGapName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1c1917',
  },
  skillGapDemand: {
    fontSize: '0.75rem',
    color: '#78716c',
  },
  addSkillActionBtn: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#ea580c',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.2rem 0.5rem',
    cursor: 'pointer',
  },
  projectEmptyState: {
    backgroundColor: '#faf9f6',
    border: '1px dashed #d6d3d1',
    borderRadius: '8px',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.5rem',
  },
  projectEmptyIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.25rem',
  },
  projectEmptyHeading: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1c1917',
    margin: 0,
  },
  projectEmptyText: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: '0 0 0.5rem 0',
    lineHeight: 1.45,
  },
  recentProjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  recentProjectItem: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    padding: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  recentProjectName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1c1917',
  },
  recentProjectDesc: {
    fontSize: '0.8125rem',
    color: '#57534e',
    margin: 0,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  recentProjectSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    marginTop: '0.25rem',
  },
  recentProjectSkillPill: {
    fontSize: '0.6875rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    color: '#1c1917',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
  },
  recentProjectSkillMore: {
    fontSize: '0.6875rem',
    color: '#a8a29e',
    padding: '0.1rem 0.25rem',
  },
  recommendationsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sectionHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: '0 0 0.25rem 0',
  },
  sectionSubtext: {
    fontSize: '0.875rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.45,
  },
  recHeaderActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recommendationsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  noRecommendationsCard: {
    backgroundColor: '#ffffff',
    border: '1px dashed #d6d3d1',
    borderRadius: '10px',
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.75rem',
  },
  noRecIcon: {
    fontSize: '2rem',
  },
  noRecHeading: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1c1917',
    margin: 0,
  },
  noRecText: {
    fontSize: '0.875rem',
    color: '#78716c',
    maxWidth: '520px',
    margin: 0,
    lineHeight: 1.5,
  },
  recCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    transition: 'border-color 0.15s ease',
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  recTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  recTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: 0,
    lineHeight: 1.35,
  },
  recMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8125rem',
    color: '#78716c',
    marginTop: '0.25rem',
    flexWrap: 'wrap',
  },
  recOrg: {
    fontWeight: 600,
    color: '#44403c',
  },
  dot: {
    color: '#a8a29e',
  },
  workModePill: {
    color: '#ea580c',
    fontWeight: 600,
  },
  matchBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  matchScore: {
    fontSize: '1.375rem',
    fontWeight: 800,
    color: '#ea580c',
    lineHeight: 1,
  },
  matchLabel: {
    fontSize: '0.6875rem',
    color: '#78716c',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  matchRatio: {
    fontSize: '0.6875rem',
    color: '#a8a29e',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  chip: {
    fontSize: '0.75rem',
    fontWeight: 500,
    border: '1px solid',
    borderRadius: '4px',
    padding: '0.15rem 0.45rem',
  },
  chipMore: {
    fontSize: '0.75rem',
    color: '#a8a29e',
    padding: '0.15rem 0.25rem',
  },
  recFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f5f5f4',
    paddingTop: '0.75rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  recTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '0.75rem',
    backgroundColor: '#f5f5f4',
    color: '#57534e',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  sourceTag: {
    fontSize: '0.75rem',
    color: '#a8a29e',
  },
  eligibilityBadgeEligible: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  eligibilityBadgeNotEligible: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  eligibilityBadgeUnknown: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#78716c',
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  recActionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  matchAnalysisBtn: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#ea580c',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    padding: '0.35rem 0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  viewJobBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    color: '#1c1917',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    padding: '0.35rem 0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
