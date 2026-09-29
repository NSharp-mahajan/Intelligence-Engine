'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignIn, useAuth } from '@clerk/nextjs';
import { GlassAuthLayout } from '../../../components/auth/GlassAuthLayout';
import { SocialButtons } from '../../../components/auth/SocialButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  type AuthMode = 'sign_in' | 'reset_email' | 'reset_code_password';
  const [authMode, setAuthMode] = useState<AuthMode>('sign_in');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace('/sync-profile');
    }
  }, [authLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/sync-profile');
      } else {
        console.warn('SignIn incomplete:', result);
        setError('Sign in requires additional steps.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Incorrect credentials. Please try again.');
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setAuthMode('reset_code_password');
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/sync-profile');
      } else {
        setError('Reset requires additional steps.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <GlassAuthLayout>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {authMode === 'sign_in' ? 'Welcome back' : 'Reset password'}
        </h2>
        <p style={styles.subtitle}>
          {authMode === 'sign_in' 
            ? 'Continue building your evidence and finding opportunities where you fit.'
            : authMode === 'reset_email'
              ? 'Enter your email address and we will send you a password reset code.'
              : 'Enter the code sent to your email and your new password.'
          }
        </p>
      </div>

      {authMode === 'sign_in' && (
        <>
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
                <button
                  type="button"
                  onClick={() => { setError(''); setAuthMode('reset_email'); }}
                  style={{ ...styles.forgotLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  Forgot password?
                </button>
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
        </>
      )}

      {authMode === 'reset_email' && (
        <form onSubmit={handleResetRequest} style={styles.form}>
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
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !email} 
            style={{
              ...styles.button,
              ...(loading || !email ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Sending code...' : 'Send reset code'}
          </button>

          <div style={{ ...styles.footer, marginTop: '1rem', textAlign: 'center' }}>
            <button 
              type="button"
              onClick={() => { setError(''); setAuthMode('sign_in'); }}
              style={{ ...styles.footerLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {authMode === 'reset_code_password' && (
        <form onSubmit={handleResetComplete} style={styles.form}>
          {error && <div style={styles.errorAlert}>{error}</div>}
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={() => setFocusedInput('code')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Enter code"
              style={{
                ...styles.input,
                ...(focusedInput === 'code' ? styles.inputFocused : {})
              }}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setFocusedInput('newPassword')}
              onBlur={() => setFocusedInput(null)}
              isFocused={focusedInput === 'newPassword'}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !code || !newPassword} 
            style={{
              ...styles.button,
              ...(loading || !code || !newPassword ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>

          <div style={{ ...styles.footer, marginTop: '1rem', textAlign: 'center' }}>
            <button 
              type="button"
              onClick={() => { setError(''); setAuthMode('reset_email'); }}
              style={{ ...styles.footerLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Back
            </button>
          </div>
        </form>
      )}
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
