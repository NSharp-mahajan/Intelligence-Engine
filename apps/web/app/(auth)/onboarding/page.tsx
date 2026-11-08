'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import type { ProfileResponse } from '../../../lib/types';

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
    branch: '',
    graduationYear: '',
    cgpa: '',
    cgpaScale: '',
    percentage: '',
    activeBacklogs: '',
    hasBacklogHistory: '',
    experienceMonths: '',
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
        const { profile } = await fetchApi<ProfileResponse>('/profile');
        if (profile) {
          setHasExistingProfile(true);
          setFormData({
            fullName: profile.fullName || '',
            university: profile.university || '',
            degree: profile.degree || '',
            branch: profile.branch || '',
            graduationYear: profile.graduationYear?.toString() || '',
            cgpa: profile.cgpa !== null && profile.cgpa !== undefined ? profile.cgpa.toString() : '',
            cgpaScale: profile.cgpaScale || '',
            percentage: profile.percentage !== null && profile.percentage !== undefined ? profile.percentage.toString() : '',
            activeBacklogs: profile.activeBacklogs !== null && profile.activeBacklogs !== undefined ? profile.activeBacklogs.toString() : '',
            hasBacklogHistory: profile.hasBacklogHistory === true ? 'true' : profile.hasBacklogHistory === false ? 'false' : '',
            experienceMonths: profile.experienceMonths !== null && profile.experienceMonths !== undefined ? profile.experienceMonths.toString() : '',
            targetRole: profile.targetRole || '',
            careerStage: '',
            targetCompanies: '',
            githubUrl: profile.githubUrl || '',
            linkedinUrl: profile.linkedinUrl || '',
            portfolioUrl: profile.portfolioUrl || '',
          });
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('not been created')) {
          setHasExistingProfile(false);
        } else {
          setError('Unable to load your existing profile. Please refresh and try again.');
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
      if (formData.graduationYear) {
        const year = Number(formData.graduationYear);
        if (isNaN(year) || !Number.isInteger(year) || year < 1950 || year > 2100) {
          newErrors.graduationYear = "Must be a valid year between 1950 and 2100";
        }
      }
      if (formData.cgpa !== '') {
        const val = Number(formData.cgpa);
        if (isNaN(val) || val < 0) {
          newErrors.cgpa = "CGPA cannot be negative";
        } else if (!formData.cgpaScale) {
          newErrors.cgpaScale = "Please select a CGPA scale";
        } else if (formData.cgpaScale === 'SCALE_4_0' && val > 4.0) {
          newErrors.cgpa = "CGPA cannot exceed 4.0 for a 4-point scale";
        } else if (formData.cgpaScale === 'SCALE_7_0' && val > 7.0) {
          newErrors.cgpa = "CGPA cannot exceed 7.0 for a 7-point scale";
        } else if (formData.cgpaScale === 'SCALE_10_0' && val > 10.0) {
          newErrors.cgpa = "CGPA cannot exceed 10.0 for a 10-point scale";
        }
      }
      if (formData.percentage !== '') {
        const val = Number(formData.percentage);
        if (isNaN(val) || val < 0 || val > 100) {
          newErrors.percentage = "Percentage must be between 0 and 100";
        }
      }
      if (formData.activeBacklogs !== '') {
        const val = Number(formData.activeBacklogs);
        if (isNaN(val) || !Number.isInteger(val) || val < 0) {
          newErrors.activeBacklogs = "Active backlogs cannot be negative";
        }
      }
      if (formData.experienceMonths !== '') {
        const val = Number(formData.experienceMonths);
        if (isNaN(val) || !Number.isInteger(val) || val < 0) {
          newErrors.experienceMonths = "Experience months cannot be negative";
        }
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
          fullName: formData.fullName.trim(),
          university: formData.university.trim() || null,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear, 10) : null,
          targetRole: formData.targetRole.trim() || null,
          degree: formData.degree.trim() || null,
          branch: formData.branch.trim() || null,
          cgpa: formData.cgpa !== '' ? parseFloat(formData.cgpa) : null,
          cgpaScale: formData.cgpaScale || null,
          percentage: formData.percentage !== '' ? parseFloat(formData.percentage) : null,
          activeBacklogs: formData.activeBacklogs !== '' ? parseInt(formData.activeBacklogs, 10) : null,
          hasBacklogHistory: formData.hasBacklogHistory === 'true' ? true : formData.hasBacklogHistory === 'false' ? false : null,
          experienceMonths: formData.experienceMonths !== '' ? parseInt(formData.experienceMonths, 10) : null,
          githubUrl: formData.githubUrl.trim() || null,
          linkedinUrl: formData.linkedinUrl.trim() || null,
          portfolioUrl: formData.portfolioUrl.trim() || null,
        }),
      });
      router.push('/portal');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
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
                <p style={styles.stepSubtitle}>Tell us who you are and where you&apos;re coming from. Your academic background helps us understand your career stage and context.</p>
                
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

                  {/* Academic Information Group */}
                  <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      Academic Information <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>(Optional)</span>
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                      Used to accurately evaluate your eligibility for early career, fresher, and graduate trainee roles.
                    </p>
                  </div>

                  <Input 
                    label="University / College (Optional)" 
                    name="university" 
                    value={formData.university} 
                    onChange={handleChange} 
                    placeholder="e.g. Stanford University or IIT Bombay" 
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input 
                      label="Degree (Optional)" 
                      name="degree" 
                      value={formData.degree} 
                      onChange={handleChange} 
                      placeholder="e.g. B.Tech, B.E., BCA, M.Tech" 
                    />
                    <Input 
                      label="Branch / Specialization (Optional)" 
                      name="branch" 
                      value={formData.branch} 
                      onChange={handleChange} 
                      placeholder="e.g. Computer Science, IT, ECE" 
                    />
                  </div>

                  <Input 
                    label="Graduation Year (Optional)" 
                    name="graduationYear" 
                    type="number"
                    value={formData.graduationYear} 
                    onChange={handleChange} 
                    placeholder="e.g. 2026" 
                    error={errors.graduationYear}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input 
                      label="CGPA (Optional)" 
                      name="cgpa" 
                      type="number"
                      step="0.01"
                      value={formData.cgpa} 
                      onChange={handleChange} 
                      placeholder="e.g. 8.50" 
                      error={errors.cgpa}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: errors.cgpaScale ? 'var(--error-text)' : 'var(--text-primary)' }}>
                        CGPA Scale {formData.cgpa ? <span style={{ color: 'var(--error-text)' }}>*</span> : '(Optional)'}
                      </label>
                      <select
                        name="cgpaScale"
                        value={formData.cgpaScale}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${errors.cgpaScale ? 'var(--error-border)' : 'var(--border-light)'}`,
                          fontSize: '0.9375rem',
                          color: 'var(--text-primary)',
                          backgroundColor: 'var(--bg-surface)',
                          outline: 'none',
                        }}
                      >
                        <option value="">-- Select Scale --</option>
                        <option value="SCALE_10_0">10.0 Scale (e.g. Indian Universities)</option>
                        <option value="SCALE_4_0">4.0 Scale (e.g. US / International)</option>
                        <option value="SCALE_7_0">7.0 Scale</option>
                        <option value="SCALE_UNKNOWN">Other / Unknown Scale</option>
                      </select>
                      {errors.cgpaScale && <span style={{ fontSize: '0.8125rem', color: 'var(--error-text)' }}>{errors.cgpaScale}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input 
                      label="Percentage % (Optional)" 
                      name="percentage" 
                      type="number"
                      step="0.1"
                      value={formData.percentage} 
                      onChange={handleChange} 
                      placeholder="e.g. 78.5" 
                      error={errors.percentage}
                    />
                    <Input 
                      label="Active Backlogs (Optional)" 
                      name="activeBacklogs" 
                      type="number"
                      value={formData.activeBacklogs} 
                      onChange={handleChange} 
                      placeholder="e.g. 0" 
                      error={errors.activeBacklogs}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Backlog History (Optional)
                    </label>
                    <select
                      name="hasBacklogHistory"
                      value={formData.hasBacklogHistory}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.9375rem',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--bg-surface)',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Select Backlog History --</option>
                      <option value="false">No, never had any backlogs</option>
                      <option value="true">Yes, have had backlogs in the past (cleared or active)</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Distinct from active backlogs: some employers accept cleared past backlogs while others require zero history.
                    </span>
                  </div>

                  {/* Experience Information Group */}
                  <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      Experience Information <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>(Optional)</span>
                    </h3>
                  </div>

                  <Input 
                    label="Total Relevant Experience in Months (Optional)" 
                    name="experienceMonths" 
                    type="number"
                    value={formData.experienceMonths} 
                    onChange={handleChange} 
                    placeholder="e.g. 0 for freshers, 6 for 6 months, 12 for 1 year" 
                    error={errors.experienceMonths}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in" style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Where are you heading?</h2>
                <p style={styles.stepSubtitle}>Tell us what kind of opportunities you&#39;re preparing for. This gives the matching engine a direction. Your evidence will determine how strongly you align.</p>
                
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
