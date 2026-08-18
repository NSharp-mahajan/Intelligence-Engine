'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Logo } from '../../../components/ui/Logo';

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
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.splitContainer}>
      <div className="hide-on-mobile" style={styles.leftPanel}>
        <div style={styles.brandingBox}>
          <div style={{ marginBottom: '3rem' }}>
            <Logo />
          </div>
          <h1 style={styles.leftHeadline}>Build a profile based on evidence.</h1>
          <h2 style={styles.leftSubHeadline}>Understand where you stand.</h2>
          <h2 style={styles.leftSubHeadline}>Find where you fit.</h2>
        </div>
      </div>
      
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.title}>Sign in to your account</h2>
            <p style={styles.subtitle}>Enter your credentials to access your Career Intelligence workspace.</p>
          </div>
          
          {error && <div style={styles.errorAlert}>{error}</div>}
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
            />
            
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            
            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Signing in...' : 'Log In'}
              </Button>
            </div>
          </form>
          
          <div style={styles.footer}>
            <span style={styles.footerText}>Don't have an account? </span>
            <Link href="/register" style={styles.footerLink}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  splitContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#faf9f6',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    padding: '4rem',
    borderRight: '1px solid #e5e5e5',
  },
  brandingBox: {
    maxWidth: '480px',
    margin: '0 auto',
    width: '100%',
  },
  leftHeadline: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  leftSubHeadline: {
    fontSize: '2.5rem',
    fontWeight: 400,
    color: '#52525b',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: '2rem',
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
  },
  formHeader: {
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#52525b',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
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
  footer: {
    marginTop: '2.5rem',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
  },
  footerText: {
    color: '#52525b',
  },
  footerLink: {
    color: '#1a1a1a',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
