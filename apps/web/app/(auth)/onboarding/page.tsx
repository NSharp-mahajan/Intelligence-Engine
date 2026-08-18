'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardBody } from '../../../components/ui/Card';

export default function OnboardingPage() {
  const router = useRouter();
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

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
        <div style={styles.spinner}>Loading workspace...</div>
      </div>
    );
  }

  const steps = [
    { num: '01', title: 'Identity' },
    { num: '02', title: 'Career Direction' },
    { num: '03', title: 'Evidence' },
    { num: '04', title: 'Skills' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        
        <div style={styles.header}>
          <h1 style={styles.title}>Build your foundation</h1>
          <p style={styles.subtitle}>Let's establish your professional identity to begin matching.</p>
        </div>

        {/* Progress Indicator */}
        <div style={styles.progressContainer}>
          <div style={styles.progressCounter}>0{step} / 04</div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${(step / 4) * 100}%` }} />
          </div>
          <div style={styles.progressLabels}>
            {steps.map((s, i) => (
              <span key={s.num} style={step >= i + 1 ? styles.progressLabelActive : styles.progressLabel}>
                {s.title}
              </span>
            ))}
          </div>
        </div>

        <Card>
          <CardBody style={{ padding: '2.5rem' }}>
            {error && <div style={styles.errorAlert}>{error}</div>}

            {step === 1 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.stepTitle}>Core Identity</h2>
                <p style={styles.stepSubtitle}>How should employers address you and what is your academic background?</p>
                <div style={styles.formGrid}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Full Name" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Jane Doe" />
                  </div>
                  <Input label="University" name="university" required value={formData.university} onChange={handleChange} placeholder="State University" />
                  <Input label="Graduation Year" name="graduationYear" type="number" required value={formData.graduationYear} onChange={handleChange} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.stepTitle}>Career Direction</h2>
                <p style={styles.stepSubtitle}>What role are you actively preparing for?</p>
                <div style={styles.formGrid}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Target Role" name="targetRole" required value={formData.targetRole} onChange={handleChange} placeholder="e.g. Frontend Engineer, Product Manager" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.stepTitle}>Professional Evidence (Optional)</h2>
                <p style={styles.stepSubtitle}>Links to your public work. The matching engine relies heavily on tangible evidence.</p>
                <div style={styles.formGrid}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="GitHub Profile" name="githubUrl" type="url" value={formData.githubUrl} onChange={handleChange} placeholder="https://github.com/username" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="LinkedIn Profile" name="linkedinUrl" type="url" value={formData.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Portfolio Website" name="portfolioUrl" type="url" value={formData.portfolioUrl} onChange={handleChange} placeholder="https://yourwebsite.com" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.stepTitle}>Skills & Background</h2>
                <p style={styles.stepSubtitle}>Establish the technical foundation you bring to the table.</p>
                
                <div style={styles.infoBox}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#1a1a1a' }}>Notice: Pending Backend Integration</strong>
                  <p style={{ margin: 0, color: '#52525b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    The backend API schema for individual CandidateSkill extraction and mapping is currently being developed. 
                    Once deployed, you will be able to granularly select your languages, frameworks, and proficiencies here. 
                  </p>
                </div>
                
                <p style={{ marginTop: '2rem', fontSize: '1rem', fontWeight: 600, color: '#1a1a1a', textAlign: 'center' }}>
                  Your foundation is ready.
                </p>
              </div>
            )}

            <div style={styles.buttonContainer}>
              {step > 1 ? (
                <Button variant="outline" type="button" onClick={handleBack}>Back</Button>
              ) : <div />}
              
              {step < 4 ? (
                <Button 
                  variant="primary"
                  type="button" 
                  onClick={handleNext} 
                  disabled={
                    (step === 1 && (!formData.fullName || !formData.university)) ||
                    (step === 2 && !formData.targetRole)
                  }
                >
                  Save & Continue
                </Button>
              ) : (
                <Button variant="primary" type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Preparing portal...' : 'Continue to Career Intelligence'}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf9f6',
  },
  spinner: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '4rem 2rem',
    minHeight: '100vh',
    backgroundColor: '#faf9f6',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
  },
  header: {
    marginBottom: '3rem',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
    marginBottom: '0.75rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#52525b',
    lineHeight: 1.5,
  },
  progressContainer: {
    marginBottom: '3rem',
  },
  progressCounter: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    height: '4px',
    backgroundColor: '#e5e5e5',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ea580c',
    transition: 'width 0.3s ease',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  progressLabelActive: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#1a1a1a',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  stepContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  stepTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
  },
  stepSubtitle: {
    fontSize: '0.9375rem',
    color: '#52525b',
    marginTop: '-1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  infoBox: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e5e5e5',
    borderRadius: '6px',
    padding: '1.5rem',
  },
  errorAlert: {
    padding: '0.875rem 1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '2rem',
    borderTop: '1px solid #e5e5e5',
  },
};
