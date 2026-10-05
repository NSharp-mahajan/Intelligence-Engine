'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignUp, useAuth } from '@clerk/nextjs';
import { GlassAuthLayout } from '../../../components/auth/GlassAuthLayout';
import { SocialButtons } from '../../../components/auth/SocialButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace('/sync-profile');
    }
  }, [authLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const onPressVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status !== 'complete') {
        setError('Verification failed. Please try again.');
        setLoading(false);
      } else {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/sync-profile');
      }
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Invalid verification code.');
      setLoading(false);
    }
  };

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return null;
    if (pass.length < 8) return { label: 'Weak', color: '#B91C1C' };
    if (pass.length < 12) return { label: 'Moderate', color: '#D97706' };
    return { label: 'Strong', color: '#166534' };
  };

  const pwdStrength = getPasswordStrength(password);

  if (pendingVerification) {
    return (
      <GlassAuthLayout>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 className="auth-header-title">Verify your email</h2>
          <p className="auth-header-subtitle">
            Enter the verification code sent to <strong style={{ color: '#151515' }}>{email}</strong>
          </p>
        </div>

        <form onSubmit={onPressVerify} className="auth-form">
          {error && <div className="auth-error-alert">{error}</div>}
          
          <div className="auth-input-group">
            <label className="auth-input-label">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="auth-input-field"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !code} 
            className="auth-submit-btn"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="auth-footer-nav">
          <button 
            type="button" 
            onClick={() => setPendingVerification(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            className="auth-footer-link"
          >
            ← Back to registration
          </button>
        </div>
      </GlassAuthLayout>
    );
  }

  return (
    <GlassAuthLayout>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 className="auth-header-title">Create your account</h2>
        <p className="auth-header-subtitle">
          Build your evidence profile and discover where your skills actually fit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error-alert">{error}</div>}
        
        <div className="auth-input-group">
          <label className="auth-input-label">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="auth-input-field"
            required
            autoComplete="name"
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-input-label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="auth-input-field"
            required
            autoComplete="email"
          />
        </div>
        
        <div className="auth-input-group">
          <div className="auth-label-row">
            <label className="auth-input-label">Password</label>
            {pwdStrength && (
              <span style={{ fontSize: '0.75rem', fontWeight: 650, color: pwdStrength.color }}>
                {pwdStrength.label}
              </span>
            )}
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
          />
        </div>
        
        <div id="clerk-captcha"></div>
        
        <button 
          type="submit" 
          disabled={loading || !email || !password || !fullName} 
          className="auth-submit-btn"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <SocialButtons />

      <div className="auth-footer-nav">
        <span style={{ color: '#666862' }}>Already have an account? </span>
        <Link href="/login" className="auth-footer-link">Sign in</Link>
      </div>
    </GlassAuthLayout>
  );
}
