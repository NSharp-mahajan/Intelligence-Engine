'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const ROLES = [
  "Software Engineer",
  "AI Engineer",
  "Data Scientist",
  "Backend Engineer",
  "Frontend Engineer",
  "ML Engineer",
  "DevOps Engineer",
  "Product Manager"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    university: '',
    degree: '',
    graduationYear: '',
    targetRole: '',
    careerStage: '',
    targetCompanies: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
            degree: '', // Not in DB natively, kept in state
            graduationYear: profile.graduationYear?.toString() || '',
            targetRole: profile.targetRole || '',
            careerStage: '',
            targetCompanies: '',
            githubUrl: profile.githubUrl || '',
            linkedinUrl: profile.linkedinUrl || '',
            portfolioUrl: profile.portfolioUrl || '',
          });
        }
      } catch (e: any) {
        if (e.message?.includes('not been created')) {
          setHasExistingProfile(false);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    setError('');
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
      if (formData.graduationYear && isNaN(Number(formData.graduationYear))) {
        newErrors.graduationYear = "Must be a valid year";
      }
    } else if (step === 3) {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (formData.githubUrl && !urlRegex.test(formData.githubUrl)) newErrors.githubUrl = "Enter a valid URL";
      if (formData.linkedinUrl && !urlRegex.test(formData.linkedinUrl)) newErrors.linkedinUrl = "Enter a valid URL";
      if (formData.portfolioUrl && !urlRegex.test(formData.portfolioUrl)) newErrors.portfolioUrl = "Enter a valid URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(s => Math.min(4, s + 1));
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setError('');
    setSubmitting(true);
    try {
      await fetchApi('/profile', {
        method: hasExistingProfile ? 'PUT' : 'POST',
        body: JSON.stringify({
          fullName: formData.fullName,
          university: formData.university || null,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          targetRole: formData.targetRole || null,
          githubUrl: formData.githubUrl || null,
          linkedinUrl: formData.linkedinUrl || null,
          portfolioUrl: formData.portfolioUrl || null,
        }),
      });
      router.push('/portal');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading your workspace...</div>
      </div>
    );
  }

  const getLeftPanelContent = () => {
    switch (step) {
      case 1: return { text: "Your identity gives the engine context.", activeNodes: 1 };
      case 2: return { text: "Your direction tells the engine where to look.", activeNodes: 2 };
      case 3: return { text: "Your professional footprint provides additional evidence.", activeNodes: 3 };
      case 4: return { text: "Your projects and skills show what you can actually prove.", activeNodes: 4 };
      default: return { text: "", activeNodes: 0 };
    }
  };
  
  const panelContent = getLeftPanelContent();

  return (
    <div style={styles.pageLayout}>
      
      {/* LEFT PANEL - CONTEXT & BRAND */}
      <div style={styles.leftPanel} className="hide-on-mobile">
        <div style={styles.leftPanelInner}>
          
          <div style={styles.brandRow}>
            <div style={styles.logoMark}>CI</div>
            <span style={styles.brandName}>CAREER INTELLIGENCE</span>
          </div>

          <div style={styles.contextualContent}>
            <h1 style={styles.leftHeading}>Build the profile behind the match.</h1>
            <p style={styles.leftSubheading}>{panelContent.text}</p>
            
            <div style={styles.abstractVisual}>
              <div style={styles.engineNodeContainer}>
                {[1, 2, 3, 4].map((node) => (
                  <div key={node} style={styles.nodeWrapper}>
                    <div style={{
                      ...styles.engineNode,
                      backgroundColor: node <= panelContent.activeNodes ? 'var(--success-text)' : 'rgba(0,0,0,0.05)',
                      boxShadow: node === panelContent.activeNodes ? '0 0 0 4px rgba(16, 185, 129, 0.15)' : 'none',
                    }} />
                    {node < 4 && <div style={{
                      ...styles.engineLine,
                      backgroundColor: node < panelContent.activeNodes ? 'var(--success-text)' : 'rgba(0,0,0,0.05)'
                    }} />}
                  </div>
                ))}
              </div>
              <div style={styles.visualMetaText}>ENGINE CALIBRATION</div>
            </div>
          </div>
          
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          
          {/* Progress Indicator */}
          <div style={styles.progressHeader}>
            {['IDENTITY', 'DIRECTION', 'LINKS', 'EVIDENCE'].map((label, idx) => {
              const num = idx + 1;
              const isActive = step === num;
              const isPast = step > num;
              return (
                <div key={label} style={styles.progressItem}>
                  <div style={{
                    ...styles.progressNum,
                    color: isActive ? 'var(--accent-primary)' : isPast ? 'var(--success-text)' : 'var(--text-tertiary)'
                  }}>
                    0{num}
                  </div>
                  <div style={{
                    ...styles.progressLabel,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: isActive ? 700 : 500
                  }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Content Area */}
          <div style={styles.formCard}>
            
            {error && <div style={styles.errorAlert}>{error}</div>}

            {step === 1 && (
              <div className="animate-fade-in" style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Start with the basics.</h2>
                <p style={styles.stepSubtitle}>Tell us who you are and where you're coming from. Your academic background helps us understand your career stage and context.</p>
                
                <div style={styles.formGrid}>
                  <Input 
                    label="Full Name" 
                    name="fullName" 
                    value={formData.fullName} 
                    onChange={handleChange} 
                    placeholder="Jane Doe" 
                    error={errors.fullName}
                    required
                  />
                  <Input 
                    label="University (Optional)" 
                    name="university" 
                    value={formData.university} 
                    onChange={handleChange} 
                    placeholder="Stanford University" 
                  />
                  <Input 
                    label="Graduation Year (Optional)" 
                    name="graduationYear" 
                    value={formData.graduationYear} 
                    onChange={handleChange} 
                    placeholder="2025" 
                    error={errors.graduationYear}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in" style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Where are you heading?</h2>
                <p style={styles.stepSubtitle}>Tell us what kind of opportunities you're preparing for. This gives the matching engine a direction. Your evidence will determine how strongly you align.</p>
                
                <div style={styles.formGrid}>
                  <div>
                    <Input 
                      label="Target Role" 
                      name="targetRole" 
                      list="roles-list"
                      value={formData.targetRole} 
                      onChange={handleChange} 
                      placeholder="e.g. Software Engineer" 
                    />
                    <datalist id="roles-list">
                      {ROLES.map(role => <option key={role} value={role} />)}
                    </datalist>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in" style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Connect your work.</h2>
                <p style={styles.stepSubtitle}>Give Career Intelligence access to the places where your professional work already exists.</p>
                
                <div style={styles.formGrid}>
                  <div style={styles.fieldWithHelper}>
                    <Input 
                      label="GitHub" 
                      name="githubUrl" 
                      type="url" 
                      value={formData.githubUrl} 
                      onChange={handleChange} 
                      placeholder="https://github.com/username" 
                      error={errors.githubUrl}
                      style={{ marginBottom: '0.25rem' }}
                    />
                    <span style={styles.helperText}>Your repositories help us understand what you can actually build.</span>
                  </div>

                  <div style={styles.fieldWithHelper}>
                    <Input 
                      label="LinkedIn" 
                      name="linkedinUrl" 
                      type="url" 
                      value={formData.linkedinUrl} 
                      onChange={handleChange} 
                      placeholder="https://linkedin.com/in/username" 
                      error={errors.linkedinUrl}
                      style={{ marginBottom: '0.25rem' }}
                    />
                    <span style={styles.helperText}>Your professional profile provides additional career context.</span>
                  </div>

                  <div style={styles.fieldWithHelper}>
                    <Input 
                      label="Portfolio / Website" 
                      name="portfolioUrl" 
                      type="url" 
                      value={formData.portfolioUrl} 
                      onChange={handleChange} 
                      placeholder="https://yourwebsite.com" 
                      error={errors.portfolioUrl}
                      style={{ marginBottom: '0.25rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in" style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Show us what you can prove.</h2>
                <p style={styles.stepSubtitle}>Skills and projects give the matching engine evidence instead of relying only on keywords.</p>
                
                <div style={styles.evidenceExplainerBox}>
                  <div style={styles.explainerIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  </div>
                  <div style={styles.explainerTextGroup}>
                    <h3 style={styles.explainerTitle}>Evidence Workspace</h3>
                    <p style={styles.explainerText}>
                      Career Intelligence uses a dedicated workspace for evidence collection. Once you complete this setup, you will be taken to your portal where you can add your verified skills and projects.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.formActions}>
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack} disabled={submitting}>Previous</Button>
              ) : (
                <div /> // Spacer
              )}
              
              {step < 4 ? (
                <Button variant="primary" onClick={handleNext}>Continue</Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Complete Profile'}
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
  pageLayout: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
  },
  leftPanel: {
    flex: '0 0 35%',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-light)',
    padding: '4rem',
    display: 'flex',
    flexDirection: 'column',
  },
  leftPanelInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '6rem',
  },
  logoMark: {
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.875rem',
    borderRadius: '6px',
  },
  brandName: {
    fontSize: '0.875rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '0.1em',
  },
  contextualContent: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  leftHeading: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '1rem',
    lineHeight: 1.1,
  },
  leftSubheading: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '3rem',
    transition: 'opacity 0.3s ease',
  },
  abstractVisual: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  engineNodeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  nodeWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  engineNode: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'all 0.5s ease',
  },
  engineLine: {
    width: '40px',
    height: '2px',
    transition: 'all 0.5s ease',
  },
  visualMetaText: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.1em',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    overflowY: 'auto',
  },
  formContainer: {
    width: '100%',
    maxWidth: '560px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2.5rem',
    padding: '0 0.5rem',
  },
  progressItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  progressNum: {
    fontSize: '0.75rem',
    fontWeight: 800,
    fontFamily: 'monospace',
    transition: 'color 0.3s ease',
  },
  progressLabel: {
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    transition: 'color 0.3s ease',
  },
  formCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 4px 24px -12px rgba(0,0,0,0.05)',
    border: '1px solid var(--border-light)',
  },
  stepContent: {
    marginBottom: '2.5rem',
  },
  stepTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  stepSubtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '2rem',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldWithHelper: {
    display: 'flex',
    flexDirection: 'column',
  },
  helperText: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    marginLeft: '0.25rem',
  },
  selectContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    marginBottom: '1rem',
  },
  inputLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  selectInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
    appearance: 'none',
    cursor: 'pointer',
  },
  evidenceExplainerBox: {
    display: 'flex',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
  },
  explainerIcon: {
    color: 'var(--success-text)',
    flexShrink: 0,
  },
  explainerTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  explainerTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--success-text)',
  },
  explainerText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '2rem',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
    marginBottom: '1.5rem',
  }
};
