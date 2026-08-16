'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../lib/api';

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

  const handleLogout = async () => {
    await fetchApi('/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Your Profile</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
        
        <div style={styles.infoGroup}>
          <div style={styles.label}>Full Name</div>
          <div style={styles.value}>{profile.fullName}</div>
        </div>

        <div style={styles.infoGroup}>
          <div style={styles.label}>Email Address</div>
          <div style={styles.value}>{user?.email}</div>
        </div>

        <div style={styles.infoGroup}>
          <div style={styles.label}>University</div>
          <div style={styles.value}>{profile.university}</div>
        </div>

        <div style={styles.rowGroup}>
          <div style={styles.infoGroup}>
            <div style={styles.label}>Graduation Year</div>
            <div style={styles.value}>{profile.graduationYear}</div>
          </div>
          <div style={styles.infoGroup}>
            <div style={styles.label}>Target Role</div>
            <div style={styles.value}>{profile.targetRole}</div>
          </div>
        </div>

        <div style={styles.links}>
          {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={styles.link}>GitHub</a>}
          {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={styles.link}>LinkedIn</a>}
          {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={styles.link}>Portfolio</a>}
        </div>

        <button onClick={() => router.push('/onboarding')} style={styles.editButton}>
          Edit Profile
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf9f6',
    color: '#1a1a1a',
    fontFamily: 'system-ui, sans-serif',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    padding: '2.5rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: '1rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    margin: 0,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    border: '1px solid #e5e5e5',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  infoGroup: {
    marginBottom: '1.5rem',
    flex: 1,
  },
  rowGroup: {
    display: 'flex',
    gap: '2rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#52525b',
    marginBottom: '0.25rem',
  },
  value: {
    fontSize: '1.125rem',
    fontWeight: '500',
  },
  links: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
    marginBottom: '2rem',
  },
  link: {
    color: '#ea580c',
    textDecoration: 'none',
    fontWeight: '600',
  },
  editButton: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#52525b',
  }
};
