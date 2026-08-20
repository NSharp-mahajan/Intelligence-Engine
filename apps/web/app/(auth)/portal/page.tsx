'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export default function PortalOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [skillsCount, setSkillsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, skillsRes, projectsRes] = await Promise.all([
          fetchApi('/profile').catch(() => ({ profile: null })),
          fetchApi('/profile/skills').catch(() => ({ candidateSkills: [] })),
          fetchApi('/profile/projects').catch(() => ({ projects: [] }))
        ]);
        
        setProfile(profileRes?.profile || null);
        setSkillsCount(skillsRes?.candidateSkills?.length || 0);
        
        const projects = projectsRes?.projects || [];
        setProjectsCount(projects.length);
        setRecentProjects(projects.slice(0, 3)); // Top 3 recent
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return null; // Can replace with a skeleton loader

  const isProfileComplete = profile && profile.fullName && profile.university && profile.targetRole;
  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Candidate';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
            <span style={styles.kpiLabel}>PROFILE READINESS</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{isProfileComplete ? '100%' : '50%'}</span>
              <Badge variant={isProfileComplete ? 'success' : 'warning'}>
                {isProfileComplete ? 'Ready' : 'Incomplete'}
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
              <span style={{ ...styles.kpiValue as React.CSSProperties, color: 'var(--text-tertiary)' }}>0</span>
            </div>
          </div>
        </Card>
      </div>

      <div style={styles.mainGrid}>
        {/* LEFT COLUMN */}
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
                  {isProfileComplete ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                      All core fields provided
                    </span>
                  ) : (
                    <span style={{ color: '#b45309' }}>Missing core fields</span>
                  )}
                </span>
              </div>
              {!isProfileComplete && (
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
                    Add your first project so Career Intelligence can begin evaluating your technical capabilities.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/evidence')}>Add Project</Button>
                </div>
              ) : (
                <div style={styles.recentProjectsList}>
                  {recentProjects.map(project => (
                    <div key={project.id} style={styles.recentProjectItem}>
                      <span style={styles.recentProjectName}>{project.name}</span>
                      <div style={styles.recentProjectSkills}>
                        {project.projectSkills?.slice(0, 4).map((ps: any) => (
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

        {/* RIGHT COLUMN */}
        <div style={styles.rightCol}>
          <Card style={{ height: '100%' }}>
            <CardHeader>
              <h2 style={styles.sectionTitle}>Opportunity Matching</h2>
            </CardHeader>
            <CardBody style={styles.emptyStateContainerCentered}>
              <div style={styles.matchingPlaceholderIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h3 style={styles.emptyStateTitle}>Matching Engine Paused</h3>
              <p style={styles.emptyStateText}>
                The intelligence engine requires both verified skills and project evidence to evaluate your fit against the current market. Add evidence to begin analysis.
              </p>
              <Button variant="primary" disabled>View Opportunities</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    padding: '4rem 2rem',
    gap: '1rem',
    height: '100%',
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
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  emptyStateTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptyStateText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: '350px',
    marginBottom: '1rem',
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
  }
};
