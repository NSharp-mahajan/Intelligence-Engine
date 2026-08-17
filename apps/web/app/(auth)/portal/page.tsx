'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';

export default function PortalOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { profile } = await fetchApi('/profile');
        setProfile(profile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return null; // handled by layout spinner ideally, but keep clean

  const isProfileComplete = profile && profile.fullName && profile.university && profile.targetRole;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Overview</h1>
        <p style={styles.subtitle}>Welcome back. Here is your current status.</p>
      </header>

      <div style={styles.grid}>
        {/* PROFILE STATUS */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Profile Status</h2>
          {isProfileComplete ? (
            <div style={styles.statusBoxSuccess}>
              <div style={styles.statusIcon}>✓</div>
              <div>
                <strong style={styles.statusText}>Profile Complete</strong>
                <p style={styles.statusDesc}>Your foundational identity is set up.</p>
              </div>
            </div>
          ) : (
            <div style={styles.statusBoxWarning}>
              <div style={styles.statusIconWarning}>!</div>
              <div>
                <strong style={styles.statusTextWarning}>Profile Incomplete</strong>
                <p style={styles.statusDescWarning}>Please complete your onboarding to receive accurate matches.</p>
                <Link href="/onboarding" style={styles.actionLink}>Complete Profile &rarr;</Link>
              </div>
            </div>
          )}
        </section>

        {/* PROJECTS */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Projects & Evidence</h2>
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No projects added yet.</p>
            <span style={styles.disabledLink}>Add Project (Coming Soon)</span>
          </div>
        </section>

        {/* SKILLS */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Verified Skills</h2>
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No skills logged yet.</p>
            <span style={styles.disabledLink}>Add Skills (Coming Soon)</span>
          </div>
        </section>

        {/* OPPORTUNITIES */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Matched Opportunities</h2>
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No opportunities yet.</p>
            <span style={styles.disabledLink}>View Feed (Coming Soon)</span>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  header: {
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#52525b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#1a1a1a',
  },
  statusBoxSuccess: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
  },
  statusIcon: {
    backgroundColor: '#16a34a',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.875rem',
  },
  statusText: {
    color: '#166534',
    display: 'block',
    marginBottom: '0.25rem',
  },
  statusDesc: {
    color: '#15803d',
    fontSize: '0.875rem',
  },
  statusBoxWarning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#fff7ed',
    borderRadius: '8px',
    border: '1px solid #ffedd5',
  },
  statusIconWarning: {
    backgroundColor: '#ea580c',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.875rem',
  },
  statusTextWarning: {
    color: '#9a3412',
    display: 'block',
    marginBottom: '0.25rem',
  },
  statusDescWarning: {
    color: '#c2410c',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
  },
  actionLink: {
    color: '#ea580c',
    fontWeight: '600',
    fontSize: '0.875rem',
    textDecoration: 'none',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 0',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#a1a1aa',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  disabledLink: {
    color: '#d4d4d8',
    fontWeight: '500',
    fontSize: '0.875rem',
    cursor: 'not-allowed',
  }
};
