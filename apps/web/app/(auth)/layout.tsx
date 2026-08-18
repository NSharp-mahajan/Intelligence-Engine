'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';
import { Logo } from '../../components/ui/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <div style={styles.spinner}>Loading workspace...</div>
      </div>
    );
  }

  if (!user) return null;

  if (isOnboarding) {
    return (
      <div style={styles.onboardingLayout}>
        <header style={styles.onboardingHeader}>
          <Logo />
          <button onClick={handleLogout} style={styles.logoutBtnText}>Sign Out</button>
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
          <Logo />
        </div>
        
        <nav style={styles.sidebarNav}>
          <span style={styles.navSectionTitle}>WORKSPACE</span>
          <Link href="/portal" style={pathname === '/portal' ? styles.navItemActive : styles.navItem}>
            Overview
          </Link>
          <Link href="/profile" style={pathname === '/profile' ? styles.navItemActive : styles.navItem}>
            Profile
          </Link>
          
          <span style={{ ...styles.navSectionTitle, marginTop: '2rem' }}>EVIDENCE</span>
          <Link href="/evidence" style={pathname === '/evidence' ? styles.navItemActive : styles.navItem}>
            Skills & Projects
          </Link>
          
          <span style={{ ...styles.navSectionTitle, marginTop: '2rem' }}>DISCOVERY</span>
          <div style={styles.navItemDisabled}>Opportunities</div>
          <div style={styles.navItemDisabled}>Matching</div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user.profile?.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user.profile?.fullName || 'Candidate'}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
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
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
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
    alignItems: 'center',
    padding: '1.25rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e5e5',
  },
  logoutBtnText: {
    background: 'none',
    border: 'none',
    color: '#52525b',
    fontWeight: 600,
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
    padding: '1.5rem',
    borderBottom: '1px solid #e5e5e5',
  },
  sidebarNav: {
    padding: '2rem 1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
    flex: 1,
  },
  navSectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
    paddingLeft: '0.75rem',
  },
  navItem: {
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    color: '#52525b',
    fontWeight: 500,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    color: '#ea580c', // Orange for active section
    backgroundColor: '#fff7ed',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
  },
  navItemDisabled: {
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    color: '#d4d4d8',
    fontWeight: 500,
    fontSize: '0.9375rem',
    cursor: 'not-allowed',
  },
  sidebarFooter: {
    padding: '1.5rem',
    borderTop: '1px solid #e5e5e5',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
  },
  userDetails: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: '#1a1a1a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontWeight: 400,
    fontSize: '0.75rem',
    color: '#a1a1aa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.625rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '6px',
    color: '#1a1a1a',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  portalMain: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  contentContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '4rem 3rem',
  }
};
