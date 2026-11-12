'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import type {
  Profile,
  ProfileResponse,
  Project,
  ProjectsResponse,
  DashboardResponse,
  DashboardRecommendation,
  SkillGap,
} from '../../../lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSourceName(source: string | null | undefined): string {
  if (!source) return 'Job Board';
  const s = source.trim().toLowerCase();
  if (s === 'jobicy') return 'Jobicy';
  if (s === 'greenhouse') return 'Greenhouse';
  if (s === 'lever') return 'Lever';
  if (s === 'ashby') return 'Ashby';
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
    JOB: 'Job',
    HACKATHON: 'Hackathon',
    WORKSHOP: 'Workshop',
    OPEN_SOURCE: 'Open Source',
    MICRO_INTERNSHIP: 'Micro-Internship',
  };
  return map[type] ?? type;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileCompletenessCard({
  percentage,
  missingSections,
  completedSections,
  onComplete,
}: {
  percentage: number;
  missingSections: string[];
  completedSections: string[];
  onComplete: () => void;
}) {
  const isComplete = percentage === 100;

  return (
    <div style={ds.card}>
      <div style={ds.cardHeader}>
        <div>
          <h2 style={ds.cardTitle}>Profile Completeness</h2>
          <p style={ds.cardSubtitle}>
            {isComplete
              ? 'All required sections are complete.'
              : `${missingSections.length} section${missingSections.length !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <span
          style={{
            ...ds.percentagePill,
            backgroundColor: isComplete ? '#f0fdf4' : '#fff7ed',
            color: isComplete ? '#15803d' : '#9a3412',
            borderColor: isComplete ? '#bbf7d0' : '#fed7aa',
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={ds.progressTrack}>
        <div
          style={{
            ...ds.progressFill,
            width: `${percentage}%`,
            backgroundColor: isComplete ? '#16a34a' : '#ea580c',
          }}
        />
      </div>

      {/* Section list */}
      <div style={ds.sectionList}>
        {(['Full name', 'University', 'Target role', 'Graduation year', 'At least one skill', 'At least one project'] as const).map((label) => {
          const done = completedSections.includes(label);
          return (
            <div key={label} style={ds.sectionRow}>
              <span
                style={{
                  ...ds.sectionDot,
                  backgroundColor: done ? '#16a34a' : '#e5e5e5',
                }}
              />
              <span
                style={{
                  ...ds.sectionLabel,
                  color: done ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  textDecoration: done ? 'none' : 'none',
                }}
              >
                {label}
              </span>
              {done && (
                <span style={ds.checkMark}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {!isComplete && (
        <div style={{ marginTop: '1.25rem' }}>
          <Button variant="outline" size="sm" onClick={onComplete}>
            Complete profile →
          </Button>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: DashboardRecommendation }) {
  const router = useRouter();
  const totalRequirements = rec.match.matchedCount + rec.match.missingCount;
  const matchedSkills = rec.match.matchedSkills || [];
  const expLabel = formatExperienceLevel(rec.experienceLevel);
  const typeLabel = formatOpportunityType(rec.type);

  return (
    <div style={ds.recCard}>
      <div style={ds.recHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={ds.recTitle}>{rec.title}</h3>
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
                <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{rec.workMode}</span>
              </>
            )}
          </div>
        </div>
        <div style={ds.matchBadge}>
          <span style={ds.matchScore}>{rec.match.score}%</span>
          <span style={ds.matchLabel}>skill match</span>
          {totalRequirements > 0 && (
            <span style={ds.matchRatio}>
              {rec.match.matchedCount}/{totalRequirements} skills
            </span>
          )}
        </div>
      </div>

      {/* Skill chips */}
      {rec.opportunitySkills && rec.opportunitySkills.length > 0 && (
        <div style={ds.chipRow}>
          {rec.opportunitySkills.slice(0, 5).map((os) => {
            const matched = matchedSkills.includes(os.skill.name);
            return (
              <span
                key={os.skillId}
                style={{
                  ...ds.chip,
                  backgroundColor: matched ? '#f0fdf4' : '#f4f4f5',
                  borderColor: matched ? '#bbf7d0' : '#e4e4e7',
                  color: matched ? '#15803d' : '#52525b',
                }}
              >
                {matched && <span style={{ fontSize: '0.625rem', marginRight: '2px' }}>✓</span>}
                {os.skill.name}
              </span>
            );
          })}
          {(rec.opportunitySkills.length) > 5 && (
            <span style={ds.chipMore}>+{rec.opportunitySkills.length - 5} more</span>
          )}
        </div>
      )}

      <div style={ds.recFooter}>
        <div style={ds.recTags}>
          <span style={ds.tag}>{typeLabel}</span>
          {expLabel && <span style={ds.tag}>{expLabel}</span>}
          {rec.source && (
            <span style={{ ...ds.tag, color: 'var(--text-tertiary)', fontSize: '0.6875rem' }}>
              via {formatSourceName(rec.source)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <button
            onClick={() => router.push(`/opportunities/${rec.id}/match`)}
            style={{ ...ds.viewBtn, color: 'var(--accent-primary)', backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
            title="View detailed skill & eligibility match analysis"
          >
            Match Analysis
          </button>
          <button
            onClick={() => router.push(`/opportunities/${rec.id}`)}
            style={ds.viewBtn}
          >
            View →
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div style={ds.projectItem}>
      <div style={ds.projectName}>{project.name}</div>
      {project.projectSkills && project.projectSkills.length > 0 && (
        <div style={ds.chipRow}>
          {project.projectSkills.slice(0, 4).map((ps) => (
            <span key={ps.skillId} style={{ ...ds.chip, backgroundColor: '#f4f4f5', borderColor: '#e4e4e7', color: '#52525b' }}>
              {ps.skill.name}
            </span>
          ))}
          {project.projectSkills.length > 4 && (
            <span style={ds.chipMore}>+{project.projectSkills.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortalOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [dashboardRes, profileRes, projectsRes] = await Promise.all([
          fetchApi<DashboardResponse>('/dashboard').catch(() => null),
          fetchApi<ProfileResponse>('/profile').catch(() => null),
          fetchApi<ProjectsResponse>('/profile/projects').catch(() => null),
        ]);
        if (cancelled) return;
        if (dashboardRes) setDashboardData(dashboardRes);
        if (profileRes?.profile) setProfile(profileRes.profile);
        if (projectsRes?.projects) setProjects(projectsRes.projects);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={ds.loadingState}>
        <div style={ds.loadingDot} />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={ds.errorState}>
        <strong>Unable to load dashboard</strong>
        <p style={{ margin: '0.5rem 0 1rem', color: 'var(--error-text)' }}>{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'there';
  const skillsCount = dashboardData?.metrics.skillsCount ?? 0;
  // Use the projects from the dedicated API as the authoritative count
  const projectsCount = projects.length;
  const skillMatchedCount = dashboardData?.metrics.skillMatchedCount ?? dashboardData?.metrics.matchedOpportunitiesCount ?? 0;
  const recommendations = dashboardData?.recommendations || [];
  const skillGaps = dashboardData?.skillGaps || [];
  const recentProjects = projects.slice(0, 3);

  // Profile completeness — prefer the detailed API response, fall back to computing from profile data
  const rawCompleteness = dashboardData?.profileCompleteness;
  const completenessPercentage = rawCompleteness?.percentage ?? (dashboardData?.profileComplete ? 100 : 0);
  const completedSections = rawCompleteness?.completedSections ?? (dashboardData?.profileComplete ? ['Full name', 'University', 'Target role', 'Graduation year', 'At least one skill', 'At least one project'] : []);
  const missingSections = rawCompleteness?.missingSections ?? (dashboardData?.profileComplete ? [] : ['Complete your profile']);

  const hasSkills = skillsCount > 0;
  const hasProjects = projectsCount > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={ds.page} className="animate-fade-in">

      {/* ── Welcome Header ───────────────────────────────────────────────── */}
      <header style={ds.welcomeHeader}>
        <div>
          <h1 style={ds.welcomeTitle}>{getGreeting()}, {firstName}</h1>
          <p style={ds.welcomeSub}>
            {profile?.targetRole
              ? `Preparing for ${profile.targetRole}${profile.graduationYear ? ` · Class of ${profile.graduationYear}` : ''}`
              : 'Your career intelligence workspace'}
          </p>
        </div>
        {/* Quick actions */}
        <div style={ds.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/opportunities/early-career')}
          >
            Early Opportunities
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/opportunities')}
          >
            Browse All →
          </Button>
        </div>
      </header>

      {/* ── Career Overview Strip ────────────────────────────────────────── */}
      <div style={ds.overviewStrip}>
        <div style={ds.overviewItem}>
          <span style={ds.overviewValue}>{completenessPercentage}%</span>
          <span style={ds.overviewLabel}>Profile</span>
        </div>
        <div style={ds.overviewDivider} />
        <div style={ds.overviewItem}>
          <span style={ds.overviewValue}>{skillsCount}</span>
          <span style={ds.overviewLabel}>Skills</span>
        </div>
        <div style={ds.overviewDivider} />
        <div style={ds.overviewItem}>
          <span style={ds.overviewValue}>{projectsCount}</span>
          <span style={ds.overviewLabel}>Projects</span>
        </div>
        <div style={ds.overviewDivider} />
        <div style={ds.overviewItem}>
          <span style={{ ...ds.overviewValue, color: skillMatchedCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
            {skillMatchedCount}
          </span>
          <span style={ds.overviewLabel}>Skill Matches</span>
        </div>
      </div>

      {/* ── Early Opportunities Banner ───────────────────────────────────── */}
      <div style={ds.earlyBanner}>
        <div style={ds.earlyBannerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={ds.earlyBannerTitle}>Looking for Internships or Entry-Level Roles?</div>
          <div style={ds.earlyBannerSub}>
            Explore the dedicated Early Opportunities feed — 12 verified Indian early-career roles across Software Engineering, Product, Operations & more.
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push('/opportunities/early-career')}
          style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', flexShrink: 0 }}
        >
          Explore →
        </Button>
      </div>

      {/* ── Main Workspace Grid ──────────────────────────────────────────── */}
      <div style={ds.workspaceGrid}>

        {/* LEFT COLUMN */}
        <div style={ds.leftCol}>

          {/* Profile Completeness */}
          <ProfileCompletenessCard
            percentage={completenessPercentage}
            missingSections={missingSections}
            completedSections={completedSections}
            onComplete={() => router.push('/onboarding')}
          />

          {/* Career Direction */}
          <div style={ds.card}>
            <div style={ds.cardHeader}>
              <h2 style={ds.cardTitle}>Career Direction</h2>
            </div>
            <div style={ds.infoTable}>
              <div style={ds.infoRow}>
                <span style={ds.infoKey}>Target role</span>
                <span style={ds.infoVal}>{profile?.targetRole || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not set</span>}</span>
              </div>
              <div style={ds.infoRow}>
                <span style={ds.infoKey}>Graduation</span>
                <span style={ds.infoVal}>{profile?.graduationYear ? `Class of ${profile.graduationYear}` : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not set</span>}</span>
              </div>
              <div style={{ ...ds.infoRow, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <span style={ds.infoKey}>University</span>
                <span style={ds.infoVal}>{profile?.university || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not set</span>}</span>
              </div>
            </div>
            {(!profile?.targetRole || !profile?.graduationYear) && (
              <div style={{ marginTop: '1.25rem' }}>
                <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>
                  Edit profile
                </Button>
              </div>
            )}
          </div>

          {/* Project Evidence */}
          <div style={ds.card}>
            <div style={ds.cardHeader}>
              <h2 style={ds.cardTitle}>Project Evidence</h2>
              {recentProjects.length > 0 && (
                <button
                  onClick={() => router.push('/evidence')}
                  style={ds.ghostLink}
                >
                  View all →
                </button>
              )}
            </div>
            {!hasProjects ? (
              <div style={ds.emptyState}>
                <div style={ds.emptyIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                </div>
                <div style={ds.emptyTitle}>No projects yet</div>
                <p style={ds.emptyText}>
                  Adding projects with skills enables evidence-backed opportunity matching and improves your profile completeness.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/evidence')}>
                  Add your first project
                </Button>
              </div>
            ) : (
              <div style={ds.projectList}>
                {recentProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
                {projects.length > 3 && (
                  <button onClick={() => router.push('/evidence')} style={ds.ghostLink}>
                    +{projects.length - 3} more projects →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Skill Gap Analysis */}
          {skillGaps.length > 0 && (
            <div style={ds.card}>
              <div style={ds.cardHeader}>
                <div>
                  <h2 style={ds.cardTitle}>Skill Gaps</h2>
                  <p style={ds.cardSubtitle}>High-demand skills missing from your profile</p>
                </div>
              </div>
              <div style={ds.gapList}>
                {skillGaps.map((gap: SkillGap) => (
                  <div key={gap.skillId || gap.skillName} style={ds.gapRow}>
                    <span style={ds.gapName}>{gap.skillName}</span>
                    <span style={ds.gapCount}>
                      {gap.opportunityCount} {gap.opportunityCount === 1 ? 'opportunity' : 'opportunities'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Recommendations */}
        <div style={ds.rightCol}>
          <div style={{ ...ds.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={ds.cardHeader}>
              <div>
                <h2 style={ds.cardTitle}>Recommended Opportunities</h2>
                <p style={ds.cardSubtitle}>
                  {hasSkills
                    ? `Ranked by skill match · ${skillMatchedCount > 0 ? `${skillMatchedCount} entry-level matches found` : 'Add more skills to improve matching'}`
                    : 'Add skills to your profile to see personalised recommendations'}
                </p>
              </div>
              <button onClick={() => router.push('/opportunities')} style={ds.ghostLink}>
                Browse all →
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div style={ds.centeredEmpty}>
                <div style={ds.centeredEmptyIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.75">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <div style={ds.emptyTitle}>No recommendations yet</div>
                <p style={ds.emptyText}>
                  {!hasSkills
                    ? 'Add skills to your profile to unlock skill-matched recommendations.'
                    : !hasProjects
                      ? 'Add at least one project with skills to improve recommendation quality.'
                      : 'We\'ll surface relevant entry-level and internship roles as you complete your profile.'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {!hasSkills && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/profile')}>
                      Add Skills
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={() => router.push('/opportunities')}>
                    Browse Opportunities
                  </Button>
                </div>
              </div>
            ) : (
              <div style={ds.recList}>
                {/* Disclaimer */}
                <div style={ds.disclaimer}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span>
                    Ranked by skill match only — not eligibility. Verify requirements on each listing before applying.
                  </span>
                </div>

                {recommendations.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}

                <button
                  onClick={() => router.push('/opportunities')}
                  style={{ ...ds.ghostLink, textAlign: 'center', paddingTop: '0.75rem', display: 'block', width: '100%' }}
                >
                  Explore all opportunities →
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Design System ────────────────────────────────────────────────────────────

const ds: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },

  // States
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    minHeight: '280px',
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
  },
  errorState: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: '1px solid var(--error-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1.5rem',
    fontSize: '0.9375rem',
  },

  // Welcome header
  welcomeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  welcomeTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '0.375rem',
    lineHeight: 1.1,
  },
  welcomeSub: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    fontWeight: 450,
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
    flexWrap: 'wrap',
  },

  // Overview strip
  overviewStrip: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    gap: '0',
  },
  overviewItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
  },
  overviewValue: {
    fontSize: '1.875rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  overviewLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  overviewDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: 'var(--border-light)',
    flexShrink: 0,
  },

  // Early banner
  earlyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#fff7ed',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#fed7aa',
    borderRadius: 'var(--radius-md)',
    padding: '1rem 1.25rem',
    flexWrap: 'wrap',
  },
  earlyBannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#ffedd5',
    flexShrink: 0,
  },
  earlyBannerTitle: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#9a3412',
    marginBottom: '0.125rem',
  },
  earlyBannerSub: {
    fontSize: '0.8125rem',
    color: '#c2410c',
  },

  // Workspace grid
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
    gap: '1.5rem',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '600px',
  },

  // Card
  card: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
    letterSpacing: '-0.015em',
    marginBottom: '0.125rem',
  },
  cardSubtitle: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },

  // Profile completeness
  percentagePill: {
    fontSize: '0.875rem',
    fontWeight: 700,
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    borderWidth: '1px',
    borderStyle: 'solid',
    flexShrink: 0,
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#f4f4f5',
    marginBottom: '1.25rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  sectionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  sectionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  sectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: '0.875rem',
    flex: 1,
  },
  checkMark: {
    fontSize: '0.75rem',
    color: '#16a34a',
    fontWeight: 700,
  },

  // Info table (career direction)
  infoTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '0.75rem',
    gap: '1rem',
  },
  infoKey: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  infoVal: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'right',
  },

  // Ghost link button
  ghostLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
    textDecoration: 'none',
  },

  // Empty states
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
    padding: '0.5rem 0',
  },
  emptyIcon: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: '8px',
    color: 'var(--text-tertiary)',
    marginBottom: '0.25rem',
  },
  emptyTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptyText: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    maxWidth: '340px',
    margin: 0,
  },
  centeredEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '0.875rem',
    padding: '3rem 2rem',
    flex: 1,
  },
  centeredEmptyIcon: {
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--accent-light)',
    borderRadius: 'var(--radius-full)',
    marginBottom: '0.25rem',
  },

  // Projects
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  projectItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-light)',
  },
  projectName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },

  // Skill gaps
  gapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  gapRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 0.875rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
  },
  gapName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  gapCount: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },

  // Recommendation list
  recList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    flex: 1,
  },
  disclaimer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.625rem 0.875rem',
    backgroundColor: '#f4f4f5',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },

  // Recommendation card
  recCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.125rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)',
    transition: 'border-color 150ms ease',
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  recTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.015em',
    marginBottom: '0.25rem',
  },
  recMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    flexWrap: 'wrap',
  },
  recOrg: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dot: {
    color: 'var(--text-tertiary)',
  },
  matchBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.125rem',
    flexShrink: 0,
  },
  matchScore: {
    fontSize: '1rem',
    fontWeight: 750,
    color: '#15803d',
    lineHeight: 1,
  },
  matchLabel: {
    fontSize: '0.6875rem',
    color: '#16a34a',
    fontWeight: 500,
  },
  matchRatio: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },

  // Chips
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.3rem',
    alignItems: 'center',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.2rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  chipMore: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },

  // Rec footer
  recFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.625rem',
    borderTop: '1px solid var(--border-light)',
  },
  recTags: {
    display: 'flex',
    gap: '0.375rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: '#f4f4f5',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
  },
  viewBtn: {
    background: 'none',
    border: '1px solid var(--border-light)',
    color: 'var(--accent-primary)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.3125rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
};
