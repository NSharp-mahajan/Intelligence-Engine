'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type {
  CandidateSkillsResponse,
  DashboardResponse,
  Profile,
  ProfileResponse,
  Project,
  ProjectsResponse,
} from '../../../lib/types';

export default function PortalOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [skillsCount, setSkillsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, skillsRes, projectsRes, dashboardRes] = await Promise.all([
          fetchApi<ProfileResponse>('/profile').catch(() => null),
          fetchApi<CandidateSkillsResponse>('/profile/skills').catch(() => null),
          fetchApi<ProjectsResponse>('/profile/projects').catch(() => null),
          fetchApi<DashboardResponse>('/dashboard').catch(() => null),
        ]);
        
        setProfile(profileRes?.profile || null);
        setProfileComplete(profileRes?.profileComplete || dashboardRes?.profileComplete || false);
        setSkillsCount(skillsRes?.candidateSkills?.length || dashboardRes?.metrics.skillsCount || 0);
        
        const projects = projectsRes?.projects || [];
        setProjectsCount(projects.length || dashboardRes?.metrics.projectsCount || 0);
        setRecentProjects(projects.slice(0, 3)); // Top 3 recent
        setDashboard(dashboardRes || null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load your dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading your dashboard...</div>;
  if (error) return <div style={styles.errorAlert}>{error}</div>;

  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Candidate';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const matchedCount = dashboard?.metrics.matchedOpportunitiesCount ?? 0;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>{getGreeting()}, {firstName}</h1>
        <p style={styles.subtitle}>Your career intelligence overview.</p>
      </header>

      {/* KPI METRICS */}
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
            <span style={styles.kpiLabel}>VERIFIED SKILLS</span>
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
            <span style={styles.kpiLabel}>MATCHED OPPORTUNITIES</span>
            <div style={styles.kpiValueContainer}>
              <span style={{
                ...styles.kpiValue as React.CSSProperties,
                color: matchedCount > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)'
              }}>
                {matchedCount}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div style={styles.mainGrid}>
        {/* LEFT COLUMN: Career Direction & Recent Evidence */}
        <div style={styles.leftCol}>
          <Card style={{ marginBottom: '2rem' }}>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                      All core fields provided
                    </span>
                  ) : (
                    <span style={{ color: '#b45309' }}>Missing core fields</span>
                  )}
                </span>
              </div>
              {!profileComplete && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Button variant="outline" onClick={() => router.push('/onboarding')}>Complete Profile</Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.sectionTitle}>Recent Evidence</h2>
                {recentProjects.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => router.push('/evidence')}>View all</Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {recentProjects.length === 0 ? (
                <div style={styles.emptyStateContainer}>
                  <div style={styles.emptyStateIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>No project evidence yet</h3>
                  <p style={styles.emptyStateText}>
                    Add your first project so Career Intelligence can begin evaluating your technical evidence.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/evidence')}>Add Project</Button>
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

        {/* RIGHT COLUMN: Recommended Opportunities & Skill Gaps */}
        <div style={styles.rightCol}>
          {/* 1. Recommended Opportunities */}
          <Card style={{ marginBottom: '2rem' }}>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.sectionTitle}>Recommended Opportunities</h2>
                {dashboard?.recommendations && dashboard.recommendations.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => router.push('/opportunities?sort=match_desc')}>
                    View all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {!dashboard || !dashboard.hasProfile ? (
                <div style={styles.emptyStateContainerCentered}>
                  <div style={styles.matchingPlaceholderIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>Profile Required</h3>
                  <p style={styles.emptyStateText}>
                    Complete your candidate profile to enable personalized opportunity recommendations.
                  </p>
                  <Button variant="primary" onClick={() => router.push('/onboarding')}>Complete Profile</Button>
                </div>
              ) : !dashboard.hasSkillsOrEvidence ? (
                <div style={styles.emptyStateContainerCentered}>
                  <div style={styles.matchingPlaceholderIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>Add Skills & Evidence</h3>
                  <p style={styles.emptyStateText}>
                    Adding your skills and project evidence will enable personalized opportunity matching.
                  </p>
                  <Button variant="primary" onClick={() => router.push('/evidence')}>Add Skills & Projects</Button>
                </div>
              ) : !dashboard.hasStructuredOpportunities ? (
                <div style={styles.emptyStateContainerCentered}>
                  <div style={styles.matchingPlaceholderIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>No Structured Opportunities</h3>
                  <p style={styles.emptyStateText}>
                    No structured opportunities are currently available for personalized recommendations.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/opportunities')}>Browse All Opportunities</Button>
                </div>
              ) : dashboard.recommendations.length === 0 ? (
                <div style={styles.emptyStateContainerCentered}>
                  <div style={styles.matchingPlaceholderIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <h3 style={styles.emptyStateTitle}>No Matching Opportunities</h3>
                  <p style={styles.emptyStateText}>
                    No opportunities currently match your verified skills. Try adding additional skills or project evidence to discover matching roles.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/opportunities')}>Explore Opportunities</Button>
                </div>
              ) : (
                <div style={styles.recList}>
                  {dashboard.recommendations.map(rec => (
                    <div key={rec.id} style={styles.recItem} className="dash-rec-card">
                      <div style={styles.recTopRow}>
                        <Link href={`/opportunities/${rec.id}`} style={styles.recTitle} className="dash-rec-link">
                          {rec.title}
                        </Link>
                        <div style={styles.matchPill}>
                          <span style={styles.matchScore}>{rec.match.score}% Match</span>
                        </div>
                      </div>

                      <div style={styles.recMetaRow}>
                        <span style={styles.recCompany}>{rec.organization}</span>
                        {rec.location && (
                          <>
                            <span style={styles.recSep}>·</span>
                            <span style={styles.recLocation}>{rec.location}</span>
                          </>
                        )}
                      </div>

                      <div style={styles.recFooterRow}>
                        <span style={styles.recStats}>
                          {rec.match.matchedCount} matched {rec.match.missingCount > 0 ? `· ${rec.match.missingCount} missing` : ''}
                        </span>
                        <Link href={`/opportunities/${rec.id}`} style={styles.viewLink} className="dash-rec-link">
                          View opportunity&nbsp;↗
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 2. Skill Gaps */}
          <Card>
            <CardHeader>
              <h2 style={styles.sectionTitle}>Your Skill Gaps</h2>
            </CardHeader>
            <CardBody>
              {!dashboard || !dashboard.hasProfile || !dashboard.hasSkillsOrEvidence ? (
                <p style={styles.skillGapNotice}>
                  Add verified skills and project evidence to identify high-value skill gaps across relevant opportunities.
                </p>
              ) : dashboard.skillGaps.length === 0 ? (
                <p style={styles.skillGapNotice}>
                  No skill gaps identified. Your technical evidence covers current structured requirements.
                </p>
              ) : (
                <div style={styles.skillGapList}>
                  {dashboard.skillGaps.map(gap => (
                    <div key={gap.skillId} style={styles.skillGapItem}>
                      <div style={styles.skillGapInfo}>
                        <span style={styles.skillGapName}>{gap.skillName}</span>
                        <span style={styles.skillGapMeta}>
                          Missing from {gap.opportunityCount} relevant {gap.opportunityCount === 1 ? 'opportunity' : 'opportunities'}
                        </span>
                      </div>
                      <Badge variant="warning">Missing</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .dash-rec-card {
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          }
          .dash-rec-card:hover {
            border-color: var(--border-dark);
            box-shadow: var(--shadow-sm);
          }
          .dash-rec-link:hover {
            color: var(--accent-hover);
            text-decoration: underline;
          }
        `
      }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--error-border)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
  },
  header: {
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.04em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-surface)',
  },
  kpiCardInner: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  kpiValueContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  kpiValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '1rem',
  },
  infoLabel: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  infoValue: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '1rem 0',
    gap: '0.5rem',
  },
  emptyStateContainerCentered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3rem 1.5rem',
    gap: '0.75rem',
  },
  emptyStateIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-surface-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    marginBottom: '0.5rem',
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
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyStateText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: '360px',
    margin: 0,
    marginBottom: '0.5rem',
  },
  recentProjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  recentProjectItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-light)',
  },
  recentProjectName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  recentProjectSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    alignItems: 'center',
  },
  moreSkillsText: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  recList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recItem: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  recTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: '1.35',
    textDecoration: 'none',
    flex: '1 1 auto',
  },
  matchPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    border: '1px solid rgba(234, 88, 12, 0.25)',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  matchScore: {
    fontWeight: 700,
    color: 'var(--accent-primary)',
  },
  recMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  recCompany: {
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  recSep: {
    color: 'var(--text-tertiary)',
    fontSize: '0.75rem',
  },
  recLocation: {
    color: 'var(--text-secondary)',
  },
  recFooterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '4px',
    fontSize: '0.8125rem',
  },
  recStats: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  viewLink: {
    color: 'var(--accent-primary)',
    fontWeight: 600,
    textDecoration: 'none',
  },
  skillGapNotice: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
    padding: '0.5rem 0',
  },
  skillGapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  skillGapItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    gap: '12px',
  },
  skillGapInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  skillGapName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  skillGapMeta: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
};
