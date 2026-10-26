'use client';

import React, { useState, useEffect } from 'react';
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

  // Forgot Password / Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace('/sync-profile');
    }
  }, [authLoaded, isSignedIn, router]);

  // Standard Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  // Step 1: Send Password Reset Code
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setResetCodeSent(true);
      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Unable to send password reset code. Please check your email.');
      setLoading(false);
    }
  };

  // Step 2: Attempt Reset with Code & New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/sync-profile');
      } else {
        setError('Password reset incomplete. Please check your code.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error(err);
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || 'Password reset failed. Please check the code and try again.');
      setLoading(false);
    }
  };

  return (
    <GlassAuthLayout>
      {/* FORGOT PASSWORD / RESET MODE */}
      {isResetMode ? (
        <>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 className="auth-header-title">Reset your password</h2>
            <p className="auth-header-subtitle">
              {resetCodeSent 
                ? `Enter the reset code sent to ${email} and your new password.` 
                : 'Enter your email address to receive a password reset code.'}
            </p>
          </div>

          {!resetCodeSent ? (
            /* Reset Step 1: Send Code */
            <form onSubmit={handleSendResetCode} className="auth-form">
              {error && <div className="auth-error-alert">{error}</div>}
              
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

              <button 
                type="submit" 
                disabled={loading || !email} 
                className="auth-submit-btn"
              >
                {loading ? 'Sending code...' : 'Send reset code'}
              </button>
            </form>
          ) : (
            /* Reset Step 2: Code & New Password */
            <form onSubmit={handleResetPasswordSubmit} className="auth-form">
              {error && <div className="auth-error-alert">{error}</div>}
              
              <div className="auth-input-group">
                <label className="auth-input-label">Reset Code</label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Enter code"
                  className="auth-input-field"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !resetCode || !newPassword} 
                className="auth-submit-btn"
              >
                {loading ? 'Resetting password...' : 'Reset password'}
              </button>
            </form>
          )}

          <div className="auth-footer-nav">
            <button 
              type="button" 
              onClick={() => { setIsResetMode(false); setResetCodeSent(false); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              className="auth-footer-link"
            >
              Remember your password? Sign in
            </button>
          </div>
        </>
      ) : (
        /* STANDARD SIGN IN MODE */
        <>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 className="auth-header-title">Welcome back</h2>
            <p className="auth-header-subtitle">
              Continue building your evidence and finding opportunities where you fit.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="auth-form">
            {error && <div className="auth-error-alert">{error}</div>}
            
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
                <button 
                  type="button" 
                  onClick={() => { setIsResetMode(true); setError(''); }}
                  className="auth-forgot-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !email || !password} 
              className="auth-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <SocialButtons />

          <div className="auth-footer-nav">
            <span style={{ color: '#666862' }}>Don&apos;t have an account? </span>
            <Link href="/register" className="auth-footer-link">Create one</Link>
          </div>
        </>
      )}
    </GlassAuthLayout>
  );
}
