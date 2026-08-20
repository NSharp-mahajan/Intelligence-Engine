'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../../../components/ui/Logo';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { fetchApi } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Panel: Visual/Branding */}
      <div style={styles.leftPanel} className="hide-on-mobile">
        <div style={styles.brandingContent}>
          <Logo monochrome />
          <h1 style={styles.heroText}>Your next career move shouldn't be a guessing game.</h1>
          <p style={styles.heroSubtext}>
            Connect your verified technical evidence to the Career Intelligence engine to discover your exact market fit.
          </p>
          
          {/* Subtle Engine Visualization */}
          <div style={styles.engineVisual}>
            <div style={styles.engineNode}>Skills</div>
            <div style={styles.engineLine}></div>
            <div style={styles.engineCore}>Engine</div>
            <div style={styles.engineLine}></div>
            <div style={styles.engineNode}>Match</div>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <div style={styles.mobileLogo} className="mobile-only">
            <Logo />
          </div>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome back</h2>
            <p style={styles.subtitle}>Enter your credentials to access your portal.</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorAlert}>{error}</div>}
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            
            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <p style={styles.footerText}>
            Don't have an account? <Link href="/register" style={styles.footerLink}>Create one now</Link>
          </p>
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
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '4rem',
    position: 'relative',
    overflow: 'hidden',
  },
  brandingContent: {
    maxWidth: '500px',
    zIndex: 1,
  },
  heroText: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    marginTop: '3rem',
    marginBottom: '1.5rem',
    color: 'var(--text-inverse)',
  },
  heroSubtext: {
    fontSize: '1.125rem',
    color: '#a1a1aa',
    lineHeight: 1.6,
  },
  engineVisual: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4rem',
    gap: '1rem',
    opacity: 0.8,
  },
  engineNode: {
    padding: '0.5rem 1rem',
    border: '1px solid #3f3f46',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  engineLine: {
    height: '1px',
    flex: 1,
    backgroundColor: '#3f3f46',
    position: 'relative',
  },
  engineCore: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  formWrapper: {
    width: '100%',
    maxWidth: '400px',
  },
  mobileLogo: {
    marginBottom: '2rem',
    display: 'none', // handled by css
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--error-border)',
  },
  footerText: {
    marginTop: '2rem',
    textAlign: 'center',
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    color: 'var(--accent-primary)',
    fontWeight: 500,
    textDecoration: 'none',
  }
};
