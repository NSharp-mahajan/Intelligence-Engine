'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { API_URL } from '../../../lib/api';

type SyncState = 'loading' | 'error';

export default function SyncProfilePage() {
  const router = useRouter();
  const { isLoaded, getToken } = useAuth();
  const [state, setState] = useState<SyncState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function sync() {
      if (!isLoaded) return;

      try {
        // setActive() and Clerk's client state update asynchronously. Give the
        // session a short, bounded window to become available before treating
        // the user as unauthenticated.
        let token: string | null = null;
        for (let index = 0; index < 5 && isMounted; index += 1) {
          // getToken() reads the active Clerk session directly and is safe to
          // call while the React auth state is catching up after setActive().
          try {
            token = await getToken();
          } catch {
            token = null;
          }
          if (token) break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        if (!token) {
          if (isMounted) {
            setErrorMessage('Your sign-in session could not be confirmed. Please sign in again.');
            setState('error');
          }
          return;
        }

        const res = await fetch(`${API_URL}/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (!res.ok) {
          let message = 'Something went wrong while connecting your account. Please try again.';
          try {
            const body = await res.json();
            if (res.status === 401) {
              message = 'Your sign-in session has expired. Please sign in again.';
            } else if (body?.error?.message || body?.error) {
              // eslint-disable-next-line no-console
              console.error('Sync failed', res.status, body);
            }
          } catch {
            // eslint-disable-next-line no-console
            console.error('Sync failed', res.status);
          }
          setErrorMessage(message);
          setState('error');
          return;
        }

        const data = await res.json();
        if (data && data.profile) {
          router.replace('/portal');
        } else {
          router.replace('/onboarding');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to sync profile', e);
        if (isMounted) {
          setErrorMessage('Something went wrong while connecting your account. Please try again.');
          setState('error');
        }
      }
    }

    sync();
    return () => {
      isMounted = false;
    };
  }, [attempt, isLoaded, getToken, router]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {state === 'loading' ? (
          <>
            <div style={styles.spinner} aria-hidden="true" />
            <p style={styles.title}>Preparing your Career Intelligence profile...</p>
            <p style={styles.subtitle}>Securely connecting your account.</p>
          </>
        ) : (
          <>
            <p style={styles.title}>Unable to prepare your profile</p>
            <p style={styles.subtitle}>{errorMessage}</p>
            <div style={styles.actions}>
              <button type="button" onClick={() => { setState('loading'); setErrorMessage(''); setAttempt((value) => value + 1); }} style={styles.primaryButton}>
                Try Again
              </button>
              <button type="button" onClick={() => router.replace('/login')} style={styles.secondaryButton}>
                Return to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    padding: '2rem',
  },
  card: {
    maxWidth: '440px',
    textAlign: 'center',
    padding: '2.5rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  spinner: {
    width: '28px',
    height: '28px',
    margin: '0 auto 1.25rem',
    border: '3px solid var(--border-light)',
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  title: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0.75rem 0 0',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'var(--accent-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
