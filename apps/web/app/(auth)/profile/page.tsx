'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { Profile, ProfileResponse, User } from '../../../lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    university: '',
    graduationYear: '',
    targetRole: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      // Step 1: Auth check
      let userData: User;
      try {
        userData = await fetchApi<User>('/auth/me');
        if (!cancelled) setUser(userData);
      } catch {
        if (!cancelled) router.replace('/login');
        return;
      }

      // Step 2: Profile check - specifically handle 404 PROFILE_NOT_FOUND
      try {
        const profileData = await fetchApi<ProfileResponse>('/profile');
        if (!profileData.profile) {
          if (!cancelled) router.replace('/onboarding');
          return;
        }
        if (!cancelled) {
          setProfile(profileData.profile);
          setFormData(toFormData(profileData.profile));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('not been created') || msg.includes('PROFILE_NOT_FOUND')) {
          if (!cancelled) router.replace('/onboarding');
        } else {
          if (!cancelled) setError('Unable to load your profile. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [router]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const graduationYear = formData.graduationYear ? Number(formData.graduationYear) : null;
    if (graduationYear !== null && (!Number.isInteger(graduationYear) || graduationYear < 1950 || graduationYear > 2100)) {
      setError('Graduation year must be between 1950 and 2100.');
      return;
    }

    for (const [label, value] of [['GitHub', formData.githubUrl], ['LinkedIn', formData.linkedinUrl], ['Portfolio', formData.portfolioUrl]] as const) {
      if (value) {
        try {
          new URL(value);
        } catch {
          setError(`${label} must be a valid URL.`);
          return;
        }
      }
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetchApi<ProfileResponse>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          university: formData.university.trim() || null,
          graduationYear,
          targetRole: formData.targetRole.trim() || null,
          githubUrl: formData.githubUrl.trim() || null,
          linkedinUrl: formData.linkedinUrl.trim() || null,
          portfolioUrl: formData.portfolioUrl.trim() || null,
        }),
      });
      setProfile(response.profile);
      setFormData(toFormData(response.profile));
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading your profile...</div>;
  if (!profile) return <div style={styles.errorAlert}>{error || 'Unable to load your profile.'}</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Profile</h1>
          <p style={styles.subtitle}>Manage your professional identity and evidence.</p>
        </div>
        {!editing && <Button variant="outline" onClick={() => { setError(''); setEditing(true); }}>Edit Profile</Button>}
      </header>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {editing ? (
        <Card style={styles.card}>
          <CardHeader><h2 style={styles.sectionTitle}>Edit Profile</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSave} style={styles.form}>
              <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
              <Input label="University / Institution" name="university" value={formData.university} onChange={handleChange} />
              <Input label="Graduation Year" name="graduationYear" type="number" value={formData.graduationYear} onChange={handleChange} />
              <Input label="Target Role" name="targetRole" value={formData.targetRole} onChange={handleChange} />
              <Input label="GitHub URL" name="githubUrl" type="url" value={formData.githubUrl} onChange={handleChange} />
              <Input label="LinkedIn URL" name="linkedinUrl" type="url" value={formData.linkedinUrl} onChange={handleChange} />
              <Input label="Portfolio URL" name="portfolioUrl" type="url" value={formData.portfolioUrl} onChange={handleChange} />
              <div style={styles.formActions}>
                <Button type="button" variant="ghost" onClick={() => { setFormData(toFormData(profile)); setEditing(false); }} disabled={saving}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (

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
      )}
    </div>
  );
}

function toFormData(profile: Profile) {
  return {
    fullName: profile.fullName || '',
    university: profile.university || '',
    graduationYear: profile.graduationYear?.toString() || '',
    targetRole: profile.targetRole || '',
    githubUrl: profile.githubUrl || '',
    linkedinUrl: profile.linkedinUrl || '',
    portfolioUrl: profile.portfolioUrl || '',
  };
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
  loading: {
    minHeight: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
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
