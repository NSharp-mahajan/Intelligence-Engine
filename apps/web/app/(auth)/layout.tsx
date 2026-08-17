'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Exclude onboarding from standard portal shell, or give it a specialized minimal shell
  const isOnboarding = pathname === '/onboarding';

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await fetchApi('/auth/me');
        setUser(userData);
      } catch (err: any) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (isOnboarding) {
    return (
      <div style={styles.onboardingLayout}>
        <header style={styles.onboardingHeader}>
          <div style={styles.brand}>Career Intelligence</div>
          <button onClick={handleLogout} style={styles.logoutBtnText}>Logout</button>
        </header>
        <main style={styles.onboardingMain}>{children}</main>
      </div>
    );
  }

  return (
    <div style={styles.portalLayout}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.brand}>Career Intelligence</div>
        </div>
        
        <nav style={styles.sidebarNav}>
          <Link href="/portal" style={pathname === '/portal' ? styles.navItemActive : styles.navItem}>
            Overview
          </Link>
          <Link href="/profile" style={pathname === '/profile' ? styles.navItemActive : styles.navItem}>
            Profile
          </Link>
          {/* Placeholders for future milestones */}
          <div style={styles.navItemDisabled}>Skills & Projects</div>
          <div style={styles.navItemDisabled}>Opportunities</div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user.profile?.fullName || 'Candidate'}</div>
            <div style={styles.userEmail}>{user.email}</div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.portalMain}>
        <div style={styles.contentContainer}>
          {children}
        </div>
      </main>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf9f6',
  },
  spinner: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#52525b',
  },
  onboardingLayout: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: '#faf9f6',
  },
  onboardingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1.5rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e5e5',
  },
  logoutBtnText: {
    background: 'none',
    border: 'none',
    color: '#52525b',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  onboardingMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  portalLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#faf9f6',
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sidebarHeader: {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #e5e5e5',
  },
  brand: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
  },
  sidebarNav: {
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    flex: 1,
  },
  navItem: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#52525b',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  navItemActive: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#16a34a', // Green primary
    backgroundColor: '#f0fdf4',
    fontWeight: '600',
    textDecoration: 'none',
  },
  navItemDisabled: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#a1a1aa',
    fontWeight: '500',
    cursor: 'not-allowed',
  },
  sidebarFooter: {
    padding: '1.5rem',
    borderTop: '1px solid #e5e5e5',
  },
  userInfo: {
    marginBottom: '1rem',
  },
  userName: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#1a1a1a',
  },
  userEmail: {
    fontWeight: '400',
    fontSize: '0.75rem',
    color: '#52525b',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #e5e5e5',
    borderRadius: '6px',
    color: '#1a1a1a',
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  portalMain: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  contentContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '3rem 2rem',
  }
};
