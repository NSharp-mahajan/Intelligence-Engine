'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { GlassAuthLayout } from '../../../components/auth/GlassAuthLayout';
import { SocialButtons } from '../../../components/auth/SocialButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/portal');
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <GlassAuthLayout>
      <div style={styles.header}>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Continue building your evidence and finding opportunities where you fit.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        
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
            <Link href="#" style={styles.forgotLink}>Forgot password?</Link>
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
          disabled={loading || !email || !password} 
          style={{
            ...styles.button,
            ...(loading || !email || !password ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <SocialButtons />

      <div style={styles.footer}>
        <span style={styles.footerText}>Don't have an account? </span>
        <Link href="/register" style={styles.footerLink}>Create one</Link>
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
  forgotLink: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem', // ~52px total height approx depending on box-sizing
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
    backgroundColor: 'var(--accent-primary)', // Orange primary CTA
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
