'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { GlassAuthLayout } from '../../../components/auth/GlassAuthLayout';
import { SocialButtons } from '../../../components/auth/SocialButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);

    try {
      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return null;
    if (pass.length < 6) return { label: 'Weak', color: 'var(--error-text)' };
    if (pass.length < 10) return { label: 'Moderate', color: '#eab308' }; // Yellow
    return { label: 'Strong', color: 'var(--success-text)' };
  };

  const pwdStrength = getPasswordStrength(password);

  return (
    <GlassAuthLayout>
      <div style={styles.header}>
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Build your evidence profile and discover where your skills actually fit.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onFocus={() => setFocusedInput('fullName')}
            onBlur={() => setFocusedInput(null)}
            placeholder="Jane Doe"
            style={{
              ...styles.input,
              ...(focusedInput === 'fullName' ? styles.inputFocused : {})
            }}
            required
            autoComplete="name"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
            placeholder="name@example.com"
            style={{
              ...styles.input,
              ...(focusedInput === 'email' ? styles.inputFocused : {})
            }}
            required
            autoComplete="email"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Password</label>
            {pwdStrength && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: pwdStrength.color }}>
                {pwdStrength.label}
              </span>
            )}
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
            isFocused={focusedInput === 'password'}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !email || !password || !fullName} 
          style={{
            ...styles.button,
            ...(loading || !email || !password || !fullName ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <SocialButtons />

      <div style={styles.footer}>
        <span style={styles.footerText}>Already have an account? </span>
        <Link href="/login" style={styles.footerLink}>Sign in</Link>
      </div>
    </GlassAuthLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem', // 32px
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem', // 15px
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
    animation: 'slideUpFade 0.3s ease-out',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.8125rem', // 13px
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid var(--border-light)',
    fontSize: '0.9375rem', // 15px
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  inputFocused: {
    border: '1px solid var(--accent-primary)',
    boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.15)',
    backgroundColor: '#ffffff',
  },
  button: {
    width: '100%',
    padding: '0.875rem', 
    backgroundColor: 'var(--accent-primary)', // Orange
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem', // 14px
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    fontWeight: 700,
    textDecoration: 'none',
  }
};
