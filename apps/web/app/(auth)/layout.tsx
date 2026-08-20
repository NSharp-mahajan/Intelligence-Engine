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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        <div className="animate-fade-in" style={styles.spinner}>Loading workspace...</div>
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
      
      {/* MOBILE HEADER */}
      <div style={styles.mobileHeader} className="mobile-only">
        <Logo />
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={styles.hamburgerBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* SIDEBAR */}
      <aside style={{ ...styles.sidebar, display: isMobileMenuOpen ? 'flex' : undefined }} className={`sidebar-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div style={styles.sidebarHeader} className="hide-on-mobile">
          <Logo />
        </div>
        
        <nav style={styles.sidebarNav}>
          <div style={styles.navGroup}>
            <span style={styles.navSectionTitle}>WORKSPACE</span>
            <Link href="/portal" style={pathname === '/portal' ? styles.navItemActive : styles.navItem}>
              <span style={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </span>
              Overview
            </Link>
            <Link href="/profile" style={pathname === '/profile' ? styles.navItemActive : styles.navItem}>
              <span style={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              Profile
            </Link>
          </div>
          
          <div style={styles.navGroup}>
            <span style={styles.navSectionTitle}>EVIDENCE</span>
            <Link href="/evidence" style={pathname === '/evidence' ? styles.navItemActive : styles.navItem}>
              <span style={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </span>
              Skills & Projects
            </Link>
          </div>
          
          <div style={styles.navGroup}>
            <span style={styles.navSectionTitle}>DISCOVERY</span>
            <div style={styles.navItemDisabled}>
              <span style={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              Opportunities
            </div>
            <div style={styles.navItemDisabled}>
              <span style={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </span>
              Matching
            </div>
          </div>
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
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.portalMain}>
        <div style={styles.contentContainer}>
          {children}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .mobile-only { display: flex !important; }
          .hide-on-mobile { display: none !important; }
          .sidebar-container {
            display: none;
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 0;
            width: 100%;
            z-index: 50;
          }
          .sidebar-container.mobile-open {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .sidebar-container { display: flex !important; }
        }
      `}} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  spinner: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  onboardingLayout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  onboardingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-light)',
  },
  logoutBtnText: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '0.9375rem',
    transition: 'color var(--transition-fast)',
  },
  onboardingMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  portalLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    flexDirection: 'row',
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1.25rem',
    zIndex: 40,
  },
  hamburgerBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid var(--border-light)',
  },
  sidebarNav: {
    padding: '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    flex: 1,
    overflowY: 'auto',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navSectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    paddingLeft: '0.75rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-light)',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
  },
  navItemDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--border-light)',
    fontWeight: 500,
    fontSize: '0.9375rem',
    cursor: 'not-allowed',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  sidebarFooter: {
    padding: '1.5rem',
    borderTop: '1px solid var(--border-light)',
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
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '1rem',
  },
  userDetails: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontWeight: 400,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.625rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  portalMain: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
  },
  contentContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '4rem 3rem',
    width: '100%',
  }
};
