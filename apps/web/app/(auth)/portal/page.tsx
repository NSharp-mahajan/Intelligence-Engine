'use client';

import { useEffect, useState } from 'react';
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

  if (loading) return null;

  const isProfileComplete = profile && profile.fullName && profile.university && profile.targetRole;
  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Candidate';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{getGreeting()}, {firstName}</h1>
        <p style={styles.subtitle}>Your career intelligence overview.</p>
      </header>

      {/* KPI METRICS */}
      <div style={styles.kpiGrid}>
        <Card>
          <CardBody style={styles.kpiCardBody}>
            <span style={styles.kpiLabel}>PROFILE READINESS</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{isProfileComplete ? '100%' : '50%'}</span>
              <Badge variant={isProfileComplete ? 'success' : 'warning'}>
                {isProfileComplete ? 'Ready' : 'Incomplete'}
              </Badge>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody style={styles.kpiCardBody}>
            <span style={styles.kpiLabel}>VERIFIED SKILLS</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{skillsCount}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody style={styles.kpiCardBody}>
            <span style={styles.kpiLabel}>PROJECT EVIDENCE</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>{projectsCount}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody style={styles.kpiCardBody}>
            <span style={styles.kpiLabel}>MATCHED OPPORTUNITIES</span>
            <div style={styles.kpiValueContainer}>
              <span style={styles.kpiValue}>0</span>
            </div>
          </CardBody>
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
                <span style={styles.infoLabel}>Profile Completeness</span>
                <span style={styles.infoValue}>{isProfileComplete ? 'All core fields provided' : 'Missing core fields'}</span>
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
              <h2 style={styles.sectionTitle}>Recent Evidence</h2>
            </CardHeader>
            <CardBody>
              {recentProjects.length === 0 ? (
                <div style={styles.emptyStateContainer}>
                  <h3 style={styles.emptyStateTitle}>No project evidence yet.</h3>
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
                        {project.projectSkills?.slice(0, 3).map((ps: any) => (
                          <Badge key={ps.skillId} variant="neutral">{ps.skill.name}</Badge>
                        ))}
                        {(project.projectSkills?.length || 0) > 3 && (
                          <span style={styles.moreSkillsText}>+{(project.projectSkills.length - 3)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Button variant="outline" onClick={() => router.push('/evidence')}>View All Evidence</Button>
                  </div>
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
            <CardBody style={styles.emptyStateContainer}>
              <div style={styles.matchingPlaceholderIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h3 style={styles.emptyStateTitle}>No opportunities analyzed.</h3>
              <p style={styles.emptyStateText}>
                The matching engine requires both verified skills and project evidence to evaluate your fit against the current market.
              </p>
              <Button variant="primary" disabled>View Opportunities</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2.5rem',
  },
  header: {
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#52525b',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  kpiCardBody: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  kpiValueContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: 1,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f4f4f5',
    marginBottom: '1rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#52525b',
  },
  infoValue: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#1a1a1a',
  },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    gap: '1rem',
    height: '100%',
  },
  matchingPlaceholderIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  emptyStateTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  emptyStateText: {
    fontSize: '0.9375rem',
    color: '#52525b',
    lineHeight: 1.6,
    maxWidth: '300px',
    marginBottom: '1rem',
  },
  recentProjectsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  recentProjectItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f4f4f5',
  },
  recentProjectName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  recentProjectSkills: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    alignItems: 'center',
  },
  moreSkillsText: {
    fontSize: '0.75rem',
    color: '#a1a1aa',
    fontWeight: 500,
  }
};
