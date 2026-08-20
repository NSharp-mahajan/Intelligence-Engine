'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../../../components/ui/Logo';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { fetchApi } from '../../../lib/api';

export default function RegisterPage() {
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
      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Panel: Visual/Branding */}
      <div style={styles.leftPanel} className="hide-on-mobile">
        <div style={styles.brandingContent}>
          <Logo monochrome />
          <h1 style={styles.heroText}>Build your evidence. Define your direction.</h1>
          <p style={styles.heroSubtext}>
            Join the platform that analyzes your actual technical capability instead of just reading keywords.
          </p>
          
          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>✓</div>
              <span>Connect your verified skills</span>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>✓</div>
              <span>Upload your project evidence</span>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>✓</div>
              <span>Get deterministic match scoring</span>
            </div>
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
            <h2 style={styles.title}>Create your account</h2>
            <p style={styles.subtitle}>Start building your Career Intelligence profile.</p>
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
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
            />
            
            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <p style={styles.footerText}>
            Already have an account? <Link href="/login" style={styles.footerLink}>Sign in</Link>
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
  featureList: {
    marginTop: '4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.9375rem',
    color: '#d4d4d8',
  },
  featureIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
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
    display: 'none',
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
