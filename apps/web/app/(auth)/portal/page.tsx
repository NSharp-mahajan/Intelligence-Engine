'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { Profile, ProfileResponse, Project, ProjectsResponse, DashboardResponse, DashboardRecommendation, SkillGap } from '../../../lib/types';

function formatSourceName(source: string | null | undefined): string {
  if (!source) return 'Job Board';
  const s = source.trim().toLowerCase();
  if (s === 'jobicy') return 'Jobicy';
  if (s === 'greenhouse') return 'Greenhouse';
  if (s === 'lever') return 'Lever';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export default function PortalOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
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

        if (dashboardRes) {
          setDashboardData(dashboardRes);
          setProfileComplete(dashboardRes.profileComplete);
        } else if (profileRes) {
          setProfileComplete(profileRes.profileComplete || false);
        }

        if (profileRes?.profile) {
          setProfile(profileRes.profile);
        }

        if (projectsRes?.projects) {
          setProjects(projectsRes.projects);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load your dashboard. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={styles.loading}>Loading your career workspace...</div>;
  if (error) return <div style={styles.errorAlert}>{error}</div>;

  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Candidate';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const skillsCount = dashboardData?.metrics.skillsCount ?? 0;
  const projectsCount = dashboardData?.metrics.projectsCount ?? projects.length;
  const recommendedCount = dashboardData?.metrics.matchedOpportunitiesCount ?? 0;
  const recentProjects = projects.slice(0, 3);
  const recommendations = dashboardData?.recommendations || [];
  const skillGaps = dashboardData?.skillGaps || [];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* HEADER */}
      <header style={styles.header}>
        <h1 style={styles.title}>{getGreeting()}, {firstName}</h1>
        <p style={styles.subtitle}>Your career intelligence overview.</p>
      </header>

      {/* KPI METRICS STRIP */}
      <div style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <div style={styles.kpiCardInner}>
            <span style={styles.kpiLabel}>PROFILE COMPLETENESS</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{profileComplete ? '100%' : '0%'}</span>
              <Badge variant={profileComplete ? 'success' : 'warning'}>
                {profileComplete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
          </div>
        </Card>
        
        <Card style={styles.kpiCard}>
          <div style={styles.kpiCardInner}>
            <span style={styles.kpiLabel}>PROFILE SKILLS</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{skillsCount}</span>
            </div>
          </div>
        </Card>

        <Card style={styles.kpiCard}>
          <div style={styles.kpiCardInner}>
            <span style={styles.kpiLabel}>PROJECT EVIDENCE</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{projectsCount}</span>
            </div>
          </div>
        </Card>

        <Card style={styles.kpiCard}>
          <div style={styles.kpiCardInner}>
            <span style={styles.kpiLabel}>RECOMMENDED OPPORTUNITIES</span>
            <div style={styles.kpiValueContainer}>
              <span style={{ ...styles.kpiValue, color: 'var(--accent-primary)' }}>{recommendedCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE (40% Left / 60% Right) */}
      <div style={styles.workspaceGrid}>
        
        {/* LEFT COLUMN — CAREER DIRECTION, SKILL GAPS, RECENT EVIDENCE */}
        <div style={styles.leftColumn}>
          
          {/* CAREER DIRECTION */}
          <Card style={styles.cardItem}>
            <CardHeader>
              <h2 style={styles.sectionTitle}>Career Direction</h2>
            </CardHeader>
            <CardBody>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Target Role</span>
                <span style={styles.infoValue}>{profile?.targetRole || 'Not specified'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Target Timeline</span>
                <span style={styles.infoValue}>Graduation {profile?.graduationYear || 'Not specified'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Profile Status</span>
                <span style={styles.infoValue}>
                  {profileComplete ? (
                    <span style={styles.completeStatus}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      All core fields provided
                    </span>
                  ) : (
                    <span style={{ color: '#b45309', fontWeight: 500 }}>Missing core fields</span>
                  )}
                </span>
              </div>
              {!profileComplete && (
                <div style={{ marginTop: '1.25rem' }}>
                  <Button variant="outline" size="sm" onClick={() => router.push('/onboarding')}>Complete Profile</Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* SKILL GAP ANALYSIS */}
          <Card style={styles.cardItem}>
            <CardHeader>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h2 style={styles.sectionTitle}>Skill Gap Analysis</h2>
                  <p style={styles.sectionSubtext}>High-demand skills missing from your profile</p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {skillGaps.length === 0 ? (
                <div style={styles.skillGapEmpty}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-text)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span style={styles.skillGapEmptyText}>Your skill evidence covers current opportunity requirements well.</span>
                </div>
              ) : (
                <div style={styles.skillGapsList}>
                  {skillGaps.map(gap => (
                    <div key={gap.skillId || gap.skillName} style={styles.skillGapItem}>
                      <div style={styles.skillGapMain}>
                        <span style={styles.skillGapName}>{gap.skillName}</span>
                        <span style={styles.skillGapBadge}>Gap</span>
                      </div>
                      <span style={styles.skillGapMeta}>Required by {gap.opportunityCount} {gap.opportunityCount === 1 ? 'opportunity' : 'opportunities'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* RECENT EVIDENCE */}
          <Card style={styles.cardItem}>
            <CardHeader>
              <div style={styles.sectionHeaderRow}>
                <h2 style={styles.sectionTitle}>Recent Evidence</h2>
                {recentProjects.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => router.push('/evidence')}>View all →</Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {recentProjects.length === 0 ? (
                <div style={styles.emptyStateContainer}>
                  <div style={styles.emptyStateIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>No project evidence yet</h3>
                  <p style={styles.emptyStateText}>
                    Add your first project to enable evidence-backed opportunity matching.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/evidence')}>Add Project</Button>
                </div>
              ) : (
                <div style={styles.recentProjectsList}>
                  {recentProjects.map(project => (
                    <div key={project.id} style={styles.recentProjectItem}>
                      <span style={styles.recentProjectName}>{project.name}</span>
                      <div style={styles.recentProjectSkills}>
                        {project.projectSkills?.slice(0, 4).map((ps) => (
                          <Badge key={ps.skillId} variant="neutral">{ps.skill.name}</Badge>
                        ))}
                        {(project.projectSkills?.length || 0) > 4 && (
                          <span style={styles.moreSkillsText}>+{(project.projectSkills.length - 4)} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

        </div>

        {/* RIGHT COLUMN — RECOMMENDED OPPORTUNITIES (DOMINANT BLOCK) */}
        <div style={styles.rightColumn}>
          <Card style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h2 style={styles.sectionTitle}>Recommended Opportunities</h2>
                  <p style={styles.sectionSubtext}>Dynamically ranked by your profile skills & project evidence</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/opportunities')}>Explore all →</Button>
              </div>
            </CardHeader>
            <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {recommendations.length === 0 ? (
                <div style={styles.emptyStateContainerCentered}>
                  <div style={styles.matchingPlaceholderIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>No Recommendations Available</h3>
                  <p style={styles.emptyStateText}>
                    Explore available opportunities to find matching career pathways.
                  </p>
                  <Button variant="primary" onClick={() => router.push('/opportunities')}>Browse Opportunities</Button>
                </div>
              ) : (
                <div style={styles.oppsList}>
                  {recommendations.map((rec) => {
                    const totalRequirements = rec.match.matchedCount + rec.match.missingCount;
                    const matchedSkills = rec.match.matchedSkills || [];
                    return (
                      <div key={rec.id} style={styles.oppCardItem}>
                        <div style={styles.oppHeader}>
                          <div>
                            <h3 style={styles.oppTitle}>{rec.title}</h3>
                            <div style={styles.oppOrgMeta}>
                              <span style={styles.oppOrg}>{rec.organization}</span>
                              {rec.location && <span style={styles.oppDot}>•</span>}
                              {rec.location && <span>{rec.location}</span>}
                              {rec.workMode && <span style={styles.oppDot}>•</span>}
                              {rec.workMode && <span style={styles.oppWorkMode}>{rec.workMode}</span>}
                              {rec.source && <span style={styles.oppDot}>•</span>}
                              {rec.source && (
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                  via {formatSourceName(rec.source)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={styles.matchBadgeContainer}>
                            <span style={styles.matchScoreBadge}>{rec.match.score}% Match</span>
                            {totalRequirements > 0 && (
                              <span style={styles.matchRatioText}>
                                {rec.match.matchedCount} of {totalRequirements} matched
                              </span>
                            )}
                          </div>
                        </div>

                        {/* SKILLS CHIPS */}
                        <div style={styles.oppSkillsRow}>
                          {rec.opportunitySkills && rec.opportunitySkills.length > 0 ? (
                            rec.opportunitySkills.slice(0, 5).map((os) => {
                              const isMatched = matchedSkills.includes(os.skill.name);
                              return (
                                <span
                                  key={os.skillId}
                                  style={{
                                    ...styles.oppSkillChip,
                                    backgroundColor: isMatched ? '#f0fdf4' : '#f4f4f5',
                                    borderColor: isMatched ? '#bbf7d0' : '#e4e4e7',
                                    color: isMatched ? '#15803d' : '#52525b',
                                  }}
                                >
                                  {isMatched && <span style={styles.chipCheck}>✓</span>}
                                  {os.skill.name}
                                </span>
                              );
                            })
                          ) : (
                            <span style={styles.generalSkillNote}>General Engineering Role</span>
                          )}
                          {(rec.opportunitySkills?.length || 0) > 5 && (
                            <span style={styles.moreSkillsText}>+{(rec.opportunitySkills!.length - 5)} more</span>
                          )}
                        </div>

                        <div style={styles.oppFooter}>
                          <div style={styles.oppBadges}>
                            <Badge variant="neutral">{rec.type || 'Full Time'}</Badge>
                            {rec.experienceLevel && <Badge variant="neutral">{rec.experienceLevel}</Badge>}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/opportunities/${rec.id}`)}>
                            View opportunity →
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <div style={styles.oppsFooterLinkContainer}>
                    <Button variant="ghost" style={{ width: '100%' }} onClick={() => router.push('/opportunities')}>
                      Explore all opportunities →
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--error-border)',
    fontSize: '0.9375rem',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '0.375rem',
  },
  subtitle: {
    fontSize: '1.0625rem',
    color: 'var(--text-secondary)',
    fontWeight: 450,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1.25rem',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  kpiCardInner: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  kpiLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  kpiValueContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
  },
  kpiValue: {
    fontSize: '2.25rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 6fr)',
    gap: '1.75rem',
    alignItems: 'start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  cardItem: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  sectionTitle: {
    fontSize: '1.0625rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
    letterSpacing: '-0.015em',
  },
  sectionSubtext: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    marginTop: '0.125rem',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.875rem',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '0.875rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  completeStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    color: 'var(--success-text)',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  skillGapsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  skillGapItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0.875rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  skillGapMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  skillGapName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  skillGapBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#9a3412',
    backgroundColor: '#ffedd5',
    border: '1px solid #fed7aa',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
  skillGapMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  skillGapEmpty: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.75rem 0',
  },
  skillGapEmptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0.5rem 0',
    gap: '0.5rem',
  },
  emptyStateContainerCentered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3rem 1.5rem',
    gap: '1rem',
    flex: 1,
  },
  emptyStateIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    marginBottom: '0.25rem',
  },
  matchingPlaceholderIcon: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  emptyStateTitle: {
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptyStateText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    maxWidth: '320px',
  },
  recentProjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  recentProjectItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    paddingBottom: '0.875rem',
    borderBottom: '1px solid var(--border-light)',
  },
  recentProjectName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  recentProjectSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    alignItems: 'center',
  },
  moreSkillsText: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  oppsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flex: 1,
  },
  oppCardItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    padding: '1.25rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)',
    transition: 'border-color var(--transition-fast)',
  },
  oppHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  oppTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.015em',
  },
  oppOrgMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  oppOrg: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  oppDot: {
    color: 'var(--text-tertiary)',
  },
  oppWorkMode: {
    color: 'var(--accent-primary)',
    fontWeight: 500,
  },
  matchBadgeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem',
  },
  matchScoreBadge: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    lineHeight: 1,
  },
  matchRatioText: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  oppSkillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    alignItems: 'center',
  },
  oppSkillChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 550,
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid',
  },
  chipCheck: {
    fontSize: '0.6875rem',
    fontWeight: 700,
  },
  generalSkillNote: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  oppFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-light)',
    marginTop: '0.25rem',
  },
  oppBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  oppsFooterLinkContainer: {
    marginTop: 'auto',
    paddingTop: '0.5rem',
  },
};
