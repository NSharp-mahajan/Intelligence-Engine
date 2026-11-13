'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, ApiError } from '../../../lib/api';
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
    degree: '',
    branch: '',
    cgpa: '',
    cgpaScale: '',
    percentage: '',
    activeBacklogs: '',
    hasBacklogHistory: '',
    experienceMonths: '',
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
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof ApiError && err.code === 'USER_NOT_MAPPED') {
            router.replace('/sync-profile');
          } else {
            router.replace('/login');
          }
        }
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    let parsedCgpa: number | null = null;
    if (formData.cgpa.trim()) {
      parsedCgpa = Number(formData.cgpa);
      if (Number.isNaN(parsedCgpa) || parsedCgpa < 0) {
        setError('CGPA cannot be negative.');
        return;
      }
      if (!formData.cgpaScale) {
        setError('Please select a CGPA scale if CGPA is entered.');
        return;
      }
      if (formData.cgpaScale === 'SCALE_4_0' && parsedCgpa > 4.0) {
        setError('CGPA cannot exceed 4.0 for a 4-point scale.');
        return;
      }
      if (formData.cgpaScale === 'SCALE_7_0' && parsedCgpa > 7.0) {
        setError('CGPA cannot exceed 7.0 for a 7-point scale.');
        return;
      }
      if (formData.cgpaScale === 'SCALE_10_0' && parsedCgpa > 10.0) {
        setError('CGPA cannot exceed 10.0 for a 10-point scale.');
        return;
      }
    }

    let parsedPercentage: number | null = null;
    if (formData.percentage.trim()) {
      parsedPercentage = Number(formData.percentage);
      if (Number.isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
        setError('Percentage must be between 0 and 100.');
        return;
      }
    }

    let parsedBacklogs: number | null = null;
    if (formData.activeBacklogs.trim()) {
      parsedBacklogs = Number(formData.activeBacklogs);
      if (!Number.isInteger(parsedBacklogs) || parsedBacklogs < 0) {
        setError('Active backlogs count must be a non-negative integer.');
        return;
      }
    }

    let parsedExperience: number | null = null;
    if (formData.experienceMonths.trim()) {
      parsedExperience = Number(formData.experienceMonths);
      if (!Number.isInteger(parsedExperience) || parsedExperience < 0) {
        setError('Total experience (months) must be a non-negative integer.');
        return;
      }
    }

    const hasBacklogHistory = formData.hasBacklogHistory === 'true' ? true : formData.hasBacklogHistory === 'false' ? false : null;

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
          degree: formData.degree.trim() || null,
          branch: formData.branch.trim() || null,
          cgpa: parsedCgpa,
          cgpaScale: formData.cgpaScale || null,
          percentage: parsedPercentage,
          activeBacklogs: parsedBacklogs,
          hasBacklogHistory,
          experienceMonths: parsedExperience,
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
              <h3 style={styles.formSubtitle}>Identity</h3>
              <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
              <Input label="Target Role" name="targetRole" value={formData.targetRole} onChange={handleChange} placeholder="e.g. Software Engineer" />

              <h3 style={styles.formSubtitle}>Academic Details (Optional)</h3>
              <p style={styles.formHelperText}>
                Used by the engine to evaluate your eligibility for early career, fresher, and graduate trainee roles.
              </p>
              <Input label="University / Institution" name="university" value={formData.university} onChange={handleChange} placeholder="e.g. Stanford University or IIT Bombay" />
              
              <div style={styles.twoColumnGrid}>
                <Input label="Degree" name="degree" value={formData.degree} onChange={handleChange} placeholder="e.g. B.Tech, B.E., BCA, M.Tech" />
                <Input label="Branch / Specialization" name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Computer Science, IT, ECE" />
              </div>

              <Input label="Graduation Year" name="graduationYear" type="number" value={formData.graduationYear} onChange={handleChange} placeholder="e.g. 2026" />

              <div style={styles.twoColumnGrid}>
                <Input label="CGPA" name="cgpa" type="number" step="0.01" value={formData.cgpa} onChange={handleChange} placeholder="e.g. 8.50" />
                <div style={styles.selectGroup}>
                  <label style={styles.selectLabel}>
                    CGPA Scale {formData.cgpa ? <span style={{ color: 'var(--error-text)' }}>*</span> : '(Optional)'}
                  </label>
                  <select
                    name="cgpaScale"
                    value={formData.cgpaScale}
                    onChange={handleChange}
                    style={styles.selectInput}
                  >
                    <option value="">-- Select Scale --</option>
                    <option value="SCALE_10_0">10.0 Scale (e.g. Indian Universities)</option>
                    <option value="SCALE_4_0">4.0 Scale (e.g. US / International)</option>
                    <option value="SCALE_7_0">7.0 Scale</option>
                    <option value="SCALE_UNKNOWN">Other / Unknown Scale</option>
                  </select>
                </div>
              </div>

              <div style={styles.twoColumnGrid}>
                <Input label="Percentage (%)" name="percentage" type="number" step="0.1" value={formData.percentage} onChange={handleChange} placeholder="e.g. 78.5" />
                <Input label="Active Backlogs Count" name="activeBacklogs" type="number" value={formData.activeBacklogs} onChange={handleChange} placeholder="e.g. 0" />
              </div>

              <div style={styles.selectGroup}>
                <label style={styles.selectLabel}>Backlog History</label>
                <select
                  name="hasBacklogHistory"
                  value={formData.hasBacklogHistory}
                  onChange={handleChange}
                  style={styles.selectInput}
                >
                  <option value="">-- Select Backlog History --</option>
                  <option value="false">No, never had any backlogs</option>
                  <option value="true">Yes, have had backlogs in the past (cleared or active)</option>
                </select>
                <span style={styles.fieldNote}>
                  Distinct from active backlogs: some employers accept cleared past backlogs while others require zero history.
                </span>
              </div>

              <h3 style={styles.formSubtitle}>Experience (Optional)</h3>
              <Input
                label="Total Relevant Experience (in Months)"
                name="experienceMonths"
                type="number"
                value={formData.experienceMonths}
                onChange={handleChange}
                placeholder="e.g. 0 for freshers, 6 for 6 months, 12 for 1 year"
              />

              <h3 style={styles.formSubtitle}>Professional Links</h3>
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
                <span style={styles.value}>{user?.email || 'Not provided'}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Target Role</span>
                <span style={styles.value}>{profile.targetRole || 'Not provided'}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <h2 style={styles.sectionTitle}>Academic Information</h2>
          </CardHeader>
          <CardBody>
            <div style={styles.infoGrid}>
              <div style={styles.infoGroup}>
                <span style={styles.label}>University / Institution</span>
                <span style={styles.value}>{profile.university || 'Not provided'}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Degree</span>
                <span style={styles.value}>{profile.degree || 'Not provided'}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Branch / Specialization</span>
                <span style={styles.value}>{profile.branch || 'Not provided'}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Graduation Year</span>
                <span style={styles.value}>{profile.graduationYear ?? 'Not provided'}</span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>CGPA</span>
                <span style={styles.value}>
                  {profile.cgpa !== null && profile.cgpa !== undefined
                    ? `${profile.cgpa} (${formatScale(profile.cgpaScale)})`
                    : 'Not provided'}
                </span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Percentage</span>
                <span style={styles.value}>
                  {profile.percentage !== null && profile.percentage !== undefined
                    ? `${profile.percentage}%`
                    : 'Not provided'}
                </span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Active Backlogs</span>
                <span style={styles.value}>
                  {profile.activeBacklogs !== null && profile.activeBacklogs !== undefined
                    ? profile.activeBacklogs.toString()
                    : 'Not provided'}
                </span>
              </div>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Backlog History</span>
                <span style={styles.value}>
                  {profile.hasBacklogHistory === true
                    ? 'Yes (Has backlog history)'
                    : profile.hasBacklogHistory === false
                    ? 'No (Clean academic record)'
                    : 'Not provided'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={styles.card}>
          <CardHeader>
            <h2 style={styles.sectionTitle}>Experience Information</h2>
          </CardHeader>
          <CardBody>
            <div style={styles.infoGrid}>
              <div style={styles.infoGroup}>
                <span style={styles.label}>Total Relevant Experience</span>
                <span style={styles.value}>
                  {profile.experienceMonths !== null && profile.experienceMonths !== undefined
                    ? `${profile.experienceMonths} month${profile.experienceMonths === 1 ? '' : 's'}${profile.experienceMonths >= 12 ? ` (${(profile.experienceMonths / 12).toFixed(1)} yr)` : ''}`
                    : 'Not provided'}
                </span>
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

function formatScale(scale?: string | null): string {
  switch (scale) {
    case 'SCALE_10_0': return '10.0 Scale';
    case 'SCALE_4_0': return '4.0 Scale';
    case 'SCALE_7_0': return '7.0 Scale';
    case 'SCALE_UNKNOWN': return 'Unknown Scale';
    default: return 'Scale Unspecified';
  }
}

function toFormData(profile: Profile) {
  return {
    fullName: profile.fullName || '',
    university: profile.university || '',
    graduationYear: profile.graduationYear?.toString() || '',
    targetRole: profile.targetRole || '',
    degree: profile.degree || '',
    branch: profile.branch || '',
    cgpa: profile.cgpa !== null && profile.cgpa !== undefined ? profile.cgpa.toString() : '',
    cgpaScale: profile.cgpaScale || '',
    percentage: profile.percentage !== null && profile.percentage !== undefined ? profile.percentage.toString() : '',
    activeBacklogs: profile.activeBacklogs !== null && profile.activeBacklogs !== undefined ? profile.activeBacklogs.toString() : '',
    hasBacklogHistory: profile.hasBacklogHistory === true ? 'true' : profile.hasBacklogHistory === false ? 'false' : '',
    experienceMonths: profile.experienceMonths !== null && profile.experienceMonths !== undefined ? profile.experienceMonths.toString() : '',
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
  },
  formSubtitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: '0.75rem',
    marginBottom: '0.25rem',
  },
  formHelperText: {
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
    marginBottom: '0.5rem',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.75rem',
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    marginBottom: '1rem',
  },
  selectLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  selectInput: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    outline: 'none',
  },
  fieldNote: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
};
