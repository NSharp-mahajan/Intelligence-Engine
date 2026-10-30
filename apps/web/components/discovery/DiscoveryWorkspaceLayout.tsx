'use client';

import { useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../ui/Logo';
import type { User } from '../../lib/types';

interface DiscoveryWorkspaceLayoutProps {
  children: React.ReactNode;
  user?: User | null;
  onSignOut?: () => void;
}

export function DiscoveryWorkspaceLayout({ children, user, onSignOut }: DiscoveryWorkspaceLayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const name = user?.profile?.fullName || 'Candidate';

  const isAllOpps = pathname === '/opportunities';
  const isIndiaOpps = pathname === '/opportunities/india';

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerInner} className="discovery-header-inner">
          <Logo />
          <nav aria-label="Discovery navigation" style={styles.navigation} className="discovery-navigation">
            <Link
              href="/opportunities"
              aria-current={isAllOpps ? 'page' : undefined}
              style={isAllOpps ? styles.activeNavItem : styles.navItem}
            >
              All Opportunities
            </Link>
            <Link
              href="/opportunities/india"
              aria-current={isIndiaOpps ? 'page' : undefined}
              style={isIndiaOpps ? styles.activeNavItem : styles.navItem}
            >
              India Opportunities
            </Link>
          </nav>
          <div style={styles.userMenuContainer}>
            {user ? (
              <>
                <button
                  type="button"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                  style={styles.userControl}
                >
                  <span style={styles.avatar}>{name.charAt(0).toUpperCase()}</span>
                  <span style={styles.userName} className="discovery-user-name">{name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ opacity: 0.7 }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div role="menu" style={styles.userMenu}>
                    <div style={styles.userMenuDetails}>
                      <span style={styles.userMenuName}>{name}</span>
                      <span style={styles.userMenuEmail}>{user.email}</span>
                    </div>
                    <Link href="/portal" role="menuitem" style={styles.menuItem} onClick={() => setIsUserMenuOpen(false)}>
                      Overview
                    </Link>
                    <Link href="/profile" role="menuitem" style={styles.menuItem} onClick={() => setIsUserMenuOpen(false)}>
                      Profile
                    </Link>
                    <Link href="/evidence" role="menuitem" style={styles.menuItem} onClick={() => setIsUserMenuOpen(false)}>
                      Skills & Evidence
                    </Link>
                    <div style={styles.menuDivider} />
                    <button type="button" role="menuitem" onClick={onSignOut} style={styles.signOutItem}>
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" style={styles.signInBtn}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
      <main style={styles.main}>{children}</main>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .discovery-user-name { display: none; }
          .discovery-header-inner { padding: 0 1rem !important; gap: 1.25rem !important; }
          .discovery-navigation { margin-left: auto; }
        }
      `}} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-light)',
  },
  headerInner: {
    maxWidth: '1240px',
    height: '62px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '2.5rem',
  },
  navigation: {
    display: 'flex',
    alignSelf: 'stretch',
    alignItems: 'stretch',
    gap: '1.5rem',
  },
  navItem: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 0.5rem',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  activeNavItem: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 0.5rem',
    borderBottom: '2px solid var(--accent-primary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textDecoration: 'none',
  },
  userMenuContainer: {
    position: 'relative',
    marginLeft: 'auto',
  },
  signInBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.375rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity var(--transition-fast)',
  },
  userControl: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.3125rem 0.5rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-inverse)',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  userName: {
    maxWidth: '140px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  userMenu: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 0.5rem)',
    width: '240px',
    padding: '0.375rem',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 50,
  },
  userMenuDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    padding: '0.5rem 0.625rem 0.625rem',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '0.25rem',
  },
  userMenuName: {
    fontSize: '0.8125rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
  },
  userMenuEmail: {
    color: 'var(--text-secondary)',
    fontSize: '0.6875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  menuItem: {
    display: 'flex',
    padding: '0.5rem 0.625rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background-color var(--transition-fast)',
  },
  menuDivider: {
    height: '1px',
    backgroundColor: 'var(--border-light)',
    margin: '0.25rem 0',
  },
  signOutItem: {
    display: 'flex',
    width: '100%',
    padding: '0.5rem 0.625rem',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    color: 'var(--error-text)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
  },
  main: {
    width: '100%',
    minHeight: 'calc(100vh - 62px)',
  },
};
