'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { AuthVisualPanel } from '../../../components/landing/AuthVisualPanel';

export default function RegisterPage() {
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

  return (
    <div style={styles.container}>
      {/* LEFT PANEL */}
      <div style={styles.leftPanel} className="hide-on-mobile">
        <AuthVisualPanel />
      </div>

      {/* RIGHT PANEL */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.mobileHeader}>
             <div style={styles.logoMark}>CI</div>
          </div>
          
          <div style={styles.header}>
            <h1 style={styles.title}>Create your account</h1>
            <p style={styles.subtitle}>Build your profile, connect your evidence, and discover where your skills fit.</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorAlert}>{error}</div>}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  ...styles.input,
                  ...(focusedInput === 'email' ? styles.inputFocused : {})
                }}
                required
                autoComplete="email"
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  ...styles.input,
                  ...(focusedInput === 'password' ? styles.inputFocused : {})
                }}
                required
                autoComplete="new-password"
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div style={styles.footer}>
            <span style={styles.footerText}>Already have an account? </span>
            <Link href="/login" style={styles.footerLink}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  leftPanel: {
    flex: '0 0 42%',
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
    animation: 'fadeIn 0.5s ease-out',
  },
  mobileHeader: {
    marginBottom: '3rem',
    display: 'none',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--text-primary)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.875rem',
    borderRadius: '4px',
  },
  header: {
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
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
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
    fontWeight: 500,
    animation: 'slideUpFade 0.3s ease-out',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid var(--border-light)',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  inputFocused: {
    borderColor: 'var(--success-text)',
    boxShadow: '0 0 0 3px rgba(21, 128, 61, 0.1)',
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: 'var(--success-text)', // Deep green
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(21, 128, 61, 0.2)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  footer: {
    marginTop: '2.5rem',
    textAlign: 'left',
  },
  footerText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    fontWeight: 700,
    textDecoration: 'none',
  }
};
