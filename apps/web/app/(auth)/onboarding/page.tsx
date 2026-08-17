'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    university: '',
    graduationYear: new Date().getFullYear(),
    targetRole: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  useEffect(() => {
    // 1. Check auth and existing profile
    async function init() {
      try {
        // me
        await fetchApi('/auth/me');
        
        // profile
        const { profile } = await fetchApi('/profile');
        if (profile) {
          setFormData({
            fullName: profile.fullName || '',
            university: profile.university || '',
            graduationYear: profile.graduationYear || new Date().getFullYear(),
            targetRole: profile.targetRole || '',
            githubUrl: profile.githubUrl || '',
            linkedinUrl: profile.linkedinUrl || '',
            portfolioUrl: profile.portfolioUrl || '',
          });
        }
      } catch (err: any) {
        if (err.message.includes('Unauthorized') || err.message.includes('No session')) {
          router.push('/login');
          return;
        }
      } finally {
        setLoadingInitial(false);
      }
    }
    init();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'graduationYear' ? parseInt(value) || '' : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    try {
      await fetchApi('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...formData,
          githubUrl: formData.githubUrl || undefined,
          linkedinUrl: formData.linkedinUrl || undefined,
          portfolioUrl: formData.portfolioUrl || undefined,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Tell us about yourself</h1>
        
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>Profile saved successfully! Redirecting...</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                style={styles.input}
                placeholder="Jane Doe"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>University *</label>
              <input
                name="university"
                required
                value={formData.university}
                onChange={handleChange}
                style={styles.input}
                placeholder="State University"
              />
            </div>

            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Graduation Year *</label>
                <input
                  name="graduationYear"
                  type="number"
                  min="1950"
                  max="2100"
                  required
                  value={formData.graduationYear}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Target Role *</label>
                <input
                  name="targetRole"
                  required
                  value={formData.targetRole}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Software Engineer"
                />
              </div>
            </div>
          </div>

          <div style={styles.sectionTitle}>Optional Links</div>
          <div style={styles.section}>
            <div style={styles.field}>
              <label style={styles.label}>GitHub</label>
              <input
                name="githubUrl"
                type="url"
                value={formData.githubUrl}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://github.com/username"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>LinkedIn</label>
              <input
                name="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Portfolio</label>
              <input
                name="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting || success} style={styles.button}>
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
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
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginTop: '1.5rem',
    marginBottom: '1rem',
    color: '#52525b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  fieldRow: {
    display: 'flex',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    flex: 1,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    fontSize: '1rem',
  },
  button: {
    padding: '0.875rem',
    backgroundColor: '#16a34a', // Green functional accent for success actions
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  error: {
    padding: '1rem',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  success: {
    padding: '1rem',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  loading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#52525b',
  }
};
