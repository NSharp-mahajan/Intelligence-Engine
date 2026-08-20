'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const userData = await fetchApi('/auth/me');
        setUser(userData);

        const profileData = await fetchApi('/profile');
        if (!profileData.profile) {
          router.push('/onboarding');
          return;
        }
        setProfile(profileData.profile);
      } catch (err: any) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) return null;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Profile</h1>
          <p style={styles.subtitle}>Manage your professional identity and evidence.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/onboarding')}>
          Edit Profile
        </Button>
      </header>

      <div style={styles.grid}>
        <Card style={styles.card}>
          <CardHeader>
            <h2 style={styles.sectionTitle}>Identity</h2>
          </CardHeader>
          <CardBody>
            <div style={styles.infoGrid}>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Full Name</span>
                <span style={styles.value}>{profile.fullName}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Email Address</span>
                <span style={styles.value}>{user?.email}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Target Role</span>
                <span style={styles.value}>{profile.targetRole}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <h2 style={styles.sectionTitle}>Education</h2>
          </CardHeader>
          <CardBody>
            <div style={styles.infoGrid}>
              <div style={styles.infoGroup}>
                <span style={styles.label}>University</span>
                <span style={styles.value}>{profile.university}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Graduation Year</span>
                <span style={styles.value}>{profile.graduationYear}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <h2 style={styles.sectionTitle}>Professional Links</h2>
          </CardHeader>
          <CardBody>
            <div style={styles.linkList}>
              {profile.githubUrl ? (
                <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={styles.linkItem}>
                  <span style={styles.linkLabel}>GitHub</span>
                  <span style={styles.linkUrl}>{profile.githubUrl}</span>
                </a>
              ) : (
                <div style={styles.linkItemEmpty}>
                  <span style={styles.linkLabel}>GitHub</span>
                  <span style={styles.linkEmptyText}>Not provided</span>
                </div>
              )}

              {profile.linkedinUrl ? (
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={styles.linkItem}>
                  <span style={styles.linkLabel}>LinkedIn</span>
                  <span style={styles.linkUrl}>{profile.linkedinUrl}</span>
                </a>
              ) : (
                <div style={styles.linkItemEmpty}>
                  <span style={styles.linkLabel}>LinkedIn</span>
                  <span style={styles.linkEmptyText}>Not provided</span>
                </div>
              )}

              {profile.portfolioUrl ? (
                <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={styles.linkItem}>
                  <span style={styles.linkLabel}>Portfolio</span>
                  <span style={styles.linkUrl}>{profile.portfolioUrl}</span>
                </a>
              ) : (
                <div style={styles.linkItemEmpty}>
                  <span style={styles.linkLabel}>Portfolio</span>
                  <span style={styles.linkEmptyText}>Not provided</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
    maxWidth: '900px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '2.5rem',
  },
  infoGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '1.0625rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  linkItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  linkItemEmpty: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px dashed var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  linkLabel: {
    width: '120px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  linkUrl: {
    fontSize: '0.9375rem',
    color: 'var(--accent-primary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  linkEmptyText: {
    fontSize: '0.9375rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  }
};
