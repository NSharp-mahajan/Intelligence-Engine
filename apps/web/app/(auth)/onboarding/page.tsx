'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

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
    async function init() {
      try {
        await fetchApi('/auth/me');
        const { profile } = await fetchApi('/profile');
        if (profile) {
          setHasExistingProfile(true);
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

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await fetchApi('/profile', {
        method: hasExistingProfile ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...formData,
          githubUrl: formData.githubUrl || undefined,
          linkedinUrl: formData.linkedinUrl || undefined,
          portfolioUrl: formData.portfolioUrl || undefined,
        }),
      });
      router.push('/portal');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Initializing Career Intelligence...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        
        {/* Progress Indicator */}
        <div style={styles.progressContainer}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.progressStepContainer}>
              <div style={{
                ...styles.progressNode,
                ...(step >= i ? styles.progressNodeActive : {}),
                ...(step === i ? styles.progressNodeCurrent : {})
              }}>
                {i}
              </div>
              <span style={{
                ...styles.progressLabel,
                ...(step >= i ? styles.progressLabelActive : {})
              }}>
                {i === 1 && 'Identity'}
                {i === 2 && 'Direction'}
                {i === 3 && 'Links'}
                {i === 4 && 'Evidence'}
              </span>
              {i < 4 && (
                <div style={{
                  ...styles.progressLine,
                  ...(step > i ? styles.progressLineActive : {})
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={styles.formCard}>
          {error && <div style={styles.errorAlert}>{error}</div>}

          {step === 1 && (
            <div className="animate-fade-in">
              <h2 style={styles.stepTitle}>Who are you?</h2>
              <p style={styles.stepSubtitle}>Let's start with your basic identity and educational background.</p>
              
              <div style={styles.formGroup}>
                <Input 
                  label="Full Name" 
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleChange} 
                  placeholder="Jane Doe" 
                />
                <Input 
                  label="University" 
                  name="university" 
                  value={formData.university} 
                  onChange={handleChange} 
                  placeholder="Stanford University" 
                />
                <Input 
                  label="Graduation Year" 
                  name="graduationYear" 
                  type="number" 
                  value={formData.graduationYear} 
                  onChange={handleChange} 
                  min={1950} 
                  max={2100} 
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={styles.stepTitle}>Where are you going?</h2>
              <p style={styles.stepSubtitle}>Define your target role so the matching engine can evaluate your evidence against the right market requirements.</p>
              
              <div style={styles.formGroup}>
                <Input 
                  label="Target Role" 
                  name="targetRole" 
                  value={formData.targetRole} 
                  onChange={handleChange} 
                  placeholder="Software Engineering Intern" 
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 style={styles.stepTitle}>Connect your networks</h2>
              <p style={styles.stepSubtitle}>Provide links to your professional presence.</p>
              
              <div style={styles.formGroup}>
                <Input 
                  label="GitHub URL (Optional)" 
                  name="githubUrl" 
                  type="url" 
                  value={formData.githubUrl} 
                  onChange={handleChange} 
                  placeholder="https://github.com/username" 
                />
                <Input 
                  label="LinkedIn URL (Optional)" 
                  name="linkedinUrl" 
                  type="url" 
                  value={formData.linkedinUrl} 
                  onChange={handleChange} 
                  placeholder="https://linkedin.com/in/username" 
                />
                <Input 
                  label="Portfolio URL (Optional)" 
                  name="portfolioUrl" 
                  type="url" 
                  value={formData.portfolioUrl} 
                  onChange={handleChange} 
                  placeholder="https://yourwebsite.com" 
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 style={styles.stepTitle}>You're ready to build evidence</h2>
              <p style={styles.stepSubtitle}>
                Your core profile is complete. Once inside, you will connect your verified skills and upload your project evidence so the engine can begin deterministic matching.
              </p>
              
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-dark)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.25rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Secure & Private</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Your evidence is private to you. The matching engine evaluates your data securely to provide career intelligence.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={styles.footer}>
            <div style={{ visibility: step > 1 ? 'visible' : 'hidden' }}>
              <Button variant="ghost" onClick={handleBack} disabled={submitting}>Back</Button>
            </div>
            <div>
              {step < 4 ? (
                <Button variant="primary" onClick={handleNext}>Continue</Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Initializing portal...' : 'Enter Career Intelligence'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  spinner: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3rem',
    position: 'relative',
    padding: '0 1rem',
  },
  progressStepContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  progressNode: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-surface)',
    border: '2px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    transition: 'all var(--transition-normal)',
  },
  progressNodeActive: {
    borderColor: 'var(--text-primary)',
    color: 'var(--text-primary)',
  },
  progressNodeCurrent: {
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    borderColor: 'var(--text-primary)',
    boxShadow: '0 0 0 4px var(--bg-surface-hover)',
  },
  progressLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    position: 'absolute',
    top: '36px',
    whiteSpace: 'nowrap',
    transition: 'color var(--transition-normal)',
  },
  progressLabelActive: {
    color: 'var(--text-primary)',
  },
  progressLine: {
    position: 'absolute',
    top: '14px',
    left: '28px',
    height: '2px',
    width: 'calc(600px / 3 - 28px)', // rough approx for flex spacing
    backgroundColor: 'var(--border-light)',
    zIndex: 1,
    transition: 'background-color var(--transition-normal)',
  },
  progressLineActive: {
    backgroundColor: 'var(--text-primary)',
  },
  formCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '3rem',
    boxShadow: 'var(--shadow-float)',
    border: '1px solid var(--border-light)',
  },
  stepTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    letterSpacing: '-0.03em',
  },
  stepSubtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    marginBottom: '2.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid var(--border-light)',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    marginBottom: '2rem',
  }
};
